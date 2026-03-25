-- Restaurant owner business profile + cuisine selections (onboarding step 2).
-- Login uses Supabase Auth (auth.users); no extra tables for email/password/OAuth.
-- Isolation from diners: RLS requires profiles.role = 'restaurant' and ownership via restaurants.owner_id.

-- ---------------------------------------------------------------------------
-- Helper: current user is a restaurant owner
-- ---------------------------------------------------------------------------
create or replace function public.is_restaurant(uid uuid)
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
      and p.role = 'restaurant'
  );
$$;

-- ---------------------------------------------------------------------------
-- One restaurant business per owner (MVP; matches single-venue registration UX)
-- ---------------------------------------------------------------------------
create table public.restaurants (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references public.profiles (id) on delete cascade,
  name text not null,
  specialty text,
  location_short text,
  address text,
  phone text,
  hours_text text,
  website text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.restaurants is 'Restaurant venue/business data for role=restaurant; owner_id unique for one venue per account (MVP).';

create index restaurants_owner_id_idx on public.restaurants (owner_id);

create trigger restaurants_set_updated_at
  before update on public.restaurants
  for each row
  execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Cuisine types from onboarding (links to public.cuisines)
-- ---------------------------------------------------------------------------
create table public.restaurant_cuisine_types (
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  cuisine_id uuid not null references public.cuisines (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (restaurant_id, cuisine_id)
);

comment on table public.restaurant_cuisine_types is 'Multi-select cuisines from restaurant registration; restaurant owners only.';

create index restaurant_cuisine_types_restaurant_idx on public.restaurant_cuisine_types (restaurant_id);
create index restaurant_cuisine_types_cuisine_idx on public.restaurant_cuisine_types (cuisine_id);

-- ---------------------------------------------------------------------------
-- RLS: restaurants
-- ---------------------------------------------------------------------------
alter table public.restaurants enable row level security;

create policy "restaurants_select_own"
  on public.restaurants
  for select
  to authenticated
  using (
    owner_id = (select auth.uid())
    and public.is_restaurant((select auth.uid()))
  );

create policy "restaurants_insert_own"
  on public.restaurants
  for insert
  to authenticated
  with check (
    owner_id = (select auth.uid())
    and public.is_restaurant((select auth.uid()))
  );

create policy "restaurants_update_own"
  on public.restaurants
  for update
  to authenticated
  using (
    owner_id = (select auth.uid())
    and public.is_restaurant((select auth.uid()))
  )
  with check (
    owner_id = (select auth.uid())
    and public.is_restaurant((select auth.uid()))
  );

create policy "restaurants_delete_own"
  on public.restaurants
  for delete
  to authenticated
  using (
    owner_id = (select auth.uid())
    and public.is_restaurant((select auth.uid()))
  );

-- ---------------------------------------------------------------------------
-- RLS: restaurant_cuisine_types (via owning restaurant)
-- ---------------------------------------------------------------------------
alter table public.restaurant_cuisine_types enable row level security;

create policy "restaurant_cuisine_types_select_own"
  on public.restaurant_cuisine_types
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

create policy "restaurant_cuisine_types_insert_own"
  on public.restaurant_cuisine_types
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

create policy "restaurant_cuisine_types_delete_own"
  on public.restaurant_cuisine_types
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
