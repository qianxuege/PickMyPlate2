import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { BorderRadius, Colors, Dimensions, Shadows, Spacing, Typography } from '@/constants/theme';

export type PrimaryButtonProps = PressableProps & {
  text: string;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  loading?: boolean;
  /** Override brand orange (e.g. role shell primary) */
  accentColor?: string;
  /** RGB for shadow tint, e.g. "255, 106, 61" */
  accentShadowRgb?: string;
};

export function PrimaryButton({
  text,
  onPress,
  style,
  disabled = false,
  loading = false,
  accentColor,
  accentShadowRgb,
  ...rest
}: PrimaryButtonProps) {
  const bg = accentColor ?? Colors.primary;
  const shadowTint = accentShadowRgb ?? '255, 106, 61';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: bg,
          shadowColor: `rgb(${shadowTint})`,
        },
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={Colors.white} />
      ) : (
        <Text style={styles.text}>{text}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    height: Dimensions.buttonHeight,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.base,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    ...Shadows.primary,
  },
  pressed: {
    opacity: 0.9,
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    ...Typography.button,
    color: Colors.white,
  },
});
