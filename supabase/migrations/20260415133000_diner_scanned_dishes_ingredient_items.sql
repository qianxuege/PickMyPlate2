-- Partner / copied menus: store structured ingredient + origin on diner rows (mirrors restaurant_menu_dishes).

alter table public.diner_scanned_dishes
  add column if not exists ingredient_items jsonb not null default '[]'::jsonb;

comment on column public.diner_scanned_dishes.ingredient_items is
  'Optional JSON array of { name, origin } for partner QR menu copies; OCR menus stay [].';
