import { StyleSheet, Text } from 'react-native';

import { RestaurantTabScreenLayout } from '@/components/RestaurantTabScreenLayout';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { useGuardActiveRole } from '@/hooks/use-guard-active-role';

export default function RestaurantMenuScreen() {
  useGuardActiveRole('restaurant');

  return (
    <RestaurantTabScreenLayout activeTab="menu">
      <Text style={styles.title}>Menu</Text>
      <Text style={styles.subtitle}>
        Your published menu and categories will appear here after you upload.
      </Text>
    </RestaurantTabScreenLayout>
  );
}

const styles = StyleSheet.create({
  title: {
    ...Typography.heading,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
});
