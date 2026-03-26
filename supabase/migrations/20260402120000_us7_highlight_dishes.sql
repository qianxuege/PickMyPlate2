-- US7: Owner marks dishes as Featured / New; diners see highlights from published menus.

alter table public.restaurant_menu_dishes
  add column if not exists is_featured boolean not null default false,
  add column if not exists is_new boolean not null default false;

comment on column public.restaurant_menu_dishes.is_featured is
  'Owner “Featured” highlight; shown on diner Highlight tab when menu is published.';
comment on column public.restaurant_menu_dishes.is_new is
  'Owner “New” highlight; shown on diner Highlight tab when menu is published.';

-- Diners need to resolve restaurant name + published scan id to browse highlights.
create policy "restaurants_diner_select_published_venues"
  on public.restaurants
  for select
  to authenticated
  using (
    public.is_diner((select auth.uid()))
    and published_menu_scan_id is not null
  );
