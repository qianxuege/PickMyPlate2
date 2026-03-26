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
      image_url: null,
      needs_review: true,
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
  ingredients: string[];
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
  const needs_review = restaurantMenuDishNeedsReview({
    name: input.name,
    priceAmount: input.priceAmount,
    ingredients: input.ingredients,
  });

  const { error } = await supabase.from('restaurant_menu_dishes').update({
    name: input.name,
    description: input.description,
    price_amount: input.priceAmount,
    price_currency: input.priceCurrency,
    price_display: input.priceDisplay,
    spice_level: input.spiceLevel,
    tags: input.tags,
    ingredients: input.ingredients,
    needs_review,
  }).eq('id', input.dishId);

  if (error) return { ok: false, error: error.message };

  if (input.touchScan ?? true) {
    await touchRestaurantMenuScan(input.scanId);
  }
  return { ok: true };
}

