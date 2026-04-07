# Human acceptance test — User Story 4  
## Dish filtering by preferences & diner search

**Story (summary):** As a restaurant diner, I want to filter dishes by preferences and find dishes quickly (including text search on the current menu) so I can narrow options that fit my needs.

**Build / PR reference (implementation):** US4 delivery includes preference chip **hard filter** on `diner-menu` and **diner search** scoped to the open scan (`diner-search`), with recent queries in AsyncStorage per `scanId`.

---

## Environment setup (developers / QA — run everything locally)

**Who this is for:** Teammates (or a classmate) who need to **run the app from source** with a real database and API. **Diners and restaurant owners never sign up at Supabase**—they only use in-app accounts; Supabase is your team’s hosted backend.

Use this section so the app, database, and menu API all talk to each other. More detail also lives in the repo root [`README.md`](../../README.md) and [`backend/README.md`](../../backend/README.md).

### 1. Database (Supabase — team project, no setup in this doc)

Assume your team **already** uses one shared Supabase project: the repo is linked, migrations are applied, and the dashboard is configured. **For acceptance you do not run any Supabase CLI commands** (`supabase link`, `supabase login`, `db push`, etc.).

You only need the app to talk to that project: copy **`EXPO_PUBLIC_SUPABASE_URL`** and **`EXPO_PUBLIC_SUPABASE_KEY`** into **`PickMyPlate2/.env`** from whatever secret channel your team uses (shape in [`.env.example`](../../.env.example)). Never commit real keys. If you test a **prebuilt** binary your team distributed, those values may already be baked in and you can skip editing `.env` for Supabase.

### 2. Frontend (Expo app)

From the **`PickMyPlate2/`** directory (where `package.json` lives):

```bash
npm install
cp .env.example .env   # if you do not already have .env
```

Edit **`.env`** in the app root:

| Variable | Purpose |
|----------|---------|
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_KEY` | Supabase anon public key |
| `EXPO_PUBLIC_MENU_API_URL` | Flask API base URL **with no trailing slash** (see IP below) |

Then start Metro:

```bash
npm start
```

Use **Expo Go** on a phone (same Wi‑Fi as the computer), **i** for iOS Simulator, or **a** for Android Emulator. **Restart `npm start`** after any `.env` change.

### 3. Backend (Flask menu API)

Menu parsing and some dish features call this service.

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
```

Edit **`backend/.env`**: at minimum set **`MOCK_MENU_PARSE=1`** for a quick demo (returns a mock `ParsedMenu` without GCP/OCR). For real scans, set **`MOCK_MENU_PARSE=0`** and fill Supabase service role + GCP keys per `backend/README.md`.

Run the server (default **`http://0.0.0.0:8080`**):

```bash
python app.py
```

Confirm it responds: `curl http://127.0.0.1:8080/health`

### 4. Pointing the app at your machine (IP address)

The phone must reach **your laptop’s Flask port**. **`localhost` inside `.env` does not work on a physical device** — it refers to the phone itself, not your computer.

1. **Find your LAN IP** (same network as the phone):
   - **macOS:** System **Settings → Network → Wi‑Fi → Details → IP Address**, or in Terminal: `ipconfig getifaddr en0` (Wi‑Fi; sometimes `en1` on some Macs).
   - **Windows:** `ipconfig` → IPv4 under your active adapter.
2. Set in **`PickMyPlate2/.env`**:

   `EXPO_PUBLIC_MENU_API_URL=http://YOUR_LAN_IP:8080`

   Example: `http://192.168.1.42:8080` — **no** trailing slash.

3. **iOS Simulator** on the same Mac can often use `http://127.0.0.1:8080`.
4. **Android Emulator** typically uses **`http://10.0.2.2:8080`** to reach the host machine’s localhost.
5. If the device cannot load the app bundle, try `npx expo start --tunnel` or check firewall rules.

Whenever your DHCP IP changes (new network, router lease), update **`EXPO_PUBLIC_MENU_API_URL`** and restart Expo.

### 5. Order of operations (checklist)

1. App **`.env`** has the team’s Supabase URL + anon key (or use a build that already includes them). **No Supabase CLI** for acceptance.
2. **`npm start`** (after `npm install` if needed).
3. Backend venv + **`backend/.env`** + **`python app.py`** on port 8080.
4. **`EXPO_PUBLIC_MENU_API_URL`** matches how you run the app (LAN IP vs `127.0.0.1` vs `10.0.2.2`).

---

## Prerequisites (tester setup)

1. **Environment:** A dev or shared build configured for **your team’s Supabase project** (no Supabase setup required of the tester) and, if you exercise scan/parse flows, **a running Flask instance** as in sections 2–4.
2. **Accounts:**
   - **Diner** account with the **diner** role, signed in.
   - Personalization completed (or skipped) so **preference chips** can appear on the menu if your profile has dietary/spice/budget/cuisine/smart tags saved.
3. **Data:** At least **one saved menu scan** with multiple sections/dishes, and ideally some dishes whose **`tags`** overlap your saved preferences (so chip filtering is visible). If tags are empty, chips may still appear but matches can be empty — note that in feedback.
4. **Freshness:** If testing search recents, you may clear app data or use a scan you have not searched before (recents are per `scanId`).

---

## Tester instructions (step-by-step)

### Part A — Preference chip filtering

