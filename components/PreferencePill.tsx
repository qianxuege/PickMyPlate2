import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';

import { BorderRadius, Colors, Spacing, Typography } from '@/constants/theme';

export type PreferencePillProps = {
  label: string;
  selected?: boolean;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
};

export function PreferencePill({ label, selected = false, onPress, style }: PreferencePillProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.pill,
        selected && styles.pillSelected,
        pressed && styles.pillPressed,
        style,
      ]}
    >
      <Text style={[styles.text, selected && styles.textSelected]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
  },
  pillSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  pillPressed: {
    opacity: 0.9,
  },
  text: {
    ...Typography.body,
    color: Colors.text,
  },
  textSelected: {
    color: Colors.primary,
    fontWeight: '600',
  },
});
