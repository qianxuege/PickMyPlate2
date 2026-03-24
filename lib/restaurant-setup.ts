import { supabase } from '@/lib/supabase';

export type CreateRestaurantInput = {
  name: string;
  cuisineNames: string[];
  locationShort?: string;
};

/**
 * Create or update the current user's restaurant and replace cuisine links.
 */
export async function upsertRestaurantForOwner(input: CreateRestaurantInput): Promise<{ error: Error | null }> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  const user = userData?.user;
  if (userError || !user) {
    return { error: userError ?? new Error('Not signed in') };
  }

  const { data: cuisines, error: cErr } = await supabase
    .from('cuisines')
    .select('id, name')
    .in('name', input.cuisineNames);

  if (cErr) return { error: cErr };

  const { data: existing } = await supabase
    .from('restaurants')
    .select('id')
    .eq('owner_id', user.id)
    .maybeSingle();

  let restaurantId: string;

  if (existing?.id) {
    const { error: uErr } = await supabase
      .from('restaurants')
      .update({
        name: input.name,
        location_short: input.locationShort?.trim() || null,
      })
      .eq('id', existing.id);

    if (uErr) return { error: uErr };
    restaurantId = existing.id;
  } else {
    const { data: created, error: iErr } = await supabase
      .from('restaurants')
      .insert({
        owner_id: user.id,
        name: input.name,
        location_short: input.locationShort?.trim() || null,
      })
      .select('id')
      .single();

    if (iErr) return { error: iErr };
    if (!created?.id) return { error: new Error('Missing restaurant id') };
    restaurantId = created.id;
  }

  const { error: delErr } = await supabase
    .from('restaurant_cuisine_types')
    .delete()
    .eq('restaurant_id', restaurantId);

  if (delErr) return { error: delErr };

  const ids = (cuisines ?? []).map((c) => c.id);
  if (ids.length > 0) {
    const rows = ids.map((cuisine_id) => ({ restaurant_id: restaurantId, cuisine_id }));
    const { error: jErr } = await supabase.from('restaurant_cuisine_types').insert(rows);
    if (jErr) return { error: jErr };
  }

  return { error: null };
}

export async function ensureRestaurantRole(): Promise<{ error: Error | null }> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  const user = userData?.user;
  if (userError || !user) {
    return { error: userError ?? new Error('Not signed in') };
  }

  const { error } = await supabase.from('user_roles').upsert(
    { user_id: user.id, role: 'restaurant' },
    { onConflict: 'user_id,role' }
  );

  if (error) return { error };
  return { error: null };
}

export async function ensureDinerRole(): Promise<{ error: Error | null }> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  const user = userData?.user;
  if (userError || !user) {
    return { error: userError ?? new Error('Not signed in') };
  }

  const { error } = await supabase.from('user_roles').upsert(
    { user_id: user.id, role: 'diner' },
    { onConflict: 'user_id,role' }
  );

  if (error) return { error };
  return { error: null };
}
