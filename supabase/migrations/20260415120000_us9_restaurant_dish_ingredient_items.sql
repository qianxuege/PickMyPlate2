-- US9: structured ingredient name + optional origin per restaurant menu dish

alter table public.restaurant_menu_dishes
  add column if not exists ingredient_items jsonb not null default '[]'::jsonb;

comment on column public.restaurant_menu_dishes.ingredient_items is
  'JSON array of { "name": string, "origin": string | null }. `ingredients` text[] remains name-only for legacy/search.';

-- Backfill from existing flat ingredient list when structured data is still empty
update public.restaurant_menu_dishes d
set ingredient_items = coalesce(
  (
    select jsonb_agg(jsonb_build_object('name', x, 'origin', null))
    from unnest(d.ingredients) as x
  ),
  '[]'::jsonb
)
where jsonb_array_length(d.ingredient_items) = 0
  and cardinality(d.ingredients) > 0;
