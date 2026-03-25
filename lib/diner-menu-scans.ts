import { supabase } from '@/lib/supabase';

export type DinerMenuScanListRow = {
  id: string;
  restaurant_name: string | null;
  scanned_at: string;
};

/**
 * Recent scans for the signed-in diner, newest first (matches index diner_menu_scans_profile_scanned_at_idx).
 */
export async function fetchDinerRecentScans(): Promise<DinerMenuScanListRow[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('diner_menu_scans')
    .select('id, restaurant_name, scanned_at')
    .eq('profile_id', user.id)
    .order('scanned_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as DinerMenuScanListRow[];
}
