# Human usability test — User Story 5: Save favorite dishes

**Role:** Restaurant diner  
**Story:** As a restaurant diner, I want to bookmark dishes I like so that I can quickly find them again later or remember what I enjoyed previously.

## Prerequisites (get the system ready)

1. **Frontend and backend both running**  
   PickMyPlate expects **two** processes: the Expo app (frontend) and the Flask API (backend). Start **both** before testing.
   - **Frontend (Expo):** From the project root: `npm install`, then `npm start`. Open the app in Expo Go, a simulator, or a web build as your team usually does.
   - **Backend (Flask):** In a **second** terminal, set up once (venv, deps, env file), then start the API:

   ```bash
   cd backend
   python3 -m venv .venv
   source .venv/bin/activate   # Windows: .venv\Scripts\activate
   pip install -r requirements.txt
   cp .env.example .env
   ```

   Edit `backend/.env` if your team requires non-default values, then run `python app.py` (default port **8080**). On later sessions, only `cd backend`, `source .venv/bin/activate`, and `python app.py` are usually needed. See `backend/README.md` for details.

2. **Environment**  
   A `.env` file in the project root must include valid `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_KEY` (anon/public key from Supabase), and **`EXPO_PUBLIC_MENU_API_URL`** must point at your running Flask API (no trailing slash)—e.g. `http://127.0.0.1:8080` on a simulator, or your computer’s **LAN IP** on a physical device, not `localhost` from the phone. Restart Metro after any `.env` change.

3. **Database**  
   Migrations must be applied to the linked Supabase project (`npm run supabase:db:push` after linking), including tables/policies that support **`user_roles`** so each account is recognized as a diner, restaurant owner, or both.

## Reference: acceptance criteria

### Machine acceptance criteria

- Users can tap a bookmark icon on a dish.
- Bookmarked dishes are stored in the user’s profile.
- Users can view a list of saved dishes.
- Users can remove dishes from their saved list.

### Human acceptance criteria

- Users understand how to add and remove bookmarks.
- Users can easily locate the saved dishes page.
- Users report that bookmarking helps them remember dishes they liked.

### Note on the current build

In this app, saving a dish is done with the **heart** control (filled = saved, outline = not saved). Treat it as the same interaction as a “bookmark” for testing and discussion with participants.

---

## Additional setup for this story

After the prerequisites above, confirm the following so favorites work end to end:

- **Schema:** Migrations include **`diner_favorite_dishes`** (and related RLS) so saves persist per diner profile. Use `npx supabase link` and `npm run supabase:db:push` as in the root `README.md` if anything is missing.
- **Test account:** Use a **signed-in diner** account. Favorites are tied to the authenticated profile; anonymous or wrong-role sessions may not behave as expected.
- **Dishes available:** The account should be able to open at least one **dish** (menu, search, or detail) so add/remove favorite can be exercised.

---

## Instructions for the participant

Treat the session like **one restaurant visit**. Facilitators should **not** name exact tab labels (e.g. tab names for “saved dishes”) unless you are stuck; we are testing whether you can spot how to save and find dishes on your own.

1. **Sign in** as a diner (use the credentials the team provides).

2. **Find a dish** you might order (browse the menu, search, or open a dish you already see).

3. **Save the dish** using the control for liking or saving it (in this build: the **heart** on the dish row or dish detail). Confirm it looks saved after you tap.

4. **Find your saved dishes** without being told exactly where that list lives. Open the screen that should show everything you saved.

5. **Confirm the dish appears** in that list.

6. **Remove** one saved dish using whatever the app offers (e.g. heart again, or a control on the saved list).

7. **Optional same-visit use:** If it feels natural, **open your saved list again** or **save another dish** before we wrap—like you might while still at the table deciding.

8. **Post-session ratings:** The facilitator will ask you **three short questions** on a **1–4 scale**.

---

## Three salient metrics for satisfaction

These are **actionable** (they tie to behavior and decisions), not vanity counts in isolation. They align with _The Lean Startup_ (measure what changes what you build), _The Mom Test_ (learn from concrete past behavior and specifics, not flattery), and typical product metrics (activation, engagement quality). **Metric 3 is deliberately human-verifiable** in a single session: we **ask participants directly** whether saved dishes would help them **find dishes again** and **remember what they liked**—matching the human AC that users **report** that benefit. It is **not** a cohort metric that needs analytics or a 7-day wait.

### 1. Task success rate and time-to-first-saved-dish

**What to measure:** Proportion of participants who successfully save a dish **and** open the saved list **unprompted** (or with at most one generic hint), and how long that takes.

