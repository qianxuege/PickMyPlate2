import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackButton, PrimaryButton, ScreenContainer } from '@/components';
import { Colors, Spacing, Typography } from '@/constants/theme';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.wrapper}>
      <BackButton />
      <ScreenContainer scroll padding="xl">
      <View style={{ height: insets.top + 36 }} />
      <Text style={styles.heading}>Forgot password?</Text>
      <Text style={styles.subtitle}>
        {"Enter your email and we'll send you a link to reset your password."}
      </Text>
      <PrimaryButton text="Back to Login" onPress={() => router.back()} />
    </ScreenContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
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
