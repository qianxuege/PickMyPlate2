-- Diner menu scans: OCR/LLM parsed menus for Recent scans + menu browsing.
-- No stored menu images; parsed_menu JSON shape matches lib/menu-scan-schema.ts (schema_version 1).

-- ---------------------------------------------------------------------------
-- diner_menu_scans
-- ---------------------------------------------------------------------------
create table public.diner_menu_scans (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  restaurant_name text,
  scanned_at timestamptz not null default now(),
  parsed_menu jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint diner_menu_scans_parsed_menu_object_check
    check (jsonb_typeof(parsed_menu) = 'object')
);

comment on table public.diner_menu_scans is
  'Successful diner menu parses only; list row uses restaurant_name + scanned_at; full payload in parsed_menu.';

comment on column public.diner_menu_scans.restaurant_name is
  'Denormalized for Recent scans list; should match parsed_menu.restaurant_name when present.';

comment on column public.diner_menu_scans.parsed_menu is
  'ParsedMenu JSON (schema_version 1): sections, items, tags, prices — see lib/menu-scan-schema.ts.';

create index diner_menu_scans_profile_scanned_at_idx
  on public.diner_menu_scans (profile_id, scanned_at desc);

create trigger diner_menu_scans_set_updated_at
  before update on public.diner_menu_scans
  for each row
  execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS: diners only, own rows (backend service role bypasses RLS for inserts)
-- ---------------------------------------------------------------------------
alter table public.diner_menu_scans enable row level security;

create policy "diner_menu_scans_select_own"
  on public.diner_menu_scans
  for select
  to authenticated
  using (
    profile_id = (select auth.uid())
    and public.is_diner((select auth.uid()))
  );

create policy "diner_menu_scans_insert_own"
  on public.diner_menu_scans
  for insert
  to authenticated
  with check (
    profile_id = (select auth.uid())
    and public.is_diner((select auth.uid()))
  );

create policy "diner_menu_scans_update_own"
  on public.diner_menu_scans
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

create policy "diner_menu_scans_delete_own"
  on public.diner_menu_scans
  for delete
  to authenticated
  using (
    profile_id = (select auth.uid())
    and public.is_diner((select auth.uid()))
  );
