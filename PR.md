# Pull Request: `feat/us8` — Diner & restaurant experience, auth, and multi-role switching

## Summary

This branch delivers the core PickMyPlate mobile app on Expo/React Native with Supabase backend: authentication, diner and restaurant onboarding and home flows, multi-role accounts (`diner` + `restaurant`), role-aware navigation and UI, diner personalization with smart preference tags, and restaurant owner profile editing backed by Postgres migrations and RLS.

## Motivation

Users need a single app where diners can explore menus and personalize taste, and restaurant owners can manage their venue—with one email able to hold both roles. The UI must make the active “mode” obvious and allow switching without confusion.

## What changed

### Authentication and accounts

- Email/password login and registration flows for diner and restaurant paths.
- Supabase Auth with session persistence via AsyncStorage.
- **Duplicate email at sign-up**: offers **link to existing account** (sign in with the same password, then add the missing role) via `lib/link-account.ts`.
- Post-auth routing by roles (`lib/auth-navigation.ts`, `role-picker` when both roles exist and no saved mode).

### Roles and data model

- **`user_roles`** table supports multiple roles per user; triggers and RLS align with `docs/account-roles.md`.
- **`profiles`** and diner preference tables; **restaurants** and **restaurant_cuisine_types** for owners.
- App reads roles with `lib/user-roles.ts` and `ActiveRoleContext`; **active role** is stored client-side for UX.

### Diner experience

- Tab shell: home, menu, favorites, profile (`DinerTabScreenLayout`, `DinerBottomNav`).
- Diner personalization flow with preference parsing and smart tags (`lib/diner-preferences.ts`, `lib/parseSmartPreferences.ts`, related screens).
- Diner profile surfaces preferences and account actions.

### Restaurant experience

- Tab shell: home, menu, highlight, profile (`RestaurantTabScreenLayout`, `RestaurantBottomNav`).
- **Restaurant shell styling**: white screen background and green accent theme (`constants/role-theme.ts` — `restaurantRoleTheme`).
- **Restaurant profile**: view mode vs **Edit** mode with form fields, logo/cover placeholder, cuisine and **price range** pills, sticky **Save Changes**; persistence via `lib/restaurant-profile.ts` (fetch/upsert). Migration adds optional **`logo_url`** and **`price_range`** on `restaurants` (`supabase/migrations/20260325120000_restaurant_logo_price.sql`).
- Optional **`stickyFooter`** on `RestaurantTabScreenLayout` for the save action.

### Role switching and visual identity

- **Sticky header** (`RoleAppHeader`): mode badges (diner uses **😋**, restaurant uses **🍽️**), segmented **Diner | Restaurant** control when the user has both roles (no role switch in the bottom tab bar).
- **Toast** on mode switch (`RoleSwitchToastContext`).
- **Themes**: orange-forward **diner** shell vs **green** restaurant shell (tabs, CTAs, cards where applied).
- **Guards** so tab routes match active role (`hooks/use-guard-active-role.ts`).

### Infrastructure and docs

- Supabase client (`lib/supabase.ts`) and env vars `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_KEY` (see README).
- Migrations under `supabase/migrations/`; seed and `config.toml` for local development.
- Documentation: `docs/account-roles.md`, diner personalization, restaurant owner notes.

## Database / setup

Apply migrations to your Supabase project (local or hosted), for example:

```bash
npm run supabase:db:push
```

Ensure `.env` contains valid `EXPO_PUBLIC_SUPABASE_*` values. After schema changes, existing installs may need a fresh login if session shape or policies changed.

## How to test

1. **Diner only**: sign up as diner → complete personalization → browse diner tabs and profile.
2. **Restaurant only**: sign up as restaurant → finish onboarding → restaurant home and profile; open **Edit** on profile, change fields, **Save Changes**, reload and confirm persistence.
3. **Both roles**: add the second role (link flow or add-restaurant / add-diner-role flows) → use header segment to switch → confirm toast and correct home per mode.
4. **Duplicate email**: register second role with same email → confirm link-account prompt and successful sign-in + role add.

## Risk and follow-ups

- **Logo upload** is UI/placeholder until storage and picker are wired; `logo_url` is optional in the schema.
- **RLS and `is_restaurant`**: verify policies match your current `profiles` / `user_roles` model if you customize migrations.
- Large surface area; regression-test login, role picker, and both shells after merge.

## Checklist

- [ ] Migrations applied (`npm run supabase:db:push` or equivalent).
- [ ] `.env` configured for the target Supabase project.
- [ ] Manual smoke test on iOS/Android (or Expo) for diner, restaurant, and dual-role flows.
