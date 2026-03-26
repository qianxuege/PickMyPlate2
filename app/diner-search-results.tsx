import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DinerSearchChrome, DinerSearchFooter, DS } from '@/components/diner-search-ui';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { useGuardActiveRole } from '@/hooks/use-guard-active-role';
import { fetchFavoritedDishIds, toggleDishFavorite } from '@/lib/diner-favorites';
import { addDinerSearchRecent } from '@/lib/diner-search-recent';
import { fetchParsedMenuForScan } from '@/lib/fetch-parsed-menu-for-scan';
import type { ParsedMenu, ParsedMenuItem } from '@/lib/menu-scan-schema';

/**
 * Figma node 43-813 — Diner Search Results (search field + Results (N) + dish cards).
 */
const PRICE_SYMBOL: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  CNY: '¥',
  JPY: '¥',
};

type DishWithSection = ParsedMenuItem & { sectionTitle: string };

function formatPrice(dish: ParsedMenuItem): string {
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
}

function renderSpiceFlames(level: ParsedMenuItem['spice_level']) {
  if (level === 0) return null;
  return (
    <View style={styles.flameRow} pointerEvents="none">
      {[0, 1, 2].map((i) => (
        <MaterialCommunityIcons
          key={i}
          name="fire"
          size={14}
          color={i < level ? DS.orange : DS.flameOff}
          style={styles.flameIcon}
        />
      ))}
    </View>
  );
}

function flattenMenu(menu: ParsedMenu): DishWithSection[] {
  const out: DishWithSection[] = [];
  for (const sec of menu.sections) {
    for (const item of sec.items) {
      out.push({ ...item, sectionTitle: sec.title });
    }
  }
  return out;
}

function matchesQuery(dish: DishWithSection, raw: string): boolean {
  const q = raw.trim().toLowerCase();
  if (!q) return true;
  const blob = [
    dish.name,
    dish.description ?? '',
    dish.ingredients.join(' '),
    dish.tags.join(' '),
    dish.sectionTitle,
  ]
    .join(' ')
    .toLowerCase();
  return blob.includes(q);
}

