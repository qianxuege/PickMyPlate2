import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { RestaurantTabScreenLayout } from '@/components/RestaurantTabScreenLayout';
import { BorderRadius, Colors, Spacing, Typography } from '@/constants/theme';
import { restaurantRoleTheme } from '@/constants/role-theme';
import { useGuardActiveRole } from '@/hooks/use-guard-active-role';

const RECENT_UPLOADS = [
  { id: '1', title: 'Dinner Menu 2024', subtitle: '3 days ago' },
  { id: '2', title: 'Lunch Specials', subtitle: '1 week ago' },
];

const t = restaurantRoleTheme;

export default function RestaurantHomeScreen() {
  useGuardActiveRole('restaurant');

  return (
    <RestaurantTabScreenLayout activeTab="home">
      <Text style={styles.title}>Upload your menu</Text>
      <Text style={styles.subtitle}>
        {"We'll turn it into a digital menu automatically"}
      </Text>

      <View style={[styles.card, { borderColor: t.cardAccentBorder }]}>
        <Pressable style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}>
          <View style={[styles.iconBox, { backgroundColor: t.primary }]}>
            <MaterialCommunityIcons name="camera-outline" size={22} color={Colors.white} />
          </View>
          <View style={styles.rowText}>
            <Text style={styles.rowTitle}>Take photo</Text>
            <Text style={styles.rowSubtitle}>Scan your menu</Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={24} color={Colors.textSecondary} />
        </Pressable>

        <View style={styles.divider} />

        <Pressable style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}>
          <View style={[styles.iconBox, { backgroundColor: t.primary }]}>
            <MaterialCommunityIcons name="image-outline" size={22} color={Colors.white} />
          </View>
          <View style={styles.rowText}>
            <Text style={styles.rowTitle}>Upload menu</Text>
            <Text style={styles.rowSubtitle}>Choose image or PDF</Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={24} color={Colors.textSecondary} />
        </Pressable>
      </View>

      <Text style={styles.sectionTitle}>Recent uploads</Text>
      {RECENT_UPLOADS.map((item) => (
        <Pressable
          key={item.id}
          style={({ pressed }) => [styles.recentCard, { borderColor: t.cardAccentBorder }, pressed && styles.rowPressed]}
        >
          <View style={[styles.recentIcon, { backgroundColor: t.primaryLight }]}>
            <MaterialCommunityIcons name="silverware-fork-knife" size={22} color={t.primary} />
          </View>
          <View style={styles.rowText}>
            <Text style={styles.recentTitle}>{item.title}</Text>
            <Text style={styles.recentSubtitle}>{item.subtitle}</Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={24} color={Colors.textSecondary} />
        </Pressable>
      ))}
    </RestaurantTabScreenLayout>
  );
}

const styles = StyleSheet.create({
  title: {
    ...Typography.heading,
    fontSize: 28,
    lineHeight: 36,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginBottom: Spacing.xxl,
    maxWidth: 340,
  },
  card: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    marginBottom: Spacing.xxl,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.base,
    gap: Spacing.base,
  },
  rowPressed: {
    opacity: 0.85,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.base,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    flex: 1,
  },
  rowTitle: {
    ...Typography.bodyMedium,
    fontSize: 17,
    color: Colors.text,
  },
  rowSubtitle: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.borderLight,
  },
  sectionTitle: {
    ...Typography.headingSmall,
    color: Colors.text,
    marginBottom: Spacing.base,
  },
  recentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.base,
    gap: Spacing.base,
    marginBottom: Spacing.base,
  },
  recentIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recentTitle: {
    ...Typography.bodyMedium,
    color: Colors.text,
  },
  recentSubtitle: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },
});
