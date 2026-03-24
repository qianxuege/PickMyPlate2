import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackButton, InputField, PrimaryButton, ScreenContainer } from '@/components';
import { Colors, Spacing, Typography } from '@/constants/theme';

export default function RestaurantRegistrationScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

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

        <InputField label="Restaurant Name" placeholder="Your restaurant name" />
        <InputField
          label="Email"
          placeholder="your@restaurant.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
        />
        <InputField
          label="Password"
          placeholder="Create a password"
          secureTextEntry
          autoComplete="password"
        />

        <PrimaryButton
          text="Create Account"
          onPress={() => router.push('/restaurant-registration-2')}
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
