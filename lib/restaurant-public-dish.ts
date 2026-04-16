import { getPublishedRestaurantDishSelectColumns } from '@/lib/dish-calories-columns-support';
import { supabase } from '@/lib/supabase';

export type PublishedRestaurantDishDetail = {
  id: string;
  name: string;
  description: string | null;
  price_amount: number | null;
  price_currency: string;
  price_display: string | null;
  spice_level: 0 | 1 | 2 | 3;
  tags: string[];
  ingredients: string[];
  image_url: string | null;
  is_featured: boolean;
  is_new: boolean;
  restaurantName: string;
  calories_manual: number | null;
  calories_estimated: number | null;
};

function coerceSpice(v: unknown): 0 | 1 | 2 | 3 {
  if (v === 0 || v === 1 || v === 2 || v === 3) return v;
  if (typeof v === 'number' && Number.isInteger(v)) {
    const n = Math.max(0, Math.min(3, v));
    return n as 0 | 1 | 2 | 3;
  }
  return 0;
}

/**
 * Load a restaurant menu dish that belongs to the venue’s currently published scan (diner-readable via RLS).
 */
export async function fetchPublishedRestaurantDishDetail(
  dishId: string,
): Promise<{ ok: true; dish: PublishedRestaurantDishDetail } | { ok: false; error: string }> {
  const dishCols = await getPublishedRestaurantDishSelectColumns();
  const { data: dish, error: dErr } = await supabase
    .from('restaurant_menu_dishes')
    .select(dishCols as any)
    .eq('id', dishId)
    .maybeSingle();

  if (dErr) return { ok: false, error: dErr.message };
  if (!dish) return { ok: false, error: 'Dish not found' };

  const { data: sec, error: sErr } = await supabase
    .from('restaurant_menu_sections')
    .select('scan_id')
    .eq('id', (dish as unknown as { section_id: string }).section_id)
    .maybeSingle();

  if (sErr || !sec?.scan_id) return { ok: false, error: 'Menu not found' };

  const { data: scan, error: scErr } = await supabase
    .from('restaurant_menu_scans')
    .select('id, is_published, restaurant_id')
    .eq('id', sec.scan_id)
    .maybeSingle();

  if (scErr || !scan) return { ok: false, error: 'Menu not found' };
  if (!scan.is_published) return { ok: false, error: 'This dish is not on a live menu yet.' };

  const { data: rest, error: rErr } = await supabase
    .from('restaurants')
    .select('id, name, published_menu_scan_id')
    .eq('id', scan.restaurant_id)
    .maybeSingle();

  if (rErr || !rest) return { ok: false, error: 'Restaurant not found' };
  if (String(rest.published_menu_scan_id) !== String(scan.id)) {
    return { ok: false, error: 'This dish is not on the live menu.' };
  }

  const row = dish as unknown as Record<string, unknown>;
  const name = typeof row.name === 'string' ? row.name : '';
  const restaurantName =
    typeof rest.name === 'string' && rest.name.trim() ? rest.name.trim() : 'Restaurant';

  const cm = row.calories_manual;
  const ce = row.calories_estimated;

  return {
    ok: true,
    dish: {
      id: String(row.id),
      name,
      description: row.description == null ? null : String(row.description),
      price_amount: row.price_amount == null ? null : Number(row.price_amount),
      price_currency: typeof row.price_currency === 'string' ? row.price_currency : 'USD',
      price_display: row.price_display == null ? null : String(row.price_display),
      spice_level: coerceSpice(row.spice_level),
      tags: Array.isArray(row.tags) ? (row.tags as string[]) : [],
      ingredients: Array.isArray(row.ingredients) ? (row.ingredients as string[]) : [],
      image_url: row.image_url == null ? null : String(row.image_url),
      is_featured: Boolean(row.is_featured),
      is_new: Boolean(row.is_new),
      restaurantName,
      calories_manual: typeof cm === 'number' && Number.isFinite(cm) ? Math.round(cm) : null,
      calories_estimated: typeof ce === 'number' && Number.isFinite(ce) ? Math.round(ce) : null,
    },
  };
}
