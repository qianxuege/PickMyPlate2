import { StyleSheet, Text, View } from 'react-native';

import { DinerBottomNav, ScreenContainer } from '@/components';
import { Colors, Spacing, Typography } from '@/constants/theme';

export default function DinerMenuScreen() {
  return (
    <View style={styles.wrapper}>
      <ScreenContainer scroll padding="xl">
        <Text style={styles.title}>Menu</Text>
        <Text style={styles.subtitle}>Menu scans and uploaded menus will appear here.</Text>
      </ScreenContainer>
      <DinerBottomNav activeTab="menu" />
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
