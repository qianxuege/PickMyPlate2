-- Public bucket for generated dish preview images.
-- Backend writes with service role; frontend reads via public URL saved on diner_scanned_dishes.image_url.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'dish-images',
  'dish-images',
  true,
  5242880,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
