import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { InputField, PrimaryButton, ScreenContainer } from '@/components';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { getErrorMessage } from '@/lib/error-message';
import { supabase } from '@/lib/supabase';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    if (!password || !confirm) {
      Alert.alert('Missing info', 'Enter and confirm your new password.');
      return;
    }
    if (password !== confirm) {
      Alert.alert('Mismatch', 'Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Too short', 'Use at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        Alert.alert('Could not update password', error.message);
        return;
      }
      await supabase.auth.signOut();
      Alert.alert('Password updated', 'Sign in with your new password.', [
        { text: 'OK', onPress: () => router.replace('/login') },
      ]);
    } catch (e) {
      if (__DEV__) console.warn('[reset-password]', e);
      Alert.alert('Something went wrong', getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer scroll padding="xl">
      <Text style={styles.heading}>Set a new password</Text>
      <Text style={styles.subtitle}>
        You opened the reset link from your email. Choose a new password below.
      </Text>
      <View style={styles.form}>
        <InputField
          label="New password"
          placeholder="At least 6 characters"
          secureTextEntry
          autoComplete="new-password"
          value={password}
          onChangeText={setPassword}
        />
        <InputField
          label="Confirm password"
          placeholder="Re-enter password"
          secureTextEntry
          autoComplete="new-password"
          value={confirm}
          onChangeText={setConfirm}
        />
      </View>
      <PrimaryButton
        text="Update password"
        onPress={onSubmit}
        loading={loading}
        disabled={loading}
      />
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
    marginBottom: Spacing.xxl,
  },
  form: {
    marginBottom: Spacing.xl,
    gap: Spacing.base,
  },
});
