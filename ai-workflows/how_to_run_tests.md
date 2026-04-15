# How to Generate Unit Tests for a User Story

Paste and fill in the following prompt into Claude Code, Cursor, or Codex.

---

Follow the workflow defined in:

`ai-workflows/GENERATE_USER_STORY_TESTS.md`

You MUST follow these rules strictly:

- Execute step-by-step
- STOP after each step and ask for approval before continuing
- Do NOT skip steps
- Do NOT write any test code until Step 2 is approved
- Do NOT create a PR until all tests pass

---

## Execution Mode

We are running in **Human-in-the-Loop mode**.

After each step:

- Output results clearly
- Then ask: "Approve to continue or provide revisions."

Only continue if I say **Approve**.

---

## Input

User Story ID and title:
<PASTE e.g. "US4 — Dish Filtering by Preferences">

GitHub Issue number of the user story being tested:
<PASTE e.g. #12>

Machine Acceptance Criteria:
<PASTE>

Lib file(s) to test:
<PASTE e.g. lib/diner-preferences.ts>

---

## Start

Begin with **Step 0: Branch and Issue Setup**.

Do NOT proceed past Step 0 until approved.

---

## After You Are Done

Export or copy this entire chat session and save it as evidence for submission.
