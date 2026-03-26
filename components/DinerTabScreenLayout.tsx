import type { ComponentProps, ReactElement } from 'react';
import { KeyboardAvoidingView, Platform, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
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
  /** Figma Diner Favorites: full-width banner instead of role header */
  headerBanner?: { title: string; backgroundColor: string };
  refreshControl?: ReactElement<ComponentProps<typeof RefreshControl>>;
};

export function DinerTabScreenLayout({
  activeTab,
  children,
  menuHeader,
  headerBanner,
  refreshControl,
}: DinerTabScreenLayoutProps) {
  const insets = useSafeAreaInsets();
  const t = dinerRoleTheme;

  const headerTopPad = menuHeader ? insets.top : headerBanner ? insets.top : insets.top + Spacing.md;

  return (
    <View style={[styles.root, { backgroundColor: t.screenBackground }]}>
      <View
        style={[
          styles.headerChrome,
          menuHeader ? styles.headerChromeMenu : null,
          headerBanner ? styles.headerChromeBanner : null,
          {
            paddingTop: headerTopPad,
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
        ) : headerBanner ? (
          <View style={[styles.bannerStrip, { backgroundColor: headerBanner.backgroundColor }]}>
            <Text style={styles.bannerTitle}>{headerBanner.title}</Text>
          </View>
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
          refreshControl={refreshControl}
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
  headerChromeBanner: {
    paddingHorizontal: 0,
    paddingBottom: 0,
  },
  bannerStrip: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  bannerTitle: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '700',
    color: '#101828',
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
