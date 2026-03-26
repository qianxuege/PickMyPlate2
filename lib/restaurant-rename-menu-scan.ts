import { supabase } from '@/lib/supabase';

const MAX_LEN = 120;

export type RenameMenuScanResult = { ok: true } | { ok: false; error: string };

/**
 * Updates the display name for a menu scan (header title on review / diner-facing label source).
 */
export async function updateRestaurantMenuScanName(scanId: string, rawName: string): Promise<RenameMenuScanResult> {
  const restaurant_name = rawName.trim();
  if (!restaurant_name) {
    return { ok: false, error: 'Please enter a menu name.' };
  }
  if (restaurant_name.length > MAX_LEN) {
    return { ok: false, error: `Menu name must be ${MAX_LEN} characters or fewer.` };
  }

  const { error } = await supabase.from('restaurant_menu_scans').update({ restaurant_name }).eq('id', scanId);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
