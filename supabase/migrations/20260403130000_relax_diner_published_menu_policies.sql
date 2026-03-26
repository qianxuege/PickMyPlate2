-- Diner-only accounts should be able to read published restaurant menus globally.
-- Previous policies depended on restaurants visibility/joins that can block non-owner accounts.

drop policy if exists "restaurant_menu_scans_diner_select_published_only" on public.restaurant_menu_scans;
create policy "restaurant_menu_scans_diner_select_published_only"
  on public.restaurant_menu_scans
  for select
  to authenticated
  using (
    public.is_diner((select auth.uid()))
    and is_published = true
  );

drop policy if exists "restaurant_menu_sections_diner_select_published_only" on public.restaurant_menu_sections;
create policy "restaurant_menu_sections_diner_select_published_only"
  on public.restaurant_menu_sections
  for select
  to authenticated
  using (
    public.is_diner((select auth.uid()))
    and exists (
      select 1
      from public.restaurant_menu_scans s
      where s.id = scan_id
        and s.is_published = true
    )
  );

drop policy if exists "restaurant_menu_dishes_diner_select_published_only" on public.restaurant_menu_dishes;
create policy "restaurant_menu_dishes_diner_select_published_only"
  on public.restaurant_menu_dishes
  for select
  to authenticated
  using (
    public.is_diner((select auth.uid()))
    and exists (
      select 1
      from public.restaurant_menu_sections sec
      join public.restaurant_menu_scans s on s.id = sec.scan_id
      where sec.id = section_id
        and s.is_published = true
    )
  );
