-- Optional branding and price tier for restaurant profile UI
alter table public.restaurants
  add column if not exists logo_url text;

alter table public.restaurants
  add column if not exists price_range text;

comment on column public.restaurants.logo_url is 'Public URL for restaurant logo/cover image (optional).';
comment on column public.restaurants.price_range is 'Display tier e.g. $, $$, $$$, $$$$.';
