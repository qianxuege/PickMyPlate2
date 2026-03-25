import type { AppRole } from '@/lib/app-role';
import { filterAppRoles } from '@/lib/app-role';
import { getErrorMessage } from '@/lib/error-message';
import { supabase } from '@/lib/supabase';

export async function fetchUserRoles(userId: string): Promise<AppRole[]> {
  const { data, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId);

  if (error) throw new Error(getErrorMessage(error));
  return filterAppRoles((data ?? []).map((r) => r.role));
}
