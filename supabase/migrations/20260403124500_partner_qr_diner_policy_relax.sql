-- Allow any diner account to resolve active partner QR tokens for published scans,
-- without depending on direct SELECT access to restaurants rows.

drop policy if exists "partner_menu_qr_tokens_diner_select_active" on public.partner_menu_qr_tokens;

create policy "partner_menu_qr_tokens_diner_select_active"
  on public.partner_menu_qr_tokens
  for select
  to authenticated
  using (
    public.is_diner((select auth.uid()))
    and is_active = true
    and exists (
      select 1
      from public.restaurant_menu_scans s
      where s.id = scan_id
        and s.is_published = true
        and s.restaurant_id = restaurant_id
    )
  );
