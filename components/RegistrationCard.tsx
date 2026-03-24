import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { BorderRadius, Colors, Spacing, Typography } from '@/constants/theme';

export type RegistrationCardProps = {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
};

export function RegistrationCard({ icon, title, subtitle, onPress, style }: RegistrationCardProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed, style]}
    >
      <View style={styles.iconContainer}>{icon}</View>
      <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.base,
    marginBottom: Spacing.base,
  },
  pressed: {
    opacity: 0.9,
    backgroundColor: Colors.borderLight,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.base,
  },
  content: {
    flex: 1,
  },
  title: {
    ...Typography.captionMedium,
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
});
