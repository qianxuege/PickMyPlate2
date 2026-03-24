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
};

export function PrimaryButton({
  text,
  onPress,
  style,
  disabled = false,
  loading = false,
  ...rest
}: PrimaryButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
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
