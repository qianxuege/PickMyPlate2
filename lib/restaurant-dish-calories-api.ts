import Constants from 'expo-constants';

import { supabase } from '@/lib/supabase';

const MENU_API_KEY = 'EXPO_PUBLIC_MENU_API_URL';

/** Digits-only optional calories for owner forms; empty → null. */
export function parseCaloriesManualInput(raw: string): number | null {
  const trimmed = raw.trim();
  if (/-\s*\d/.test(trimmed)) return null;

  const digits = trimmed.replace(/\D/g, '');
  if (!digits) return null;
  const n = parseInt(digits, 10);
  if (!Number.isFinite(n) || n < 0 || n > 20000) return null;
  return n;
}

function getMenuApiBaseUrl(): string {
  const fromEnv = process.env[MENU_API_KEY] ?? (Constants.expoConfig?.extra as { menuApiUrl?: string } | undefined)?.menuApiUrl;
  const raw = typeof fromEnv === 'string' ? fromEnv.trim() : '';
  return raw.replace(/\/$/, '');
}

export async function estimateRestaurantDishCalories(
  dishId: string,
): Promise<{ ok: true; caloriesEstimated: number | null } | { ok: false; error: string }> {
  const base = getMenuApiBaseUrl();
  if (!base) {
    return { ok: false, error: 'Missing EXPO_PUBLIC_MENU_API_URL (Flask base URL).' };
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (session?.access_token) {
    headers.Authorization = `Bearer ${session.access_token}`;
  }

  let res: Response;
  try {
    res = await fetch(`${base}/v1/restaurant-dishes/${dishId}/estimate-calories`, {
      method: 'POST',
      headers,
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Network error' };
  }

  let json: unknown;
  try {
    json = await res.json();
  } catch {
    return { ok: false, error: `Invalid JSON (${res.status})` };
  }

  if (res.ok && typeof json === 'object' && json !== null && 'ok' in json && (json as { ok: unknown }).ok === true) {
    const ce = (json as { calories_estimated?: unknown }).calories_estimated;
    if (ce === null || ce === undefined) {
      return { ok: true, caloriesEstimated: null };
    }
    if (typeof ce === 'number' && Number.isFinite(ce)) {
      return { ok: true, caloriesEstimated: Math.round(ce) };
    }
    return { ok: true, caloriesEstimated: null };
  }

  if (typeof json === 'object' && json !== null && 'error' in json && typeof (json as { error?: unknown }).error === 'string') {
    const err = (json as { error: string }).error;
    if (res.status === 429 && err === 'calorie_estimate_rate_limited') {
      const sec = (json as { retry_after_seconds?: unknown }).retry_after_seconds;
      const n = typeof sec === 'number' && Number.isFinite(sec) ? Math.max(1, Math.round(sec)) : null;
      return {
        ok: false,
        error:
          n != null
            ? `Please wait about ${n}s before estimating calories for this dish again.`
            : 'Please wait before estimating calories for this dish again.',
      };
    }
    return { ok: false, error: err };
  }

  return { ok: false, error: `HTTP ${res.status}` };
}
