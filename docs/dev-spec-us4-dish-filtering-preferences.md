# Development Specification — User Story 4  
## Dish Filtering by Preferences

**User story:** As a restaurant diner, I want to filter dishes by preferences such as dietary restrictions, flavor tags, or ingredients so that I can quickly narrow down menu options that fit my needs.

**Scope note (codebase fidelity):** This document is derived from the PickMyPlate2 repository. Filtering on the diner menu is implemented as a **hard filter on `ParsedMenuItem.tags`** (intersection with the diner’s saved preference vocabulary). **`ingredients` are stored per dish but are not used for filtering in `diner-menu.tsx`.** Ingredient-based narrowing is therefore a **user-story gap** relative to strict wording unless tags are assumed to subsume “flavor/dietary” semantics from the LLM at parse time.

---

## 1. Primary and secondary owners

| Role | Name | Notes |
|------|------|--------|
| **Primary owner** | *TBD (team)* | Owns requirements, acceptance, and release sign-off for US4. |
| **Secondary owner** | *TBD (team)* | Owns implementation review, test plan, and operational follow-up. |

*These are not present in the repository; assign per your course/team roster.*

---

## 2. Date merged into `main`

**Unknown from this repository alone.** The merge date must be taken from your Git hosting history (e.g., GitHub PR merge timestamp for the branch that introduced US4 filtering). Record it here when known:

