import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/PrimaryButton';
import { restaurantRoleTheme } from '@/constants/role-theme';
import { Colors, Typography } from '@/constants/theme';
import { useGuardActiveRole } from '@/hooks/use-guard-active-role';
import { generateRestaurantDishImage } from '@/lib/restaurant-dish-image-api';
import { pickAndUploadRestaurantDishPhoto } from '@/lib/restaurant-dish-photo-upload';
import { generateRestaurantDishSummary } from '@/lib/restaurant-dish-summary-api';
import { createRestaurantDishDraft, getRestaurantSectionNextDishSortOrder, saveRestaurantDish } from '@/lib/restaurant-menu-dishes';

const t = restaurantRoleTheme;

type SpiceLevel = 0 | 1 | 2 | 3;

function parsePriceToAmount(input: string): { amount: number | null; currency: string; display: string | null } {
  const raw = input.trim();
  if (!raw) return { amount: null, currency: 'USD', display: null };

  let currency = 'USD';
  const hasDollar = raw.includes('$');
  const hasEuro = raw.includes('€');
  const hasPound = raw.includes('£');
  const hasYen = raw.includes('¥');

  if (hasDollar) currency = 'USD';
  else if (hasEuro) currency = 'EUR';
  else if (hasPound) currency = 'GBP';
  else if (hasYen) currency = 'JPY';

  const numeric = raw.replace(/[^0-9.,-]/g, '').replace(/,/g, '');
  const n = Number(numeric);
  return {
    amount: Number.isFinite(n) ? n : null,
    currency,
    display: raw,
  };
}

