# Accounts with diner + restaurant roles

One **email** (one `auth.users` / `profiles` row) can hold **both** `diner` and `restaurant` in **`user_roles`**. The legacy single column `profiles.role` was removed; see migration `20260324130000_user_roles_multi.sql`.

## Database

| Table | Purpose |
| ----- | ------- |
| `user_roles` | `(user_id, role)` PK; `role` ∈ `diner` \| `restaurant` \| `admin`. |
| `profiles` | `id`, `display_name`, … — no `role` column. |

Signup trigger **`handle_new_user`** reads:

- `raw_user_meta_data.roles` (JSON array of strings), or  
- fallback `raw_user_meta_data.role` (single string), default **`diner`**.

RLS on `user_roles`: users **select** their rows; they may **insert** / **delete** only `diner` or `restaurant` for themselves (not `admin`).

**`is_diner(uid)`** / **`is_restaurant(uid)`** now query `user_roles`, so users with **both** roles pass checks for **both** diner and restaurant data policies.

Diner preferences are created by **`user_roles_create_diner_preferences`** when a `diner` row is inserted into `user_roles`.

## App behavior

- **Login** loads roles from `user_roles`, then routes: single role → that home; dual + saved mode in AsyncStorage → that home; dual + no saved mode → **`/role-picker`**.
- **Active mode** is client state (`ActiveRoleContext`) + `@pickmyplate/active_app_role` in AsyncStorage.
- **Guards** on diner/restaurant tab screens redirect if the wrong mode is active or if the user lacks that role.
- **Tab shells** (diner / restaurant) use a **sticky header**: mode badge (orange outline = Diner, green filled = Restaurant) and a **segmented Diner | Restaurant** toggle when the user has both roles. **Diner** UI uses the orange brand palette; **restaurant** uses a green palette (tabs, CTAs, cards). Switching shows a short toast. The bottom nav no longer includes a role switch.
- **Add the other role while logged in**: Diner profile → “Add restaurant” → **`/add-restaurant`**. Restaurant profile → “Add diner profile” → **`/add-diner-role`** (inserts `user_roles` + optional restaurant setup).

Duplicate **sign-up** with an existing email still fails at Auth; users should **log in** and add the second role from profile.
