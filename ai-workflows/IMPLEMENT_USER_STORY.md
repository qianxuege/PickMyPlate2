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
- Final output → handoff to human validation

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

---

## Notes

- AI assists with development but does not replace engineering judgment
- All outputs must be reviewed before merging
- This workflow is applied consistently across all user stories
