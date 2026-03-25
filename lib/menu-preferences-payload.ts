import type { DinerPreferenceSnapshot } from '@/lib/diner-preferences';
import { spiceDbToLabel } from '@/lib/diner-preferences';

/**
 * JSON-safe payload for Flask /v1/parse-menu `user_preferences`
 * (same vocabulary chips + tags as the menu UI).
 */
export function buildMenuParseUserPreferences(snapshot: DinerPreferenceSnapshot | null): Record<string, unknown> {
  if (!snapshot) {
    return { dietary: [], spice_label: null, budget_tier: null, cuisines: [], smart_tags: [] };
  }
  return {
    dietary: snapshot.dietaryKeys,
    spice_label: spiceDbToLabel(snapshot.spice_level),
    budget_tier: snapshot.budget_tier,
    cuisines: snapshot.cuisineNames,
    smart_tags: snapshot.smartTags.map((t) => ({
      category: t.category,
      label: t.label,
    })),
  };
}
