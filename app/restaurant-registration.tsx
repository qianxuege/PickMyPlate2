import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackButton, InputField, PrimaryButton, ScreenContainer } from '@/components';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

export default function RestaurantRegistrationScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [restaurantName, setRestaurantName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const onCreate = async () => {
    const trimmedEmail = email.trim();
    if (!restaurantName.trim() || !trimmedEmail || !password) {
      Alert.alert('Missing info', 'Please fill in restaurant name, email, and password.');
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
            display_name: restaurantName.trim(),
          },
        },
      });
      if (error) {
        const msg = error.message.toLowerCase();
        if (msg.includes('already') || msg.includes('registered')) {
          Alert.alert(
            'Account already exists',
            'Log in with this email, then open Profile → “Add restaurant” to link a venue to your account.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Log in', onPress: () => router.replace('/login') },
            ]
          );
          return;
        }
        Alert.alert('Could not create account', error.message);
        return;
      }
      if (data.session) {
        router.push('/restaurant-registration-2');
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
          onChangeText={setRestaurantName}
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
          <Pressable onPress={() => router.replace('/login')}>
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
