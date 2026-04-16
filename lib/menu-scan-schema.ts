/**
 * Contract for diner menu OCR → LLM → persistence → UI.
 *
 * **Persistence (single source of truth)** — Supabase tables:
 * - `diner_menu_scans` — scan metadata (Recent scans list).
 * - `diner_menu_sections` — section headings per scan.
 * - `diner_scanned_dishes` — one row per dish (`id` = stable key for favorites & detail).
 * - `diner_favorite_dishes` — `(profile_id, dish_id)` for the Favorites screen.
 *
 * **API**: Flask assigns UUIDs for sections/items (`assign_server_uuid_ids`), validates with
 * `validateParsedMenu`, then the client inserts scan → sections → dishes (row ids match
 * `ParsedMenu` ids from the API response).
 * Do not store a duplicate `parsed_menu` JSON blob in the database.
 *
 * Tag strings in `ParsedMenuItem.tags` must be a subset of the user's preference
 * vocabulary only (dietary keys, spice_label, budget_tier, cuisine names, smart_tag
 * labels — same strings as `buildMenuParseUserPreferences`). The Flask API enforces
 * this allowlist server-side so chips match on the menu screen.
 */

export const MENU_SCAN_SCHEMA_VERSION = 1 as const;

export type ParsedMenuPrice = {
  /** Numeric amount when parseable; null if unknown */
  amount: number | null;
  /** ISO 4217, e.g. "USD" */
  currency: string;
  /** Original price string from menu when useful, e.g. "$12.00" */
  display: string | null;
};

export type ParsedMenuItem = {
  /** UUID from the menu API / DB — issued server-side when parsing, not by the LLM */
  id: string;
  name: string;
  /**
   * Short blurb for Diner Dish Details (1–2 sentences). LLM may infer from name/section
   * when the menu has no line description; null if nothing specific to say.
   */
  description: string | null;
  price: ParsedMenuPrice;
  /**
   * 0–3 for chili icons on dish detail. LLM may infer from name/cues when unstated;
   * must stay integers 0–3 for API validation.
   */
  spice_level: 0 | 1 | 2 | 3;
  /**
   * Only strings from the user’s preference allowlist (Flask filters). LLM chooses
   * which apply; used for chip matching on the menu screen.
   */
  tags: string[];
  /** Key ingredients (Diner Dish Details); empty array if unknown */
  ingredients: string[];
  /** Saved public URL for real or generated dish image */
  image_url?: string | null;
  /** LLM rough kcal per serving; null if unknown (menu parse or copy from restaurant). */
  calories_estimated?: number | null;
};

export type ParsedMenuSection = {
  /** UUID from the menu API / DB — issued server-side when parsing */
  id: string;
  title: string;
  items: ParsedMenuItem[];
};

export type ParsedMenu = {
  schema_version: typeof MENU_SCAN_SCHEMA_VERSION;
  /** Shown in menu header; null if unknown — also store on `diner_menu_scans.restaurant_name` */
  restaurant_name: string | null;
  sections: ParsedMenuSection[];
};

export type ParsedMenuValidationResult =
  | { ok: true; value: ParsedMenu }
  | { ok: false; error: string };

/** DB row shape for `diner_menu_sections` (subset used by the app). */
export type DinerMenuSectionRow = {
  id: string;
  scan_id: string;
  title: string;
  sort_order: number;
};

/** DB row shape for `diner_scanned_dishes` (subset used by the app). */
export type DinerScannedDishRow = {
  id: string;
  section_id: string;
  sort_order: number;
  name: string;
  description: string | null;
  price_amount: number | null;
  price_currency: string;
  price_display: string | null;
  spice_level: 0 | 1 | 2 | 3;
  tags: string[];
  ingredients: string[];
  image_url: string | null;
  calories_manual: number | null;
  calories_estimated: number | null;
};

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.length > 0;
}

function isSpiceLevel(v: unknown): v is 0 | 1 | 2 | 3 {
  return v === 0 || v === 1 || v === 2 || v === 3;
}

