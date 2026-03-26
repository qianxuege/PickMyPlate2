import { useFocusEffect } from '@react-navigation/native';
import { type Href, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DinerSearchChrome, DinerSearchFooter, DS } from '@/components/diner-search-ui';
import { Spacing, Typography } from '@/constants/theme';
import { useGuardActiveRole } from '@/hooks/use-guard-active-role';
import { addDinerSearchRecent, loadDinerSearchRecents } from '@/lib/diner-search-recent';

/** Figma wireframe defaults when there are no saved recents yet */
const FIGMA_DEFAULT_RECENTS = ['Tacos', 'Salmon', 'Pizza', 'Curry'] as const;

/**
 * Figma node 43-779 — Diner Search (recents + search field, no results list).
 * Results: `diner-search-results.tsx` (node 43-813).
 */
export default function DinerSearchScreen() {
  useGuardActiveRole('diner');
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ scanId?: string | string[]; restaurantName?: string | string[] }>();
  const scanIdRaw = params.scanId;
  const scanId = Array.isArray(scanIdRaw) ? scanIdRaw[0] : scanIdRaw;
  const nameRaw = params.restaurantName;
  const restaurantNameParam = Array.isArray(nameRaw) ? nameRaw[0] : nameRaw;

  const [query, setQuery] = useState('');
  const [recents, setRecents] = useState<string[]>([]);

  const headerTitle = restaurantNameParam?.trim() || 'Menu';

  const refreshRecents = useCallback(async () => {
    if (!scanId) {
      setRecents([]);
      return;
    }
    setRecents(await loadDinerSearchRecents(scanId));
  }, [scanId]);

  useFocusEffect(
    useCallback(() => {
      void refreshRecents();
    }, [refreshRecents])
  );

  const goBackToMenu = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    if (scanId) {
      router.replace({ pathname: '/diner-menu', params: { scanId } });
      return;
    }
    router.replace('/diner-home');
  }, [router, scanId]);

  const openResults = useCallback(
    async (q: string) => {
      if (!scanId) return;
      const trimmed = q.trim();
      if (trimmed.length >= 2) {
        await addDinerSearchRecent(scanId, trimmed);
        await refreshRecents();
      }
      router.push({
        pathname: '/diner-search-results',
        params: {
          scanId,
          restaurantName: headerTitle,
          query: trimmed,
        },
      } as Href);
    },
    [headerTitle, refreshRecents, router, scanId]
  );

  const onSubmitSearch = useCallback(() => {
    void openResults(query);
  }, [openResults, query]);

  const onSelectRecent = useCallback(
    (term: string) => {
      setQuery(term);
      void openResults(term);
    },
    [openResults]
  );

  const displayRecents =
    recents.length > 0 ? recents : [...FIGMA_DEFAULT_RECENTS];

  if (!scanId) {
    return (
      <View style={styles.shell}>
        <View style={styles.panel}>
          <View style={[styles.hPad, { paddingTop: insets.top + Spacing.xs }]}>
            <DinerSearchChrome query={query} onChangeQuery={setQuery} onSubmitSearch={onSubmitSearch} />
            <Text style={styles.emptyHint}>Open search from a menu scan to find dishes.</Text>
          </View>
          <View style={styles.flex} />
          <DinerSearchFooter onBackToMenu={goBackToMenu} bottomInset={insets.bottom} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.shell}>
      <View style={styles.panel}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + Spacing.xs }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.hPad}>
            <DinerSearchChrome query={query} onChangeQuery={setQuery} onSubmitSearch={onSubmitSearch} />
            <Text style={styles.recentsSectionTitle}>Recent Searches</Text>
            {displayRecents.map((term, index) => (
              <Pressable
                key={`${term}-${index}`}
                onPress={() => onSelectRecent(term)}
                style={({ pressed }) => [styles.recentBracket, pressed && styles.recentBracketPressed]}
                accessibilityRole="button"
                accessibilityLabel={`Recent search ${term}`}
              >
                <Text style={styles.recentBracketText}>{term}</Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
        <DinerSearchFooter onBackToMenu={goBackToMenu} bottomInset={insets.bottom} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: DS.shellBg,
  },
  panel: {
    flex: 1,
    width: '100%',
    backgroundColor: DS.screenBg,
  },
  flex: { flex: 1 },
  hPad: { paddingHorizontal: 24 },
  scrollContent: {
    paddingBottom: Spacing.md,
  },
  recentsSectionTitle: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '700',
    color: DS.text,
    marginTop: DS.sectionGap,
    marginBottom: 12,
  },
  /** Figma: each recent in its own rounded border (“brackets”) */
  recentBracket: {
    borderWidth: 1,
    borderColor: DS.border,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    paddingHorizontal: Spacing.base,
    marginBottom: 8,
  },
  recentBracketPressed: { opacity: 0.96 },
  recentBracketText: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '500',
    color: DS.text,
  },
  emptyHint: {
    ...Typography.body,
    color: DS.muted,
    marginTop: Spacing.md,
  },
});
