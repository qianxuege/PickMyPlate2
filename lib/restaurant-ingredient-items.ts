export const MAX_DISH_INGREDIENT_ORIGIN_LEN = 100 as const;

/** Shown on diner-facing dish detail when an ingredient has no origin (US9). */
export const DISH_INGREDIENT_ORIGIN_NOT_SPECIFIED = 'Origin not specified' as const;

export type DishIngredientItem = {
  name: string;
  origin: string | null;
};

/** Stable row id + fields for restaurant add/edit dish ingredient UI */
export type IngredientFormRow = { id: string; name: string; origin: string };

export function newIngredientFormRowId(): string {
  return globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function'
    ? globalThis.crypto.randomUUID()
    : `ing-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * When the parser / LLM leaves ingredients empty, derive editable rows from the dish title
 * (e.g. "Pop corn" → Pop, corn; "Fish and chips" → Fish, chips).
 */
export function fallbackIngredientNamesFromDishName(name: string): string[] {
  const t = name.trim();
  if (!t) return [];
  const segments: string[] = [];
  for (const chunk of t.split(/[,;/|]+/)) {
    const c = chunk.trim();
    if (!c) continue;
    for (const part of c.split(/\s+(?:and|&)\s+/i)) {
      const p = part.trim();
      if (!p) continue;
      for (const w of p.split(/\s+/)) {
        const word = w.trim();
        if (word.length > 0) segments.push(word);
      }
    }
  }
  if (segments.length === 0) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of segments) {
    const key = s.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
    if (out.length >= 12) break;
  }
  return out;
}

/**
 * Build ingredient editor rows from a `restaurant_menu_dishes` row (or equivalent).
 * Prefers `ingredient_items`; falls back to legacy `ingredients` text[] (e.g. older parses).
 * When both are empty, uses {@link fallbackIngredientNamesFromDishName} when `name` is set.
 */
export function dishDbToIngredientFormRows(data: {
  ingredient_items?: unknown;
  ingredients?: unknown;
  name?: string | null;
}): IngredientFormRow[] {
  const parsed = parseIngredientItemsFromDb(data.ingredient_items);
  const legacyRaw = data.ingredients;
  const legacy = Array.isArray(legacyRaw)
    ? (legacyRaw as unknown[])
        .map((n) => (typeof n === 'string' ? n.trim() : String(n)).trim())
        .filter((n) => n.length > 0)
    : [];

  if (parsed.length > 0) {
    return parsed.map((it) => ({
      id: newIngredientFormRowId(),
      name: it.name,
      origin: typeof it.origin === 'string' && it.origin ? it.origin : '',
    }));
  }

  if (legacy.length > 0) {
    return legacy.map((name) => ({
      id: newIngredientFormRowId(),
      name,
      origin: '',
    }));
  }

  const dishName = typeof data.name === 'string' ? data.name.trim() : '';
  if (dishName) {
    return fallbackIngredientNamesFromDishName(dishName).map((name) => ({
      id: newIngredientFormRowId(),
      name,
      origin: '',
    }));
  }

  return [];
}

export function ingredientNamesForLegacy(items: DishIngredientItem[]): string[] {
  return items.map((i) => i.name);
}

/**
 * Parse `ingredient_items` from Supabase jsonb (or API-shaped JSON). Skips invalid entries.
 * Accepts: array; JSON string of an array; `{ items: [...] }`; objects with `name` or `ingredient`.
 */
export function parseIngredientItemsFromDb(raw: unknown): DishIngredientItem[] {
  let source: unknown = raw;

  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return [];
    try {
      source = JSON.parse(trimmed) as unknown;
    } catch {
      return [];
    }
  }

  if (source !== null && typeof source === 'object' && !Array.isArray(source)) {
    const o = source as Record<string, unknown>;
    if (Array.isArray(o.items)) source = o.items;
    else if (Array.isArray(o.ingredients)) source = o.ingredients;
    else return [];
  }

  if (!Array.isArray(source)) return [];

  const out: DishIngredientItem[] = [];
  for (const el of source) {
    if (typeof el === 'string') {
      const n = el.trim();
      if (n) out.push({ name: n, origin: null });
      continue;
    }
    if (!el || typeof el !== 'object') continue;
    const o = el as Record<string, unknown>;
    const nameFromName = typeof o.name === 'string' ? o.name.trim() : '';
    const nameFromIngredient =
      typeof o.ingredient === 'string' ? o.ingredient.trim() : '';
    const name = nameFromName || nameFromIngredient;
    if (!name) continue;
    let origin: string | null = null;
    if (typeof o.origin === 'string') {
      const t = o.origin.trim();
      if (t.length > 0) origin = t;
    }
    out.push({ name, origin });
  }
  return out;
}

/**
 * Trim, drop blank names, validate origin length. Coerces blank origin to null.
 */
export function normalizeIngredientItemsForPersist(
  rows: { name: string; origin: string | null | undefined }[],
): { ok: true; items: DishIngredientItem[] } | { ok: false; error: string } {
  const items: DishIngredientItem[] = [];
  for (const row of rows) {
    const name = (row.name ?? '').trim();
    const rawOrigin = row.origin;
    const originStr = typeof rawOrigin === 'string' ? rawOrigin.trim() : '';
    if (!name) {
      if (originStr.length > 0) {
        return {
          ok: false,
          error: 'Each ingredient needs a name. Remove the row or enter a name before saving an origin.',
        };
      }
      continue;
    }
    if (originStr.length > MAX_DISH_INGREDIENT_ORIGIN_LEN) {
      return {
        ok: false,
        error: `Origin for "${name}" must be at most ${MAX_DISH_INGREDIENT_ORIGIN_LEN} characters.`,
      };
    }
    items.push({ name, origin: originStr.length ? originStr : null });
  }
  return { ok: true, items };
}
