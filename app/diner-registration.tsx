import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackButton, InputField, PrimaryButton, ScreenContainer } from '@/components';
import { useActiveRole } from '@/contexts/ActiveRoleContext';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { isDuplicateEmailSignupError, linkDinerToExistingAccount } from '@/lib/link-account';
import { supabase } from '@/lib/supabase';

export default function DinerRegistrationScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { refreshRoles } = useActiveRole();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const onCreate = async () => {
    const trimmedEmail = email.trim();
    if (!name.trim() || !trimmedEmail || !password) {
      Alert.alert('Missing info', 'Please fill in name, email, and password.');
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: {
          data: {
            role: 'diner',
            display_name: name.trim(),
          },
        },
      });
      if (error) {
        if (isDuplicateEmailSignupError(error)) {
          Alert.alert(
            'Link to your existing account?',
            'This email already has an account. Sign in with the same password to add diner access to it.',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Link account',
                onPress: async () => {
                  setLoading(true);
                  try {
                    const result = await linkDinerToExistingAccount(trimmedEmail, password);
                    if (result.status === 'auth_failed') {
                      Alert.alert(
                        'Could not sign in',
                        'Check that you are using the password for this email. If you forgot it, use Forgot password on the login screen.'
                      );
                      return;
                    }
                    if (result.status === 'role_failed') {
                      Alert.alert('Could not add diner access', result.message);
                      return;
                    }
                    if (result.status === 'already_diner') {
                      Alert.alert(
                        'Already a diner',
                        'This account already has diner access. Sign in to continue.',
                        [{ text: 'OK', onPress: () => router.replace('/login') }]
                      );
                      return;
                    }
                    await refreshRoles();
                    router.replace('/diner-personalization/1');
                  } catch (e) {
                    Alert.alert('Error', e instanceof Error ? e.message : 'Unknown error');
                  } finally {
                    setLoading(false);
                  }
                },
              },
            ]
          );
          return;
        }
        Alert.alert('Could not create account', error.message);
        return;
      }
      if (data.session) {
        router.push('/diner-personalization/1');
      } else {
        Alert.alert(
          'Confirm your email',
          'We sent you a link. After confirming, sign in to finish setup.',
          [{ text: 'OK', onPress: () => router.replace('/login') }]
        );
      }
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.wrapper}>
      <BackButton />
      <ScreenContainer scroll padding="xl">
        <View style={{ height: insets.top + 36 }} />
        <Text style={styles.heading}>Join as a Diner</Text>
        <Text style={styles.subtitle}>Create an account to explore menus and discover dishes.</Text>

        <InputField label="Name" placeholder="Your name" value={name} onChangeText={setName} />
        <InputField
          label="Email"
          placeholder="your@email.com"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />
        <InputField
          label="Password"
          placeholder="Create a password"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <PrimaryButton
          text="Create Account"
          onPress={onCreate}
          loading={loading}
          disabled={loading}
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
