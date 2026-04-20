import type { SmartTagCategory } from '@/lib/parseSmartPreferences';

const COMMON_PLURAL_ALLERGENS: Record<string, string> = {
  peanuts: 'Peanut',
  nuts: 'Nut',
  'tree nuts': 'Tree nut',
  eggs: 'Egg',
};

function titleCaseWords(s: string): string {
  return s
    .trim()
    .split(/\s+/)
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : ''))
    .filter(Boolean)
    .join(' ');
}

export function allergyLabelToBase(label: string): string {
  const stripped = label
    .trim()
    .replace(/\.$/, '')
    .replace(/^allergic to\s+/i, '')
    .replace(/\s+allerg(?:y|ies)$/i, '')
    .trim();

  const lower = stripped.toLowerCase();
  const common = COMMON_PLURAL_ALLERGENS[lower];
  if (common) return common;

  if (lower.endsWith('s') && !lower.endsWith('ss') && !lower.endsWith('us') && !lower.endsWith('fish')) {
    return titleCaseWords(stripped.slice(0, -1));
  }

  return titleCaseWords(stripped);
}

export function allergyDishTags(label: string): string[] {
  const base = allergyLabelToBase(label);
  if (!base) return [];
  return [base, `Contains ${base.toLowerCase()}`, `${base}-free`];
}

export function avoidanceLabelToBase(label: string): string {
  const stripped = label
    .trim()
    .replace(/\.$/, '')
    .replace(/^no\s+/i, '')
    .replace(/^(?:i\s+)?(?:don't|do not)\s+like\s+/i, '')
    .replace(/^(?:i\s+)?(?:dislike|hate)\s+/i, '')
    .trim();

  const lower = stripped.toLowerCase();
  if (lower.endsWith('s') && !lower.endsWith('ss') && !lower.endsWith('us') && !lower.endsWith('fish')) {
    return titleCaseWords(stripped.slice(0, -1));
  }

  return titleCaseWords(stripped);
}

export function avoidanceDishTags(label: string): string[] {
  const base = avoidanceLabelToBase(label);
  if (!base) return [];
  return [base, `Contains ${base.toLowerCase()}`, `${base}-free`];
}

export function smartTagFilterLabel(tag: { category: SmartTagCategory; label: string }): string {
  if (tag.category === 'allergy' || tag.category === 'dislike') {
    const base = tag.category === 'allergy' ? allergyLabelToBase(tag.label) : avoidanceLabelToBase(tag.label);
    return base ? `${base}-free` : tag.label;
  }
  return tag.label;
}
