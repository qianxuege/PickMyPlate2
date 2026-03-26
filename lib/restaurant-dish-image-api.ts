import Constants from 'expo-constants';

import { supabase } from '@/lib/supabase';

const MENU_API_KEY = 'EXPO_PUBLIC_MENU_API_URL';

function getMenuApiBaseUrl(): string {
  const fromEnv = process.env[MENU_API_KEY] ?? (Constants.expoConfig?.extra as { menuApiUrl?: string } | undefined)?.menuApiUrl;
  const raw = typeof fromEnv === 'string' ? fromEnv.trim() : '';
  return raw.replace(/\/$/, '');
}

export async function generateRestaurantDishImage(dishId: string): Promise<{ ok: true; imageUrl: string } | { ok: false; error: string }> {
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
    res = await fetch(`${base}/v1/restaurant-dishes/${dishId}/generate-image`, {
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
    if ('image_url' in (json as any) && typeof (json as any).image_url === 'string') {
      return { ok: true, imageUrl: (json as any).image_url };
    }
  }

  if (typeof json === 'object' && json !== null && 'error' in json && typeof (json as any).error === 'string') {
    return { ok: false, error: (json as any).error };
  }

  return { ok: false, error: `HTTP ${res.status}` };
}

