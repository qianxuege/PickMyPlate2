import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { Spacing } from '@/constants/theme';

/** Figma diner menu: #101828 text, #F3F4F6 circular buttons */
const FG = '#101828';
const CIRCLE_BG = '#F3F4F6';

type DinerMenuTitleBarProps = {
  title: string;
  /** When set, search opens in-menu dish search for this scan. */
  scanId?: string;
  /** Passed through to dish detail / search context. */
  restaurantName?: string;
};

export function DinerMenuTitleBar({ title, scanId, restaurantName }: DinerMenuTitleBarProps) {
  const router = useRouter();

  const onSearch = () => {
    if (!scanId?.trim()) return;
    router.push({
      pathname: '/diner-search',
      params: {
        scanId: scanId.trim(),
        restaurantName: restaurantName?.trim() || title,
      },
    });
  };

  const onBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/diner-home');
    }
  };

  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={onBack}
        style={({ pressed }) => [styles.circleBtn, pressed && styles.circleBtnPressed]}
        accessibilityRole="button"
        accessibilityLabel="Back"
      >
        <MaterialCommunityIcons name="arrow-left" size={18} color={FG} />
      </Pressable>
      <View style={styles.titleSlot} pointerEvents="none">
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
      </View>
      <Pressable
        onPress={onSearch}
        style={({ pressed }) => [styles.circleBtn, pressed && styles.circleBtnPressed]}
        accessibilityRole="button"
        accessibilityLabel="Search dishes in this menu"
        accessibilityState={{ disabled: !scanId?.trim() }}
        disabled={!scanId?.trim()}
      >
        <MaterialCommunityIcons name="magnify" size={18} color={scanId?.trim() ? FG : '#9CA3AF'} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: 10,
    minHeight: 56,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
      default: {},
    }),
  },
  circleBtn: {
    width: 36,
    height: 36,
    borderRadius: 9999,
    backgroundColor: CIRCLE_BG,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleBtnPressed: {
    opacity: 0.88,
  },
  titleSlot: {
    position: 'absolute',
    left: 56,
    right: 56,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 17,
    lineHeight: 26,
    fontWeight: '700',
    letterSpacing: -0.43,
    color: FG,
    textAlign: 'center',
  },
});
