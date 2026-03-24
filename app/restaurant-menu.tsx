import { StyleSheet, Text, View } from 'react-native';

import { RestaurantBottomNav, RoleModeBanner, ScreenContainer } from '@/components';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { useGuardActiveRole } from '@/hooks/use-guard-active-role';

export default function RestaurantMenuScreen() {
  useGuardActiveRole('restaurant');

  return (
    <View style={styles.wrapper}>
      <ScreenContainer scroll padding="xl">
        <RoleModeBanner current="restaurant" />
        <Text style={styles.title}>Menu</Text>
        <Text style={styles.subtitle}>
          Your published menu and categories will appear here after you upload.
        </Text>
      </ScreenContainer>
      <RestaurantBottomNav activeTab="menu" />
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
