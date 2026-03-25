/**
 * Lightweight rule-based parsing for diner free-text preferences ("AI understood" tags).
 */

export type SmartTagCategory = 'allergy' | 'dislike' | 'like' | 'preference';

export type ParsedSmartTag = {
  label: string;
  category: SmartTagCategory;
};

function capitalizeFirst(s: string): string {
  const t = s.trim();
  if (!t) return '';
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function titleCaseWords(s: string): string {
  return s
    .trim()
    .split(/\s+/)
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : ''))
    .filter(Boolean)
    .join(' ');
}

function splitClauses(text: string): string[] {
  return text
    .split(/\s*(?:,|;|(?:\s+and\s+))\s*/i)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function parsePreferenceText(raw: string): ParsedSmartTag[] {
  const text = raw.trim();
  if (!text) return [];

  const seen = new Set<string>();
  const out: ParsedSmartTag[] = [];

  const push = (label: string, category: SmartTagCategory) => {
    const clean = label.replace(/\s+/g, ' ').trim().replace(/\.$/, '');
    if (!clean) return;
    const key = `${category}:${clean.toLowerCase()}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ label: clean, category });
  };

  for (const clause of splitClauses(text)) {
    const c = clause.trim();
    if (!c) continue;
    if (/\ballergic to\b/i.test(c)) {
      const m = c.match(/\ballergic to\s+(.+)/i);
      const rest = m?.[1]?.replace(/\.$/, '').trim();
      if (rest) push(`${titleCaseWords(rest)} allergy`, 'allergy');
      continue;
    }

    if (/\ballergy\b/i.test(c)) {
      const m = c.match(/^(?:i\s+(?:have|had|'ve)\s+(?:an?\s+)?)?(.+?)\s+allergy$/i);
      const rest = m?.[1]?.replace(/\.$/, '').trim();
      if (rest && !/^an?\s*$/i.test(rest)) push(`${titleCaseWords(rest)} allergy`, 'allergy');
      else push(capitalizeFirst(c.replace(/\.$/, '')), 'allergy');
      continue;
    }

    if (/^(?:i\s+)?(?:don't|do not)\s+like\s+/i.test(c)) {
      const rest = c.replace(/^(?:i\s+)?(?:don't|do not)\s+like\s+/i, '').replace(/\.$/, '').trim();
      if (rest) push(`No ${titleCaseWords(rest)}`, 'dislike');
      continue;
    }

    if (/^(?:i\s+)?(?:dislike|hate)\s+/i.test(c)) {
      const rest = c.replace(/^(?:i\s+)?(?:dislike|hate)\s+/i, '').replace(/\.$/, '').trim();
      if (rest) push(`No ${titleCaseWords(rest)}`, 'dislike');
      continue;
    }

    if (/^no\s+/i.test(c)) {
      push(capitalizeFirst(c.replace(/\.$/, '')), 'dislike');
      continue;
    }

    if (/\b(?:loves?|adore)\s+/i.test(c) || /^i\s+loves?\b/i.test(c)) {
      const rest = c
        .replace(/^(?:i\s+)?(?:really\s+)?(?:loves?|adore)\s+/i, '')
        .replace(/\.$/, '')
        .trim();
      if (rest) push(`Loves ${titleCaseWords(rest)}`, 'like');
      continue;
    }

    if (/^i\s+like\s+/i.test(c)) {
      const rest = c.replace(/^i\s+like\s+/i, '').replace(/\.$/, '').trim();
      if (rest) push(`Likes ${titleCaseWords(rest)}`, 'like');
      continue;
    }

    if (/\b(high protein|low carb|keto|halal|kosher)\b/i.test(c)) {
      const m = c.match(/\b(high protein|low carb|keto|halal|kosher)\b/i);
      if (m?.[1]) push(titleCaseWords(m[1]), 'preference');
      continue;
    }

    push(capitalizeFirst(c.replace(/\.$/, '')), 'preference');
  }

  return out;
}

export function normalizeTagKey(label: string, category: SmartTagCategory): string {
  return `${category}:${label.trim().toLowerCase()}`;
}
