import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HighlightDishBadges } from '@/components/HighlightDishBadges';
import { restaurantRoleTheme } from '@/constants/role-theme';
import { BorderRadius, Colors, Spacing, Typography } from '@/constants/theme';
import { useGuardActiveRole } from '@/hooks/use-guard-active-role';
import { dishCaloriesPrimaryText, dishCaloriesUsesMutedStyle } from '@/lib/dish-calories-label';
import { DISH_INGREDIENT_ORIGIN_NOT_SPECIFIED } from '@/lib/restaurant-ingredient-items';
import { fetchRestaurantOwnerDishDetail, type RestaurantOwnerDishDetail } from '@/lib/restaurant-owner-dish-detail';

const t = restaurantRoleTheme;

const G = {
  text: '#101828',
  sub: '#4A5565',
  muted: '#99A1AF',
  border: '#E5E7EB',
  greenBg: t.primaryLight,
  greenBorder: t.cardAccentBorder,
  greenText: t.primaryDark,
} as const;

function formatPrice(detail: RestaurantOwnerDishDetail): string | null {
  if (detail.price_display?.trim()) return detail.price_display.trim();
  if (detail.price_amount == null) return null;
  const symbols: Record<string, string> = { USD: '$', EUR: '€', GBP: '£', CNY: '¥', JPY: '¥' };
  const sym = symbols[detail.price_currency] ?? '';
  const num = Number.isInteger(detail.price_amount)
    ? String(detail.price_amount)
    : detail.price_amount.toFixed(2).replace(/\.00$/, '');
  return sym ? `${sym}${num}` : `${num} ${detail.price_currency}`;
}

