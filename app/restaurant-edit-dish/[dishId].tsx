import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/PrimaryButton';
import { restaurantRoleTheme } from '@/constants/role-theme';
import { Colors, Typography } from '@/constants/theme';
import { useGuardActiveRole } from '@/hooks/use-guard-active-role';
import { MAX_DISH_INGREDIENT_ORIGIN_LEN, parseIngredientItemsFromDb } from '@/lib/restaurant-ingredient-items';
import { supabase } from '@/lib/supabase';
import { generateRestaurantDishImage } from '@/lib/restaurant-dish-image-api';
import { pickAndUploadRestaurantDishPhoto } from '@/lib/restaurant-dish-photo-upload';
import { generateRestaurantDishSummary } from '@/lib/restaurant-dish-summary-api';
import { saveRestaurantDish } from '@/lib/restaurant-menu-dishes';

type SpiceLevel = 0 | 1 | 2 | 3;

const t = restaurantRoleTheme;

function parsePriceToAmount(input: string): { amount: number | null; currency: string; display: string | null } {
  const raw = input.trim();
  if (!raw) return { amount: null, currency: 'USD', display: null };

  let currency = 'USD';
  if (raw.includes('$')) currency = 'USD';
  else if (raw.includes('€')) currency = 'EUR';
  else if (raw.includes('£')) currency = 'GBP';
  else if (raw.includes('¥')) currency = 'JPY';

  const numeric = raw.replace(/[^0-9.,-]/g, '').replace(/,/g, '');
  const n = Number(numeric);
  return { amount: Number.isFinite(n) ? n : null, currency, display: raw };
}

