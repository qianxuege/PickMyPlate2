# LLM Workflow: Generate Unit Tests for a User Story

This document defines a **repeatable AI-assisted workflow** for authoring machine-executable Jest unit tests for a user story.

This workflow is tool-agnostic and works with Claude Code, Cursor, or Codex.

---

## Input Format

Each run requires only:

- **GitHub Issue URL** of the user story to be tested
  (e.g. `https://github.com/qianxuege/PickMyPlate2/issues/12`)

---

## Workflow Steps

### Step 1: Fetch and Understand the User Story (AI)

- Fetch the issue using:
  ```bash
  gh issue view <issue-number> --repo <owner>/<repo>
  ```
- Extract from the issue:
  - User Story ID and title (e.g. US4 — Dish Filtering by Preferences)
  - Machine acceptance criteria
  - Any referenced files, components, or feature areas
- Restate the goal clearly in your own words
- Identify requirements, constraints, and edge cases

---

### Step 2: Identify Relevant Lib Files (AI)

- Search the codebase for lib files related to the user story's feature area:
  ```bash
  ls lib/
  ```
- Read candidate files to confirm they implement the story's behavior
- Select the lib file(s) whose exported functions directly implement the acceptance criteria
- If multiple files are relevant, list them all and confirm before proceeding
- If no lib file clearly maps to the story, explicitly state this and ask for human guidance before continuing

---

### Step 3: Branch and Issue Setup (AI)

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

### Step 4: Plan the Test File (AI)

- Propose the test file path: `tests/<lib-filename>.test.ts`
- Define the describe/it block structure
- Identify which Supabase methods need to be mocked
- Confirm plan matches the machine acceptance criteria

---

### Step 5: Write the Tests (AI)

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

### Step 6: Run and Fix (AI)

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

### Step 7: Commit and Push (AI)

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
  git push -u origin test/us<N>-<lib-filename>
  ```

---

### Step 8: Create Pull Request (AI)

- Create a PR with:
  ```bash
  gh pr create \
    --title "test: unit tests for US<N> — <title>" \
    --body "Closes #<test-issue-number>\nRelates to #<user-story-issue-number>"
  ```
- Output the PR URL clearly for the human

---

### Step 9: Human Review and Merge (Human)

The following steps are **not automated**:

- Review the PR diff for correctness
- Confirm tests actually exercise the machine acceptance criteria
- Approve and merge the PR
- Verify the CI run passes after merge

---

## Human Responsibilities

- Providing the GitHub Issue URL as input
- Reviewing and approving the PR (Step 9)
- Merging the PR (Step 9)
- Exporting and saving this chat session as evidence for submission

---

## Notes

- Tests must pass with `npm test -- --ci` before the PR is created
- Do not modify lib source files — only write test files
- If a lib function requires mocks not covered by `makeChain`, ask for guidance before proceeding
- This workflow is run once per user story
