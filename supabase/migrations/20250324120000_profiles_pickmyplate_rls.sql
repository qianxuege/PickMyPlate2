-- PickMyPlate: profiles for diners / restaurants (+ admin), with RLS.
-- Apply with Supabase CLI (`supabase db push`) or paste into SQL Editor.
-- Sign-ups can pass role in raw_user_meta_data, e.g. options.data: { role: 'diner' }.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null
    check (role in ('diner', 'restaurant', 'admin')),
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profiles_role_idx on public.profiles (role);

comment on table public.profiles is 'One row per auth user; role drives diner vs restaurant flows.';

-- Keep updated_at in sync on client updates
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row
  execute function public.set_updated_at();

-- RLS
alter table public.profiles enable row level security;

create policy "profiles_select_own"
  on public.profiles
  for select
  to authenticated
  using ((select auth.uid()) = id);

create policy "profiles_update_own"
  on public.profiles
  for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Optional: allow user to insert their own row if you ever create profiles client-side.
-- The trigger below normally creates the row on signup.
create policy "profiles_insert_own"
  on public.profiles
  for insert
  to authenticated
  with check ((select auth.uid()) = id);

-- Auto-provision profile when a new auth user is created.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta_role text;
  safe_role text;
begin
  meta_role := new.raw_user_meta_data->>'role';
  safe_role :=
    case
      when meta_role in ('diner', 'restaurant', 'admin') then meta_role
      else 'diner'
    end;

  insert into public.profiles (id, role, display_name)
  values (
    new.id,
    safe_role,
    coalesce(
      new.raw_user_meta_data->>'display_name',
      new.raw_user_meta_data->>'full_name',
      nullif(trim(split_part(coalesce(new.email, ''), '@', 1)), ''),
      'User'
    )
  );

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();
