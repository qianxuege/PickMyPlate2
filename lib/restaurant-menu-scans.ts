import { supabase } from '@/lib/supabase';

export type RestaurantMenuScanListRow = {
  id: string;
  restaurant_id: string;
  restaurant_name: string | null;
  last_activity_at: string;
};

async function fetchOwnerRestaurantId(): Promise<string> {
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr) throw userErr;
  if (!user) throw new Error('Not signed in');

  const { data: restaurantRow, error: restaurantErr } = await supabase
    .from('restaurants')
    .select('id')
    .eq('owner_id', user.id)
    .maybeSingle();

  if (restaurantErr) throw restaurantErr;
  if (!restaurantRow?.id) throw new Error('Restaurant profile not found for current owner');
  return String(restaurantRow.id);
}

export async function fetchRestaurantRecentUploads(limit = 10): Promise<RestaurantMenuScanListRow[]> {
  const restaurantId = await fetchOwnerRestaurantId();
  const { data, error } = await supabase
    .from('restaurant_menu_scans')
    .select('id, restaurant_id, restaurant_name, last_activity_at')
    .eq('restaurant_id', restaurantId)
    .order('last_activity_at', { ascending: false })
    .limit(limit);

  if (error) throw error;

  return (data ?? []) as RestaurantMenuScanListRow[];
}

export async function fetchRestaurantAllUploads(limit = 100): Promise<RestaurantMenuScanListRow[]> {
  return fetchRestaurantRecentUploads(limit);
}

/** True if this menu scan belongs to the signed-in owner's restaurant. */
export async function scanBelongsToOwnerRestaurant(scanId: string): Promise<boolean> {
  try {
    const restaurantId = await fetchOwnerRestaurantId();
    const { data, error } = await supabase
      .from('restaurant_menu_scans')
      .select('id')
      .eq('restaurant_id', restaurantId)
      .eq('id', scanId.trim())
      .maybeSingle();
    if (error) throw error;
    return !!data;
  } catch {
    return false;
  }
}
