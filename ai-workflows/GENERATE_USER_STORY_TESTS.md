# LLM Workflow: Generate Unit Tests for a User Story

This document defines a **repeatable AI-assisted workflow** for authoring machine-executable Jest unit tests for a user story.

This workflow is tool-agnostic and works with Claude Code, Cursor, or Codex.

---

## Input Format

Each run requires:

- **User Story ID and title**
  (e.g. US4 — Dish Filtering by Preferences)

- **GitHub Issue number** of the user story being tested
  (e.g. #12)

- **Machine Acceptance Criteria**
  (Functional, testable conditions the tests must cover)

- **Relevant lib file(s)** to test
  (e.g. `lib/diner-preferences.ts`)

---

## Workflow Steps

### Step 0: Branch and Issue Setup (AI)

- Derive the branch name from the lib file name by removing the `lib/` prefix and `.ts` extension:
  - e.g. `lib/diner-preferences.ts` → branch: `test/us<N>-diner-preferences`
- Create and switch to the branch:
  ```bash
  git checkout main && git pull origin main
  git checkout -b test/us<N>-<lib-filename>
  ```
- Create a GitHub Issue titled: `test: unit tests for US<N> — <title>`
  - Body must include:
    - `Relates to #<user-story-issue-number>`
    - **Lib file under test**: `lib/<filename>.ts`
    - **Functions to be tested**: list each exported function by name
    - **Test cases** (as a checklist): one checkbox per `it()` case, covering happy path, error cases, and edge cases
    - **Machine acceptance criteria covered**: map each criterion to its corresponding test case(s)
  - Use: `gh issue create --title "..." --body "..."`
- Note the new issue number for use in commits

---

### Step 1: Understand What to Test (AI)

- Read the relevant lib file(s) provided as input
- List all exported functions to be tested
- For each function, identify:
  - happy path cases
  - error / failure cases
  - edge cases (empty input, missing user, null data)
- Map each case to a machine acceptance criterion

---

### Step 2: Plan the Test File (AI)

- Propose the test file path: `tests/<lib-filename>.test.ts`
- Define the describe/it block structure
- Identify which Supabase methods need to be mocked
- Confirm plan matches the machine acceptance criteria

---

### Step 3: Write the Tests (AI)

Follow the style of existing test files in `tests/`:

- Import only from `@/lib/<filename>` using path aliases
- Mock `@/lib/supabase` using `jest.mock`
- Use the `makeChain()` helper pattern to mock Supabase query chains:
  ```ts
  function makeChain(result: unknown) {
    const chain: Record<string, unknown> = {};
    ['select', 'insert', 'delete', 'eq', 'in', 'order'].forEach((m) => {
      chain[m] = jest.fn().mockReturnThis();
    });
    chain.maybeSingle = jest.fn().mockResolvedValue(result);
    chain.single      = jest.fn().mockResolvedValue(result);
    chain.then        = (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) =>
      Promise.resolve(result).then(resolve, reject);
    return chain;
  }
  ```
- Use `beforeEach(() => jest.clearAllMocks())` to reset state
- Separate test sections with `// ---` comment dividers
- Use `describe` per function, `it` per case
- Use `toMatchObject` for partial object assertions
- Use `rejects.toThrow` for error cases

Do NOT:
- Use `@testing-library/react` unless testing a React component
- Hardcode Supabase credentials
- Import from files that do not exist

---

### Step 4: Run and Fix (AI)

- Run the tests:
  ```bash
  npm test -- --ci tests/<filename>.test.ts
  ```
- If any tests fail:
  - Read the error output
  - Fix the test or mock as needed
  - Re-run until all tests pass
- Repeat up to **3 times** before stopping to ask for human guidance

---

### Step 5: Commit and Push (AI)

- Stage only the new test file:
  ```bash
  git add tests/<filename>.test.ts
  ```
- Commit with the issue number:
  ```bash
  git commit -m "test: unit tests for US<N> — <title> #<issue-number>"
  ```
- Push the branch:
  ```bash
  git push -u origin test/us<N>-<short-description>
  ```

---

### Step 6: Create Pull Request (AI)

- Create a PR with:
  ```bash
  gh pr create \
    --title "test: unit tests for US<N> — <title>" \
    --body "Closes #<test-issue-number>\nRelates to #<user-story-issue-number>"
  ```
- Output the PR URL clearly for the human

---

### Step 7: Human Review and Merge (Human)

The following steps are **not automated**:

- Review the PR diff for correctness
- Confirm tests actually exercise the machine acceptance criteria
- Approve and merge the PR
- Verify the CI run passes after merge

---

## Human Responsibilities

- Creating and checking out the branch (Step 0)
- Providing the correct lib file(s) and issue number as input
- Reviewing and approving the PR (Step 7)
- Merging the PR (Step 7)
- Exporting and saving this chat session as evidence for submission

---

## Notes

- Tests must pass with `npm test -- --ci` before the PR is created
- Do not modify lib source files — only write test files
- If a lib function requires mocks not covered by `makeChain`, ask for guidance before proceeding
- This workflow is run once per user story
