import { insertDishesWithCaloriesColumnFallback } from '@/lib/dish-calories-columns-support';
import {
  structuredIngredientsForPersist,
  type ParsedMenu,
  type ParsedMenuItem,
  type ParsedMenuSection,
} from '@/lib/menu-scan-schema';
import { supabase } from '@/lib/supabase';
import { restaurantMenuDishNeedsReview } from '@/lib/restaurant-menu-dish-utils';

export type PersistRestaurantMenuDraftResult =
  | { ok: true; scanId: string }
  | { ok: false; error: string };

function coerceSpiceLevel(v: unknown): 0 | 1 | 2 | 3 {
  if (v === 0 || v === 1 || v === 2 || v === 3) return v;
  if (typeof v === 'number' && Number.isInteger(v)) {
    const n = Math.max(0, Math.min(3, v));
    return n as 0 | 1 | 2 | 3;
  }
  return 0;
}

export async function persistRestaurantMenuDraft(menu: ParsedMenu, restaurantId: string): Promise<PersistRestaurantMenuDraftResult> {
  const restaurantName = menu.restaurant_name?.trim() || null;

  const { data: scanRow, error: scanErr } = await supabase
    .from('restaurant_menu_scans')
    .insert({
      restaurant_id: restaurantId,
      restaurant_name: restaurantName,
    })
    .select('id')
    .single();

  if (scanErr || !scanRow?.id) {
    return { ok: false, error: scanErr?.message ?? 'Failed to create menu scan' };
  }

  const scanId = scanRow.id as string;

  const sectionRows: Array<{
    id: string;
    scan_id: string;
    title: string;
    sort_order: number;
  }> = menu.sections.map((s: ParsedMenuSection, i: number) => ({
    id: s.id,
    scan_id: scanId,
    title: s.title,
    sort_order: i,
  }));

  if (sectionRows.length > 0) {
    const { error: secErr } = await supabase.from('restaurant_menu_sections').insert(sectionRows);
    if (secErr) {
      await supabase.from('restaurant_menu_scans').delete().eq('id', scanId);
      return { ok: false, error: secErr.message };
    }
  }

  const dishRows: Array<Record<string, unknown>> = [];
  for (const sec of menu.sections) {
    sec.items.forEach((it: ParsedMenuItem, j: number) => {
      const needs_review = restaurantMenuDishNeedsReview({
        name: it.name,
        priceAmount: it.price.amount,
        ingredients: it.ingredients,
      });
      dishRows.push({
        id: it.id,
        section_id: sec.id,
        sort_order: j,
        name: it.name,
        description: it.description,
        price_amount: it.price.amount,
        price_currency: it.price.currency,
        price_display: it.price.display,
        spice_level: coerceSpiceLevel(it.spice_level),
        tags: it.tags,
        ingredients: it.ingredients,
        ingredient_items: structuredIngredientsForPersist(it),
        image_url: null,
        needs_review,
        calories_manual: null,
        calories_estimated:
          typeof it.calories_estimated === 'number' && Number.isFinite(it.calories_estimated)
            ? Math.round(it.calories_estimated)
            : null,
      });
    });
  }

  if (dishRows.length > 0) {
    const { error: dishErr } = await insertDishesWithCaloriesColumnFallback('restaurant_menu_dishes', dishRows);
    if (dishErr) {
      await supabase.from('restaurant_menu_scans').delete().eq('id', scanId);
      return { ok: false, error: dishErr.message };
    }
  }

  return { ok: true, scanId };
}