export default function RestaurantOwnerDishDetailScreen() {
  useGuardActiveRole('restaurant');
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { dishId } = useLocalSearchParams<{ dishId: string }>();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<RestaurantOwnerDishDetail | null>(null);

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
      const res = await fetchRestaurantOwnerDishDetail(dishId);
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

  const priceLabel = detail ? formatPrice(detail) : null;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.topBar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => router.back()}
          hitSlop={12}
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.7 }]}
        >
          <MaterialCommunityIcons name="chevron-left" size={26} color={G.text} />
        </Pressable>
        <Text style={styles.topTitle} numberOfLines={1}>
          {detail?.menuName ?? 'Dish'}
        </Text>
        {/* Spacer to balance the back button */}
        <View style={styles.backBtn} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={t.primary} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errText}>{error}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={() => router.back()}
            style={({ pressed }) => [styles.errBtn, pressed && { opacity: 0.85 }]}
          >
            <Text style={styles.errBtnText}>Go back</Text>
          </Pressable>
        </View>
      ) : detail ? (
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + Spacing.xxl }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero image */}
          {detail.image_url ? (
            <Image source={{ uri: detail.image_url }} style={styles.hero} contentFit="cover" accessibilityLabel={detail.name} />
          ) : (
            <View style={[styles.hero, styles.heroPlaceholder]}>
              <MaterialCommunityIcons name="silverware-fork-knife" size={40} color={G.muted} />
              <Text style={styles.heroPlaceholderText}>No image yet</Text>
            </View>
          )}

          <View style={styles.body}>
            {/* Name + price */}
            <Text style={styles.name}>{detail.name}</Text>
            {priceLabel ? (
              <View style={styles.priceRow}>
                <Text style={styles.price}>{priceLabel}</Text>
                {detail.spice_level > 0 ? (
                  <View style={styles.spiceRow}>
                    {Array.from({ length: Math.min(detail.spice_level, 3) }).map((_, i) => (
                      <MaterialCommunityIcons key={i} name="fire" size={16} color={t.primary} />
                    ))}
                  </View>
                ) : null}
              </View>
            ) : detail.spice_level > 0 ? (
              <View style={styles.spiceRow}>
                {Array.from({ length: Math.min(detail.spice_level, 3) }).map((_, i) => (
                  <MaterialCommunityIcons key={i} name="fire" size={16} color={t.primary} />
                ))}
              </View>
            ) : null}

            <Text
              style={[
                styles.caloriesLine,
                dishCaloriesUsesMutedStyle(detail.calories_manual, detail.calories_estimated) && styles.caloriesLineMuted,
              ]}
            >
              {dishCaloriesPrimaryText(detail.calories_manual, detail.calories_estimated)}
            </Text>

            {/* Featured / New badges */}
            <HighlightDishBadges is_featured={detail.is_featured} is_new={detail.is_new} />

            {/* Needs review notice */}
            {detail.needs_review ? (
              <View style={styles.reviewBanner}>
                <MaterialCommunityIcons name="alert-circle-outline" size={15} color={t.primaryDark} />
                <Text style={styles.reviewBannerText}>This dish is pending review</Text>
              </View>
            ) : null}

            {/* Description */}
            {detail.description ? <Text style={styles.desc}>{detail.description}</Text> : null}

            {/* Ingredients */}
            {detail.ingredientItems.length > 0 ? (
              <View style={styles.block}>
                <Text style={styles.blockTitle}>Ingredients</Text>
                <View style={styles.ingredientCard}>
                  {detail.ingredientItems.map((item, idx) => {
                    const originShown = item.origin?.trim() ?? '';
                    return (
                      <View key={`${idx}-${item.name}`} style={styles.ingredientRowBlock}>
                        <View style={styles.ingredientTitleRow}>
                          <View style={styles.ingredientDot} />
                          <Text style={styles.ingredientText}>
                            {item.name.charAt(0).toUpperCase() + item.name.slice(1)}
                          </Text>
                        </View>
                        <Text
                          style={[
                            styles.ingredientOriginText,
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
            ) : detail.ingredients.length > 0 ? (
              <View style={styles.block}>
                <Text style={styles.blockTitle}>Ingredients</Text>
                <View style={styles.ingredientCard}>
                  {detail.ingredients.map((item) => (
                    <View key={item} style={styles.ingredientRow}>
                      <View style={styles.ingredientDot} />
                      <Text style={styles.ingredientText}>
                        {item.charAt(0).toUpperCase() + item.slice(1)}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            {/* Tags */}
            {detail.tags.length > 0 ? (
              <View style={styles.block}>
                <Text style={styles.blockTitle}>Tags</Text>
                <View style={styles.tagsRow}>
                  {detail.tags.map((tag) => (
                    <View key={tag} style={styles.tagPill}>
                      <Text style={styles.tagText}>{tag}</Text>
                    </View>
                  ))}
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
    borderBottomColor: G.border,
    shadowColor: G.text,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
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
    color: G.text,
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
    borderRadius: BorderRadius.full,
    backgroundColor: t.primaryLight,
  },
  errBtnText: {
    ...Typography.bodyMedium,
    fontWeight: '700',
    color: t.primaryDark,
  },
  scroll: {
    flexGrow: 1,
  },
  hero: {
    width: '100%',
    aspectRatio: 1.55,
    backgroundColor: '#F3F4F6',
  },
  heroPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  heroPlaceholderText: {
    ...Typography.caption,
    color: G.muted,
  },
  body: {
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  name: {
    ...Typography.heading,
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '800',
    color: G.text,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  price: {
    ...Typography.headingSmall,
    fontWeight: '700',
    color: t.primary,
  },
  spiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  caloriesLine: {
    ...Typography.bodyMedium,
    color: G.text,
  },
  caloriesLineMuted: {
    color: G.muted,
  },
  reviewBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: t.primaryLight,
    borderWidth: 1,
    borderColor: t.cardAccentBorder,
    borderRadius: BorderRadius.base,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  reviewBannerText: {
    ...Typography.caption,
    color: t.primaryDark,
    fontWeight: '600',
  },
  desc: {
    ...Typography.body,
    color: G.sub,
    lineHeight: 22,
  },
  block: {
    gap: Spacing.sm,
  },
  blockTitle: {
    ...Typography.captionMedium,
    fontWeight: '700',
    color: G.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  ingredientCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: G.border,
    padding: Spacing.base,
    gap: 8,
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  ingredientRowBlock: {
    gap: 4,
  },
  ingredientTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  ingredientOriginText: {
    ...Typography.caption,
    color: G.sub,
    marginLeft: 16,
    lineHeight: 18,
  },
  ingredientOriginPlaceholder: {
    color: G.muted,
    fontStyle: 'italic',
  },
  ingredientDot: {
    width: 6,
    height: 6,
    borderRadius: BorderRadius.full,
    backgroundColor: t.primary,
    marginTop: 8,
  },
  ingredientText: {
    flex: 1,
    ...Typography.body,
    color: G.text,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    backgroundColor: t.primaryLight,
    borderWidth: 1,
    borderColor: t.cardAccentBorder,
  },
  tagText: {
    ...Typography.captionMedium,
    color: t.primaryDark,
    fontWeight: '600',
  },
});
