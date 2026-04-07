import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { DinerTabScreenLayout } from '@/components/DinerTabScreenLayout';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { useGuardActiveRole } from '@/hooks/use-guard-active-role';
import {
  fetchDinerFavoritesList,
  toggleDishFavorite,
  type DinerFavoriteListItem,
} from '@/lib/diner-favorites';

/** Figma Diner Favorites */
const FIG = {
  canvas: '#101828',
  orange: '#FF6B35',
  text: '#101828',
  sub: '#99A1AF',
  bodyMuted: '#4A5565',
  border: '#E5E7EB',
  flameOff: '#D1D5DC',
  /** Figma: header strip is white (#FFFFFF), not yellow */
  headerBar: '#FFFFFF',
  /** Match diner-home stacked action card */
  stackBorder: '#F3F4F6',
  stackChevron: '#99A1AF',
} as const;

const PRICE_SYMBOL: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  CNY: '¥',
  JPY: '¥',
};

function formatPrice(item: DinerFavoriteListItem): string {
  if (item.priceDisplay?.trim()) return item.priceDisplay.trim();
  const amount = item.priceAmount;
  if (amount === null) return '—';
  const symbol = PRICE_SYMBOL[item.priceCurrency] ?? '';
  const formatted =
    Number.isInteger(amount) || Math.abs(amount - Math.round(amount)) < 1e-9
      ? `${Math.round(amount)}`
      : amount.toFixed(2).replace(/\.00$/, '');
  if (symbol) return `${symbol}${formatted}`;
  return `${formatted} ${item.priceCurrency}`;
}

function restaurantGroupLabel(row: DinerFavoriteListItem): string {
  const n = row.restaurantName?.trim();
  return n && n.length > 0 ? n : 'Restaurant';
}

