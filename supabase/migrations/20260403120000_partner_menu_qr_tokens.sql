-- Partner restaurant QR access tokens for published menus.

create table if not exists public.partner_menu_qr_tokens (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  scan_id uuid not null references public.restaurant_menu_scans (id) on delete cascade,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists partner_menu_qr_tokens_restaurant_idx
  on public.partner_menu_qr_tokens (restaurant_id, created_at desc);

create index if not exists partner_menu_qr_tokens_scan_idx
  on public.partner_menu_qr_tokens (scan_id);

create trigger partner_menu_qr_tokens_set_updated_at
  before update on public.partner_menu_qr_tokens
  for each row
  execute function public.set_updated_at();

alter table public.partner_menu_qr_tokens enable row level security;

-- Owners can manage QR tokens for their own restaurant.
create policy "partner_menu_qr_tokens_owner_select"
  on public.partner_menu_qr_tokens
  for select
  to authenticated
  using (
    public.is_restaurant((select auth.uid()))
    and exists (
      select 1
      from public.restaurants r
      where r.id = restaurant_id
        and r.owner_id = (select auth.uid())
    )
  );

create policy "partner_menu_qr_tokens_owner_insert"
  on public.partner_menu_qr_tokens
  for insert
  to authenticated
  with check (
    public.is_restaurant((select auth.uid()))
    and exists (
      select 1
      from public.restaurants r
      where r.id = restaurant_id
        and r.owner_id = (select auth.uid())
        and r.published_menu_scan_id = scan_id
    )
  );

create policy "partner_menu_qr_tokens_owner_update"
  on public.partner_menu_qr_tokens
  for update
  to authenticated
  using (
    public.is_restaurant((select auth.uid()))
    and exists (
      select 1
      from public.restaurants r
      where r.id = restaurant_id
        and r.owner_id = (select auth.uid())
    )
  )
  with check (
    public.is_restaurant((select auth.uid()))
    and exists (
      select 1
      from public.restaurants r
      where r.id = restaurant_id
        and r.owner_id = (select auth.uid())
        and r.published_menu_scan_id = scan_id
    )
  );

create policy "partner_menu_qr_tokens_owner_delete"
  on public.partner_menu_qr_tokens
  for delete
  to authenticated
  using (
    public.is_restaurant((select auth.uid()))
    and exists (
      select 1
      from public.restaurants r
      where r.id = restaurant_id
        and r.owner_id = (select auth.uid())
    )
  );

-- Diners can resolve active tokens that point to currently published menus.
create policy "partner_menu_qr_tokens_diner_select_active"
  on public.partner_menu_qr_tokens
  for select
  to authenticated
  using (
    public.is_diner((select auth.uid()))
    and is_active = true
    and exists (
      select 1
      from public.restaurants r
      where r.id = restaurant_id
        and r.published_menu_scan_id = scan_id
    )
    and exists (
      select 1
      from public.restaurant_menu_scans s
      where s.id = scan_id
        and s.is_published = true
    )
  );
