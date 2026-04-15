# Copy-paste prompt (edit the placeholders, then paste into the AI)

Follow:

- `ai-workflows/IMPLEMENT_USER_STORY.md`
- `ai-workflows/RULES.md`

You MUST:

- Execute step-by-step; STOP after each step; ask for approval before continuing
- Not skip steps
- Not generate or modify code until Step 4 is approved
- Not apply changes automatically — only propose them

## Human-in-the-loop

We are running in **Human-in-the-Loop mode**:

After each step: output clearly, then ask: _Approve to continue or provide revisions._  
Continue only if I say **Approve**.

## Input (paste below)

User Story ID and title (paste exactly):

```
<PASTE e.g. US4 — Dish Filtering by Preferences>
```

GitHub Issue number of the user story being implemented (paste exactly):

```
<PASTE e.g. #12>
```

User Story (As a … I want … so that …):

```
<PASTE>
```

**Do not paste Machine Acceptance Criteria or Human Acceptance Criteria here.** Load them from the GitHub issue above using this repo’s `origin` / `gh`, extract the sections from the issue body, **display them to me in Step 1**, and wait for my confirmation before proceeding.

## Start

Begin **Step 1: Understand the User Story** (including loading the GitHub issue and showing the extracted acceptance criteria). Do not proceed past Step 1 until approved.