export default function DinerFavoritesScreen() {
  useGuardActiveRole('diner');
  const router = useRouter();
  const [items, setItems] = useState<DinerFavoriteListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedRestaurants, setCollapsedRestaurants] = useState<Set<string>>(() => new Set());

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return items;
    return items.filter((row) => {
      const name = row.name.toLowerCase();
      const rest = (row.restaurantName ?? '').toLowerCase();
      return name.includes(q) || rest.includes(q);
    });
  }, [items, searchQuery]);

  const groupedByRestaurant = useMemo(() => {
    const map = new Map<string, DinerFavoriteListItem[]>();
    for (const row of filteredItems) {
      const label = restaurantGroupLabel(row);
      const list = map.get(label) ?? [];
      list.push(row);
      map.set(label, list);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0], undefined, { sensitivity: 'base' }));
  }, [filteredItems]);

  const toggleRestaurantSection = useCallback((label: string) => {
    setCollapsedRestaurants((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  }, []);

  const load = useCallback(async () => {
    try {
      const list = await fetchDinerFavoritesList();
      setItems(list);
    } catch (e) {
      Alert.alert('Could not load favorites', e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void load();
    }, [load])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void load();
  }, [load]);

  const openDish = useCallback(
    (row: DinerFavoriteListItem) => {
      if (!row.scanId) return;
      router.push({
        pathname: '/dish/[dishId]',
        params: {
          dishId: row.dishId,
          scanId: row.scanId,
          restaurantName: row.restaurantName ?? undefined,
        },
      });
    },
    [router]
  );

  const onUnfavorite = useCallback(
    async (row: DinerFavoriteListItem) => {
      try {
        await toggleDishFavorite(row.dishId);
        setItems((prev) => prev.filter((x) => x.dishId !== row.dishId));
      } catch (e) {
        Alert.alert('Could not update favorite', e instanceof Error ? e.message : 'Unknown error');
      }
    },
    []
  );

  const renderFlames = (level: 0 | 1 | 2 | 3) => {
    if (level === 0) return null;
    return (
      <View style={styles.flameRow} pointerEvents="none">
        {[0, 1, 2].map((i) => (
          <MaterialCommunityIcons
            key={i}
            name="fire"
            size={14}
            color={i < level ? FIG.orange : FIG.flameOff}
            style={styles.flameIcon}
          />
        ))}
      </View>
    );
  };

  const renderDishRow = (row: DinerFavoriteListItem) => {
    const restLabel = row.restaurantName?.trim() || 'Restaurant';
    return (
      <View style={styles.dishRowWrap}>
        <Pressable
          onPress={() => openDish(row)}
          style={({ pressed }) => [styles.dishRowHit, pressed && styles.dishRowPressed]}
          accessibilityRole="button"
          accessibilityLabel={`${row.name}, ${restLabel}, ${formatPrice(row)}`}
        >
          <View style={styles.cardRow}>
            {row.imageUrl ? (
              <Image source={{ uri: row.imageUrl }} style={styles.thumb} contentFit="cover" accessibilityLabel={row.name} />
            ) : (
              <LinearGradient
                colors={['#FFEDD4', '#FFF7ED']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.thumb}
              >
                <Text style={styles.thumbEmoji} accessibilityLabel="Dish placeholder">
                  🍽️
                </Text>
              </LinearGradient>
            )}

            <View style={styles.cardText}>
              <Text style={[styles.dishName, styles.dishNamePadded]} numberOfLines={2}>
                {row.name}
              </Text>
              <Text style={styles.restaurant} numberOfLines={1}>
                {restLabel}
              </Text>
              <View style={styles.bottomRow}>
                <Text style={styles.price}>{formatPrice(row)}</Text>
                {renderFlames(row.spiceLevel)}
              </View>
            </View>
          </View>
        </Pressable>
        <Pressable
          hitSlop={10}
          onPress={() => void onUnfavorite(row)}
          accessibilityRole="button"
          accessibilityLabel="Remove from favorites"
          style={({ pressed }) => [styles.heartFab, pressed && styles.iconPressed]}
        >
          <MaterialCommunityIcons name="heart" size={22} color={FIG.orange} />
        </Pressable>
      </View>
    );
  };

  const stackCardShadow = Platform.select({
    ios: {
      shadowColor: '#E5E7EB',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.5,
      shadowRadius: 6,
    },
    android: { elevation: 3 },
    default: {},
  });

  return (
    <View style={styles.outerCanvas}>
      <DinerTabScreenLayout
        activeTab="favorites"
        headerBanner={{ title: 'Favorites', backgroundColor: FIG.headerBar }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={FIG.orange} />
        }
      >
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={FIG.orange} />
            <Text style={styles.muted}>Loading favorites…</Text>
          </View>
        ) : items.length === 0 ? (
          <View style={styles.centered}>
            <MaterialCommunityIcons name="heart-outline" size={48} color={FIG.sub} />
            <Text style={styles.emptyTitle}>No favorites yet</Text>
            <Text style={styles.muted}>Save dishes from a menu or dish page — they will show up here.</Text>
          </View>
        ) : (
          <>
            <View style={styles.searchWrap}>
              <MaterialCommunityIcons name="magnify" size={20} color={FIG.sub} style={styles.searchIcon} />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search by dish or restaurant"
                placeholderTextColor={FIG.sub}
                style={styles.searchInput}
                autoCorrect={false}
                autoCapitalize="none"
                clearButtonMode="while-editing"
                accessibilityLabel="Search favorites by dish or restaurant name"
              />
            </View>
            {filteredItems.length === 0 ? (
              <View style={styles.centered}>
                <Text style={styles.emptyTitle}>No matches</Text>
                <Text style={styles.muted}>Try a different search, or clear the field to see all favorites.</Text>
              </View>
            ) : null}
            {groupedByRestaurant.map(([restaurantLabel, rows]) => {
              const collapsed = collapsedRestaurants.has(restaurantLabel);
              return (
                <View
                  key={restaurantLabel}
                  style={[styles.stackCard, { borderColor: FIG.stackBorder }, stackCardShadow]}
                >
                  <Pressable
                    onPress={() => toggleRestaurantSection(restaurantLabel)}
                    style={({ pressed }) => [styles.stackHeader, pressed && styles.stackHeaderPressed]}
                    accessibilityRole="button"
                    accessibilityLabel={`${restaurantLabel}, ${rows.length} saved dishes`}
                    accessibilityState={{ expanded: !collapsed }}
                  >
                    <MaterialCommunityIcons
                      name={collapsed ? 'chevron-right' : 'chevron-down'}
                      size={20}
                      color={FIG.stackChevron}
                    />
                    <View style={styles.stackHeaderNameWrap}>
                      <Text
                        style={styles.stackHeaderName}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        {restaurantLabel}
                      </Text>
                    </View>
                    <Text style={styles.stackHeaderCount} numberOfLines={1}>
                      {rows.length} saved {rows.length === 1 ? 'dish' : 'dishes'}
                    </Text>
                  </Pressable>
                  {!collapsed &&
                    rows.map((row) => (
                      <View key={row.dishId}>
                        <View style={styles.stackDivider} />
                        {renderDishRow(row)}
                      </View>
                    ))}
                </View>
              );
            })}
          </>
        )}
      </DinerTabScreenLayout>
    </View>
  );
}

