-- Private bucket for diner menu photos (scheme B: app uploads, Flask reads via service role).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'menu-uploads',
  'menu-uploads',
  false,
  20971520,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Path convention: {auth.uid()}/{filename} — first segment must match the user.

create policy "menu_uploads_select_own"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'menu-uploads'
    and split_part(name, '/', 1) = (select auth.uid())::text
  );

create policy "menu_uploads_insert_own"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'menu-uploads'
    and split_part(name, '/', 1) = (select auth.uid())::text
  );

create policy "menu_uploads_update_own"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'menu-uploads'
    and split_part(name, '/', 1) = (select auth.uid())::text
  )
  with check (
    bucket_id = 'menu-uploads'
    and split_part(name, '/', 1) = (select auth.uid())::text
  );

create policy "menu_uploads_delete_own"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'menu-uploads'
    and split_part(name, '/', 1) = (select auth.uid())::text
  );
