import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Platform, Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';

import { BorderRadius, Colors, Spacing, Typography } from '@/constants/theme';

export type PreferencePillProps = {
  label: string;
  selected?: boolean;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  /** Show checkmark when selected (main chips) */
  showCheckWhenSelected?: boolean;
};

export function PreferencePill({
  label,
  selected = false,
  onPress,
  style,
  showCheckWhenSelected = true,
}: PreferencePillProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.pill,
        selected ? styles.pillSelected : styles.pillUnselected,
        pressed && styles.pillPressed,
        style,
      ]}
    >
      {showCheckWhenSelected && selected && (
        <MaterialCommunityIcons name="check" size={16} color={Colors.white} style={styles.checkIcon} />
      )}
      <Text style={[styles.text, selected && styles.textSelected]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: 12,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    gap: 6,
  },
  pillUnselected: {
    borderColor: Colors.chipBorder,
    backgroundColor: Colors.white,
  },
  pillSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
    ...Platform.select({
      ios: {
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.28,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
      default: {},
    }),
  },
  pillPressed: {
    transform: [{ scale: 0.96 }],
  },
  checkIcon: {
    marginRight: -2,
  },
  text: {
    ...Typography.body,
    color: Colors.chipText,
  },
  textSelected: {
    color: Colors.white,
    fontWeight: '600',
  },
});
