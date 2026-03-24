import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackButton, InputField, PrimaryButton, ScreenContainer } from '@/components';
import { Colors, Spacing, Typography } from '@/constants/theme';

export default function DinerRegistrationScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.wrapper}>
      <BackButton />
      <ScreenContainer scroll padding="xl">
      <View style={{ height: insets.top + 36 }} />
      <Text style={styles.heading}>Join as a Diner</Text>
      <Text style={styles.subtitle}>Create an account to explore menus and discover dishes.</Text>

      <InputField label="Name" placeholder="Your name" />
      <InputField label="Email" placeholder="your@email.com" keyboardType="email-address" />
      <InputField label="Password" placeholder="Create a password" secureTextEntry />

      <PrimaryButton
        text="Create Account"
        onPress={() => router.push('/diner-personalization/1')}
        style={styles.continueButton}
      />
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
  continueButton: {
    marginBottom: Spacing.base,
  },
});
