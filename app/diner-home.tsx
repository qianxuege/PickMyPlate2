import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { DinerTabScreenLayout } from '@/components/DinerTabScreenLayout';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { useGuardActiveRole } from '@/hooks/use-guard-active-role';
import { fetchDinerRecentScans, type DinerMenuScanListRow } from '@/lib/diner-menu-scans';
import { formatScannedAtPast } from '@/lib/format-scan-time';
import { writePendingMenuScan } from '@/lib/pending-menu-scan';
import { supabase } from '@/lib/supabase';
import { MenuUploadError, uploadMenuImageFromUri } from '@/lib/upload-menu-image';

const MAX_BYTES = 20 * 1024 * 1024;

/** Cap Home “recent scans” fetch so power users do not pull unbounded rows (see PR review). */
const RECENT_SCANS_HOME_LIMIT = 100;

/** Figma Diner Scan Menu */
const FIG = {
  text: '#101828',
  sub: '#4A5565',
  muted: '#6A7282',
  borderCard: '#F3F4F6',
  chevron: '#99A1AF',
  orangeStart: '#FF6B35',
  orangeEnd: '#FF5722',
} as const;

function scanDisplayTitle(row: DinerMenuScanListRow): string {
  const n = row.restaurant_name?.trim();
  return n && n.length > 0 ? n : 'Menu scan';
}