function newIngredientRowId(): string {
  return globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function'
    ? globalThis.crypto.randomUUID()
    : `ing-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

type IngredientFormRow = { id: string; name: string; origin: string };

function parseTagsText(input: string): string[] {
  return input
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export default function RestaurantEditDishScreen() {
  useGuardActiveRole('restaurant');
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ dishId?: string; scanId?: string | string[] }>();

  const dishId = params.dishId ? String(params.dishId) : null;
  const scanIdRaw = params.scanId;
  const scanId = Array.isArray(scanIdRaw) ? scanIdRaw[0] : scanIdRaw ? String(scanIdRaw) : null;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dishImageUrl, setDishImageUrl] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [priceText, setPriceText] = useState('');
  const [summary, setSummary] = useState('');
  const [ingredientRows, setIngredientRows] = useState<IngredientFormRow[]>([]);
  const [tagsText, setTagsText] = useState('');
  const [spiceLevel, setSpiceLevel] = useState<SpiceLevel>(0);

  const [imageLoading, setImageLoading] = useState(false);
  const [uploadPhotoLoading, setUploadPhotoLoading] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  useEffect(() => {
    if (!dishId) return;
    let cancelled = false;
    void (async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('restaurant_menu_dishes')
          .select(
            'id, name, description, price_amount, price_currency, price_display, spice_level, tags, ingredients, ingredient_items, image_url',
          )
          .eq('id', dishId)
          .maybeSingle();
        if (error) throw error;
        if (!data) {
          if (!cancelled) Alert.alert('Dish not found');
          return;
        }
        if (cancelled) return;

        setDishImageUrl(data.image_url ?? null);
        setName(data.name ?? '');
        setSummary(data.description ?? '');
        setSpiceLevel((data.spice_level ?? 0) as SpiceLevel);

        const priceDisplay = data.price_display ?? (data.price_amount != null ? `$${data.price_amount}` : '');
        setPriceText(priceDisplay ?? '');

        const rawItems = parseIngredientItemsFromDb(
          (data as { ingredient_items?: unknown }).ingredient_items,
        );
        const legacy = Array.isArray(data.ingredients) ? (data.ingredients as string[]) : [];
        const rows: IngredientFormRow[] =
          rawItems.length > 0
            ? rawItems.map((it) => ({
                id: newIngredientRowId(),
                name: it.name,
                origin: it.origin ?? '',
              }))
            : legacy.map((n) => ({
                id: newIngredientRowId(),
                name: typeof n === 'string' ? n : String(n),
                origin: '',
              }));
        setIngredientRows(rows);

        const tags = Array.isArray(data.tags) ? data.tags : [];
        setTagsText(tags.join(', '));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [dishId]);

  const tags = useMemo(() => parseTagsText(tagsText), [tagsText]);

  const ingredientItemsForSave = useMemo(
    () => ingredientRows.map((r) => ({ name: r.name, origin: r.origin.trim() ? r.origin.trim() : null })),
    [ingredientRows],
  );

  const addIngredientRow = useCallback(() => {
    setIngredientRows((prev) => [...prev, { id: newIngredientRowId(), name: '', origin: '' }]);
  }, []);

  const removeIngredientRow = useCallback((id: string) => {
    setIngredientRows((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const patchIngredientRow = useCallback((id: string, patch: Partial<Pick<IngredientFormRow, 'name' | 'origin'>>) => {
    setIngredientRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }, []);

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
    if (!scanId) {
      Alert.alert('Missing context', 'scanId is required for generating dish AI outputs.');
      return;
    }
    setImageError(null);
    setImageLoading(true);
    try {
      const { amount, currency, display } = parsePriceToAmount(priceText);
      const saved = await saveRestaurantDish({
        dishId,
        scanId,
        name: name.trim(),
        description: summary.trim().length ? summary.trim() : null,
        priceAmount: amount,
        priceCurrency: currency,
        priceDisplay: display,
        spiceLevel,
        tags,
        ingredientItems: ingredientItemsForSave,
        touchScan: false,
      });
      if (!saved.ok) {
        setImageError(saved.error);
        Alert.alert('Could not save dish', saved.error);
        return;
      }

      const res = await generateRestaurantDishImage(dishId);
      if (res.ok) setDishImageUrl(res.imageUrl);
      else {
        setImageError(res.error);
        Alert.alert('Generate image failed', res.error);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      setImageError(msg);
      Alert.alert('Generate image failed', msg);
    } finally {
      setImageLoading(false);
    }
  }, [dishId, scanId, ingredientItemsForSave, name, priceText, spiceLevel, summary, tags]);

  const onGenerateSummary = useCallback(async () => {
    if (!dishId) return;
    setSummaryError(null);
    setSummaryLoading(true);
    try {
      if (!scanId) {
        Alert.alert('Missing context', 'scanId is required for generating dish AI outputs.');
        return;
      }

      const { amount, currency, display } = parsePriceToAmount(priceText);
      const saved = await saveRestaurantDish({
        dishId,
        scanId,
        name: name.trim(),
        description: summary.trim().length ? summary.trim() : null,
        priceAmount: amount,
        priceCurrency: currency,
        priceDisplay: display,
        spiceLevel,
        tags,
        ingredientItems: ingredientItemsForSave,
        touchScan: false,
      });
      if (!saved.ok) {
        setSummaryError(saved.error);
        Alert.alert('Could not save dish', saved.error);
        return;
      }

      const res = await generateRestaurantDishSummary(dishId);
      if (res.ok) {
        const next = (res.description ?? '').trim();
        setSummary(next);
        if (!next) {
          Alert.alert(
            'Summary',
            'No description was returned. Add ingredients or a clearer dish name, check EXPO_PUBLIC_MENU_API_URL, and try again.',
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
  }, [dishId, scanId, ingredientItemsForSave, name, priceText, spiceLevel, summary, tags]);

  const onSaveDish = useCallback(async () => {
    if (!dishId || !scanId) {
      Alert.alert('Missing context', 'Dish scanId is required to save.');
      return;
    }
    if (!name.trim()) {
      Alert.alert('Dish name', 'Please enter a dish name.');
      return;
    }
    const { amount, currency, display } = parsePriceToAmount(priceText);

    setSaving(true);
    try {
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
        ingredientItems: ingredientItemsForSave,
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
  }, [dishId, scanId, ingredientItemsForSave, name, priceText, router, spiceLevel, summary, tags]);

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
            Edit Dish
          </Text>
          <View style={styles.headerRight} />
        </View>
      </View>

      {loading ? (
        <View style={styles.centerBlock}>
          <ActivityIndicator color={t.primary} />
          <Text style={{ marginTop: 12, ...Typography.body, color: Colors.textSecondary }}>Loading dish…</Text>
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
                  disabled={!dishId || summaryLoading}
                  style={({ pressed }) => [
                    styles.summaryAiPill,
                    { backgroundColor: t.primary },
                    (!dishId || summaryLoading) && { opacity: 0.5 },
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
              <Text style={styles.ingredientsIntro}>
                Add each ingredient and optionally its origin (max {MAX_DISH_INGREDIENT_ORIGIN_LEN} characters).
              </Text>
              {ingredientRows.map((row) => (
                <View key={row.id} style={styles.ingredientRowCard}>
                  <View style={styles.ingredientRowHeader}>
                    <Text style={styles.ingredientRowHeading}>Item</Text>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Remove ingredient row"
                      onPress={() => removeIngredientRow(row.id)}
                      hitSlop={10}
                    >
                      <Text style={styles.removeIngredient}>Remove</Text>
                    </Pressable>
                  </View>
                  <Text style={styles.subFieldLabel}>Name</Text>
                  <TextInput
                    value={row.name}
                    onChangeText={(t) => patchIngredientRow(row.id, { name: t })}
                    placeholder="e.g. Tomatoes"
                    placeholderTextColor="#6A7282"
                    style={styles.input}
                  />
                  <Text style={styles.subFieldLabel}>Origin (optional)</Text>
                  <TextInput
                    value={row.origin}
                    onChangeText={(t) => patchIngredientRow(row.id, { origin: t })}
                    placeholder="Farm, region, or supplier"
                    placeholderTextColor="#6A7282"
                    style={styles.input}
                    maxLength={MAX_DISH_INGREDIENT_ORIGIN_LEN}
                  />
                  <Text style={styles.originCounter}>
                    {row.origin.length}/{MAX_DISH_INGREDIENT_ORIGIN_LEN}
                  </Text>
                </View>
              ))}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Add ingredient row"
                onPress={addIngredientRow}
                style={({ pressed }) => [styles.addIngredientBtn, pressed && { opacity: 0.88 }]}
              >
                <Text style={styles.addIngredientBtnText}>+ Add ingredient</Text>
              </Pressable>
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
  ingredientsIntro: {
    fontSize: 12,
    lineHeight: 18,
    color: '#6A7282',
    marginBottom: 10,
  },
  ingredientRowCard: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    backgroundColor: '#FAFAFA',
  },
  ingredientRowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  ingredientRowHeading: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
  },
  subFieldLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6A7282',
    marginBottom: 4,
    marginTop: 8,
  },
  removeIngredient: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.error,
  },
  originCounter: {
    fontSize: 11,
    color: '#6A7282',
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  addIngredientBtn: {
    marginTop: 4,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: t.primary,
    backgroundColor: Colors.white,
  },
  addIngredientBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: t.primary,
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
