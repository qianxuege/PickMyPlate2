import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { DinerTabScreenLayout } from '@/components/DinerTabScreenLayout';
import { HighlightDishBadges } from '@/components/HighlightDishBadges';
import { RestaurantUiInspect } from '@/constants/restaurant-ui-inspect';
import { BorderRadius, Colors, Spacing, Typography } from '@/constants/theme';
import { useGuardActiveRole } from '@/hooks/use-guard-active-role';
import { fetchDinerHighlightDishes, type DinerHighlightDishRow } from '@/lib/fetch-diner-highlight-dishes';

function SpiceRow({ level }: { level: number }) {
  if (level <= 0) return null;
  return (
    <View style={styles.spiceRow}>
      {Array.from({ length: Math.min(level, 3) }).map((_, i) => (
        <MaterialCommunityIcons key={i} name="chili-hot" size={14} color="#E11D48" />
      ))}
    </View>
  );
}

export default function DinerHighlightScreen() {
  useGuardActiveRole('diner');
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rows, setRows] = useState<DinerHighlightDishRow[]>([]);
  const [scanRestaurantName, setScanRestaurantName] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await fetchDinerHighlightDishes();
      setScanRestaurantName(data.restaurantName);
      setRows(data.rows);
    } catch {
      setScanRestaurantName(null);
      setRows([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void load();
    }, [load]),
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void load();
  }, [load]);

  return (
    <DinerTabScreenLayout
      activeTab="menu"
      bottomNavVariant="dark"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={RestaurantUiInspect.accent} />}
    >
      <Text style={styles.pageTitle}>Highlight dishes</Text>
      <Text style={styles.pageSubtitle}>
        Highlights from your latest scanned menu
        {scanRestaurantName ? ` (${scanRestaurantName})` : ''}.
      </Text>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={RestaurantUiInspect.accent} />
        </View>
      ) : rows.length === 0 ? (
        <View style={styles.empty}>
          <MaterialCommunityIcons name="star-outline" size={44} color={RestaurantUiInspect.muted} />
          <Text style={styles.emptyTitle}>No highlights yet</Text>
          <Text style={styles.emptyBody}>
            Scan a restaurant menu first. You will only see Featured/New dishes for that scanned restaurant.
          </Text>
        </View>
      ) : (
        <View style={styles.list}>
          <Text style={styles.sectionLabel}>Suggested for you</Text>
          {rows.map((item) => {
            const price =
              item.price_display?.trim() ||
              (item.price_amount == null ? '—' : String(item.price_amount));
            return (
              <Pressable
                key={`${item.restaurantId}-${item.dishId}`}
                accessibilityRole="button"
                accessibilityLabel={`${item.name}, ${item.restaurantName}`}
                style={({ pressed }) => [styles.card, pressed && { opacity: 0.92 }]}
                onPress={() =>
                  router.push({
                    pathname: '/restaurant-dish/[dishId]',
                    params: { dishId: item.dishId },
                  })
                }
              >
                <View style={styles.cardRow}>
                  {item.image_url ? (
                    <Image source={{ uri: item.image_url }} style={styles.cardImage} accessibilityLabel={item.name} />
                  ) : (
                    <View style={styles.cardImage}>
                      <MaterialCommunityIcons name="silverware-fork-knife" size={26} color={Colors.textPlaceholder} />
                    </View>
                  )}
                  <View style={styles.cardBody}>
                    <Text style={styles.restaurantName} numberOfLines={1}>
                      {item.restaurantName}
                    </Text>
                    <Text style={styles.dishName} numberOfLines={2}>
                      {item.name}
                    </Text>
                    {item.description ? (
                      <Text style={styles.desc} numberOfLines={2}>
                        {item.description}
                      </Text>
                    ) : null}
                    <View style={styles.priceRow}>
                      <Text style={styles.price}>{price}</Text>
                      <SpiceRow level={item.spice_level} />
                    </View>
                    <Text style={styles.aiHint}>AI suggestion</Text>
                    <HighlightDishBadges is_featured={item.is_featured} is_new={item.is_new} />
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>
      )}
    </DinerTabScreenLayout>
  );
}

const styles = StyleSheet.create({
  pageTitle: {
    ...Typography.heading,
    color: RestaurantUiInspect.text,
    marginBottom: Spacing.xs,
  },
  pageSubtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
  },
  center: {
    paddingVertical: Spacing.xxl,
    alignItems: 'center',
  },
  empty: {
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.xxl,
    paddingHorizontal: Spacing.md,
  },
  emptyTitle: {
    ...Typography.headingSmall,
    fontWeight: '700',
    color: RestaurantUiInspect.text,
    textAlign: 'center',
  },
  emptyBody: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  list: {
    gap: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  sectionLabel: {
    ...Typography.bodyMedium,
    fontWeight: '700',
    color: RestaurantUiInspect.text,
    marginBottom: Spacing.xs,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: RestaurantUiInspect.border,
    padding: Spacing.md,
    shadowColor: '#101828',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  cardRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  cardImage: {
    width: 96,
    height: 96,
    borderRadius: BorderRadius.md,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  restaurantName: {
    ...Typography.captionMedium,
    fontWeight: '700',
    color: RestaurantUiInspect.accent,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  dishName: {
    ...Typography.bodyMedium,
    fontWeight: '800',
    color: RestaurantUiInspect.text,
  },
  desc: {
    ...Typography.caption,
    color: RestaurantUiInspect.sub,
    marginTop: 2,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  price: {
    ...Typography.bodyMedium,
    fontWeight: '800',
    color: RestaurantUiInspect.text,
  },
  spiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  aiHint: {
    ...Typography.caption,
    fontWeight: '600',
    color: RestaurantUiInspect.accentAlt,
    marginTop: Spacing.xs,
  },
});
