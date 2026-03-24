import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, Spacing, Typography } from '@/constants/theme';

type DinerTab = 'home' | 'menu' | 'favorites' | 'profile';

type DinerBottomNavProps = {
  activeTab: DinerTab;
};

const TABS: Array<{
  key: DinerTab;
  label: string;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  route: '/diner-home' | '/diner-menu' | '/diner-favorites' | '/diner-profile';
}> = [
  { key: 'home', label: 'Home', icon: 'home-outline', route: '/diner-home' },
  { key: 'menu', label: 'Menu', icon: 'format-list-bulleted-square', route: '/diner-menu' },
  { key: 'favorites', label: 'Favorites', icon: 'heart-outline', route: '/diner-favorites' },
  { key: 'profile', label: 'Profile', icon: 'account-outline', route: '/diner-profile' },
];

export function DinerBottomNav({ activeTab }: DinerBottomNavProps) {
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
    minWidth: 70,
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
