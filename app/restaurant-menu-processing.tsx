import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RestaurantMenuProcessingIllustration } from '@/components/RestaurantMenuProcessingIllustration';
import { Colors, Spacing } from '@/constants/theme';
import { restaurantRoleTheme } from '@/constants/role-theme';
import { useGuardActiveRole } from '@/hooks/use-guard-active-role';

import { fetchRestaurantIdForOwner } from '@/lib/restaurant-setup';
import { buildRestaurantMenuParseUserPreferences } from '@/lib/restaurant-menu-parse-preferences';
import { parsedMenuHasItems, validateParsedMenu } from '@/lib/menu-scan-schema';
import { persistRestaurantMenuDraft } from '@/lib/restaurant-persist-menu';
import { requestMenuParse } from '@/lib/menu-parse-api';
import { readPendingRestaurantMenuScan, clearPendingRestaurantMenuScan } from '@/lib/pending-restaurant-menu-scan';
import { MENU_UPLOAD_BUCKET } from '@/lib/upload-menu-image';

const STATUS_MESSAGES = ['Reading menu…', 'Extracting items…', 'Reading prices…', 'Almost done…'];

const t = restaurantRoleTheme;

export default function RestaurantMenuProcessingScreen() {
  useGuardActiveRole('restaurant');
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ bucket?: string; storagePath?: string | string[] }>();

  const bucketFromParams = typeof params.bucket === 'string' ? params.bucket : MENU_UPLOAD_BUCKET;
  const pathParam = params.storagePath;

  const [resolvedBucket, setResolvedBucket] = useState(bucketFromParams);
  const [resolvedPath, setResolvedPath] = useState('');

  const storagePathFromParams = useMemo(() => {
    const raw = Array.isArray(pathParam) ? pathParam[0] : pathParam;
    if (!raw || typeof raw !== 'string') return '';
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  }, [pathParam]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (__DEV__) {
        console.log('[restaurant-menu-scan] processing mount', {
          rawParams: params,
          pathParam,
          storagePathFromParams,
          bucketFromParams,
        });
      }

      if (storagePathFromParams.trim()) {
        if (!cancelled) {
          setResolvedPath(storagePathFromParams);
          setResolvedBucket(bucketFromParams);
        }
        return;
      }

      const pending = await readPendingRestaurantMenuScan();
      if (!cancelled && pending?.path?.trim()) {
        setResolvedPath(pending.path);
        setResolvedBucket(pending.bucket || MENU_UPLOAD_BUCKET);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [bucketFromParams, pathParam, storagePathFromParams, params]);

  const bucket = resolvedBucket;
  const storagePath = resolvedPath;
  const [statusIndex, setStatusIndex] = useState(0);
  const progressAnim = useRef(new Animated.Value(0.08)).current;

  useEffect(() => {
    const id = setInterval(() => {
      setStatusIndex((i) => (i + 1) % STATUS_MESSAGES.length);
    }, 2200);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(progressAnim, {
          toValue: 0.92,
          duration: 1400,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: false,
        }),
        Animated.timing(progressAnim, {
          toValue: 0.12,
          duration: 1400,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: false,
        }),
      ]),
    );
    loop.start();
    return () => {
      loop.stop();
    };
  }, [progressAnim]);

  const failAndHome = useCallback(
    (title: string, message: string) => {
      Alert.alert(title, message, [
        {
          text: 'OK',
          onPress: () => router.replace('/restaurant-home'),
        },
      ]);
    },
    [router],
  );

  const runPipeline = useCallback(async () => {
    if (!storagePath.trim()) {
      failAndHome('Missing file', 'No upload path. Return home and try again.');
      return;
    }

    const { restaurantId, error: rErr } = await fetchRestaurantIdForOwner();
    if (!restaurantId || rErr) {
      failAndHome('Restaurant required', 'Please complete restaurant setup before uploading a menu.');
      return;
    }

    const userPreferences = buildRestaurantMenuParseUserPreferences();
    const api = await requestMenuParse({
      storageBucket: bucket,
      storagePath,
      userPreferences,
    });

    if (!api.ok) {
      if (api.error === 'not_a_menu') {
        failAndHome('Not a menu', 'Please upload a menu photo.');
      } else {
        failAndHome('Could not parse menu', api.error);
      }
      return;
    }

    if (api.debug?.mock) {
      failAndHome(
        'Menu parser is in mock mode',
        'The backend is returning demo menu data instead of your scanned menu. Disable MOCK_MENU_PARSE in backend/.env before testing real scans.',
      );
      return;
    }

    const validated = validateParsedMenu(api.menu);
    if (!validated.ok) {
      failAndHome('Invalid menu data', validated.error);
      return;
    }

    if (!parsedMenuHasItems(validated.value)) {
      failAndHome('Empty menu', 'No dishes were found. Try a clearer photo.');
      return;
    }

    const persisted = await persistRestaurantMenuDraft(validated.value, restaurantId);
    if (!persisted.ok) {
      failAndHome('Save failed', persisted.error);
      return;
    }

    await clearPendingRestaurantMenuScan();

    router.replace({
      pathname: '/restaurant-review-menu',
      params: { scanId: persisted.scanId },
    });
  }, [bucket, failAndHome, storagePath, router]);

  // Capture latest runPipeline via ref
  const runPipelineRef = useRef(runPipeline);
  runPipelineRef.current = runPipeline;

  // Wait until route params include `storagePath` (avoid first-paint empty params).
  useEffect(() => {
    if (!storagePath.trim()) return;
    let cancelled = false;
    void runPipelineRef.current().catch((e) => {
      if (!cancelled) {
        failAndHome('Error', e instanceof Error ? e.message : 'Something went wrong.');
      }
    });
    return () => {
      cancelled = true;
    };
  }, [failAndHome, storagePath]);

  const statusLabel = STATUS_MESSAGES[statusIndex];

  return (
    <View style={[styles.root, { paddingTop: insets.top + 32, backgroundColor: Colors.background }]}>
      <View style={styles.illustration}>
        <RestaurantMenuProcessingIllustration />
      </View>

      <Text style={styles.title}>Processing your menu…</Text>
      <Text style={styles.subtitle}>{"We're extracting your menu items using AI"}</Text>

      <View style={styles.progressTrack}>
        <Animated.View
          style={[
            styles.progressFill,
            {
              width: progressAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', '100%'],
              }),
            },
          ]}
        />
      </View>

      <Text style={[styles.status, { color: t.primary }]}>{statusLabel}</Text>
      <ActivityIndicator style={{ marginTop: Spacing.base }} color={t.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  illustration: {
    alignItems: 'center',
    width: 216,
    height: 286,
    marginTop: 28,
    marginBottom: 28,
  },
  progressTrack: {
    width: 240,
    height: 6,
    borderRadius: 9999,
    backgroundColor: '#E5E7EB',
    overflow: 'hidden',
    marginBottom: Spacing.base,
  },
  progressFill: {
    height: '100%',
    borderRadius: 9999,
    backgroundColor: t.primary,
  },
  title: {
    fontSize: 28,
    lineHeight: 42,
    fontWeight: '700',
    letterSpacing: 0.3828,
    textAlign: 'center',
    color: '#101828',
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '400',
    letterSpacing: -0.2344,
    textAlign: 'center',
    color: '#4A5565',
    marginBottom: Spacing.xl,
    maxWidth: 280,
  },
  status: {
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '500',
    letterSpacing: -0.1504,
  },
});

