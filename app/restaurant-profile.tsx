import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton, RestaurantTabScreenLayout } from '@/components';
import { useActiveRole } from '@/contexts/ActiveRoleContext';
import { restaurantRoleTheme } from '@/constants/role-theme';
import { BorderRadius, Colors, Spacing, Typography } from '@/constants/theme';
import { useOwnedRestaurantName } from '@/hooks/use-owned-restaurant-name';
import { useGuardActiveRole } from '@/hooks/use-guard-active-role';

const t = restaurantRoleTheme;

type InfoRowProps = {
  label: string;
  value: string;
  onPress?: () => void;
  isAction?: boolean;
};

function InfoRow({ label, value, onPress, isAction }: InfoRowProps) {
  const content = (
    <>
      <View style={styles.infoRowText}>
        {!isAction ? (
          <>
            <Text style={styles.fieldLabel}>{label}</Text>
            <Text style={styles.fieldValue}>{value}</Text>
          </>
        ) : (
          <Text style={styles.actionRowText}>{value}</Text>
        )}
      </View>
      <MaterialCommunityIcons name="chevron-right" size={22} color={Colors.textSecondary} />
    </>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.infoRow, pressed && styles.infoRowPressed]}
      >
        {content}
      </Pressable>
    );
  }

  return <View style={styles.infoRow}>{content}</View>;
}

export default function RestaurantProfileScreen() {
  const router = useRouter();
  useGuardActiveRole('restaurant');
  const { session, signOut } = useActiveRole();
  const restaurantName = useOwnedRestaurantName();

  const email = session?.user?.email ?? '—';
  const displayName = restaurantName ?? 'Your restaurant';

  const onLogout = async () => {
    await signOut();
    router.replace('/login');
  };

  return (
    <RestaurantTabScreenLayout activeTab="profile">
      <Text style={styles.title}>Profile</Text>
      <Text style={styles.subtitle}>Manage your restaurant and account</Text>

      <View style={styles.headerDivider} />

      <View style={styles.summaryRow}>
        <View style={[styles.summaryIcon, { backgroundColor: t.primaryLight }]}>
          <MaterialCommunityIcons name="storefront-outline" size={26} color={t.primary} />
        </View>
        <View style={styles.summaryText}>
          <Text style={styles.restaurantName}>{displayName}</Text>
          <Text style={styles.cuisineLine}>Owner dashboard</Text>
        </View>
      </View>

      <View style={styles.headerDivider} />

      <Text style={styles.sectionCaps}>RESTAURANT INFO</Text>
      <View style={[styles.card, { borderColor: t.cardAccentBorder }]}>
        <InfoRow label="Restaurant Name" value={displayName} onPress={() => {}} />
        <View style={styles.rowDivider} />
        <InfoRow label="Address" value="123 Ramen Street, Tokyo" onPress={() => {}} />
        <View style={styles.rowDivider} />
        <InfoRow label="Phone Number" value="(555) 123-4567" onPress={() => {}} />
        <View style={styles.rowDivider} />
        <InfoRow label="Hours of Operation" value="Mon-Fri: 11am - 10pm" onPress={() => {}} />
        <View style={styles.rowDivider} />
        <InfoRow label="Website" value="www.kumoramen.com" onPress={() => {}} />
      </View>

      <Text style={[styles.sectionCaps, styles.accountCaps]}>ACCOUNT</Text>
      <View style={[styles.card, { borderColor: t.cardAccentBorder }]}>
        <InfoRow label="Email" value={email} onPress={() => {}} />
        <View style={styles.rowDivider} />
        <InfoRow
          label=""
          value="Change Password"
          isAction
          onPress={() => router.push('/forgot-password')}
        />
      </View>

      <PrimaryButton
        text="Log Out"
        onPress={onLogout}
        accentColor={t.primary}
        accentShadowRgb={t.shadowRgb}
      />
    </RestaurantTabScreenLayout>
  );
}

const styles = StyleSheet.create({
  title: {
    ...Typography.heading,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginBottom: Spacing.base,
  },
  headerDivider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginVertical: Spacing.base,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.base,
    paddingVertical: Spacing.sm,
  },
  summaryIcon: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.base,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryText: {
    flex: 1,
  },
  restaurantName: {
    ...Typography.bodyMedium,
    fontSize: 18,
    color: Colors.text,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  cuisineLine: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  sectionCaps: {
    ...Typography.small,
    color: Colors.textSecondary,
    letterSpacing: 0.8,
    fontWeight: '600',
    marginBottom: Spacing.sm,
    marginTop: Spacing.sm,
  },
  accountCaps: {
    marginTop: Spacing.xxl,
  },
  card: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderRadius: BorderRadius.base,
    overflow: 'hidden',
    marginBottom: Spacing.xxl,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  infoRowPressed: {
    backgroundColor: Colors.borderLight,
  },
  infoRowText: {
    flex: 1,
  },
  fieldLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  fieldValue: {
    ...Typography.bodyMedium,
    color: Colors.text,
    fontWeight: '600',
  },
  actionRowText: {
    ...Typography.bodyMedium,
    color: Colors.text,
    fontWeight: '600',
  },
  rowDivider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginLeft: Spacing.base,
  },
});