const styles = StyleSheet.create({
  outerCanvas: {
    flex: 1,
    backgroundColor: FIG.canvas,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxl,
    gap: Spacing.sm,
  },
  muted: {
    ...Typography.body,
    color: FIG.bodyMuted,
    textAlign: 'center',
    paddingHorizontal: Spacing.lg,
  },
  emptyTitle: {
    ...Typography.headingSmall,
    color: FIG.text,
    marginTop: Spacing.sm,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: FIG.border,
    paddingLeft: 14,
    paddingRight: Platform.OS === 'ios' ? 12 : 10,
    marginBottom: 12,
    height: 48,
    minHeight: 48,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    alignSelf: 'stretch',
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 20,
    color: FIG.text,
    paddingTop: Platform.OS === 'ios' ? 10 : 0,
    paddingBottom: Platform.OS === 'ios' ? 14 : 0,
    paddingRight: 6,
    paddingLeft: 0,
    margin: 0,
    ...(Platform.OS === 'android'
      ? {
          textAlignVertical: 'center' as const,
          includeFontPadding: false,
          paddingVertical: 0,
        }
      : {}),
  },
  stackCard: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
  },
  stackHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 14,
    minHeight: 56,
  },
  stackHeaderPressed: {
    opacity: 0.92,
  },
  stackHeaderNameWrap: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
    marginRight: 10,
  },
  stackHeaderName: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
    letterSpacing: -0.312,
    color: FIG.text,
  },
  stackHeaderCount: {
    flexShrink: 0,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
    letterSpacing: -0.05,
    color: FIG.sub,
    textAlign: 'right',
  },
  stackDivider: {
    height: 1,
    backgroundColor: FIG.stackBorder,
  },
  dishRowWrap: {
    position: 'relative',
    backgroundColor: Colors.white,
  },
  dishRowHit: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  dishRowPressed: {
    opacity: 0.92,
  },
  heartFab: {
    position: 'absolute',
    top: 12,
    right: 12,
    padding: 4,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  thumb: {
    width: 80,
    height: 80,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbEmoji: {
    fontSize: 28,
  },
  cardText: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  dishName: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
    color: FIG.text,
  },
  dishNamePadded: {
    paddingRight: 36,
  },
  restaurant: {
    fontSize: 13,
    lineHeight: 18,
    color: FIG.sub,
    marginTop: 2,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  price: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '700',
    color: FIG.text,
  },
  flameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  flameIcon: {
    marginTop: 0,
  },
  iconPressed: {
    opacity: 0.7,
  },
});
