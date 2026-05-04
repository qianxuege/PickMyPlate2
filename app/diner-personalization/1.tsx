import { useEffect, useMemo, useRef, useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  BackButton,
  PreferenceInput,
  PreferencePill,
  PrimaryButton,
  ScreenContainer,
  SmartPreferenceTag,
} from '@/components';
import { BorderRadius, Colors, Spacing, Typography } from '@/constants/theme';
import {
  type BudgetTier,
  DIETARY_OPTIONS,
  fetchDinerPreferences,
  savePersonalizationFormPrefs,
  spiceDbToLabel,
} from '@/lib/diner-preferences';
import { getErrorMessage } from '@/lib/error-message';
import {
  type ParsedSmartTag,
  type SmartTagCategory,
  normalizeTagKey,
  parsePreferenceText,
} from '@/lib/parseSmartPreferences';

const SPICE_OPTIONS = ['Mild', 'Medium', 'Spicy'];

const BUDGET_TIERS: { tier: BudgetTier; hint: string; range: string }[] = [
  { tier: '$', hint: 'Budget-friendly', range: '$0–20' },
  { tier: '$$', hint: 'Moderate', range: '$20–40' },
  { tier: '$$$', hint: 'Upscale', range: '$40–60' },
  { tier: '$$$$', hint: 'Special occasion', range: '$60+' },
];

type CuisineItem = { name: string; emoji: string };

const CUISINES_INITIAL: CuisineItem[] = [
  { name: 'Chinese', emoji: '🍜' },
  { name: 'Italian', emoji: '🍕' },
  { name: 'Indian', emoji: '🍛' },
  { name: 'American', emoji: '🍔' },
  { name: 'Mexican', emoji: '🌮' },
  { name: 'Thai', emoji: '🌶️' },
];

const CUISINES_EXTRA: CuisineItem[] = [
  { name: 'Japanese', emoji: '🍣' },
  { name: 'Korean', emoji: '🥘' },
  { name: 'Vietnamese', emoji: '🍲' },
  { name: 'French', emoji: '🥐' },
  { name: 'Greek', emoji: '🫒' },
  { name: 'Spanish', emoji: '🥘' },
  { name: 'Mediterranean', emoji: '🫑' },
  { name: 'Middle Eastern', emoji: '🧆' },
  { name: 'Brazilian', emoji: '🥩' },
  { name: 'Ethiopian', emoji: '🍛' },
];

const ALL_CUISINES: CuisineItem[] = [...CUISINES_INITIAL, ...CUISINES_EXTRA];

type StoredSmartTag = ParsedSmartTag & { id: string };

const POPULAR: { phrase: string; label: string; category: SmartTagCategory }[] = [
  { phrase: 'No cilantro', label: 'No Cilantro', category: 'dislike' },
  { phrase: 'Loves spicy', label: 'Loves Spicy Food', category: 'like' },
  { phrase: 'Vegetarian-friendly', label: 'Vegetarian-friendly', category: 'preference' },
];

function cuisineLabel(item: CuisineItem) {
  return `${item.emoji} ${item.name}`;
}

