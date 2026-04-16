import {
  ingredientNamesForLegacy,
  parseIngredientItemsFromDb,
  type DishIngredientItem,
} from '@/lib/restaurant-ingredient-items';
import { supabase } from '@/lib/supabase';

export type RestaurantOwnerDishDetail = {
  id: string;
  name: string;
  description: string | null;
  price_amount: number | null;
  price_currency: string;
  price_display: string | null;
  spice_level: 0 | 1 | 2 | 3;
  tags: string[];
  ingredients: string[];
  ingredientItems: DishIngredientItem[];
  image_url: string | null;
  is_featured: boolean;
  is_new: boolean;
  needs_review: boolean;
  menuName: string | null;
};

function coerceSpice(v: unknown): 0 | 1 | 2 | 3 {
  if (v === 0 || v === 1 || v === 2 || v === 3) return v;
  if (typeof v === 'number' && Number.isInteger(v)) {
    return Math.max(0, Math.min(3, v)) as 0 | 1 | 2 | 3;
  }
  return 0;
}

/**
 * Fetch a restaurant menu dish for the owning restaurant user.
 * No `is_published` check — the owner can view all their dishes regardless of publish status.
 */
export async function fetchRestaurantOwnerDishDetail(
  dishId: string,
): Promise<{ ok: true; dish: RestaurantOwnerDishDetail } | { ok: false; error: string }> {
  const { data: dish, error: dErr } = await supabase
    .from('restaurant_menu_dishes')
    .select(
      'id, section_id, name, description, price_amount, price_currency, price_display, spice_level, tags, ingredients, ingredient_items, image_url, is_featured, is_new, needs_review',
    )
    .eq('id', dishId)
    .maybeSingle();

  if (dErr) return { ok: false, error: dErr.message };
  if (!dish) return { ok: false, error: 'Dish not found' };

  const row = dish as Record<string, unknown>;

  // Try to resolve the menu (scan) name for the header
  let menuName: string | null = null;
  try {
    const { data: sec } = await supabase
      .from('restaurant_menu_sections')
      .select('scan_id')
      .eq('id', String(row.section_id))
      .maybeSingle();

    if (sec?.scan_id) {
      const { data: scan } = await supabase
        .from('restaurant_menu_scans')
        .select('restaurant_name')
        .eq('id', sec.scan_id)
        .maybeSingle();
      menuName = (scan as { restaurant_name?: string | null } | null)?.restaurant_name?.trim() || null;
    }
  } catch {
    // best-effort; menuName stays null
  }

  let ingredientItems = parseIngredientItemsFromDb(row.ingredient_items);
  if (ingredientItems.length === 0) {
    const leg = Array.isArray(row.ingredients) ? (row.ingredients as string[]) : [];
    ingredientItems = leg
      .map((n) => ({ name: typeof n === 'string' ? n.trim() : String(n).trim(), origin: null as string | null }))
      .filter((x) => x.name.length > 0);
  }
  const ingredients = ingredientNamesForLegacy(ingredientItems);

  return {
    ok: true,
    dish: {
      id: String(row.id),
      name: typeof row.name === 'string' ? row.name : '',
      description: row.description == null ? null : String(row.description),
      price_amount: row.price_amount == null ? null : Number(row.price_amount),
      price_currency: typeof row.price_currency === 'string' ? row.price_currency : 'USD',
      price_display: row.price_display == null ? null : String(row.price_display),
      spice_level: coerceSpice(row.spice_level),
      tags: Array.isArray(row.tags) ? (row.tags as string[]) : [],
      ingredients,
      ingredientItems,
      image_url: row.image_url == null ? null : String(row.image_url),
      is_featured: Boolean(row.is_featured),
      is_new: Boolean(row.is_new),
      needs_review: Boolean(row.needs_review),
      menuName,
    },
  };
}
