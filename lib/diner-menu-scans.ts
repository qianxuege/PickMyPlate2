import { supabase } from '@/lib/supabase';

export type DinerMenuScanListRow = {
  id: string;
  restaurant_name: string | null;
  scanned_at: string;
};

/**
 * Recent scans for the signed-in diner, newest first (matches index diner_menu_scans_profile_scanned_at_idx).
 * Pass `limit` on hot paths (e.g. Home) to avoid loading an unbounded list for heavy users.
 */
export async function fetchDinerRecentScans(limit?: number): Promise<DinerMenuScanListRow[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  let q = supabase
    .from('diner_menu_scans')
    .select('id, restaurant_name, scanned_at')
    .eq('profile_id', user.id)
    .order('scanned_at', { ascending: false });

  if (typeof limit === 'number' && limit > 0) {
    q = q.limit(limit);
  }

  const { data, error } = await q;

  if (error) throw error;
  return (data ?? []) as DinerMenuScanListRow[];
}