export default function DinerSearchResultsScreen() {
  useGuardActiveRole('diner');
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    scanId?: string | string[];
    restaurantName?: string | string[];
    query?: string | string[];
  }>();
  const scanIdRaw = params.scanId;
  const scanId = Array.isArray(scanIdRaw) ? scanIdRaw[0] : scanIdRaw;
  const nameRaw = params.restaurantName;
  const restaurantNameParam = Array.isArray(nameRaw) ? nameRaw[0] : nameRaw;
  const queryRaw = params.query;
  const initialQuery = (Array.isArray(queryRaw) ? queryRaw[0] : queryRaw) ?? '';

  const [query, setQuery] = useState(initialQuery);
  const [menu, setMenu] = useState<ParsedMenu | null>(null);
  const [loading, setLoading] = useState(Boolean(scanId));
  const [error, setError] = useState<string | null>(null);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());

  const headerTitle =
    menu?.restaurant_name?.trim() || restaurantNameParam?.trim() || 'Menu';

  useFocusEffect(
    useCallback(() => {
      const q = (Array.isArray(queryRaw) ? queryRaw[0] : queryRaw) ?? '';
      setQuery(q);
    }, [queryRaw])
  );

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

  const loadMenu = useCallback(async () => {
    if (!scanId) return;
    try {
      setError(null);
      setLoading(true);
      const fetched = await fetchParsedMenuForScan(scanId);
      if (!fetched.ok) throw new Error(fetched.error);
      setMenu(fetched.menu);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load menu');
      setMenu(null);
    } finally {
      setLoading(false);
    }
  }, [scanId]);

  useFocusEffect(
    useCallback(() => {
      void loadMenu();
    }, [loadMenu])
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

  const allDishes = useMemo(() => (menu ? flattenMenu(menu) : []), [menu]);

  const filtered = useMemo(
    () => allDishes.filter((d) => matchesQuery(d, query)),
    [allDishes, query]
  );

  /** Figma: primary action returns to the menu for this scan (not the intermediate search screen). */
  const goBackToMenu = useCallback(() => {
    if (scanId) {
      router.replace({ pathname: '/diner-menu', params: { scanId } });
      return;
    }
    router.replace('/diner-home');
  }, [router, scanId]);

  const submitSearch = useCallback(async () => {
    if (!scanId) return;
    const trimmed = query.trim();
    if (trimmed.length >= 2) {
      await addDinerSearchRecent(scanId, trimmed);
    }
  }, [query, scanId]);

  const openDish = useCallback(
    async (item: DishWithSection) => {
      if (scanId && query.trim().length >= 2) {
        await addDinerSearchRecent(scanId, query.trim());
      }
      router.push({
        pathname: '/dish/[dishId]',
        params: {
          dishId: item.id,
          scanId,
          restaurantName: headerTitle,
        },
      });
    },
    [headerTitle, query, router, scanId]
  );

  const renderItem = useCallback(
    ({ item }: { item: DishWithSection }) => {
      const favorited = favoriteIds.has(item.id);
      return (
        <View style={styles.card}>
          <Pressable
            accessibilityRole="button"
            onPress={() => void openDish(item)}
            style={({ pressed }) => [styles.cardHit, pressed && styles.cardPressed]}
          >
            <View style={styles.row}>
              {item.image_url ? (
                <Image source={{ uri: item.image_url }} contentFit="cover" style={styles.thumb} />
              ) : (
                <LinearGradient
                  colors={['#FFEDD4', '#FFF7ED']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.thumbGradient}
                >
                  <Text style={styles.thumbEmoji} accessibilityLabel="Dish placeholder">
                    🍽️
                  </Text>
                </LinearGradient>
              )}
              <View style={styles.textCol}>
                <Text style={[styles.dishName, styles.dishNamePad]} numberOfLines={2}>
                  {item.name}
                </Text>
                {item.description ? (
                  <Text style={styles.dishDesc} numberOfLines={2}>
                    {item.description}
                  </Text>
                ) : (
                  <View style={styles.dishDescSpacer} />
                )}
                <View style={styles.bottomRow}>
                  <Text style={styles.price}>{formatPrice(item)}</Text>
                  {renderSpiceFlames(item.spice_level)}
                </View>
              </View>
            </View>
          </Pressable>
          <Pressable
            hitSlop={10}
            onPress={() => void handleToggleFavorite(item.id)}
            style={({ pressed }) => [styles.heartFab, pressed && styles.heartFabPressed]}
            accessibilityRole="button"
            accessibilityLabel={favorited ? 'Remove from favorites' : 'Add to favorites'}
          >
            <MaterialCommunityIcons
              name={favorited ? 'heart' : 'heart-outline'}
              size={20}
              color={favorited ? DS.orange : DS.heart}
            />
          </Pressable>
        </View>
      );
    },
    [favoriteIds, handleToggleFavorite, openDish]
  );

  if (!scanId) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <View style={styles.hPad}>
          <Text style={styles.fallbackTitle}>Search results</Text>
          <Text style={styles.fallbackSub}>Missing scan. Go back to the menu and open search again.</Text>
          <Pressable onPress={() => router.replace('/diner-home')} style={styles.linkBtn}>
            <Text style={styles.linkBtnText}>Go home</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.panel}>
        <View style={[styles.topBlock, { paddingTop: insets.top + Spacing.xs }]}>
          <View style={styles.hPad}>
            <DinerSearchChrome
              query={query}
              onChangeQuery={setQuery}
              onSubmitSearch={() => void submitSearch()}
            />
          </View>
        </View>

        {loading ? (
          <View style={styles.flexCenter}>
            <ActivityIndicator color={DS.orange} size="large" />
            <Text style={styles.loadingText}>Loading dishes…</Text>
          </View>
        ) : error ? (
          <View style={styles.flexCenter}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable onPress={() => void loadMenu()} style={styles.retry}>
              <Text style={styles.retryText}>Try again</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.listWrap}>
            <View style={styles.hPad}>
              <Text style={styles.resultsHeading}>
                Results ({filtered.length})
              </Text>
            </View>
            <FlatList
              data={filtered}
              keyExtractor={(item) => item.id}
              renderItem={renderItem}
              style={styles.flex}
              contentContainerStyle={[
                styles.listContent,
                { paddingBottom: Spacing.md },
                filtered.length === 0 && styles.listEmpty,
              ]}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={
                <Text style={styles.emptyResults}>No dishes match your search.</Text>
              }
            />
          </View>
        )}

        <DinerSearchFooter onBackToMenu={goBackToMenu} bottomInset={insets.bottom} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: DS.shellBg,
  },
  panel: {
    flex: 1,
    width: '100%',
    backgroundColor: DS.screenBg,
  },
  flex: { flex: 1 },
  hPad: { paddingHorizontal: 24 },
  topBlock: {
    paddingBottom: 12,
    backgroundColor: DS.screenBg,
  },
  listWrap: {
    flex: 1,
    backgroundColor: DS.listBg,
  },
  resultsHeading: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '700',
    color: DS.text,
    marginBottom: Spacing.sm,
  },
  flexCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
    gap: 12,
    backgroundColor: DS.listBg,
  },
  loadingText: {
    ...Typography.body,
    color: DS.muted,
  },
  errorText: {
    ...Typography.body,
    color: Colors.error,
    textAlign: 'center',
  },
  retry: { marginTop: Spacing.sm },
  retryText: {
    ...Typography.body,
    color: DS.orange,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.xs,
  },
  listEmpty: { flexGrow: 1 },
  emptyResults: {
    ...Typography.body,
    color: DS.muted,
    textAlign: 'center',
    marginTop: Spacing.xxl,
  },
  card: {
    position: 'relative',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: DS.border,
    marginBottom: 12,
  },
  cardHit: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  cardPressed: { opacity: 0.94 },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  thumb: {
    width: 72,
    height: 72,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
  },
  thumbGradient: {
    width: 72,
    height: 72,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbEmoji: { fontSize: 24 },
  textCol: { flex: 1, minWidth: 0, gap: 4 },
  dishName: {
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '700',
    letterSpacing: -0.26,
    color: DS.text,
  },
  dishNamePad: { paddingRight: 36 },
  dishDesc: {
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: -0.076,
    color: DS.bodyMuted,
  },
  dishDescSpacer: { minHeight: 8 },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  price: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '700',
    letterSpacing: -0.23,
    color: DS.text,
  },
  flameRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  flameIcon: { marginTop: 0 },
  heartFab: {
    position: 'absolute',
    top: 10,
    right: 10,
    padding: 4,
  },
  heartFabPressed: { opacity: 0.75 },
  fallbackTitle: {
    ...Typography.heading,
    color: DS.text,
    marginBottom: Spacing.sm,
  },
  fallbackSub: {
    ...Typography.body,
    color: DS.muted,
    marginBottom: Spacing.md,
  },
  linkBtn: { alignSelf: 'flex-start' },
  linkBtnText: {
    ...Typography.body,
    color: DS.orange,
    fontWeight: '600',
  },
});
