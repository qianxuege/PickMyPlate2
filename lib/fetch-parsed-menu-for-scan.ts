import {
  assembleParsedMenu,
  type DinerMenuSectionRow,
  type DinerScannedDishRow,
  type ParsedMenu,
} from '@/lib/menu-scan-schema';
import { supabase } from '@/lib/supabase';

export type FetchParsedMenuResult =
  | { ok: true; menu: ParsedMenu }
  | { ok: false; error: string };

/**
 * Loads scan → sections → dishes and assembles a ParsedMenu (same contract as diner menu screen).
 */
export async function fetchParsedMenuForScan(scanId: string): Promise<FetchParsedMenuResult> {
  try {
    const { data: scanRow, error: scanErr } = await supabase
      .from('diner_menu_scans')
      .select('restaurant_name')
      .eq('id', scanId)
      .maybeSingle();
    if (scanErr) return { ok: false, error: scanErr.message };
    if (!scanRow) return { ok: false, error: 'Scan not found' };

    const { data: sections, error: secErr } = await supabase
      .from('diner_menu_sections')
      .select('id, scan_id, title, sort_order')
      .eq('scan_id', scanId)
      .order('sort_order', { ascending: true });
    if (secErr) return { ok: false, error: secErr.message };

    const sectionIds = (sections ?? []).map((s: DinerMenuSectionRow) => s.id);
    let dishes: DinerScannedDishRow[] = [];
    if (sectionIds.length > 0) {
      const { data: dishRows, error: dishErr } = await supabase
        .from('diner_scanned_dishes')
        .select(
          'id, section_id, sort_order, name, description, price_amount, price_currency, price_display, spice_level, tags, ingredients, ingredient_items, image_url'
        )
        .in('section_id', sectionIds)
        .order('sort_order', { ascending: true });
      if (dishErr) return { ok: false, error: dishErr.message };
      dishes = (dishRows ?? []) as DinerScannedDishRow[];
    }

    const menu = assembleParsedMenu(
      scanRow.restaurant_name ?? null,
      (sections ?? []) as DinerMenuSectionRow[],
      dishes
    );
    return { ok: true, menu };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed to load menu' };
  }
}
