import type { PostgrestError } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';

/**
 * True when PostgREST / schema cache error indicates calories columns are missing on the table.
 */
export function isMissingDishCaloriesColumnsError(error: PostgrestError | null): boolean {
  if (!error?.message) return false;
  const m = error.message;
  if (!m.includes('calories_estimated') && !m.includes('calories_manual')) return false;
  return m.includes('schema cache') || m.includes('does not exist') || m.includes('column');
}

/** Reset probes (e.g. after user applies SQL migration without app restart). */
export function resetDishCaloriesColumnProbes(): void {
  dinerCaloriesProbe = null;
  restaurantCaloriesProbe = null;
}

const DINER_DISH_SELECT_BASE =
  'id, section_id, sort_order, name, description, price_amount, price_currency, price_display, spice_level, tags, ingredients, ingredient_items, image_url';

const REST_DISH_SELECT_BASE =
  'id, section_id, sort_order, name, description, price_amount, price_currency, price_display, spice_level, tags, ingredients, ingredient_items, image_url, needs_review, is_featured, is_new';

export async function getDinerScannedDishSelectColumns(): Promise<string> {
  const ok = await dinerScannedDishesHasCaloriesColumns();
  return ok ? `${DINER_DISH_SELECT_BASE}, calories_manual, calories_estimated` : DINER_DISH_SELECT_BASE;
}

export async function getRestaurantMenuDishSelectColumns(): Promise<string> {
  const ok = await restaurantMenuDishesHasCaloriesColumns();
  return ok ? `${REST_DISH_SELECT_BASE}, calories_manual, calories_estimated` : REST_DISH_SELECT_BASE;
}

export async function getPublishedRestaurantDishSelectColumns(): Promise<string> {
  const ok = await restaurantMenuDishesHasCaloriesColumns();
  return ok
    ? 'id, section_id, name, description, price_amount, price_currency, price_display, spice_level, tags, ingredients, ingredient_items, image_url, is_featured, is_new, calories_manual, calories_estimated'
    : 'id, section_id, name, description, price_amount, price_currency, price_display, spice_level, tags, ingredients, ingredient_items, image_url, is_featured, is_new';
}

export async function getRestaurantOwnerDishSelectColumns(): Promise<string> {
  const ok = await restaurantMenuDishesHasCaloriesColumns();
  return ok
    ? 'id, section_id, name, description, price_amount, price_currency, price_display, spice_level, tags, ingredients, ingredient_items, image_url, is_featured, is_new, needs_review, calories_manual, calories_estimated'
    : 'id, section_id, name, description, price_amount, price_currency, price_display, spice_level, tags, ingredients, ingredient_items, image_url, is_featured, is_new, needs_review';
}

/** Cached only when columns are known to exist (avoids stale false after user runs SQL without restarting). */
let dinerCaloriesProbe: boolean | null = null;
let restaurantCaloriesProbe: boolean | null = null;

/** Whether public.diner_scanned_dishes has calories columns. */
export async function dinerScannedDishesHasCaloriesColumns(): Promise<boolean> {
  if (dinerCaloriesProbe === true) return true;
  const { error } = await supabase.from('diner_scanned_dishes').select('calories_estimated').limit(0);
  if (!error) {
    dinerCaloriesProbe = true;
    return true;
  }
  if (isMissingDishCaloriesColumnsError(error)) {
    return false;
  }
  dinerCaloriesProbe = true;
  return true;
}

/** Whether public.restaurant_menu_dishes has calories columns. */
export async function restaurantMenuDishesHasCaloriesColumns(): Promise<boolean> {
  if (restaurantCaloriesProbe === true) return true;
  const { error } = await supabase.from('restaurant_menu_dishes').select('calories_estimated').limit(0);
  if (!error) {
    restaurantCaloriesProbe = true;
    return true;
  }
  if (isMissingDishCaloriesColumnsError(error)) {
    return false;
  }
  restaurantCaloriesProbe = true;
  return true;
}

export function stripDishCaloriesFields<T extends Record<string, unknown>>(row: T): Omit<T, 'calories_manual' | 'calories_estimated'> {
  const { calories_manual: _cm, calories_estimated: _ce, ...rest } = row;
  return rest;
}

export type DishCaloriesInsertTable = 'diner_scanned_dishes' | 'restaurant_menu_dishes';

/** Insert dish rows; on missing-calories-column errors retry without those fields (pre-US11 DB). */
export async function insertDishesWithCaloriesColumnFallback(
  table: DishCaloriesInsertTable,
  rows: Record<string, unknown>[],
): Promise<{ error: PostgrestError | null }> {
  if (rows.length === 0) return { error: null };
  let { error } = await supabase.from(table).insert(rows);
  if (error && isMissingDishCaloriesColumnsError(error)) {
    const stripped = rows.map((r) => stripDishCaloriesFields(r));
    ({ error } = await supabase.from(table).insert(stripped));
  }
  return { error };
}
