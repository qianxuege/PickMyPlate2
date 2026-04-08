import type { AuthError } from '@supabase/supabase-js';

import { fetchUserRoles } from '@/lib/user-roles';
import { ensureDinerRole, ensureRestaurantRole } from '@/lib/restaurant-setup';
import { supabase } from '@/lib/supabase';

/**
 * True when signUp failed because this email already has an auth account.
 * Supabase messages vary by version/settings; keep checks conservative.
 */
export function isDuplicateEmailSignupError(error: AuthError | Error): boolean {
  const msg = error.message.toLowerCase();
  return (
    msg.includes('already') ||
    msg.includes('registered') ||
    msg.includes('user already') ||
    (msg.includes('email address') && msg.includes('registered'))
  );
}

export type LinkRestaurantResult =
  | { status: 'linked' }
  | { status: 'already_restaurant' }
  | { status: 'auth_failed'; message: string }
  | { status: 'role_failed'; message: string };

/**
 * Link second role to an existing auth user. Calls `signInWithPassword` — the password must be the
 * account’s current password. Supabase does not store two passwords; merging roles does not change the password.
 */
export async function linkRestaurantToExistingAccount(
  email: string,
  password: string
): Promise<LinkRestaurantResult> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { status: 'auth_failed', message: error.message };
  const uid = data.user?.id;
  if (!uid) return { status: 'auth_failed', message: 'No user id returned.' };

  const roles = await fetchUserRoles(uid);
  if (roles.includes('restaurant')) {
    return { status: 'already_restaurant' };
  }

  const { error: rErr } = await ensureRestaurantRole();
  if (rErr) return { status: 'role_failed', message: rErr.message };
  return { status: 'linked' };
}

export type LinkDinerResult =
  | { status: 'linked' }
  | { status: 'already_diner' }
  | { status: 'auth_failed'; message: string }
  | { status: 'role_failed'; message: string };

/** @see linkRestaurantToExistingAccount — same password semantics. */
export async function linkDinerToExistingAccount(
  email: string,
  password: string
): Promise<LinkDinerResult> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { status: 'auth_failed', message: error.message };
  const uid = data.user?.id;
  if (!uid) return { status: 'auth_failed', message: 'No user id returned.' };

  const roles = await fetchUserRoles(uid);
  if (roles.includes('diner')) {
    return { status: 'already_diner' };
  }

  const { error: rErr } = await ensureDinerRole();
  if (rErr) return { status: 'role_failed', message: rErr.message };
  return { status: 'linked' };
}
