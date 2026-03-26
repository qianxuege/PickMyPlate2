-- Allow authenticated users to upload their own dish photos to the public `dish-images` bucket.
-- Path convention: {auth.uid()}/restaurant-dishes/{dish_id}.jpg

create policy "dish_images_select_own"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'dish-images'
    and split_part(name, '/', 1) = (select auth.uid())::text
  );

create policy "dish_images_insert_own"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'dish-images'
    and split_part(name, '/', 1) = (select auth.uid())::text
  );

create policy "dish_images_update_own"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'dish-images'
    and split_part(name, '/', 1) = (select auth.uid())::text
  )
  with check (
    bucket_id = 'dish-images'
    and split_part(name, '/', 1) = (select auth.uid())::text
  );

create policy "dish_images_delete_own"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'dish-images'
    and split_part(name, '/', 1) = (select auth.uid())::text
  );
