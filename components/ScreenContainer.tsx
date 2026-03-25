import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type ViewProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, Spacing } from '@/constants/theme';

export type ScreenContainerProps = ViewProps & {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  scroll?: boolean;
  padding?: keyof typeof Spacing;
  backgroundColor?: string;
  centered?: boolean;
};

export function ScreenContainer({
  children,
  style,
  scroll = true,
  padding = 'xl',
  backgroundColor = Colors.background,
  centered = false,
  ...rest
}: ScreenContainerProps) {
  const insets = useSafeAreaInsets();
  const paddingValue = Spacing[padding];

  const justifyContent = centered ? ('center' as const) : ('flex-start' as const);
  const containerStyle = [
    styles.container,
    {
      backgroundColor,
      paddingTop: insets.top,
      paddingBottom: insets.bottom,
      paddingHorizontal: paddingValue,
      justifyContent,
    },
    style,
  ];

  if (scroll) {
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={[styles.flex, { backgroundColor }]}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            centered && styles.centered,
            {
              paddingHorizontal: paddingValue,
              paddingTop: insets.top + paddingValue,
              paddingBottom: insets.bottom + paddingValue,
            },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <View style={containerStyle} {...rest}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.xl,
  },
  centered: {
    justifyContent: 'center',
    minHeight: '100%',
  },
});
