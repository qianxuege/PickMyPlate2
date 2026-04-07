# Human acceptance test — User Story 7  
## Highlight featured & new dishes (owner + diner)

**Story (summary):** As a restaurant owner, I want to mark dishes on my **published** menu as **Featured** and/or **New**; as a diner, I want to see those highlights when browsing the digital menu.

**Build / PR reference (implementation):** Owner screen **`restaurant-highlight`** (restaurant bottom nav **Highlight**): toggles persist via `updateRestaurantDishHighlightFlags` on the **published** menu scan (`published_menu_scan_id`). Diner-facing UI uses **`HighlightDishBadges`** (“Featured” / “New”) and, on **`diner-menu`**, highlight-style **tag chips** when dish tags include `featured`, `new`, or `popular` (and parser alias “chef’s recommendation” → featured). **`diner-highlight`** lists highlighted dishes from the published menu for the restaurant that matches the diner’s **most recent scan name** (see prerequisites). Partner QR flow can copy owner flags into tags when opening **`partner-menu`** → **`diner-menu`**.

---

## Environment setup (developers / QA — run everything locally)

**Who this is for:** Teammates running the app from source. Diners and owners use in-app accounts only.

1. **Supabase:** Use your team’s shared project—put **`EXPO_PUBLIC_SUPABASE_URL`** and **`EXPO_PUBLIC_SUPABASE_KEY`** in **`PickMyPlate2/.env`** (see [`.env.example`](../../.env.example)). No `supabase link` / CLI steps required for acceptance.
2. **Expo:** From **`PickMyPlate2/`**, `npm install`, then **`npm start`**. Restart after `.env` changes.
3. **Flask (menu API):** See [`backend/README.md`](../../backend/README.md)—`cd backend`, venv, `pip install -r requirements.txt`, **`python app.py`** (port **8080**). Set **`EXPO_PUBLIC_MENU_API_URL`** in the app `.env` to your machine’s **LAN IP** on a physical device (e.g. `http://192.168.x.x:8080`), or `http://127.0.0.1:8080` / `http://10.0.2.2:8080` for iOS Simulator / Android emulator respectively.

Full detail: repo root [`README.md`](../../README.md).

---

## Prerequisites (tester setup)

1. **Environment:** Dev or shared build pointed at your team’s Supabase project (see **Environment setup** above).
2. **Owner account:** Restaurant role, with a **published menu** (`published_menu_scan_id` set on your `restaurants` row—your team’s normal “go live” flow). The **Highlight** tab loads that published scan only; if nothing is published, the screen explains that highlights are unavailable until the menu is live.
3. **Diner account:** Signed in as a **diner**.
4. **Data alignment for `diner-highlight`:** The diner must have at least one **recent menu scan** whose **restaurant name** (as stored on the scan) **exactly matches** (trimmed, case-insensitive) a restaurant row that has **`published_menu_scan_id`** and highlights on dishes. If names differ, the Highlight dishes screen may show **no highlights** even though the owner toggled flags—record that as a data/setup issue.
5. **Optional — partner path:** If you test **partner QR / partner link**, use the flow your team documents (`diner-partner-qr-scan` → **`partner-menu`** resolves to **`diner-menu`** with a `scanId`).

---

## Tester instructions (step-by-step)

### Part A — Restaurant owner: mark highlights

1. Sign in as **restaurant** and open bottom nav **Highlight** (route **`/restaurant-highlight`**).
2. If you see **no published menu**, stop Part A and note: menu must be published first; otherwise continue.
3. Confirm the list shows dishes from the **published** scan. Pick **three** dishes to remember by name: leave one **plain**, set one to **Featured** only, one to **New** only (or both on one dish if you want to test dual badges).
4. Use the **switches** to turn **Featured** / **New** on and off. Confirm toggles **stick** after leaving the screen and returning (pull to refresh if available).
5. Confirm **badges** on the owner list match the switches (**Featured** gold-style pill, **New** blue-style pill) via `HighlightDishBadges`.
6. If the UI offers **clear** / remove highlight for a dish, use it and confirm both flags clear and badges disappear.

### Part B — Diner: Highlight dishes screen (`diner-highlight`)

7. Sign in as **diner**. Open the **Highlight dishes** screen (Expo route **`diner-highlight`**). *If your build has no visible button, use your team’s agreed method: deep link, dev menu, or temporary QA entry.*
8. Read the subtitle: it should reference **highlights from your latest scanned menu** and may show a restaurant name when data loads.
9. Confirm dishes you marked in Part A appear **only if** the name-matching prerequisite (above) is satisfied. Each row should show **Featured** / **New** badges consistent with the owner toggles.
10. Pull to **refresh** (if offered); badges should stay consistent with the server state.
11. If **no highlights** appear, distinguish: (a) empty because no dishes are flagged, (b) name mismatch between scan and `restaurants`, or (c) no published menu / bug—note which.

### Part C — Diner: full menu chips (optional)

12. Open **`diner-menu`** for a scan where dishes carry tags **`featured`**, **`new`**, or **`popular`** (e.g. after opening via **partner** flow that copies owner flags into tags, or from parser output). Confirm **chips** under the dish title match expectations (**Featured** label for featured).
13. Open a dish to **detail** if your build shows highlight info there; if not, note “badges list-only” for feedback.

### Stop conditions

- Owner **Highlight** tab empty → publish a menu first.
- Diner **Highlight dishes** empty but owner set flags → check **restaurant name** on latest scan vs `restaurants.name` and published scan id.
- **RLS / auth errors** → record message; likely wrong account or env.

---

## Three salient metrics (record per session)

| # | Metric | Why it matters |
|---|--------|----------------|
| **M1 — End-to-end clarity** | Does the tester connect **owner toggles** to **diner-visible** highlights without repeated explanation? | Multi-sided product; broken mental model → low trust. |
| **M2 — Promotional usefulness** | Do highlights help **choose faster** vs feeling like clutter? | Owners care about attention on the right items. |
| **M3 — Accuracy / trust** | Are the **correct** dishes highlighted (no wrong or missing badges after refresh)? | Wrong state feels like a bug. |

---

## Three-question survey (after Parts A–B, optional C)

| # | Question | Maps to |
|---|----------|---------|
| **Q1** | “As a diner, did **Featured** / **New** draw your eye in a **helpful** way or feel like **noise**? One short sentence each.” | M2 |
| **Q2** | “Was there a moment highlights felt **wrong** or **out of sync** with what the restaurant would want? Describe the smallest example—or say ‘none.’” | M3 |
| **Q3** | “If you ran a real restaurant, would you **use** this highlight feature weekly? What **one** change would most increase that?” | M1, M2 |

---

## Tester record (fill in for Gradescope / PDF)

**Tester name:** _______________________  
**Andrew ID (if CMU peer):** _______________________  
**Team (if not your team):** _______________________  
**Date / app build:** _______________________  

**Run #** (increment if you revise the app and re-test): _______

| Metric / question | Response |
|-------------------|----------|
| M1 (clarity) | |
| M2 (usefulness) | |
| M3 (accuracy) | |
| Q1 | |
| Q2 | |
| Q3 | |

**Notes (optional):** _______________________

---

## GitHub / Kanban (course checklist)

- [ ] Issue: “Acceptance test — US7” created and linked on Kanban  
- [ ] This doc committed; PR opened and reviewed; merged to `main`  
- [ ] PR URL submitted on Gradescope with story label **US7**
