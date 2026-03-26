import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { ActivityIndicator, Alert, Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '@/components/PrimaryButton';
import { restaurantRoleTheme } from '@/constants/role-theme';
import { RestaurantTabScreenLayout } from '@/components/RestaurantTabScreenLayout';
import { Colors, Typography } from '@/constants/theme';
import { useGuardActiveRole } from '@/hooks/use-guard-active-role';
import { buildPartnerMenuLink, buildPartnerMenuQrUrl, getOrCreateOwnerPartnerMenuToken } from '@/lib/partner-menu-access';
import { supabase } from '@/lib/supabase';
import { fetchRestaurantMenuForScan } from '@/lib/restaurant-fetch-menu-for-scan';

const t = restaurantRoleTheme;

export default function RestaurantMenuScreen() {
  useGuardActiveRole('restaurant');
  const router = useRouter();
  const params = useLocalSearchParams<{ published?: string }>();
  const [loading, setLoading] = useState(true);
  const [qrBusy, setQrBusy] = useState(false);
  const [qrVisible, setQrVisible] = useState(false);
  const [partnerLink, setPartnerLink] = useState<string | null>(null);
  const [partnerQrUrl, setPartnerQrUrl] = useState<string | null>(null);
  const [publishedScanId, setPublishedScanId] = useState<string | null>(null);
  const [dishes, setDishes] = useState<Array<{ id: string; name: string; description: string | null; price_display: string | null; price_amount: number | null; image_url: string | null; spice_level: number; tags: string[] }>>([]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        setLoading(true);
        const { data, error: userErr } = await supabase.auth.getUser();
        const user = data?.user;
        if (userErr) throw userErr;
        if (!user) return;
        const { data: restRow, error: restErr } = await supabase
          .from('restaurants')
          .select('published_menu_scan_id')
          .eq('owner_id', user.id)
          .maybeSingle();
        if (restErr) throw restErr;

        if (cancelled) return;
        const scanId = restRow?.published_menu_scan_id ? String(restRow.published_menu_scan_id) : null;
        setPublishedScanId(scanId);
        if (scanId) {
          const menu = await fetchRestaurantMenuForScan(scanId);
          if (menu.ok && !cancelled) {
            setDishes(
              menu.dishes.map((d) => ({
                id: d.id,
                name: d.name,
                description: d.description,
                price_display: d.price_display,
                price_amount: d.price_amount,
                image_url: d.image_url,
                spice_level: d.spice_level,
                tags: d.tags,
              })),
            );
          }
        } else if (!cancelled) {
          setDishes([]);
        }
      } catch {
        // ignore for MVP
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const showLiveToast = params.published === '1';

  const hasSpicy = (dish: { spice_level: number; tags: string[] }) =>
    dish.spice_level > 0 || dish.tags.some((x) => x.trim().toLowerCase() === 'spicy');
  const hasVegan = (dish: { tags: string[] }) =>
    dish.tags.some((x) => ['vegan', 'vegetarian'].includes(x.trim().toLowerCase()));

  const openQrModal = async () => {
    setQrBusy(true);
    try {
      const res = await getOrCreateOwnerPartnerMenuToken();
      if (!res.ok) {
        Alert.alert('Partner QR', res.error);
        return;
      }
      const link = buildPartnerMenuLink(res.token);
      setPartnerLink(link);
      setPartnerQrUrl(buildPartnerMenuQrUrl(res.token));
      setQrVisible(true);
    } finally {
      setQrBusy(false);
    }
  };

  const downloadQrToCache = async (): Promise<string | null> => {
    if (!partnerQrUrl || !FileSystem.cacheDirectory) return null;
    const path = `${FileSystem.cacheDirectory}partner-menu-qr.png`;
    const out = await FileSystem.downloadAsync(partnerQrUrl, path);
    return out.uri;
  };

  const onShareQr = async () => {
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
  };

  const onSaveQrToPhotos = async () => {
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
  };

  if (showLiveToast) {
    return (
      <RestaurantTabScreenLayout activeTab="menu">
        <View style={styles.liveRoot}>
          <Text style={styles.liveTitle}>
            Your menu is live <Text style={{ fontSize: 18 }}>🎉</Text>
          </Text>
          <PrimaryButton text="Continue" onPress={() => router.replace('/restaurant-menu')} accentColor={t.primary} accentShadowRgb={t.shadowRgb} />
        </View>
      </RestaurantTabScreenLayout>
    );
  }

  return (
    <RestaurantTabScreenLayout activeTab="menu">
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>My Restaurant Menu</Text>
        <View style={styles.actionsRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Generate partner QR"
            onPress={() => void openQrModal()}
            style={({ pressed }) => [styles.iconBtn, qrBusy && styles.iconBtnDisabled, pressed && { opacity: 0.9 }]}
            disabled={qrBusy}
          >
            <MaterialCommunityIcons name="qrcode-scan" size={18} color={Colors.white} />
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Add menu item" onPress={() => router.push('/restaurant-home')} style={({ pressed }) => [styles.plusBtn, pressed && { opacity: 0.9 }]}>
            <MaterialCommunityIcons name="plus" size={18} color={Colors.white} />
          </Pressable>
        </View>
      </View>

      {loading ? (
        <View style={styles.centerBlock}>
          <ActivityIndicator color={t.primary} />
        </View>
      ) : publishedScanId ? (
        <ScrollView contentContainerStyle={styles.list}>
          {dishes.map((dish) => {
            const price = dish.price_display?.trim() || (dish.price_amount == null ? '—' : String(dish.price_amount));
            return (
              <View key={dish.id} style={[styles.card, { borderColor: '#E5E7EB' }]}>
                <View style={styles.cardRow}>
                  {dish.image_url ? (
                    <Image source={{ uri: dish.image_url }} style={styles.imagePlaceholder} />
                  ) : (
                    <View style={styles.imagePlaceholder}>
                      <MaterialCommunityIcons name="silverware-fork-knife" size={22} color={Colors.textPlaceholder} />
                    </View>
                  )}
                  <View style={styles.cardTextCol}>
                    <View style={styles.namePriceRow}>
                      <Text style={styles.dishName} numberOfLines={1}>
                        {dish.name}
                      </Text>
                      <Text style={styles.dishPrice}>{price}</Text>
                      <MaterialCommunityIcons name="dots-vertical" size={18} color={Colors.textSecondary} />
                    </View>
                    <Text style={styles.dishDesc} numberOfLines={2}>
                      {dish.description || '—'}
                    </Text>

                    <View style={styles.chipsRow}>
                      {hasVegan(dish) ? (
                        <View style={[styles.chip, { borderColor: t.primaryLight }]}>
                          <MaterialCommunityIcons name="leaf" size={14} color={t.primary} />
                          <Text style={styles.chipText}>Vegan</Text>
                        </View>
                      ) : null}
                      {hasSpicy(dish) ? (
                        <View style={[styles.chip, { borderColor: t.primaryLight }]}>
                          <MaterialCommunityIcons name="fire" size={14} color={t.primary} />
                          <Text style={styles.chipText}>Spicy</Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                </View>
              </View>
            );
          })}
        </ScrollView>
      ) : (
        <View style={styles.emptyRoot}>
          <Text style={styles.emptyTitle}>No published menu yet</Text>
          <Text style={styles.emptySubtitle}>Upload and publish a menu to make it live for customers.</Text>
          <PrimaryButton text="Upload menu" onPress={() => router.push('/restaurant-home')} accentColor={t.primary} accentShadowRgb={t.shadowRgb} />
        </View>
      )}

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
  liveRoot: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 18 },
  liveTitle: { ...Typography.heading, textAlign: 'center' as const, color: Colors.text, marginBottom: 8 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 6 },
  headerTitle: { ...Typography.headingSmall, fontWeight: '800', color: Colors.text },
  actionsRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 999,
    backgroundColor: t.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnDisabled: { opacity: 0.6 },
  plusBtn: {
    width: 40,
    height: 40,
    borderRadius: 999,
    backgroundColor: t.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerBlock: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { paddingHorizontal: 16, paddingBottom: 120, gap: 12 },
  card: { backgroundColor: Colors.white, borderWidth: 1, borderRadius: 16, padding: 12 },
  cardRow: { flexDirection: 'row', gap: 12 },
  imagePlaceholder: { width: 56, height: 56, borderRadius: 14, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  cardTextCol: { flex: 1, minWidth: 0 },
  namePriceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  dishName: { ...Typography.bodyMedium, fontWeight: '800', color: Colors.text, flex: 1 },
  dishPrice: { ...Typography.bodyMedium, fontWeight: '800', color: Colors.textSecondary },
  dishDesc: { ...Typography.body, color: Colors.textSecondary, marginTop: 4 },
  chipsRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  chipText: { ...Typography.captionMedium, fontWeight: '800', color: t.primary },
  emptyRoot: { flex: 1, paddingHorizontal: 16, justifyContent: 'center', gap: 12, alignItems: 'center' },
  emptyTitle: { ...Typography.headingSmall, fontWeight: '800', color: Colors.text, textAlign: 'center' as const },
  emptySubtitle: { ...Typography.body, color: Colors.textSecondary, textAlign: 'center' as const },
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
    borderRadius: 999,
    backgroundColor: t.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  modalActionText: { ...Typography.captionMedium, color: Colors.white, fontWeight: '700' },
  modalCloseBtn: { marginTop: 2, paddingVertical: 8, paddingHorizontal: 14 },
  modalCloseText: { ...Typography.captionMedium, color: Colors.textSecondary, fontWeight: '700' },
});
