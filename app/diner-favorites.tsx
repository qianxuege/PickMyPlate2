import { StyleSheet, Text, View } from 'react-native';

import { DinerBottomNav, ScreenContainer } from '@/components';
import { Colors, Spacing, Typography } from '@/constants/theme';

export default function DinerFavoritesScreen() {
  return (
    <View style={styles.wrapper}>
      <ScreenContainer scroll padding="xl">
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
