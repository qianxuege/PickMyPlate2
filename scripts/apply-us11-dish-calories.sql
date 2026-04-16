-- US11: Run this once in Supabase Dashboard → SQL Editor (Production) if `supabase db push` is blocked.
-- Prefer migration `supabase/migrations/20260415140100_us11_dish_calories.sql` when using the CLI.
-- Safe to re-run (uses IF NOT EXISTS).

alter table public.restaurant_menu_dishes
  add column if not exists calories_manual integer,
  add column if not exists calories_estimated integer;

comment on column public.restaurant_menu_dishes.calories_manual is
  'Owner-entered calories; when set, takes precedence over calories_estimated in diner UI.';
comment on column public.restaurant_menu_dishes.calories_estimated is
  'LLM-estimated calories from dish name + ingredients; ignored for display when calories_manual is set.';

alter table public.diner_scanned_dishes
  add column if not exists calories_manual integer,
  add column if not exists calories_estimated integer;

comment on column public.diner_scanned_dishes.calories_manual is
  'Calories from source menu when copied to diner scan; manual overrides estimated in UI.';
comment on column public.diner_scanned_dishes.calories_estimated is
  'Estimated calories (menu parse or copy from restaurant published dish).';
