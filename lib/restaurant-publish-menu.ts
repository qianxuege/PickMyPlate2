import { supabase } from '@/lib/supabase';

export type PublishRestaurantMenuResult = { ok: true } | { ok: false; error: string };

export async function publishRestaurantMenu(scanId: string): Promise<PublishRestaurantMenuResult> {
  const { data, error } = await supabase.rpc('publish_restaurant_menu', { target_scan_id: scanId });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

