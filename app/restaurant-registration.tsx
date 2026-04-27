import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackButton, InputField, PrimaryButton, ScreenContainer } from '@/components';
import { useActiveRole } from '@/contexts/ActiveRoleContext';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { clampDisplayName, DISPLAY_NAME_MAX_LENGTH } from '@/lib/display-name';
import { isDuplicateEmailSignupError, linkRestaurantToExistingAccount } from '@/lib/link-account';
import { supabase } from '@/lib/supabase';

export default function RestaurantRegistrationScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { refreshRoles, setActiveRole } = useActiveRole();
  const [restaurantName, setRestaurantName] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const reg2Params = () => ({
    restaurantName: restaurantName.trim(),
    address: businessAddress.trim(),
    phone: phone.trim(),
  });

  const onCreate = async () => {
    const trimmedEmail = email.trim();
    if (!restaurantName.trim() || !businessAddress.trim() || !trimmedEmail || !password) {
      Alert.alert(
        'Missing info',
        'Please fill in restaurant name, business address, email, and password.',
      );
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: {
          data: {
            role: 'restaurant',
            display_name: clampDisplayName(restaurantName.trim()),
          },
        },
      });
      if (error) {
        if (isDuplicateEmailSignupError(error)) {
          Alert.alert(
            'Link to your existing account?',
            'This email already has an account. Enter the password you already use for it—we sign you in and add restaurant access. One account, one password; linking does not add a second password. Next you’ll continue restaurant set-up where you left off.',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Link account',
                onPress: async () => {
                  setLoading(true);
                  try {
                    const result = await linkRestaurantToExistingAccount(trimmedEmail, password);
                    if (result.status === 'auth_failed') {
                      Alert.alert(
                        'Could not sign in',
                        'Check that you are using the password for this email. If you forgot it, use Forgot password on the login screen.'
                      );
                      return;
                    }
                    if (result.status === 'role_failed') {
                      Alert.alert('Could not add restaurant access', result.message);
                      return;
                    }
                    if (result.status === 'already_restaurant') {
                      Alert.alert(
                        'Already a restaurant',
                        'This account already has restaurant access. Sign in to continue.',
                        [{ text: 'OK', onPress: () => router.replace('/login') }]
                      );
                      return;
                    }
                    await refreshRoles();
                    await setActiveRole('restaurant');
                    router.replace({
                      pathname: '/restaurant-registration-2',
                      params: reg2Params(),
                    });
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
        await setActiveRole('restaurant');
        router.push({ pathname: '/restaurant-registration-2', params: reg2Params() });
      } else {
        Alert.alert(
          'Confirm your email',
          'After confirming, sign in and you can finish restaurant setup from the app.',
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
        <View style={styles.header}>
          <Text style={styles.title}>Restaurant</Text>
          <Text style={styles.subtitle}>
            Start managing your menu and growing your business
          </Text>
        </View>

        <InputField
          label="Restaurant Name"
          placeholder="Your restaurant name"
          value={restaurantName}
          onChangeText={(t) => setRestaurantName(clampDisplayName(t))}
          maxLength={DISPLAY_NAME_MAX_LENGTH}
        />
        <InputField
          label="Business address"
          placeholder="Street, city, state (customers and maps use this)"
          value={businessAddress}
          onChangeText={setBusinessAddress}
        />
        <InputField
          label="Phone (optional)"
          placeholder="Business phone"
          keyboardType="phone-pad"
          value={phone}
          onChangeText={setPhone}
        />
        <InputField
          label="Email"
          placeholder="your@restaurant.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          value={email}
          onChangeText={setEmail}
        />
        <InputField
          label="Password"
          placeholder="Create a password"
          secureTextEntry
          autoComplete="password"
          value={password}
          onChangeText={setPassword}
        />

        <PrimaryButton
          text="Create Account"
          onPress={onCreate}
          loading={loading}
          disabled={loading}
          style={styles.createButton}
        />

        <View style={styles.footer}>
          <Text style={styles.footerPrompt}>Already have an account? </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Log in"
            onPress={() => router.replace('/login')}
          >
            <Text style={styles.footerLink}>Log in</Text>
          </Pressable>
        </View>
      </ScreenContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xxl,
  },
  title: {
    ...Typography.heading,
    fontSize: 32,
    lineHeight: 40,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  subtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    maxWidth: 320,
  },
  createButton: {
    marginTop: Spacing.base,
    marginBottom: Spacing.xxl,
  },
  footer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  footerPrompt: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  footerLink: {
    ...Typography.captionMedium,
    color: Colors.primary,
  },
});
