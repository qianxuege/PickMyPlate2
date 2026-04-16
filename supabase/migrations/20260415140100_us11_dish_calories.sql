-- US11: optional manual calories and AI-estimated calories per dish (restaurant + diner copies).
-- Version bumped: 20260415120000 is already used on remote for us9_restaurant_dish_ingredient_items;
-- Supabase matches by numeric prefix only, so US11 must use a new version to apply.

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
