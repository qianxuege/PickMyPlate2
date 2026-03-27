import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import {
  Divider,
  InputField,
  PrimaryButton,
  RegistrationCard,
  ScreenContainer,
  SecondaryButton,
} from '@/components';
import { Colors, Dimensions, Spacing, Typography } from '@/constants/theme';
import { navigateAfterAuth } from '@/lib/auth-navigation';
import { getErrorMessage } from '@/lib/error-message';
import { supabase } from '@/lib/supabase';
import { fetchUserRoles } from '@/lib/user-roles';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const onLogin = async () => {
    const trimmed = email.trim();
    if (!trimmed || !password) {
      Alert.alert('Missing info', 'Enter email and password.');
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: trimmed,
        password,
      });
      if (error) {
        Alert.alert('Sign in failed', error.message);
        return;
      }
      const uid = data.user?.id;
      if (!uid) {
        Alert.alert('Sign in failed', 'No user id returned.');
        return;
      }
      const roles = await fetchUserRoles(uid);
      if (roles.length === 0) {
        await supabase.auth.signOut();
        Alert.alert(
          'Could not load your account',
          'Sign-in worked, but no diner or restaurant role was found. If you manage your own Supabase project, apply the latest migrations (including user_roles). Otherwise try creating your account again.',
        );
        return;
      }
      await navigateAfterAuth({ router, roles });
    } catch (e) {
      if (__DEV__) console.warn('[login]', e);
      Alert.alert('Sign in failed', getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer scroll padding="xl">
      <View style={styles.headerBlock}>
        <Text style={styles.heading}>PickMyPlate</Text>
        <Text style={styles.subtitle}>
          Sign in to explore menus or manage your restaurant
        </Text>
      </View>

      <View style={styles.form}>
        <InputField
          label="Email"
          placeholder="your@email.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          value={email}
          onChangeText={setEmail}
        />
        <View>
          <InputField
            label="Password"
            placeholder="Enter your password"
            secureTextEntry
            autoComplete="password"
            containerStyle={styles.passwordField}
            value={password}
            onChangeText={setPassword}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Forgot password"
            onPress={() => router.push('/forgot-password')}
          >
            <Text style={styles.forgotPassword}>Forgot password?</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.buttons}>
        <PrimaryButton text="Log In" onPress={onLogin} loading={loading} disabled={loading} />
        <SecondaryButton
          text="Continue with Google"
          onPress={() => {}}
          icon={
            <MaterialCommunityIcons
              name="google"
              size={Dimensions.iconSize}
              color={Colors.text}
            />
          }
        />
      </View>

      <Divider text="OR" />

      <Text style={styles.sectionHeading}>New to PickMyPlate?</Text>
      <RegistrationCard
        icon={
          <MaterialCommunityIcons
            name="silverware-fork-knife"
            size={24}
            color={Colors.primary}
          />
        }
        title="Join as a Diner"
        subtitle="Explore menus, discover dishes, and save favorites"
        onPress={() => router.push('/diner-registration')}
      />
      <RegistrationCard
        icon={
          <MaterialCommunityIcons
            name="storefront"
            size={24}
            color={Colors.primary}
          />
        }
        title="Join as a Restaurant Owner"
        subtitle="Upload menus, highlight dishes, and grow your business"
        onPress={() => router.push('/restaurant-registration')}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  headerBlock: {
    alignItems: 'center',
    paddingTop: Spacing.xxl,
    paddingBottom: Spacing.lg,
    marginBottom: 48,
  },
  heading: {
    ...Typography.heading,
    fontSize: 38,
    lineHeight: 44,
    color: Colors.text,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  subtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  form: {
    marginBottom: Spacing.base,
  },
  passwordField: {
    marginBottom: Spacing.sm,
  },
  forgotPassword: {
    ...Typography.caption,
    color: Colors.primary,
    textAlign: 'right',
    marginBottom: Spacing.lg,
  },
  buttons: {
    gap: Spacing.base,
  },
  sectionHeading: {
    ...Typography.headingSmall,
    color: Colors.text,
    marginBottom: Spacing.base,
  },
});
