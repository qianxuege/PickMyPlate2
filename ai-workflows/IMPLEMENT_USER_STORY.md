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

## Workflow Steps

### Step 1: Understand the User Story (AI)

- Restate the goal clearly
- Identify requirements and constraints
- Identify edge cases and failure scenarios

---

### Step 2: Define Acceptance Criteria (AI)

- Clean and structure provided criteria
- Ensure completeness and clarity
- Resolve ambiguities where possible

---

### Step 3: Design (AI, if applicable)

- Define UI structure and layout
  - clean and modern UX consistent with the rest of the app's screens
- Identify components needed
- Plan state management and data flow
- Follow similar color scheme as defined in constants folder
- Ensure mobile-first UX (for React Native)

---

### Step 4: Implementation (AI)

- Generate or modify code in the repository
- Follow existing project structure and conventions
- Keep changes minimal and scoped
- Handle:
  - loading states
  - empty states
  - error states

---

### Step 5: Review (AI)

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

- Repeat **Step 5–6 up to 2 times**
- Stop when implementation is stable and complete

---

## Human Responsibilities

The following are **not automated** and remain human responsibilities:

- Writing and refining user stories
- Defining acceptance criteria
- Product and UX decision-making
- Reviewing AI-generated code
- Testing functionality manually
- Fixing incorrect or incomplete AI output
- Managing secrets and environment configuration
- Approving and merging pull requests

---

## Notes

- AI assists with development but does not replace engineering judgment
- All outputs must be reviewed before merging
- This workflow is applied consistently across all user stories
