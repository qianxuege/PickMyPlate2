import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HighlightDishBadges } from '@/components/HighlightDishBadges';
import { RestaurantUiInspect } from '@/constants/restaurant-ui-inspect';
import { BorderRadius, Colors, Spacing, Typography } from '@/constants/theme';
import { useGuardActiveRole } from '@/hooks/use-guard-active-role';
import { dishCaloriesPrimaryText, dishCaloriesUsesMutedStyle } from '@/lib/dish-calories-label';
import { DISH_INGREDIENT_ORIGIN_NOT_SPECIFIED } from '@/lib/restaurant-ingredient-items';
import { fetchPublishedRestaurantDishDetail, type PublishedRestaurantDishDetail } from '@/lib/restaurant-public-dish';

export default function RestaurantDishDetailScreen() {
  useGuardActiveRole('diner');
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { dishId } = useLocalSearchParams<{ dishId: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<PublishedRestaurantDishDetail | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!dishId || typeof dishId !== 'string') {
        setError('Missing dish');
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      const res = await fetchPublishedRestaurantDishDetail(dishId);
      if (cancelled) return;
      if (!res.ok) {
        setError(res.error);
        setDetail(null);
      } else {
        setDetail(res.dish);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [dishId]);

  const priceLabel =
    detail?.price_display?.trim() ||
    (detail?.price_amount == null ? '—' : String(detail.price_amount));

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <MaterialCommunityIcons name="chevron-left" size={26} color={RestaurantUiInspect.text} />
        </Pressable>
        <Text style={styles.topTitle} numberOfLines={1}>
          {detail?.restaurantName ?? 'Dish'}
        </Text>
        <View style={styles.backBtn} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={RestaurantUiInspect.accent} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errText}>{error}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={() => router.back()}
            style={styles.errBtn}
          >
            <Text style={styles.errBtnText}>Go back</Text>
          </Pressable>
        </View>
      ) : detail ? (
        <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + Spacing.xxl }]} showsVerticalScrollIndicator={false}>
          {detail.image_url ? (
            <Image source={{ uri: detail.image_url }} style={styles.hero} contentFit="cover" accessibilityLabel={detail.name} />
          ) : (
            <View style={[styles.hero, styles.heroPlaceholder]}>
              <MaterialCommunityIcons name="silverware-fork-knife" size={40} color={Colors.textPlaceholder} />
            </View>
          )}
          <View style={styles.body}>
            <Text style={styles.name}>{detail.name}</Text>
            <View style={styles.priceRow}>
              <Text style={styles.price}>{priceLabel}</Text>
              {detail.spice_level > 0 ? (
                <View style={styles.spiceRow}>
                  {Array.from({ length: Math.min(detail.spice_level, 3) }).map((_, i) => (
                    <MaterialCommunityIcons key={i} name="chili-hot" size={16} color="#E11D48" />
                  ))}
                </View>
              ) : null}
            </View>
            <HighlightDishBadges is_featured={detail.is_featured} is_new={detail.is_new} />
            <Text
              style={[
                styles.caloriesLine,
                dishCaloriesUsesMutedStyle(detail.calories_manual, detail.calories_estimated) && styles.caloriesLineMuted,
              ]}
            >
              {dishCaloriesPrimaryText(detail.calories_manual, detail.calories_estimated)}
            </Text>
            {detail.description ? <Text style={styles.desc}>{detail.description}</Text> : null}
            {detail.ingredientItems.length > 0 ? (
              <View style={styles.block}>
                <Text style={styles.blockTitle}>Ingredients</Text>
                <View style={styles.ingredientList}>
                  {detail.ingredientItems.map((item, idx) => {
                    const originShown = item.origin?.trim() ?? '';
                    return (
                      <View key={`${idx}-${item.name}`} style={styles.ingredientLine}>
                        <Text style={styles.ingredientName}>{item.name}</Text>
                        <Text
                          style={[
                            styles.ingredientOrigin,
                            !originShown ? styles.ingredientOriginPlaceholder : null,
                          ]}
                        >
                          {originShown || DISH_INGREDIENT_ORIGIN_NOT_SPECIFIED}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            ) : null}
          </View>
        </ScrollView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: RestaurantUiInspect.border,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topTitle: {
    ...Typography.bodyMedium,
    fontWeight: '700',
    color: RestaurantUiInspect.text,
    flex: 1,
    textAlign: 'center',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  errText: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  errBtn: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    backgroundColor: RestaurantUiInspect.tint,
  },
  errBtnText: {
    ...Typography.bodyMedium,
    fontWeight: '700',
    color: RestaurantUiInspect.accentDeep,
  },
  scroll: {
    flexGrow: 1,
  },
  hero: {
    width: '100%',
    height: 220,
    backgroundColor: '#F3F4F6',
  },
  heroPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  name: {
    ...Typography.headingSmall,
    fontWeight: '800',
    color: RestaurantUiInspect.text,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  price: {
    ...Typography.headingSmall,
    fontWeight: '800',
    color: RestaurantUiInspect.text,
  },
  spiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  desc: {
    ...Typography.body,
    color: RestaurantUiInspect.sub,
  },
  caloriesLine: {
    ...Typography.bodyMedium,
    color: RestaurantUiInspect.text,
  },
  caloriesLineMuted: {
    color: Colors.textSecondary,
  },
  block: {
    gap: Spacing.xs,
  },
  blockTitle: {
    ...Typography.captionMedium,
    fontWeight: '700',
    color: RestaurantUiInspect.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  blockBody: {
    ...Typography.body,
    color: RestaurantUiInspect.text,
  },
  ingredientList: {
    gap: Spacing.md,
  },
  ingredientLine: {
    gap: 2,
  },
  ingredientName: {
    ...Typography.bodyMedium,
    fontWeight: '700',
    color: RestaurantUiInspect.text,
  },
  ingredientOrigin: {
    ...Typography.body,
    color: RestaurantUiInspect.sub,
  },
  ingredientOriginPlaceholder: {
    color: RestaurantUiInspect.muted,
    fontStyle: 'italic',
  },
});
