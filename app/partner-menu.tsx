import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { restaurantRoleTheme } from '@/constants/role-theme';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { resolvePartnerTokenToDinerScan } from '@/lib/partner-menu-access';

const t = restaurantRoleTheme;

export default function PartnerMenuScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ pm?: string | string[] }>();
  const tokenRaw = params.pm;
  const token = Array.isArray(tokenRaw) ? tokenRaw[0] : tokenRaw;
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const startedTokenRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!token) return () => undefined;
    if (startedTokenRef.current === token) return () => undefined;
    startedTokenRef.current = token;

    void (async () => {
      setBusy(true);
      setError(null);
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.log('[partner-menu] resolving token', { tokenPreview: `${token.slice(0, 6)}...` });
      }
      const withTimeout = <T,>(p: Promise<T>, ms: number): Promise<T> =>
        Promise.race([
          p,
          new Promise<T>((_, reject) =>
            setTimeout(() => reject(new Error('Partner menu open timed out. Please try again.')), ms),
          ),
        ]);

      let res: Awaited<ReturnType<typeof resolvePartnerTokenToDinerScan>>;
      try {
        res = await withTimeout(resolvePartnerTokenToDinerScan(token), 25000);
      } catch (e) {
        if (__DEV__) {
          // eslint-disable-next-line no-console
          console.warn('[partner-menu] resolve timeout/failure', e);
        }
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Could not open partner menu.');
          setBusy(false);
        }
        return;
      }
      if (cancelled) return;
      if (!res.ok) {
        if (__DEV__) {
          // eslint-disable-next-line no-console
          console.warn('[partner-menu] resolve failed', res.error);
        }
        setError(res.error);
        setBusy(false);
        return;
      }
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.log('[partner-menu] resolve success', { scanId: res.scanId, restaurantName: res.restaurantName });
      }
      router.replace({
        pathname: '/diner-menu',
        params: { scanId: res.scanId, restaurantName: res.restaurantName },
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [router, token]);

  return (
    <View style={styles.root}>
      <View style={styles.card}>
        <Text style={styles.title}>Opening partner menu...</Text>
        {error ? (
          <>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable onPress={() => router.replace('/diner-home')} style={styles.btn}>
              <Text style={styles.btnText}>Go to Home</Text>
            </Pressable>
          </>
        ) : (
          <ActivityIndicator color={t.primary} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  card: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    padding: Spacing.xl,
    gap: Spacing.md,
    alignItems: 'center',
  },
  title: {
    ...Typography.headingSmall,
    color: Colors.text,
    textAlign: 'center',
  },
  errorText: {
    ...Typography.body,
    color: Colors.error,
    textAlign: 'center',
  },
  btn: {
    marginTop: Spacing.sm,
    backgroundColor: t.primary,
    borderRadius: 999,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  btnText: {
    ...Typography.bodyMedium,
    color: Colors.white,
    fontWeight: '700',
  },
});
