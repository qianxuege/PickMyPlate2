import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { PrimaryButton, ScreenContainer } from '@/components';
import { Colors, Spacing, Typography } from '@/constants/theme';

export default function ForgotPasswordScreen() {
  const router = useRouter();

  return (
    <ScreenContainer scroll padding="xl">
      <Text style={styles.heading}>Forgot password?</Text>
      <Text style={styles.subtitle}>
        Enter your email and we'll send you a link to reset your password.
      </Text>
      <PrimaryButton text="Back to Login" onPress={() => router.back()} />
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
