import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { DinerBottomNav, PrimaryButton, SecondaryButton, ScreenContainer } from '@/components';
import { BorderRadius, Colors, Spacing, Typography } from '@/constants/theme';

export default function DinerProfileScreen() {
  const router = useRouter();

  return (
    <View style={styles.wrapper}>
      <ScreenContainer scroll padding="xl">
        <Text style={styles.sectionHeading}>Account Information</Text>
        <View style={styles.profileRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>AJ</Text>
          </View>
          <View style={styles.profileText}>
            <Text style={styles.name}>Alex Johnson</Text>
            <Text style={styles.email}>alex.johnson@email.com</Text>
          </View>
        </View>

        <Text style={[styles.sectionHeading, styles.sectionSpacing]}>Preferences</Text>
        <View style={styles.preferencesCard}>
          <View style={styles.prefRow}>
            <Text style={styles.prefLabel}>Taste:</Text>
            <Text style={styles.prefValue}>Mild Spicy</Text>
          </View>
          <View style={styles.prefDivider} />
          <View style={styles.prefRow}>
            <Text style={styles.prefLabel}>Dietary:</Text>
            <Text style={styles.prefValue}>No cilantro, Loves desserts</Text>
          </View>
          <View style={styles.prefDivider} />
          <View style={styles.prefRow}>
            <Text style={styles.prefLabel}>Budget:</Text>
            <Text style={styles.prefValue}>$$</Text>
          </View>
        </View>
        <PrimaryButton
          text="Adjust Preferences"
          onPress={() => router.push('/diner-personalization/1')}
          style={styles.adjustButton}
        />

        <Text style={[styles.sectionHeading, styles.accountSectionHeading]}>Account</Text>
        <SecondaryButton
          text="Change Password"
          onPress={() => router.push('/forgot-password')}
          style={styles.accountButton}
        />
        <SecondaryButton
          text="Log Out"
          onPress={() => router.replace('/login')}
        />
      </ScreenContainer>
      <DinerBottomNav activeTab="profile" />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  sectionHeading: {
    ...Typography.headingSmall,
    color: Colors.text,
  },
  sectionSpacing: {
    marginTop: Spacing.xxl,
    marginBottom: Spacing.base,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.base,
    gap: Spacing.base,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    ...Typography.bodyMedium,
    fontSize: 20,
    color: Colors.white,
    fontWeight: '700',
  },
  profileText: {
    flex: 1,
  },
  name: {
    ...Typography.bodyMedium,
    color: Colors.text,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  email: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  preferencesCard: {
    backgroundColor: Colors.borderLight,
    borderRadius: BorderRadius.base,
    padding: Spacing.base,
    marginBottom: Spacing.base,
  },
  prefRow: {
    paddingVertical: Spacing.sm,
  },
  prefLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  prefValue: {
    ...Typography.body,
    color: Colors.text,
  },
  prefDivider: {
    height: 1,
    backgroundColor: Colors.border,
  },
  adjustButton: {
    marginBottom: Spacing.xxl,
  },
  accountSectionHeading: {
    marginBottom: Spacing.base,
  },
  accountButton: {
    marginBottom: Spacing.base,
  },
});
