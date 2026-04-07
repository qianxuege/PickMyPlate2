# Human test guide — User Story 8: User login (diner & owner)

Instructions for a person exercising the login feature in PickMyPlate, how we measure whether the experience works and how to learn how people feel about it without sounding like a marketing survey.

---

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

4. **Test accounts**  
   You need at least:
   - One **diner** account (email + password) with a `diner` role in `user_roles`.
   - One **owner** account with a `restaurant_owner` (or equivalent app) role.  
     Create these through your team’s normal sign-up flow or Supabase Auth dashboard, ensuring rows exist in `user_roles` for those user IDs.

5. **Optional but useful**  
   Wrong-password flow is easier to judge if you know a **correct** password for one account and deliberately use a **wrong** password for another attempt.

6. **Password reset on mobile**  
   If you test **Forgot password**, the email contains a link that deep-links into the app. The tester must **open that link on the same device** where PickMyPlate runs (e.g. the phone with **Expo Go**, or the simulator / emulator you used to open the app). Opening the link only on a laptop browser usually **will not** open the in-app reset flow, because the redirect target is tied to the dev client on that device.

---

## What to do (login flow)

1. Open the app and go to the **Log in** screen (route: `/login`).

2. Enter **email** and **password**, then tap **Log In**.

3. **Expected — valid credentials**
   - The app validates credentials with Supabase.
   - It loads your **role(s)** from the database.
   - **Single role:** you should land on **diner home** (`/diner-home`) or **restaurant home** (`/restaurant-home`) depending on whether you are a diner or owner.
   - **Both roles:** you may be sent to a **role picker** if the app cannot infer a saved mode, or to the home matching your last chosen mode (stored on device).

4. **Expected — invalid credentials**  
   You should see a **clear error** (e.g. an alert such as “Sign in failed” with a short message). Fix the password or email and try again.

5. **Expected — recovery**  
   Use **Forgot password?** if you need to reset via email. **Open the reset link on the same device** running the app (see prerequisite 6). After a mistake, you should understand **what went wrong** and **what to do next** without contacting support.

6. **Persistence**  
   Fully close the app (or kill the process), reopen it, and confirm you remain **signed in** and can reach the right experience without re-entering password every time (within normal session limits your team defines).

7. **Post-login checks (human acceptance)**
   - As a **diner**, open areas that depend on being logged in (e.g. saved preferences/favorites if implemented).
   - As an **owner**, reach **menu management** (dashboard / menu screens) and confirm you are not stuck on diner-only flows.

8. **Time check**  
   Repeat a clean login once and note whether a typical user could finish **well under ~30 seconds** when credentials are correct.

---

## Three salient satisfaction metrics (and why they matter)

### 1. Login funnel completion rate (and median time to “right home”)

**What to measure:** Of people who open the login screen with intent to sign in, what share **successfully** reach diner home, owner home, or role picker **without abandoning**? Among successes, how long from “tap Log In” to the first meaningful screen?

**Why this one:** In _The Lean Startup_, this is an **actionable** metric tied to a specific step—not a vanity number like total app opens. It validates whether the build actually removes friction for both personas. In lecture terms, it is classic **funnel / conversion** on a critical activation step: if login fails often or takes too long, downstream features never get used.

### 2. Second-session return without “login confusion”

**What to measure:** After at least one successful login, on a **later day** (or after force-quit), what share of users **reach their intended area** (browse vs manage menu) **without** filing a bug, asking “which password?”, or getting stuck on the wrong role’s home?

**Why this one:** User Story 8 explicitly requires **persistence across sessions**. _The Mom Test_ pushes you toward **observable behavior** (“what did you do last time you opened the app?”) rather than opinions; this metric is behavior-first. It also connects to **retention** and **habit**: login that “sticks” supports repeat use for diners and owners alike.

### 3. Error recovery success rate after a failed attempt

**What to measure:** After a **failed** login (wrong password, typo, network glitch), what share **recover on their own** within a short window (retry, forgot password, fix typo) vs drop off or need help?

**Why this one:** Human acceptance calls out **understanding how to recover**. This separates a polite error string from a **usable** system—aligned with _Lean Startup_ **validated learning**: you learn whether messaging and flows actually fix the problem. It is also a **quality** metric that predicts support load and trust.

