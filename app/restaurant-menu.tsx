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
import { BorderRadius, Colors, Typography } from '@/constants/theme';
import { useRestaurantActiveMenuScan } from '@/contexts/RestaurantActiveMenuScanContext';
import { useGuardActiveRole } from '@/hooks/use-guard-active-role';
import { buildPartnerMenuLink, buildPartnerMenuQrUrl, getOrCreateOwnerPartnerMenuToken } from '@/lib/partner-menu-access';
import { scanBelongsToOwnerRestaurant } from '@/lib/restaurant-menu-scans';
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
  const { activeScanId, hydrated, setActiveRestaurantMenuScan } = useRestaurantActiveMenuScan();

  const [publishedScanId, setPublishedScanId] = useState<string | null>(null);
  const [menuLoading, setMenuLoading] = useState(false);
  const [menuTitle, setMenuTitle] = useState<string>('My Menus');
  const [dishes, setDishes] = useState<DishRow[]>([]);

  // --- QR ---
  const [qrBusy, setQrBusy] = useState(false);
  const [qrVisible, setQrVisible] = useState(false);
  const [partnerLink, setPartnerLink] = useState<string | null>(null);
  const [partnerQrUrl, setPartnerQrUrl] = useState<string | null>(null);
  const [livePublishedMenuTitle, setLivePublishedMenuTitle] = useState<string | null>(null);
  const [qrModalPublishedTitle, setQrModalPublishedTitle] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void (async () => {
        try {
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (!user || cancelled) return;
          const { data: restRow } = await supabase
            .from('restaurants')
            .select('published_menu_scan_id')
            .eq('owner_id', user.id)
            .maybeSingle();
          if (cancelled) return;
          const pubId = restRow?.published_menu_scan_id ? String(restRow.published_menu_scan_id) : null;
          setPublishedScanId(pubId);
          if (pubId) {
            const live = await fetchRestaurantMenuForScan(pubId);
            if (!cancelled && live.ok) {
              setLivePublishedMenuTitle(live.scan.restaurant_name?.trim() || 'Published menu');
            } else if (!cancelled) {
              setLivePublishedMenuTitle('Published menu');
            }
          } else if (!cancelled) {
            setLivePublishedMenuTitle(null);
          }

          const aid = activeScanId?.trim();
          if (aid && !(await scanBelongsToOwnerRestaurant(aid))) {
            await setActiveRestaurantMenuScan(null);
          }
        } catch {
          /* keep state */
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [activeScanId, setActiveRestaurantMenuScan]),
  );

  useEffect(() => {
    let cancelled = false;
    const sid = activeScanId?.trim();
    if (!sid) {
      setMenuTitle('My Menus');
      setDishes([]);
      return;
    }
    setMenuLoading(true);
    void (async () => {
      try {
        const result = await fetchRestaurantMenuForScan(sid);
        if (cancelled) return;
        if (!result.ok) {
          await setActiveRestaurantMenuScan(null);
          setMenuTitle('My Menus');
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
  }, [activeScanId, setActiveRestaurantMenuScan]);

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
      setQrModalPublishedTitle(res.publishedMenuTitle);
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

  if (!hydrated) {
    return (
      <RestaurantTabScreenLayout activeTab="menu">
        <View style={styles.centerBlock}>
          <ActivityIndicator color={t.primary} />
        </View>
      </RestaurantTabScreenLayout>
    );
  }

  const activeId = activeScanId?.trim() ?? '';
  const viewingDraftWhileLiveExists =
    Boolean(activeId) && Boolean(publishedScanId) && activeId !== publishedScanId;
  return (
    <RestaurantTabScreenLayout activeTab="menu">
      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {activeScanId?.trim() ? 'Menu' : 'My Menus'}
        </Text>
        <View style={styles.actionsRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Generate partner QR for your live published menu"
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

      {!activeScanId?.trim() ? (
        <View style={styles.selectMenuEmpty}>
          <MaterialCommunityIcons name="format-list-bulleted-square" size={40} color={Colors.textSecondary} />
          <Text style={styles.selectMenuTitle}>Select a menu</Text>
          <Text style={styles.selectMenuSubtitle}>
            Go to Home, then choose a menu under Recent uploads to view dishes and manage this menu here.
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/restaurant-home')}
            style={({ pressed }) => [styles.selectMenuBtn, pressed && { opacity: 0.88 }]}
          >
            <Text style={styles.selectMenuBtnText}>Go to Home</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <View style={styles.menuDetailHeader}>
            <Text style={styles.sectionTitle} numberOfLines={1}>
              {menuTitle}
            </Text>
            <View style={styles.menuDetailActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Edit menu, review dishes, and publish when ready"
                onPress={() =>
                  router.push({
                    pathname: '/restaurant-review-menu',
                    params: { scanId: activeId },
                  })
                }
                style={({ pressed }) => [styles.editBtn, pressed && { opacity: 0.8 }]}
              >
                <MaterialCommunityIcons name="pencil-outline" size={14} color={t.primaryDark} />
                <Text style={styles.editBtnText}>Edit</Text>
              </Pressable>
            </View>
          </View>

          {activeScanId?.trim() === publishedScanId ? (
            <View style={styles.liveBar}>
              <MaterialCommunityIcons name="check-circle" size={14} color={t.primaryDark} />
              <Text style={styles.liveBarText}>
                This menu is live for customers. Tap the QR icon in the header (top right) to share it.
              </Text>
            </View>
          ) : viewingDraftWhileLiveExists ? (
            <View style={styles.draftQrInfo}>
              <MaterialCommunityIcons name="information-outline" size={16} color={Colors.textSecondary} />
              <Text style={styles.draftQrInfoText}>
                Partner QR always opens your live menu
                {livePublishedMenuTitle ? ` ("${livePublishedMenuTitle}")` : ''}. Tap Edit above to review dishes,
                then use Publish on the next screen when you are ready to replace what diners see.
              </Text>
            </View>
          ) : activeId && !publishedScanId ? (
            <View style={styles.draftQrInfo}>
              <MaterialCommunityIcons name="qrcode" size={16} color={Colors.textSecondary} />
              <Text style={styles.draftQrInfoText}>
                Tap Edit above to review this menu, then use Publish on the next screen when ready. After that, use
                the header QR icon so diners can open it.
              </Text>
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
                      <Image source={{ uri: dish.image_url }} style={styles.dishImage} accessibilityLabel={dish.name} />
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
        </ScrollView>
      )}

      {/* QR Modal */}
      <Modal
        visible={qrVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setQrModalPublishedTitle(null);
          setQrVisible(false);
        }}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Partner Menu QR</Text>
            {partnerQrUrl ? <Image source={{ uri: partnerQrUrl }} style={styles.qrPreview} accessibilityLabel="Partner menu QR code" /> : null}
            <Text style={styles.modalHint}>
              Diners scan this to open{' '}
              {qrModalPublishedTitle ? `"${qrModalPublishedTitle}"` : 'your published menu'} - your current live menu.
            </Text>
            {viewingDraftWhileLiveExists ? (
              <Text style={styles.modalHintSecondary}>
                You are viewing a different menu on this screen; the QR still opens the live menu until you tap Edit,
                then Publish for diners on the next screen.
              </Text>
            ) : null}
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
            <Pressable
              style={styles.modalCloseBtn}
              onPress={() => {
                setQrModalPublishedTitle(null);
                setQrVisible(false);
              }}
            >
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

  selectMenuEmpty: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
    gap: 12,
  },
  selectMenuTitle: {
    ...Typography.headingSmall,
    fontWeight: '800',
    color: Colors.text,
    textAlign: 'center',
  },
  selectMenuSubtitle: {
    ...Typography.caption,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  selectMenuBtn: {
    marginTop: 8,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: BorderRadius.full,
    backgroundColor: t.primary,
  },
  selectMenuBtnText: {
    ...Typography.captionMedium,
    fontWeight: '700',
    color: Colors.white,
  },

  sectionTitle: {
    ...Typography.headingSmall,
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
    marginTop: 4,
    flex: 1,
    minWidth: 0,
    marginRight: 4,
  },
  menuDetailHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  menuDetailActions: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 0 },
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
  liveBarText: { ...Typography.caption, color: t.primaryDark, flex: 1, lineHeight: 18 },
  draftQrInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#F8FAFC',
    borderRadius: BorderRadius.base,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E4E7EC',
  },
  draftQrInfoText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    flex: 1,
    lineHeight: 18,
  },

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
  emptySubtitle: { ...Typography.caption, color: Colors.textSecondary, textAlign: 'center' as const },

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
  modalHintSecondary: {
    ...Typography.caption,
    color: Colors.textSecondary,
    textAlign: 'center' as const,
    fontSize: 12,
    lineHeight: 17,
    opacity: 0.95,
  },
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
