import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    Easing,
    Image,
    Platform,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, Spacing } from '@/constants/theme';
import { fetchDinerPreferences } from '@/lib/diner-preferences';
import { requestMenuParse } from '@/lib/menu-parse-api';
import { buildMenuParseUserPreferences } from '@/lib/menu-preferences-payload';
import { parsedMenuHasItems, validateParsedMenu } from '@/lib/menu-scan-schema';
import { clearPendingMenuScan, readPendingMenuScan } from '@/lib/pending-menu-scan';
import { persistParsedMenu } from '@/lib/persist-parsed-menu';
import { supabase } from '@/lib/supabase';
import { MENU_UPLOAD_BUCKET } from '@/lib/upload-menu-image';

const STATUS_MESSAGES = [
  'Reading menu…',
  'Extracting items…',
  'Reading prices…',
  'Almost done…',
];

export default function DinerMenuProcessingScreen() {
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

  /** Route params OR AsyncStorage fallback (see pending-menu-scan). */
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.log('[menu-scan] processing mount', {
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

      const pending = await readPendingMenuScan();
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.log('[menu-scan] route params empty; AsyncStorage pending =', pending);
      }
      if (!cancelled && pending?.path?.trim()) {
        setResolvedPath(pending.path);
        setResolvedBucket(pending.bucket || MENU_UPLOAD_BUCKET);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [bucketFromParams, pathParam, storagePathFromParams]);

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
      ])
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
          onPress: () => router.replace('/diner-home'),
        },
      ]);
    },
    [router]
  );

  const runPipeline = useCallback(async () => {
    if (!storagePath.trim()) {
      failAndHome('Missing file', 'No upload path. Return home and try again.');
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      failAndHome('Sign in required', 'Please sign in and try again.');
      return;
    }

    let prefsPayload: Record<string, unknown>;
    try {
      const snap = await fetchDinerPreferences();
      prefsPayload = buildMenuParseUserPreferences(snap);
    } catch {
      prefsPayload = buildMenuParseUserPreferences(null);
    }

    const api = await requestMenuParse({
      storageBucket: bucket,
      storagePath,
      userPreferences: prefsPayload,
    });

    if (!api.ok) {
      failAndHome('Could not parse menu', api.error);
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

    const persisted = await persistParsedMenu(validated.value, user.id);
    if (!persisted.ok) {
      failAndHome('Save failed', persisted.error);
      return;
    }

    await clearPendingMenuScan();

    router.replace({
      pathname: '/diner-menu',
      params: { scanId: persisted.scanId },
    });
  }, [bucket, failAndHome, storagePath, router]);

  const runPipelineRef = useRef(runPipeline);
  runPipelineRef.current = runPipeline;

  // Wait until route params include `storagePath` (avoid reserved name `path` + first-paint empty params).
  useEffect(() => {
    if (!storagePath.trim()) {
      return;
    }
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

  useEffect(() => {
    if (storagePath.trim()) return;
    const t = setTimeout(() => {
      if (!storagePath.trim()) {
        failAndHome('Missing file', 'No upload path. Return home and try again.');
      }
    }, 3000);
    return () => clearTimeout(t);
  }, [storagePath, failAndHome]);

  const statusLabel = STATUS_MESSAGES[statusIndex];

  return (
    <View style={[styles.root, { paddingTop: insets.top + 32, backgroundColor: Colors.background }]}>
      <View style={styles.illustration}>
        <Image
          source={require('../assets/diner-processing-illustration.png')}
          style={styles.illustrationImage}
          resizeMode="contain"
        />
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
        >
          <LinearGradient
            colors={['#FF6B35', '#FF6F3A', '#FF733E', '#FF7742', '#FF7A47', '#FF7E4B', '#FF824F', '#FF8552', '#FF8956', '#FF8C5A']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.progressGradient}
          />
        </Animated.View>
      </View>

      <Text style={styles.status}>{statusLabel}</Text>

      <ActivityIndicator style={{ marginTop: Spacing.base }} color="#FF6B35" />
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
    marginTop: 28,
    marginBottom: 28,
  },
  illustrationImage: {
    width: 216,
    height: 286,
  },
  iconSquare: {
    width: 128,
    height: 128,
    borderRadius: 24,
    opacity: 0.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  cameraIconWrap: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraBody: {
    width: 42,
    height: 30,
    borderRadius: 8,
    borderWidth: 4,
    borderColor: '#FF6B35',
  },
  cameraLens: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 9999,
    borderWidth: 4,
    borderColor: '#FF6B35',
  },
  linesRow: {
    width: 192,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  lines: {
    width: 80,
    gap: 4,
  },
  line: {
    height: 6,
    borderRadius: 9999,
  },
  line1: {
    width: 60,
    backgroundColor: '#FF6B35',
    opacity: 0.5,
  },
  line2: {
    width: 80,
    backgroundColor: '#FFB86A',
    opacity: 0.55,
  },
  line3: {
    width: 70,
    backgroundColor: '#FFD6A8',
    opacity: 0.68,
  },
  listCard: {
    width: 192,
    height: 84,
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#FFEDD4',
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 2,
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    ...Platform.select({ android: { elevation: 3 }, default: {} }),
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bullet: {
    width: 8,
    height: 8,
    borderRadius: 9999,
    backgroundColor: '#FF6B35',
  },
  listLine: {
    flex: 1,
    height: 8,
    borderRadius: 9999,
    backgroundColor: '#E5E7EB',
    opacity: 0.5,
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
  },
  progressGradient: {
    width: '100%',
    height: '100%',
  },
  status: {
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '500',
    letterSpacing: -0.1504,
    color: '#FF6B35',
  },
});
