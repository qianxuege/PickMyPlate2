import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { RestaurantBottomNav, ScreenContainer } from '@/components';
import { BorderRadius, Colors, Spacing, Typography } from '@/constants/theme';

const RECENT_UPLOADS = [
  { id: '1', title: 'Dinner Menu 2024', subtitle: '3 days ago' },
  { id: '2', title: 'Lunch Specials', subtitle: '1 week ago' },
];

export default function RestaurantHomeScreen() {
  return (
    <View style={styles.wrapper}>
      <ScreenContainer scroll padding="xl">
        <Text style={styles.title}>Upload your menu</Text>
        <Text style={styles.subtitle}>
          {"We'll turn it into a digital menu automatically"}
        </Text>

        <View style={styles.card}>
          <Pressable style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}>
            <View style={styles.iconBox}>
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
            <View style={styles.iconBox}>
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
            style={({ pressed }) => [styles.recentCard, pressed && styles.rowPressed]}
          >
            <View style={styles.recentIcon}>
              <MaterialCommunityIcons
                name="silverware-fork-knife"
                size={22}
                color={Colors.primary}
              />
            </View>
            <View style={styles.rowText}>
              <Text style={styles.recentTitle}>{item.title}</Text>
              <Text style={styles.recentSubtitle}>{item.subtitle}</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={24} color={Colors.textSecondary} />
          </Pressable>
        ))}
      </ScreenContainer>
      <RestaurantBottomNav activeTab="home" />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
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
    borderColor: Colors.borderLight,
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
    backgroundColor: Colors.primary,
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
    borderColor: Colors.borderLight,
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
    backgroundColor: Colors.primaryLight,
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