export default function DinerPersonalizationScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [dietary, setDietary] = useState<string[]>([]);
  const [spice, setSpice] = useState<string | null>(null);
  const [budgetTier, setBudgetTier] = useState<BudgetTier | null>(null);
  const [prefsLoading, setPrefsLoading] = useState(true);
  const [continueLoading, setContinueLoading] = useState(false);
  const [cuisines, setCuisines] = useState<string[]>([]);
  const [cuisinesExpanded, setCuisinesExpanded] = useState(false);
  const [cuisineQuery, setCuisineQuery] = useState('');
  const [smartTags, setSmartTags] = useState<StoredSmartTag[]>([]);
  const [draftText, setDraftText] = useState('');
  const [debouncedDraft, setDebouncedDraft] = useState('');
  const [pulseIds, setPulseIds] = useState<Set<string>>(new Set());
  const [showAddedHint, setShowAddedHint] = useState(false);
  const pulseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const addedHintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const id = setTimeout(() => setDebouncedDraft(draftText), 320);
    return () => clearTimeout(id);
  }, [draftText]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const snap = await fetchDinerPreferences();
        if (cancelled) return;
        if (!snap) {
          return;
        }
        const bt = snap.budget_tier;
        if (bt === '$' || bt === '$$' || bt === '$$$' || bt === '$$$$') {
          setBudgetTier(bt);
        }
        const sl = spiceDbToLabel(snap.spice_level);
        if (sl) setSpice(sl);
        setDietary(snap.dietaryKeys);
        setCuisines(snap.cuisineNames);
        setSmartTags(
          snap.smartTags.map((t) => ({
            id: t.id,
            label: t.label,
            category: t.category,
          }))
        );
      } catch {
        /* keep local defaults */
      } finally {
        if (!cancelled) setPrefsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const liveParsed = useMemo(() => parsePreferenceText(debouncedDraft), [debouncedDraft]);

  const previewTags = useMemo(() => {
    const committed = new Set(smartTags.map((t) => normalizeTagKey(t.label, t.category)));
    return liveParsed.filter((t) => !committed.has(normalizeTagKey(t.label, t.category)));
  }, [liveParsed, smartTags]);

  const toggleMulti = (value: string, selected: string[], setSelected: (v: string[]) => void) => {
    if (selected.includes(value)) {
      setSelected(selected.filter((s) => s !== value));
    } else {
      setSelected([...selected, value]);
    }
  };

  const toggleSingle = (
    value: string,
    selected: string | null,
    setSelected: (v: string | null) => void
  ) => {
    setSelected(selected === value ? null : value);
  };

  const flashNewTags = (ids: string[]) => {
    if (ids.length === 0) return;
    setPulseIds(new Set(ids));
    if (pulseTimerRef.current) clearTimeout(pulseTimerRef.current);
    pulseTimerRef.current = setTimeout(() => setPulseIds(new Set()), 1100);
    setShowAddedHint(true);
    if (addedHintTimerRef.current) clearTimeout(addedHintTimerRef.current);
    addedHintTimerRef.current = setTimeout(() => setShowAddedHint(false), 1000);
  };

  const commitParsed = (parsed: ParsedSmartTag[]) => {
    if (parsed.length === 0) return;
    const newIds: string[] = [];
    setSmartTags((prev) => {
      const keys = new Set(prev.map((t) => normalizeTagKey(t.label, t.category)));
      const next = [...prev];
      for (const p of parsed) {
        const key = normalizeTagKey(p.label, p.category);
        if (keys.has(key)) continue;
        keys.add(key);
        const id = `${key}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        newIds.push(id);
        next.push({ ...p, id });
      }
      if (newIds.length) {
        queueMicrotask(() => flashNewTags(newIds));
      }
      return next;
    });
  };

  const handleSmartSubmit = (text: string) => {
    const parsed = parsePreferenceText(text);
    if (parsed.length) {
      commitParsed(parsed);
      setDraftText('');
    }
  };

  const removeSmartTag = (id: string) => {
    setSmartTags((prev) => prev.filter((t) => t.id !== id));
  };

  const addPopular = (item: (typeof POPULAR)[0]) => {
    commitParsed([{ label: item.label, category: item.category }]);
  };

  const visibleCuisines = useMemo(() => {
    const q = cuisineQuery.trim().toLowerCase();
    const base = cuisinesExpanded ? ALL_CUISINES : CUISINES_INITIAL;
    if (!q) return base;
    return base.filter((c) => c.name.toLowerCase().includes(q));
  }, [cuisinesExpanded, cuisineQuery]);

  const inputPlaceholder =
    smartTags.length > 0
      ? 'Add another preference...'
      : 'e.g. I have a peanut allergy, I love desserts…';

  const helperDynamic =
    smartTags.length > 0 ? 'Add more preferences or continue' : null;

  return (
    <View style={styles.wrapper}>
      <BackButton />
      <LinearGradient
        colors={[Colors.primaryLight, Colors.white]}
        locations={[0, 0.4]}
        style={StyleSheet.absoluteFill}
      />
      <ScreenContainer scroll padding="xl" backgroundColor="transparent">
        <View style={{ height: insets.top + 36 }} />
        <Text style={styles.title}>What are you craving? 🍜</Text>
        <Text style={styles.subtitle}>We’ll use this to personalize your experience</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Any dietary preferences?</Text>
          <View style={styles.pillRow}>
            {DIETARY_OPTIONS.map((opt) => (
              <PreferencePill
                key={opt}
                label={opt}
                selected={dietary.includes(opt)}
                onPress={() => toggleMulti(opt, dietary, setDietary)}
              />
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How spicy do you like it? 🌶️</Text>
          <View style={styles.pillRow}>
            {SPICE_OPTIONS.map((opt) => (
              <PreferencePill
                key={opt}
                label={opt}
                selected={spice === opt}
                onPress={() => toggleSingle(opt, spice, setSpice)}
              />
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Typical budget when dining out? 💵</Text>
          <Text style={styles.sectionSubtitle}>Per person, including tax & tip</Text>
          <View style={styles.budgetGrid}>
            {BUDGET_TIERS.map(({ tier, hint, range }) => (
              <View key={tier} style={styles.budgetCell}>
                <PreferencePill
                  label={tier}
                  selected={budgetTier === tier}
                  onPress={() => setBudgetTier(budgetTier === tier ? null : tier)}
                  style={styles.budgetPill}
                />
                <Text style={styles.budgetHint}>{hint}</Text>
                <Text style={styles.budgetRange}>{range}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What cuisines do you enjoy?</Text>
          <Text style={styles.cuisineCount}>
            Cuisine Interests ({cuisines.length} selected)
          </Text>

          {cuisinesExpanded && (
            <Animated.View entering={FadeIn.duration(220)} style={styles.searchWrap}>
              <TextInput
                style={styles.searchInput}
                placeholder="Search cuisines…"
                placeholderTextColor={Colors.textPlaceholder}
                value={cuisineQuery}
                onChangeText={setCuisineQuery}
                returnKeyType="search"
              />
            </Animated.View>
          )}

          <View style={styles.cuisineGrid}>
            {visibleCuisines.map((item) => (
              <View key={item.name} style={styles.cuisineCell}>
                <PreferencePill
                  label={cuisineLabel(item)}
                  selected={cuisines.includes(item.name)}
                  onPress={() => toggleMulti(item.name, cuisines, setCuisines)}
                  style={styles.cuisinePill}
                />
              </View>
            ))}
          </View>
          <Pressable
            onPress={() => {
              setCuisinesExpanded(!cuisinesExpanded);
              if (cuisinesExpanded) setCuisineQuery('');
            }}
            style={styles.showMore}
          >
            <Text style={styles.showMoreText}>
              {cuisinesExpanded ? 'Show less ↑' : 'Show more ↓'}
            </Text>
          </Pressable>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tell us anything else ✨</Text>
          <Text style={styles.sectionSubtitle}>
            We’ll automatically understand your preferences
          </Text>

          <PreferenceInput
            placeholder={inputPlaceholder}
            value={draftText}
            onChangeText={setDraftText}
            onSubmit={handleSmartSubmit}
            multiline
          />

          {draftText.trim().length > 0 && previewTags.length > 0 && (
            <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(160)}>
              <Text style={styles.detectedLabel}>Understanding as you type</Text>
              <View style={styles.tagWrap}>
                {previewTags.map((t, idx) => (
                  <View key={`${t.category}-${t.label}-${idx}`} style={styles.previewTag}>
                    <Text style={styles.previewTagEmoji}>
                      {t.category === 'allergy'
                        ? '🚫'
                        : t.category === 'dislike'
                          ? '❌'
                          : t.category === 'like'
                            ? '❤️'
                            : '⭐'}
                    </Text>
                    <Text style={styles.previewTagText}>{t.label}</Text>
                  </View>
                ))}
              </View>
            </Animated.View>
          )}

          {showAddedHint && (
            <Animated.Text entering={FadeIn.duration(180)} style={styles.addedBadge}>
              Added
            </Animated.Text>
          )}

          {smartTags.length > 0 && (
            <View style={styles.tagWrap}>
              {smartTags.map((t) => (
                <SmartPreferenceTag
                  key={t.id}
                  label={t.label}
                  category={t.category}
                  onRemove={() => removeSmartTag(t.id)}
                  showNewHighlight={pulseIds.has(t.id)}
                />
              ))}
            </View>
          )}

          {smartTags.length === 0 && !draftText.trim() && (
            <>
              <Text style={styles.popularLabel}>Popular preferences</Text>
              <View style={styles.pillRow}>
                {POPULAR.map((p) => (
                  <PreferencePill
                    key={p.phrase}
                    label={p.phrase}
                    selected={smartTags.some(
                      (t) => normalizeTagKey(t.label, t.category) === normalizeTagKey(p.label, p.category)
                    )}
                    onPress={() => addPopular(p)}
                    showCheckWhenSelected={false}
                  />
                ))}
              </View>
            </>
          )}

          {helperDynamic && <Text style={styles.dynamicHelper}>{helperDynamic}</Text>}
          <Text style={styles.aiDisclaimer}>
            We’ll use AI to turn this into smarter recommendations
          </Text>
        </View>

        <View style={styles.bottomSpacer} />

        <PrimaryButton
          text="Continue"
          loading={continueLoading}
          disabled={prefsLoading}
          onPress={async () => {
            setContinueLoading(true);
            try {
              await savePersonalizationFormPrefs({
                budgetTier,
                spiceLabel: spice,
                dietaryKeys: dietary,
                cuisineNames: cuisines,
                smartTags: smartTags.map(({ category, label }) => ({ category, label })),
              });
              router.replace('/diner-home');
            } catch (e) {
              Alert.alert('Could not save preferences', getErrorMessage(e));
            } finally {
              setContinueLoading(false);
            }
          }}
        />
      </ScreenContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  title: {
    ...Typography.heading,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginBottom: Spacing.xxxl,
  },
  section: {
    marginBottom: Spacing.xxl,
  },
  sectionTitle: {
    ...Typography.bodyMedium,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  sectionSubtitle: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginBottom: Spacing.base,
  },
  cuisineCount: {
    ...Typography.small,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  cuisineGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  cuisineCell: {
    width: '48%',
  },
  cuisinePill: {
    width: '100%',
    justifyContent: 'center',
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  showMore: {
    alignSelf: 'center',
    marginTop: Spacing.base,
  },
  showMoreText: {
    ...Typography.captionMedium,
    color: Colors.primary,
  },
  searchWrap: {
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: Colors.chipBorder,
    borderRadius: BorderRadius.base,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    ...Typography.body,
    color: Colors.text,
    backgroundColor: Colors.white,
  },
  detectedLabel: {
    ...Typography.small,
    color: Colors.textSecondary,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  tagWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: Spacing.md,
  },
  previewTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.smartInputTint,
    borderWidth: 1,
    borderColor: Colors.chipBorder,
    opacity: 0.92,
  },
  previewTagEmoji: {
    fontSize: 12,
  },
  previewTagText: {
    ...Typography.small,
    color: Colors.chipText,
    fontWeight: '500',
    maxWidth: 200,
  },
  addedBadge: {
    ...Typography.small,
    color: Colors.primary,
    fontWeight: '600',
    marginTop: Spacing.sm,
  },
  popularLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  dynamicHelper: {
    ...Typography.small,
    color: Colors.textSecondary,
    marginTop: Spacing.base,
  },
  aiDisclaimer: {
    ...Typography.small,
    color: Colors.textSecondary,
    marginTop: Spacing.base,
  },
  budgetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    marginTop: Spacing.xs,
  },
  budgetCell: {
    width: '47%',
    marginBottom: Spacing.sm,
  },
  budgetPill: {
    width: '100%',
    justifyContent: 'center',
  },
  budgetHint: {
    ...Typography.small,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
  budgetRange: {
    ...Typography.small,
    color: Colors.textPlaceholder,
    textAlign: 'center',
  },
  bottomSpacer: {
    height: Spacing.xxl,
  },
});
