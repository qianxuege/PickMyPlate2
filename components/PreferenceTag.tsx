import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BorderRadius, Colors, Dimensions, Spacing, Typography } from '@/constants/theme';

export type PreferenceTagVariant = 'positive' | 'negative';

export type PreferenceTagProps = {
  label: string;
  variant?: PreferenceTagVariant;
  onRemove: () => void;
};

export function PreferenceTag({ label, variant = 'positive', onRemove }: PreferenceTagProps) {
  const isPositive = variant === 'positive';

  return (
    <View style={[styles.tag, isPositive ? styles.tagPositive : styles.tagNegative]}>
      <Text style={[styles.text, isPositive ? styles.textPositive : styles.textNegative]}>
        {label}
      </Text>
      <Pressable onPress={onRemove} hitSlop={8} style={styles.removeButton}>
        <MaterialCommunityIcons
          name="close"
          size={Dimensions.iconSize}
          color={isPositive ? Colors.primary : Colors.textSecondary}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: Spacing.sm,
    paddingLeft: Spacing.md,
    paddingRight: Spacing.xs,
    borderRadius: BorderRadius.full,
    gap: Spacing.xs,
  },
  tagPositive: {
    backgroundColor: Colors.tagPositiveBg,
  },
  tagNegative: {
    backgroundColor: Colors.tagNegativeBg,
  },
  text: {
    ...Typography.caption,
  },
  textPositive: {
    color: Colors.primary,
    fontWeight: '500',
  },
  textNegative: {
    color: Colors.text,
  },
  removeButton: {
    padding: Spacing.xs,
  },
});
