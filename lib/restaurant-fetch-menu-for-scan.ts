import { supabase } from '@/lib/supabase';

export type RestaurantMenuSectionRow = {
  id: string;
  scan_id: string;
  title: string;
  sort_order: number;
};

export type RestaurantMenuDishRow = {
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
  needs_review: boolean;
};

export type FetchRestaurantMenuForScanResult =
  | { ok: true; scan: { id: string; restaurant_name: string | null }; sections: RestaurantMenuSectionRow[]; dishes: RestaurantMenuDishRow[] }
  | { ok: false; error: string };

function coerceSpiceLevel(v: unknown): 0 | 1 | 2 | 3 {
  if (v === 0 || v === 1 || v === 2 || v === 3) return v;
  if (typeof v === 'number' && Number.isInteger(v)) {
    const n = Math.max(0, Math.min(3, v));
    return n as 0 | 1 | 2 | 3;
  }
  return 0;
}

export async function fetchRestaurantMenuForScan(scanId: string): Promise<FetchRestaurantMenuForScanResult> {
  try {
    const { data: scanRow, error: scanErr } = await supabase
      .from('restaurant_menu_scans')
      .select('id, restaurant_name')
      .eq('id', scanId)
      .maybeSingle();

    if (scanErr) return { ok: false, error: scanErr.message };
    if (!scanRow) return { ok: false, error: 'Scan not found' };

    const { data: sections, error: secErr } = await supabase
      .from('restaurant_menu_sections')
      .select('id, scan_id, title, sort_order')
      .eq('scan_id', scanId)
      .order('sort_order', { ascending: true });

    if (secErr) return { ok: false, error: secErr.message };

    const sectionIds = (sections ?? []).map((s) => (s as RestaurantMenuSectionRow).id);
    let dishes: RestaurantMenuDishRow[] = [];

    if (sectionIds.length > 0) {
      const { data: dishRows, error: dishErr } = await supabase
        .from('restaurant_menu_dishes')
        .select(
          'id, section_id, sort_order, name, description, price_amount, price_currency, price_display, spice_level, tags, ingredients, image_url, needs_review',
        )
        .in('section_id', sectionIds)
        .order('sort_order', { ascending: true });

      if (dishErr) return { ok: false, error: dishErr.message };
      dishes = (dishRows ?? []).map((d) => ({
        ...(d as any),
        spice_level: coerceSpiceLevel((d as any).spice_level),
      })) as RestaurantMenuDishRow[];
    }

    return {
      ok: true,
      scan: { id: String(scanRow.id), restaurant_name: scanRow.restaurant_name ? String(scanRow.restaurant_name) : null },
      sections: (sections ?? []) as RestaurantMenuSectionRow[],
      dishes,
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed to load restaurant menu' };
  }
}

