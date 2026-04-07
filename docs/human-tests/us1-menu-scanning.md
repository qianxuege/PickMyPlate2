# Human Acceptance Test — User Story 1: Menu Scanning (Customer)

**User Story**
> As a diner at a restaurant, I want to scan a physical menu using my phone so that I can quickly view a structured digital version of the menu with clear items, descriptions, and prices to help me decide what to order more confidently.

**Original user story issue:** [#9](https://github.com/qianxuege/PickMyPlate2/issues/9)
**Acceptance test issue:** [#42](https://github.com/qianxuege/PickMyPlate2/issues/42)
**Owner:** Yao Lu

---

## Story Scope Being Tested

This test covers the diner menu-scanning flow implemented in the app:

- Accessing the scan interface from the Diner Home screen in one tap
- Capturing a menu photo via the device camera or selecting one from the photo library
- Watching the processing screen while OCR and LLM parsing run
- Receiving a structured digital menu with section headers, dish names, descriptions, and prices
- Navigating the resulting menu and opening individual dish pages
- Observing error or retry behavior when the input image is unusable

---

## Prerequisites — System Setup

The **facilitator** must complete all of the following before handing the device to the tester.

### 1. Dependencies

- Node.js (LTS) and npm installed on the host machine
- Expo Go installed on a physical iOS or Android device **or** an iOS Simulator / Android Emulator ready
- Device and development machine on the **same Wi-Fi network** (required for physical device)

### 2. Backend (Flask menu OCR / LLM service)

Open a terminal and run:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env             # fill in your OCR / LLM API key
python app.py                    # starts on port 8080 by default
```

Verify the service is live:

```bash
curl http://127.0.0.1:8080/healthz   # or the equivalent health endpoint
```

On a **physical device**, replace `127.0.0.1` with your computer's LAN IP (e.g. `192.168.1.10`) in both the verify step and `.env` below.

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

- Log in with an existing **diner** account, or register a new one via the app.
- Confirm the active role shows the **orange Diner badge** in the header. If the user has both roles, tap the segmented toggle and select Diner.

### 6. Physical menu prop

Print or obtain at least one single-page restaurant menu with:

- At least 3 named sections (e.g., Appetizers, Mains, Desserts)
- At least 10 dishes with names, brief descriptions, and prices
- Standard black-on-white print (a menu printed from any restaurant website is fine)

Place the menu flat on a table under normal indoor lighting before handing the device to the tester.

---

## Test Environment Notes

- Recommended: physical phone running Expo Go
- Starting screen: **Diner Home** (after login, with diner role active)
- Facilitator should observe silently and only intervene if the tester is completely stuck after 30 seconds
- Have a stopwatch or phone timer ready to record processing time and time-to-first-scroll

---

## Step-by-Step Tester Instructions

> Read the task prompt below to the tester exactly as written. Do not point at buttons or name UI elements before they attempt the task.

---

**Task prompt to read aloud:**

*"You've just sat down at a restaurant and you have the paper menu in front of you. Use the app to turn that menu into something you can read on your phone."*

---

### Task 1 — Open the scan interface

1. Starting from the Diner Home screen, find the control that lets you scan or photograph a menu.
2. Tap it.

**Facilitator notes:** Record whether the tester found the scan entry point without prompting. If they tapped an incorrect element first, note what it was.

**Expected outcome:** The camera or image-picker interface opens within 1 tap from the Home screen.

---

### Task 2 — Capture and submit the menu

3. Take a photo of the physical menu (or, if the tester prefers, choose an image from the photo library).
4. Allow any camera or photo-library permission prompts that appear.
5. Watch the processing screen and note anything that appears on screen while waiting.

**Facilitator notes:** Start the timer when the tester submits the image. Stop when the digital menu is visible and scrollable.

**Expected outcome:** The app transitions to a digital menu view. Processing completes in ≤ 10 seconds. Status messages (e.g., "Reading menu…", "Extracting items…") are visible during the wait.

---

### Task 3 — Review the digital menu

6. Scroll through the digital menu that was generated.
7. Compare it to the physical menu.
8. Point out any items, prices, or sections that appear missing or incorrect.

**Facilitator notes:** Record the number of obvious errors the tester notices (e.g., wrong price, missing section header, garbled dish name).

**Expected outcome:** Section headers, dish names, descriptions, and prices are present and legible. The majority of items visibly match the physical menu.

---

### Task 4 — Navigate to a dish detail

9. Tap any dish in the digital menu that looks interesting.
10. Read the dish detail page.
11. Navigate back to the digital menu.

**Facilitator notes:** Note whether the tester navigated back without hesitation.

**Expected outcome:** Dish detail page opens and shows name, description, price, and any preference tags. The back navigation is discoverable and works correctly.

---

### Task 5 — Edge case: unusable image (facilitator-controlled, optional)

12. Ask the tester to go back to the Home screen and attempt another scan using a very blurry photo or a blank image from the library.
13. Observe how the app responds.

**Expected outcome:** The app surfaces a clear error message or retry option. It does not crash, show a blank screen, or silently display an empty menu.

---

## Satisfaction Metrics

### Metric 1 — Unaided task-completion rate (Lean Startup: Activation)

**Definition:** Percentage of testers who independently reach the structured digital menu — without facilitator prompting — within 10 seconds of first tapping the scan entry point.

**Why this metric:** Per *The Lean Startup*, activation measures whether users reach the "aha moment." For menu scanning, that moment is the first time a usable digital menu appears on screen. If testers require step-by-step coaching to get there, the UX is not self-evident enough to sustain real-world adoption. A target of ≥ 80% without prompting is the minimum bar.

**Target:** ≥ 80% of testers complete unaided.

---

### Metric 2 — Perceived accuracy trust (Mom Test: revealed preference over stated preference)

**Definition:** After comparing the digital output to the physical menu, the percentage of testers who say — unprompted — that they would trust the app's version when placing an order.

**Why this metric:** *The Mom Test* warns against asking "would you use this?" because people are polite. Instead, we observe a concrete judgment: "would you actually order from what the app shows you?" Accuracy trust is the core value proposition of scanning. A user who doubts the output will default to the paper menu, making the feature worthless for retention.

**Target:** ≥ 70% of testers express trust in the accuracy unprompted.

---

### Metric 3 — Time-to-first-scroll (Lean Startup: Engagement)

**Definition:** Seconds elapsed from when the digital menu first appears on screen to when the tester begins scrolling or tapping a dish — measured by the facilitator.

**Why this metric:** Immediate engagement (≤ 8 seconds) indicates the menu layout is readable and pulls the user in naturally. Hesitation before first interaction is a leading indicator of low retention — a user who doesn't engage naturally in a restaurant setting will not return to the feature. This captures actual behavior, not stated preference, which avoids the Mom Test failure mode of asking "Was it easy?"

**Target:** Median time-to-first-scroll ≤ 8 seconds.

---

## Survey Questions

> Administer immediately after Tasks 1–4. Read each question exactly as written. Do not explain or qualify.

---

**Q1.** After looking at both the paper menu and what the app showed you, how much would you rely on the app version the next time you're at a restaurant?

*(1 = I'd ignore it and stick with the paper menu · 5 = I'd use only the app)*

> **Why this question:** Avoids asking "was it accurate?" — a leading question that invites polite responses. Instead it captures a behavioral-intent proxy — reliance — grounded in a concrete next action. Borrowing NPS framing but anchoring it to real use rather than abstract recommendation.

---

**Q2.** Walk me through what was going through your mind from the moment you pressed the scan button until you saw the menu on screen. What felt natural, and what — if anything — felt off?

> **Why this question:** Open-ended retrospective. Per *The Mom Test*, asking people to narrate their experience rather than evaluate it produces less socially desirable answers and surfaces unexpected pain points (e.g., "I wasn't sure if it was loading or broken") that closed questions will never surface.

---

**Q3.** If this feature were gone tomorrow and you had to go back to reading paper menus, what — if anything — would you miss?

> **Why this question:** The "what would you miss?" framing forces the tester to articulate concrete value — or reveal there is none — without the facilitator suggesting what value should exist. Testers who say "nothing" reveal the feature is not differentiated. Testers who name something specific reveal genuine willingness-to-pay signal, which is the honest test *The Mom Test* pushes for.

---

## Pass Thresholds

| Criterion | Pass |
|---|---|
| Unaided task-completion rate | ≥ 80% of testers reach digital menu without prompting |
| Perceived accuracy trust | ≥ 70% of testers say they would rely on the app when ordering |
| Q1 Likert median | ≥ 4 out of 5 |
| Time-to-first-scroll median | ≤ 8 seconds after digital menu appears |

---

## Tester Log

> Fill in one block per classmate session. Record verbatim responses for Q2 and Q3.

---

### Session 1

| Field | Response |
|---|---|
| Tester name | Eric Du |
| Tester's team | Different team (17-766) |
| Date | 2026-04-07 |
| Device | Physical phone via Expo Go |
| Task 1 — scan entry found unaided? | Yes |
| Task 2 — processing time (seconds) | Noticeably long (tester flagged as a friction point) |
| Task 3 — errors noticed in digital menu | None recorded |
| Task 4 — navigated back without help? | Yes |
| Task 5 — error handling appropriate? | Not tested |
| Time-to-first-scroll (seconds) | Not recorded |
| Would rely on app (Q1, 1–5) | 3.5 |
| Q2 verbatim response | See below |
| Q3 verbatim response | See below |
| Overall: Pass / Fail | Conditional Pass — core flow works; processing time UX needs improvement |
| Follow-up actions | Replace the simulated progress bar with a more honest progress indicator or an explicit "this may take 10–20 seconds" message to reduce uncertainty during the wait |

**Q1 response (refined from tester's own words):**
Score: 3.5 / 5. The scanning feature and the resulting digital menu look polished and useful, but the menu processing time feels noticeably long. During that wait he would likely fall back to the physical menu rather than holding the phone and watching the screen — which defeats the purpose of the feature in a real restaurant setting.

**Note on Q1 — processing time constraint:**
The long processing time flagged in Q1 is currently a hard constraint of the underlying large language model pipeline. LLM inference latency is not trivially reducible at the application level; meaningful improvements would require either a faster model, streaming token output piped to the UI, or background processing with a push notification when the menu is ready. The recommended near-term mitigation therefore remains a UX fix — replacing the simulated progress bar with an honest wait-time message — rather than a performance optimization, which is out of scope for the current sprint.

**Q2 response (refined from tester's own words):**
The frontend animations throughout the app feel polished and natural — the scan workflow, page transitions, and every individual screen all behave smoothly. The one exception is the progress bar on the processing screen: it appears to be a simulated animation rather than a real reflection of backend progress. This created a moment of genuine doubt about whether the menu was actually being processed or whether something had stalled silently.

**Q3 response (refined from tester's own words):**
He would miss the AI-generated dish image feature most. When visiting an unfamiliar restaurant with no prior knowledge of what dishes look like, being able to see a visual preview — even if AI-generated rather than a real photo — makes a meaningful difference to the ordering decision. He considers it one of the more valuable parts of the overall app experience.
