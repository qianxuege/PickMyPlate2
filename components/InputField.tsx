import {
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';

import { BorderRadius, Colors, Dimensions, Spacing, Typography } from '@/constants/theme';

import { ErrorText } from './ErrorText';

export type InputFieldProps = TextInputProps & {
  label?: string;
  error?: string;
  style?: StyleProp<ViewStyle>;
  inputStyle?: TextInputProps['style'];
  containerStyle?: StyleProp<ViewStyle>;
};

export function InputField({
  label,
  error,
  style,
  inputStyle,
  containerStyle,
  placeholderTextColor = Colors.textPlaceholder,
  editable = true,
  ...rest
}: InputFieldProps) {
  const hasError = Boolean(error);

  return (
    <View style={[styles.container, containerStyle, style]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        style={[
          styles.input,
          hasError && styles.inputError,
          !editable && styles.inputDisabled,
          inputStyle,
        ]}
        placeholderTextColor={placeholderTextColor}
        editable={editable}
        {...rest}
      />
      {error ? <ErrorText text={error} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.lg,
  },
  label: {
    ...Typography.label,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  input: {
    height: Dimensions.inputHeight,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.base,
    paddingHorizontal: Spacing.base,
    backgroundColor: Colors.background,
    color: Colors.text,
    ...Typography.body,
  },
  inputError: {
    borderColor: Colors.error,
    backgroundColor: Colors.errorBackground,
  },
  inputDisabled: {
    backgroundColor: Colors.borderLight,
    color: Colors.textSecondary,
  },
});
