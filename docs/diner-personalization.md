# Diner personalization & smart preference tags

This document describes the **diner onboarding personalization** flow (screen: `app/diner-personalization/1.tsx`), the **smart tags** UX, how text is parsed into structured tags, and how data maps to **Supabase** (diner-only tables; see migration in `supabase/migrations/`).

## User flow

1. After **diner registration**, the user lands on personalization.
2. **Dietary preferences** — multi-select chips (Vegetarian, Vegan, Gluten-free, Dairy-free).
3. **Spice level** — single-select (Mild, Medium, Spicy).
4. **Cuisine interests** — grid of cuisines (with optional emojis), expandable list, search, and a live **“Cuisine Interests (X selected)”** counter.
5. **Smart preferences** — free-text field with **+ Add** / keyboard submit. The app shows:
   - **Live preview** (“Understanding as you type”) from a debounced parse of the draft text.
   - **Committed tags** after add: categorized pills (allergy, dislike, like, preference) with remove and short “new tag” feedback.
   - **Popular preferences** when the field is empty and there are no committed tags yet.
6. **Continue** / **Skip** — wire saves to Supabase in app code (`diner_preferences`, related tables); map UI spice labels to DB values **mild** / **medium** / **spicy** (lowercase).

## Smart tags (product + technical)

- **Categories** (aligned with UI):
  - `allergy` — e.g. peanut allergy
  - `dislike` — e.g. No cilantro
  - `like` — e.g. Loves desserts
  - `preference` — e.g. High protein, or fallback for uncategorized phrases
- **Parsing** is **rule-based** (not a remote LLM): see `lib/parseSmartPreferences.ts`. It splits on commas / “and” and applies patterns for allergies, dislikes, likes, and a few keywords.
- **Ids** for list keys in the client are generated when a tag is committed; the database stores stable rows in `diner_smart_tags` with server-generated UUIDs.

For deeper UI tokens (colors, chip styles), see the main [README](../README.md) design system.

## Database (diner vs restaurant)

Restaurant staff use the same `profiles` table but with `role = 'restaurant'`. **All personalization rows are scoped to diners:**

- Tables are keyed by `profile_id` → `profiles.id`.
- **Row Level Security** allows access only when `public.is_diner(auth.uid())` is true (i.e. `profiles.role = 'diner'`) and `profile_id = auth.uid()`.

So restaurant owners (`role = 'restaurant'`) cannot read or write these rows. Table names are prefixed with **`diner_`** so the domain is obvious in SQL and dashboards.

### Table overview

| Table | Purpose |
| ----- | ------- |
| `profiles` | Existing: `role` ∈ `diner` \| `restaurant` \| `admin`. |
| `cuisines` | Reference list (slug, name, emoji). |
| `diner_preferences` | One row per diner: spice, budget, onboarding/skip flags, optional raw notes. |
| `diner_dietary_preferences` | One row per selected dietary chip. |
| `diner_cuisine_interests` | Many-to-many diner ↔ `cuisines`. |
| `diner_smart_tags` | Structured tags from free text (category + label + optional source). |

Schema migration: [`supabase/migrations/20260324120000_diner_personalization.sql`](../supabase/migrations/20260324120000_diner_personalization.sql) (columns, indexes, `cuisines` seed, RLS, auto `diner_preferences` row for new diners).

## Applying the schema

From the repo root (with Supabase linked locally or remote):

```bash
npm run supabase:db:push
```

Or run the SQL in the Supabase SQL editor. If you already had `profiles` rows for diners before this migration, run a one-off backfill to insert missing `diner_preferences` rows (see comments in the migration).

## Related files

| Area | Path |
| ---- | ---- |
| Personalization screen | `app/diner-personalization/1.tsx` |
| Tag parser | `lib/parseSmartPreferences.ts` |
| Tag UI | `components/SmartPreferenceTag.tsx` |
| Input + add control | `components/PreferenceInput.tsx` |
| Chips | `components/PreferencePill.tsx` |
| Supabase client | `lib/supabase.ts` |
