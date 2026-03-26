import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { RestaurantTabScreenLayout } from '@/components/RestaurantTabScreenLayout';
import { restaurantRoleTheme } from '@/constants/role-theme';
import { BorderRadius, Colors, Spacing, Typography } from '@/constants/theme';
import { useGuardActiveRole } from '@/hooks/use-guard-active-role';
import { fetchRestaurantRecentUploads, type RestaurantMenuScanListRow } from '@/lib/restaurant-menu-scans';
import { formatScannedAtPast } from '@/lib/format-scan-time';
import { createBlankRestaurantMenu } from '@/lib/restaurant-create-blank-menu';
import { writePendingRestaurantMenuScan } from '@/lib/pending-restaurant-menu-scan';
import { supabase } from '@/lib/supabase';
import { MenuUploadError, uploadMenuImageFromUri } from '@/lib/upload-menu-image';

const t = restaurantRoleTheme;
const MAX_BYTES = 20 * 1024 * 1024;

/** Restaurant Upload Menu (images-only). */
export default function RestaurantHomeScreen() {
  useGuardActiveRole('restaurant');
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [scansLoading, setScansLoading] = useState(true);
  const [recentScans, setRecentScans] = useState<RestaurantMenuScanListRow[]>([]);

  const loadRecent = useCallback(async () => {
    setScansLoading(true);
    try {
      const rows = await fetchRestaurantRecentUploads(10);
      setRecentScans(rows);
    } catch {
      setRecentScans([]);
    } finally {
      setScansLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadRecent();
    }, [loadRecent]),
  );

  const resolveFileSize = useCallback(async (uri: string, fallback?: number | null) => {
    if (typeof fallback === 'number' && fallback > 0) return fallback;
    try {
      const info = await FileSystem.getInfoAsync(uri);
      if (info.exists && 'size' in info && typeof info.size === 'number') {
        return info.size;
      }
    } catch {
      // ph:// or unsupported — rely on picker/file metadata
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

        if (picker.canceled || !picker.assets?.[0]?.uri) return;

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

        await writePendingRestaurantMenuScan(bucket, path);

        router.push({
          pathname: '/restaurant-menu-processing',
          params: {
            bucket,
            storagePath: encodeURIComponent(path),
          },
        });
      } catch (e) {
        const msg =
          e instanceof MenuUploadError ? e.message : e instanceof Error ? e.message : 'Something went wrong.';
        Alert.alert('Upload failed', msg);
      } finally {
        setBusy(false);
      }
    },
    [busy, resolveFileSize, router],
  );

  const createBlank = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      const result = await createBlankRestaurantMenu();
      if (!result.ok) {
        Alert.alert('Could not create menu', result.error);
        return;
      }
      router.push({ pathname: '/restaurant-review-menu', params: { scanId: result.scanId } });
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }, [busy, router]);

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
    <RestaurantTabScreenLayout activeTab="home">
      <Text style={styles.title}>Create your menu</Text>
      <Text style={styles.subtitle}>Scan a photo or start from scratch</Text>

      <View style={[styles.card, { borderColor: t.cardAccentBorder }, cardShadow]}>
        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={() => void startScan('camera')}
          style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
        >
          <View style={styles.iconBox}>
            <MaterialCommunityIcons name="camera-outline" size={24} color={Colors.white} />
          </View>
          <View style={styles.rowText}>
            <Text style={styles.rowTitle}>Take photo</Text>
            <Text style={styles.rowSubtitle}>Scan your menu</Text>
          </View>
          {busy ? (
            <ActivityIndicator color={t.primaryDark} />
          ) : (
            <MaterialCommunityIcons name="chevron-right" size={20} color={Colors.textSecondary} />
          )}
        </Pressable>

        <View style={styles.divider} />

        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={() => void startScan('library')}
          style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
        >
          <View style={styles.iconBox}>
            <MaterialCommunityIcons name="image-outline" size={24} color={Colors.white} />
          </View>
          <View style={styles.rowText}>
            <Text style={styles.rowTitle}>Upload menu</Text>
            <Text style={styles.rowSubtitle}>Choose an image</Text>
          </View>
          {busy ? (
            <ActivityIndicator color={t.primaryDark} />
          ) : (
            <MaterialCommunityIcons name="chevron-right" size={20} color={Colors.textSecondary} />
          )}
        </Pressable>

        <View style={styles.divider} />

        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={() => void createBlank()}
          style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
        >
          <View style={styles.iconBox}>
            <MaterialCommunityIcons name="text-box-plus-outline" size={24} color={Colors.white} />
          </View>
          <View style={styles.rowText}>
            <Text style={styles.rowTitle}>Create blank menu</Text>
            <Text style={styles.rowSubtitle}>Start with an empty menu</Text>
          </View>
          {busy ? (
            <ActivityIndicator color={t.primaryDark} />
          ) : (
            <MaterialCommunityIcons name="chevron-right" size={20} color={Colors.textSecondary} />
          )}
        </Pressable>
      </View>

      <Text style={styles.sectionTitle}>Recent uploads</Text>
      {scansLoading ? (
        <View style={styles.scansLoading}>
          <ActivityIndicator color={t.primary} />
        </View>
      ) : recentScans.length === 0 ? (
        <Text style={styles.emptyText}>No uploads yet — upload a menu to see it here.</Text>
      ) : (
        recentScans.map((item) => (
          <Pressable
            key={item.id}
            accessibilityRole="button"
            onPress={() => router.push({ pathname: '/restaurant-review-menu', params: { scanId: item.id } })}
            style={({ pressed }) => [
              styles.recentCard,
              { borderColor: t.cardAccentBorder },
              pressed && styles.rowPressed,
            ]}
          >
            <View style={[styles.recentIcon, { backgroundColor: t.primaryLight }]}>
              <MaterialCommunityIcons name="silverware-fork-knife" size={22} color={t.primaryDark} />
            </View>
            <View style={styles.rowText}>
              <Text style={styles.recentTitle} numberOfLines={1}>
                {item.restaurant_name?.trim() || 'Menu'}
              </Text>
              <Text style={styles.recentSubtitle}>{formatScannedAtPast(item.last_activity_at)}</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={24} color={Colors.textSecondary} />
          </Pressable>
        ))
      )}
    </RestaurantTabScreenLayout>
  );
}

const styles = StyleSheet.create({
  title: {
    ...Typography.heading,
    fontSize: 28,
    lineHeight: 36,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginBottom: Spacing.xxl,
    maxWidth: 340,
  },
  card: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    marginBottom: Spacing.xxl,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.base,
    gap: Spacing.base,
  },
  rowPressed: {
    opacity: 0.85,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.base,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.primary,
  },
  rowText: {
    flex: 1,
  },
  rowTitle: {
    ...Typography.bodyMedium,
    fontSize: 17,
    color: Colors.text,
  },
  rowSubtitle: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.borderLight,
  },
  sectionTitle: {
    ...Typography.headingSmall,
    color: Colors.text,
    marginBottom: Spacing.base,
  },
  scansLoading: { paddingVertical: Spacing.xl, alignItems: 'center' },
  emptyText: { ...Typography.body, color: Colors.textSecondary, marginBottom: Spacing.base },
  recentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.base,
    gap: Spacing.base,
    marginBottom: Spacing.base,
  },
  recentIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recentTitle: {
    ...Typography.bodyMedium,
    color: Colors.text,
    flex: 1,
  },
  recentSubtitle: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },
});
