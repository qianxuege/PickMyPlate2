import { smartTagFilterLabel } from '@/lib/allergy-tags';
import type { DinerPreferenceSnapshot } from '@/lib/diner-preferences';

export function titleizeDishTag(label: string): string {
  return label
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function normalizedSet(values: string[]): Set<string> {
  return new Set(values.map((value) => value.trim().toLowerCase()).filter(Boolean));
}

export function personalizedDietaryTagSet(prefs: DinerPreferenceSnapshot | null): Set<string> {
  if (!prefs) return new Set();

  const dietaryTags = prefs.dietaryKeys;
  const personalizedSafeTags = prefs.smartTags
    .filter((tag) => tag.category === 'allergy' || tag.category === 'dislike')
    .map((tag) => smartTagFilterLabel(tag));

  return normalizedSet([...dietaryTags, ...personalizedSafeTags]);
}

export function derivePersonalizedDietaryIndicators(
  tags: string[],
  prefs: DinerPreferenceSnapshot | null
): string[] {
  const dietaryTags = personalizedDietaryTagSet(prefs);
  if (dietaryTags.size === 0) return [];

  return Array.from(
    new Set(
      tags
        .map((tag) => tag.trim())
        .filter(Boolean)
        .filter((tag) => dietaryTags.has(tag.toLowerCase()))
        .map(titleizeDishTag)
    )
  );
}

export function deriveDishInfoTags(
  tags: string[],
  spiceLevel: 0 | 1 | 2 | 3,
  description: string | null,
  prefs: DinerPreferenceSnapshot | null
): string[] {
  const dietaryTags = personalizedDietaryTagSet(prefs);
  const cleaned = tags
    .map((tag) => tag.trim())
    .filter(Boolean)
    .filter((tag) => !dietaryTags.has(tag.toLowerCase()))
    .filter((tag) => !/^\$+$/.test(tag));

  const out = new Set(cleaned.map(titleizeDishTag));
  const desc = description?.toLowerCase() ?? '';

  if (spiceLevel >= 2) out.add('Spicy');
  if (!out.size && /savory|umami|broth|garlic|soy/.test(desc)) out.add('Savory');
  if (!out.size && /crispy|fried|crunch/.test(desc)) out.add('Crispy');
  if (!out.size && /sweet/.test(desc)) out.add('Sweet');

  return Array.from(out).slice(0, 5);
}
