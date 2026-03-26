import { supabase } from '@/lib/supabase';

export type RestaurantMenuScanListRow = {
  id: string;
  restaurant_name: string | null;
  last_activity_at: string;
};

export async function fetchRestaurantRecentUploads(limit = 10): Promise<RestaurantMenuScanListRow[]> {
  const { data, error } = await supabase
    .from('restaurant_menu_scans')
    .select('id, restaurant_name, last_activity_at')
    .order('last_activity_at', { ascending: false })
    .limit(limit);

  if (error) throw error;

  return (data ?? []) as RestaurantMenuScanListRow[];
}

