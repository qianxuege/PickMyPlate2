import { StyleSheet, Text, View } from 'react-native';

import { RestaurantBottomNav, ScreenContainer } from '@/components';
import { Colors, Spacing, Typography } from '@/constants/theme';

export default function RestaurantMenuScreen() {
  return (
    <View style={styles.wrapper}>
      <ScreenContainer scroll padding="xl">
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
