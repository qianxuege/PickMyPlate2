# Coding and Design Rules

These rules guide AI-generated code to ensure consistency and quality across the project.

---

## General Principles

- Follow existing project structure and patterns
- Prefer **modifying existing files** over creating new ones
- Keep changes **small and scoped**
- Avoid unnecessary complexity
- Write readable, maintainable code

---

## 🚫 Anti-Hallucination Rules (CRITICAL)

The AI MUST:

- Do NOT invent:
  - APIs
  - components
  - functions
  - libraries
    that do not exist in the codebase or are not explicitly introduced

- Do NOT assume file paths or structures
  → verify by referencing existing files

- Do NOT fabricate props, state, or data structures
  → align with existing types and usage

- If something is unclear or missing:
  - explicitly state the assumption
  - or ask for clarification (if interactive)

- Prefer:
  - reusing existing components
  - following existing patterns
    over creating new abstractions

- Do NOT generate placeholder logic that would not run in production

---

## React Native Guidelines

- Use **TypeScript**
- Use **functional components**
- Use React hooks (`useState`, `useEffect`, etc.)
- Keep components small and reusable
- Avoid deeply nested component trees

---

## State Management

- Keep state close to where it is used
- Lift state only when necessary
- Avoid redundant or duplicated state

---

## UI / UX

- Design mobile-first
- Ensure clear visual hierarchy
- Provide feedback for:
  - loading
  - empty states
  - errors

- Use consistent spacing and styling

---

## Styling

- Follow existing styling approach in the repo
- Keep styles consistent across components
- Avoid inline styles unless necessary

---

## Error Handling

- Always handle:
  - API failures
  - invalid inputs
  - empty data states

---

## Performance

- Avoid unnecessary re-renders
- Use memoization when appropriate
- Keep components efficient

---

## Code Quality

- Use clear variable and function names
- Avoid magic numbers
- Add comments only when necessary for clarity
- Remove unused code

---

## What to Avoid

- Rewriting entire files unnecessarily
- Introducing new patterns without reason
- Hardcoding values that should be dynamic
- Ignoring acceptance criteria

---

## Testing (if applicable)

- Ensure logic is testable
- Validate behavior manually if automated tests are not present

---

## Final Rule

If unsure:

- follow existing patterns in the repository
- prioritize clarity over cleverness
- do not guess — verify or ask
