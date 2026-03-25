import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DinerBottomNav } from '@/components/DinerBottomNav';
import { RoleAppHeader } from '@/components/RoleAppHeader';
import { Spacing } from '@/constants/theme';
import { dinerRoleTheme } from '@/constants/role-theme';

type DinerTab = 'home' | 'menu' | 'favorites' | 'profile';

type DinerTabScreenLayoutProps = {
  activeTab: DinerTab;
  children: React.ReactNode;
};

export function DinerTabScreenLayout({ activeTab, children }: DinerTabScreenLayoutProps) {
  const insets = useSafeAreaInsets();
  const t = dinerRoleTheme;

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
        <RoleAppHeader mode="diner" />
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
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    flexGrow: 1,
  },
});
