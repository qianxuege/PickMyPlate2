import { StyleSheet, Text, type StyleProp, type TextProps, type TextStyle } from 'react-native';

import { Colors, Spacing, Typography } from '@/constants/theme';

export type ErrorTextProps = TextProps & {
  text?: string;
  style?: StyleProp<TextStyle>;
};

export function ErrorText({ text, style, children, ...rest }: ErrorTextProps) {
  const content = text ?? children;
  if (!content) return null;

  return (
    <Text style={[styles.error, style]} {...rest}>
      {content}
    </Text>
  );
}

const styles = StyleSheet.create({
  error: {
    ...Typography.small,
    color: Colors.error,
    marginTop: Spacing.xs,
  },
});
