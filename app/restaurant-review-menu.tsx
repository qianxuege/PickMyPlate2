import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Image } from 'expo-image';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { restaurantRoleTheme } from '@/constants/role-theme';
import { Colors, Typography } from '@/constants/theme';
import { useRestaurantActiveMenuScan } from '@/contexts/RestaurantActiveMenuScanContext';
import { useGuardActiveRole } from '@/hooks/use-guard-active-role';
import { clampDisplayName, DISPLAY_NAME_MAX_LENGTH } from '@/lib/display-name';
import { fetchRestaurantMenuForScan, type RestaurantMenuDishRow } from '@/lib/restaurant-fetch-menu-for-scan';
import { publishRestaurantMenu } from '@/lib/restaurant-publish-menu';
import { updateRestaurantMenuScanName } from '@/lib/restaurant-rename-menu-scan';

const t = restaurantRoleTheme;

const cardShadow = Platform.select({
  ios: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  android: { elevation: 2 },
  default: {},
});

const footerShadow = Platform.select({
  ios: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
  },
  android: { elevation: 12 },
  default: {},
});

function titleize(s: string): string {
  return s
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
    .join(' ');
}

function tagChip(tag: string) {
  const lower = tag.trim().toLowerCase();
  if (lower === 'spicy' || lower === 'medium' || lower === 'mild') return { icon: 'fire', label: titleize(tag) };
  if (lower === 'vegan' || lower === 'vegetarian') return { icon: 'leaf', label: titleize(tag) };
  return { icon: 'tag', label: tag };
}

function buildNeedsReviewCounts(dishes: RestaurantMenuDishRow[]) {
  const total = dishes.length;
  const needReview = dishes.filter((d) => d.needs_review).length;
  return { total, needReview, reviewed: total - needReview };
}

function spiceLevelLabel(level: 0 | 1 | 2 | 3): string {
  if (level === 1) return 'Mild';
  if (level === 2) return 'Medium';
  if (level === 3) return 'Spicy';
  return 'None';
}

