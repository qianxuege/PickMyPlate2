import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/PrimaryButton';
import { useGuardActiveRole } from '@/hooks/use-guard-active-role';
import { addRecentSearchForScan, getRecentSearchesForScan } from '@/lib/diner-search-recent';
import { fetchParsedMenuForScan } from '@/lib/fetch-parsed-menu-for-scan';
import type { ParsedMenuItem } from '@/lib/menu-scan-schema';
import { Spacing, Typography } from '@/constants/theme';

const FIG = {
  orange: '#FF6B35',
  text: '#101828',
  sub: '#4A5565',
  muted: '#667085',
  border: '#E5E7EB',
  rowBorder: '#D1D5DC',
  icon: '#99A1AF',
  heart: '#99A1AF',
  flameOff: '#D1D5DC',
} as const;

const PRICE_SYMBOL: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  CNY: '¥',
  JPY: '¥',
};

function formatPrice(dish: ParsedMenuItem): string {
  const amount = dish.price.amount;
  if (amount === null) return '—';
  const symbol = PRICE_SYMBOL[dish.price.currency] ?? '';
  const formatted =
    Number.isInteger(amount) || Math.abs(amount - Math.round(amount)) < 1e-9
      ? `${Math.round(amount)}`
      : amount.toFixed(2).replace(/\.00$/, '');
  if (symbol) return `${symbol}${formatted}`;
  return `${formatted} ${dish.price.currency}`;
}

function dishMatchesQuery(dish: ParsedMenuItem, q: string): boolean {
  const s = q.trim().toLowerCase();
  if (!s) return false;
  const blob = [
    dish.name,
    dish.description ?? '',
    ...(dish.tags ?? []),
    ...(dish.ingredients ?? []),
  ]
    .join(' ')
    .toLowerCase();
  return blob.includes(s);
}

function renderSpiceFlames(level: ParsedMenuItem['spice_level']) {
  if (level === 0) return null;
  const redCount = level;
  return (
    <View style={cardStyles.flameRow} pointerEvents="none">
      {[0, 1, 2].map((i) => {
        const isRed = i < redCount;
        return (
          <MaterialCommunityIcons
            key={i}
            name="fire"
            size={14}
            color={isRed ? FIG.orange : FIG.flameOff}
            style={cardStyles.flameIcon}
          />
        );
      })}
    </View>
  );
}

