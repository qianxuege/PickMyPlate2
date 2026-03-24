import { StyleSheet, Text, View } from 'react-native';

import { RestaurantBottomNav, ScreenContainer } from '@/components';
import { Colors, Spacing, Typography } from '@/constants/theme';

export default function RestaurantHighlightScreen() {
  return (
    <View style={styles.wrapper}>
      <ScreenContainer scroll padding="xl">
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
