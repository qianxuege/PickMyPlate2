# User Story 2 Human Acceptance Test

## User Story

As a restaurant diner, I want to select a dish and view details like its flavor profile, ingredients, and spice level so that I can better understand what it will taste like before ordering.

## Story Scope Being Tested

This test covers the diner dish detail flow implemented in the app:

- Opening a dedicated dish detail page from the diner menu
- Viewing flavor tags
- Viewing key ingredients
- Viewing dietary indicators when available
- Seeing a clear fallback when information is missing
- Reading the dish summary
- Navigating back to the full menu

## Preconditions

Before the tester begins, set up the app in the following state:

1. The app is installed and runs locally with `npm install` and `npm start`.
2. Supabase environment variables are configured and the backend needed for menu parsing is available if the test will begin from a fresh menu scan.
3. The tester can sign in as a diner.
4. There is at least one accessible diner menu scan in the app.
5. That menu should include:
   - one dish with flavor tags, ingredients, and dietary indicators populated
   - one dish with partial or missing ingredient or dietary data so the placeholder state can be verified
6. The tester should use normal Wi-Fi or campus network conditions.
7. The moderator should have a stopwatch or phone timer available for timing page load and task completion.

## Test Environment Notes

- Recommended device: phone running Expo Go or simulator with the current development build
- Starting screen: an existing diner menu scan opened in the diner flow
- No coaching during the task unless the tester is completely blocked

## Human Test Instructions

Give the tester only the task below and avoid explaining where controls are located unless they get stuck.

### Task Prompt for the Tester

"You are deciding whether to order a dish from this restaurant. Use the app to inspect one dish and decide whether the page gives you enough information to understand what the dish will probably taste like."

### Steps

1. Launch the app and sign in as a diner if needed.
2. Open an existing menu scan from the diner flow.
3. Wait for the full menu page to load.
4. Choose any dish from the menu that looks interesting and tap it.
5. Confirm that a dedicated dish detail page opens.
6. Read the dish detail page and look for:
   - flavor tags
   - spice level
   - key ingredients
   - dietary indicators
   - summary text that helps explain the dish
7. Say out loud what you think the dish will taste like and whether you would consider ordering it.
8. If any ingredient or dietary information is missing, note whether the page clearly says that the information is unavailable.
9. Navigate back to the menu.
10. Repeat steps 4-9 with a second dish that has less complete information, if available.

## Expected Outcomes

The story is considered behaviorally successful during testing if the tester can do the following without moderator assistance:

- open a dish detail page from the menu
- identify likely flavor cues from the page
- identify key ingredients or clearly see that they are unavailable
- identify dietary indicators or clearly see that they are unavailable
- return to the full menu easily

## Satisfaction Metrics

These are the three most important human-verifiable metrics for this story.

### 1. Dish understanding confidence

**Metric:** Percentage of testers who rate their confidence at 4 or 5 on a 5-point scale after viewing the page when asked whether they could predict what the dish would taste like.

**Why this metric:** The core risk behind this story is expectation uncertainty. If users still cannot picture the dish after reading the page, the feature failed even if all fields technically render. This is an actionable outcome metric in the Lean Startup sense because it directly measures whether the feature reduces customer uncertainty rather than whether they merely used it. It also maps cleanly to the human acceptance criterion that at least 80% of users feel confident understanding the dish.

### 2. Self-serve task completion rate

**Metric:** Percentage of testers who can go from menu page to dish page, identify the needed information, and return to the full menu without any moderator help.

**Why this metric:** A user who would pay for the app needs low-friction decision support, not a guided demo. This metric captures usability and navigability together. It is more reliable than asking "Was this easy?" because it focuses on observed behavior, which aligns with The Mom Test principle of valuing what users actually do over what they say they might do.

### 3. Information sufficiency gap rate

**Metric:** Percentage of testers who report that they still needed additional information before deciding whether they would order the dish.

**Why this metric:** This metric exposes whether the detail page contains the minimum decision-making information needed to influence a real order. It is useful because it identifies remaining product gaps in concrete terms such as "needed portion size," "needed allergy detail," or "summary was too vague." That makes it more actionable than a generic satisfaction score and better aligned with lecture guidance on actionable, diagnostic product metrics.

## Survey Questions

Ask the tester these three questions immediately after they complete the task. These are intentionally phrased to uncover actual decision quality and friction instead of inviting polite praise.

1. After looking at that dish page, what do you expect the dish to taste like, and what on the page led you to that conclusion?
2. If you were actually ordering right now, what information, if any, would you still want before deciding on this dish?
3. How smooth was it to move from the menu to dish details and back to the menu? Rate it from 1 to 5 and explain the moment that most affected your score.

## How to Score the Survey

- Question 1 supports the dish understanding confidence metric.
- Question 2 supports the information sufficiency gap rate.
- Question 3 supports the self-serve task completion and navigation quality assessment.

## Pass Threshold for This Story

Recommend marking this story as passing human acceptance when all of the following are true:

- at least 80% of testers report confidence of 4 or 5 that they understand what the dish will taste like
- at least 80% of testers complete the flow without moderator help
- most testers do not report a major missing-information gap that would block an ordering decision

## Test Log Template

Use the template below for each classmate trial.

```md
### Tester
- Name: Scarlett
- Team: Gradient
- Date: 4/7
- Device: Mac + iPhone 16 pro max

### Observations
- Could open dish page without help: Yes
- Could find flavor tags: Yes
- Could find ingredients or placeholder: Yes
- Could find dietary indicators or placeholder: Yes
- Could return to full menu easily: Yes
- Dish page load time: 1sec

### Survey Responses
1. After looking at that dish page, what do you expect the dish to taste like, and what on the page led you to that conclusion?
 - for chicken hamburger, i expect this would taste crispy and just as a normal burger, i was informed by the key ingredient anf the spice tags (which is not spicy)
2. If you were actually ordering right now, what information, if any, would you still want before deciding on this dish?
- dietary restrictions such as contain nuts/seafood
3. How smooth was it to move from the menu to dish details and back to the menu? Rate it from 1 to 5 and explain the moment that most affected your score.
- very smooth 4/5 with 1 or seconds lagging which is fine

### Outcome
- Passed
- Follow-up changes needed: N/A
```
