# How to Generate Unit Tests for a User Story

Paste and fill in the following prompt into Claude Code, Cursor, or Codex.

---

Follow the workflow defined in:

`ai-workflows/GENERATE_USER_STORY_TESTS.md`

You MUST follow these rules strictly:

- Execute step-by-step
- STOP after each step and ask for approval before continuing
- Do NOT skip steps
- Do NOT write any test code until Step 4 is approved
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

GitHub Issue URL of the user story to be tested:
<PASTE e.g. https://github.com/qianxuege/PickMyPlate2/issues/12>

---

## Start

Begin with **Step 1: Fetch and Understand the User Story**.

Do NOT proceed past Step 1 until approved.

---

## After You Are Done

Export or copy this entire chat session and save it as evidence for submission.
