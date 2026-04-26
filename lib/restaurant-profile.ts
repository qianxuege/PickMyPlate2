import { supabase } from '@/lib/supabase';

export type RestaurantProfileRow = {
  id: string;
  owner_id: string;
  name: string;
  specialty: string | null;
  location_short: string | null;
  address: string | null;
  phone: string | null;
  hours_text: string | null;
  website: string | null;
  logo_url: string | null;
  price_range: string | null;
};

export type RestaurantProfileSnapshot = {
  restaurant: RestaurantProfileRow;
  cuisineLabels: string;
  cuisineNames: string[];
};

/**
 * Load the signed-in owner's restaurant with joined cuisine names (display only).
 */
export async function fetchRestaurantProfile(): Promise<RestaurantProfileSnapshot | null> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  const user = userData?.user;
  if (userError || !user) return null;

  const { data: rest, error: rErr } = await supabase.from('restaurants').select('*').eq('owner_id', user.id).maybeSingle();

  if (rErr || !rest) return null;

  const r = rest as Record<string, unknown>;
  const row: RestaurantProfileRow = {
    id: String(r.id),
    owner_id: String(r.owner_id),
    name: typeof r.name === 'string' ? r.name : '',
    specialty: typeof r.specialty === 'string' ? r.specialty : null,
    location_short: typeof r.location_short === 'string' ? r.location_short : null,
    address: typeof r.address === 'string' ? r.address : null,
    phone: typeof r.phone === 'string' ? r.phone : null,
    hours_text: typeof r.hours_text === 'string' ? r.hours_text : null,
    website: typeof r.website === 'string' ? r.website : null,
    logo_url: typeof r.logo_url === 'string' ? r.logo_url : null,
    price_range: typeof r.price_range === 'string' ? r.price_range : null,
  };

  const { data: links } = await supabase
    .from('restaurant_cuisine_types')
    .select('cuisine_id')
    .eq('restaurant_id', row.id);

  const ids = (links ?? []).map((l) => l.cuisine_id).filter(Boolean);
  let cuisineLabels = '';
  let cuisineNames: string[] = [];
  if (ids.length > 0) {
    const { data: cuisines } = await supabase.from('cuisines').select('name').in('id', ids);
    cuisineNames = (cuisines ?? [])
      .map((c) => (typeof c.name === 'string' ? c.name.trim() : ''))
      .filter(Boolean);
    cuisineLabels = cuisineNames.join(' • ');
  }
  if (!cuisineLabels && row.specialty) {
    cuisineLabels = row.specialty;
  }

  return { restaurant: row, cuisineLabels, cuisineNames };
}

export type RestaurantProfileUpdate = {
  name: string;
  specialty: string;
  cuisine_names: string[];
  address: string;
  phone: string;
  hours_text: string;
  website: string;
  price_range: string;
  logo_url: string | null;
};

export async function updateRestaurantProfile(
  restaurantId: string,
  payload: RestaurantProfileUpdate
): Promise<{ error: Error | null }> {
  const { error } = await supabase
    .from('restaurants')
    .update({
      name: payload.name.trim(),
      specialty: payload.specialty.trim() || null,
      address: payload.address.trim() || null,
      phone: payload.phone.trim() || null,
      hours_text: payload.hours_text.trim() || null,
      website: payload.website.trim() || null,
      price_range: payload.price_range.trim() || null,
      logo_url: payload.logo_url?.trim() || null,
    })
    .eq('id', restaurantId);

  if (error) return { error };
  return { error: null };
}

/**
 * Create or update the owner's single restaurant row from the profile form.
 */
export async function upsertRestaurantProfileFromForm(
  payload: RestaurantProfileUpdate
): Promise<{ error: Error | null }> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  const user = userData?.user;
  if (userError || !user) return { error: userError ?? new Error('Not signed in') };

  const { data: existing, error: lookupError } = await supabase
    .from('restaurants')
    .select('id')
    .eq('owner_id', user.id)
    .maybeSingle();
  if (lookupError) return { error: lookupError };

  let restaurantId: string;
  if (existing?.id) {
    const result = await updateRestaurantProfile(existing.id, payload);
    if (result.error) return result;
    restaurantId = existing.id;
  } else {
    const { data: created, error } = await supabase
      .from('restaurants')
      .insert({
        owner_id: user.id,
        name: payload.name.trim() || 'My restaurant',
        specialty: payload.specialty.trim() || null,
        address: payload.address.trim() || null,
        phone: payload.phone.trim() || null,
        hours_text: payload.hours_text.trim() || null,
        website: payload.website.trim() || null,
        price_range: payload.price_range.trim() || null,
        logo_url: payload.logo_url?.trim() || null,
      })
      .select('id')
      .single();
    if (error) return { error };
    if (!created?.id) return { error: new Error('Missing restaurant id') };
    restaurantId = String(created.id);
  }

  const cuisineNames = payload.cuisine_names.map((n) => n.trim()).filter(Boolean);
  const { data: cuisines, error: cuisineErr } = await supabase.from('cuisines').select('id, name').in('name', cuisineNames);
  if (cuisineErr) return { error: cuisineErr };

  const { data: previousCuisineLinks, error: previousLinksErr } = await supabase
    .from('restaurant_cuisine_types')
    .select('cuisine_id')
    .eq('restaurant_id', restaurantId);
  if (previousLinksErr) return { error: previousLinksErr };

  const { error: deleteErr } = await supabase
    .from('restaurant_cuisine_types')
    .delete()
    .eq('restaurant_id', restaurantId);
  if (deleteErr) return { error: deleteErr };

  const cuisineIds = (cuisines ?? []).map((c) => c.id);
  if (cuisineIds.length > 0) {
    const rows = cuisineIds.map((cuisine_id) => ({ restaurant_id: restaurantId, cuisine_id }));
    const { error: insertErr } = await supabase.from('restaurant_cuisine_types').insert(rows);
    if (insertErr) {
      const fallbackRows = (previousCuisineLinks ?? [])
        .map((link) => (link?.cuisine_id ? { restaurant_id: restaurantId, cuisine_id: link.cuisine_id } : null))
        .filter(Boolean) as { restaurant_id: string; cuisine_id: string }[];
      if (fallbackRows.length > 0) {
        try {
          const { error: rollbackErr } = await supabase.from('restaurant_cuisine_types').insert(fallbackRows);
          if (rollbackErr) {
            console.error('[restaurant-profile] cuisine link rollback failed after insert error', {
              restaurantId,
              insertError: insertErr,
              rollbackError: rollbackErr,
            });
          }
        } catch (e) {
          console.error('[restaurant-profile] cuisine link rollback threw after insert error', {
            restaurantId,
            insertError: insertErr,
            thrown: e,
          });
        }
      }
      return { error: insertErr };
    }
  }

  return { error: null };
}

/**
 * Persist logo URL for the current owner's restaurant (immediate save; no form Save required).
 */
export async function updateRestaurantLogoUrl(logoUrl: string | null): Promise<{ error: Error | null }> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  const user = userData?.user;
  if (userError || !user) return { error: userError ?? new Error('Not signed in') };

  const { data: existing } = await supabase.from('restaurants').select('id').eq('owner_id', user.id).maybeSingle();

  if (!existing?.id) return { error: new Error('No restaurant found. Complete setup first.') };

  const { error } = await supabase
    .from('restaurants')
    .update({ logo_url: logoUrl?.trim() || null })
    .eq('id', existing.id);

  return { error: error ?? null };
}
