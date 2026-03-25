import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { BorderRadius, Colors, Dimensions, Spacing, Typography } from '@/constants/theme';

export type SecondaryButtonProps = PressableProps & {
  text: string;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
};

export function SecondaryButton({
  text,
  onPress,
  style,
  disabled = false,
  loading = false,
  icon,
  ...rest
}: SecondaryButtonProps) {
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
        <ActivityIndicator color={Colors.text} />
      ) : (
        <>
          {icon && <>{icon}</>}
          <Text style={styles.text}>{text}</Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    height: Dimensions.buttonHeight,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.base,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  pressed: {
    opacity: 0.9,
    backgroundColor: Colors.borderLight,
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    ...Typography.button,
    color: Colors.text,
  },
});
