import { supabase } from '@/lib/supabase';
import { fetchRestaurantIdForOwner } from '@/lib/restaurant-setup';

export type CreateBlankMenuResult =
  | { ok: true; scanId: string; sectionId: string }
  | { ok: false; error: string };

function defaultMenuName(): string {
  const now = new Date();
  const month = now.toLocaleString('en-US', { month: 'short' });
  const day = now.getDate();
  const year = now.getFullYear();
  return `My Menu – ${month} ${day}, ${year}`;
}

export async function createBlankRestaurantMenu(): Promise<CreateBlankMenuResult> {
  const { restaurantId, error: rErr } = await fetchRestaurantIdForOwner();
  if (!restaurantId || rErr) {
    return { ok: false, error: rErr?.message ?? 'Restaurant profile not found. Complete setup first.' };
  }

  const { data: scanRow, error: scanErr } = await supabase
    .from('restaurant_menu_scans')
    .insert({
      restaurant_id: restaurantId,
      restaurant_name: defaultMenuName(),
    })
    .select('id')
    .single();

  if (scanErr || !scanRow?.id) {
    return { ok: false, error: scanErr?.message ?? 'Failed to create menu' };
  }

  const scanId = String(scanRow.id);

  const { data: secRow, error: secErr } = await supabase
    .from('restaurant_menu_sections')
    .insert({
      scan_id: scanId,
      title: 'Menu',
      sort_order: 0,
    })
    .select('id')
    .single();

  if (secErr || !secRow?.id) {
    await supabase.from('restaurant_menu_scans').delete().eq('id', scanId);
    return { ok: false, error: secErr?.message ?? 'Failed to create default section' };
  }

  return { ok: true, scanId, sectionId: String(secRow.id) };
}