---

## Survey questions (login — User Story 8)

Each question maps to **one of the three salient metrics** above. Use these **after** the participant has followed the **What to do** steps (including **persistence**: close app, reopen). Where noted, the facilitator should **record behavior**, not only the scale response.

**Metric 1 — Login funnel completion & time**

1. **How easy and fast was it to sign in and reach the screen where you browse menus (diner) or manage your restaurant (owner)?**  
   **Scale:** 1 (Very difficult / slow) → 4 (Very easy / fast).

**Metric 2 — Second-session return without login confusion**

2. **After you had signed in successfully once, then closed the app completely and opened it again** (as in the test script): how well did things **match what you expected**—for example, still signed in and in the **right area** of the app for a diner (browsing) vs a restaurant owner (managing the menu), **without** feeling stuck on the wrong home screen?  
   **Scale:** 1 (Not at all what I expected / confusing) → 4 (Exactly what I expected / very clear).

**Metric 3 — Error recovery after a failed attempt**

3. **If** you had a **failed** sign-in during this test (wrong password, typo, or an error message): how **easy was it to understand what went wrong** and **get back to a successful sign-in** on your own—for example fixing the password, retrying, or using forgot password?  
   **Scale:** 1 (Very hard / unclear) → 4 (Very easy / clear).  
   **If the participant never had a failed attempt:** record **N/A** for Q3 and note that behavioral data for recovery was not collected this session.

### Participant survey response record 1

**Participant Name**

- Scarlett Huang

**Q1 — How easy and fast was it to sign in and reach the screen where you browse menus (diner) or manage your restaurant (owner)?**

- 3 Relatively easy. Was able to create an account for both diner and restaurant owner relatively quickly. However, on the restaurant side the create account process didn't fill in all the important information needed for a restaurant, so she had to go back to fill in things like restaurant address later in the profile page. It would be better to have it in the create account process as well.

**Q2 — After you had signed in successfully once, then closed the app completely and opened it again, how well did things match what you expected?**

- 3 Mostly what she expected. Signing in again was very intuitive and she can easily tell the difference between the diner and restaurant owner screens with the color difference and labels. However, she didn't like that she had to log in again after the accounts were linked (when she creates a diner account first and then the user account). It would be better if after linking the account, the app directly logs in with the credentials.

**Q3 - If you had a failed sign-in during this test (wrong password, typo, or an error message): how easy was it to understand what went wrong and get back to a successful sign-in on your own?**

- 4 Very easy. There was a clear error message and the forget password button sends an email to her user account that enables her to sign back in.

### Participant survey response record 2

**Participant Name**

- Scarlett Huang

**Q1 — How easy and fast was it to sign in and reach the screen where you browse menus (diner) or manage your restaurant (owner)?**

- 4 Very easy. Seamless experience in creating an account for both diner and restaurant owner, it's super quick and the registration screens cover all the necessary information for the users to get started.

**Q2 — After you had signed in successfully once, then closed the app completely and opened it again, how well did things match what you expected?**

- 4 Exactly what she expected. Signing in again was very intuitive and she can easily tell the difference between the diner and restaurant owner screens with the color difference and labels. Linking is also very smooth. When she used the wrong password in linking, the app prompted her to use the same password, and then after linking it brought her to the correct page without requiring her to sign in again.

**Q3 - If you had a failed sign-in during this test (wrong password, typo, or an error message): how easy was it to understand what went wrong and get back to a successful sign-in on your own?**

- 4 Very easy. There was a clear error message and the forget password button sends an email to her user account that enables her to sign back in, with a clear message indicating that she should open the link on the same device that the mobile app is on.

---

## Notes for facilitators

- Keep **Expo and Flask running** for the whole session; if menu or parse features are exercised after login, a missing backend shows up as failures unrelated to auth.
- Run tests on **real devices** and **real network** at least once; simulators alone can hide timing and persistence issues.
- **Password reset:** Confirm testers open the email link **on the device with the app**. If they only open it on a desktop, they may think reset is broken when the app never receives the deep link.
