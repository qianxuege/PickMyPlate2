import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { DinerTabScreenLayout } from '@/components/DinerTabScreenLayout';
import { MenuFilterChip } from '@/components/MenuFilterChip';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { useGuardActiveRole } from '@/hooks/use-guard-active-role';
import type { DinerPreferenceSnapshot } from '@/lib/diner-preferences';
import { fetchDinerPreferences, spiceDbToLabel } from '@/lib/diner-preferences';
import {
  assembleParsedMenu,
  type DinerMenuSectionRow,
  type DinerScannedDishRow,
  type ParsedMenu,
  type ParsedMenuItem,
} from '@/lib/menu-scan-schema';
import { supabase } from '@/lib/supabase';

/** Figma Diner Menu 1 tokens */
const FIG = {
  orange: '#FF6B35',
  text: '#101828',
  sectionMuted: '#364153',
  bodyMuted: '#4A5565',
  border: '#E5E7EB',
  chipBorder: '#D1D5DC',
  flameOff: '#D1D5DC',
  heart: '#99A1AF',
} as const;

const PRICE_SYMBOL: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  CNY: '¥',
  JPY: '¥',
};

export default function DinerMenuScreen() {
  useGuardActiveRole('diner');
  const router = useRouter();
  const params = useLocalSearchParams<{ scanId?: string | string[] }>();
  const scanIdRaw = params.scanId;
  const scanId = Array.isArray(scanIdRaw) ? scanIdRaw[0] : scanIdRaw;

  const [menu, setMenu] = useState<ParsedMenu | null>(null);
  const [prefs, setPrefs] = useState<DinerPreferenceSnapshot | null>(null);
  const [loading, setLoading] = useState(Boolean(scanId));
  const [error, setError] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const loadMenu = useCallback(async () => {
    if (!scanId) return;
    try {
      setError(null);
      setLoading(true);

      const prefSnap = await fetchDinerPreferences();

      const { data: scanRow, error: scanErr } = await supabase
        .from('diner_menu_scans')
        .select('restaurant_name')
        .eq('id', scanId)
        .maybeSingle();
      if (scanErr) throw scanErr;
      if (!scanRow) throw new Error('Scan not found');

      const { data: sections, error: secErr } = await supabase
        .from('diner_menu_sections')
        .select('id, scan_id, title, sort_order')
        .eq('scan_id', scanId)
        .order('sort_order', { ascending: true });
      if (secErr) throw secErr;

      const sectionIds = (sections ?? []).map((s: DinerMenuSectionRow) => s.id);
      let dishes: DinerScannedDishRow[] = [];
      if (sectionIds.length > 0) {
        const { data: dishRows, error: dishErr } = await supabase
          .from('diner_scanned_dishes')
          .select(
            'id, section_id, sort_order, name, description, price_amount, price_currency, price_display, spice_level, tags, ingredients, image_url'
          )
          .in('section_id', sectionIds)
          .order('sort_order', { ascending: true });
        if (dishErr) throw dishErr;
        dishes = (dishRows ?? []) as DinerScannedDishRow[];
      }

      const assembled = assembleParsedMenu(
        scanRow.restaurant_name ?? null,
        (sections ?? []) as DinerMenuSectionRow[],
        dishes
      );

      setPrefs(prefSnap);
      setMenu(assembled);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load menu');
    } finally {
      setLoading(false);
    }
  }, [scanId]);

  useFocusEffect(
    useCallback(() => {
      void loadMenu();
    }, [loadMenu])
  );

  const availableTags = useMemo(() => {
    if (!prefs) return [];

    const tags: string[] = [];
    const spice = spiceDbToLabel(prefs.spice_level);
    if (spice) tags.push(spice);
    tags.push(...prefs.dietaryKeys);
    if (prefs.budget_tier) tags.push(prefs.budget_tier);
    tags.push(...prefs.cuisineNames);
    tags.push(...prefs.smartTags.map((t) => t.label));

    const seen = new Set<string>();
    const deduped = tags.filter((t) => t && !seen.has(t) && (seen.add(t), true));
    return deduped;
  }, [prefs]);

  const prefTagSet = useMemo(() => {
    if (!prefs) return new Set<string>();
    const tags: string[] = [];
    const spice = spiceDbToLabel(prefs.spice_level);
    if (spice) tags.push(spice);
    tags.push(...prefs.dietaryKeys);
    if (prefs.budget_tier) tags.push(prefs.budget_tier);
    tags.push(...prefs.cuisineNames);
    tags.push(...prefs.smartTags.map((t) => t.label));
    return new Set(tags.filter(Boolean));
  }, [prefs]);

  const menuTagSet = useMemo(() => {
    return new Set<string>(menu?.sections.flatMap((s) => s.items.flatMap((i) => i.tags)) ?? []);
  }, [menu]);

  const allDishesInOrder = useMemo(() => {
    return menu?.sections.flatMap((s) => s.items) ?? [];
  }, [menu]);

  const recommendedDishes = useMemo(() => {
    if (!menu) return [];
    if (allDishesInOrder.length === 0) return [];

    // No tag selected => pick top-3 by "matched tag count" (among all preference tags we know).
    if (selectedTags.length === 0) {
      if (prefTagSet.size === 0) return allDishesInOrder.slice(0, 3);

      const idxById = new Map<string, number>(allDishesInOrder.map((d, i) => [d.id, i]));
      const scored = allDishesInOrder.map((dish) => {
        const score = dish.tags.reduce((acc, t) => (prefTagSet.has(t) ? acc + 1 : acc), 0);
        return { dish, score };
      });

      scored.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return (idxById.get(a.dish.id) ?? 0) - (idxById.get(b.dish.id) ?? 0);
      });

      return scored.slice(0, 3).map((x) => x.dish);
    }

    // At least one tag selected => recommend the intersection: dishes that contain ALL selected tags.
    return allDishesInOrder.filter((dish) => selectedTags.every((t) => dish.tags.includes(t)));
  }, [allDishesInOrder, menu, prefTagSet, selectedTags]);

  const recommendedIds = useMemo(() => new Set(recommendedDishes.map((d) => d.id)), [recommendedDishes]);

  const sectionBlocks = useMemo(() => {
    if (!menu) return [];
    return menu.sections
      .map((sec) => ({
        title: sec.title,
        items: sec.items.filter((i) => !recommendedIds.has(i.id)),
      }))
      .filter((s) => s.items.length > 0);
  }, [menu, recommendedIds]);

  const formatPrice = (dish: ParsedMenuItem) => {
    const amount = dish.price.amount;
    if (amount === null) return '—';
    const currency = dish.price.currency;
    const symbol = PRICE_SYMBOL[currency] ?? '';

    const formatted =
      Number.isInteger(amount) || Math.abs(amount - Math.round(amount)) < 1e-9
        ? `${Math.round(amount)}`
        : amount.toFixed(2).replace(/\.00$/, '');

    if (symbol) return `${symbol}${formatted}`;
    return `${formatted} ${currency}`;
  };

  const renderSpiceFlames = (level: ParsedMenuItem['spice_level']) => {
    if (level === 0) return null;
    const redCount = level;
    return (
      <View style={styles.flameRow} pointerEvents="none">
        {[0, 1, 2].map((i) => {
          const isRed = i < redCount;
          return (
            <MaterialCommunityIcons
              key={i}
              name="fire"
              size={14}
              color={isRed ? FIG.orange : FIG.flameOff}
              style={styles.flameIcon}
            />
          );
        })}
      </View>
    );
  };

  const DishCard = ({ dish }: { dish: ParsedMenuItem }) => (
    <Pressable
      accessibilityRole="button"
      onPress={() =>
        router.push({
          pathname: '/dish/[dishId]',
          params: {
            dishId: dish.id,
            scanId,
            restaurantName: headerTitle,
          },
        })
      }
      style={({ pressed }) => [styles.dishCard, pressed && styles.dishCardPressed]}
    >
      <View style={styles.dishRow}>
        {dish.image_url ? (
          <Image source={{ uri: dish.image_url }} contentFit="cover" style={styles.dishImage} />
        ) : (
          <LinearGradient
            colors={['#FFEDD4', '#FFF7ED']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.dishImageGradient}
          >
            <Text style={styles.dishEmoji} accessibilityLabel="Dish placeholder">
              🍽️
            </Text>
          </LinearGradient>
        )}

        <View style={styles.dishTextCol}>
          <View style={styles.dishTitleRow}>
            <Text style={styles.dishName} numberOfLines={1}>
              {dish.name}
            </Text>
            <View pointerEvents="none" style={styles.heartIcon}>
              <MaterialCommunityIcons name="heart-outline" size={20} color={FIG.heart} />
            </View>
          </View>

          {dish.description ? (
            <Text style={styles.dishDesc} numberOfLines={2}>
              {dish.description}
            </Text>
          ) : (
            <View style={styles.dishDescSpacer} />
          )}

          <View style={styles.dishBottomRow}>
            <Text style={styles.dishPrice}>{formatPrice(dish)}</Text>
            {renderSpiceFlames(dish.spice_level)}
          </View>
        </View>
      </View>
    </Pressable>
  );

  const headerTitle = menu?.restaurant_name?.trim() || 'Menu';

  if (!scanId) {
    return (
      <DinerTabScreenLayout activeTab="menu">
        <Text style={styles.fallbackTitle}>Menu</Text>
        <Text style={styles.fallbackSub}>Menu scans and uploaded menus will appear here.</Text>
      </DinerTabScreenLayout>
    );
  }

  return (
    <DinerTabScreenLayout activeTab="menu" menuHeader={{ title: loading ? 'Menu' : headerTitle }}>
      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={FIG.orange} />
          <Text style={styles.loadingText}>Loading menu…</Text>
        </View>
      ) : error ? (
        <View style={styles.loading}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <>
          {availableTags.length > 0 && (
            <View style={styles.filterStrip}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                nestedScrollEnabled
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.filterScrollContent}
              >
                {availableTags.map((t) => {
                  const selected = selectedTags.includes(t);
                  return (
                    <MenuFilterChip
                      key={t}
                      label={t}
                      selected={selected}
                      muted={!menuTagSet.has(t)}
                      onPress={() => {
                        setSelectedTags((prev) =>
                          prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
                        );
                      }}
                    />
                  );
                })}
              </ScrollView>
            </View>
          )}

          <View style={styles.recommendedHeadingRow}>
            <View style={styles.recommendedAccent} />
            <Text style={styles.recommendedHeading}>RECOMMENDED FOR YOU</Text>
          </View>

          <View style={styles.cardList}>
            {recommendedDishes.map((dish) => (
              <DishCard key={dish.id} dish={dish} />
            ))}
          </View>

          {sectionBlocks.map((sec, idx) => (
            <View key={`${sec.title}-${idx}`} style={styles.sectionBlock}>
              <Text style={styles.sectionHeading}>{sec.title}</Text>
              <View style={styles.cardList}>
                {sec.items.map((dish) => (
                  <DishCard key={dish.id} dish={dish} />
                ))}
              </View>
            </View>
          ))}
        </>
      )}
    </DinerTabScreenLayout>
  );
}

