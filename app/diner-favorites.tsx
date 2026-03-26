import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { DinerTabScreenLayout } from '@/components/DinerTabScreenLayout';
import { Spacing, Typography } from '@/constants/theme';
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

export default function DinerFavoritesScreen() {
  useGuardActiveRole('diner');
  const router = useRouter();
  const [items, setItems] = useState<DinerFavoriteListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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
          items.map((row) => (
            <View key={row.dishId} style={styles.card}>
              <Pressable
                onPress={() => openDish(row)}
                style={({ pressed }) => [styles.cardHit, pressed && styles.cardPressed]}
                accessibilityRole="button"
                accessibilityLabel={`${row.name}, ${row.restaurantName ?? 'Restaurant'}, ${formatPrice(row)}`}
              >
                <View style={styles.cardRow}>
                  {row.imageUrl ? (
                    <Image source={{ uri: row.imageUrl }} style={styles.thumb} contentFit="cover" />
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
                      {row.restaurantName ?? 'Restaurant'}
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
          ))
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
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: FIG.border,
    marginBottom: 12,
    position: 'relative',
  },
  cardHit: {
    padding: 12,
    borderRadius: 16,
  },
  cardPressed: {
    opacity: 0.92,
  },
  heartFab: {
    position: 'absolute',
    top: 10,
    right: 10,
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
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
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
