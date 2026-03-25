import type { SmartTagCategory } from '@/lib/parseSmartPreferences';
import { supabase } from '@/lib/supabase';

export const DIETARY_OPTIONS = ['Vegetarian', 'Vegan', 'Gluten-free', 'Dairy-free'] as const;

export type BudgetTier = '$' | '$$' | '$$$' | '$$$$';

const ALLOWED_DIETARY = new Set<string>(DIETARY_OPTIONS);

/** Display names in the app ↔ `cuisines.slug` in the seeded DB */
const CUISINE_NAME_TO_SLUG: Record<string, string> = {
  Chinese: 'chinese',
  Italian: 'italian',
  Indian: 'indian',
  American: 'american',
  Mexican: 'mexican',
  Thai: 'thai',
  Japanese: 'japanese',
  Korean: 'korean',
  Vietnamese: 'vietnamese',
  French: 'french',
  Greek: 'greek',
  Spanish: 'spanish',
  Mediterranean: 'mediterranean',
  'Middle Eastern': 'middle_eastern',
  Brazilian: 'brazilian',
  Ethiopian: 'ethiopian',
};

const SMART_CATEGORIES = new Set<string>(['allergy', 'dislike', 'like', 'preference']);

export type DinerPreferenceSnapshot = {
  budget_tier: string | null;
  spice_level: string | null;
  dietaryKeys: string[];
  cuisineNames: string[];
  smartTags: { id: string; category: SmartTagCategory; label: string }[];
};

const SPICE_LABEL_TO_DB: Record<string, 'mild' | 'medium' | 'spicy'> = {
  Mild: 'mild',
  Medium: 'medium',
  Spicy: 'spicy',
};

const SPICE_DB_TO_LABEL: Record<string, string> = {
  mild: 'Mild',
  medium: 'Medium',
  spicy: 'Spicy',
};

export function spiceLabelToDb(label: string | null | undefined): 'mild' | 'medium' | 'spicy' | null {
  if (!label) return null;
  return SPICE_LABEL_TO_DB[label] ?? null;
}

export function spiceDbToLabel(db: string | null | undefined): string | null {
  if (!db) return null;
  return SPICE_DB_TO_LABEL[db] ?? null;
}

function parseSmartCategory(raw: string | null | undefined): SmartTagCategory | null {
  if (!raw || !SMART_CATEGORIES.has(raw)) return null;
  return raw as SmartTagCategory;
}

export async function fetchDinerPreferences(): Promise<DinerPreferenceSnapshot | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [prefRes, dietaryRes, cuisineIdsRes, tagsRes] = await Promise.all([
    supabase
      .from('diner_preferences')
      .select('budget_tier, spice_level')
      .eq('profile_id', user.id)
      .maybeSingle(),
    supabase.from('diner_dietary_preferences').select('dietary_key').eq('profile_id', user.id),
    supabase.from('diner_cuisine_interests').select('cuisine_id').eq('profile_id', user.id),
    supabase
      .from('diner_smart_tags')
      .select('id, category, label')
      .eq('profile_id', user.id)
      .order('sort_order', { ascending: true }),
  ]);

  if (prefRes.error) throw prefRes.error;
  if (dietaryRes.error) throw dietaryRes.error;
  if (cuisineIdsRes.error) throw cuisineIdsRes.error;
  if (tagsRes.error) throw tagsRes.error;

  const pref = prefRes.data;
  const dietaryKeys = (dietaryRes.data ?? [])
    .map((r) => r.dietary_key)
    .filter((k): k is string => typeof k === 'string' && ALLOWED_DIETARY.has(k));

  const cuisineIdList = [...new Set((cuisineIdsRes.data ?? []).map((r) => r.cuisine_id).filter(Boolean))];
  let cuisineNames: string[] = [];
  if (cuisineIdList.length > 0) {
    const { data: cnameRows, error: cnErr } = await supabase
      .from('cuisines')
      .select('name')
      .in('id', cuisineIdList)
      .order('sort_order', { ascending: true });
    if (cnErr) throw cnErr;
    cuisineNames = (cnameRows ?? [])
      .map((r) => r.name)
      .filter((n): n is string => typeof n === 'string' && n.length > 0);
  }

  const smartTags: DinerPreferenceSnapshot['smartTags'] = [];
  for (const row of tagsRes.data ?? []) {
    const cat = parseSmartCategory(row.category);
    if (!cat || typeof row.label !== 'string' || !row.label.trim()) continue;
    smartTags.push({
      id: row.id,
      category: cat,
      label: row.label.trim(),
    });
  }

  return {
    budget_tier: pref?.budget_tier ?? null,
    spice_level: pref?.spice_level ?? null,
    dietaryKeys,
    cuisineNames,
    smartTags,
  };
}

export type SavePersonalizationFormPrefs = {
  budgetTier: BudgetTier | null;
  spiceLabel: string | null;
  dietaryKeys: string[];
  cuisineNames: string[];
  smartTags: { category: SmartTagCategory; label: string }[];
};

export async function savePersonalizationFormPrefs(input: SavePersonalizationFormPrefs): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');

  const spiceLevel = spiceLabelToDb(input.spiceLabel);
  const dietaryKeys = input.dietaryKeys.filter((k) => ALLOWED_DIETARY.has(k));

  const slugs = [
    ...new Set(input.cuisineNames.map((n) => CUISINE_NAME_TO_SLUG[n]).filter((s): s is string => Boolean(s))),
  ];
  let cuisineIds: string[] = [];
  if (slugs.length > 0) {
    const { data: cdata, error: cErr } = await supabase.from('cuisines').select('id').in('slug', slugs);
    if (cErr) throw cErr;
    cuisineIds = [...new Set((cdata ?? []).map((r) => r.id))];
  }

  const { error: upErr } = await supabase.from('diner_preferences').upsert(
    {
      profile_id: user.id,
      budget_tier: input.budgetTier,
      spice_level: spiceLevel,
      onboarding_completed_at: new Date().toISOString(),
    },
    { onConflict: 'profile_id' }
  );
  if (upErr) throw upErr;

  const { error: ddDel } = await supabase
    .from('diner_dietary_preferences')
    .delete()
    .eq('profile_id', user.id);
  if (ddDel) throw ddDel;

  if (dietaryKeys.length > 0) {
    const { error: ddIns } = await supabase.from('diner_dietary_preferences').insert(
      dietaryKeys.map((dietary_key) => ({ profile_id: user.id, dietary_key }))
    );
    if (ddIns) throw ddIns;
  }

  const { error: ciDel } = await supabase
    .from('diner_cuisine_interests')
    .delete()
    .eq('profile_id', user.id);
  if (ciDel) throw ciDel;

  if (cuisineIds.length > 0) {
    const { error: ciIns } = await supabase.from('diner_cuisine_interests').insert(
      cuisineIds.map((cuisine_id) => ({ profile_id: user.id, cuisine_id }))
    );
    if (ciIns) throw ciIns;
  }

  const { error: stDel } = await supabase.from('diner_smart_tags').delete().eq('profile_id', user.id);
  if (stDel) throw stDel;

  const tags = input.smartTags.filter((t) => t.label.trim() && SMART_CATEGORIES.has(t.category));
  if (tags.length > 0) {
    const { error: stIns } = await supabase.from('diner_smart_tags').insert(
      tags.map((t, i) => ({
        profile_id: user.id,
        category: t.category,
        label: t.label.trim(),
        sort_order: i,
      }))
    );
    if (stIns) throw stIns;
  }
}