- **Merged to `main`:** *YYYY-MM-DD (source: GitHub PR #…)*

---

## 3. Architecture diagram (Mermaid)

Execution locations are labeled. The menu-parse path is included because **tag vocabulary for filtering is produced at parse time** on the server and persisted with each dish row.

```mermaid
flowchart TB
  subgraph Client["Mobile client (Expo / React Native on user device)"]
    DM["DinerMenuScreen\n(app/diner-menu.tsx)"]
    MFC["MenuFilterChip\n(components/MenuFilterChip.tsx)"]
    DMP["DinerMenuProcessingScreen\n(app/diner-menu-processing.tsx)"]
    LIB["lib/* helpers\n(diner-preferences, fetch-parsed-menu, menu-preferences-payload, menu-scan-schema)"]
    DM --> MFC
    DM --> LIB
    DMP --> LIB
  end

  subgraph Edge["Supabase (managed PostgreSQL + Auth + PostgREST)"]
    AUTH["Supabase Auth\n(auth.users)"]
    API["PostgREST / Supabase client API"]
    DB[(PostgreSQL\nRLS-protected tables)]
    AUTH --> DB
    API --> DB
  end

  subgraph ParseServer["Menu parse API (Flask on your host / VM)"]
    FLASK["backend/app.py\nPOST /v1/parse-menu"]
    VAL["backend/parsed_menu_validate.py\nallowlist + validate"]
    LLM["Vertex / Gemini\n(llm_menu_vertex.py)"]
    FLASK --> VAL
    FLASK --> LLM
  end

  subgraph Storage["Object storage"]
    SBUCK["Supabase Storage\n(menu image bucket)"]
  end

  Client <-->|"HTTPS: Supabase JS (@supabase/supabase-js)"| API
  Client <-->|"HTTPS: menu parse + image ref"| FLASK
  FLASK --> SBUCK
```

---

## 4. Information flow diagram (Mermaid)

```mermaid
flowchart LR
  U[("Diner user")] -->|selects filters / toggles chips| UI["DinerMenuScreen"]
  UI -->|read session| AUTH["Supabase Auth"]
  UI -->|SELECT diner_preferences,\ndiner_dietary_preferences,\ndiner_cuisine_interests,\ndiner_smart_tags"| PREF_DB[("PostgreSQL")]
  UI -->|SELECT scan, sections, dishes\n(tags, ingredients, …)"| SCAN_DB[("PostgreSQL")]

  subgraph ParsePath["Initial scan (populates tags)"]
    U2[("Diner user")] -->|upload / camera| PROC["DinerMenuProcessingScreen"]
    PROC -->|fetch snapshot| PREF_DB
    PROC -->|buildMenuParseUserPreferences| MP["menu-preferences-payload.ts"]
    PROC -->|POST user_preferences + storage ref| API["Flask /v1/parse-menu"]
    API -->|allowed tag set| LLM["LLM menu JSON"]
    API -->|validate + constrain tags| VAL["parsed_menu_validate.py"]
    PROC -->|INSERT scan/sections/dishes| SCAN_DB
  end
```

**Direction summary**

- **Upstream (into client):** Auth session; preference rows; menu rows including `tags[]` and `ingredients[]`.
- **Downstream (from client):** Parse request with `user_preferences` payload; Supabase inserts for new scans (not repeated on each filter toggle — filter is local to screen state).
- **No separate “filter RPC”:** Filtering is computed in memory on the client from loaded menu + `selectedTags` state.

---

## 5. Class diagram (Mermaid)

The app is **React function components** and **TypeScript modules**, not Java-style class hierarchies. The diagram uses UML stereotypes to show the main **types** and **components** and their relationships. Python menu-parse logic is **module-level functions** (no classes in `parsed_menu_validate.py` for this flow).

```mermaid
classDiagram
  class ParsedMenu {
    +schema_version
    +restaurant_name
    +sections: ParsedMenuSection[]
  }
  class ParsedMenuSection {
    +id
    +title
    +items: ParsedMenuItem[]
  }
  class ParsedMenuItem {
    +id
    +name
    +description
    +price
    +spice_level
    +tags: string[]
    +ingredients: string[]
  }
  class DinerPreferenceSnapshot {
    +budget_tier
    +spice_level
    +dietaryKeys: string[]
    +cuisineNames: string[]
    +smartTags
  }

  ParsedMenu *-- ParsedMenuSection
  ParsedMenuSection *-- ParsedMenuItem

  note for DinerMenuScreen "React component (function)\napp/diner-menu.tsx"
  class DinerMenuScreen {
    <<component>>
  }

  note for MenuFilterChip "Presentational component\ncomponents/MenuFilterChip.tsx"
  class MenuFilterChip {
    <<component>>
  }

  DinerMenuScreen --> MenuFilterChip : renders
  DinerMenuScreen ..> ParsedMenu : uses
  DinerMenuScreen ..> DinerPreferenceSnapshot : uses
```

**Superclass/subclass:** There is **no inheritance tree** in the US4 implementation; composition is used throughout (components compose hooks and child components).

---

## 6. Implementation units relevant to US4

React components do not expose classic public/private methods. Below, **exported** symbols are treated as the public API of each module; **non-exported** helpers (if any in a file) are internal. Component **state** and **handlers** are listed as the functional equivalent of private instance fields/methods.

### 6.1 `app/diner-menu.tsx` — `DinerMenuScreen` (default export)

**Public (module API)**

- **Default export:** `DinerMenuScreen` — Screen component for viewing a scan’s menu and applying preference chips.

**Public fields / methods (conceptual — React component API)**

- *None* beyond the default export (no class instance).

**State & behavior (grouped by concept — “private” to the screen)**

- **Routing / guard:** `useGuardActiveRole('diner')`, `useRouter`, `useLocalSearchParams` — ensures diner role and reads `scanId`.
- **Menu data:** `menu: ParsedMenu | null` — loaded menu for current scan.
- **Preferences:** `prefs: DinerPreferenceSnapshot | null` — from `fetchDinerPreferences()`.
- **Loading / error:** `loading`, `error` — gate UI for fetch outcomes.
- **Filtering:** `selectedTags: string[]` — which chips are active; toggled by user.
- **Favorites (orthogonal to US4):** `favoriteIds`, `handleToggleFavorite`, `fetchFavoritedDishIds` — heart UI; not required for US4 but present on same cards.
- **Computed:**
  - `availableTags` — union of spice label, dietary keys, budget tier, cuisines, smart tag labels from `prefs`.
  - `menuTagSet` — set of all tag strings appearing on any dish in the loaded menu (for `muted` chip styling).
  - `sectionBlocks` — sections filtered so each dish matches **all** selected tags (hard AND).
- **Effects:** `useFocusEffect` — reload menu and favorites on focus.
- **Child UI:** `DishCard` inner component — renders dish row, partner highlight chips, spice flames, favorite button.

### 6.2 `components/MenuFilterChip.tsx` — `MenuFilterChip`

**Public**

- **Exported component:** `MenuFilterChip(props: MenuFilterChipProps)` — pill button for one filter tag.
- **Type:** `MenuFilterChipProps` — `label`, `selected`, `muted`, `onPress`, optional `style`.

**Props (purpose)**

- `label` — chip text (must match strings in `dish.tags` for filtering to work).
- `selected` — orange filled state when tag is part of the active filter set.
- `muted` — grey styling when tag is not present on any dish in the current menu (`!menuTagSet.has(t)`).
- `onPress` — toggles membership in `selectedTags` in parent.

**Private (internal to module)**

- **Styles:** `StyleSheet.create(...)` — layout, colors `#FF6B35`, borders, shadow.

### 6.3 `lib/diner-preferences.ts`

**Public exports**

- **Constants:** `DIETARY_OPTIONS` — allowlist for dietary keys (`Vegetarian`, `Vegan`, `Gluten-free`, `Dairy-free`).
- **Types:** `BudgetTier`, `DinerPreferenceSnapshot`, `SavePersonalizationFormPrefs`.
- **Functions:**
  - `spiceLabelToDb` / `spiceDbToLabel` — map UI spice ↔ DB enum (`mild` / `medium` / `spicy`).
  - `fetchDinerPreferences()` — loads `diner_preferences`, `diner_dietary_preferences`, `diner_cuisine_interests`, `diner_smart_tags`, resolves cuisine names via `cuisines` table.
  - `savePersonalizationFormPrefs(input)` — upserts preferences and related rows (used from onboarding/personalization flows, not from chip toggle on menu).

**Private (module-internal)**

- **Constants:** `CUISINE_NAME_TO_SLUG`, `ALLOWED_DIETARY`, `SMART_CATEGORIES`, `SPICE_LABEL_TO_DB`, `SPICE_DB_TO_LABEL` — normalization and validation.
- **Function:** `parseSmartCategory` — guards smart tag category strings.

### 6.4 `lib/fetch-parsed-menu-for-scan.ts`

**Public**

- **Type:** `FetchParsedMenuResult` — discriminated union ok/error.
- **Function:** `fetchParsedMenuForScan(scanId: string)` — reads `diner_menu_scans`, `diner_menu_sections`, `diner_scanned_dishes` via Supabase and returns `assembleParsedMenu(...)`.

**Private**

- *None* (single-function module).

### 6.5 `lib/menu-scan-schema.ts`

**Public**

- **Constants / types:** `MENU_SCAN_SCHEMA_VERSION`, `ParsedMenu`, `ParsedMenuItem`, `ParsedMenuSection`, `ParsedMenuPrice`, row types, validation helpers, `assembleParsedMenu`, `dishRowToParsedItem`, etc.

**Purpose for US4**

- Defines that `tags` are the **only** fields used by the diner menu filter (per `diner-menu.tsx`).
- Documents contract: tags should match preference vocabulary (see file header comment).

**Private**

- Various internal type guards and validators inside the same file (implementation detail).

### 6.6 `lib/menu-preferences-payload.ts`

**Public**

- **Function:** `buildMenuParseUserPreferences(snapshot)` — builds JSON-safe object for Flask `user_preferences` (dietary, spice_label, budget_tier, cuisines, smart_tags).

**Private**

- *None.*

### 6.7 `app/diner-menu-processing.tsx` — `DinerMenuProcessingScreen`

**Relevance to US4:** Ensures parsed dishes receive **allowlisted tags** from the backend so chips can match after persistence.

**Public:** default export component.

**Private (conceptual):** state for storage path, animation, calls `fetchDinerPreferences`, `buildMenuParseUserPreferences`, `requestMenuParse`, `persistParsedMenu`.

### 6.8 `lib/persist-parsed-menu.ts`

**Public:** `persistParsedMenu(menu, profileId)` — writes scan/sections/dishes including `tags` and `ingredients` arrays.

### 6.9 Backend — `backend/parsed_menu_validate.py`

**Public (Python module API)**

- **Functions:** `build_allowed_tags_from_user_preferences(prefs)`, `constrain_menu_tags_to_allowed_tags(menu, allowed)`, `validate_parsed_menu`, `assign_server_uuid_ids`, etc.

**Purpose for US4:** Ensures each dish’s `tags` ⊆ allowed preference strings so client-side chip filtering is consistent.

**Classes:** No dedicated classes for this story; logic is **functions** in a module.

### 6.10 Backend — `backend/app.py`

**Public:** Flask routes (e.g. `POST /v1/parse-menu`) orchestrate OCR/LLM, validation, and tag constraining.

**Classes:** Standard Flask `Flask` app instance; no custom Python class hierarchy specific to US4.

### 6.11 `components/DinerTabScreenLayout.tsx`

**Relevance:** Layout wrapper for diner menu screen (header, tabs). Not filtering logic; provides shell for `DinerMenuScreen`.

---

## 7. Technologies, libraries, and APIs

Versions are from `PickMyPlate2/package.json` at documentation time. Patch versions may drift with lockfiles; pin in your deployment docs if required.

| Technology | Version (repo) | Used for | Why chosen (project context) | Author / source | Documentation |
|------------|----------------|----------|------------------------------|-----------------|---------------|
| TypeScript | ~5.9.2 (dev) | Typed client code | Type safety for menu schema and Supabase usage | Microsoft | https://www.typescriptlang.org/docs/ |
| React | 19.1.0 | UI | Standard for Expo apps | Meta | https://react.dev/ |
| React Native | 0.81.5 | Native mobile UI | Expo’s supported renderer | Meta | https://reactnative.dev/docs/getting-started |
| Expo SDK | ~54.0.33 | Build, runtime, modules | Simplified RN toolchain for course/startup apps | Expo | https://docs.expo.dev/ |
| Expo Router | ~6.0.23 | File-based navigation | Deep links and screens (`diner-menu`, processing) | Expo | https://docs.expo.dev/router/introduction/ |
| @supabase/supabase-js | ^2.100.0 | DB + auth client | Hosted Postgres + RLS + auth | Supabase | https://supabase.com/docs/reference/javascript/introduction |
| Supabase (platform) | *(your project)* | PostgreSQL, Auth, Storage, PostgREST | Backend-as-a-service | Supabase | https://supabase.com/docs |
| @expo/vector-icons | ^15.0.3 | Icons (e.g. spice flames) | Bundled with Expo | Expo | https://docs.expo.dev/guides/icons/ |
| expo-image | ~3.0.11 | Dish thumbnails | Performance vs RN Image | Expo | https://docs.expo.dev/versions/latest/sdk/image/ |
| @react-navigation/native | ^7.1.8 | Navigation core (used by Expo Router) | Industry standard | React Navigation | https://reactnavigation.org/docs/getting-started/ |
| Python / Flask | *(backend; version not pinned in snippet)* | Menu parse HTTP API | Existing backend in repo | Pallets / PSF | https://flask.palletsprojects.com/ |
| Google Vertex AI / Gemini | *(backend env)* | LLM menu extraction | Used by `llm_menu_vertex.py` | Google Cloud | https://cloud.google.com/vertex-ai/docs |

**Not used for US4 filtering:** There is **no** dedicated RPC for “apply filters”; Supabase RPC is not part of this story in code.

---

## 8. Database — long-term storage for US4

### 8.1 Tables that store preference data (diner)

| Table | Purpose | Fields (relevant) | Per-field purpose | Rough size notes |
|-------|---------|-------------------|-------------------|------------------|
| `diner_preferences` | 1:1 diner settings | `profile_id` (PK, FK) | Links to `profiles.id` / `auth.users` | UUID ~16 B |
| | | `spice_level` | `mild` / `medium` / `spicy` / null | small text ~ few bytes |
| | | `budget_tier` | `$` … `$` | 1–4 chars |
| | | `onboarding_completed_at` | When onboarding saved | timestamptz ~8 B |
| | | `preferences_skipped` | boolean | 1 B |
| | | `raw_preference_notes` | Free text notes | variable (0–KB+) |
| | | `created_at`, `updated_at` | audit | timestamptz each |
| `diner_dietary_preferences` | Many dietary chips | `(profile_id, dietary_key)` PK | Selected dietary tags | UUID + short text per row |
| `diner_cuisine_interests` | Cuisine many-to-many | `profile_id`, `cuisine_id` | Cuisine filter chips | 2× UUID per row |
| `cuisines` | Reference catalog | `id`, `slug`, `name`, … | Resolve cuisine names for chips | small reference rows |
| `diner_smart_tags` | Structured tags | `id`, `profile_id`, `category`, `label`, `source_text`, `sort_order`, timestamps | Allergy/like/dislike/preference labels used as chips | UUID + text per row |

### 8.2 Tables that store menu data used for filtering

| Table | Purpose | Fields (relevant) | Per-field purpose | Rough size notes |
|-------|---------|-------------------|-------------------|------------------|
| `diner_menu_scans` | Scan record | `id`, `profile_id`, `restaurant_name`, `scanned_at` | Identifies menu instance | name variable |
| `diner_menu_sections` | Sections | `id`, `scan_id`, `title`, `sort_order` | Group dishes | title variable |
| `diner_scanned_dishes` | Dishes | `tags` (text[] / JSON per migration) | **Matched against selected chips** | array of short strings; typical tens of bytes per dish |
| | | `ingredients` | Display / detail; **not used in filter logic in app** | can be larger per dish |
| | | `spice_level`, `name`, `description`, prices, `image_url` | UI / detail | variable |

**Storage estimate (illustrative):** A single dish row might be on the order of **hundreds to a few thousand bytes** depending on `description` and `ingredients` length; `tags` alone are typically **tens of bytes**. Exact PostgreSQL on-disk size includes row overhead, indexes, and TOAST for large text.

---

## 9. Failure scenarios

Applies to the **US4 filtering feature** and its dependencies (load preferences, load menu, parse path).

| Scenario | User-visible effect | Internal behavior |
|----------|---------------------|-------------------|
| **Frontend process crash** | App disappears; unsaved **in-memory** `selectedTags` are lost. | On relaunch, user reopens scan; preferences reload from DB; chips default to none selected. |
| **Lost runtime state (no crash, e.g. OS kills activity)** | Same as above for `selectedTags`. | Menu may need reload when screen remounts. |
| **Erased all local stored data** | If only AsyncStorage cleared: minimal impact on US4 (filter state is mostly in React state). If app data includes auth session storage, user may need to sign in again. | Preferences and menus live in Supabase; they reappear after auth. |
| **Database data corrupt (e.g. malformed `tags` array)** | Dish may fail validation when reading, or tags may not match chips; filter may show empty matches. | `fetchParsedMenuForScan` / `assembleParsedMenu` assume well-formed rows; corrupt JSON could cause runtime errors or empty tags depending on driver behavior. **Mitigation:** DB constraints, monitoring, repair scripts (not detailed in app code). |
| **RPC failure** | If “RPC” means **Supabase PostgREST** calls: error message on menu load (“Failed to load menu” or Supabase error text). Chips may not appear if `fetchDinerPreferences` throws. | `loadMenu` catches errors and sets `error` state. |
| **Menu parse HTTP failure** | User stays on processing screen or sees alert; **no new scan** or partial failure depending on code path. | Does not change filtering on existing scans. |
| **Client overloaded (CPU)** | UI jank when toggling many chips on huge menus; filter recomputation is O(dishes × tags). | `useMemo` limits redundant work; still single-threaded JS. |
| **Client out of RAM** | OS may kill app. | Large menus increase memory for `menu` object and derived sets. |
| **Database out of space** | Inserts fail when saving new scans; reads may still work until DB errors. | User sees persist/parse errors, not filter-specific. |
| **Lost network connectivity** | Cannot load preferences or menu; loading spinner then error. | Supabase client fails; `loadMenu` sets error. Already-loaded menu could still allow local chip toggling until unmounted. |
| **Lost database access** | Same as network/auth outage from client perspective. | Errors surfaced in UI. |
| **Bot spam / abuse** | Not specifically handled in US4 UI. At platform level: auth signup abuse could create fake diners; menu parse endpoint could be spammed if unauthenticated. | **Mitigation** belongs to auth rate limits, API keys, WAF, Supabase policies — **not implemented in `diner-menu.tsx`.** |

---

## 10. PII, security, and compliance

### 10.1 PII and sensitive data in long-term storage (relevant to US4)

| Data | PII? | Why stored | How stored | How it enters the system | Path before storage | Path after storage |
|------|------|------------|------------|---------------------------|----------------------|---------------------|
| `profiles.id` / `auth.users.id` | Indirect identifier (UUID) | Account identity | UUID in Postgres | Sign-up / Supabase Auth | Auth module → `profiles` | Joined from all `profile_id` FKs |
| `profiles.display_name`, `avatar_url` | Potentially PII | Profile UX | Text / URL | User profile UI | Client → Supabase | Read on profile screens |
| `diner_preferences.raw_preference_notes` | **Likely PII** (free text may include names, health details) | User-entered notes | `text` in Postgres | Onboarding / personalization forms | Client → `savePersonalizationFormPrefs` | Read by `fetchDinerPreferences` if selected in UI *(verify UI exposure in repo)* |
| `diner_smart_tags.label`, `source_text` | **May be sensitive** (allergies, dislikes) | Personalization | Text in Postgres | Parsed or user-entered | Client / future parsers | Chip labels in `fetchDinerPreferences` |
| Dietary / cuisine / spice / budget | Lower direct identifiability; still preference data | Filtering & recommendations | Normalized columns / join tables | User selections | `savePersonalizationFormPrefs` | `fetchDinerPreferences` → menu chips |
| `diner_menu_scans`, dish content | Restaurant data + user linkage via `profile_id` | User’s scan history | Postgres | Menu parse + persist | `persistParsedMenu` | `fetchParsedMenuForScan` |

### 10.2 Responsibility and auditing (team — not in code)

| Storage unit | Suggested owner | Auditing |
|--------------|-----------------|----------|
| `auth.users` / Supabase Auth | *TBD (team lead / infra)* | Supabase Auth logs, MFA policy |
| `profiles`, diner preference tables | *TBD (backend owner)* | Supabase log explorer, RLS review, periodic access reviews |
| Menu parse Flask service | *TBD (backend owner)* | Application logging, rate limits, secrets rotation |

**Procedures:** Define in your team policy (who may run SQL against prod, how incidents are logged). **Not specified in application source.**

### 10.3 Minors

- The repository **does not** encode age verification or parental consent flows.
- **Policy statement for coursework:** *TBD by team — e.g., “App is intended for users 13+” or institutional IRB policy.*
- **Whether minors’ PII is solicited:** Only indirectly if a minor creates an account; **no dedicated guardian permission UI** appears in the reviewed migrations.
- **Child safety policy:** *TBD by team / institution* — not implementable from code review alone.

---

## 11. Traceability gaps (explicit)

1. **Ingredient filtering:** User story text mentions **ingredients**; the client filter uses **`tags` only**. Ingredients are stored and shown elsewhere in the app lifecycle but **not** used in `diner-menu.tsx` filter logic.
2. **Search results:** `app/diner-search-results.tsx` filters by **text query** over dish fields, not by the same preference chip model as the menu screen.
3. **Merge date and owners:** Fill from team records / GitHub.

---

## 12. Suggested acceptance tests (machine-executable — future work)

The repository may not yet contain Jest/Detox tests for US4; recommended cases:

- Given menu with tags `["Vegetarian"]`, when user selects chip `Vegetarian`, then only matching dishes appear.
- When user selects `Vegetarian` and `Vegan`, then dishes must include **both** tags (AND semantics).
- When no chip selected, all sections with dishes remain.
- When chips selected but no dish has all tags, show “No dishes match all selected filters.”
- When preference has tag not on any dish, chip renders **muted** (`MenuFilterChip` `muted` prop).

---

*Document generated from codebase paths under `PickMyPlate2/` and `PickMyPlate2/backend/`. Update owners, merge date, and team policies before submission.*