export default function RestaurantReviewMenuScreen() {
  useGuardActiveRole('restaurant');
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ scanId?: string | string[] }>();

  const scanIdRaw = params.scanId;
  const scanId = Array.isArray(scanIdRaw) ? scanIdRaw[0] : scanIdRaw;

  const { setActiveRestaurantMenuScan } = useRestaurantActiveMenuScan();

  useEffect(() => {
    const id = scanId?.trim();
    if (id) void setActiveRestaurantMenuScan(id);
  }, [scanId, setActiveRestaurantMenuScan]);

  const [loading, setLoading] = useState(Boolean(scanId));
  const [error, setError] = useState<string | null>(null);
  const [restaurantName, setRestaurantName] = useState<string>('Menu');
  const [dishes, setDishes] = useState<RestaurantMenuDishRow[]>([]);
  const [defaultSectionId, setDefaultSectionId] = useState<string | null>(null);

  const [renameModalVisible, setRenameModalVisible] = useState(false);
  const [renameInput, setRenameInput] = useState('');
  const [renameSaving, setRenameSaving] = useState(false);
  /** True when this scan is already published (live) in the database. */
  const [scanIsPublished, setScanIsPublished] = useState(false);

  const load = useCallback(async () => {
    if (!scanId) return;
    setLoading(true);
    setError(null);
    const result = await fetchRestaurantMenuForScan(scanId);
    if (!result.ok) {
      setError(result.error);
      setDishes([]);
      setDefaultSectionId(null);
      setScanIsPublished(false);
      setLoading(false);
      return;
    }

    setScanIsPublished(result.scan.is_published);
    setRestaurantName(result.scan.restaurant_name?.trim() || 'Menu');
    const flat = [...result.dishes].sort((a, b) => a.sort_order - b.sort_order);
    setDishes(flat);
    setDefaultSectionId(result.sections[0]?.id ?? null);
    setLoading(false);
  }, [scanId]);

  useEffect(() => {
    void load();
  }, [load]);

  const counts = useMemo(() => buildNeedsReviewCounts(dishes), [dishes]);

  const runPublish = useCallback(async () => {
    if (!scanId) return;
    const res = await publishRestaurantMenu(scanId);
    if (!res.ok) {
      Alert.alert('Publish failed', res.error);
      return;
    }
    Alert.alert('Menu published!', 'Your menu is now live for customers.', [
      { text: 'OK', onPress: () => router.replace('/restaurant-home') },
    ]);
  }, [scanId, router]);

  const onPublish = useCallback(() => {
    if (!scanId) return;
    if (counts.needReview > 0) {
      const n = counts.needReview;
      Alert.alert(
        'Some dishes still need review',
        `${n} item(s) are marked as needing review. You can publish anyway, or go back and edit dishes first.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Publish anyway', onPress: () => void runPublish() },
        ],
      );
      return;
    }
    void runPublish();
  }, [counts.needReview, runPublish, scanId]);

  const onAddMissingItem = useCallback(() => {
    if (!scanId) return;
    if (!defaultSectionId) {
      Alert.alert('Missing section', 'Could not determine a section to add the dish.');
      return;
    }
    router.push({ pathname: '/restaurant-add-dish', params: { scanId, sectionId: defaultSectionId } });
  }, [defaultSectionId, router, scanId]);

  const onEditDish = useCallback(
    (dishId: string) => {
      router.push({ pathname: '/restaurant-edit-dish/[dishId]', params: { dishId, scanId } });
    },
    [router, scanId],
  );

  const openRenameMenu = useCallback(() => {
    setRenameInput(restaurantName);
    setRenameModalVisible(true);
  }, [restaurantName]);

  const onConfirmRenameMenu = useCallback(async () => {
    if (!scanId) return;
    setRenameSaving(true);
    try {
      const res = await updateRestaurantMenuScanName(scanId, clampDisplayName(renameInput));
      if (!res.ok) {
        Alert.alert('Could not rename', res.error);
        return;
      }
      const next = clampDisplayName(renameInput.trim()) || 'Menu';
      setRestaurantName(next);
      Keyboard.dismiss();
      setRenameModalVisible(false);
    } finally {
      setRenameSaving(false);
    }
  }, [renameInput, scanId]);

  const reviewProgress = counts.total > 0 ? counts.reviewed / counts.total : 0;

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerTopRow}>
          <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.back()} style={({ pressed }) => [styles.iconBtn, pressed && styles.iconBtnPressed]}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={Colors.text} />
          </Pressable>
          <View style={styles.titleSlot}>
            <Text style={styles.title} numberOfLines={1} ellipsizeMode="tail">
              {restaurantName}
            </Text>
            {!loading && !error && scanId ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Rename menu"
                hitSlop={10}
                onPress={openRenameMenu}
                style={({ pressed }) => [styles.titlePencilBtn, pressed && { opacity: 0.7 }]}
              >
                <MaterialCommunityIcons name="pencil" size={16} color="#99A1AF" />
              </Pressable>
            ) : null}
          </View>
          <View style={styles.iconBtn}>
            <MaterialCommunityIcons name="menu" size={20} color={Colors.text} />
          </View>
        </View>

        {!loading && !error ? (
          <View style={styles.headerStatsRow}>
            <Text style={styles.headerStatMuted}>{`${dishes.length} items extracted`}</Text>
            <Text style={styles.headerStatBullet}> • </Text>
            <Text style={styles.headerStatAccent}>
              {counts.needReview === 1 ? '1 need review' : `${counts.needReview} need review`}
            </Text>
          </View>
        ) : null}

        {!loading && !error && scanId && !scanIsPublished ? (
          <View style={styles.publishCue}>
            <MaterialCommunityIcons name="information-outline" size={16} color={t.primaryDark} />
            <Text style={styles.publishCueText}>
              Tap a dish to edit details. When everything looks right, use Publish for diners at the bottom to make
              this menu live.
            </Text>
          </View>
        ) : null}
      </View>

      {loading ? (
        <View style={[styles.centerBlock, { paddingTop: 60 }]}>
          <ActivityIndicator color={t.primary} />
          <Text style={{ marginTop: 12, ...Typography.body, color: Colors.textSecondary }}>Loading menu…</Text>
        </View>
      ) : error ? (
        <View style={[styles.centerBlock, { paddingTop: 60 }]}>
          <Text style={{ ...Typography.body, color: Colors.error, textAlign: 'center' }}>{error}</Text>
        </View>
      ) : (
        <>
          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <View style={styles.list}>
              {dishes.map((dish) => {
                const priceLine = dish.price_display?.trim() || (dish.price_amount === null ? '—' : String(dish.price_amount));
                return (
                  <Pressable
                    key={dish.id}
                    accessibilityRole="button"
                    onPress={() => onEditDish(dish.id)}
                    style={({ pressed }) => [
                      styles.card,
                      cardShadow,
                      dish.needs_review ? styles.cardNeedsReview : null,
                      pressed && { opacity: 0.92 },
                    ]}
                  >
                    <View style={styles.cardInner}>
                      <View style={styles.cardRow}>
                        {dish.image_url ? (
                          <Image source={{ uri: dish.image_url }} style={styles.dishImage} contentFit="cover" />
                        ) : (
                          <View style={styles.imagePlaceholder}>
                            <MaterialCommunityIcons name="image-outline" size={20} color="#D1D5DC" />
                          </View>
                        )}

                        <View style={styles.cardTextCol}>
                          <View style={styles.namePriceRow}>
                            <Text style={styles.dishName} numberOfLines={2}>
                              {dish.name}
                            </Text>
                            <Text style={styles.dishPrice}>{priceLine}</Text>
                          </View>
                          <Text style={styles.dishDesc} numberOfLines={3}>
                            {dish.description || '—'}
                          </Text>

                          <View style={styles.chipsRow}>
                            {dish.spice_level > 0 ? (
                              <View style={styles.chipNeutral}>
                                <Text style={styles.chipNeutralEmoji}>🌶</Text>
                                <Text style={styles.chipNeutralText}>{spiceLevelLabel(dish.spice_level)}</Text>
                              </View>
                            ) : null}

                            {dish.needs_review ? (
                              <View style={styles.chipNeedReview}>
                                <MaterialCommunityIcons name="alert-circle-outline" size={12} color={t.primaryDark} />
                                <Text style={styles.chipNeedReviewText}>Needs review</Text>
                              </View>
                            ) : null}

                            {dish.tags?.length
                              ? dish.tags.slice(0, 3).map((tag) => {
                                  const chip = tagChip(tag);
                                  return (
                                    <View key={tag} style={styles.chipNeutral}>
                                      {chip.icon === 'fire' ? (
                                        <Text style={styles.chipNeutralEmoji}>🌶</Text>
                                      ) : chip.icon === 'leaf' ? (
                                        <Text style={styles.chipNeutralEmoji}>🌱</Text>
                                      ) : (
                                        <MaterialCommunityIcons name="tag-outline" size={12} color="#4A5565" />
                                      )}
                                      <Text style={styles.chipNeutralText}>{chip.label}</Text>
                                    </View>
                                  );
                                })
                              : null}
                          </View>
                        </View>
                      </View>

                      <View style={styles.menuDots} pointerEvents="none">
                        <MaterialCommunityIcons name="dots-vertical" size={20} color="#99A1AF" />
                      </View>
                    </View>
                  </Pressable>
                );
              })}

              <Pressable accessibilityRole="button" onPress={onAddMissingItem} style={({ pressed }) => [styles.addMissingCard, pressed && { opacity: 0.92 }]}>
                <MaterialCommunityIcons name="plus" size={20} color="#99A1AF" />
                <Text style={styles.addMissingText}>Add missing item</Text>
              </Pressable>
            </View>
          </ScrollView>

          <View style={[styles.footer, footerShadow, { paddingBottom: Math.max(insets.bottom, 12) }]}>
            <View style={styles.footerCounts}>
              <Text style={styles.footerLeft}>{`${counts.reviewed} / ${counts.total} items reviewed`}</Text>
              <Text style={styles.footerRight}>
                {counts.needReview === 1 ? '1 need review' : `${counts.needReview} need review`}
              </Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${Math.round(reviewProgress * 100)}%` }]} />
            </View>
            {scanIsPublished ? (
              <>
                <View style={styles.footerLiveRow}>
                  <MaterialCommunityIcons name="check-circle" size={22} color={t.primaryDark} />
                  <Text style={styles.footerLiveText}>
                    This menu is live for customers. Dish edits you save from here update what diners see.
                  </Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Back to menu list"
                  onPress={() => router.back()}
                  style={({ pressed }) => [styles.doneBtn, pressed && { opacity: 0.9 }]}
                >
                  <Text style={styles.doneBtnText}>Done</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Text style={styles.publishHint}>
                  Ready for customers? Publishing makes this the menu diners see (and replaces any previous live menu).
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Publish menu for diners"
                  onPress={() => void onPublish()}
                  style={({ pressed }) => [styles.publishBtn, pressed && { opacity: 0.92 }]}
                >
                  <View style={styles.publishBtnInner}>
                    <MaterialCommunityIcons name="upload" size={20} color={Colors.white} />
                    <Text style={styles.publishBtnText}>Publish for diners</Text>
                  </View>
                </Pressable>
              </>
            )}
          </View>
        </>
      )}

      <Modal visible={renameModalVisible} animationType="fade" transparent onRequestClose={() => !renameSaving && setRenameModalVisible(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalRoot}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Dismiss"
            disabled={renameSaving}
            onPress={() => {
              Keyboard.dismiss();
              if (!renameSaving) setRenameModalVisible(false);
            }}
            style={StyleSheet.absoluteFillObject}
          />
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Rename menu</Text>
            <TextInput
              value={renameInput}
              onChangeText={(t) => setRenameInput(clampDisplayName(t))}
              placeholder="Menu name"
              placeholderTextColor="#6A7282"
              style={styles.modalInput}
              autoCapitalize="words"
              autoCorrect
              editable={!renameSaving}
              maxLength={DISPLAY_NAME_MAX_LENGTH}
              returnKeyType="done"
              onSubmitEditing={() => void onConfirmRenameMenu()}
            />
            <View style={styles.modalActions}>
              <Pressable
                onPress={() => {
                  Keyboard.dismiss();
                  if (!renameSaving) setRenameModalVisible(false);
                }}
                disabled={renameSaving}
                style={({ pressed }) => [styles.modalBtnSecondary, pressed && { opacity: 0.85 }]}
              >
                <Text style={styles.modalBtnSecondaryText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => void onConfirmRenameMenu()}
                disabled={renameSaving}
                style={({ pressed }) => [
                  styles.modalBtnPrimary,
                  { backgroundColor: t.primary },
                  pressed && { opacity: 0.92 },
                  renameSaving && { opacity: 0.7 },
                ]}
              >
                {renameSaving ? (
                  <ActivityIndicator color={Colors.white} />
                ) : (
                  <Text style={styles.modalBtnPrimaryText}>Save</Text>
                )}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 1,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: Colors.white,
    gap: 24,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  iconBtnPressed: { opacity: 0.85 },
  titleSlot: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    gap: 2,
  },
  titlePencilBtn: {
    padding: 4,
    marginLeft: 2,
  },
  title: {
    flex: 1,
    minWidth: 0,
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 30,
    letterSpacing: -0.45,
    color: Colors.text,
    textAlign: 'center',
  },
  modalRoot: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 24, 40, 0.45)',
  },
  modalCard: {
    width: '88%',
    maxWidth: 340,
    zIndex: 1,
    padding: 20,
    borderRadius: 16,
    backgroundColor: Colors.white,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 12,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#D1D5DC',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: Colors.text,
    marginBottom: 18,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    alignItems: 'center',
  },
  modalBtnSecondary: {
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  modalBtnSecondaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6A7282',
  },
  modalBtnPrimary: {
    minWidth: 88,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnPrimaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.white,
  },
  headerStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingBottom: 8,
  },
  headerStatMuted: {
    fontSize: 13,
    lineHeight: 20,
    letterSpacing: -0.076,
    color: '#6A7282',
  },
  headerStatBullet: {
    fontSize: 13,
    lineHeight: 20,
    letterSpacing: -0.076,
    color: '#6A7282',
  },
  headerStatAccent: {
    fontSize: 13,
    lineHeight: 20,
    letterSpacing: -0.076,
    color: t.primaryDark,
    fontWeight: '500',
  },
  publishCue: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 4,
    marginBottom: 2,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: t.primaryLight,
    borderWidth: 1,
    borderColor: t.cardAccentBorder,
  },
  publishCueText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    letterSpacing: -0.076,
    color: t.primaryDark,
    fontWeight: '500',
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 200,
  },
  centerBlock: { alignItems: 'center' },
  list: {
    gap: 16,
  },
  card: {
    borderRadius: 16,
    backgroundColor: Colors.white,
    overflow: 'visible',
  },
  cardNeedsReview: {
    backgroundColor: 'rgba(236, 253, 245, 0.45)',
    borderWidth: 1,
    borderColor: t.cardAccentBorder,
  },
  cardInner: {
    position: 'relative',
    padding: 16,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  dishImage: {
    width: 120,
    height: 80,
    borderRadius: 14,
    backgroundColor: '#F9FAFB',
    flexShrink: 0,
  },
  imagePlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 14,
    backgroundColor: 'rgba(249, 250, 251, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cardTextCol: { flex: 1, minWidth: 0, paddingRight: 28 },
  namePriceRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  dishName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 20,
    letterSpacing: -0.31,
    color: Colors.text,
  },
  dishPrice: {
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 24,
    letterSpacing: -0.31,
    color: Colors.text,
    flexShrink: 0,
    marginLeft: 4,
  },
  dishDesc: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 21,
    letterSpacing: -0.076,
    color: '#6A7282',
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  chipNeutral: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
    backgroundColor: '#F3F4F6',
  },
  chipNeutralEmoji: {
    fontSize: 11,
    lineHeight: 16,
  },
  chipNeutralText: {
    fontSize: 11,
    lineHeight: 16,
    letterSpacing: 0.064,
    fontWeight: '500',
    color: '#4A5565',
  },
  chipNeedReview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
    backgroundColor: t.primaryLight,
    borderWidth: 1,
    borderColor: t.cardAccentBorder,
  },
  chipNeedReviewText: {
    fontSize: 11,
    lineHeight: 16,
    letterSpacing: 0.064,
    fontWeight: '500',
    color: t.primaryDark,
  },
  menuDots: {
    position: 'absolute',
    right: 10,
    top: 14,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addMissingCard: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#E5E7EB',
    borderRadius: 14,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    backgroundColor: Colors.white,
  },
  addMissingText: {
    fontSize: 15,
    lineHeight: 22,
    letterSpacing: -0.23,
    fontWeight: '500',
    color: '#99A1AF',
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 24,
    paddingTop: 12,
    backgroundColor: Colors.white,
    gap: 8,
  },
  footerCounts: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerLeft: {
    fontSize: 11,
    lineHeight: 16,
    letterSpacing: 0.064,
    color: '#6A7282',
  },
  footerRight: {
    fontSize: 11,
    lineHeight: 16,
    letterSpacing: 0.064,
    color: t.primaryDark,
    fontWeight: '500',
  },
  progressTrack: {
    height: 2,
    borderRadius: 9999,
    backgroundColor: '#F3F4F6',
    overflow: 'hidden',
    width: '100%',
  },
  progressFill: {
    height: 2,
    borderRadius: 9999,
    backgroundColor: t.primary,
  },
  publishHint: {
    fontSize: 12,
    lineHeight: 17,
    letterSpacing: -0.076,
    color: '#6A7282',
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: 4,
  },
  footerLiveRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: t.primaryLight,
    borderWidth: 1,
    borderColor: t.cardAccentBorder,
  },
  footerLiveText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    letterSpacing: -0.076,
    color: t.primaryDark,
    fontWeight: '500',
  },
  doneBtn: {
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: t.primary,
    backgroundColor: Colors.white,
  },
  doneBtnText: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '700',
    color: t.primary,
  },
  publishBtn: {
    minHeight: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.primary,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
      },
      android: { elevation: 4 },
      default: {},
    }),
  },
  publishBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  publishBtnText: {
    fontSize: 16,
    lineHeight: 22,
    letterSpacing: -0.23,
    fontWeight: '700',
    color: Colors.white,
  },
});

