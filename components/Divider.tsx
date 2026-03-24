import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { Colors, Spacing, Typography } from '@/constants/theme';

export type DividerProps = {
  text?: string;
  style?: StyleProp<ViewStyle>;
};

export function Divider({ text, style }: DividerProps) {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.line} />
      {text ? <Text style={styles.text}>{text}</Text> : null}
      <View style={styles.line} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.xxl,
    gap: Spacing.base,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  text: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
});
