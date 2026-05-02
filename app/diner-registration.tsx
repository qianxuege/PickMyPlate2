import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackButton, InputField, PrimaryButton, ScreenContainer } from '@/components';
import { useActiveRole } from '@/contexts/ActiveRoleContext';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { clampDisplayName, DISPLAY_NAME_MAX_LENGTH } from '@/lib/display-name';
import { isDuplicateEmailSignupError, linkDinerToExistingAccount } from '@/lib/link-account';
import { isValidEmail } from '@/lib/is-valid-email';
import { validateSignUpPassword } from '@/lib/sign-up-form-validation';
import { supabase } from '@/lib/supabase';

type FieldKey = 'name' | 'email' | 'password';
type FieldErrors = Partial<Record<FieldKey, string>>;
const emptyFieldErrors: FieldErrors = {};

export default function DinerRegistrationScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { refreshRoles, setActiveRole } = useActiveRole();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>(emptyFieldErrors);

  const clearError = (key: FieldKey) => {
    setFieldErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
  };

  const onCreate = async () => {
    setFieldErrors(emptyFieldErrors);
    const next: FieldErrors = {};
    const trimmedEmail = email.trim();
    const trimmedName = name.trim();
    if (trimmedName.length < 2) next.name = 'Enter your name (at least 2 characters).';
    if (!isValidEmail(trimmedEmail)) next.email = 'Enter a valid email address, for example name@example.com.';
    const passR = validateSignUpPassword(password);
    if (!passR.ok) next.password = passR.message;
    if (Object.keys(next).length > 0) {
      setFieldErrors(next);
      return;
    }
    const passwordValue = passR.value;
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: trimmedEmail,
        password: passwordValue,
        options: {
          data: {
            role: 'diner',
            display_name: clampDisplayName(trimmedName),
          },
        },
      });
      if (error) {
        if (isDuplicateEmailSignupError(error)) {
          Alert.alert(
            'Link to your existing account?',
            'This email already has an account. Enter the password you already use for it—we sign you in and add diner access. You still have one account and one password; linking does not create a new password or change your existing one (use Forgot password on the login screen only if you need to reset).',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Link account',
                onPress: async () => {
                  setLoading(true);
                  try {
                    const result = await linkDinerToExistingAccount(trimmedEmail, passwordValue);
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
                    await setActiveRole('diner');
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
        await refreshRoles();
        await setActiveRole('diner');
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

        <InputField
          label="Name"
          placeholder="Your name"
          value={name}
          onChangeText={(t) => {
            setName(clampDisplayName(t.replace(/\r?\n/g, ' ')));
            clearError('name');
          }}
          maxLength={DISPLAY_NAME_MAX_LENGTH}
          error={fieldErrors.name}
          multiline
        />
        <InputField
          label="Email"
          placeholder="your@email.com"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={(t) => { setEmail(t); clearError('email'); }}
          error={fieldErrors.email}
        />
        <InputField
          label="Password"
          placeholder="Create a password"
          secureTextEntry
          value={password}
          onChangeText={(t) => { setPassword(t); clearError('password'); }}
          error={fieldErrors.password}
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
