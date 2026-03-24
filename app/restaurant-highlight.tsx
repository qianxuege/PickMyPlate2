import { StyleSheet, Text } from 'react-native';

import { RestaurantTabScreenLayout } from '@/components/RestaurantTabScreenLayout';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { useGuardActiveRole } from '@/hooks/use-guard-active-role';

export default function RestaurantHighlightScreen() {
  useGuardActiveRole('restaurant');

  return (
    <RestaurantTabScreenLayout activeTab="highlight">
      <Text style={styles.title}>Highlight</Text>
      <Text style={styles.subtitle}>
        Feature signature dishes and specials for diners to discover.
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
