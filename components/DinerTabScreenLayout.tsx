import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DinerBottomNav } from '@/components/DinerBottomNav';
import { DinerMenuTitleBar } from '@/components/DinerMenuTitleBar';
import { RoleAppHeader } from '@/components/RoleAppHeader';
import { dinerRoleTheme } from '@/constants/role-theme';
import { Spacing } from '@/constants/theme';

type DinerTab = 'home' | 'menu' | 'favorites' | 'profile';

type DinerTabScreenLayoutProps = {
  activeTab: DinerTab;
  children: React.ReactNode;
  /** Figma diner menu: back + centered title + search; replaces mode badge header */
  menuHeader?: { title: string; scanId?: string; restaurantName?: string };
};

export function DinerTabScreenLayout({ activeTab, children, menuHeader }: DinerTabScreenLayoutProps) {
  const insets = useSafeAreaInsets();
  const t = dinerRoleTheme;

  return (
    <View style={[styles.root, { backgroundColor: t.screenBackground }]}>
      <View
        style={[
          styles.headerChrome,
          menuHeader ? styles.headerChromeMenu : null,
          {
            paddingTop: menuHeader ? insets.top : insets.top + Spacing.md,
            backgroundColor: '#FFFFFF',
          },
        ]}
      >
        {menuHeader ? (
          <DinerMenuTitleBar
            title={menuHeader.title}
            scanId={menuHeader.scanId}
            restaurantName={menuHeader.restaurantName}
          />
        ) : (
          <RoleAppHeader mode="diner" />
        )}
      </View>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={[
            menuHeader ? styles.scrollContentMenu : styles.scrollContent,
            { paddingBottom: insets.bottom + Spacing.xxl },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
      <DinerBottomNav activeTab={activeTab} />
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
  headerChromeMenu: {
    paddingHorizontal: 0,
    paddingBottom: 0,
  },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    flexGrow: 1,
  },
  /** Figma diner menu body: 16px horizontal, 12px top */
  scrollContentMenu: {
    paddingHorizontal: 16,
    paddingTop: 12,
    flexGrow: 1,
  },
});
