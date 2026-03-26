import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { dinerRoleTheme } from '@/constants/role-theme';
import { RestaurantUiInspect } from '@/constants/restaurant-ui-inspect';
import { Colors, Spacing, Typography } from '@/constants/theme';

type DinerTab = 'home' | 'menu' | 'favorites' | 'profile';

type DinerBottomNavProps = {
  activeTab: DinerTab;
  variant?: 'light' | 'dark';
};

const TABS: Array<{
  key: DinerTab;
  label: string;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  route:
    | '/diner-home'
    | '/diner-menu'
    | '/diner-favorites'
    | '/diner-profile';
}> = [
  { key: 'home', label: 'Home', icon: 'home-outline', route: '/diner-home' },
  { key: 'menu', label: 'Menu', icon: 'format-list-bulleted-square', route: '/diner-menu' },
  { key: 'favorites', label: 'Favorites', icon: 'heart-outline', route: '/diner-favorites' },
  { key: 'profile', label: 'Profile', icon: 'account-outline', route: '/diner-profile' },
];

export function DinerBottomNav({ activeTab, variant = 'light' }: DinerBottomNavProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const accent = variant === 'dark' ? RestaurantUiInspect.accent : dinerRoleTheme.primary;
  const inactiveColor = variant === 'dark' ? RestaurantUiInspect.muted : Colors.textSecondary;
  const barBg = variant === 'dark' ? RestaurantUiInspect.surfaceDark : Colors.white;
  const barBorder = variant === 'dark' ? '#364153' : dinerRoleTheme.cardAccentBorder;

  return (
    <View
      style={[
        styles.container,
        { paddingBottom: Math.max(insets.bottom, Spacing.sm), backgroundColor: barBg, borderTopColor: barBorder },
      ]}
    >
      {TABS.map((tab) => {
        const isActive = tab.key === activeTab;
        const iconName =
          tab.key === 'favorites' && isActive
            ? 'heart'
            : tab.icon;
        return (
          <Pressable key={tab.key} style={styles.tab} onPress={() => router.replace(tab.route)}>
            <MaterialCommunityIcons
              name={iconName}
              size={24}
              color={isActive ? accent : inactiveColor}
            />
            <Text
              style={[styles.label, { color: inactiveColor }, isActive && { color: accent, fontWeight: '600' }]}
              numberOfLines={1}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: Spacing.sm,
  },
  tab: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    flex: 1,
    minWidth: 0,
  },
  label: {
    ...Typography.small,
  },
});
