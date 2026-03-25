import { StyleSheet, Text } from 'react-native';

import { DinerTabScreenLayout } from '@/components/DinerTabScreenLayout';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { useGuardActiveRole } from '@/hooks/use-guard-active-role';

export default function DinerMenuScreen() {
  useGuardActiveRole('diner');

  return (
    <DinerTabScreenLayout activeTab="menu">
      <Text style={styles.title}>Menu</Text>
      <Text style={styles.subtitle}>Menu scans and uploaded menus will appear here.</Text>
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
