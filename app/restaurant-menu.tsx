import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { ActivityIndicator, Alert, Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { HighlightDishBadges } from '@/components/HighlightDishBadges';
import { restaurantRoleTheme } from '@/constants/role-theme';
import { RestaurantTabScreenLayout } from '@/components/RestaurantTabScreenLayout';
import { BorderRadius, Colors, Spacing, Typography } from '@/constants/theme';
import { useGuardActiveRole } from '@/hooks/use-guard-active-role';
import { formatScannedAtPast } from '@/lib/format-scan-time';
import { buildPartnerMenuLink, buildPartnerMenuQrUrl, getOrCreateOwnerPartnerMenuToken } from '@/lib/partner-menu-access';
import { fetchRestaurantAllUploads, type RestaurantMenuScanListRow } from '@/lib/restaurant-menu-scans';
import { supabase } from '@/lib/supabase';
import { fetchRestaurantMenuForScan } from '@/lib/restaurant-fetch-menu-for-scan';

const t = restaurantRoleTheme;

type DishRow = {
  id: string;
  name: string;
  description: string | null;
  price_display: string | null;
  price_amount: number | null;
  image_url: string | null;
  spice_level: number;
  tags: string[];
  is_featured: boolean;
  is_new: boolean;
};

export default function RestaurantMenuScreen() {
  useGuardActiveRole('restaurant');
  const router = useRouter();
  // --- uploads list ---
  const [uploadsLoading, setUploadsLoading] = useState(true);
  const [allUploads, setAllUploads] = useState<RestaurantMenuScanListRow[]>([]);
  const [publishedScanId, setPublishedScanId] = useState<string | null>(null);

  // --- selected menu detail ---
  const [selectedScanId, setSelectedScanId] = useState<string | null>(null);
  const [menuLoading, setMenuLoading] = useState(false);
  const [menuTitle, setMenuTitle] = useState<string>('My Menus');
  const [dishes, setDishes] = useState<DishRow[]>([]);

  // --- QR ---
  const [qrBusy, setQrBusy] = useState(false);
  const [qrVisible, setQrVisible] = useState(false);
  const [partnerLink, setPartnerLink] = useState<string | null>(null);
  const [partnerQrUrl, setPartnerQrUrl] = useState<string | null>(null);

  // Load the owner's uploads + which scan is currently published.
  const loadUploads = useCallback(async () => {
    setUploadsLoading(true);
    try {
      const [uploads, { data: restRow }] = await Promise.all([
        fetchRestaurantAllUploads(100),
        supabase
          .from('restaurants')
          .select('published_menu_scan_id')
          .eq(
            'owner_id',
            (await supabase.auth.getUser()).data?.user?.id ?? '',
          )
          .maybeSingle(),
      ]);

      const pubId = restRow?.published_menu_scan_id ? String(restRow.published_menu_scan_id) : null;
      setAllUploads(uploads);
      setPublishedScanId(pubId);

      // Auto-select the published scan (or first upload) if nothing selected yet.
      setSelectedScanId((prev) => {
        if (prev && uploads.some((u) => u.id === prev)) return prev;
        return pubId ?? uploads[0]?.id ?? null;
      });
    } catch {
      // leave previous state on error
    } finally {
      setUploadsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadUploads();
    }, [loadUploads]),
  );

  // Load dishes for the selected scan.
  useEffect(() => {
    let cancelled = false;
    if (!selectedScanId) {
      setMenuTitle('My Menus');
      setDishes([]);
      return;
    }
    setMenuLoading(true);
    void (async () => {
      try {
        const result = await fetchRestaurantMenuForScan(selectedScanId);
        if (cancelled) return;
        if (!result.ok) {
          setMenuTitle('Menu');
          setDishes([]);
          return;
        }
        setMenuTitle(result.scan.restaurant_name?.trim() || 'Menu');
        setDishes(
          result.dishes.map((d) => ({
            id: d.id,
            name: d.name,
            description: d.description,
            price_display: d.price_display,
            price_amount: d.price_amount,
            image_url: d.image_url,
            spice_level: d.spice_level,
            tags: d.tags,
            is_featured: d.is_featured,
            is_new: d.is_new,
          })),
        );
      } finally {
        if (!cancelled) setMenuLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedScanId]);

  const formatDishPrice = (dish: DishRow): string | null => {
    if (dish.price_display?.trim()) return dish.price_display.trim();
    if (dish.price_amount == null) return null;
    return String(dish.price_amount);
  };

  // --- QR helpers ---
  const openQrModal = useCallback(async () => {
    setQrBusy(true);
    try {
      const res = await getOrCreateOwnerPartnerMenuToken();
      if (!res.ok) {
        Alert.alert('Partner QR', res.error);
        return;
      }
      setPartnerLink(buildPartnerMenuLink(res.token));
      setPartnerQrUrl(buildPartnerMenuQrUrl(res.token));
      setQrVisible(true);
    } finally {
      setQrBusy(false);
    }
  }, []);

  const downloadQrToCache = useCallback(async (): Promise<string | null> => {
    if (!partnerQrUrl || !FileSystem.cacheDirectory) return null;
    const cachePath = `${FileSystem.cacheDirectory}partner-menu-qr.png`;
    const out = await FileSystem.downloadAsync(partnerQrUrl, cachePath);
    return out.uri;
  }, [partnerQrUrl]);

  const onShareQr = useCallback(async () => {
    try {
      const uri = await downloadQrToCache();
      if (!uri) return;
      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert('Share', 'Share is not available on this device.');
        return;
      }
      await Sharing.shareAsync(uri, { dialogTitle: 'Partner Menu QR' });
    } catch (e) {
      Alert.alert('Share failed', e instanceof Error ? e.message : 'Could not share QR.');
    }
  }, [downloadQrToCache]);

  const onSaveQrToPhotos = useCallback(async () => {
    try {
      const uri = await downloadQrToCache();
      if (!uri) return;
      const perm = await MediaLibrary.requestPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Photos permission', 'Allow Photos access to save the QR code.');
        return;
      }
      await MediaLibrary.saveToLibraryAsync(uri);
      Alert.alert('Saved', 'QR code saved to your photo library.');
    } catch (e) {
      Alert.alert('Save failed', e instanceof Error ? e.message : 'Could not save QR.');
    }
  }, [downloadQrToCache]);

  return (
    <RestaurantTabScreenLayout activeTab="menu">
      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {selectedScanId ? menuTitle : 'My Menus'}
        </Text>
        <View style={styles.actionsRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Generate partner QR"
            onPress={() => void openQrModal()}
            disabled={qrBusy || !publishedScanId}
            style={({ pressed }) => [
              styles.iconBtn,
              (qrBusy || !publishedScanId) && styles.iconBtnDisabled,
              pressed && { opacity: 0.9 },
            ]}
          >
            <MaterialCommunityIcons name="qrcode-scan" size={18} color={Colors.white} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Upload new menu"
            onPress={() => router.push('/restaurant-home')}
            style={({ pressed }) => [styles.plusBtn, pressed && { opacity: 0.9 }]}
          >
            <MaterialCommunityIcons name="plus" size={18} color={Colors.white} />
          </Pressable>
        </View>
      </View>

      {uploadsLoading ? (
        <View style={styles.centerBlock}>
          <ActivityIndicator color={t.primary} />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* ── All uploaded menus list ── */}
          <Text style={styles.sectionTitle}>All uploaded menus</Text>

          {allUploads.length === 0 ? (
            <View style={styles.emptyCard}>
              <MaterialCommunityIcons name="tray-arrow-up" size={32} color={t.primary} style={{ marginBottom: 8 }} />
              <Text style={styles.emptyTitle}>No menus yet</Text>
              <Text style={styles.emptySubtitle}>Upload your first menu from the Home tab.</Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push('/restaurant-home')}
                style={({ pressed }) => [styles.uploadBtn, pressed && { opacity: 0.85 }]}
              >
                <Text style={styles.uploadBtnText}>Upload menu</Text>
              </Pressable>
            </View>
          ) : (
            allUploads.map((scan) => {
              const isSelected = scan.id === selectedScanId;
              const isPublished = scan.id === publishedScanId;
              return (
                <Pressable
                  key={scan.id}
                  accessibilityRole="button"
                  onPress={() => setSelectedScanId(scan.id)}
                  style={({ pressed }) => [
                    styles.scanCard,
                    isSelected && styles.scanCardActive,
                    pressed && { opacity: 0.88 },
                  ]}
                >
                  <View style={[styles.scanIcon, isSelected && { backgroundColor: Colors.white }]}>
                    <MaterialCommunityIcons name="silverware-fork-knife" size={22} color={t.primaryDark} />
                  </View>
                  <View style={styles.scanTextCol}>
                    <Text style={styles.scanName} numberOfLines={1}>
                      {scan.restaurant_name?.trim() || 'Menu'}
                    </Text>
                    <Text style={styles.scanTime}>{formatScannedAtPast(scan.last_activity_at)}</Text>
                  </View>
                  {isPublished ? (
                    <View style={styles.publishedBadge}>
                      <Text style={styles.publishedBadgeText}>Live</Text>
                    </View>
                  ) : null}
                  <MaterialCommunityIcons name="chevron-right" size={20} color={Colors.textSecondary} />
                </Pressable>
              );
            })
          )}

          {/* ── Selected menu detail ── */}
          {selectedScanId ? (
            <>
              <View style={styles.sectionDivider} />
              <View style={styles.menuDetailHeader}>
                <Text style={styles.sectionTitle}>{menuTitle}</Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.push({ pathname: '/restaurant-review-menu', params: { scanId: selectedScanId } })}
                  style={({ pressed }) => [styles.editBtn, pressed && { opacity: 0.8 }]}
                >
                  <MaterialCommunityIcons name="pencil-outline" size={14} color={t.primaryDark} />
                  <Text style={styles.editBtnText}>Edit</Text>
                </Pressable>
              </View>

              {selectedScanId === publishedScanId ? (
                <View style={styles.liveBar}>
                  <MaterialCommunityIcons name="check-circle" size={14} color={t.primaryDark} />
                  <Text style={styles.liveBarText}>This menu is currently live for customers</Text>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => void openQrModal()}
                    disabled={qrBusy}
                    style={({ pressed }) => [styles.qrInlineBtn, pressed && { opacity: 0.85 }]}
                  >
                    <MaterialCommunityIcons name="qrcode" size={14} color={Colors.white} />
                    <Text style={styles.qrInlineBtnText}>QR Code</Text>
                  </Pressable>
                </View>
              ) : null}

              {menuLoading ? (
                <View style={[styles.centerBlock, { minHeight: 80 }]}>
                  <ActivityIndicator color={t.primary} />
                </View>
              ) : dishes.length === 0 ? (
                <Text style={styles.emptySubtitle}>No dishes in this menu yet.</Text>
              ) : (
                dishes.map((dish) => {
                  const price = formatDishPrice(dish);
                  return (
                    <Pressable
                      key={dish.id}
                      accessibilityRole="button"
                      onPress={() =>
                        router.push({ pathname: '/restaurant-owner-dish/[dishId]', params: { dishId: dish.id } })
                      }
                      style={({ pressed }) => [styles.dishCard, pressed && { opacity: 0.88 }]}
                    >
                      <View style={styles.dishRow}>
                        {dish.image_url ? (
                          <Image source={{ uri: dish.image_url }} style={styles.dishImage} />
                        ) : (
                          <View style={styles.dishImagePlaceholder}>
                            <MaterialCommunityIcons name="silverware-fork-knife" size={20} color={Colors.textPlaceholder} />
                          </View>
                        )}
                        <View style={styles.dishTextCol}>
                          <View style={styles.dishNameRow}>
                            <Text style={styles.dishName} numberOfLines={1}>
                              {dish.name}
                            </Text>
                            {price ? <Text style={styles.dishPrice}>{price}</Text> : null}
                          </View>
                          {dish.description ? (
                            <Text style={styles.dishDesc} numberOfLines={2}>
                              {dish.description}
                            </Text>
                          ) : null}
                          <HighlightDishBadges is_featured={dish.is_featured} is_new={dish.is_new} />
                        </View>
                      </View>
                    </Pressable>
                  );
                })
              )}
            </>
          ) : null}
        </ScrollView>
      )}

      {/* QR Modal */}
      <Modal visible={qrVisible} transparent animationType="fade" onRequestClose={() => setQrVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Partner Menu QR</Text>
            {partnerQrUrl ? <Image source={{ uri: partnerQrUrl }} style={styles.qrPreview} /> : null}
            <Text style={styles.modalHint}>Scan this to open your published digital menu.</Text>
            {partnerLink ? (
              <Text style={styles.linkText} numberOfLines={3}>
                {partnerLink}
              </Text>
            ) : null}
            <View style={styles.modalActions}>
              <Pressable style={styles.modalActionBtn} onPress={() => void onShareQr()}>
                <Text style={styles.modalActionText}>Share</Text>
              </Pressable>
              <Pressable style={styles.modalActionBtn} onPress={() => void onSaveQrToPhotos()}>
                <Text style={styles.modalActionText}>Save PNG</Text>
              </Pressable>
            </View>
            <Pressable style={styles.modalCloseBtn} onPress={() => setQrVisible(false)}>
              <Text style={styles.modalCloseText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </RestaurantTabScreenLayout>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerTitle: { ...Typography.headingSmall, fontWeight: '800', color: Colors.text, flex: 1, marginRight: 8 },
  actionsRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    backgroundColor: t.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnDisabled: { opacity: 0.45 },
  plusBtn: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    backgroundColor: t.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerBlock: { justifyContent: 'center', alignItems: 'center', paddingVertical: 40 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 120, gap: 10 },

  sectionTitle: { ...Typography.headingSmall, fontSize: 15, fontWeight: '700', color: Colors.text, marginTop: 4 },
  sectionDivider: { height: 1, backgroundColor: '#E5E7EB', marginVertical: 6 },
  menuDetailHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    backgroundColor: t.primaryLight,
  },
  editBtnText: { fontSize: 13, fontWeight: '600', color: t.primaryDark },

  // Scan list cards (same style as home "Recent uploads")
  scanCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.base,
    gap: Spacing.base,
  },
  scanCardActive: {
    borderColor: t.cardAccentBorder,
    backgroundColor: t.primaryLight,
  },
  scanIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.full,
    backgroundColor: t.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanTextCol: { flex: 1, minWidth: 0 },
  scanName: { ...Typography.bodyMedium, color: Colors.text },
  scanTime: { ...Typography.caption, color: Colors.textSecondary, marginTop: 2 },
  publishedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    backgroundColor: t.primary,
  },
  publishedBadgeText: { fontSize: 11, fontWeight: '700', color: Colors.white },

  // Live bar shown under menu detail when scan is published
  liveBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: t.primaryLight,
    borderRadius: BorderRadius.base,
    padding: 10,
    borderWidth: 1,
    borderColor: t.cardAccentBorder,
  },
  liveBarText: { ...Typography.caption, color: t.primaryDark, flex: 1 },
  qrInlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: t.primaryDark,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  qrInlineBtnText: { fontSize: 12, fontWeight: '700', color: Colors.white },

  // Dish cards
  dishCard: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: BorderRadius.lg,
    padding: 12,
  },
  dishRow: { flexDirection: 'row', gap: 12 },
  dishImage: { width: 56, height: 56, borderRadius: 12, backgroundColor: '#F3F4F6' },
  dishImagePlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dishTextCol: { flex: 1, minWidth: 0 },
  dishNameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  dishName: { ...Typography.bodyMedium, fontWeight: '800', color: Colors.text, flex: 1 },
  dishPrice: { ...Typography.bodyMedium, fontWeight: '700', color: Colors.textSecondary },
  dishDesc: { ...Typography.body, color: Colors.textSecondary, marginTop: 4, fontSize: 13 },
  // Empty state
  emptyCard: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: BorderRadius.lg,
    gap: 4,
  },
  emptyTitle: { ...Typography.bodyMedium, fontWeight: '700', color: Colors.text },
  emptySubtitle: { ...Typography.caption, color: Colors.textSecondary, textAlign: 'center' as const },
  uploadBtn: {
    marginTop: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: BorderRadius.full,
    backgroundColor: t.primary,
  },
  uploadBtnText: { ...Typography.captionMedium, fontWeight: '700', color: Colors.white },

  // Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(16,24,40,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 18,
    alignItems: 'center',
    gap: 10,
  },
  modalTitle: { ...Typography.headingSmall, fontWeight: '800', color: Colors.text },
  qrPreview: { width: 220, height: 220, borderRadius: 12, backgroundColor: '#F3F4F6' },
  modalHint: { ...Typography.caption, color: Colors.textSecondary, textAlign: 'center' as const },
  linkText: { ...Typography.caption, color: Colors.textSecondary, textAlign: 'center' as const },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 6 },
  modalActionBtn: {
    borderRadius: BorderRadius.full,
    backgroundColor: t.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  modalActionText: { ...Typography.captionMedium, color: Colors.white, fontWeight: '700' },
  modalCloseBtn: { marginTop: 2, paddingVertical: 8, paddingHorizontal: 14 },
  modalCloseText: { ...Typography.captionMedium, color: Colors.textSecondary, fontWeight: '700' },
});
