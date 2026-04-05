import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackButton, InputField, PrimaryButton, ScreenContainer } from '@/components';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { getPasswordRecoveryRedirectUrl } from '@/lib/auth-redirect';
import { getErrorMessage } from '@/lib/error-message';
import { supabase } from '@/lib/supabase';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const onSendLink = async () => {
    const trimmed = email.trim();
    if (!trimmed) {
      Alert.alert('Missing email', 'Enter the email you used to sign up.');
      return;
    }

    setLoading(true);
    try {
      const redirectTo = getPasswordRecoveryRedirectUrl();
      if (__DEV__) {
        console.log('[auth] password recovery redirectTo (add to Supabase Redirect URLs):', redirectTo);
      }
      const { error } = await supabase.auth.resetPasswordForEmail(trimmed, {
        redirectTo,
      });
      if (error) {
        Alert.alert('Could not send reset email', error.message);
        return;
      }
      Alert.alert(
        'Check your email',
        'If an account exists for that address, we sent a link to reset your password. Open it on this phone so PickMyPlate can finish the reset.',
        [{ text: 'OK', onPress: () => router.back() }],
      );
    } catch (e) {
      if (__DEV__) console.warn('[forgot-password]', e);
      Alert.alert('Something went wrong', getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.wrapper}>
      <BackButton />
      <ScreenContainer scroll padding="xl">
        <View style={{ height: insets.top + 36 }} />
        <Text style={styles.heading}>Forgot password?</Text>
        <Text style={styles.subtitle}>
          Enter your email and we will send you a link to reset your password.
        </Text>
        <InputField
          label="Email"
          placeholder="your@email.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          value={email}
          onChangeText={setEmail}
          containerStyle={styles.emailField}
        />
        <PrimaryButton
          text="Send reset link"
          onPress={onSendLink}
          loading={loading}
          disabled={loading}
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
    marginBottom: Spacing.xl,
  },
  emailField: {
    marginBottom: Spacing.xl,
  },
});
