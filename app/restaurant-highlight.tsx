import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';

import { HighlightDishBadges } from '@/components/HighlightDishBadges';
import { PrimaryButton } from '@/components/PrimaryButton';
import { RestaurantTabScreenLayout } from '@/components/RestaurantTabScreenLayout';
import { RestaurantUiInspect } from '@/constants/restaurant-ui-inspect';
import { restaurantRoleTheme } from '@/constants/role-theme';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { useGuardActiveRole } from '@/hooks/use-guard-active-role';
import { fetchRestaurantMenuForScan, type RestaurantMenuDishRow } from '@/lib/restaurant-fetch-menu-for-scan';
import { touchRestaurantMenuScan, updateRestaurantDishHighlightFlags } from '@/lib/restaurant-menu-dishes';
import { supabase } from '@/lib/supabase';

const t = restaurantRoleTheme;

export default function RestaurantHighlightScreen() {
  useGuardActiveRole('restaurant');
  const [loading, setLoading] = useState(true);
  const [publishedScanId, setPublishedScanId] = useState<string | null>(null);
  const [dishes, setDishes] = useState<RestaurantMenuDishRow[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;
      if (!user) {
        setPublishedScanId(null);
        setDishes([]);
        return;
      }
      const { data: restRow, error: restErr } = await supabase
        .from('restaurants')
        .select('published_menu_scan_id')
        .eq('owner_id', user.id)
        .maybeSingle();
      if (restErr) throw restErr;
      const scanId = restRow?.published_menu_scan_id ? String(restRow.published_menu_scan_id) : null;
      setPublishedScanId(scanId);
      if (!scanId) {
        setDishes([]);
        return;
      }
      const menu = await fetchRestaurantMenuForScan(scanId);
      if (menu.ok) {
        setDishes(menu.dishes);
      } else {
        setDishes([]);
      }
    } catch {
      setDishes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const onToggle = useCallback(
    async (dishId: string, key: 'is_featured' | 'is_new', value: boolean) => {
      if (!publishedScanId) return;
      const prev = dishes.find((d) => d.id === dishId);
      if (!prev) return;
      setDishes((list) => list.map((d) => (d.id === dishId ? { ...d, [key]: value } : d)));
      const res = await updateRestaurantDishHighlightFlags(dishId, { [key]: value });
      if (!res.ok) {
        setDishes((list) => list.map((d) => (d.id === dishId ? { ...d, [key]: prev[key] } : d)));
        return;
      }
      await touchRestaurantMenuScan(publishedScanId);
    },
    [dishes, publishedScanId],
  );

  const clearHighlight = useCallback(
    async (dishId: string) => {
      if (!publishedScanId) return;
      const prev = dishes.find((d) => d.id === dishId);
      if (!prev) return;
      setDishes((list) =>
        list.map((d) => (d.id === dishId ? { ...d, is_featured: false, is_new: false } : d)),
      );
      const res = await updateRestaurantDishHighlightFlags(dishId, { is_featured: false, is_new: false });
      if (!res.ok) {
        setDishes((list) => list.map((d) => (d.id === dishId ? { ...d, ...prev } : d)));
        return;
      }
      await touchRestaurantMenuScan(publishedScanId);
    },
    [dishes, publishedScanId],
  );

  const highlighted = dishes.filter((d) => d.is_featured || d.is_new);
  const priceLabel = (d: RestaurantMenuDishRow) =>
    d.price_display?.trim() || (d.price_amount == null ? '—' : String(d.price_amount));

  return (
    <RestaurantTabScreenLayout activeTab="highlight">
      <Text style={styles.title}>Highlight dishes</Text>
      <Text style={styles.subtitle}>Boost visibility and increase orders — mark items as Featured or New.</Text>

      {loading ? (
        <View style={styles.centerBlock}>
          <ActivityIndicator color={t.primary} />
        </View>
      ) : !publishedScanId ? (
        <View style={styles.emptyRoot}>
          <MaterialCommunityIcons name="star-outline" size={40} color={Colors.textSecondary} />
          <Text style={styles.emptyTitle}>Publish a menu first</Text>
          <Text style={styles.emptySubtitle}>Once your menu is live, you can highlight dishes for diners.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {highlighted.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Currently highlighted</Text>
              {highlighted.map((d) => (
                <View key={d.id} style={styles.card}>
                  <View style={styles.cardTop}>
                    <View style={styles.cardTitleCol}>
                      <Text style={styles.dishName} numberOfLines={2}>
                        {d.name}
                      </Text>
                      <HighlightDishBadges is_featured={d.is_featured} is_new={d.is_new} />
                    </View>
                    <Pressable onPress={() => void clearHighlight(d.id)} hitSlop={8}>
                      <Text style={styles.remove}>Remove</Text>
                    </Pressable>
                  </View>
                  <Text style={styles.priceText}>{priceLabel(d)}</Text>
                </View>
              ))}
            </View>
          ) : null}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>All menu items</Text>
            <Text style={styles.hint}>Toggle Featured and New for any dish on your published menu.</Text>
            {dishes.map((d) => (
              <View key={d.id} style={styles.rowCard}>
                {d.image_url ? (
                  <Image source={{ uri: d.image_url }} style={styles.thumb} />
                ) : (
                  <View style={styles.thumb}>
                    <MaterialCommunityIcons name="silverware-fork-knife" size={20} color={Colors.textPlaceholder} />
                  </View>
                )}
                <View style={styles.rowBody}>
                  <Text style={styles.rowName} numberOfLines={2}>
                    {d.name}
                  </Text>
                  <Text style={styles.rowPrice}>{priceLabel(d)}</Text>
                  <View style={styles.switchRow}>
                    <View style={styles.switchCell}>
                      <View style={styles.switchLabelRow}>
                        <MaterialCommunityIcons name="star-outline" size={18} color={RestaurantUiInspect.accent} />
                        <Text style={styles.switchLabel} numberOfLines={1}>Featured</Text>
                      </View>
                      <Switch
                        value={d.is_featured}
                        onValueChange={(v) => void onToggle(d.id, 'is_featured', v)}
                        trackColor={{ false: '#E5E7EB', true: t.primaryLight }}
                        thumbColor={d.is_featured ? t.primary : '#F4F4F5'}
                      />
                    </View>
                    <View style={styles.switchCell}>
                      <View style={styles.switchLabelRow}>
                        <Text style={styles.switchLabel} numberOfLines={1}>New</Text>
                      </View>
                      <Switch
                        value={d.is_new}
                        onValueChange={(v) => void onToggle(d.id, 'is_new', v)}
                        trackColor={{ false: '#E5E7EB', true: t.primaryLight }}
                        thumbColor={d.is_new ? t.primary : '#F4F4F5'}
                      />
                    </View>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      )}
    </RestaurantTabScreenLayout>
  );
}

const styles = StyleSheet.create({
  title: {
    ...Typography.heading,
    color: RestaurantUiInspect.text,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
  },
  centerBlock: {
    paddingVertical: Spacing.xxl,
    alignItems: 'center',
  },
  emptyRoot: {
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
  emptySubtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  scroll: {
    paddingBottom: 120,
    gap: Spacing.xl,
  },
  section: {
    gap: Spacing.md,
  },
  sectionTitle: {
    ...Typography.bodyMedium,
    fontWeight: '700',
    color: RestaurantUiInspect.text,
  },
  hint: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: -Spacing.sm,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: RestaurantUiInspect.border,
    padding: Spacing.md,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  cardTitleCol: {
    flex: 1,
    minWidth: 0,
    gap: Spacing.sm,
  },
  dishName: {
    ...Typography.bodyMedium,
    fontWeight: '700',
    color: RestaurantUiInspect.text,
  },
  remove: {
    ...Typography.captionMedium,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  priceText: {
    ...Typography.bodyMedium,
    fontWeight: '700',
    color: RestaurantUiInspect.text,
    marginTop: Spacing.sm,
  },
  rowCard: {
    flexDirection: 'row',
    gap: Spacing.md,
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: RestaurantUiInspect.border,
    padding: Spacing.md,
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  rowName: {
    ...Typography.bodyMedium,
    fontWeight: '700',
    color: RestaurantUiInspect.text,
  },
  rowPrice: {
    ...Typography.captionMedium,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  switchRow: {
    flexDirection: 'column',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  switchCell: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  switchLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minWidth: 0,
  },
  switchLabel: {
    ...Typography.caption,
    color: RestaurantUiInspect.sub,
    flexShrink: 1,
  },
});
