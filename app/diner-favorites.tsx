import { StyleSheet, Text } from 'react-native';

import { DinerTabScreenLayout } from '@/components/DinerTabScreenLayout';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { useGuardActiveRole } from '@/hooks/use-guard-active-role';

export default function DinerFavoritesScreen() {
  useGuardActiveRole('diner');

  return (
    <DinerTabScreenLayout activeTab="favorites">
      <Text style={styles.title}>Favorites</Text>
      <Text style={styles.subtitle}>Saved dishes and restaurants will appear here.</Text>
    </DinerTabScreenLayout>
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