1. Open the app as a **diner**. Go to **Home** and open **Recent scans** (or flow you use) to open a **diner menu** for a specific scan (`/diner-menu?scanId=…`).
2. Wait for the menu to **finish loading**. Scroll the horizontal **chip** strip (if visible). Note whether any chip looks **muted** (greyer) vs normal — muted means no dish on *this* menu uses that tag.
3. With **no chips selected**, confirm you see **all** non-empty sections and their dishes (no “Recommended only” strip replacing the full list).
4. Tap **one** chip that applies to at least one dish. Confirm the list shows **only** dishes whose tags include that chip (AND logic starts when you add more).
5. Tap a **second** chip. Confirm only dishes that include **both** selected tags remain. If nothing matches, you should see messaging like **“No dishes match all selected filters.”**
6. Deselect chips (tap again) until **none** are selected. Confirm the **full** menu view returns.

### Part B — Diner search (current scan only)

7. From the same **diner menu** screen, tap the **search (magnifying glass)** icon in the header (enabled when `scanId` is present).
8. You should land on **Search** (`/diner-search`). Type a query of **at least 2 characters** that should match a dish **name**, **description**, **tag**, or **ingredient** text on this scan, then submit (e.g. search button). The app may open a dedicated results screen (`/diner-search-results`).
9. On **search results** (that screen or inline list), confirm the header shows a **count** (e.g. `Results (N)`) and that listed dishes are **plausibly** related to the query.
10. Open a **dish** from results and return; use **Back to Menu** (or back navigation) to return to the menu.
11. Return to search again; confirm **recent queries** for this scan appear (AsyncStorage); tap a recent query if available and confirm results load.
12. Use **clear** control on the search field if present; confirm behavior matches expectation (field clears / results reset per design).

### Stop conditions

- If **search icon** is disabled or missing, record: no `scanId` in context — use a flow that opens the menu from a scan.
- If **chips** never appear, record: likely no `fetchDinerPreferences` data — still complete Part B if possible.

---

## Three salient metrics (for satisfaction / “would they pay”)

These map to **task success**, **effort**, and **trust** (Lean Startup / Mom Test style: behavior + pain, not only “do you like it”).

| # | Metric | Why it matters |
|---|--------|----------------|
| **M1 — Task success** | Did the tester **complete** filter + search flows **without help** after reading these instructions? | If a paying user cannot finish core jobs, the feature fails regardless of visual polish. |
| **M2 — Cognitive effort** | How **confusing** were chip AND semantics vs search scope (this menu only)? | Misunderstanding “this restaurant only” or “all tags required” causes abandonment. |
| **M3 — Perceived value** | Would they **use** search/chips on a **real** night out vs scrolling the full PDF menu? | Proxies willingness to pay / retention better than a generic 1–5 “like.” |

---

## Three-question survey (after completing Parts A & B)

Ask the tester **after** they finish. Questions are indirect where helpful; each ties to **M1–M3**.

| # | Question | Maps to |
|---|----------|---------|
| **Q1** | “Imagine you’re at this restaurant tonight. After what you just did, would you rely on the **chips** to narrow the menu, stick to **search**, use **both**, or ignore them and scroll? What’s the **one** thing that drove that choice?” | M2, M3 |
| **Q2** | “Was there any moment you thought the app was showing the **wrong** dishes, **too few**, or **too many**? Describe the **shortest** example — or say ‘none.’” | M1, M2 |
| **Q3** | “If this were a **paid** app feature (filter + search for the menu in your hands), what would have to be **true** for you to say it’s worth money — and what’s **still missing**?” | M3 |

**Optional Likert (add only if your team wants a number):** “How strongly do you agree: ‘I understood what the filters were doing’ (1–5).” — use as supplement, not replacement for Q2.

---

## Tester record (fill in for Gradescope / PDF)

**Tester name:** Andrew  
**Andrew ID (if CMU peer):** andrewx  
**Team (if not your team):** six degrees  
**Date / app build:** 2026-04-07 (peer acceptance run)  

**Run #** (increment if you revise the app and re-test): 1

| Question | Response |
|----------|----------|
| Q1 | Would use **either** the **preference chips** to narrow the menu **or** take a **whole pass over the full menu**—not locked into only one approach; choice would depend on how hungry he was and how long the menu felt. |
| Q2 | **None** — no moment where the app felt like it showed the **wrong** dishes, **too few**, or **too many** for the filters/search he tried. |
| Q3 | In a **real** restaurant night, he would **ask the waiter** to get **menu information** rather than depending on the app alone for that. (Still useful for narrowing a digital menu in the test, but staff remains his default for “what should I know about this menu.”) |

 **Satisfied with the overall implementation** of filtering and search—chips and full-menu browsing worked as expected (see Q2). Q3 still reflects his **personal habit** of asking waitstaff for some menu information in person; that does not change his **overall satisfaction** with how the feature is built.

**Notes (optional):** Same external tester as US7 acceptance (Andrew / six degrees). Q3 remains useful **Mom Test–style** context alongside overall satisfaction.

---

## GitHub / Kanban (course checklist)

- [ ] Issue: “Acceptance test — US4” created and linked on Kanban  
- [ ] This doc committed; PR opened and reviewed; merged to `main`  
- [ ] PR URL submitted on Gradescope with story label **US4**
