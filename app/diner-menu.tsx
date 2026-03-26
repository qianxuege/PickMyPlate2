import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { DinerTabScreenLayout } from '@/components/DinerTabScreenLayout';
import { MenuFilterChip } from '@/components/MenuFilterChip';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { useGuardActiveRole } from '@/hooks/use-guard-active-role';
import type { DinerPreferenceSnapshot } from '@/lib/diner-preferences';
import { fetchDinerPreferences, spiceDbToLabel } from '@/lib/diner-preferences';
import { fetchFavoritedDishIds, toggleDishFavorite } from '@/lib/diner-favorites';
import { fetchParsedMenuForScan } from '@/lib/fetch-parsed-menu-for-scan';
import type { ParsedMenu, ParsedMenuItem } from '@/lib/menu-scan-schema';

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
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void (async () => {
        try {
          const ids = await fetchFavoritedDishIds();
          if (!cancelled) setFavoriteIds(ids);
        } catch {
          /* ignore */
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [])
  );

  const handleToggleFavorite = useCallback(async (dishId: string) => {
    try {
      const next = await toggleDishFavorite(dishId);
      setFavoriteIds((prev) => {
        const n = new Set(prev);
        if (next) n.add(dishId);
        else n.delete(dishId);
        return n;
      });
    } catch (e) {
      Alert.alert('Favorites', e instanceof Error ? e.message : 'Could not update favorite.');
    }
  }, []);

  const loadMenu = useCallback(async () => {
    if (!scanId) return;
    try {
      setError(null);
      setLoading(true);

      const prefSnap = await fetchDinerPreferences();
      const fetched = await fetchParsedMenuForScan(scanId);
      if (!fetched.ok) throw new Error(fetched.error);

      setPrefs(prefSnap);
      setMenu(fetched.menu);
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

  const menuTagSet = useMemo(() => {
    return new Set<string>(menu?.sections.flatMap((s) => s.items.flatMap((i) => i.tags)) ?? []);
  }, [menu]);

  /**
   * Hard filter: no chips => full menu; one+ chips => only dishes whose `tags` include every selected chip.
   * Sections with zero matching dishes are dropped.
   */
  const sectionBlocks = useMemo(() => {
    if (!menu) return [];

    const matchesSelected = (dish: ParsedMenuItem) =>
      selectedTags.length === 0 || selectedTags.every((t) => dish.tags.includes(t));

    return menu.sections
      .map((sec) => ({
        title: sec.title,
        items: sec.items.filter(matchesSelected),
      }))
      .filter((s) => s.items.length > 0);
  }, [menu, selectedTags]);

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

  const DishCard = ({ dish }: { dish: ParsedMenuItem }) => {
    const favorited = favoriteIds.has(dish.id);
    const normalizedPartnerTags = dish.tags
      .map((t) => t.trim().toLowerCase())
      .map((t) => (t === "chef's recommendation" ? 'featured' : t))
      .filter((t) => t === 'new' || t === 'popular' || t === 'featured');
    const partnerTags = Array.from(new Set(normalizedPartnerTags));
    return (
      <View style={styles.dishCard}>
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
          style={({ pressed }) => [styles.dishCardHit, pressed && styles.dishCardPressed]}
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
              <Text style={[styles.dishName, styles.dishNameWithHeartPad]} numberOfLines={1}>
                {dish.name}
              </Text>

              {dish.description ? (
                <Text style={styles.dishDesc} numberOfLines={2}>
                  {dish.description}
                </Text>
              ) : (
                <View style={styles.dishDescSpacer} />
              )}

              {partnerTags.length > 0 ? (
                <View style={styles.partnerTagRow}>
                  {partnerTags.map((tag) => (
                    <View
                      key={`${dish.id}-${tag}`}
                      style={[
                        styles.partnerTagChip,
                        tag === 'new'
                          ? styles.partnerTagNew
                          : tag === 'popular'
                            ? styles.partnerTagPopular
                            : styles.partnerTagChef,
                      ]}
                    >
                      <Text style={styles.partnerTagText}>
                        {tag === 'featured' ? 'Featured' : tag.charAt(0).toUpperCase() + tag.slice(1)}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : null}

              <View style={styles.dishBottomRow}>
                <Text style={styles.dishPrice}>{formatPrice(dish)}</Text>
                {renderSpiceFlames(dish.spice_level)}
              </View>
            </View>
          </View>
        </Pressable>
        <Pressable
          hitSlop={10}
          onPress={() => void handleToggleFavorite(dish.id)}
          style={({ pressed }) => [styles.dishHeartFab, pressed && styles.dishHeartFabPressed]}
          accessibilityRole="button"
          accessibilityLabel={favorited ? 'Remove from favorites' : 'Add to favorites'}
        >
          <MaterialCommunityIcons
            name={favorited ? 'heart' : 'heart-outline'}
            size={20}
            color={favorited ? FIG.orange : FIG.heart}
          />
        </Pressable>
      </View>
    );
  };

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
    <DinerTabScreenLayout
      activeTab="menu"
      menuHeader={{
        title: loading ? 'Menu' : headerTitle,
        scanId,
        restaurantName: headerTitle,
      }}
    >
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

          {selectedTags.length > 0 && sectionBlocks.length === 0 ? (
            <Text style={styles.filterEmptyText}>No dishes match all selected filters.</Text>
          ) : null}

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
  filterEmptyText: {
    ...Typography.body,
    color: FIG.bodyMuted,
    marginBottom: 16,
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
    position: 'relative',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: FIG.border,
  },
  dishCardHit: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    paddingBottom: 12,
    borderRadius: 16,
  },
  dishCardPressed: {
    opacity: 0.9,
  },
  dishHeartFab: {
    position: 'absolute',
    top: 10,
    right: 10,
    padding: 4,
  },
  dishHeartFabPressed: {
    opacity: 0.75,
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
  dishName: {
    fontSize: 15,
    lineHeight: 19,
    fontWeight: '700',
    letterSpacing: -0.234,
    color: FIG.text,
  },
  dishNameWithHeartPad: {
    paddingRight: 36,
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
  partnerTagRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
    marginTop: 2,
  },
  partnerTagChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  partnerTagNew: {
    backgroundColor: '#E0F2FE',
  },
  partnerTagPopular: {
    backgroundColor: '#FEF3C7',
  },
  partnerTagChef: {
    backgroundColor: '#FFE4D6',
  },
  partnerTagText: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
    color: '#1F2937',
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
