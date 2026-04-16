import * as Linking from 'expo-linking';

import {
  isMissingDishCaloriesColumnsError,
  stripDishCaloriesFields,
} from '@/lib/dish-calories-columns-support';
import { fetchRestaurantMenuForScan } from '@/lib/restaurant-fetch-menu-for-scan';
import { supabase } from '@/lib/supabase';

type OwnerTokenResult =
  | { ok: true; token: string; scanId: string; restaurantName: string }
  | { ok: false; error: string };

function randomToken(length = 28): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

export function buildPartnerMenuLink(token: string): string {
  return Linking.createURL('/partner-menu', { queryParams: { pm: token } });
}

export function buildPartnerMenuQrUrl(token: string): string {
  const link = buildPartnerMenuLink(token);
  return `https://api.qrserver.com/v1/create-qr-code/?size=800x800&data=${encodeURIComponent(link)}`;
}

/**
 * Owner-side: one active token for the currently published menu scan.
 */
export async function getOrCreateOwnerPartnerMenuToken(): Promise<OwnerTokenResult> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Sign in required' };

  const { data: rest, error: restErr } = await supabase
    .from('restaurants')
    .select('id, name, published_menu_scan_id')
    .eq('owner_id', user.id)
    .maybeSingle();
  if (restErr) return { ok: false, error: restErr.message };
  if (!rest?.id || !rest.published_menu_scan_id) {
    return { ok: false, error: 'Publish a menu before generating a QR code.' };
  }

  const scanId = String(rest.published_menu_scan_id);
  const restaurantId = String(rest.id);
  const restaurantName =
    typeof rest.name === 'string' && rest.name.trim() ? rest.name.trim() : 'Restaurant';

  const { data: existing, error: exErr } = await supabase
    .from('partner_menu_qr_tokens')
    .select('token')
    .eq('restaurant_id', restaurantId)
    .eq('scan_id', scanId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (exErr) return { ok: false, error: exErr.message };
  if (existing?.token) {
    return { ok: true, token: String(existing.token), scanId, restaurantName };
  }

  // Retry on unlikely token collision.
  for (let i = 0; i < 3; i += 1) {
    const token = randomToken();
    const { data: inserted, error: insErr } = await supabase
      .from('partner_menu_qr_tokens')
      .insert({
        token,
        restaurant_id: restaurantId,
        scan_id: scanId,
        is_active: true,
      })
      .select('token')
      .single();
    if (!insErr && inserted?.token) {
      return { ok: true, token: String(inserted.token), scanId, restaurantName };
    }
    if (insErr && !insErr.message.toLowerCase().includes('duplicate')) {
      return { ok: false, error: insErr.message };
    }
  }

  return { ok: false, error: 'Could not create partner token. Try again.' };
}

type ResolveResult = { ok: true; scanId: string; restaurantName: string } | { ok: false; error: string };

/**
 * Diner-side: resolve token -> published restaurant menu -> persist as a diner scan -> open.
 */
