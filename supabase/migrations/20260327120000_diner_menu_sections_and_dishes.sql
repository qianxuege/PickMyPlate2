-- Single source of truth for parsed menus: sections + dishes (no parsed_menu JSON).
-- diner_menu_scans: scan metadata; diner_menu_sections + diner_scanned_dishes: menu body;
-- diner_favorite_dishes: many-to-many diner ↔ dish (for Favorites screen).

-- ---------------------------------------------------------------------------
-- Remove legacy JSON blob from diner_menu_scans
-- ---------------------------------------------------------------------------
alter table public.diner_menu_scans drop constraint if exists diner_menu_scans_parsed_menu_object_check;

alter table public.diner_menu_scans drop column if exists parsed_menu;

comment on table public.diner_menu_scans is
  'One row per successful scan; restaurant_name + scanned_at for Recent scans; body lives in sections + dishes.';

-- ---------------------------------------------------------------------------
-- diner_menu_sections: category blocks within a scan (e.g. Top Picks, Salads)
-- ---------------------------------------------------------------------------
create table public.diner_menu_sections (
  id uuid primary key default gen_random_uuid(),
  scan_id uuid not null references public.diner_menu_scans (id) on delete cascade,
  title text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

comment on table public.diner_menu_sections is
  'Section headings for a scanned menu; sort_order orders sections within a scan.';

create index diner_menu_sections_scan_sort_idx
  on public.diner_menu_sections (scan_id, sort_order);

-- ---------------------------------------------------------------------------
-- diner_scanned_dishes: one row per dish (stable id for favorites & detail)
-- ---------------------------------------------------------------------------
create table public.diner_scanned_dishes (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.diner_menu_sections (id) on delete cascade,
  sort_order int not null default 0,
  name text not null,
  description text,
  price_amount numeric(12, 2),
  price_currency text not null default 'USD',
  price_display text,
  spice_level int not null
    constraint diner_scanned_dishes_spice_level_check
    check (spice_level >= 0 and spice_level <= 3),
  tags text[] not null default '{}',
  ingredients text[] not null default '{}',
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.diner_scanned_dishes is
  'Dishes from OCR/LLM; id aligns with ParsedMenuItem.id from API; ingredients for dish detail screen.';

comment on column public.diner_scanned_dishes.tags is
  'Filter chips: vocabulary aligned with diner preferences + LLM labels.';

comment on column public.diner_scanned_dishes.ingredients is
  'Key ingredients list for Diner Dish Details; empty if unknown.';

create index diner_scanned_dishes_section_sort_idx
  on public.diner_scanned_dishes (section_id, sort_order);

create trigger diner_scanned_dishes_set_updated_at
  before update on public.diner_scanned_dishes
  for each row
  execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- diner_favorite_dishes: bookmarked dishes (teammate Favorites screen)
-- ---------------------------------------------------------------------------
create table public.diner_favorite_dishes (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  dish_id uuid not null references public.diner_scanned_dishes (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (profile_id, dish_id)
);

comment on table public.diner_favorite_dishes is
  'Diner favorites; only dishes from own scans (enforced in insert policy).';

create index diner_favorite_dishes_dish_idx on public.diner_favorite_dishes (dish_id);

-- ---------------------------------------------------------------------------
-- RLS: diner_menu_sections
-- ---------------------------------------------------------------------------
alter table public.diner_menu_sections enable row level security;

create policy "diner_menu_sections_select"
  on public.diner_menu_sections
  for select
  to authenticated
  using (
    public.is_diner((select auth.uid()))
    and exists (
      select 1
      from public.diner_menu_scans s
      where s.id = diner_menu_sections.scan_id
        and s.profile_id = (select auth.uid())
    )
  );

create policy "diner_menu_sections_insert"
  on public.diner_menu_sections
  for insert
  to authenticated
  with check (
    public.is_diner((select auth.uid()))
    and exists (
      select 1
      from public.diner_menu_scans s
      where s.id = scan_id
        and s.profile_id = (select auth.uid())
    )
  );

create policy "diner_menu_sections_update"
  on public.diner_menu_sections
  for update
  to authenticated
  using (
    public.is_diner((select auth.uid()))
    and exists (
      select 1
      from public.diner_menu_scans s
      where s.id = diner_menu_sections.scan_id
        and s.profile_id = (select auth.uid())
    )
  )
  with check (
    public.is_diner((select auth.uid()))
    and exists (
      select 1
      from public.diner_menu_scans s
      where s.id = scan_id
        and s.profile_id = (select auth.uid())
    )
  );

create policy "diner_menu_sections_delete"
  on public.diner_menu_sections
  for delete
  to authenticated
  using (
    public.is_diner((select auth.uid()))
    and exists (
      select 1
      from public.diner_menu_scans s
      where s.id = diner_menu_sections.scan_id
        and s.profile_id = (select auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- RLS: diner_scanned_dishes
-- ---------------------------------------------------------------------------
alter table public.diner_scanned_dishes enable row level security;

create policy "diner_scanned_dishes_select"
  on public.diner_scanned_dishes
  for select
  to authenticated
  using (
    public.is_diner((select auth.uid()))
    and exists (
      select 1
      from public.diner_menu_sections sec
      join public.diner_menu_scans s on s.id = sec.scan_id
      where sec.id = diner_scanned_dishes.section_id
        and s.profile_id = (select auth.uid())
    )
  );

create policy "diner_scanned_dishes_insert"
  on public.diner_scanned_dishes
  for insert
  to authenticated
  with check (
    public.is_diner((select auth.uid()))
    and exists (
      select 1
      from public.diner_menu_sections sec
      join public.diner_menu_scans s on s.id = sec.scan_id
      where sec.id = section_id
        and s.profile_id = (select auth.uid())
    )
  );

create policy "diner_scanned_dishes_update"
  on public.diner_scanned_dishes
  for update
  to authenticated
  using (
    public.is_diner((select auth.uid()))
    and exists (
      select 1
      from public.diner_menu_sections sec
      join public.diner_menu_scans s on s.id = sec.scan_id
      where sec.id = diner_scanned_dishes.section_id
        and s.profile_id = (select auth.uid())
    )
  )
  with check (
    public.is_diner((select auth.uid()))
    and exists (
      select 1
      from public.diner_menu_sections sec
      join public.diner_menu_scans s on s.id = sec.scan_id
      where sec.id = section_id
        and s.profile_id = (select auth.uid())
    )
  );

create policy "diner_scanned_dishes_delete"
  on public.diner_scanned_dishes
  for delete
  to authenticated
  using (
    public.is_diner((select auth.uid()))
    and exists (
      select 1
      from public.diner_menu_sections sec
      join public.diner_menu_scans s on s.id = sec.scan_id
      where sec.id = diner_scanned_dishes.section_id
        and s.profile_id = (select auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- RLS: diner_favorite_dishes
-- ---------------------------------------------------------------------------
alter table public.diner_favorite_dishes enable row level security;

create policy "diner_favorite_dishes_select_own"
  on public.diner_favorite_dishes
  for select
  to authenticated
  using (
    profile_id = (select auth.uid())
    and public.is_diner((select auth.uid()))
  );

create policy "diner_favorite_dishes_insert_own_scan_dish"
  on public.diner_favorite_dishes
  for insert
  to authenticated
  with check (
    profile_id = (select auth.uid())
    and public.is_diner((select auth.uid()))
    and exists (
      select 1
      from public.diner_scanned_dishes d
      join public.diner_menu_sections sec on sec.id = d.section_id
      join public.diner_menu_scans s on s.id = sec.scan_id
      where d.id = dish_id
        and s.profile_id = (select auth.uid())
    )
  );

create policy "diner_favorite_dishes_delete_own"
  on public.diner_favorite_dishes
  for delete
  to authenticated
  using (
    profile_id = (select auth.uid())
    and public.is_diner((select auth.uid()))
  );
