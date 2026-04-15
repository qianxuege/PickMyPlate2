# LLM Workflow: Implement User Story

This document defines a **repeatable AI-assisted workflow** used by the team to implement user stories across the codebase.

This workflow is tool-agnostic and is applied consistently using Claude Code, Cursor, or Codex.

---

## Input Format

Each run requires:

- **User Story**
  (As a <user> I want <action> so that <benefit>)

- **User Story ID and title**
  (Paste exactly, for example `US4 — Dish Filtering by Preferences`. Used for PR title formatting and traceability.)

- **GitHub Issue number of the user story being implemented**
  (Paste exactly, for example `#12`. Used to load **Machine Acceptance Criteria** and **Human Acceptance Criteria** from that issue, to link the pull request to the issue, and to close the issue on merge.)

**Machine Acceptance Criteria** and **Human Acceptance Criteria** are **not** pasted in this workflow. They live in the related GitHub issue body. The AI must load the issue (see **Step 1**), extract those sections, and **display them back to the user** for confirmation before continuing.

If **User Story ID and title** or **GitHub Issue number** is missing, stop and ask the user for them before implementation.

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

- **Load the GitHub issue:** Using the **GitHub Issue number** from **Input Format** and this repository (resolve `owner/repo` from `git remote get-url origin` or use `gh repo view --json nameWithOwner` when available), fetch the issue. Prefer `gh issue view <N> --json title,body,url` (strip the `#` from the pasted number if present). If `gh` is unavailable, construct the issue URL from `origin` and read the description by an equivalent tool.
- **Extract acceptance criteria:** From the issue body, copy the **Machine Acceptance Criteria** and **Human Acceptance Criteria** sections verbatim (match the headings or labels used in the issue). If headings differ, infer the two blocks from the issue text, label what you extracted, and call out any uncertainty.
- **Present to the user:** Show the issue **URL**, the **User Story ID and title** from input, the pasted **User Story** text, then the extracted **Machine** and **Human** criteria in a clear layout. Ask the user to confirm the extraction is correct (or to correct it) before the rest of the workflow treats them as authoritative.
- Restate the goal clearly; align the pasted **User Story** with the issue when they should match.
- Identify requirements and constraints from the story and criteria.
- Identify edge cases and failure scenarios.

---

### Step 2: Define Acceptance Criteria (AI as product manager)

- Start from the **Machine** and **Human** criteria **loaded from the GitHub issue in Step 1** (after user confirmation).
- Clean and structure them for implementation and review; do not invent new criteria without asking.
- Ensure completeness and clarity; resolve ambiguities where possible or ask the human.

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
5. **Pull request:** Open a PR into `main` that is explicitly tied to the GitHub issue from **Input Format** (same user story).
   - **CLI:** `gh pr create --base main --head <branch-name> --title "…" --body "…"`
   - **Web:** use GitHub’s “Compare & pull request” after the push; set the same title and body content as below.
   - **Title (required format):** `Completed User Story <n>: <title>`
     - `<n>` is the numeric story id from **User Story ID and title** (for example `US4 — …` → `4`).
     - `<title>` is the human-readable title from that same line (for example `US4 — Dish Filtering by Preferences` → `Dish Filtering by Preferences`).
     - Full example: `Completed User Story 4: Dish Filtering by Preferences`
   - **Body (AI):** Write a specific body—do not ship placeholder text. Include:
     - A line that **links and closes** the issue using a [GitHub closing keyword](https://docs.github.com/en/issues/tracking-your-work-with-issues/linking-a-pull-request-to-an-issue) and the **GitHub Issue number** from input (for example `Closes #12` or `Fixes #12`). Use the exact issue number the user provided so the PR is related to the correct issue and closes it when the PR merges.
     - Brief context, substantive change bullets, mapping to the **Machine** / **Human** criteria from the GitHub issue (as confirmed in Step 1–2), and any test or manual-check notes from Step 7.
     - Optionally repeat the **User Story ID and title** for reviewers.
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
- Keeping **Machine** / **Human** acceptance criteria accurate in the GitHub issue and confirming AI extraction in Step 1
- Product and UX decision-making
- Reviewing AI-generated code
- Testing functionality manually
- Fixing incorrect or incomplete AI output
- Approving each workflow step before progression
- Managing secrets and environment configuration
- Approving and merging pull requests
- **Step 8 (push + PR):** The human approves each step under **Execution Mode**. Approving progression **into Step 8 after Step 7** is the explicit permission for the AI to run `git push` and create the pull request as written in Step 8—there is no separate “delegation” path beyond that approval. The human still reviews what was pushed and approves the merge on GitHub.

---

## Notes

- AI assists with development but does not replace engineering judgment
- All outputs must be reviewed before merging
- This workflow is applied consistently across all user stories
