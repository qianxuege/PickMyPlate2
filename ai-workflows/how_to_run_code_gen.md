# Copy-paste prompt (paste into the AI)

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

## Input (single paste)

GitHub user story issue URL (full link to the issue for this repo):

```
<PASTE e.g. https://github.com/ORG/REPO/issues/12>
```

From this URL only: parse `owner/repo` and issue number, fetch the issue, then detect **User Story ID and title**, the **User Story** (As a … I want … so that …), **Machine Acceptance Criteria**, and **Human Acceptance Criteria** per `IMPLEMENT_USER_STORY.md`. **Show all extracted fields to me in Step 1** and wait for my confirmation. When opening the PR (**Step 8**), link and close **this same issue** (`Closes #N` / `Fixes #N` for that `N`).

## Start

Begin **Step 1: Understand the User Story**. Do not proceed past Step 1 until approved.
