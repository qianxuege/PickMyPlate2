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

Facilitators should **not** name exact tab labels unless the participant is stuck; the goal is to see whether navigation and affordances are discoverable.

1. **Sign in** as a diner (use the credentials the team provides).

2. **Find a dish** you might order (browse the menu, search, or open a dish you already see).

3. **Save the dish** using the control meant for “liking” or saving it (in this build: the **heart** on the dish row or dish detail). Confirm visually that it looks “on” or saved after you tap.

4. **Find your saved dishes** without being told exactly where they live. Open the screen that should list everything you saved.

5. **Confirm the dish appears** in that list.

6. **Remove** one saved dish using whatever control the app offers (e.g. heart again, or remove on the favorites list).

7. **Brief debrief** (verbal): say in your own words whether you would use this on a real night out and why or why not.

---

## Facilitator checklist (maps to human AC)

| Human AC              | What to watch for                                                                |
| --------------------- | -------------------------------------------------------------------------------- |
| Understand add/remove | Can they save and unsave without step-by-step help after the first task?         |
| Locate saved dishes   | Time and hesitation to open the favorites / saved list; wrong guesses are data.  |
| Remembering / value   | Do they describe the list as useful for reordering or recalling what they liked? |

---

## Three salient metrics for satisfaction

These are **actionable** (they tie to behavior and decisions), not vanity counts in isolation. They align with _The Lean Startup_ (measure what changes what you build), _The Mom Test_ (learn from concrete past behavior and specifics, not flattery), and typical product metrics (activation, engagement quality, retention signals).

### 1. Task success rate and time-to-first-saved-dish

**What to measure:** Proportion of participants who successfully save a dish **and** open the saved list **unprompted** (or with at most one generic hint), and how long that takes.

**Why it matters:** This is a classic **activation / usability** signal. Ries emphasizes metrics that show whether the product “sticks” for real users; if people cannot complete the core loop, optimization elsewhere is wasted. It also avoids _Mom Test_ failure modes: you are observing behavior, not asking “Was it easy?”

### 2. Repeat use of favorites within the session (or stated intent tied to a concrete scenario)

**What to measure:** Whether participants return to the favorites screen again, save a second dish, or—if the session is short—describe a **specific** future situation (“next time at this place…”) where they would open saved dishes.

**Why it matters:** This gets at **engagement quality** and remembered value, not just a one-off tap. _The Mom Test_ pushes you away from hypotheticals like “Would you use this?” toward specifics; _Lean Startup_ cares whether behavior recurs enough to justify the feature in the next iteration.

### 3. 7-day (or next-visit) return to favorites among early adopters

**What to measure:** In a pilot or beta, the share of diners who **open the favorites screen again** within a week or on a second app session.

**Why it matters:** Short-term task success can hide shallow novelty. **Retention** and **repeat behavior** are the honest test of whether favorites create “personal value beyond a single dining experience,” as the story claims. Cohort-style thinking (who came back and did what) matches _Lean Startup_ learning milestones better than a single launch-day spike.

---

## Post-session survey (User Story 5 — saved / favorite dishes)

Ask these **after** the participant finishes the scripted tasks (save a dish, open the saved list, remove a save). The facilitator should **also log behavioral data** where noted so Likert answers can be compared to what actually happened.

### 1. Saving a dish as a favorite

**Question:** How easy and fast was it to **save a dish you liked** using the app (e.g. the heart on a dish or dish detail)?

**Scale:** **1** — Very difficult / slow → **4** — Very easy / fast

**Facilitator (objective):** From when the target dish is on screen until the UI clearly shows it as **saved/favorited**, record **number of taps** and **elapsed time** (same start/end definition for every participant).

### 2. Finding your saved dishes

**Question:** How easy was it to **open the screen that lists your saved dishes** and confirm the dish you saved was there?

**Scale:** **1** — Very difficult → **4** — Very easy

**Facilitator (objective):** Record **taps** and **time** from task start (“find your saved dishes”) until the **saved-dishes list** is visible and the participant indicates they see the dish (or gives up).

### 3. Future ordering when you’re unsure

**Question:** Based on your experience using the **saved dishes** feature today, do you think it will help you **look back at dishes** or **decide what to order more quickly** the next time you’re **unsure what to get**?

**Scale:** **1** — Not at all · **2** — A little · **3** — Quite a bit · **4** — A great deal

**Facilitator (optional):** Ask **why** only after they pick a number (one follow-up sentence is enough); note whether they cite **memory**, **comparison**, or **something else**.

---

## Time estimate (for planning)

Roughly **3–4 days** for implementation is a reasonable team estimate; schedule **30–45 minutes** per participant for this human test (setup, tasks, short survey), plus synthesis time.
