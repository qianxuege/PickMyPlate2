import { StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';

import { PrimaryButton, ScreenContainer } from '@/components';
import { Colors, Spacing, Typography } from '@/constants/theme';

export default function RestaurantRegistrationScreen() {
  const router = useRouter();

  return (
    <ScreenContainer scroll padding="xl">
      <Text style={styles.heading}>Join as a Restaurant Owner</Text>
      <Text style={styles.subtitle}>
        Create an account to upload menus and grow your business.
      </Text>
      <PrimaryButton text="Back" onPress={() => router.back()} />
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
    marginBottom: Spacing.xxxl,
  },
});