**Why it matters:** This is a classic **activation / usability** signal. Ries emphasizes metrics that show whether the product “sticks” for real users; if people cannot complete the core loop, optimization elsewhere is wasted. It also avoids _Mom Test_ failure modes: you are observing behavior, not asking “Was it easy?”

### 2. Repeat use of favorites within the session

**What to measure:** Whether participants **reuse saved dishes during the same test session**—frame the session as **one restaurant visit**—by **returning to the favorites screen again** or **saving a second dish**. If neither happens, capture **same-visit** intent in debrief (e.g. “I’d open the list again before deciding”) or, only if the session is too short, a **concrete** “next time at…” line.

**Why it matters:** This is **in-visit engagement depth**, distinct from whether bookmarks feel useful **on a later night out** (Metric 3). _The Mom Test_ favors specifics over vague “I’d use this”; _Lean Startup_ cares whether the feature invites **another pass** in the same sitting, not only a single successful tap.

### 3. Do participants say saved dishes help them find and remember?

**Plain language:** After they have used bookmarks today, **how many people agree** (on the 1–4 survey and optional debrief) that **saved dishes would help them find something again** or **remember what they enjoyed**—the same outcomes as the user story. This checks the human AC: _Users report that bookmarking helps them remember dishes they liked._

**What to measure:** Share of participants who **rate Q3 highly** (e.g. 3 or 4), plus any comments about what they use the feature for (**re-find / reorder**, **memory**, **both**, or **nothing useful**).

**Why it matters:** Human AC requires **reported** benefit, not only that the UI works. That is **measurable in the room** with **Q3** and one short debrief question. This is **perceived value on a later outing**, not repeat use **during the same session** (Metric 2). Longitudinal retention (e.g. reopen favorites next week) stays a **separate product metric** if you add instrumentation later.

---

## Post-session survey (User Story 5 — saved / favorite dishes)

Ask these **after** the participant finishes the scripted tasks (save a dish, open the saved list, remove a save). **Each question maps in order to Metric 1, Metric 2, and Metric 3** in **Three salient metrics for satisfaction**. **Q2** is about willingness to **reuse saved dishes during this session** (treat it like **one restaurant visit**). **Q3** is about whether bookmarks would help you **find or remember dishes on a later real outing**—not repeat use during the test.

### 1. Maps to Metric 1 — Task success and time-to-first-saved-dish (full loop)

**Question:** Thinking about the **whole flow**—**saving a dish** you liked **and then opening your saved-dishes list** so you could **see it there**—how **easy and fast** was that combined experience?

**Scale:** **1** — Very difficult / slow → **4** — Very easy / fast

### 2. Maps to Metric 2 — Repeat use of favorites within the session (or concrete future scenario)

**Question:** After you’d used saved dishes **once** (saved something and seen your list), how much did you feel like **using them again before you were done with this session**—as if this were **one restaurant visit**—for example **opening the saved-dishes list another time** or **bookmarking another dish**?

**Scale:** **1** — Not at all · **2** — A little · **3** — Quite a bit · **4** — A great deal

### 3. Maps to Metric 3 — Do participants say saved dishes help them find and remember?

**Question:** Based only on what you did today—bookmarking dishes, seeing them on your saved list, and removing one—how much do you think saved dishes would help you **after you’ve left** or on a **later visit**, when you want to **find a dish again** or **remember what you enjoyed**?

**Scale:** **1** — Not at all · **2** — A little · **3** — Quite a bit · **4** — A great deal

---

## Survey response 1

**Participant Name**

- Scarlett Huang

**Q1 – Thinking about the whole flow—saving a dish you liked and then opening your saved-dishes list so you could see it there—how easy and fast was that combined experience?**

- 4 Very easy and fast. She was able to save a dish in one tap from the main menu, and she found the heart icon tab immediately and got to that screen in the next tap. The whole process was unprompted and took only 2 taps.

**Q2 — After you’d used saved dishes once (saved something and seen your list), how much did you feel like using them again before you were done with this session—as if this were one restaurant visit—for example opening the saved-dishes list another time or bookmarking another dish?**

- 3 Quite a bit. She said she would open the favorites tab again during the same meal to compare what she’d saved before deciding. She'd also add dishes right after she finishes her meal and if she likes the meal. During the test, she saved several other dishes and reopened the page without prompting. However, she worried the list could feel crowded if she saved many items and wanted filter or search on that page.

**Q3 — Based only on what you did today—bookmarking dishes, seeing them on your saved list, and removing one—how much do you think saved dishes would help you after you’ve left or on a later visit, when you want to find a dish again or remember what you enjoyed?**

- 4 A great deal. She said it would help her remember dish names and restaurants when planning a return visit or recommending dishes to friends. She liked that favorites show which restaurant each dish came from. **Verbatim:** “I’d use it so I don’t forget what I actually liked last time.”
