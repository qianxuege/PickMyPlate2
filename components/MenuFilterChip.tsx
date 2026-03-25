import { Platform, Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';

/** Figma filter chips: selected #FF6B35 + shadow; default white + #D1D5DC border; label 13/500 */
const ORANGE = '#FF6B35';
const BORDER = '#D1D5DC';
const TEXT_MUTED = '#364153';

export type MenuFilterChipProps = {
  label: string;
  selected?: boolean;
  /** If true and not selected, render subtle "no-hit in current menu" state. */
  muted?: boolean;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
};

export function MenuFilterChip({ label, selected = false, muted = false, onPress, style }: MenuFilterChipProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        selected ? styles.chipSelected : muted ? styles.chipMuted : styles.chipDefault,
        pressed && styles.chipPressed,
        style,
      ]}
    >
      <Text style={[styles.label, selected && styles.labelSelected, muted && !selected && styles.labelMuted]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 9999,
    gap: 6,
  },
  chipDefault: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: BORDER,
  },
  chipMuted: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  chipSelected: {
    backgroundColor: ORANGE,
    borderWidth: 0,
    ...Platform.select({
      ios: {
        shadowColor: ORANGE,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
      },
      android: {
        elevation: 4,
      },
      default: {},
    }),
  },
  chipPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.98 }],
  },
  label: {
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '500',
    letterSpacing: -0.076,
    color: TEXT_MUTED,
    textAlign: 'center',
  },
  labelMuted: {
    color: '#9CA3AF',
  },
  labelSelected: {
    color: '#FFFFFF',
  },
});
