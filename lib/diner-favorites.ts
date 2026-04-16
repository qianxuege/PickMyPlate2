import { supabase } from '@/lib/supabase';

export type DinerFavoriteListItem = {
  dishId: string;
  favoritedAt: string;
  name: string;
  restaurantName: string | null;
  /** Partner QR–linked scans only; use for grouping so same display name ≠ same business */
  restaurantId: string | null;
  scanId: string | null;
  priceAmount: number | null;
  priceCurrency: string;
  priceDisplay: string | null;
  spiceLevel: 0 | 1 | 2 | 3;
  imageUrl: string | null;
  note: string | null;
};

export const NOTE_MAX_LENGTH = 300;

/**
 * All favorited dish ids for the signed-in diner (for menu/search hearts).
 */
export async function fetchFavoritedDishIds(): Promise<Set<string>> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Set();

  const { data, error } = await supabase
    .from('diner_favorite_dishes')
    .select('dish_id')
    .eq('profile_id', user.id);

  if (error) throw new Error(error.message);
  return new Set((data ?? []).map((r) => r.dish_id as string));
}

export async function isDishFavorited(dishId: string): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data, error } = await supabase
    .from('diner_favorite_dishes')
    .select('dish_id')
    .eq('profile_id', user.id)
    .eq('dish_id', dishId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return !!data;
}

/** Returns true if now favorited, false if removed. */
export async function toggleDishFavorite(dishId: string): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Sign in required');

  const { data: existing, error: selErr } = await supabase
    .from('diner_favorite_dishes')
    .select('dish_id')
    .eq('profile_id', user.id)
    .eq('dish_id', dishId)
    .maybeSingle();

  if (selErr) throw new Error(selErr.message);

  if (existing) {
    const { error: delErr } = await supabase
      .from('diner_favorite_dishes')
      .delete()
      .eq('profile_id', user.id)
      .eq('dish_id', dishId);
    if (delErr) throw new Error(delErr.message);
    return false;
  }

  const { error: insErr } = await supabase.from('diner_favorite_dishes').insert({
    profile_id: user.id,
    dish_id: dishId,
  });
  if (insErr) throw new Error(insErr.message);
  return true;
}

/**
 * Favorites ordered by most recently saved (same order as `diner_favorite_dishes.created_at` desc).
 */
export async function fetchDinerFavoritesList(): Promise<DinerFavoriteListItem[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: favs, error: favErr } = await supabase
    .from('diner_favorite_dishes')
    .select('dish_id, created_at, note')
    .eq('profile_id', user.id)
    .order('created_at', { ascending: false });

  if (favErr) throw new Error(favErr.message);
  if (!favs?.length) return [];

  const ids = favs.map((f) => f.dish_id as string);

  const { data: dishes, error: dishErr } = await supabase
    .from('diner_scanned_dishes')
    .select('id, name, price_amount, price_currency, price_display, spice_level, image_url, section_id')
    .in('id', ids);

  if (dishErr) throw new Error(dishErr.message);

  const dishById = new Map((dishes ?? []).map((d) => [d.id as string, d]));
  const sectionIds = [...new Set((dishes ?? []).map((d) => d.section_id as string))];

  const { data: sections, error: secErr } = await supabase
    .from('diner_menu_sections')
    .select('id, scan_id')
    .in('id', sectionIds);

  if (secErr) throw new Error(secErr.message);

  const scanIds = [...new Set((sections ?? []).map((s) => s.scan_id as string))];

  const { data: scans, error: scanErr } = await supabase
    .from('diner_menu_scans')
    .select('id, restaurant_name')
    .in('id', scanIds);

  if (scanErr) throw new Error(scanErr.message);

  const dinerScanToRestaurantId = new Map<string, string>();
  if (scanIds.length > 0) {
    const { data: qrLinks, error: qrErr } = await supabase
      .from('diner_partner_qr_scans')
      .select('diner_scan_id, source_scan_id')
      .eq('profile_id', user.id)
      .in('diner_scan_id', scanIds);
    if (!qrErr && qrLinks?.length) {
      const sourceIds = [...new Set(qrLinks.map((r) => r.source_scan_id as string))];
      const { data: rmsRows, error: rmsErr } = await supabase
        .from('restaurant_menu_scans')
        .select('id, restaurant_id')
        .in('id', sourceIds);
      if (!rmsErr && rmsRows?.length) {
        const rmsById = new Map((rmsRows ?? []).map((r) => [r.id as string, String(r.restaurant_id)]));
        for (const link of qrLinks) {
          const ds = link.diner_scan_id as string;
          const rid = rmsById.get(link.source_scan_id as string);
          if (rid) dinerScanToRestaurantId.set(ds, rid);
        }
      }
    }
  }

  const sectionToScan = new Map((sections ?? []).map((s) => [s.id as string, s.scan_id as string]));
  const scanMeta = new Map(
    (scans ?? []).map((s) => [s.id as string, { name: (s.restaurant_name as string | null)?.trim() || null }])
  );

  const out: DinerFavoriteListItem[] = [];

  for (const f of favs) {
    const dishId = f.dish_id as string;
    const d = dishById.get(dishId);
    if (!d) continue;

    const secId = d.section_id as string;
    const scanId = sectionToScan.get(secId) ?? null;
    const restaurantName = scanId ? scanMeta.get(scanId)?.name ?? null : null;
    const restaurantId = scanId ? dinerScanToRestaurantId.get(scanId) ?? null : null;

    out.push({
      dishId,
      favoritedAt: f.created_at as string,
      name: d.name as string,
      restaurantName,
      restaurantId,
      scanId,
      priceAmount: d.price_amount as number | null,
      priceCurrency: (d.price_currency as string) || 'USD',
      priceDisplay: (d.price_display as string | null) ?? null,
      spiceLevel: (d.spice_level ?? 0) as 0 | 1 | 2 | 3,
      imageUrl: (d.image_url as string | null) ?? null,
      note: (f.note as string | null) ?? null,
    });
  }

  return out;
}

/**
 * Fetch the note for a single favorited dish (used on the dish detail page).
 * Returns null if not favorited or no note set.
 */
export async function fetchFavoriteNote(dishId: string): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('diner_favorite_dishes')
    .select('note')
    .eq('profile_id', user.id)
    .eq('dish_id', dishId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data?.note as string | null) ?? null;
}

/**
 * Save or clear a note on a favorited dish.
 * Passing an empty string clears the note (sets to null).
 */
export async function upsertFavoriteNote(dishId: string, note: string): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Sign in required');

  const trimmed = note.trim();
  if (trimmed.length > NOTE_MAX_LENGTH) {
    throw new Error(`Notes must be ${NOTE_MAX_LENGTH} characters or fewer.`);
  }

  const { error } = await supabase
    .from('diner_favorite_dishes')
    .update({ note: trimmed.length > 0 ? trimmed : null })
    .eq('profile_id', user.id)
    .eq('dish_id', dishId);

  if (error) throw new Error(error.message);
}
