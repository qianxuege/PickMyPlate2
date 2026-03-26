import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Spacing, Typography } from '@/constants/theme';

/** Figma: Raw Wireframes — Diner Search / Diner Search Results (nodes 43-779, 43-813) */
export const DS = {
  shellBg: '#FFFFFF',
  screenBg: '#FFFFFF',
  listBg: '#FFFFFF',
  text: '#101828',
  subtext: '#6A7282',
  muted: '#99A1AF',
  orange: '#FF6B35',
  border: '#E5E7EB',
  inputBorder: '#D1D5DC',
  bodyMuted: '#4A5565',
  heart: '#99A1AF',
  flameOff: '#D1D5DC',
  sectionGap: 8,
} as const;

type DinerSearchChromeProps = {
  query: string;
  onChangeQuery: (q: string) => void;
  onSubmitSearch: () => void;
};

/** Shared header: centered “Search” (yellow) + “Dishes”, subtitle, search field. */
export function DinerSearchChrome({ query, onChangeQuery, onSubmitSearch }: DinerSearchChromeProps) {
  return (
    <>
      <View style={chromeStyles.titleCenterWrap}>
        <Text style={chromeStyles.titleText}>Search Dishes</Text>
      </View>
      <Text style={chromeStyles.subtitle}>Find your perfect meal</Text>

      <View style={chromeStyles.searchFieldWrap}>
        <MaterialCommunityIcons name="magnify" size={20} color={DS.bodyMuted} style={chromeStyles.searchIcon} />
        <TextInput
          value={query}
          onChangeText={onChangeQuery}
          placeholder="Search for a dish..."
          placeholderTextColor={DS.muted}
          style={chromeStyles.searchInput}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
          onSubmitEditing={onSubmitSearch}
          clearButtonMode="never"
        />
        {query.length > 0 ? (
          <Pressable
            onPress={() => onChangeQuery('')}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Clear search"
            style={chromeStyles.clearBtn}
          >
            <MaterialCommunityIcons name="close" size={16} color={DS.bodyMuted} />
          </Pressable>
        ) : null}
      </View>
    </>
  );
}

type DinerSearchFooterProps = {
  onBackToMenu: () => void;
  bottomInset: number;
};

export function DinerSearchFooter({ onBackToMenu, bottomInset }: DinerSearchFooterProps) {
  return (
    <View style={[chromeStyles.footerPad, { paddingBottom: bottomInset + Spacing.base }]}>
      <View style={chromeStyles.footerRule} />
      <Pressable
        onPress={onBackToMenu}
        style={({ pressed }) => [chromeStyles.backToMenuBtn, pressed && chromeStyles.backToMenuBtnPressed]}
        accessibilityRole="button"
        accessibilityLabel="Back to Menu"
      >
        <Text style={chromeStyles.backToMenuBtnText}>Back to Menu</Text>
      </Pressable>
    </View>
  );
}

const chromeStyles = StyleSheet.create({
  titleCenterWrap: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    marginTop: 48,
  },
  titleText: {
    fontSize: 32,
    lineHeight: 40,
    fontWeight: '700',
    letterSpacing: -0.5,
    color: DS.text,
    ...Platform.select({
      android: { includeFontPadding: false },
    }),
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '400',
    color: DS.subtext,
    textAlign: 'center',
    marginBottom: 24,
  },
  /** Figma wireframe: pill-shaped search bar, light grey stroke */
  searchFieldWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: DS.orange,
    borderRadius: 9999,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: Spacing.base,
    minHeight: 50,
  },
  searchIcon: { marginRight: 6 },
  searchInput: {
    flex: 1,
    ...Typography.body,
    lineHeight: 22,
    color: DS.text,
    paddingVertical: Platform.OS === 'ios' ? 13 : 11,
    minHeight: 44,
  },
  clearBtn: { padding: 6 },
  footerPad: {
    paddingHorizontal: 24,
    paddingTop: 24,
    backgroundColor: DS.screenBg,
  },
  footerRule: {
    height: 1,
    backgroundColor: DS.border,
    marginBottom: Spacing.sm,
  },
  backToMenuBtn: {
    backgroundColor: DS.orange,
    borderRadius: 9999,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backToMenuBtnPressed: { opacity: 0.92 },
  backToMenuBtnText: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
