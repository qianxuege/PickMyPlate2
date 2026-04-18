import { fetchRestaurantMenuForScan } from '@/lib/restaurant-fetch-menu-for-scan';
import { fetchDinerRecentScans } from '@/lib/diner-menu-scans';
import { supabase } from '@/lib/supabase';

export type DinerHighlightDishRow = {
  dishId: string;
  restaurantId: string;
  restaurantName: string;
  scanId: string;
  name: string;
  description: string | null;
  price_display: string | null;
  price_amount: number | null;
  spice_level: 0 | 1 | 2 | 3;
  image_url: string | null;
  is_featured: boolean;
  is_new: boolean;
};

/**
 * Published menus only: dishes the owner marked Featured or New.
 * Scope is the diner's latest scanned restaurant.
 */
export async function fetchDinerHighlightDishes(): Promise<{
  restaurantName: string | null;
  rows: DinerHighlightDishRow[];
}> {
  const recentScans = await fetchDinerRecentScans(50);
  const latestRestaurantName = recentScans[0]?.restaurant_name?.trim() ?? null;
  if (!latestRestaurantName) return { restaurantName: null, rows: [] };

  const { data: venues, error: vErr } = await supabase
    .from('restaurants')
    .select('id, name, published_menu_scan_id')
    .not('published_menu_scan_id', 'is', null);

  if (vErr || !venues?.length) return { restaurantName: latestRestaurantName, rows: [] };

  const normalize = (s: string) => s.trim().toLowerCase();
  const venue = venues.find((v) => {
    const n = typeof v.name === 'string' ? v.name : '';
    return normalize(n) === normalize(latestRestaurantName);
  });
  if (!venue) return { restaurantName: latestRestaurantName, rows: [] };

  const out: DinerHighlightDishRow[] = [];
  const scanId = venue.published_menu_scan_id ? String(venue.published_menu_scan_id) : '';
  const restaurantId = String(venue.id);
  const restaurantName = typeof venue.name === 'string' && venue.name.trim() ? venue.name.trim() : latestRestaurantName;
  if (!scanId) return { restaurantName, rows: [] };

  const menu = await fetchRestaurantMenuForScan(scanId);
  if (!menu.ok) return { restaurantName, rows: [] };

  for (const d of menu.dishes) {
    if (!d.is_featured && !d.is_new) continue;
    out.push({
      dishId: d.id,
      restaurantId,
      restaurantName,
      scanId,
      name: d.name,
      description: d.description,
      price_display: d.price_display,
      price_amount: d.price_amount,
      spice_level: d.spice_level,
      image_url: d.image_url,
      is_featured: d.is_featured,
      is_new: d.is_new,
    });
  }

  return { restaurantName, rows: out };
}
