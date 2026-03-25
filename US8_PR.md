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
- Note that the color theme for different roles can be found in `constants/role-theme.ts`.

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

- **Sticky header** (`RoleAppHeader`): mode badges (diner uses **🍴**, restaurant uses **🍽️**), segmented **Diner | Restaurant** control when the user has both roles (no role switch in the bottom tab bar).
- **Toast** on mode switch (`RoleSwitchToastContext`).
- **Themes**: orange-forward **diner** shell vs **green** restaurant shell (tabs, CTAs, cards where applied).
- **Guards** so tab routes match active role (`hooks/use-guard-active-role.ts`).

### Infrastructure and docs

- Supabase client (`lib/supabase.ts`) and env vars `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_KEY` (see README).
- Migrations under `supabase/migrations/`; seed and `config.toml` for local development.
- Documentation: `docs/account-roles.md`, diner personalization, restaurant owner notes.

## How to run this (code reviewers)

Follow these steps so you can use the database, evolve the schema if needed, and run the app in **Expo Go** on a physical device.

### Prerequisites

- **Node.js** and **npm** (LTS recommended).
- **Expo Go** installed on your phone ([iOS](https://apps.apple.com/app/expo-go/id982107779) / [Android](https://play.google.com/store/apps/details?id=host.exp.exponent)).
- For a **local** database: [Docker Desktop](https://docs.docker.com/get-docker/) running and the [Supabase CLI](https://supabase.com/docs/guides/cli) (this repo includes the `supabase` package; `npx supabase` works).
- For a **hosted** Supabase project: a Supabase account and a project you can link (optional if you only use local).

### 1. Install and configure environment

```bash
git checkout feat/us8   # or your review branch
cd PickMyPlate2
npm install
```

Copy `.env.example` to `.env` (if present) or create `.env` in the project root with:

- `EXPO_PUBLIC_SUPABASE_URL` — Project API URL
- `EXPO_PUBLIC_SUPABASE_KEY` — anon (public) key

The app reads these in `lib/supabase.ts`. You **must** restart the Metro bundler after changing `.env`.

### 2. Database: apply migrations and work with schema

You can use either a **local** Supabase stack or a **hosted** project.

**Option A — Local Postgres (Docker, does not touch cloud)**

```bash
npm run supabase:start          # starts Postgres, Auth, Studio, etc.
npm run supabase:status         # copy API URL and anon key into .env
```

Migrations under `supabase/migrations/` are applied to this local database when the stack starts (or on reset). Open **Supabase Studio** at the URL printed by `status` (usually `http://127.0.0.1:54323`) to inspect tables, run SQL, and verify RLS.

To **iterate on schema** during review:

```bash
npm run supabase:migration:new your_change_name   # creates a new SQL file
# edit the new file in supabase/migrations/
npm run supabase:db:reset                         # local only: wipe + reapply all migrations
```

**Option B — Hosted Supabase project**

```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npm run supabase:db:push                          # push migrations to the linked remote DB
```

Add new schema the same way: create a migration with `supabase:migration:new`, edit the SQL, then `db:push` (or use the SQL editor in the dashboard for quick experiments—prefer migrations for anything that should live in the repo).

### 3. Run the mobile app with Expo Go

```bash
npm start
```

This runs the Expo dev server (Metro). In the terminal or browser UI:

- **Physical device:** open **Expo Go**, scan the **QR code** (iOS: Camera app; Android: Expo Go’s scanner). The phone must be on the **same network** as your computer unless you use tunnel mode (`npx expo start --tunnel`).
- **Simulator:** press `i` (iOS) or `a` (Android) if you have Xcode / Android SDK installed.

The app scheme is `pickmyplate` (see `app.json`). Email confirmation and deep links can require extra Supabase URL configuration; for the fastest review, you can disable **Confirm email** under **Authentication → Providers → Email** in the Supabase dashboard (see `README.md` for details and Expo Go–friendly auth flows).

### 4. Quick reference

| Goal                                      | Command / action                         |
| ----------------------------------------- | ---------------------------------------- |
| Install deps                              | `npm install`                            |
| Start local DB                            | `npm run supabase:start`                 |
| Stop local DB                             | `npm run supabase:stop`                  |
| Push migrations to **linked** remote      | `npm run supabase:db:push`               |
| New migration file                        | `npm run supabase:migration:new <name>`  |
| Reset **local** DB and reapply migrations | `npm run supabase:db:reset`              |
| Start Expo                                | `npm start` → open in **Expo Go** via QR |

More detail lives in **`README.md`** (Supabase local vs hosted, email confirmation, `auth-callback-bridge`).

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

- [ ] `npm install` and `.env` filled with `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_KEY` for the DB under test.
- [ ] Migrations applied: local (`supabase:start` / `db:reset`) or remote (`link` + `npm run supabase:db:push`).
- [ ] `npm start` and app opened in **Expo Go** (QR) or simulator.
- [ ] Manual smoke test: diner, restaurant, dual-role, and duplicate-email link flows as needed.
