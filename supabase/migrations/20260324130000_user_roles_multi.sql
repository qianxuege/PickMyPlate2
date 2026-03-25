-- Multiple roles per account (same email can be diner + restaurant).
-- Replaces single profiles.role with user_roles; updates triggers and RLS helpers.

-- ---------------------------------------------------------------------------
-- user_roles: source of truth for diner / restaurant / admin
-- ---------------------------------------------------------------------------
create table public.user_roles (
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null
    constraint user_roles_role_check
    check (role in ('diner', 'restaurant', 'admin')),
  created_at timestamptz not null default now(),
  primary key (user_id, role)
);

create index user_roles_user_id_idx on public.user_roles (user_id);

comment on table public.user_roles is 'One row per role held by a user; supports diner + restaurant on same auth user.';

-- Backfill from legacy profiles.role
insert into public.user_roles (user_id, role)
select id, role
from public.profiles
where role in ('diner', 'restaurant', 'admin')
on conflict (user_id, role) do nothing;

-- ---------------------------------------------------------------------------
-- Diner preferences: trigger on user_roles (not profiles.role)
-- ---------------------------------------------------------------------------
drop trigger if exists profiles_create_diner_preferences on public.profiles;

create or replace function public.create_diner_preferences_for_diner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role = 'diner' then
    insert into public.diner_preferences (profile_id)
    values (new.user_id)
    on conflict (profile_id) do nothing;
  end if;
  return new;
end;
$$;

create trigger user_roles_create_diner_preferences
  after insert on public.user_roles
  for each row
  execute function public.create_diner_preferences_for_diner();

-- ---------------------------------------------------------------------------
-- RLS helpers: read roles from user_roles
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
    from public.user_roles ur
    where ur.user_id = uid
      and ur.role = 'diner'
  );
$$;

create or replace function public.is_restaurant(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles ur
    where ur.user_id = uid
      and ur.role = 'restaurant'
  );
$$;

-- ---------------------------------------------------------------------------
-- Drop legacy single-role column on profiles
-- ---------------------------------------------------------------------------
drop index if exists public.profiles_role_idx;

alter table public.profiles drop column if exists role;

comment on table public.profiles is 'One row per auth user; roles live in user_roles.';

-- ---------------------------------------------------------------------------
-- Signup: provision profile + one or more roles from user metadata
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta_role text;
  safe_role text;
  r text;
  roles_to_add text[] := array[]::text[];
  elem text;
begin
  if new.raw_user_meta_data ? 'roles'
     and jsonb_typeof(new.raw_user_meta_data->'roles') = 'array' then
    for elem in
      select e
      from jsonb_array_elements_text(new.raw_user_meta_data->'roles') as t(e)
    loop
      if elem in ('diner', 'restaurant', 'admin') then
        roles_to_add := array_append(roles_to_add, elem);
      end if;
    end loop;
  end if;

  if coalesce(array_length(roles_to_add, 1), 0) = 0 then
    meta_role := new.raw_user_meta_data->>'role';
    safe_role :=
      case
        when meta_role in ('diner', 'restaurant', 'admin') then meta_role
        else 'diner'
      end;
    roles_to_add := array[safe_role];
  end if;

  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'display_name',
      new.raw_user_meta_data->>'full_name',
      nullif(trim(split_part(coalesce(new.email, ''), '@', 1)), ''),
      'User'
    )
  );

  foreach r in array roles_to_add
  loop
    insert into public.user_roles (user_id, role)
    values (new.id, r)
    on conflict (user_id, role) do nothing;
  end loop;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- RLS: user_roles
-- ---------------------------------------------------------------------------
alter table public.user_roles enable row level security;

create policy "user_roles_select_own"
  on public.user_roles
  for select
  to authenticated
  using (user_id = (select auth.uid()));

-- Users may add diner/restaurant to their own account (dual-role onboarding)
create policy "user_roles_insert_own_limited"
  on public.user_roles
  for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and role in ('diner', 'restaurant')
  );

create policy "user_roles_delete_own_limited"
  on public.user_roles
  for delete
  to authenticated
  using (
    user_id = (select auth.uid())
    and role in ('diner', 'restaurant')
  );