export async function resolvePartnerTokenToDinerScan(token: string): Promise<ResolveResult> {
  const trimmed = token.trim();
  if (!trimmed) return { ok: false, error: 'Invalid QR token.' };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Sign in required' };

  // Clearer error than a generic "inactive" when this account cannot pass diner RLS.
  const { data: dinerRoleRows, error: roleErr } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .eq('role', 'diner')
    .limit(1);
  if (roleErr) return { ok: false, error: roleErr.message };
  if (!dinerRoleRows || dinerRoleRows.length === 0) {
    return { ok: false, error: 'This account does not have diner access. Add/switch to Diner role, then scan again.' };
  }

  const { data: tokenRow, error: tokenErr } = await supabase
    .from('partner_menu_qr_tokens')
    .select('restaurant_id, scan_id, is_active')
    .eq('token', trimmed)
    .maybeSingle();
  if (tokenErr) return { ok: false, error: tokenErr.message };
  if (!tokenRow?.is_active || !tokenRow.scan_id) {
    return { ok: false, error: 'This QR code is inactive or unavailable for this account.' };
  }

  const scanId = String(tokenRow.scan_id);
  const restaurantId = String(tokenRow.restaurant_id);

  const { data: sourceScan, error: sourceScanErr } = await supabase
    .from('restaurant_menu_scans')
    .select('id, restaurant_id, restaurant_name, is_published, last_activity_at')
    .eq('id', scanId)
    .maybeSingle();
  if (sourceScanErr) return { ok: false, error: sourceScanErr.message };
  if (!sourceScan?.id || !sourceScan.is_published || String(sourceScan.restaurant_id) !== restaurantId) {
    return { ok: false, error: 'This QR code no longer points to a live menu.' };
  }
  const sourceLastActivityTs = sourceScan.last_activity_at
    ? Date.parse(String(sourceScan.last_activity_at))
    : NaN;

  // Fast path: if this diner already resolved this token before and the copied scan still exists, reuse it.
  const { data: cached, error: cacheErr } = await supabase
    .from('diner_partner_qr_scans')
    .select('diner_scan_id, source_scan_id')
    .eq('profile_id', user.id)
    .eq('token', trimmed)
    .maybeSingle();
  if (!cacheErr && cached?.diner_scan_id && String(cached.source_scan_id) === scanId) {
    const { data: existingScan, error: existingScanErr } = await supabase
      .from('diner_menu_scans')
      .select('id, restaurant_name, scanned_at')
      .eq('id', String(cached.diner_scan_id))
      .eq('profile_id', user.id)
      .maybeSingle();
    if (!existingScanErr && existingScan?.id) {
      const cachedScanTs = existingScan.scanned_at ? Date.parse(String(existingScan.scanned_at)) : NaN;
      const isFreshEnough =
        Number.isFinite(sourceLastActivityTs) && Number.isFinite(cachedScanTs)
          ? cachedScanTs >= sourceLastActivityTs
          : true;
      const { count } = await supabase
        .from('diner_menu_sections')
        .select('*', { count: 'exact', head: true })
        .eq('scan_id', String(existingScan.id));
      if ((count ?? 0) > 0 && isFreshEnough) {
        return {
          ok: true,
          scanId: String(existingScan.id),
          restaurantName:
            (typeof existingScan.restaurant_name === 'string' && existingScan.restaurant_name.trim()) ||
            'Restaurant',
        };
      }
    }
  }

  const menu = await fetchRestaurantMenuForScan(scanId);
  if (!menu.ok) return { ok: false, error: menu.error };

  const restaurantName =
    (typeof sourceScan.restaurant_name === 'string' && sourceScan.restaurant_name.trim()) ||
    menu.scan.restaurant_name ||
    'Restaurant';

  const { data: scan, error: scanErr } = await supabase
    .from('diner_menu_scans')
    .insert({
      profile_id: user.id,
      restaurant_name: restaurantName,
    })
    .select('id')
    .single();
  if (scanErr || !scan?.id) return { ok: false, error: scanErr?.message ?? 'Failed to save scan' };

  const dinerScanId = String(scan.id);
  const sectionInsert = menu.sections.map((s) => ({
    scan_id: dinerScanId,
    title: s.title,
    sort_order: s.sort_order,
  }));

  const { data: insertedSections, error: secErr } = await supabase
    .from('diner_menu_sections')
    .insert(sectionInsert)
    .select('id, sort_order');
  if (secErr || !insertedSections?.length) {
    await supabase.from('diner_menu_scans').delete().eq('id', dinerScanId);
    return { ok: false, error: secErr?.message ?? 'Failed to save sections' };
  }

  const sectionMap = new Map<number, string>();
  for (const row of insertedSections) {
    sectionMap.set(Number(row.sort_order), String(row.id));
  }
  const oldSectionSort = new Map<string, number>();
  for (const s of menu.sections) {
    oldSectionSort.set(String(s.id), Number(s.sort_order));
  }

  const dishInsert = menu.dishes
    .map((d) => {
      const secSort = oldSectionSort.get(String(d.section_id));
      const newSectionId = typeof secSort === 'number' ? sectionMap.get(secSort) : undefined;
      if (!newSectionId) return null;

      const tags = [...(d.tags ?? [])];
      if (d.is_new && !tags.includes('new')) tags.push('new');
      if (d.is_featured && !tags.includes('featured')) tags.push('featured');

      return {
        section_id: newSectionId,
        sort_order: d.sort_order,
        name: d.name,
        description: d.description,
        price_amount: d.price_amount,
        price_currency: d.price_currency,
        price_display: d.price_display,
        spice_level: d.spice_level,
        tags,
        ingredients: d.ingredients,
        image_url: d.image_url,
        calories_manual: d.calories_manual ?? null,
        calories_estimated: d.calories_estimated ?? null,
      };
    })
    .filter(Boolean);

  if (dishInsert.length > 0) {
    const rows = dishInsert as Record<string, unknown>[];
    let { error: dishErr } = await supabase.from('diner_scanned_dishes').insert(rows);
    if (dishErr && isMissingDishCaloriesColumnsError(dishErr)) {
      const stripped = rows.map((r) => stripDishCaloriesFields(r));
      ({ error: dishErr } = await supabase.from('diner_scanned_dishes').insert(stripped));
    }
    if (dishErr) {
      await supabase.from('diner_menu_scans').delete().eq('id', dinerScanId);
      return { ok: false, error: dishErr.message };
    }
  }

  await supabase.from('diner_partner_qr_scans').upsert(
    {
      profile_id: user.id,
      token: trimmed,
      source_scan_id: scanId,
      diner_scan_id: dinerScanId,
    },
    { onConflict: 'profile_id,token' },
  );

  return { ok: true, scanId: dinerScanId, restaurantName };
}
