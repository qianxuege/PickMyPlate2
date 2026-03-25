# Restaurant owner: login, registration, profile → database

This maps the **restaurant owner** flows in the app to Supabase. Diner data lives in `diner_*` tables; restaurant venue data lives in **`restaurants`** and **`restaurant_cuisine_types`**, gated by `profiles.role = 'restaurant'`.

## Login (`app/login.tsx`)

| UI | Storage |
| --- | --- |
| Email + password | **Supabase Auth** (`auth.users`, session). |
| Forgot password | Auth recovery flow (no app table). |
| Continue with Google | **Auth** provider / `auth.identities` (configure in Supabase dashboard). |
| Routing by role | After sign-in, read **`user_roles`** (see [account roles](account-roles.md)) and active mode to open diner vs restaurant home. |

No extra tables are required for login beyond existing **`profiles`** (created on signup with `role` from metadata).

## Registration step 1 (`app/restaurant-registration.tsx`)

| Field | Suggested storage |
| --- | --- |
| Restaurant name | **`restaurants.name`** (after auth user exists). |
| Email | **`auth.users.email`** (signUp). |
| Password | **Auth** (hashed by Supabase). |

On signup, pass `role: 'restaurant'` (or `roles: ['restaurant']`) in user metadata so **`user_roles`** gets a restaurant row (see `handle_new_user` in migration `20260324130000_user_roles_multi.sql`).

## Registration step 2 (`app/restaurant-registration-2.tsx`)

| Field | Storage |
| --- | --- |
| Cuisine type (multi-select chips) | **`restaurant_cuisine_types`**: rows linking **`restaurants.id`** → **`cuisines.id`**. Match chip labels (e.g. `Italian`) to **`cuisines.name`** or **`cuisines.slug`** from the shared catalog. |
| Location (optional, “City, State”) | **`restaurants.location_short`** (free text). |

## Profile (`app/restaurant-profile.tsx`)

| UI field | Storage |
| --- | --- |
| Restaurant name (header + row) | **`restaurants.name`** |
| Subtitle “Japanese • Ramen” | Build from **`restaurant_cuisine_types`** + **`cuisines`**, plus optional **`restaurants.specialty`** (e.g. `Ramen`) for the second line. |
| Address | **`restaurants.address`** |
| Phone | **`restaurants.phone`** |
| Hours of operation | **`restaurants.hours_text`** (string for now; structured hours can be JSON later). |
| Website | **`restaurants.website`** |
| Email | **`auth.users.email`** (or sync to **`profiles`** if you add an email column later). |
| Change password | Auth; **forgot-password** screen. |
| Log out | Clear session client-side. |

## Schema reference

Migration: [`supabase/migrations/20260324123000_restaurant_owner.sql`](../supabase/migrations/20260324123000_restaurant_owner.sql).

| Table | Purpose |
| ----- | ------- |
| `profiles` | One row per auth user. |
| `user_roles` | Must include `restaurant` for owner flows; same user may also have `diner`. |
| `restaurants` | One row per owner in MVP (`owner_id` **unique** → `profiles.id`). Venue fields above. |
| `restaurant_cuisine_types` | Many-to-many: restaurant ↔ `cuisines`. |
| `cuisines` | Shared catalog (seeded in diner personalization migration). |

**RLS:** `public.is_restaurant(auth.uid())` and `restaurants.owner_id = auth.uid()`. Users with **only** the diner role cannot access these rows; users with **both** roles can when using the app as themselves.

To add restaurant access to an existing diner account, log in and use **Profile → Add restaurant** (`/add-restaurant`), which inserts `user_roles` and venue data.

## Applying migrations

Requires **`cuisines`** (from `20260324120000_diner_personalization.sql`) before this file. From repo root:

```bash
npm run supabase:db:push
```
