-- US10: Allow diners to update their own favorite dish rows (needed to save notes).
-- The original migration only created SELECT, INSERT, and DELETE policies.
-- Without an UPDATE policy, note saves are silently ignored by RLS.
create policy "diner_favorite_dishes_update_own"
  on public.diner_favorite_dishes
  for update
  to authenticated
  using (
    profile_id = (select auth.uid())
    and public.is_diner((select auth.uid()))
  )
  with check (
    profile_id = (select auth.uid())
  );
