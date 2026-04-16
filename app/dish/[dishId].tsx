import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { dinerRoleTheme } from '@/constants/role-theme';
import { BorderRadius, Colors, Typography } from '@/constants/theme';
import {
  DISH_INGREDIENT_ORIGIN_NOT_SPECIFIED,
  parseIngredientItemsFromDb,
  type DishIngredientItem,
} from '@/lib/restaurant-ingredient-items';
import { useGuardActiveRole } from '@/hooks/use-guard-active-role';
import { generateDishImage } from '@/lib/dish-image-api';
import type { DinerPreferenceSnapshot } from '@/lib/diner-preferences';
import { fetchDinerPreferences, spiceDbToLabel } from '@/lib/diner-preferences';
import {
  isDishFavorited,
  toggleDishFavorite,
  fetchFavoriteNote,
  upsertFavoriteNote,
  NOTE_MAX_LENGTH,
} from '@/lib/diner-favorites';
import type { DinerScannedDishRow } from '@/lib/menu-scan-schema';
import { supabase } from '@/lib/supabase';

const FIG = {
  text: '#101828',
  sub: '#475467',
  muted: '#667085',
  border: '#EAECF0',
  cardBg: '#F8FAFC',
  heroBg: '#F5F5F5',
  price: '#FF6B35',
  flameOff: '#D0D5DD',
  greenBg: '#ECFDF3',
  greenBorder: '#ABEFC6',
  greenText: '#027A48',
  tagBg: '#FFF4ED',
  tagText: '#C2410C',
} as const;

const DIETARY_TAGS = new Set([
  'vegetarian',
  'vegan',
  'gluten-free',
  'gluten free',
  'dairy-free',
  'dairy free',
  'halal',
  'kosher',
  'nut-free',
  'nut free',
  'pescatarian',
]);

const PRICE_SYMBOL: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  CNY: '¥',
  JPY: '¥',
};

type DishDetail = {
  id: string;
  restaurantName: string | null;
  name: string;
  priceAmount: number | null;
  priceCurrency: string;
  priceDisplay: string | null;
  imageUrl: string | null;
  spiceLevel: 0 | 1 | 2 | 3;
  flavorTags: string[];
  dietaryIndicators: string[];
  ingredients: string[];
  /** Partner QR copies with structured ingredients */
  ingredientItems: DishIngredientItem[];
  summary: string;
  description: string | null;
};

