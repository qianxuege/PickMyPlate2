-- Cache diner-side resolved scans per partner QR token, so repeat scans open fast.

create table if not exists public.diner_partner_qr_scans (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  token text not null,
  source_scan_id uuid not null references public.restaurant_menu_scans (id) on delete cascade,
  diner_scan_id uuid not null references public.diner_menu_scans (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (profile_id, token)
);

create index if not exists diner_partner_qr_scans_scan_idx
  on public.diner_partner_qr_scans (diner_scan_id);

create trigger diner_partner_qr_scans_set_updated_at
  before update on public.diner_partner_qr_scans
  for each row
  execute function public.set_updated_at();

alter table public.diner_partner_qr_scans enable row level security;

create policy "diner_partner_qr_scans_select_own"
  on public.diner_partner_qr_scans
  for select
  to authenticated
  using (
    profile_id = (select auth.uid())
    and public.is_diner((select auth.uid()))
  );

create policy "diner_partner_qr_scans_insert_own"
  on public.diner_partner_qr_scans
  for insert
  to authenticated
  with check (
    profile_id = (select auth.uid())
    and public.is_diner((select auth.uid()))
  );

create policy "diner_partner_qr_scans_update_own"
  on public.diner_partner_qr_scans
  for update
  to authenticated
  using (
    profile_id = (select auth.uid())
    and public.is_diner((select auth.uid()))
  )
  with check (
    profile_id = (select auth.uid())
    and public.is_diner((select auth.uid()))
  );

create policy "diner_partner_qr_scans_delete_own"
  on public.diner_partner_qr_scans
  for delete
  to authenticated
  using (
    profile_id = (select auth.uid())
    and public.is_diner((select auth.uid()))
  );
