import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Spacing, Typography } from '@/constants/theme';

/**
 * In-menu dish search (US4). Extend with query + results when ready.
 * Route exists so the menu title bar can navigate here with typed routes.
 */
export default function DinerSearchScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ scanId?: string | string[]; restaurantName?: string | string[] }>();
  const scanIdRaw = params.scanId;
  const scanId = Array.isArray(scanIdRaw) ? scanIdRaw[0] : scanIdRaw;
  const nameRaw = params.restaurantName;
  const restaurantName = Array.isArray(nameRaw) ? nameRaw[0] : nameRaw;

  return (
    <View style={styles.root}>
      <Pressable onPress={() => router.back()} style={styles.back} accessibilityRole="button">
        <Text style={styles.backText}>← Back</Text>
      </Pressable>
      <Text style={styles.title}>Search</Text>
      <Text style={styles.meta}>
        {restaurantName ? `${restaurantName} · ` : ''}
        {scanId ? `scan ${scanId.slice(0, 8)}…` : 'No scan'}
      </Text>
      <Text style={styles.hint}>Wire up dish search UI here (US4).</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    padding: Spacing.lg,
    paddingTop: Spacing.xxl,
    backgroundColor: Colors.background,
  },
  back: {
    alignSelf: 'flex-start',
    marginBottom: Spacing.md,
  },
  backText: {
    ...Typography.body,
    color: Colors.primary,
  },
  title: {
    ...Typography.heading,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  meta: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
  },
  hint: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
});
