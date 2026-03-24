import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';

import { useActiveRole } from '@/contexts/ActiveRoleContext';
import { BorderRadius, Colors, Spacing, Typography } from '@/constants/theme';
import type { AppRole } from '@/lib/app-role';

type RoleModeBannerProps = {
  /** Current shell role for this screen */
  current: AppRole;
};

export function RoleModeBanner({ current }: RoleModeBannerProps) {
  const router = useRouter();
  const { roles, setActiveRole } = useActiveRole();

  if (roles.length < 2) return null;

  const other: AppRole = current === 'diner' ? 'restaurant' : 'diner';
  if (!roles.includes(other)) return null;

  const label =
    other === 'diner' ? 'Switch to diner' : 'Switch to restaurant';

  return (
    <Pressable
      style={({ pressed }) => [styles.banner, pressed && styles.pressed]}
      onPress={async () => {
        await setActiveRole(other);
        router.replace(other === 'diner' ? '/diner-home' : '/restaurant-home');
      }}
    >
      <Text style={styles.text}>{label}</Text>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.primaryLight,
    borderRadius: BorderRadius.base,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.base,
    marginBottom: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  pressed: {
    opacity: 0.92,
  },
  text: {
    ...Typography.captionMedium,
    color: Colors.primary,
  },
  chevron: {
    ...Typography.bodyMedium,
    color: Colors.primary,
    fontWeight: '600',
  },
});