/** Comma-separated: "chicken, potato, onion" → ["chicken", "potato", "onion"]. */
function parseIngredientsText(input: string): string[] {
  return input
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseTagsText(input: string): string[] {
  return input
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export default function RestaurantAddDishScreen() {
  useGuardActiveRole('restaurant');
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ scanId?: string | string[]; sectionId?: string | string[] }>();

  const scanIdRaw = params.scanId;
  const sectionIdRaw = params.sectionId;
  const scanId = Array.isArray(scanIdRaw) ? scanIdRaw[0] : scanIdRaw;
  const sectionId = Array.isArray(sectionIdRaw) ? sectionIdRaw[0] : sectionIdRaw;

  const [dishId, setDishId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dishImageUrl, setDishImageUrl] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [priceText, setPriceText] = useState('');
  const [summary, setSummary] = useState('');
  const [ingredientsText, setIngredientsText] = useState('');
  const [tagsText, setTagsText] = useState('');
  const [spiceLevel, setSpiceLevel] = useState<SpiceLevel>(0);

  const [imageLoading, setImageLoading] = useState(false);
  const [uploadPhotoLoading, setUploadPhotoLoading] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  const ingredients = useMemo(() => parseIngredientsText(ingredientsText), [ingredientsText]);
  const tags = useMemo(() => parseTagsText(tagsText), [tagsText]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!scanId || !sectionId) {
        setLoading(false);
        return;
      }
      try {
        const nextSort = await getRestaurantSectionNextDishSortOrder(sectionId);
        const draft = await createRestaurantDishDraft({ sectionId, sortOrder: nextSort });
        if (!cancelled && draft.ok) setDishId(draft.dishId);
      } catch (e) {
        if (!cancelled) {
          Alert.alert('Could not create dish', e instanceof Error ? e.message : 'Unknown error');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [scanId, sectionId]);

  type CommitResult = { ok: true } | { ok: false; error: string };

  const commitCurrentFields = useCallback(
    async (opts?: { touchScan?: boolean; description?: string | null }): Promise<CommitResult> => {
      if (!dishId || !scanId) {
        return { ok: false, error: 'Missing scan or dish. Go back and open Add dish again.' };
      }
      const { amount, currency, display } = parsePriceToAmount(priceText);
      const currentDescription = (opts?.description ?? summary).trim();
      const descValue = currentDescription.length ? currentDescription : null;

      const result = await saveRestaurantDish({
        dishId,
        scanId,
        name: name.trim(),
        description: descValue,
        priceAmount: amount,
        priceCurrency: currency,
        priceDisplay: display,
        spiceLevel,
        tags,
        ingredients,
        touchScan: opts?.touchScan ?? false,
      });
      if (!result.ok) return { ok: false, error: result.error };
      return { ok: true };
    },
    [dishId, scanId, ingredients, name, priceText, spiceLevel, summary, tags],
  );

  const onUploadPhoto = useCallback(async () => {
    if (!dishId) return;
    setImageError(null);
    setUploadPhotoLoading(true);
    try {
      const res = await pickAndUploadRestaurantDishPhoto(dishId);
      if (res.ok) {
        setDishImageUrl(res.publicUrl);
      } else if (!('cancelled' in res && res.cancelled)) {
        setImageError('error' in res && typeof res.error === 'string' ? res.error : 'Upload failed');
      }
    } finally {
      setUploadPhotoLoading(false);
    }
  }, [dishId]);

  const onGenerateImage = useCallback(async () => {
    if (!dishId) return;
    setImageError(null);
    setImageLoading(true);
    try {
      const commit = await commitCurrentFields({ touchScan: false });
      if (!commit.ok) {
        setImageError(commit.error);
        Alert.alert('Could not save dish', commit.error);
        return;
      }
      const res = await generateRestaurantDishImage(dishId);
      if (!res.ok) {
        setImageError(res.error);
        Alert.alert('Generate image failed', res.error);
      } else {
        setDishImageUrl(res.imageUrl);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      setImageError(msg);
      Alert.alert('Generate image failed', msg);
    } finally {
      setImageLoading(false);
    }
  }, [commitCurrentFields, dishId]);

  const onGenerateSummary = useCallback(async () => {
    if (!dishId) return;
    setSummaryError(null);
    setSummaryLoading(true);
    try {
      const commit = await commitCurrentFields({ touchScan: false, description: summary });
      if (!commit.ok) {
        setSummaryError(commit.error);
        Alert.alert('Could not save dish', commit.error);
        return;
      }
      const res = await generateRestaurantDishSummary(dishId);
      if (res.ok) {
        const next = (res.description ?? '').trim();
        setSummary(next);
        if (!next) {
          Alert.alert(
            'Summary',
            'No description was returned. Add ingredients or a clearer dish name, check that EXPO_PUBLIC_MENU_API_URL points to your backend, and try again.',
          );
        }
      } else {
        setSummaryError(res.error);
        Alert.alert('Generate summary failed', res.error);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      setSummaryError(msg);
      Alert.alert('Generate summary failed', msg);
    } finally {
      setSummaryLoading(false);
    }
  }, [dishId, commitCurrentFields, summary]);

  const onSaveDish = useCallback(async () => {
    if (!dishId || !scanId) return;
    if (!name.trim()) {
      Alert.alert('Dish name', 'Please enter a dish name.');
      return;
    }

    setSaving(true);
    try {
      const { amount, currency, display } = parsePriceToAmount(priceText);
      const result = await saveRestaurantDish({
        dishId,
        scanId,
        name: name.trim(),
        description: summary.trim().length ? summary.trim() : null,
        priceAmount: amount,
        priceCurrency: currency,
        priceDisplay: display,
        spiceLevel,
        tags,
        ingredients,
        touchScan: true,
      });
      if (!result.ok) {
        Alert.alert('Save failed', result.error);
        return;
      }
      router.replace({ pathname: '/restaurant-review-menu', params: { scanId } });
    } catch (e) {
      Alert.alert('Save failed', e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setSaving(false);
    }
  }, [dishId, scanId, ingredients, name, priceText, router, spiceLevel, summary, tags]);

  const spiceOptions: { level: SpiceLevel; label: string }[] = [
    { level: 0, label: 'None' },
    { level: 1, label: ' ' },
    { level: 2, label: ' ' },
    { level: 3, label: ' ' },
  ];

  return (
    <View style={styles.root}>
      <View style={[styles.headerWrap, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            onPress={() => router.back()}
            style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.85 }]}
          >
            <Text style={styles.backArrow}>←</Text>
          </Pressable>
          <Text style={styles.headerTitle} numberOfLines={1}>
            Add New Dish
          </Text>
          <View style={styles.headerRight} />
        </View>
      </View>

      {loading ? (
        <View style={styles.centerBlock}>
          <ActivityIndicator color={t.primary} />
          <Text style={{ marginTop: 12, ...Typography.body, color: Colors.textSecondary }}>Preparing dish…</Text>
        </View>
      ) : (
        <>
          <ScrollView
            style={styles.scroll}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 120 }]}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.section}>
              <Text style={styles.fieldLabel}>Dish Photo</Text>
              <View style={styles.photoPlaceholder}>
                {dishImageUrl ? (
                  <Image
                    source={{ uri: dishImageUrl }}
                    style={styles.photoImage}
                    accessibilityLabel={name || 'Dish photo'}
                  />
                ) : (
                  <MaterialCommunityIcons name="image-outline" size={48} color="#99A1AF" />
                )}
              </View>
              <View style={styles.photoButtonsRow}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Upload dish photo"
                  onPress={() => void onUploadPhoto()}
                  disabled={!dishId || uploadPhotoLoading || imageLoading}
                  style={({ pressed }) => [
                    styles.btnUpload,
                    (!dishId || uploadPhotoLoading || imageLoading) && styles.btnDisabled,
                    pressed && { opacity: 0.9 },
                  ]}
                >
                  {uploadPhotoLoading ? (
                    <ActivityIndicator color={Colors.text} />
                  ) : (
                    <Text style={styles.btnUploadText}>Upload Photo</Text>
                  )}
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Generate AI image for dish"
                  onPress={() => void onGenerateImage()}
                  disabled={!dishId || imageLoading}
                  style={({ pressed }) => [
                    styles.btnGenerateAi,
                    { backgroundColor: t.primary, borderColor: '#D1D5DC' },
                    !dishId && styles.btnDisabled,
                    pressed && { opacity: 0.92 },
                  ]}
                >
                  {imageLoading ? (
                    <ActivityIndicator color={Colors.white} />
                  ) : (
                    <Text style={styles.btnGenerateAiText}>Generate by AI</Text>
                  )}
                </Pressable>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.fieldLabel}>Dish Name</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="e.g., Spicy Chicken Tacos"
                placeholderTextColor="#6A7282"
                style={styles.input}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.fieldLabel}>Price</Text>
              <TextInput
                value={priceText}
                onChangeText={setPriceText}
                placeholder="e.g., $12"
                placeholderTextColor="#6A7282"
                style={styles.input}
                keyboardType="decimal-pad"
              />
            </View>

            <View style={styles.section}>
              <View style={styles.summaryHeaderRow}>
                <Text style={styles.fieldLabel}>Summary</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Generate AI summary"
                  onPress={() => void onGenerateSummary()}
                  disabled={!dishId || !scanId || summaryLoading}
                  style={({ pressed }) => [
                    styles.summaryAiPill,
                    { backgroundColor: t.primary },
                    (!dishId || !scanId || summaryLoading) && { opacity: 0.5 },
                    pressed && { opacity: 0.9 },
                  ]}
                >
                  <Text style={styles.summaryAiPillText}>{summaryLoading ? '…' : 'Generate by AI'}</Text>
                </Pressable>
              </View>
              <TextInput
                value={summary}
                onChangeText={setSummary}
                placeholder="Brief description of the dish..."
                placeholderTextColor="#6A7282"
                style={[styles.input, styles.summaryInput]}
                multiline
                textAlignVertical="top"
              />
              {summaryError ? <Text style={styles.errorText}>{summaryError}</Text> : null}
            </View>

            <View style={styles.section}>
              <Text style={styles.fieldLabel}>Spice Level</Text>
              <View style={styles.spiceRow}>
                {spiceOptions.map((opt) => {
                  const active = spiceLevel === opt.level;
                  const iconCount = opt.level === 0 ? 0 : opt.level;
                  return (
                    <Pressable
                      key={opt.level}
                      accessibilityRole="button"
                      onPress={() => setSpiceLevel(opt.level)}
                      style={({ pressed }) => [
                        styles.spiceCell,
                        active
                          ? { backgroundColor: t.primaryDark, borderColor: t.primaryDark }
                          : { backgroundColor: '#FFFFFF', borderColor: '#99A1AF' },
                        pressed && { opacity: 0.88 },
                      ]}
                    >
                      {opt.level === 0 ? (
                        <Text style={[styles.spiceNoneText, active && { color: Colors.white }]}>None</Text>
                      ) : (
                        <Text style={[styles.spiceFireText, active && { opacity: 1 }]}>{'🔥'.repeat(iconCount)}</Text>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.fieldLabel}>Ingredients</Text>
              <TextInput
                value={ingredientsText}
                onChangeText={setIngredientsText}
                placeholder="Comma-separated ingredients..."
                placeholderTextColor="#6A7282"
                style={[styles.input, styles.ingredientsInput]}
                multiline
                textAlignVertical="top"
              />
              <Text style={styles.ingredientsHint}>Separate ingredients with commas</Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.fieldLabel}>AI Generated Tags (optional)</Text>
              <TextInput
                value={tagsText}
                onChangeText={setTagsText}
                placeholder="Comma-separated tags"
                placeholderTextColor="#6A7282"
                style={styles.input}
              />
            </View>

            {imageError ? <Text style={styles.errorText}>{imageError}</Text> : null}
          </ScrollView>

          <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            <PrimaryButton
              text="Save Dish"
              onPress={() => void onSaveDish()}
              loading={saving}
              disabled={saving}
              accentColor={t.primary}
              accentShadowRgb={t.shadowRgb}
              style={styles.saveBtn}
            />
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.white },
  headerWrap: {
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  backBtn: {
    minWidth: 32,
    height: 32,
    paddingHorizontal: 6,
    borderRadius: 9999,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: {
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 27,
    letterSpacing: -0.44,
    color: Colors.text,
  },
  headerTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 24,
    letterSpacing: -0.31,
    color: Colors.text,
    textAlign: 'center',
  },
  headerRight: { width: 32 },
  centerBlock: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 20,
    gap: 20,
  },
  section: {
    gap: 8,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 21,
    letterSpacing: -0.15,
    color: Colors.text,
  },
  photoPlaceholder: {
    height: 160,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  photoImage: { width: '100%', height: '100%' },
  photoButtonsRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  btnUpload: {
    flex: 133,
    height: 40,
    borderRadius: 14,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: '#D1D5DC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnUploadText: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 21,
    letterSpacing: -0.15,
    color: Colors.text,
  },
  btnGenerateAi: {
    flex: 178,
    height: 40,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnGenerateAiText: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 21,
    letterSpacing: -0.15,
    color: Colors.white,
  },
  btnDisabled: { opacity: 0.45 },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: '#D1D5DC',
    borderRadius: 14,
    paddingHorizontal: 12,
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: -0.15,
    color: Colors.text,
    backgroundColor: Colors.white,
  },
  summaryHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 24.5,
  },
  summaryAiPill: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
    minWidth: 105,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryAiPillText: {
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 16,
    letterSpacing: 0.064,
    color: Colors.white,
  },
  summaryInput: {
    height: 89,
    paddingTop: 12,
    paddingBottom: 12,
  },
  spiceRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
  },
  spiceCell: {
    flex: 1,
    height: 41,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  spiceNoneText: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 21,
    letterSpacing: -0.15,
    color: Colors.text,
  },
  spiceFireText: {
    fontSize: 14,
    lineHeight: 21,
    opacity: 0.85,
  },
  ingredientsInput: {
    height: 110,
    paddingTop: 12,
    paddingBottom: 12,
  },
  ingredientsHint: {
    fontSize: 12,
    lineHeight: 18,
    color: '#6A7282',
    marginTop: 4,
  },
  errorText: { ...Typography.captionMedium, color: Colors.error, marginTop: 4 },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 24,
    paddingTop: 21,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  saveBtn: {
    height: 56,
    borderRadius: 14,
    width: '100%',
  },
});
