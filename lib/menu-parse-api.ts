import Constants from 'expo-constants';

import { supabase } from '@/lib/supabase';

const MENU_API_KEY = 'EXPO_PUBLIC_MENU_API_URL';

function getMenuApiBaseUrl(): string {
  const fromEnv =
    process.env[MENU_API_KEY] ??
    (Constants.expoConfig?.extra as { menuApiUrl?: string } | undefined)?.menuApiUrl;
  const raw = typeof fromEnv === 'string' ? fromEnv.trim() : '';
  return raw.replace(/\/$/, '');
}

export type ParseMenuApiSuccess = {
  ok: true;
  menu: unknown;
};

export type ParseMenuApiFailure = {
  ok: false;
  error: string;
};

export type ParseMenuApiResult = ParseMenuApiSuccess | ParseMenuApiFailure;

/**
 * POST /v1/parse-menu — image already in Storage (scheme B).
 */
export async function requestMenuParse(params: {
  storageBucket: string;
  storagePath: string;
  userPreferences: Record<string, unknown>;
}): Promise<ParseMenuApiResult> {
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

  const body = {
    storage_bucket: params.storageBucket,
    storage_path: params.storagePath,
    user_preferences: params.userPreferences,
  };

  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.log('[menu-scan] POST /v1/parse-menu', {
      baseUrl: base,
      bodyKeys: Object.keys(body),
      storage_bucket: body.storage_bucket,
      storage_path: body.storage_path,
      storage_path_length: body.storage_path?.length ?? 0,
    });
  }

  let res: Response;
  try {
    res = await fetch(`${base}/v1/parse-menu`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
  } catch (e) {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.warn('[menu-scan] fetch error', e);
    }
    return { ok: false, error: e instanceof Error ? e.message : 'Network error' };
  }

  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.log('[menu-scan] response', { status: res.status, ok: res.ok });
  }

  let json: unknown;
  try {
    json = await res.json();
  } catch {
    return { ok: false, error: `Invalid JSON (${res.status})` };
  }

  if (!res.ok) {
    const err =
      typeof json === 'object' && json !== null && 'error' in json && typeof (json as { error: unknown }).error === 'string'
        ? (json as { error: string }).error
        : `HTTP ${res.status}`;
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.warn('[menu-scan] error response body', { status: res.status, json });
    }
    return { ok: false, error: err };
  }

  if (
    typeof json === 'object' &&
    json !== null &&
    'ok' in json &&
    (json as { ok: unknown }).ok === true &&
    'menu' in json
  ) {
    return { ok: true, menu: (json as { menu: unknown }).menu };
  }

  if (
    typeof json === 'object' &&
    json !== null &&
    'ok' in json &&
    (json as { ok: unknown }).ok === false &&
    'error' in json &&
    typeof (json as { error: unknown }).error === 'string'
  ) {
    return { ok: false, error: (json as { error: string }).error };
  }

  return { ok: false, error: 'Unexpected response from menu API' };
}
