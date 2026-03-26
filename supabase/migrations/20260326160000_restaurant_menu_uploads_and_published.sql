-- Restaurant menu upload, review, and publish (Sprint 1; images-only MVP)
-- This introduces a restaurant-scoped "menu draft" (scan + sections + dishes)
-- and publishes exactly one scan per restaurant to be readable by diners.

-- ---------------------------------------------------------------------------
-- restaurant_menu_scans
-- ---------------------------------------------------------------------------
create table public.restaurant_menu_scans (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  restaurant_name text,
  scanned_at timestamptz not null default now(),
  last_activity_at timestamptz not null default now(),
  published_at timestamptz,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.restaurant_menu_scans is
  'Restaurant menu drafts/scans. Owners review/edit dishes; publish marks one scan as live. Customers/diners should read only the published scan.';

comment on column public.restaurant_menu_scans.restaurant_name is
  'Denormalized title for the scan (e.g. inferred from menu header/logo).';

create index restaurant_menu_scans_restaurant_last_activity_idx
  on public.restaurant_menu_scans (restaurant_id, last_activity_at desc);

create index restaurant_menu_scans_restaurant_published_idx
  on public.restaurant_menu_scans (restaurant_id, is_published, published_at desc);

create trigger restaurant_menu_scans_set_updated_at
  before update on public.restaurant_menu_scans
  for each row
  execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- restaurant_menu_sections
-- ---------------------------------------------------------------------------
create table public.restaurant_menu_sections (
  id uuid primary key default gen_random_uuid(),
  scan_id uuid not null references public.restaurant_menu_scans (id) on delete cascade,
  title text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.restaurant_menu_sections is
  'Section headings for a scanned restaurant menu draft.';

create index restaurant_menu_sections_scan_sort_idx
  on public.restaurant_menu_sections (scan_id, sort_order);

create trigger restaurant_menu_sections_set_updated_at
  before update on public.restaurant_menu_sections
  for each row
  execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- restaurant_menu_dishes
-- ---------------------------------------------------------------------------
create table public.restaurant_menu_dishes (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.restaurant_menu_sections (id) on delete cascade,
  sort_order int not null default 0,
  name text not null default '',
  description text,
  price_amount numeric(12, 2),
  price_currency text not null default 'USD',
  price_display text,
  spice_level int not null
    constraint restaurant_menu_dishes_spice_level_check
    check (spice_level >= 0 and spice_level <= 3),
  tags text[] not null default '{}',
  ingredients text[] not null default '{}',
  image_url text,
  needs_review boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.restaurant_menu_dishes is
  'One row per dish for a restaurant menu draft. needs_review drives the review UI.';

create index restaurant_menu_dishes_section_sort_idx
  on public.restaurant_menu_dishes (section_id, sort_order);

create trigger restaurant_menu_dishes_set_updated_at
  before update on public.restaurant_menu_dishes
  for each row
  execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- restaurants: active published scan pointer
-- ---------------------------------------------------------------------------
alter table public.restaurants
  add column if not exists published_menu_scan_id uuid;

comment on column public.restaurants.published_menu_scan_id is
  'Which restaurant_menu_scans row is currently live/published for customers.';

alter table public.restaurants
  add constraint restaurants_published_menu_scan_fk
  foreign key (published_menu_scan_id)
  references public.restaurant_menu_scans (id)
  on delete set null;

-- ---------------------------------------------------------------------------
-- RLS helpers: ownership checks are written inline for clarity
-- ---------------------------------------------------------------------------
alter table public.restaurant_menu_scans enable row level security;
alter table public.restaurant_menu_sections enable row level security;
alter table public.restaurant_menu_dishes enable row level security;

-- ============ restaurant_menu_scans policies ============

create policy "restaurant_menu_scans_owner_select"
  on public.restaurant_menu_scans
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

create policy "restaurant_menu_scans_owner_insert"
  on public.restaurant_menu_scans
  for insert
  to authenticated
  with check (
    public.is_restaurant((select auth.uid()))
    and exists (
      select 1
      from public.restaurants r
      where r.id = restaurant_id
        and r.owner_id = (select auth.uid())
    )
  );

create policy "restaurant_menu_scans_owner_update"
  on public.restaurant_menu_scans
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
    )
  );

create policy "restaurant_menu_scans_owner_delete"
  on public.restaurant_menu_scans
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

create policy "restaurant_menu_scans_diner_select_published_only"
  on public.restaurant_menu_scans
  for select
  to authenticated
  using (
    public.is_diner((select auth.uid()))
    and is_published = true
    and exists (
      select 1
      from public.restaurants r
      where r.id = restaurant_id
        and r.published_menu_scan_id = id
    )
  );

-- ============ restaurant_menu_sections policies ============

create policy "restaurant_menu_sections_owner_select"
  on public.restaurant_menu_sections
  for select
  to authenticated
  using (
    public.is_restaurant((select auth.uid()))
    and exists (
      select 1
      from public.restaurant_menu_scans s
      join public.restaurants r on r.id = s.restaurant_id
      where s.id = scan_id
        and r.owner_id = (select auth.uid())
    )
  );

create policy "restaurant_menu_sections_owner_insert"
  on public.restaurant_menu_sections
  for insert
  to authenticated
  with check (
    public.is_restaurant((select auth.uid()))
    and exists (
      select 1
      from public.restaurant_menu_scans s
      join public.restaurants r on r.id = s.restaurant_id
      where s.id = scan_id
        and r.owner_id = (select auth.uid())
    )
  );

create policy "restaurant_menu_sections_owner_update"
  on public.restaurant_menu_sections
  for update
  to authenticated
  using (
    public.is_restaurant((select auth.uid()))
    and exists (
      select 1
      from public.restaurant_menu_scans s
      join public.restaurants r on r.id = s.restaurant_id
      where s.id = scan_id
        and r.owner_id = (select auth.uid())
    )
  )
  with check (
    public.is_restaurant((select auth.uid()))
    and exists (
      select 1
      from public.restaurant_menu_scans s
      join public.restaurants r on r.id = s.restaurant_id
      where s.id = scan_id
        and r.owner_id = (select auth.uid())
    )
  );

create policy "restaurant_menu_sections_owner_delete"
  on public.restaurant_menu_sections
  for delete
  to authenticated
  using (
    public.is_restaurant((select auth.uid()))
    and exists (
      select 1
      from public.restaurant_menu_scans s
      join public.restaurants r on r.id = s.restaurant_id
      where s.id = scan_id
        and r.owner_id = (select auth.uid())
    )
  );

create policy "restaurant_menu_sections_diner_select_published_only"
  on public.restaurant_menu_sections
  for select
  to authenticated
  using (
    public.is_diner((select auth.uid()))
    and exists (
      select 1
      from public.restaurant_menu_scans s
      join public.restaurants r on r.id = s.restaurant_id
      where s.id = scan_id
        and r.published_menu_scan_id = s.id
        and s.is_published = true
    )
  );

-- ============ restaurant_menu_dishes policies ============

create policy "restaurant_menu_dishes_owner_select"
  on public.restaurant_menu_dishes
  for select
  to authenticated
  using (
    public.is_restaurant((select auth.uid()))
    and exists (
      select 1
      from public.restaurant_menu_sections sec
      join public.restaurant_menu_scans s on s.id = sec.scan_id
      join public.restaurants r on r.id = s.restaurant_id
      where sec.id = section_id
        and r.owner_id = (select auth.uid())
    )
  );

create policy "restaurant_menu_dishes_owner_insert"
  on public.restaurant_menu_dishes
  for insert
  to authenticated
  with check (
    public.is_restaurant((select auth.uid()))
    and exists (
      select 1
      from public.restaurant_menu_sections sec
      join public.restaurant_menu_scans s on s.id = sec.scan_id
      join public.restaurants r on r.id = s.restaurant_id
      where sec.id = section_id
        and r.owner_id = (select auth.uid())
    )
  );

create policy "restaurant_menu_dishes_owner_update"
  on public.restaurant_menu_dishes
  for update
  to authenticated
  using (
    public.is_restaurant((select auth.uid()))
    and exists (
      select 1
      from public.restaurant_menu_sections sec
      join public.restaurant_menu_scans s on s.id = sec.scan_id
      join public.restaurants r on r.id = s.restaurant_id
      where sec.id = section_id
        and r.owner_id = (select auth.uid())
    )
  )
  with check (
    public.is_restaurant((select auth.uid()))
    and exists (
      select 1
      from public.restaurant_menu_sections sec
      join public.restaurant_menu_scans s on s.id = sec.scan_id
      join public.restaurants r on r.id = s.restaurant_id
      where sec.id = section_id
        and r.owner_id = (select auth.uid())
    )
  );

create policy "restaurant_menu_dishes_owner_delete"
  on public.restaurant_menu_dishes
  for delete
  to authenticated
  using (
    public.is_restaurant((select auth.uid()))
    and exists (
      select 1
      from public.restaurant_menu_sections sec
      join public.restaurant_menu_scans s on s.id = sec.scan_id
      join public.restaurants r on r.id = s.restaurant_id
      where sec.id = section_id
        and r.owner_id = (select auth.uid())
    )
  );

create policy "restaurant_menu_dishes_diner_select_published_only"
  on public.restaurant_menu_dishes
  for select
  to authenticated
  using (
    public.is_diner((select auth.uid()))
    and exists (
      select 1
      from public.restaurant_menu_sections sec
      join public.restaurant_menu_scans s on s.id = sec.scan_id
      join public.restaurants r on r.id = s.restaurant_id
      where sec.id = section_id
        and r.published_menu_scan_id = s.id
        and s.is_published = true
    )
  );

-- ---------------------------------------------------------------------------
-- Publish RPC: blocks publish if any dish still needs review
-- ---------------------------------------------------------------------------
create or replace function public.publish_restaurant_menu(target_scan_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  rest_id uuid;
  owner_id uuid;
  needs_review_count int;
begin
  -- Find the restaurant owning the scan
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

  -- Enforce review completion
  select count(*) into needs_review_count
  from public.restaurant_menu_dishes d
  join public.restaurant_menu_sections sec on sec.id = d.section_id
  where sec.scan_id = target_scan_id
    and d.needs_review = true;

  if needs_review_count > 0 then
    raise exception 'menu has items needing review (count=%)', needs_review_count;
  end if;

  -- Mark this scan published, and unpublish siblings
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

