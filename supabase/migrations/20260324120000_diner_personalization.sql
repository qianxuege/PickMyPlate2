-- Diner-only personalization: dietary, spice, cuisines, smart tags.
-- Isolation from restaurant owners: RLS requires profiles.role = 'diner' and profile_id = auth.uid().

-- ---------------------------------------------------------------------------
-- Reference: cuisines (readable by authenticated users)
-- ---------------------------------------------------------------------------
create table public.cuisines (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  emoji text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

comment on table public.cuisines is 'Cuisine catalog for diner personalization (diner_cuisine_interests).';

create index cuisines_slug_idx on public.cuisines (slug);

-- ---------------------------------------------------------------------------
-- One row per diner (1:1 with profiles where role = diner)
-- ---------------------------------------------------------------------------
create table public.diner_preferences (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  spice_level text
    constraint diner_preferences_spice_level_check
    check (spice_level is null or spice_level in ('mild', 'medium', 'spicy')),
  budget_tier text
    constraint diner_preferences_budget_tier_check
    check (budget_tier is null or budget_tier in ('$', '$$', '$$$', '$$$$')),
  onboarding_completed_at timestamptz,
  preferences_skipped boolean not null default false,
  raw_preference_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.diner_preferences is 'Diner onboarding preferences (1:1); access restricted to role=diner via RLS.';

create index diner_preferences_profile_id_idx on public.diner_preferences (profile_id);

create trigger diner_preferences_set_updated_at
  before update on public.diner_preferences
  for each row
  execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Dietary chips (multi-select)
-- ---------------------------------------------------------------------------
create table public.diner_dietary_preferences (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  dietary_key text not null
    constraint diner_dietary_preferences_key_check
    check (
      dietary_key in ('Vegetarian', 'Vegan', 'Gluten-free', 'Dairy-free')
    ),
  created_at timestamptz not null default now(),
  primary key (profile_id, dietary_key)
);

comment on table public.diner_dietary_preferences is 'Diner dietary chips; diner-only via RLS.';

-- ---------------------------------------------------------------------------
-- Cuisine interests (many-to-many)
-- ---------------------------------------------------------------------------
create table public.diner_cuisine_interests (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  cuisine_id uuid not null references public.cuisines (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (profile_id, cuisine_id)
);

comment on table public.diner_cuisine_interests is 'Diner-selected cuisines; diner-only via RLS.';

create index diner_cuisine_interests_profile_idx on public.diner_cuisine_interests (profile_id);
create index diner_cuisine_interests_cuisine_idx on public.diner_cuisine_interests (cuisine_id);

-- ---------------------------------------------------------------------------
-- Smart tags from free text
-- ---------------------------------------------------------------------------
create table public.diner_smart_tags (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  category text not null
    constraint diner_smart_tags_category_check
    check (category in ('allergy', 'dislike', 'like', 'preference')),
  label text not null,
  source_text text,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.diner_smart_tags is 'Parsed / structured preference tags; diner-only via RLS.';

create unique index diner_smart_tags_profile_category_label_uidx
  on public.diner_smart_tags (profile_id, category, lower(trim(label)));

create index diner_smart_tags_profile_idx on public.diner_smart_tags (profile_id);

create trigger diner_smart_tags_set_updated_at
  before update on public.diner_smart_tags
  for each row
  execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Auto-create diner_preferences when a diner profile is inserted
-- ---------------------------------------------------------------------------
create or replace function public.create_diner_preferences_for_diner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role = 'diner' then
    insert into public.diner_preferences (profile_id)
    values (new.id)
    on conflict (profile_id) do nothing;
  end if;
  return new;
end;
$$;

create trigger profiles_create_diner_preferences
  after insert on public.profiles
  for each row
  execute function public.create_diner_preferences_for_diner();

-- Note: Existing diner profiles created before this migration may lack a row
-- in diner_preferences. Backfill example:
-- insert into public.diner_preferences (profile_id)
-- select id from public.profiles where role = 'diner'
-- on conflict (profile_id) do nothing;

-- ---------------------------------------------------------------------------
-- Seed cuisines (aligned with app defaults)
-- ---------------------------------------------------------------------------
insert into public.cuisines (slug, name, emoji, sort_order) values
  ('chinese', 'Chinese', '🍜', 10),
  ('italian', 'Italian', '🍕', 20),
  ('indian', 'Indian', '🍛', 30),
  ('american', 'American', '🍔', 40),
  ('mexican', 'Mexican', '🌮', 50),
  ('thai', 'Thai', '🌶️', 60),
  ('japanese', 'Japanese', '🍣', 70),
  ('korean', 'Korean', '🥘', 80),
  ('vietnamese', 'Vietnamese', '🍲', 90),
  ('french', 'French', '🥐', 100),
  ('greek', 'Greek', '🫒', 110),
  ('spanish', 'Spanish', '🥘', 120),
  ('mediterranean', 'Mediterranean', '🫑', 130),
  ('middle_eastern', 'Middle Eastern', '🧆', 140),
  ('brazilian', 'Brazilian', '🥩', 150),
  ('ethiopian', 'Ethiopian', '🍛', 160);

-- ---------------------------------------------------------------------------
-- RLS helpers: current user must be a diner
-- ---------------------------------------------------------------------------
create or replace function public.is_diner(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = uid
      and p.role = 'diner'
  );
$$;

-- ---------------------------------------------------------------------------
-- RLS: cuisines (read-only for authenticated)
-- ---------------------------------------------------------------------------
alter table public.cuisines enable row level security;

create policy "cuisines_select_authenticated"
  on public.cuisines
  for select
  to authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- RLS: diner_* tables — own row only, and role must be diner
-- ---------------------------------------------------------------------------
alter table public.diner_preferences enable row level security;

create policy "diner_preferences_select"
  on public.diner_preferences
  for select
  to authenticated
  using (
    profile_id = (select auth.uid())
    and public.is_diner((select auth.uid()))
  );

create policy "diner_preferences_insert"
  on public.diner_preferences
  for insert
  to authenticated
  with check (
    profile_id = (select auth.uid())
    and public.is_diner((select auth.uid()))
  );

create policy "diner_preferences_update"
  on public.diner_preferences
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

alter table public.diner_dietary_preferences enable row level security;

create policy "diner_dietary_select"
  on public.diner_dietary_preferences
  for select
  to authenticated
  using (
    profile_id = (select auth.uid())
    and public.is_diner((select auth.uid()))
  );

create policy "diner_dietary_insert"
  on public.diner_dietary_preferences
  for insert
  to authenticated
  with check (
    profile_id = (select auth.uid())
    and public.is_diner((select auth.uid()))
  );

create policy "diner_dietary_update"
  on public.diner_dietary_preferences
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

create policy "diner_dietary_delete"
  on public.diner_dietary_preferences
  for delete
  to authenticated
  using (
    profile_id = (select auth.uid())
    and public.is_diner((select auth.uid()))
  );

alter table public.diner_cuisine_interests enable row level security;

create policy "diner_cuisine_interests_select"
  on public.diner_cuisine_interests
  for select
  to authenticated
  using (
    profile_id = (select auth.uid())
    and public.is_diner((select auth.uid()))
  );

create policy "diner_cuisine_interests_insert"
  on public.diner_cuisine_interests
  for insert
  to authenticated
  with check (
    profile_id = (select auth.uid())
    and public.is_diner((select auth.uid()))
  );

create policy "diner_cuisine_interests_update"
  on public.diner_cuisine_interests
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

create policy "diner_cuisine_interests_delete"
  on public.diner_cuisine_interests
  for delete
  to authenticated
  using (
    profile_id = (select auth.uid())
    and public.is_diner((select auth.uid()))
  );

alter table public.diner_smart_tags enable row level security;

create policy "diner_smart_tags_select"
  on public.diner_smart_tags
  for select
  to authenticated
  using (
    profile_id = (select auth.uid())
    and public.is_diner((select auth.uid()))
  );

create policy "diner_smart_tags_insert"
  on public.diner_smart_tags
  for insert
  to authenticated
  with check (
    profile_id = (select auth.uid())
    and public.is_diner((select auth.uid()))
  );

create policy "diner_smart_tags_update"
  on public.diner_smart_tags
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

create policy "diner_smart_tags_delete"
  on public.diner_smart_tags
  for delete
  to authenticated
  using (
    profile_id = (select auth.uid())
    and public.is_diner((select auth.uid()))
  );