export default function DinerHomeScreen() {
  useGuardActiveRole('diner');
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [scansLoading, setScansLoading] = useState(true);
  const [recentScans, setRecentScans] = useState<DinerMenuScanListRow[]>([]);

  const loadRecentScans = useCallback(async () => {
    setScansLoading(true);
    try {
      const rows = await fetchDinerRecentScans(RECENT_SCANS_HOME_LIMIT);
      setRecentScans(rows);
    } catch {
      setRecentScans([]);
    } finally {
      setScansLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadRecentScans();
    }, [loadRecentScans])
  );

  const resolveFileSize = useCallback(async (uri: string, fallback?: number | null) => {
    if (typeof fallback === 'number' && fallback > 0) return fallback;
    try {
      const info = await FileSystem.getInfoAsync(uri);
      if (info.exists && 'size' in info && typeof info.size === 'number') {
        return info.size;
      }
    } catch {
      // ph:// or unsupported — rely on upload fetch size check
    }
    return 0;
  }, []);

  const startScan = useCallback(
    async (source: 'camera' | 'library') => {
      if (busy) return;
      setBusy(true);
      try {
        if (source === 'camera') {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== 'granted') {
            Alert.alert('Camera', 'Camera access is needed to scan a menu.');
            return;
          }
        } else {
          const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (status !== 'granted') {
            Alert.alert('Photos', 'Photo library access is needed to upload a menu image.');
            return;
          }
        }

        const picker =
          source === 'camera'
            ? await ImagePicker.launchCameraAsync({
                mediaTypes: ['images'],
                quality: 0.85,
              })
            : await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                quality: 0.85,
              });

        if (picker.canceled || !picker.assets?.[0]?.uri) {
          return;
        }

        const asset = picker.assets[0];
        const sizeBytes = await resolveFileSize(asset.uri, asset.fileSize ?? null);
        if (sizeBytes > MAX_BYTES) {
          Alert.alert('File too large', 'Please choose an image under 20 MB.');
          return;
        }

        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          Alert.alert('Sign in required', 'Please sign in to upload a menu.');
          return;
        }

        const { bucket, path } = await uploadMenuImageFromUri({
          localUri: asset.uri,
          fileSizeBytes: sizeBytes || asset.fileSize || 0,
          userId: user.id,
        });

        await writePendingMenuScan(bucket, path);

        if (__DEV__) {
          // eslint-disable-next-line no-console
          console.log('[menu-scan] upload ok', {
            bucket,
            path,
            encodedStoragePath: encodeURIComponent(path),
          });
        }

        router.push({
          pathname: '/diner-menu-processing',
          params: {
            bucket,
            storagePath: encodeURIComponent(path),
          },
        });
      } catch (e) {
        const msg = e instanceof MenuUploadError ? e.message : e instanceof Error ? e.message : 'Something went wrong.';
        Alert.alert('Upload failed', msg);
      } finally {
        setBusy(false);
      }
    },
    [busy, resolveFileSize, router]
  );

  const onOpenScan = useCallback(
    (scanId: string) => {
      router.push({
        pathname: '/diner-menu',
        params: { scanId },
      });
    },
    [router]
  );

  const cardShadow = Platform.select({
    ios: {
      shadowColor: '#E5E7EB',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.5,
      shadowRadius: 6,
    },
    android: { elevation: 3 },
    default: {},
  });

  return (
    <DinerTabScreenLayout activeTab="home">
      <Text style={styles.title}>Scan a menu</Text>
      <Text style={styles.subtitle}>Snap or upload to get personalized recommendations</Text>

      <View style={[styles.card, { borderColor: FIG.borderCard }, cardShadow]}>
        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={() => void startScan('camera')}
          style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
        >
          <LinearGradient
            colors={[FIG.orangeStart, '#FF6732', '#FF632E', '#FF5F2A', '#FF5B26', FIG.orangeEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.iconGradient}
          >
            <MaterialCommunityIcons name="camera-outline" size={24} color={Colors.white} />
          </LinearGradient>
          <View style={styles.rowText}>
            <Text style={styles.rowTitle}>Scan Menu</Text>
            <Text style={styles.rowSubtitle}>Use your camera</Text>
          </View>
          {busy ? (
            <ActivityIndicator color={FIG.orangeStart} />
          ) : (
            <MaterialCommunityIcons name="chevron-right" size={20} color={FIG.chevron} />
          )}
        </Pressable>

        <View style={styles.divider} />

        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={() => void startScan('library')}
          style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
        >
          <LinearGradient
            colors={[FIG.orangeStart, '#FF6732', '#FF632E', '#FF5F2A', '#FF5B26', FIG.orangeEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.iconGradient}
          >
            <MaterialCommunityIcons name="image-outline" size={24} color={Colors.white} />
          </LinearGradient>
          <View style={styles.rowText}>
            <Text style={styles.rowTitle}>Upload from Photos</Text>
            <Text style={styles.rowSubtitle}>Choose an image</Text>
          </View>
          {busy ? (
            <ActivityIndicator color={FIG.orangeStart} />
          ) : (
            <MaterialCommunityIcons name="chevron-right" size={20} color={FIG.chevron} />
          )}
        </Pressable>

        <View style={styles.divider} />

        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={() => router.push('/diner-partner-qr-scan')}
          style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
        >
          <LinearGradient
            colors={[FIG.orangeStart, '#FF6732', '#FF632E', '#FF5F2A', '#FF5B26', FIG.orangeEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.iconGradient}
          >
            <MaterialCommunityIcons name="qrcode-scan" size={24} color={Colors.white} />
          </LinearGradient>
          <View style={styles.rowText}>
            <Text style={styles.rowTitle}>Scan Partner QR</Text>
            <Text style={styles.rowSubtitle}>Open restaurant digital menu instantly</Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={20} color={FIG.chevron} />
        </Pressable>
      </View>

      <Text style={styles.sectionTitle}>Recent scans</Text>

      {scansLoading ? (
        <View style={styles.scansLoading}>
          <ActivityIndicator color={FIG.orangeStart} />
        </View>
      ) : recentScans.length === 0 ? (
        <Text style={styles.emptyScans}>No scans yet — upload a menu to see it here.</Text>
      ) : (
        recentScans.map((item) => (
          <Pressable
            key={item.id}
            accessibilityRole="button"
            onPress={() => onOpenScan(item.id)}
            style={({ pressed }) => [styles.recentCard, { borderColor: FIG.borderCard }, cardShadow, pressed && styles.recentCardPressed]}
          >
            <LinearGradient
              colors={['#FFEDD4', '#FFF7ED']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.recentIconGradient}
            >
              <MaterialCommunityIcons name="silverware-fork-knife" size={20} color={FIG.orangeStart} />
            </LinearGradient>
            <View style={styles.recentText}>
              <Text style={styles.recentTitle} numberOfLines={1}>
                {scanDisplayTitle(item)}
              </Text>
              <Text style={styles.recentSubtitle}>{formatScannedAtPast(item.scanned_at)}</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color={FIG.chevron} />
          </Pressable>
        ))
      )}
    </DinerTabScreenLayout>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 28,
    lineHeight: 35,
    fontWeight: '700',
    letterSpacing: 0.38,
    color: FIG.text,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 24,
    letterSpacing: -0.234,
    color: FIG.sub,
    marginBottom: Spacing.xxl,
    maxWidth: 320,
  },
  card: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: Spacing.xxl,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    gap: 16,
    minHeight: 88,
  },
  rowPressed: {
    opacity: 0.92,
  },
  iconGradient: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#FFD6A8',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 6,
      },
      android: { elevation: 4 },
      default: {},
    }),
  },
  rowText: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '600',
    letterSpacing: -0.312,
    color: FIG.text,
  },
  rowSubtitle: {
    marginTop: 2,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '500',
    letterSpacing: -0.076,
    color: FIG.muted,
  },
  divider: {
    height: 1,
    backgroundColor: FIG.borderCard,
  },
  sectionTitle: {
    fontSize: 17,
    lineHeight: 26,
    fontWeight: '700',
    letterSpacing: -0.43,
    color: FIG.text,
    marginBottom: 12,
  },
  scansLoading: {
    paddingVertical: Spacing.xl,
    alignItems: 'center',
  },
  emptyScans: {
    ...Typography.body,
    color: FIG.muted,
    marginBottom: Spacing.base,
  },
  recentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 18,
    gap: 12,
    marginBottom: 12,
    minHeight: 76,
  },
  recentCardPressed: {
    opacity: 0.9,
  },
  recentIconGradient: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recentText: {
    flex: 1,
    minWidth: 0,
  },
  recentTitle: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
    letterSpacing: -0.234,
    color: FIG.text,
  },
  recentSubtitle: {
    marginTop: 2,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '500',
    letterSpacing: -0.076,
    color: FIG.muted,
  },
});
