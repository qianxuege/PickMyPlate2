export const DISH_ORIGIN_NOT_SPECIFIED = 'Origin not specified' as const;

export const MAX_DISH_INGREDIENT_ORIGIN_LEN = 100 as const;

export type DishIngredientItem = {
  name: string;
  origin: string | null;
};

export function ingredientNamesForLegacy(items: DishIngredientItem[]): string[] {
  return items.map((i) => i.name);
}

/**
 * Parse `ingredient_items` from Supabase jsonb. Skips invalid entries.
 */
export function parseIngredientItemsFromDb(raw: unknown): DishIngredientItem[] {
  if (!Array.isArray(raw)) return [];
  const out: DishIngredientItem[] = [];
  for (const el of raw) {
    if (!el || typeof el !== 'object') continue;
    const o = el as Record<string, unknown>;
    const name = typeof o.name === 'string' ? o.name.trim() : '';
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
    if (!name) continue;
    const rawOrigin = row.origin;
    const originStr = typeof rawOrigin === 'string' ? rawOrigin.trim() : '';
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
