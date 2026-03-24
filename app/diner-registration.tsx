import { StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';

import { PrimaryButton, ScreenContainer } from '@/components';
import { Colors, Spacing, Typography } from '@/constants/theme';

export default function DinerRegistrationScreen() {
  const router = useRouter();

  return (
    <ScreenContainer scroll padding="xl">
      <Text style={styles.heading}>Join as a Diner</Text>
      <Text style={styles.subtitle}>Create an account to explore menus and discover dishes.</Text>
      <PrimaryButton text="Back" onPress={() => router.back()} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  heading: {
    ...Typography.heading,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginBottom: Spacing.xxxl,
  },
});
