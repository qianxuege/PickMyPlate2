import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { DinerTabScreenLayout, PrimaryButton, SecondaryButton } from '@/components';
import { useActiveRole } from '@/contexts/ActiveRoleContext';
import { dinerRoleTheme } from '@/constants/role-theme';
import { BorderRadius, Colors, Spacing, Typography } from '@/constants/theme';
import { fetchDinerPreferences, spiceDbToLabel } from '@/lib/diner-preferences';
import { useGuardActiveRole } from '@/hooks/use-guard-active-role';

const t = dinerRoleTheme;

function initialsFromUser(email: string | undefined, displayName: string | undefined): string {
  if (displayName?.trim()) {
    const parts = displayName.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase();
    }
    return (parts[0]?.slice(0, 2) ?? 'U').toUpperCase();
  }
  const local = email?.split('@')[0] ?? 'U';
  return local.slice(0, 2).toUpperCase();
}

export default function DinerProfileScreen() {
  const router = useRouter();
  useGuardActiveRole('diner');
  const { session, signOut } = useActiveRole();
  const [tasteDisplay, setTasteDisplay] = useState('—');
  const [dietaryDisplay, setDietaryDisplay] = useState('—');
  const [budgetDisplay, setBudgetDisplay] = useState('—');
  const [cuisineDisplay, setCuisineDisplay] = useState('—');
  const [tagsDisplay, setTagsDisplay] = useState('—');

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        const clear = () => {
          setTasteDisplay('—');
          setDietaryDisplay('—');
          setBudgetDisplay('—');
          setCuisineDisplay('—');
          setTagsDisplay('—');
        };
        try {
          const snap = await fetchDinerPreferences();
          if (cancelled) return;
          if (!snap) {
            clear();
            return;
          }
          setTasteDisplay(spiceDbToLabel(snap.spice_level) ?? '—');
          setDietaryDisplay(
            snap.dietaryKeys.length > 0 ? snap.dietaryKeys.join(', ') : '—'
          );
          const bt = snap.budget_tier;
          setBudgetDisplay(
            bt === '$' || bt === '$$' || bt === '$$$' || bt === '$$$$' ? bt : '—'
          );
          setCuisineDisplay(
            snap.cuisineNames.length > 0 ? snap.cuisineNames.join(', ') : '—'
          );
          setTagsDisplay(
            snap.smartTags.length > 0
              ? snap.smartTags.map((t) => t.label).join(', ')
              : '—'
          );
        } catch {
          if (!cancelled) clear();
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [])
  );

  const email = session?.user?.email ?? '';
  const displayName =
    typeof session?.user?.user_metadata?.display_name === 'string'
      ? session.user.user_metadata.display_name
      : undefined;
  const name = displayName || email.split('@')[0] || 'Account';

  const onLogout = async () => {
    await signOut();
    router.replace('/login');
  };

  return (
    <DinerTabScreenLayout activeTab="profile">
      <Text style={styles.sectionHeading}>Account Information</Text>
      <View style={styles.profileRow}>
        <View style={[styles.avatar, { backgroundColor: t.primary }]}>
          <Text style={styles.avatarText}>{initialsFromUser(email, displayName)}</Text>
        </View>
        <View style={styles.profileText}>
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.email}>{email || '—'}</Text>
        </View>
      </View>

      <Text style={[styles.sectionHeading, styles.sectionSpacing]}>Preferences</Text>
      <View style={[styles.preferencesCard, { borderColor: t.cardAccentBorder, borderWidth: 1 }]}>
        <View style={styles.prefRow}>
          <Text style={styles.prefLabel}>Taste:</Text>
          <Text style={styles.prefValue}>{tasteDisplay}</Text>
        </View>
        <View style={styles.prefDivider} />
        <View style={styles.prefRow}>
          <Text style={styles.prefLabel}>Dietary:</Text>
          <Text style={styles.prefValue}>{dietaryDisplay}</Text>
        </View>
        <View style={styles.prefDivider} />
        <View style={styles.prefRow}>
          <Text style={styles.prefLabel}>Budget:</Text>
          <Text style={styles.prefValue}>{budgetDisplay}</Text>
        </View>
        <View style={styles.prefDivider} />
        <View style={styles.prefRow}>
          <Text style={styles.prefLabel}>Cuisines:</Text>
          <Text style={styles.prefValue}>{cuisineDisplay}</Text>
        </View>
        <View style={styles.prefDivider} />
        <View style={styles.prefRow}>
          <Text style={styles.prefLabel}>Other preferences:</Text>
          <Text style={styles.prefValue}>{tagsDisplay}</Text>
        </View>
      </View>
      <PrimaryButton
        text="Adjust Preferences"
        onPress={() => router.push('/diner-personalization/1')}
        style={styles.adjustButton}
        accentColor={t.primary}
        accentShadowRgb={t.shadowRgb}
      />

      <Text style={[styles.sectionHeading, styles.accountSectionHeading]}>Account</Text>
      <SecondaryButton
        text="Change Password"
        onPress={() => router.push('/forgot-password')}
        style={styles.accountButton}
      />
      <SecondaryButton text="Log Out" onPress={onLogout} />
    </DinerTabScreenLayout>
  );
}

const styles = StyleSheet.create({
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
    backgroundColor: t.primaryLight,
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
