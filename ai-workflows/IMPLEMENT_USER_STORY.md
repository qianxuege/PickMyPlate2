# LLM Workflow: Implement User Story

This document defines a **repeatable AI-assisted workflow** used by the team to implement user stories across the codebase.

This workflow is tool-agnostic and is applied consistently using Claude Code, Cursor, or Codex.

---

## Input Format

Each run requires a single field:

- **GitHub user story issue URL**  
  Paste a normal issue link, for example `https://github.com/OWNER/REPO/issues/12`.  
  Strip tracking query strings if present; ignore `#issuecomment-…` fragments for fetching (the issue number is in the path).

The AI derives everything else from that issue:

| Derived (for the rest of the workflow)      | Source                                                                               |
| ------------------------------------------- | ------------------------------------------------------------------------------------ |
| `owner`, `repo`, issue **number** `N`       | Parse the URL path: `github.com/<owner>/<repo>/issues/<N>`                           |
| **User Story ID and title**                 | Issue **title** and/or issue **body** (see **Issue parsing** below)                  |
| **User Story** (As a … I want … so that …)  | Issue **body** (section or paragraph; see **Issue parsing**)                         |
| **Machine** / **Human** acceptance criteria | Issue **body** (sections; see **Issue parsing**)                                     |
| PR link + close target                      | Same issue **`N`** in this `owner/repo` → `Closes #N` (or `Fixes #N`) in the PR body |

**Machine Acceptance Criteria** and **Human Acceptance Criteria** are not pasted separately; they are read from the issue like the story text.

If the URL is missing, invalid, not an `/issues/<n>` link, or the issue cannot be fetched, stop and ask the user to fix the link or grant access (`gh auth`, network, etc.).

### Issue parsing (AI)

After fetching the issue (`title`, `body`, canonical `html_url` or construct `https://github.com/<owner>/<repo>/issues/<N>`):

1. **Repository check:** Parse `owner/repo` from the pasted URL. Compare to this clone’s `origin` (normalize both from `https://github.com/o/r.git`, `git@github.com:o/r.git`, etc.). If they differ, **stop** and tell the user the issue is not for this repository unless they switch to the matching clone or paste an issue from the current repo.
2. **User Story ID and title:** Prefer the issue **title** when it already contains the id and readable title (for example `US4 — Dish Filtering by Preferences`, `US4: Dish Filtering`, `User Story 4 – …`). Otherwise, take the first line or heading in the body that clearly identifies the story id and title (for example a line starting with `US` + number). If ambiguous, show candidates and ask the user to confirm or correct **one** canonical line to use for PR titles.
3. **User Story (role format):** Find the paragraph or subsection that matches “As a … I want … so that …” (headings such as **User Story**, **Story**, **Description** help). If missing, say so and ask the user to point to the text or to update the issue.
4. **Machine / Human acceptance criteria:** From the body, copy **Machine Acceptance Criteria** and **Human Acceptance Criteria** verbatim when those headings (or obvious equivalents) exist. If headings differ, infer two blocks, label them, and flag uncertainty.

### Step 1 presentation

In **Step 1**, the AI must **display** the canonical issue URL, parsed **`#N`**, extracted **User Story ID and title**, **User Story** text, **Machine** block, and **Human** block in a clear layout, then ask the user to confirm or correct before continuing.

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

- **Parse the pasted link:** From **GitHub user story issue URL** in **Input Format**, extract `owner`, `repo`, and issue number `N` per **Issue parsing**. Run the **repository check**; do not continue on a mismatch.
- **Load the GitHub issue:** Fetch with `gh issue view <N> --repo <owner>/<repo> --json title,body,url` (or the same without `--repo` when `origin` matches and you are in the repo). If `gh` is unavailable, read the issue via the GitHub web UI, API, or any available tool that returns **title** and **body**, then apply the same extraction rules.
- **Extract:** Apply **Issue parsing** to obtain **User Story ID and title**, **User Story** text, **Machine Acceptance Criteria**, and **Human Acceptance Criteria**. Keep the canonical issue URL and `#N` for Step 8.
- **Present to the user:** Per **Step 1 presentation** in **Input Format**—show URL, `#N`, id/title, story, and both criteria blocks; ask for confirmation or corrections before the rest of the workflow treats them as authoritative.
- Restate the goal clearly from the confirmed story and criteria.
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

## Loop

- Repeat **Step 5–6 up to 2 times** and check for any integration problems between the changes and the rest of the system
- Stop when implementation is stable and complete
- The AI MUST:
  - perform at least 1 review pass
  - perform up to 2 revision iterations if issues are found

---

### Step 8: Push and open pull request (after user approves final work)

When the user approves the completed implementation following Step 7:

1. **Branch:** Confirm again you are **not** on `main`. If you are, stop; create or check out a feature branch, move commits if needed, then continue.
2. **Review:** `git status` and `git diff` (or equivalent) so the user sees what will be published.
3. **Commit:** If there are uncommitted changes, `git add` and `git commit` with a clear message.
4. **Push:** `git push -u origin <branch-name>` (first push) or `git push` (branch already tracking).
5. **Pull request:** Open a PR into `main` that is explicitly tied to the **same** GitHub user story issue parsed in **Step 1** (same `owner/repo` and issue number `N`).
   - **CLI:** `gh pr create --base main --head <branch-name> --title "…" --body "…"`
   - **Title (required format):** `Completed User Story <n>: <title>`
     - `<n>` is the numeric story id from the **User Story ID and title** confirmed in Step 1 (for example `US4 — …` → `4`).
     - `<title>` is the human-readable title from that same line (for example `US4 — Dish Filtering by Preferences` → `Dish Filtering by Preferences`).
     - Full example: `Completed User Story 4: Dish Filtering by Preferences`
   - **Body (AI):** Write a specific body—do not ship placeholder text. Include:
     - A line that **links and closes** the user story issue using a [GitHub closing keyword](https://docs.github.com/en/issues/tracking-your-work-with-issues/linking-a-pull-request-to-an-issue) and the **same issue number `N`** from the pasted issue URL (for example `Closes #12` or `Fixes #12`). That ties the PR to the issue you loaded in Step 1 and closes it when the PR merges.
     - Optionally the canonical issue **URL** on its own line for reviewers.
     - Brief context, substantive change bullets, mapping to the **Machine** / **Human** criteria from that issue (as confirmed in Step 1–2), and any test or manual-check notes from Step 7.
     - Optionally repeat the **User Story ID and title** for reviewers.
6. **Merge:** Do not merge without the user’s explicit approval on GitHub.

**Important Note:** If any git or gh command fails:

- DO NOT retry
- Surface error
- Ask user for intervention

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

- Writing and refining user stories in GitHub issues (clear title, story paragraph, and **Machine** / **Human** section headings so parsing in **Issue parsing** is reliable)
- Confirming AI extraction in Step 1 when the issue layout is non-standard
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