function parsePrice(raw: unknown): ParsedMenuPrice | null {
  if (raw === null || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const currency = o.currency;
  if (typeof currency !== 'string' || currency.length === 0) return null;
  const amount = o.amount;
  if (amount !== null && typeof amount !== 'number') return null;
  const display = o.display;
  if (display !== null && typeof display !== 'string') return null;
  return {
    amount: amount === null || typeof amount === 'number' ? (amount as number | null) : null,
    currency,
    display: display === null ? null : (display as string),
  };
}

function parseIngredients(raw: unknown): string[] | null {
  if (raw === undefined) return [];
  if (!Array.isArray(raw)) return null;
  if (!raw.every((t) => typeof t === 'string')) return null;
  return raw as string[];
}

function parseItem(raw: unknown): ParsedMenuItem | null {
  if (raw === null || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  if (!isNonEmptyString(o.id)) return null;
  if (!isNonEmptyString(o.name)) return null;
  if (o.description !== null && typeof o.description !== 'string') return null;
  const price = parsePrice(o.price);
  if (!price) return null;
  if (!isSpiceLevel(o.spice_level)) return null;
  if (!Array.isArray(o.tags) || !o.tags.every((t) => typeof t === 'string')) return null;
  const ingredients = parseIngredients(o.ingredients);
  if (ingredients === null) return null;
  let calories_estimated: number | null = null;
  if ('calories_estimated' in o && o.calories_estimated !== undefined && o.calories_estimated !== null) {
    const c = o.calories_estimated;
    if (typeof c === 'number' && Number.isFinite(c)) {
      const n = Math.round(c);
      if (n >= 0 && n <= 20000) calories_estimated = n;
    }
  }
  return {
    id: o.id,
    name: o.name,
    description: o.description === null || typeof o.description === 'string' ? (o.description as string | null) : null,
    price,
    spice_level: o.spice_level,
    tags: o.tags as string[],
    ingredients,
    image_url: null,
    calories_estimated,
  };
}

function parseSection(raw: unknown): ParsedMenuSection | null {
  if (raw === null || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  if (!isNonEmptyString(o.id)) return null;
  if (!isNonEmptyString(o.title)) return null;
  if (!Array.isArray(o.items)) return null;
  const items: ParsedMenuItem[] = [];
  for (let i = 0; i < o.items.length; i += 1) {
    const it = parseItem(o.items[i]);
    if (!it) return null;
    items.push(it);
  }
  return { id: o.id, title: o.title, items };
}

/**
 * Validate unknown JSON (from LLM / Flask) before inserting into Supabase.
 */
export function validateParsedMenu(raw: unknown): ParsedMenuValidationResult {
  if (raw === null || typeof raw !== 'object') {
    return { ok: false, error: 'body must be an object' };
  }
  const o = raw as Record<string, unknown>;
  if (o.schema_version !== MENU_SCAN_SCHEMA_VERSION) {
    return { ok: false, error: `schema_version must be ${MENU_SCAN_SCHEMA_VERSION}` };
  }
  if (o.restaurant_name !== null && typeof o.restaurant_name !== 'string') {
    return { ok: false, error: 'restaurant_name must be string or null' };
  }
  if (!Array.isArray(o.sections)) {
    return { ok: false, error: 'sections must be an array' };
  }
  const sections: ParsedMenuSection[] = [];
  for (let s = 0; s < o.sections.length; s += 1) {
    const sec = parseSection(o.sections[s]);
    if (!sec) {
      return { ok: false, error: `Invalid section at index ${s}` };
    }
    sections.push(sec);
  }
  return {
    ok: true,
    value: {
      schema_version: MENU_SCAN_SCHEMA_VERSION,
      restaurant_name: o.restaurant_name === null || typeof o.restaurant_name === 'string' ? (o.restaurant_name as string | null) : null,
      sections,
    },
  };
}

/** True if at least one dish exists (e.g. treat empty parse as failure). */
export function parsedMenuHasItems(menu: ParsedMenu): boolean {
  return menu.sections.some((s) => s.items.length > 0);
}

function normalizeSpiceLevel(n: unknown): 0 | 1 | 2 | 3 {
  if (n === 0 || n === 1 || n === 2 || n === 3) return n;
  if (typeof n === 'number' && Number.isInteger(n)) {
    const c = Math.max(0, Math.min(3, n));
    return c as 0 | 1 | 2 | 3;
  }
  return 0;
}

/** Map a DB dish row to the API/menu item shape (e.g. after Supabase select). */
function normalizeCaloriesColumn(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number' && Number.isFinite(v)) {
    const n = Math.round(v);
    if (n >= 0 && n <= 20000) return n;
  }
  return null;
}

export function dishRowToParsedItem(row: DinerScannedDishRow): ParsedMenuItem {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    price: {
      amount: row.price_amount,
      currency: row.price_currency,
      display: row.price_display,
    },
    spice_level: normalizeSpiceLevel(row.spice_level),
    tags: Array.isArray(row.tags) ? row.tags : [],
    ingredients: Array.isArray(row.ingredients) ? row.ingredients : [],
    image_url: typeof row.image_url === 'string' ? row.image_url : null,
    calories_estimated: normalizeCaloriesColumn(row.calories_estimated),
  };
}

/**
 * Build `ParsedMenu` from normalized rows (single source of truth in DB).
 * Sort: sections by `sort_order`, then dishes by `sort_order` within each section.
 */
export function assembleParsedMenu(
  restaurantName: string | null,
  sections: DinerMenuSectionRow[],
  dishes: DinerScannedDishRow[]
): ParsedMenu {
  const sortedSections = [...sections].sort((a, b) => {
    if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
    return a.title.localeCompare(b.title);
  });
  const bySection = new Map<string, DinerScannedDishRow[]>();
  for (const d of dishes) {
    const list = bySection.get(d.section_id) ?? [];
    list.push(d);
    bySection.set(d.section_id, list);
  }
  for (const list of bySection.values()) {
    list.sort((a, b) => {
      if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
      return a.name.localeCompare(b.name);
    });
  }
  const outSections: ParsedMenuSection[] = sortedSections.map((sec) => ({
    id: sec.id,
    title: sec.title,
    items: (bySection.get(sec.id) ?? []).map(dishRowToParsedItem),
  }));
  return {
    schema_version: MENU_SCAN_SCHEMA_VERSION,
    restaurant_name: restaurantName,
    sections: outSections,
  };
}
