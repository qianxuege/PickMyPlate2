import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Spacing, Typography } from '@/constants/theme';

/** Figma: Raw Wireframes — Diner Search / Diner Search Results (nodes 43-779, 43-813) */
export const DS = {
  screenBg: '#FFFFFF',
  /** Slightly softer strip behind results (wireframe vs white header) */
  listBg: '#F2F4F7',
  text: '#101828',
  subtext: '#6A7282',
  muted: '#99A1AF',
  /** Yellow highlight behind “Search” only (node 43-779 / 43-813) */
  highlightBg: '#FDE047',
  orange: '#FF6B35',
  border: '#E5E7EB',
  inputBorder: '#D1D5DC',
  bodyMuted: '#4A5565',
  heart: '#99A1AF',
  flameOff: '#D1D5DC',
  /** Inspect: ~10px vertical rhythm between stacked blocks */
  sectionGap: 10,
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
        <View style={chromeStyles.titleRow}>
          <View style={chromeStyles.searchHighlight}>
            <Text style={chromeStyles.searchHighlightText}>Search</Text>
          </View>
          <Text style={chromeStyles.dishesText}>Dishes</Text>
        </View>
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
  },
  /** Single horizontal line, centered as a unit (Figma headline). */
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    maxWidth: '100%',
  },
  searchHighlight: {
    backgroundColor: DS.highlightBg,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 6,
    justifyContent: 'center',
  },
  searchHighlightText: {
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '800',
    letterSpacing: -0.85,
    color: DS.text,
    ...Platform.select({
      android: { includeFontPadding: false },
    }),
  },
  dishesText: {
    marginLeft: 8,
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '800',
    letterSpacing: -0.85,
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
    marginBottom: DS.sectionGap,
  },
  /** Figma wireframe: pill-shaped search bar, light grey stroke */
  searchFieldWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: DS.inputBorder,
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
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.sm,
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
