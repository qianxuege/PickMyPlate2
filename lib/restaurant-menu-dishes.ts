import { isMissingDishCaloriesColumnsError } from '@/lib/dish-calories-columns-support';
import {
  ingredientNamesForLegacy,
  normalizeIngredientItemsForPersist,
  type DishIngredientItem,
} from '@/lib/restaurant-ingredient-items';
import { supabase } from '@/lib/supabase';
import { restaurantMenuDishNeedsReview } from '@/lib/restaurant-menu-dish-utils';

export type CreateRestaurantDishDraftInput = {
  sectionId: string;
  sortOrder: number;
};

export type CreateRestaurantDishDraftResult = { ok: true; dishId: string } | { ok: false; error: string };

export async function getRestaurantSectionNextDishSortOrder(sectionId: string): Promise<number> {
  const { data, error } = await supabase
    .from('restaurant_menu_dishes')
    .select('sort_order')
    .eq('section_id', sectionId)
    .order('sort_order', { ascending: false })
    .limit(1);

  if (error) throw error;
  const top = (data ?? [])[0] as { sort_order: number } | undefined;
  return typeof top?.sort_order === 'number' ? top.sort_order + 1 : 0;
}

export async function createRestaurantDishDraft(input: CreateRestaurantDishDraftInput): Promise<CreateRestaurantDishDraftResult> {
  const { data, error } = await supabase
    .from('restaurant_menu_dishes')
    .insert({
      section_id: input.sectionId,
      sort_order: input.sortOrder,
      name: '',
      description: null,
      price_amount: null,
      price_currency: 'USD',
      price_display: null,
      spice_level: 0,
      tags: [],
      ingredients: [],
      ingredient_items: [],
      image_url: null,
      needs_review: true,
      is_featured: false,
      is_new: false,
    })
    .select('id')
    .single();

  if (error) return { ok: false, error: error.message };
  if (!data?.id) return { ok: false, error: 'Failed to create dish draft' };
  return { ok: true, dishId: String(data.id) };
}

export type SaveRestaurantDishInput = {
  dishId: string;
  scanId: string;
  name: string;
  description: string | null;
  priceAmount: number | null;
  priceCurrency: string;
  priceDisplay: string | null;
  spiceLevel: 0 | 1 | 2 | 3;
  tags: string[];
  /** Structured ingredients; `ingredients` text[] is derived as name-only. */
  ingredientItems: DishIngredientItem[];
  /** Owner-entered kcal; null clears. Does not clear calories_estimated. */
  caloriesManual?: number | null;
  /**
   * If true (default), updates the parent scan's last_activity_at so it moves
   * to the top of "Recent uploads".
   */
  touchScan?: boolean;
};

export async function touchRestaurantMenuScan(scanId: string): Promise<void> {
  // "last_activity_at" is what drives the "Recent uploads" list ordering.
  const now = new Date().toISOString();
  const { error } = await supabase.from('restaurant_menu_scans').update({ last_activity_at: now }).eq('id', scanId);
  if (error) throw error;
}

export async function saveRestaurantDish(input: SaveRestaurantDishInput): Promise<{ ok: true } | { ok: false; error: string }> {
  const normalized = normalizeIngredientItemsForPersist(input.ingredientItems);
  if (!normalized.ok) return { ok: false, error: normalized.error };

  const legacyNames = ingredientNamesForLegacy(normalized.items);
  const needs_review = restaurantMenuDishNeedsReview({
    name: input.name,
    priceAmount: input.priceAmount,
    ingredients: legacyNames,
  });

  const patch: Record<string, unknown> = {
    name: input.name,
    description: input.description,
    price_amount: input.priceAmount,
    price_currency: input.priceCurrency,
    price_display: input.priceDisplay,
    spice_level: input.spiceLevel,
    tags: input.tags,
    ingredients: legacyNames,
    ingredient_items: normalized.items,
    needs_review,
  };
  if (input.caloriesManual !== undefined) {
    patch.calories_manual = input.caloriesManual;
  }

  let { error } = await supabase.from('restaurant_menu_dishes').update(patch).eq('id', input.dishId);

  if (error && isMissingDishCaloriesColumnsError(error) && 'calories_manual' in patch) {
    const { calories_manual: _c, ...rest } = patch;
    ({ error } = await supabase.from('restaurant_menu_dishes').update(rest).eq('id', input.dishId));
  }

  if (error) return { ok: false, error: error.message };

  if (input.touchScan ?? true) {
    await touchRestaurantMenuScan(input.scanId);
  }
  return { ok: true };
}

export async function updateRestaurantDishHighlightFlags(
  dishId: string,
  flags: { is_featured?: boolean; is_new?: boolean },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const patch: Record<string, boolean> = {};
  if (typeof flags.is_featured === 'boolean') patch.is_featured = flags.is_featured;
  if (typeof flags.is_new === 'boolean') patch.is_new = flags.is_new;
  if (Object.keys(patch).length === 0) return { ok: true };

  const { error } = await supabase.from('restaurant_menu_dishes').update(patch).eq('id', dishId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

