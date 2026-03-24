import { StyleSheet, Text, View } from 'react-native';

import { DinerBottomNav, RoleModeBanner, ScreenContainer } from '@/components';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { useGuardActiveRole } from '@/hooks/use-guard-active-role';

export default function DinerFavoritesScreen() {
  useGuardActiveRole('diner');

  return (
    <View style={styles.wrapper}>
      <ScreenContainer scroll padding="xl">
        <RoleModeBanner current="diner" />
        <Text style={styles.title}>Favorites</Text>
        <Text style={styles.subtitle}>Saved dishes and restaurants will appear here.</Text>
      </ScreenContainer>
      <DinerBottomNav activeTab="favorites" />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
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
