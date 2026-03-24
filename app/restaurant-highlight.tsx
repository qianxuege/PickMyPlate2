import { StyleSheet, Text, View } from 'react-native';

import { RestaurantBottomNav, RoleModeBanner, ScreenContainer } from '@/components';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { useGuardActiveRole } from '@/hooks/use-guard-active-role';

export default function RestaurantHighlightScreen() {
  useGuardActiveRole('restaurant');

  return (
    <View style={styles.wrapper}>
      <ScreenContainer scroll padding="xl">
        <RoleModeBanner current="restaurant" />
        <Text style={styles.title}>Highlight</Text>
        <Text style={styles.subtitle}>
          Feature signature dishes and specials for diners to discover.
        </Text>
      </ScreenContainer>
      <RestaurantBottomNav activeTab="highlight" />
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
