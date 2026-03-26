import type { AppRole } from '@/lib/app-role';
import { filterAppRoles } from '@/lib/app-role';
import { getErrorMessage } from '@/lib/error-message';
import { supabase } from '@/lib/supabase';

const DEFAULT_TIMEOUT_MS = 10000;

function withTimeout<T>(fn: () => Promise<T>, ms: number, label: string): Promise<T> {
  let t: ReturnType<typeof setTimeout> | null = null;
  return Promise.race([
    fn().finally(() => {
      if (t) clearTimeout(t);
    }),
    new Promise<T>((_, reject) => {
      t = setTimeout(() => {
        reject(new Error(`${label} timed out after ${ms}ms`));
      }, ms);
    }),
  ]);
}

export async function fetchUserRoles(userId: string, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<AppRole[]> {
  const res = await withTimeout(
    async () => {
      return await supabase.from('user_roles').select('role').eq('user_id', userId);
    },
    timeoutMs,
    'fetchUserRoles',
  );

  const { data, error } = res as { data: Array<{ role: unknown }> | null; error: unknown };

  if (error) throw new Error(getErrorMessage(error as any));

  return filterAppRoles(
    (data ?? []).map((r) => r.role).filter((x): x is AppRole => typeof x === 'string') as AppRole[],
  );
}
