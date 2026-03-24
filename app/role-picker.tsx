import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { PrimaryButton, ScreenContainer } from '@/components';
import { useActiveRole } from '@/contexts/ActiveRoleContext';
import { Colors, Spacing, Typography } from '@/constants/theme';
import type { AppRole } from '@/lib/app-role';

export default function RolePickerScreen() {
  const router = useRouter();
  const { roles, setActiveRole, bootstrapped, session } = useActiveRole();

  const choose = async (role: AppRole) => {
    await setActiveRole(role);
    router.replace(role === 'diner' ? '/diner-home' : '/restaurant-home');
  };

  if (!bootstrapped) {
    return (
      <ScreenContainer scroll padding="xl" centered>
        <Text style={styles.hint}>Loading…</Text>
      </ScreenContainer>
    );
  }

  if (!session?.user) {
    return (
      <ScreenContainer scroll padding="xl" centered>
        <Text style={styles.title}>Sign in required</Text>
        <PrimaryButton text="Go to login" onPress={() => router.replace('/login')} />
      </ScreenContainer>
    );
  }

  if (roles.length === 0) {
    return (
      <ScreenContainer scroll padding="xl" centered>
        <Text style={styles.title}>No roles on this account</Text>
        <PrimaryButton text="Go to login" onPress={() => router.replace('/login')} />
      </ScreenContainer>
    );
  }

  if (roles.length < 2) {
    const only = roles[0];
    return (
      <ScreenContainer scroll padding="xl" centered>
        <Text style={styles.title}>Nothing to switch</Text>
        <PrimaryButton
          text="Continue"
          onPress={() => router.replace(only === 'restaurant' ? '/restaurant-home' : '/diner-home')}
        />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer scroll padding="xl">
      <Text style={styles.title}>How do you want to use PickMyPlate?</Text>
      <Text style={styles.subtitle}>
        Your account has both diner and restaurant access. Choose where to go — you can change this anytime from
        your home or profile.
      </Text>

      <View style={styles.stack}>
        {roles.includes('diner') && (
          <PrimaryButton
            text="Continue as diner"
            onPress={() => choose('diner')}
            style={styles.btn}
          />
        )}
        {roles.includes('restaurant') && (
          <PrimaryButton
            text="Continue as restaurant"
            onPress={() => choose('restaurant')}
            style={styles.btn}
          />
        )}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: {
    ...Typography.heading,
    color: Colors.text,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xxxl,
  },
  stack: {
    gap: Spacing.base,
  },
  btn: {
    marginBottom: Spacing.sm,
  },
  hint: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
});
