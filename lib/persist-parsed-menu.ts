import {
  isMissingDishCaloriesColumnsError,
  stripDishCaloriesFields,
} from '@/lib/dish-calories-columns-support';
import type { ParsedMenu, ParsedMenuItem, ParsedMenuSection } from '@/lib/menu-scan-schema';
import { supabase } from '@/lib/supabase';

export type PersistParsedMenuResult =
  | { ok: true; scanId: string }
  | { ok: false; error: string };

/**
 * Insert scan → sections → dishes (single source of truth; no JSON blob).
 */
export async function persistParsedMenu(menu: ParsedMenu, profileId: string): Promise<PersistParsedMenuResult> {
  const restaurantName = menu.restaurant_name?.trim() || null;

  const { data: scanRow, error: scanErr } = await supabase
    .from('diner_menu_scans')
    .insert({
      profile_id: profileId,
      restaurant_name: restaurantName,
    })
    .select('id')
    .single();

  if (scanErr || !scanRow?.id) {
    return { ok: false, error: scanErr?.message ?? 'Failed to create scan' };
  }

  const scanId = scanRow.id as string;

  const sectionRows = menu.sections.map((s: ParsedMenuSection, i: number) => ({
    id: s.id,
    scan_id: scanId,
    title: s.title,
    sort_order: i,
  }));

  if (sectionRows.length > 0) {
    const { error: secErr } = await supabase.from('diner_menu_sections').insert(sectionRows);
    if (secErr) {
      await supabase.from('diner_menu_scans').delete().eq('id', scanId);
      return { ok: false, error: secErr.message };
    }
  }

  const dishRows: Record<string, unknown>[] = [];
  for (const sec of menu.sections) {
    sec.items.forEach((it: ParsedMenuItem, j: number) => {
      dishRows.push({
        id: it.id,
        section_id: sec.id,
        sort_order: j,
        name: it.name,
        description: it.description,
        price_amount: it.price.amount,
        price_currency: it.price.currency,
        price_display: it.price.display,
        spice_level: it.spice_level,
        tags: it.tags,
        ingredients: it.ingredients,
        image_url: null,
        calories_manual: null,
        calories_estimated:
          typeof it.calories_estimated === 'number' && Number.isFinite(it.calories_estimated)
            ? Math.round(it.calories_estimated)
            : null,
      });
    });
  }

  if (dishRows.length > 0) {
    let { error: dishErr } = await supabase.from('diner_scanned_dishes').insert(dishRows);
    if (dishErr && isMissingDishCaloriesColumnsError(dishErr)) {
      const stripped = dishRows.map((r) => stripDishCaloriesFields(r));
      ({ error: dishErr } = await supabase.from('diner_scanned_dishes').insert(stripped));
    }
    if (dishErr) {
      await supabase.from('diner_menu_scans').delete().eq('id', scanId);
      return { ok: false, error: dishErr.message };
    }
  }

  return { ok: true, scanId };
}
