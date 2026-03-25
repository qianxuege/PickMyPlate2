import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, Spacing } from '@/constants/theme';

export function BackButton() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <Pressable
      onPress={() => router.back()}
      style={({ pressed }) => [
        styles.button,
        { top: insets.top + Spacing.xs },
        pressed && styles.pressed,
      ]}
      hitSlop={16}
    >
      <MaterialCommunityIcons
        name="chevron-left"
        size={32}
        color={Colors.text}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    left: Spacing.base,
    zIndex: 10,
    padding: Spacing.xs,
  },
  pressed: {
    opacity: 0.7,
  },
});
