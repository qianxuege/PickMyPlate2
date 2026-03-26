-- Allow publishing even when some dishes still have needs_review = true.
-- Owners are warned in the app UI before confirming.

create or replace function public.publish_restaurant_menu(target_scan_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  rest_id uuid;
  owner_id uuid;
begin
  select restaurant_id into rest_id
  from public.restaurant_menu_scans
  where id = target_scan_id;

  if rest_id is null then
    raise exception 'restaurant menu scan not found';
  end if;

  select r.owner_id into owner_id
  from public.restaurants r
  where r.id = rest_id;

  if owner_id is null or owner_id <> auth.uid() then
    raise exception 'unauthorized';
  end if;

  update public.restaurant_menu_scans
  set is_published = false,
      published_at = null
  where restaurant_id = rest_id;

  update public.restaurant_menu_scans
  set is_published = true,
      published_at = now(),
      last_activity_at = now()
  where id = target_scan_id;

  update public.restaurants
  set published_menu_scan_id = target_scan_id
  where id = rest_id;

  return;
end;
$$;