const styles = StyleSheet.create({
  fallbackTitle: {
    ...Typography.heading,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  fallbackSub: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
  loading: {
    marginTop: Spacing.xxl,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    ...Typography.body,
    color: FIG.bodyMuted,
  },
  errorText: {
    ...Typography.body,
    color: Colors.error,
    textAlign: 'center',
  },
  /** Full-bleed chip strip (Figma: padding 12px 16px 1px, border bottom) */
  filterStrip: {
    marginHorizontal: -16,
    marginTop: -1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: FIG.border,
    marginBottom: 16,
  },
  filterScrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingRight: 8,
  },
  moreFiltersChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: FIG.chipBorder,
    backgroundColor: '#FFFFFF',
    gap: 6,
    flexShrink: 0,
  },
  moreFiltersText: {
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '500',
    letterSpacing: -0.076,
    color: FIG.sectionMuted,
  },
  recommendedHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  recommendedAccent: {
    width: 4,
    height: 20,
    borderRadius: 9999,
    backgroundColor: FIG.orange,
  },
  recommendedHeading: {
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '700',
    letterSpacing: 0.249,
    textTransform: 'uppercase',
    color: FIG.text,
  },
  cardList: {
    gap: 12,
    marginBottom: 8,
  },
  sectionBlock: {
    marginTop: 8,
    marginBottom: 8,
  },
  sectionHeading: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
    color: FIG.sectionMuted,
    marginBottom: 8,
  },
  dishCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: FIG.border,
    paddingVertical: 12,
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  dishCardPressed: {
    opacity: 0.9,
  },
  dishRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  dishImageGradient: {
    width: 80,
    height: 80,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dishImage: {
    width: 80,
    height: 80,
    borderRadius: 14,
    backgroundColor: '#F5F5F5',
  },
  dishEmoji: {
    fontSize: 24,
    lineHeight: 32,
  },
  dishTextCol: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  dishTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  dishName: {
    flex: 1,
    fontSize: 15,
    lineHeight: 19,
    fontWeight: '700',
    letterSpacing: -0.234,
    color: FIG.text,
  },
  heartIcon: {
    marginTop: -1,
  },
  dishDesc: {
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: -0.076,
    color: FIG.bodyMuted,
  },
  dishDescSpacer: {
    minHeight: 18,
  },
  dishBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  dishPrice: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '700',
    letterSpacing: -0.234,
    color: FIG.text,
  },
  flameRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 2,
  },
  flameIcon: {
    marginTop: 0,
  },
  grouped: {
    marginTop: Spacing.lg,
  },
  groupBlock: {
    marginBottom: Spacing.xxl,
  },
  groupTitle: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
    color: FIG.sectionMuted,
    marginBottom: 8,
  },
});
