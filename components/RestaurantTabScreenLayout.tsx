import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RestaurantBottomNav } from '@/components/RestaurantBottomNav';
import { RoleAppHeader } from '@/components/RoleAppHeader';
import { Spacing } from '@/constants/theme';
import { restaurantRoleTheme } from '@/constants/role-theme';

type RestaurantTab = 'home' | 'menu' | 'highlight' | 'profile';

type RestaurantTabScreenLayoutProps = {
  activeTab: RestaurantTab;
  children: React.ReactNode;
};

export function RestaurantTabScreenLayout({ activeTab, children }: RestaurantTabScreenLayoutProps) {
  const insets = useSafeAreaInsets();
  const t = restaurantRoleTheme;

  return (
    <View style={[styles.root, { backgroundColor: t.screenBackground }]}>
      <View
        style={[
          styles.headerChrome,
          {
            paddingTop: insets.top + Spacing.md,
            backgroundColor: t.headerBackground,
          },
        ]}
      >
        <RoleAppHeader mode="restaurant" />
      </View>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + Spacing.xxl },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
      <RestaurantBottomNav activeTab={activeTab} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  headerChrome: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.md,
  },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    flexGrow: 1,
  },
});
