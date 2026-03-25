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
  if (ids.length > 0) {
    const { data: cuisines } = await supabase.from('cuisines').select('name').in('id', ids);
    cuisineLabels = (cuisines ?? []).map((c) => c.name).filter(Boolean).join(' • ');
  }
  if (!cuisineLabels && row.specialty) {
    cuisineLabels = row.specialty;
  }

  return { restaurant: row, cuisineLabels };
}

export type RestaurantProfileUpdate = {
  name: string;
  specialty: string;
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

  const { data: existing } = await supabase.from('restaurants').select('id').eq('owner_id', user.id).maybeSingle();

  if (existing?.id) {
    return updateRestaurantProfile(existing.id, payload);
  }

  const { error } = await supabase.from('restaurants').insert({
    owner_id: user.id,
    name: payload.name.trim() || 'My restaurant',
    specialty: payload.specialty.trim() || null,
    address: payload.address.trim() || null,
    phone: payload.phone.trim() || null,
    hours_text: payload.hours_text.trim() || null,
    website: payload.website.trim() || null,
    price_range: payload.price_range.trim() || null,
    logo_url: payload.logo_url?.trim() || null,
  });

  return { error: error ?? null };
}