export default function DinerSearchScreen() {
  useGuardActiveRole('diner');
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ scanId?: string | string[]; restaurantName?: string | string[] }>();
  const scanIdRaw = params.scanId;
  const scanId = Array.isArray(scanIdRaw) ? scanIdRaw[0] : scanIdRaw;
  const restaurantNameRaw = params.restaurantName;
  const restaurantName = Array.isArray(restaurantNameRaw) ? restaurantNameRaw[0] : restaurantNameRaw;

  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [dishes, setDishes] = useState<ParsedMenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [recents, setRecents] = useState<string[]>([]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 220);
    return () => clearTimeout(t);
  }, [query]);

  const loadRecents = useCallback(async () => {
    if (!scanId) return;
    setRecents(await getRecentSearchesForScan(scanId));
  }, [scanId]);

  useEffect(() => {
    if (!scanId) {
      setLoading(false);
      setLoadError('Missing menu scan.');
      return;
    }

    let cancelled = false;
    (async () => {
      setLoadError(null);
      setLoading(true);
      const result = await fetchParsedMenuForScan(scanId);
      if (cancelled) return;
      if (!result.ok) {
        setLoadError(result.error);
        setDishes([]);
      } else {
        const flat = result.menu.sections.flatMap((s) => s.items);
        setDishes(flat);
      }
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [scanId]);

  useEffect(() => {
    void loadRecents();
  }, [loadRecents]);

  const filtered = useMemo(() => {
    const q = debouncedQuery.trim();
    if (!q) return [];
    return dishes.filter((d) => dishMatchesQuery(d, q));
  }, [debouncedQuery, dishes]);

  const backToMenu = useCallback(() => {
    if (!scanId) {
      router.back();
      return;
    }
    router.replace({ pathname: '/diner-menu', params: { scanId } });
  }, [router, scanId]);

  const onSubmitSearch = useCallback(async () => {
    const q = query.trim();
    if (!q || !scanId) return;
    await addRecentSearchForScan(scanId, q);
    await loadRecents();
  }, [query, scanId, loadRecents]);

  const applyRecent = useCallback((term: string) => {
    setQuery(term);
  }, []);

  const openDish = useCallback(
    (dish: ParsedMenuItem) => {
      if (!scanId) return;
      const q = debouncedQuery.trim();
      if (q) {
        void addRecentSearchForScan(scanId, q);
        void loadRecents();
      }
      router.push({
        pathname: '/dish/[dishId]',
        params: {
          dishId: dish.id,
          scanId,
          restaurantName: restaurantName?.trim() || undefined,
        },
      });
    },
    [router, scanId, restaurantName, debouncedQuery, loadRecents]
  );

  const showRecents = debouncedQuery.trim().length === 0 && recents.length > 0;
  const showResults = debouncedQuery.trim().length > 0;
  const hasQuery = query.trim().length > 0;

  const clearQuery = useCallback(() => {
    setQuery('');
    setDebouncedQuery('');
  }, []);

  return (
    <View style={[styles.root, { paddingTop: insets.top, backgroundColor: '#FFFFFF' }]}>
      <View style={styles.headerRow}>
        <Pressable
          onPress={backToMenu}
          style={({ pressed }) => [styles.circleBtn, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Back to menu"
        >
          <MaterialCommunityIcons name="arrow-left" size={20} color={FIG.text} />
        </Pressable>
      </View>

      <View style={[styles.body, { paddingBottom: insets.bottom + Spacing.sm }]}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title} accessibilityRole="header">
            Search Dishes
          </Text>
          <Text style={styles.subtitle}>Find your perfect meal</Text>

          <View style={styles.searchShell}>
            <View importantForAccessibility="no-hide-descendants">
              <MaterialCommunityIcons name="magnify" size={20} color={FIG.icon} />
            </View>
            <TextInput
              style={styles.searchInput}
              placeholder="Search for a dish..."
              placeholderTextColor={FIG.muted}
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={() => void onSubmitSearch()}
              returnKeyType="search"
              autoCapitalize="none"
              autoCorrect
              accessibilityLabel="Search dishes in this menu"
            />
            {hasQuery ? (
              <Pressable
                onPress={clearQuery}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel="Clear search"
                style={({ pressed }) => [styles.clearBtn, pressed && styles.pressed]}
              >
                <MaterialCommunityIcons name="close-circle" size={22} color={FIG.icon} />
              </Pressable>
            ) : null}
          </View>

          {loading ? (
            <View style={styles.centerBlock}>
              <ActivityIndicator color={FIG.orange} />
              <Text style={styles.mutedText}>Loading dishes…</Text>
            </View>
          ) : loadError ? (
            <Text style={styles.errorText}>{loadError}</Text>
          ) : (
            <>
              {showRecents && (
                <View style={styles.section}>
                  <Text style={styles.sectionLabel}>Recent Searches</Text>
                  {recents.map((term) => (
                    <Pressable
                      key={term}
                      onPress={() => applyRecent(term)}
                      style={({ pressed }) => [styles.recentRow, pressed && styles.pressed]}
                      accessibilityRole="button"
                      accessibilityLabel={`Recent search ${term}`}
                    >
                      <Text style={styles.recentText}>{term}</Text>
                    </Pressable>
                  ))}
                </View>
              )}

              {showResults && (
                <View style={styles.section}>
                  <Text style={styles.resultsHeading}>
                    Results ({filtered.length})
                  </Text>
                  {filtered.length === 0 ? (
                    <Text style={styles.mutedText}>Try a different keyword in this menu.</Text>
                  ) : (
                    <View style={styles.resultCardList}>
                      {filtered.map((dish) => (
                        <Pressable
                          key={dish.id}
                          onPress={() => openDish(dish)}
                          style={({ pressed }) => [cardStyles.dishCard, pressed && styles.pressed]}
                          accessibilityRole="button"
                          accessibilityLabel={`${dish.name}, ${formatPrice(dish)}`}
                        >
                          <View style={cardStyles.dishRow}>
                            <LinearGradient
                              colors={['#FFEDD4', '#FFF7ED']}
                              start={{ x: 0, y: 0 }}
                              end={{ x: 1, y: 1 }}
                              style={cardStyles.dishImageGradient}
                            >
                              <Text style={cardStyles.dishEmoji} accessibilityLabel="Dish placeholder">
                                🍽️
                              </Text>
                            </LinearGradient>

                            <View style={cardStyles.dishTextCol}>
                              <View style={cardStyles.dishTitleRow}>
                                <Text style={cardStyles.dishName} numberOfLines={2}>
                                  {dish.name}
                                </Text>
                                <View pointerEvents="none" style={cardStyles.heartIcon}>
                                  <MaterialCommunityIcons name="heart-outline" size={20} color={FIG.heart} />
                                </View>
                              </View>

                              {dish.description ? (
                                <Text style={cardStyles.dishDesc} numberOfLines={2}>
                                  {dish.description}
                                </Text>
                              ) : (
                                <View style={cardStyles.dishDescSpacer} />
                              )}

                              <View style={cardStyles.dishBottomRow}>
                                <Text style={cardStyles.dishPrice}>{formatPrice(dish)}</Text>
                                {renderSpiceFlames(dish.spice_level)}
                              </View>
                            </View>
                          </View>
                        </Pressable>
                      ))}
                    </View>
                  )}
                </View>
              )}

              {!showResults && !showRecents && !loading && !loadError && (
                <Text style={styles.mutedText}>Type a dish name or ingredient to search this menu.</Text>
              )}
            </>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <PrimaryButton
            text="Back to Menu"
            onPress={backToMenu}
            accentColor={FIG.orange}
            accentShadowRgb="255, 107, 53"
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: FIG.border,
  },
  circleBtn: {
    width: 40,
    height: 40,
    borderRadius: 9999,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.88,
  },
  body: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 16,
    flexGrow: 1,
  },
  title: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: '700',
    color: FIG.text,
    marginBottom: 6,
    textAlign: 'center',
  },
  subtitle: {
    ...Typography.body,
    color: FIG.sub,
    marginBottom: 20,
    textAlign: 'center',
  },
  /** Figma Diner Search Results: light gray search field */
  searchShell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: FIG.rowBorder,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 24,
    backgroundColor: '#FFFFFF',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
    color: FIG.text,
    padding: 0,
    minHeight: 24,
  },
  clearBtn: {
    marginLeft: 2,
  },
  section: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: FIG.text,
    marginBottom: 10,
  },
  /** Figma: "Results (1)" */
  resultsHeading: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
    color: FIG.text,
    marginBottom: 12,
  },
  resultCardList: {
    gap: 12,
  },
  recentRow: {
    borderWidth: 1,
    borderColor: FIG.rowBorder,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 8,
    backgroundColor: '#FFFFFF',
  },
  recentText: {
    fontSize: 16,
    color: FIG.text,
  },
  centerBlock: {
    alignItems: 'center',
    gap: 12,
    marginTop: 24,
  },
  mutedText: {
    ...Typography.body,
    color: FIG.muted,
  },
  errorText: {
    ...Typography.body,
    color: '#E53E3E',
  },
  footer: {
    paddingTop: 12,
  },
});

/** Match diner-menu dish cards (Figma search result rows). */
const cardStyles = StyleSheet.create({
  dishCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: FIG.border,
    paddingVertical: 12,
    paddingHorizontal: 12,
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
    alignItems: 'flex-start',
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
    color: FIG.sub,
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
});
