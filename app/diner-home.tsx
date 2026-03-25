import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { DinerTabScreenLayout } from '@/components/DinerTabScreenLayout';
import { BorderRadius, Colors, Spacing, Typography } from '@/constants/theme';
import { dinerRoleTheme } from '@/constants/role-theme';
import { useGuardActiveRole } from '@/hooks/use-guard-active-role';

const RECENT_SCANS = [
  { id: '1', title: 'The Italian Place', subtitle: '2 days ago' },
  { id: '2', title: 'Sushi Bar', subtitle: '1 week ago' },
];

const t = dinerRoleTheme;

export default function DinerHomeScreen() {
  useGuardActiveRole('diner');

  return (
    <DinerTabScreenLayout activeTab="home">
      <Text style={styles.title}>Scan a menu</Text>
      <Text style={styles.subtitle}>
        Snap or upload to get personalized recommendations
      </Text>

      <View style={[styles.card, { borderColor: t.cardAccentBorder }]}>
        <View style={styles.row}>
          <View style={[styles.iconBox, { backgroundColor: t.primary }]}>
            <MaterialCommunityIcons name="camera-outline" size={22} color={Colors.white} />
          </View>
          <View style={styles.rowText}>
            <Text style={styles.rowTitle}>Scan Menu</Text>
            <Text style={styles.rowSubtitle}>Use your camera</Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={24} color={Colors.textSecondary} />
        </View>

        <View style={styles.divider} />

        <View style={styles.row}>
          <View style={[styles.iconBox, { backgroundColor: t.primary }]}>
            <MaterialCommunityIcons name="image-outline" size={22} color={Colors.white} />
          </View>
          <View style={styles.rowText}>
            <Text style={styles.rowTitle}>Upload from Photos</Text>
            <Text style={styles.rowSubtitle}>Choose an image</Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={24} color={Colors.textSecondary} />
        </View>
      </View>

      <Text style={styles.sectionTitle}>Recent scans</Text>
      {RECENT_SCANS.map((item) => (
        <Pressable
          key={item.id}
          style={({ pressed }) => [styles.recentCard, { borderColor: t.cardAccentBorder }, pressed && styles.recentCardPressed]}
        >
          <View style={[styles.recentIcon, { backgroundColor: t.primaryLight }]}>
            <MaterialCommunityIcons name="silverware-fork-knife" size={22} color={t.primary} />
          </View>
          <View style={styles.recentText}>
            <Text style={styles.recentTitle}>{item.title}</Text>
            <Text style={styles.recentSubtitle}>{item.subtitle}</Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={24} color={Colors.textSecondary} />
        </Pressable>
      ))}
    </DinerTabScreenLayout>
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
    maxWidth: 300,
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
    ...Typography.headingSmall,
    fontSize: 20,
    lineHeight: 34,
    color: Colors.text,
  },
  rowSubtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
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
  recentCardPressed: {
    opacity: 0.85,
  },
  recentIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recentText: {
    flex: 1,
  },
  recentTitle: {
    ...Typography.bodyMedium,
    color: Colors.text,
    fontWeight: '600',
  },
  recentSubtitle: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },
});
