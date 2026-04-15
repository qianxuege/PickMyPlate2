# LLM Workflow: Implement User Story

This document defines a **repeatable AI-assisted workflow** used by the team to implement user stories across the codebase.

This workflow is tool-agnostic and is applied consistently using Claude Code, Cursor, or Codex.

---

## Input Format

Each run requires:

- **User Story**
  (As a <user> I want <action> so that <benefit>)

- **Machine Acceptance Criteria**
  (Functional, testable conditions)

- **Human Acceptance Criteria**
  (UX, usability, and subjective quality expectations)

---

## Branch safety (before code or repo changes)

Before editing files, installing dependencies, or running project commands (build, test, lint, dev server):

1. Determine the current Git branch (for example `git branch --show-current`).
2. If the branch is **`main`**, do **not** proceed with implementation. Notify the user that work must happen on a feature branch, and ask them to run something like `git checkout -b feature/<short-description>` (or switch to an existing branch), then resume the workflow.
3. Do not treat `main` as the branch for day-to-day AI-driven edits; changes should land via pull request after review.

This check applies from the start of the session and again before **Step 4** if the branch could have changed.

---

## Workflow Steps

### Step 1: Understand the User Story (AI)

- Restate the goal clearly
- Identify requirements and constraints
- Identify edge cases and failure scenarios

---

### Step 2: Define Acceptance Criteria (AI as product manager)

- Clean and structure provided criteria
- Ensure completeness and clarity
- Resolve ambiguities where possible

---

### Step 3: Design (AI as UI/UX designer)

- Define UI structure and layout
  - clean and modern UX consistent with the rest of the app's screens
- Identify components needed
- Plan state management and data flow
- Follow similar color scheme as defined in constants folder
- Ensure mobile-first UX (for React Native)

---

### Step 4: Implementation (AI as builder)

- Confirm the current branch is **not** `main` (see **Branch safety**). If on `main`, stop and ask the user to switch branches before proposing or applying any code.
- Propose code changes (DO NOT directly apply changes)
- Show:
  - files to modify
  - exact code diffs or snippets
- Wait for human approval before applying changes

---

### Step 5: Review (AI as Reviewer Agent)

The AI switches role to "Reviewer":

- Evaluate implementation against:
  - acceptance criteria
  - edge cases
  - UX quality
  - `RULES.md`

- Identify:
  - bugs
  - missing logic
  - unclear or fragile code

---

### Step 6: Revise (AI)

- Fix all issues identified in review
- Ensure compliance with `RULES.md`
- Improve clarity and maintainability
- Avoid introducing regressions

---

### Step 7: Final Validation (Human)

- Manually test feature
- Validate UX and behavior
- Confirm acceptance criteria are satisfied

---

### Step 8: Push and open pull request (after user approves final work)

When the user approves the completed implementation following Step 7:

1. **Branch:** Confirm again you are **not** on `main`. If you are, stop; create or check out a feature branch, move commits if needed, then continue.
2. **Review:** `git status` and `git diff` (or equivalent) so the user sees what will be published.
3. **Commit:** If there are uncommitted changes, `git add` and `git commit` with a clear message.
4. **Push:** `git push -u origin <branch-name>` (first push) or `git push` (branch already tracking).
5. **Pull request:** Open a PR into `main`:
   - **CLI:** `gh pr create --base main --head <branch-name> --title "…" --body "…"`
   - **Web:** use GitHub’s “Compare & pull request” after the push.
6. **Merge:** Do not merge without the user’s explicit approval on GitHub.

---

## Loop

- Repeat **Step 5–6 up to 2 times**
- Stop when implementation is stable and complete
- The AI MUST:
  - perform at least 1 review pass
  - perform up to 2 revision iterations if issues are found

---

## Execution Mode (Human-in-the-Loop)

The AI MUST execute this workflow step-by-step and STOP after each step.

After each step, the AI must:

1. Present output clearly
2. Ask for approval:
   - "Approve" → proceed to next step
   - "Revise: <feedback>" → update current step

The AI MUST NOT continue automatically without approval.

---

### Step Execution Rules

- Step 1 → STOP and wait for approval
- Step 2 → STOP and wait for approval
- Step 3 → STOP and wait for approval
- Step 4 → STOP and wait for approval BEFORE writing code to files
- Step 5–6 → may iterate automatically up to 2 times
- Step 7 → human validation; continue to Step 8 only after the user approves the final implementation
- Step 8 → push and open PR; STOP if on `main` or if the user has not approved publishing

---

## Assumptions

If required information is missing:

- The AI must:
  - explicitly state assumptions
  - OR ask for clarification before proceeding

The AI must NOT guess or fabricate missing details.

---

## Human Responsibilities

The following are **not automated** and remain human responsibilities:

- Writing and refining user stories
- Defining acceptance criteria
- Product and UX decision-making
- Reviewing AI-generated code
- Testing functionality manually
- Fixing incorrect or incomplete AI output
- Approving each workflow step before progression
- Managing secrets and environment configuration
- Approving and merging pull requests
- Running `git push` and creating the pull request (Step 8), unless they delegate that to the AI with explicit approval

---

## Notes

- AI assists with development but does not replace engineering judgment
- All outputs must be reviewed before merging
- This workflow is applied consistently across all user stories
