# Human Acceptance Test — User Story 6: Restaurant Menu Upload

**User Story**
> As a restaurant owner, I want to upload my menu to the platform so that customers can access a digital version of my menu without requiring printed updates.

**Original user story issue:** [#4](https://github.com/qianxuege/PickMyPlate2/issues/4)
**Acceptance test issue:** [#43](https://github.com/qianxuege/PickMyPlate2/issues/43)
**Owner:** Yao Lu

---

## Story Scope Being Tested

This test covers the restaurant owner menu-upload flow implemented in the app:

- Accessing the upload interface from the Restaurant Home screen
- Photographing or selecting a menu image from the photo library
- Watching the processing screen while OCR and LLM parsing run
- Reviewing the extracted menu structure (sections, dish names, prices, descriptions)
- Editing any incorrectly extracted items before publishing
- Publishing the menu so it is live for customers
- Verifying the published menu from the Restaurant Menu tab
- (Optional) Generating a QR code for customer access

---

## Prerequisites — System Setup

The **facilitator** must complete all of the following before handing the device to the tester.

### 1. Dependencies

- Node.js (LTS) and npm installed on the host machine
- Expo Go installed on a physical iOS or Android device **or** an iOS Simulator / Android Emulator ready
- Device and development machine on the **same Wi-Fi network** (required for physical device)

### 2. Backend (Flask OCR / LLM service)

Open a terminal and run:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env             # fill in your OCR / LLM API key
python app.py                    # starts on port 8080 by default
```

On a **physical device**, replace `127.0.0.1` with your computer's LAN IP (e.g. `192.168.1.10`) in the `.env` below.

### 3. Frontend environment file

Create or confirm `.env` in the project root contains:

```
EXPO_PUBLIC_SUPABASE_URL=<your-supabase-url>
EXPO_PUBLIC_SUPABASE_KEY=<your-supabase-anon-key>
EXPO_PUBLIC_MENU_API_URL=http://<LAN-IP or 127.0.0.1>:8080
```

Restart Metro (`npm start`) after any `.env` change.

### 4. Start the app

```bash
npm install
npm start
```

- **Physical device:** scan the QR code with Expo Go.
- **iOS Simulator:** press `i` in the terminal.
- **Android Emulator:** press `a` in the terminal.

### 5. Test account

- Log in with an existing **restaurant owner** account, or register one via the app (Restaurant registration → step 1 email/password → step 2 cuisine type).
- Confirm the active role shows the **green Restaurant badge** in the header. If the user has both roles, tap the segmented toggle and select Restaurant.

### 6. Physical menu prop

Prepare at least one single-page restaurant menu with:

- At least 3 named sections (e.g., Appetizers, Mains, Desserts)
- At least 10 dishes with names, brief descriptions, and prices
- Standard black-on-white print under normal indoor lighting

Place the menu flat on a table before handing the device to the tester.

---

## Test Environment Notes

- Recommended: physical phone running Expo Go
- Starting screen: **Restaurant Home** (after login, with restaurant role active — green badge)
- Facilitator should observe silently and only intervene if the tester is completely stuck after 30 seconds
- Have a stopwatch or phone timer ready; the human acceptance criterion is the full flow completing in ≤ 5 minutes

---

## Step-by-Step Tester Instructions

> Read the task prompt below to the tester exactly as written. Do not point at buttons or name UI elements before they attempt the task.

---

**Task prompt to read aloud:**

*"You're a restaurant owner and this is your menu. Your restaurant just went digital and you want customers to be able to see your menu on their phones. Use the app to make that happen."*

---

### Task 1 — Upload a menu image

1. Starting from the Restaurant Home screen, find the control that lets you upload or photograph a menu.
2. Take a photo of the physical menu or select an image from the photo library.
3. Allow any camera or photo-library permission prompts that appear.
4. Watch the processing screen and note anything displayed while the system works.

**Facilitator notes:** Start the timer when the tester submits the image. Record whether the upload entry point was found without prompting.

**Expected outcome:** The app transitions to a review screen showing extracted sections and dishes. Status messages (e.g., "Reading menu…", "Extracting items…") are visible during processing.

---

### Task 2 — Review extracted menu items

5. Scroll through the list of extracted dishes on the review screen.
6. Compare the extracted items to the physical menu.
7. Point out any dish name, price, or description that looks wrong or missing.
8. If you find an error, try to correct it using whatever editing control the app provides.

**Facilitator notes:** Count the number of items the tester identifies as incorrect. Note whether the tester successfully edits at least one item without help.

**Expected outcome:** The tester can scroll all extracted items, identify errors, and use the edit controls without confusion.

---

### Task 3 — Publish the menu

9. Once satisfied with the extracted items, find the action to make this menu live for customers.
10. Complete the publish step.

**Facilitator notes:** Note whether the publish action was found unaided and whether the confirmation state is clearly communicated.

**Expected outcome:** The app confirms the menu is published. A success state is visible on screen.

---

### Task 4 — Verify from the Menu tab

11. Navigate to the Menu tab (bottom navigation).
12. Confirm the newly uploaded menu is listed.
13. Confirm it is marked as the published / live menu.
14. *Optional:* Tap the QR code button and confirm a QR code appears that could be shared with customers.

**Facilitator notes:** Stop the timer when the tester confirms the menu is live. Record the total elapsed time.

**Expected outcome:** The published menu is listed in the Menu tab, clearly identified as the active menu. QR code generates successfully if attempted.

---

### Task 5 — Edge case: incorrect extraction (facilitator-controlled, optional)

15. Ask the tester to imagine two items were extracted incorrectly. Ask them to navigate back to the review screen (if available) and make one more edit.
16. Observe whether the edit flow is discoverable from the Menu tab.

**Expected outcome:** The tester can navigate to edit an existing menu without needing to re-upload the image from scratch.

---

## Satisfaction Metrics

### Metric 1 — End-to-end completion time (Lean Startup: Activation)

**Definition:** Wall-clock time from when the tester taps the upload entry point to when the published menu is confirmed live on screen. The human acceptance criterion is ≤ 5 minutes.

**Why this metric:** The core promise of US6 is replacing the effort of printing and distributing updated menus. If the digital upload takes longer than printing a new page, the feature has no adoption case — restaurant owners will not switch. Measuring actual elapsed time rather than asking "was it fast?" avoids the *Mom Test* trap of polite, socially desirable answers. This is a direct Lean Startup *activation* metric: did the owner reach the live-menu state within the acceptable time budget?

**Target:** All testers complete in ≤ 5 minutes.

---

### Metric 2 — Item correction burden (Mom Test: revealed confidence)

**Definition:** The number of extracted items the tester must correct before they say they would be comfortable publishing. Tester is asked: "How many more corrections would you want to make before publishing this to real customers?"

**Why this metric:** OCR accuracy is the primary trust blocker for restaurant owners. A high correction burden signals the feature creates more work than it saves. Per *The Mom Test*, rather than asking "do you trust it?" (which invites polite yes), we count the number of corrections the owner actually makes or identifies — behavior, not opinion. Target is ≤ 2 corrections for a standard single-page menu.

**Target:** ≤ 2 corrections needed for ≥ 70% of testers.

---

### Metric 3 — Unaided publish completion rate (Lean Startup: Activation)

**Definition:** Percentage of testers who complete the full flow — upload → review → publish — without any facilitator prompting.

**Why this metric:** Restaurant owners will not have a facilitator on their first real use. If the publish step is not self-evident, the feature fails in production regardless of OCR quality. This metric captures the UX sufficiency of the owner-facing flow. Per *The Lean Startup*, activation only counts if the user reaches the value state on their own; coaching during a demo is not activation.

**Target:** ≥ 80% of testers complete unaided.

---

## Survey Questions

> Administer immediately after Task 4. Read each question exactly as written — do not explain or qualify.

---

**Q1.** Compared to updating a printed menu, how much effort did that feel like?

*(1 = much more work than just printing a new menu · 5 = much less work than printing)*

> **Why this question:** The value proposition of US6 is explicitly about replacing printed updates. This forces a direct comparison to the alternative the owner already uses — grounding the response in the real competitive context. A score of 4 or 5 means the digital path is genuinely easier; anything lower reveals the feature has not yet cleared the switching cost bar.

---

**Q2.** Walk me through any moment during the upload where you felt uncertain about what was going to happen next.

> **Why this question:** Open-ended retrospective per *The Mom Test* — it asks the tester to narrate their experience rather than evaluate it. This surfaces friction moments (e.g., "the processing screen went quiet and I thought it crashed," or "I didn't know what Publish actually did") that a closed question about satisfaction would never capture. Socially desirable answers like "it was fine" are much harder to give when asked to narrate.

---

**Q3.** If a customer showed up tonight and you had to get your menu onto this platform before they arrived, would you use this? What would stop you?

> **Why this question:** The "what would stop you?" framing is a *Mom Test* technique that forces the tester to name real blockers rather than give polite hypothetical agreement. A tester who genuinely cannot name a blocker is a strong positive signal. A tester who names something specific — accuracy, time, the editing step — gives you a prioritized list for the next sprint. This question also anchors the scenario in a concrete, time-pressured situation that mirrors real owner use rather than a relaxed demo.

---

## Pass Thresholds

| Criterion | Pass |
|---|---|
| End-to-end completion time | ≤ 5 minutes for all testers |
| Item correction burden | ≤ 2 corrections for ≥ 70% of testers |
| Unaided publish completion rate | ≥ 80% of testers complete without prompting |
| Q1 Likert median | ≥ 4 out of 5 |

---

## Tester Log

> Fill in one block per classmate session. Record Q2 and Q3 verbatim.

---

### Session 1

| Field | Response |
|---|---|
| Tester name | Eric Du |
| Tester's team | Different team (17-766) |
| Date | 2026-04-07 |
| Device | Physical phone via Expo Go |
| Task 1 — upload entry found unaided? | Yes |
| Total end-to-end time (upload → published) | Within threshold (no time concern raised) |
| Number of items requiring correction | None recorded |
| Task 3 — publish step completed unaided? | Yes |
| Task 4 — published menu confirmed in Menu tab? | Yes |
| Q1 score (1–5) | 4.5 |
| Q2 verbatim response | See below |
| Q3 verbatim response | See below |
| Overall: Pass / Fail | **Pass** — with one product gap identified for follow-up |
| Follow-up actions | Add support for extracting and importing images that are already embedded in the physical menu; in the interim, surface a clearer prompt during the review step so owners know image upload is optional but available |

**Q1 response (refined from tester's own words):**
Score: 4.5 / 5. The AI-powered features — automatically generating dish descriptions and images during the upload process — save a significant amount of manual work compared to building a digital menu from scratch. This alone makes the feature meaningfully faster than any alternative a restaurant owner would otherwise have.

**Q2 response (refined from tester's own words):**
No friction moments were noticed. Every part of the upload flow felt smooth and stable — the transitions, the processing feedback, and the review interface all behaved as expected without any confusion or hesitation.

**Q3 response (refined from tester's own words):**
Yes, he would use it — but one gap would give him pause: the app cannot recognize or extract images that are already embedded in the physical printed menu, so those images are simply not carried over to the digital version. A restaurant owner who has invested in professional food photography for their printed menu would need to re-upload each image manually during the review step. This friction is not a blocker but it is a noticeable inconvenience, particularly for owners with larger menus or existing photo assets.
