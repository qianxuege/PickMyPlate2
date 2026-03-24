import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, Spacing, Typography } from '@/constants/theme';

type RestaurantTab = 'home' | 'menu' | 'highlight' | 'profile';

export type RestaurantBottomNavProps = {
  activeTab: RestaurantTab;
};

const TABS: Array<{
  key: RestaurantTab;
  label: string;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  route:
    | '/restaurant-home'
    | '/restaurant-menu'
    | '/restaurant-highlight'
    | '/restaurant-profile';
}> = [
  { key: 'home', label: 'Home', icon: 'home-outline', route: '/restaurant-home' },
  {
    key: 'menu',
    label: 'Menu',
    icon: 'format-list-bulleted-square',
    route: '/restaurant-menu',
  },
  { key: 'highlight', label: 'Highlight', icon: 'star-outline', route: '/restaurant-highlight' },
  {
    key: 'profile',
    label: 'Profile',
    icon: 'account-outline',
    route: '/restaurant-profile',
  },
];

export function RestaurantBottomNav({ activeTab }: RestaurantBottomNavProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, Spacing.sm) }]}>
      {TABS.map((tab) => {
        const isActive = tab.key === activeTab;
        return (
          <Pressable key={tab.key} style={styles.tab} onPress={() => router.replace(tab.route)}>
            <MaterialCommunityIcons
              name={tab.icon}
              size={24}
              color={isActive ? Colors.primary : Colors.textSecondary}
            />
            <Text style={[styles.label, isActive && styles.activeLabel]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    backgroundColor: Colors.white,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: Spacing.sm,
  },
  tab: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    minWidth: 68,
  },
  label: {
    ...Typography.small,
    color: Colors.textSecondary,
  },
  activeLabel: {
    color: Colors.primary,
    fontWeight: '600',
  },
});