function titleize(label: string): string {
  return label
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function deriveFlavorTags(tags: string[], spiceLevel: 0 | 1 | 2 | 3, description: string | null): string[] {
  const cleaned = tags
    .map((tag) => tag.trim())
    .filter(Boolean)
    .filter((tag) => !DIETARY_TAGS.has(tag.toLowerCase()))
    .filter((tag) => !/^\$+$/.test(tag));

  const out = new Set(cleaned.map(titleize));
  const desc = description?.toLowerCase() ?? '';

  if (spiceLevel >= 2) out.add('Spicy');
  if (!out.size && /savory|umami|broth|garlic|soy/.test(desc)) out.add('Savory');
  if (!out.size && /crispy|fried|crunch/.test(desc)) out.add('Crispy');
  if (!out.size && /sweet/.test(desc)) out.add('Sweet');

  return Array.from(out).slice(0, 5);
}

function deriveDietaryIndicators(tags: string[]): string[] {
  return Array.from(
    new Set(
      tags
        .map((tag) => tag.trim())
        .filter(Boolean)
        .filter((tag) => DIETARY_TAGS.has(tag.toLowerCase()))
        .map(titleize)
    )
  );
}

function formatPrice(amount: number | null, currency: string, display: string | null): string {
  if (display?.trim()) return display.trim();
  if (amount === null) return '—';
  const symbol = PRICE_SYMBOL[currency] ?? '';
  const formatted =
    Number.isInteger(amount) || Math.abs(amount - Math.round(amount)) < 1e-9
      ? `${Math.round(amount)}`
      : amount.toFixed(2).replace(/\.00$/, '');
  return symbol ? `${symbol}${formatted}` : `${formatted} ${currency}`;
}

function inferBudgetTier(amount: number | null): '$' | '$$' | '$$$' | '$$$$' | null {
  if (amount === null) return null;
  if (amount <= 12) return '$';
  if (amount <= 20) return '$$';
  if (amount <= 35) return '$$$';
  return '$$$$';
}

function buildFallbackSummary(input: {
  name: string;
  description: string | null;
  flavorTags: string[];
  ingredients: string[];
  spiceLevel: 0 | 1 | 2 | 3;
}): string {
  if (input.description?.trim()) return input.description.trim();

  if (input.flavorTags.length === 0 && input.ingredients.length === 0) {
    return 'Information not available';
  }

  const parts: string[] = [];
  if (input.flavorTags.length > 0) {
    parts.push(`A ${input.flavorTags.slice(0, 2).join(' and ').toLowerCase()} dish`);
  }

  if (input.ingredients.length > 0) {
    parts.push(`made with ${input.ingredients.slice(0, 3).join(', ')}`);
  }

  if (input.spiceLevel > 0) {
    const spiceLabel = input.spiceLevel === 1 ? 'a mild kick' : input.spiceLevel === 2 ? 'noticeable heat' : 'bold heat';
    parts.push(`with ${spiceLabel}`);
  }

  return `${parts.join(' ')}.`.replace(/\s+\./g, '.');
}

function buildWhyThisMatchesYou(detail: DishDetail, prefs: DinerPreferenceSnapshot | null): string[] {
  if (!prefs) return [];

  const reasons: string[] = [];
  const flavorSet = new Set(detail.flavorTags.map((tag) => tag.toLowerCase()));
  const dietarySet = new Set(detail.dietaryIndicators.map((tag) => tag.toLowerCase()));
  const ingredientSet = new Set(detail.ingredients.map((item) => item.toLowerCase()));

  const spicePref = spiceDbToLabel(prefs.spice_level)?.toLowerCase();
  if (spicePref && detail.spiceLevel > 0) {
    reasons.push(`Matches your ${spicePref} spice preference.`);
  }

  const budget = inferBudgetTier(detail.priceAmount);
  if (prefs.budget_tier && budget && prefs.budget_tier === budget) {
    reasons.push(`Fits within your ${budget} budget preference.`);
  }

  const smartTagMatch = prefs.smartTags.find((tag) => {
    const label = tag.label.toLowerCase();
    return flavorSet.has(label) || ingredientSet.has(label);
  });
  if (smartTagMatch) {
    reasons.push(`Lines up with your preference for ${smartTagMatch.label.toLowerCase()}.`);
  }

  const dietaryMatch = prefs.dietaryKeys.find((key) => dietarySet.has(key.toLowerCase()));
  if (dietaryMatch) {
    reasons.push(`Supports your ${dietaryMatch.toLowerCase()} preference.`);
  }

  const cuisineMatch = prefs.cuisineNames.find((cuisine) => flavorSet.has(cuisine.toLowerCase()));
  if (cuisineMatch) {
    reasons.push(`Matches the ${cuisineMatch} flavors you tend to pick.`);
  }

  return reasons.slice(0, 3);
}

export default function DishDetailScreen() {
  useGuardActiveRole('diner');
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    dishId?: string | string[];
    scanId?: string | string[];
    restaurantName?: string | string[];
  }>();

  const dishIdRaw = params.dishId;
  const dishId = Array.isArray(dishIdRaw) ? dishIdRaw[0] : dishIdRaw;
  const scanIdRaw = params.scanId;
  const scanId = Array.isArray(scanIdRaw) ? scanIdRaw[0] : scanIdRaw;
  const restaurantParamRaw = params.restaurantName;
  const restaurantParam = Array.isArray(restaurantParamRaw) ? restaurantParamRaw[0] : restaurantParamRaw;

  const [detail, setDetail] = useState<DishDetail | null>(null);
  const [prefs, setPrefs] = useState<DinerPreferenceSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [favorite, setFavorite] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [noteInput, setNoteInput] = useState('');
  const [editingNote, setEditingNote] = useState(false);
  const [savingNote, setSavingNote] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!dishId) {
        setError('Dish not found.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const prefSnap = await fetchDinerPreferences();

        const { data: dishRow, error: dishErr } = await supabase
          .from('diner_scanned_dishes')
          .select(
            'id, section_id, name, description, price_amount, price_currency, price_display, spice_level, tags, ingredients, ingredient_items, image_url',
          )
          .eq('id', dishId)
          .maybeSingle();
        if (dishErr) throw dishErr;
        if (!dishRow) throw new Error('Dish not found');

        const typedRow = dishRow as Pick<
          DinerScannedDishRow,
          | 'id'
          | 'section_id'
          | 'name'
          | 'description'
          | 'price_amount'
          | 'price_currency'
          | 'price_display'
          | 'spice_level'
          | 'tags'
          | 'ingredients'
          | 'ingredient_items'
          | 'image_url'
        >;

        let resolvedScanId = scanId?.trim() || null;
        let restaurantName = restaurantParam?.trim() || null;

        if (!resolvedScanId) {
          const { data: sectionRow, error: sectionErr } = await supabase
            .from('diner_menu_sections')
            .select('scan_id')
            .eq('id', typedRow.section_id)
            .maybeSingle();
          if (sectionErr) throw sectionErr;
          resolvedScanId = sectionRow?.scan_id ?? null;
        }

        if (!restaurantName && resolvedScanId) {
          const { data: scanRow, error: scanErr } = await supabase
            .from('diner_menu_scans')
            .select('restaurant_name')
            .eq('id', resolvedScanId)
            .maybeSingle();
          if (scanErr) throw scanErr;
          restaurantName = scanRow?.restaurant_name?.trim() || null;
        }

        const flavorTags = deriveFlavorTags(typedRow.tags ?? [], typedRow.spice_level ?? 0, typedRow.description);
        const dietaryIndicators = deriveDietaryIndicators(typedRow.tags ?? []);
        const ingredients = Array.isArray(typedRow.ingredients) ? typedRow.ingredients : [];
        const ingredientItems = parseIngredientItemsFromDb(typedRow.ingredient_items);
        const summary = buildFallbackSummary({
          name: typedRow.name,
          description: typedRow.description,
          flavorTags,
          ingredients,
          spiceLevel: typedRow.spice_level ?? 0,
        });

        if (cancelled) return;

        setPrefs(prefSnap);
        setImageLoading(false);
        setImageError(null);
        setDetail({
          id: typedRow.id,
          restaurantName,
          name: typedRow.name,
          priceAmount: typedRow.price_amount,
          priceCurrency: typedRow.price_currency || 'USD',
          priceDisplay: typedRow.price_display,
          imageUrl: typedRow.image_url,
          spiceLevel: typedRow.spice_level ?? 0,
          flavorTags,
          dietaryIndicators,
          ingredients,
          ingredientItems,
          summary,
          description: typedRow.description,
        });

        try {
          const fav = await isDishFavorited(typedRow.id);
          if (!cancelled) setFavorite(fav);
          if (fav && !cancelled) {
            try {
              const existingNote = await fetchFavoriteNote(typedRow.id);
              if (!cancelled) setNote(existingNote);
            } catch {
              // non-critical — note load failure doesn't block the page
            }
          }
        } catch {
          if (!cancelled) setFavorite(false);
        }
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Failed to load dish.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [dishId, restaurantParam, scanId]);

  const reasons = useMemo(() => {
    if (!detail) return [];
    return buildWhyThisMatchesYou(detail, prefs);
  }, [detail, prefs]);

  const onGenerateImage = async () => {
    if (!detail || detail.imageUrl || imageLoading) return;

    setImageError(null);
    setImageLoading(true);
    const result = await generateDishImage(detail.id);
    if (result.ok) {
      setDetail((prev) => (prev ? { ...prev, imageUrl: result.imageUrl } : prev));
    } else {
      setImageError('Unable to generate AI image right now.');
    }
    setImageLoading(false);
  };

  const paddedTop = insets.top + 10;

  return (
    <View style={styles.root}>
      <View
        style={[
          styles.header,
          {
            paddingTop: paddedTop,
          },
        ]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back to menu"
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]}
        >
          <MaterialCommunityIcons name="chevron-left" size={24} color={FIG.text} />
        </Pressable>
        <Text numberOfLines={1} style={styles.headerTitle}>
          {detail?.restaurantName?.trim() || 'Dish details'}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.stateBlock}>
            <ActivityIndicator color={dinerRoleTheme.primary} />
            <Text style={styles.stateText}>Loading dish details…</Text>
          </View>
        ) : error || !detail ? (
          <View style={styles.stateBlock}>
            <Text style={styles.errorText}>{error ?? 'Dish not found.'}</Text>
          </View>
        ) : (
          <>
            {detail.imageUrl ? (
              <Image
                source={{ uri: detail.imageUrl }}
                contentFit="cover"
                style={styles.heroImage}
                accessibilityLabel={detail.name}
              />
            ) : (
              <View style={styles.heroPlaceholder}>
                {imageLoading ? (
                  <>
                    <ActivityIndicator color={dinerRoleTheme.primary} />
                    <Text style={styles.heroPlaceholderText}>Generating dish preview…</Text>
                  </>
                ) : (
                  <>
                    <MaterialCommunityIcons name="silverware-fork-knife" size={36} color={FIG.muted} />
                    <Text style={styles.heroPlaceholderText}>Dish image not available</Text>
                  </>
                )}
              </View>
            )}

            <View style={styles.contentCard}>
              {!detail.imageUrl && (
                <View style={styles.imageActionBlock}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Generate AI image for this dish"
                    disabled={imageLoading}
                    onPress={() => void onGenerateImage()}
                    style={({ pressed }) => [
                      styles.aiImageButton,
                      imageLoading && styles.aiImageButtonDisabled,
                      pressed && !imageLoading && styles.aiImageButtonPressed,
                    ]}
                  >
                    {imageLoading ? (
                      <View style={styles.aiImageButtonLoading}>
                        <ActivityIndicator color={Colors.white} />
                        <Text style={styles.aiImageButtonText}>Generating...</Text>
                      </View>
                    ) : (
                      <Text style={styles.aiImageButtonText}>View AI Image</Text>
                    )}
                  </Pressable>
                  {imageError ? <Text style={styles.imageErrorText}>{imageError}</Text> : null}
                </View>
              )}

              <View style={styles.titleRow}>
                <View style={styles.titleCol}>
                  <Text style={styles.dishName}>{detail.name}</Text>
                  <Text style={styles.priceText}>
                    {formatPrice(detail.priceAmount, detail.priceCurrency, detail.priceDisplay)}
                  </Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={favorite ? 'Remove from favorites' : 'Add to favorites'}
                  onPress={() => {
                    void (async () => {
                      try {
                        const next = await toggleDishFavorite(detail.id);
                        setFavorite(next);
                        if (!next) {
                          setNote(null);
                          setNoteInput('');
                          setEditingNote(false);
                        }
                      } catch (err) {
                        Alert.alert(
                          'Favorites',
                          err instanceof Error ? err.message : 'Could not update favorite.'
                        );
                      }
                    })();
                  }}
                  style={({ pressed }) => [
                    styles.favoriteButton,
                    favorite && styles.favoriteButtonActive,
                    pressed && styles.favoriteButtonPressed,
                  ]}
                >
                  <MaterialCommunityIcons
                    name={favorite ? 'heart' : 'heart-outline'}
                    size={22}
                    color={favorite ? '#FFFFFF' : FIG.muted}
                  />
                </Pressable>
              </View>

              <View style={styles.metaRow}>
                <View style={styles.flameRow}>
                  {[0, 1, 2].map((i) => (
                    <MaterialCommunityIcons
                      key={i}
                      name="fire"
                      size={18}
                      color={i < detail.spiceLevel ? FIG.price : FIG.flameOff}
                    />
                  ))}
                </View>
              </View>

              <View style={styles.tagWrap}>
                {detail.flavorTags.length > 0 ? (
                  detail.flavorTags.map((tag) => (
                    <View key={tag} style={styles.tagPill}>
                      <Text style={styles.tagText}>{tag}</Text>
                    </View>
                  ))
                ) : (
                  <View style={styles.tagPillMuted}>
                    <Text style={styles.tagTextMuted}>Information not available</Text>
                  </View>
                )}
              </View>

              <Text style={styles.summaryText}>{detail.summary}</Text>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Dietary Indicators</Text>
                {detail.dietaryIndicators.length > 0 ? (
                  <View style={styles.tagWrap}>
                    {detail.dietaryIndicators.map((item) => (
                      <View key={item} style={styles.dietaryPill}>
                        <MaterialCommunityIcons name="leaf" size={14} color={FIG.greenText} />
                        <Text style={styles.dietaryText}>{item}</Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.placeholderText}>Information not available</Text>
                )}
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Key Ingredients</Text>
                <View style={styles.ingredientCard}>
                  {detail.ingredientItems.length > 0 ? (
                    detail.ingredientItems.map((item, idx) => {
                      const originShown = item.origin?.trim() ?? '';
                      return (
                        <View key={`${idx}-${item.name}`} style={styles.ingredientStructuredRow}>
                          <View style={styles.ingredientTitleRow}>
                            <View style={styles.ingredientDot} />
                            <Text style={styles.ingredientText}>{titleize(item.name)}</Text>
                          </View>
                          <Text
                            style={[
                              styles.ingredientOriginLine,
                              !originShown ? styles.ingredientOriginPlaceholder : null,
                            ]}
                          >
                            {originShown || DISH_INGREDIENT_ORIGIN_NOT_SPECIFIED}
                          </Text>
                        </View>
                      );
                    })
                  ) : detail.ingredients.length > 0 ? (
                    detail.ingredients.map((item) => (
                      <View key={item} style={styles.ingredientRow}>
                        <View style={styles.ingredientDot} />
                        <Text style={styles.ingredientText}>{titleize(item)}</Text>
                      </View>
                    ))
                  ) : (
                    <Text style={styles.placeholderText}>Information not available</Text>
                  )}
                </View>
              </View>

              {reasons.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Why this matches you</Text>
                  <View style={styles.reasonsWrap}>
                    {reasons.map((reason) => (
                      <View key={reason} style={styles.reasonCard}>
                        <MaterialCommunityIcons name="check-circle" size={18} color={FIG.greenText} />
                        <Text style={styles.reasonText}>{reason}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {favorite && (
                <View style={styles.section}>
                  <View style={styles.noteSectionHeader}>
                    <Text style={styles.sectionTitle}>My Note</Text>
                    {!editingNote && (
                      <Pressable
                        onPress={() => {
                          setNoteInput(note ?? '');
                          setEditingNote(true);
                        }}
                        style={({ pressed }) => [styles.noteEditButton, pressed && styles.favoriteButtonPressed]}
                        accessibilityRole="button"
                        accessibilityLabel={note ? 'Edit note' : 'Add note'}
                      >
                        <MaterialCommunityIcons name="pencil-outline" size={16} color={FIG.muted} />
                        <Text style={styles.noteEditButtonText}>{note ? 'Edit' : 'Add'}</Text>
                      </Pressable>
                    )}
                  </View>

                  {editingNote ? (
                    <View style={styles.noteEditWrap}>
                      <TextInput
                        value={noteInput}
                        onChangeText={setNoteInput}
                        placeholder="Add a private note…"
                        placeholderTextColor={FIG.muted}
                        style={[styles.noteInput, noteInput.length > NOTE_MAX_LENGTH && styles.noteInputError]}
                        multiline
                        maxLength={NOTE_MAX_LENGTH + 20}
                        autoFocus
                        accessibilityLabel="Note text input"
                      />
                      <View style={styles.noteEditFooter}>
                        <Text style={[styles.noteCharCount, noteInput.length > NOTE_MAX_LENGTH && styles.noteCharCountError]}>
                          {noteInput.length} / {NOTE_MAX_LENGTH}
                        </Text>
                        <View style={styles.noteEditButtons}>
                          <Pressable
                            onPress={() => {
                              setNoteInput(note ?? '');
                              setEditingNote(false);
                            }}
                            style={({ pressed }) => [styles.noteCancelButton, pressed && styles.favoriteButtonPressed]}
                            accessibilityRole="button"
                            accessibilityLabel="Cancel"
                          >
                            <Text style={styles.noteCancelText}>Cancel</Text>
                          </Pressable>
                          <Pressable
                            onPress={() => {
                              void (async () => {
                                if (noteInput.length > NOTE_MAX_LENGTH || savingNote) return;
                                setSavingNote(true);
                                try {
                                  await upsertFavoriteNote(detail.id, noteInput);
                                  setNote(noteInput.trim().length > 0 ? noteInput.trim() : null);
                                  setEditingNote(false);
                                } catch (err) {
                                  Alert.alert('Could not save note', err instanceof Error ? err.message : 'Unknown error');
                                } finally {
                                  setSavingNote(false);
                                }
                              })();
                            }}
                            disabled={savingNote || noteInput.length > NOTE_MAX_LENGTH}
                            style={({ pressed }) => [
                              styles.noteSaveButton,
                              (savingNote || noteInput.length > NOTE_MAX_LENGTH) && styles.noteSaveButtonDisabled,
                              pressed && styles.favoriteButtonPressed,
                            ]}
                            accessibilityRole="button"
                            accessibilityLabel="Save note"
                          >
                            <Text style={styles.noteSaveText}>{savingNote ? 'Saving…' : 'Save'}</Text>
                          </Pressable>
                        </View>
                      </View>
                    </View>
                  ) : note ? (
                    <View style={styles.noteSavedCard}>
                      <Text style={styles.noteSavedText}>{note}</Text>
                    </View>
                  ) : (
                    <Text style={styles.placeholderText}>No note yet. Tap Add to jot something down.</Text>
                  )}
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: FIG.border,
    shadowColor: '#101828',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 18,
    elevation: 3,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: FIG.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  backButtonPressed: {
    opacity: 0.82,
  },
  headerTitle: {
    flex: 1,
    marginHorizontal: 12,
    textAlign: 'center',
    ...Typography.bodyMedium,
    fontWeight: '700',
    color: FIG.text,
  },
  headerSpacer: {
    width: 40,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  stateBlock: {
    paddingTop: 80,
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 24,
  },
  stateText: {
    ...Typography.body,
    color: FIG.sub,
  },
  errorText: {
    ...Typography.body,
    color: Colors.error,
    textAlign: 'center',
  },
  heroImage: {
    width: '100%',
    aspectRatio: 1.12,
    backgroundColor: FIG.heroBg,
  },
  heroPlaceholder: {
    width: '100%',
    aspectRatio: 1.12,
    backgroundColor: FIG.heroBg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  heroPlaceholderText: {
    ...Typography.caption,
    color: FIG.muted,
  },
  contentCard: {
    paddingHorizontal: 20,
    paddingTop: 22,
    gap: 20,
  },
  imageActionBlock: {
    gap: 10,
  },
  aiImageButton: {
    height: 48,
    borderRadius: BorderRadius.base,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: dinerRoleTheme.primary,
    paddingHorizontal: 16,
  },
  aiImageButtonPressed: {
    opacity: 0.92,
  },
  aiImageButtonDisabled: {
    opacity: 0.7,
  },
  aiImageButtonText: {
    ...Typography.button,
    color: Colors.white,
  },
  aiImageButtonLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  imageErrorText: {
    ...Typography.caption,
    color: Colors.error,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  titleCol: {
    flex: 1,
    gap: 8,
  },
  dishName: {
    ...Typography.headingSmall,
    color: FIG.text,
    fontSize: 28,
    lineHeight: 34,
  },
  priceText: {
    ...Typography.headingSmall,
    color: FIG.price,
    fontSize: 22,
    lineHeight: 28,
  },
  favoriteButton: {
    width: 44,
    height: 44,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: FIG.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  favoriteButtonActive: {
    backgroundColor: dinerRoleTheme.primary,
    borderColor: dinerRoleTheme.primary,
  },
  favoriteButtonPressed: {
    opacity: 0.88,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  flameRow: {
    flexDirection: 'row',
    gap: 2,
  },
  tagWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagPill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: FIG.tagBg,
    borderWidth: 1,
    borderColor: '#FFD6C2',
  },
  tagText: {
    ...Typography.captionMedium,
    color: FIG.tagText,
  },
  tagPillMuted: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: '#F2F4F7',
    borderWidth: 1,
    borderColor: FIG.border,
  },
  tagTextMuted: {
    ...Typography.caption,
    color: FIG.muted,
  },
  summaryText: {
    ...Typography.body,
    color: FIG.sub,
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    ...Typography.headingSmall,
    fontSize: 18,
    lineHeight: 24,
    color: FIG.text,
  },
  dietaryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: FIG.greenBg,
    borderWidth: 1,
    borderColor: FIG.greenBorder,
  },
  dietaryText: {
    ...Typography.captionMedium,
    color: FIG.greenText,
  },
  ingredientCard: {
    backgroundColor: FIG.cardBg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: FIG.border,
    padding: 16,
    gap: 10,
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  ingredientStructuredRow: {
    gap: 4,
  },
  ingredientTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  ingredientOriginLine: {
    ...Typography.caption,
    color: FIG.sub,
    marginLeft: 16,
    lineHeight: 18,
  },
  ingredientOriginPlaceholder: {
    color: FIG.muted,
    fontStyle: 'italic',
  },
  ingredientDot: {
    width: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: FIG.text,
    marginTop: 9,
  },
  ingredientText: {
    flex: 1,
    ...Typography.body,
    color: FIG.text,
  },
  placeholderText: {
    ...Typography.body,
    color: FIG.muted,
  },
  reasonsWrap: {
    gap: 10,
  },
  reasonCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: BorderRadius.lg,
    backgroundColor: FIG.greenBg,
    borderWidth: 1,
    borderColor: FIG.greenBorder,
  },
  reasonText: {
    flex: 1,
    ...Typography.body,
    color: FIG.greenText,
  },
  noteSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  noteEditButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: FIG.border,
  },
  noteEditButtonText: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: FIG.muted,
  },
  noteEditWrap: {
    gap: 8,
  },
  noteInput: {
    borderWidth: 1,
    borderColor: FIG.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    lineHeight: 20,
    color: FIG.text,
    backgroundColor: FIG.cardBg,
    minHeight: 80,
    textAlignVertical: 'top' as const,
  },
  noteInputError: {
    borderColor: Colors.error,
  },
  noteEditFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  noteCharCount: {
    fontSize: 12,
    lineHeight: 16,
    color: FIG.muted,
  },
  noteCharCountError: {
    color: Colors.error,
  },
  noteEditButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  noteCancelButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: FIG.border,
    backgroundColor: Colors.white,
  },
  noteCancelText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: FIG.sub,
  },
  noteSaveButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: dinerRoleTheme.primary,
  },
  noteSaveButtonDisabled: {
    opacity: 0.5,
  },
  noteSaveText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.white,
  },
  noteSavedCard: {
    backgroundColor: FIG.cardBg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: FIG.border,
    padding: 14,
  },
  noteSavedText: {
    fontSize: 14,
    lineHeight: 20,
    color: FIG.sub,
  },
});
