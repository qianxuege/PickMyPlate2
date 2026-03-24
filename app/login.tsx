import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  Divider,
  InputField,
  PrimaryButton,
  RegistrationCard,
  ScreenContainer,
  SecondaryButton,
} from '@/components';
import { Colors, Dimensions, Spacing, Typography } from '@/constants/theme';

export default function LoginScreen() {
  const router = useRouter();

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
        />
        <View>
          <InputField
            label="Password"
            placeholder="Enter your password"
            secureTextEntry
            autoComplete="password"
            containerStyle={styles.passwordField}
          />
          <Pressable onPress={() => router.push('/forgot-password')}>
            <Text style={styles.forgotPassword}>Forgot password?</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.buttons}>
        <PrimaryButton text="Log In" onPress={() => {}} />
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
