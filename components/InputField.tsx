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
  multiline,
  placeholderTextColor = Colors.textPlaceholder,
  editable = true,
  ...rest
}: InputFieldProps) {
  const hasError = Boolean(error);
  const isMultiline = Boolean(multiline);

  return (
    <View style={[styles.container, containerStyle, style]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View
        style={[
          styles.inputWrap,
          hasError && styles.inputWrapError,
          !editable && styles.inputWrapDisabled,
        ]}
      >
        <TextInput
          style={[
            isMultiline ? styles.inputMultiline : styles.inputSingle,
            !editable && styles.inputTextDisabled,
            inputStyle,
          ]}
          placeholderTextColor={placeholderTextColor}
          editable={editable}
          multiline={isMultiline}
          scrollEnabled
          textAlignVertical={isMultiline ? 'top' : 'center'}
          {...rest}
        />
      </View>
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
  inputWrap: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.base,
    backgroundColor: Colors.background,
    overflow: 'hidden',
  },
  inputWrapError: {
    borderColor: Colors.error,
    backgroundColor: Colors.errorBackground,
  },
  inputWrapDisabled: {
    backgroundColor: Colors.borderLight,
  },
  inputSingle: {
    height: Dimensions.inputHeight,
    paddingHorizontal: Spacing.base,
    color: Colors.text,
    ...Typography.body,
    width: '100%',
  },
  inputMultiline: {
    minHeight: Dimensions.inputHeight,
    maxHeight: 120,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    color: Colors.text,
    ...Typography.body,
    width: '100%',
  },
  inputTextDisabled: {
    color: Colors.textSecondary,
  },
});
