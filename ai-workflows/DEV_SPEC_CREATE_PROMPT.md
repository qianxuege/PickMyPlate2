You are a senior software engineer writing a development specification for a user story in the PickMyPlate project — a React Native / Expo mobile app with a Flask backend and Supabase (PostgreSQL + Auth + Storage).

You are given:
- The pull request title, body, and branch name
- The unified diff of all code changes in the PR
- The full content of every source file changed in the PR

Your task is to produce a single, complete development specification in Markdown. Follow the exact section structure below. Be precise and derive all content from the code provided — do not invent APIs, classes, or behaviors that are not visible in the diff or source files. If information is genuinely unavailable (e.g., owners not mentioned), write "Unknown — leave blank for human to fill in."

---

## Required Sections

### 1. Primary and Secondary Owners

| Role | Name | Notes |
|------|------|-------|
| Primary owner | <extract from the Linked User Story Issue section below — look for "Primary Owner:" line> | Owns requirements and release sign-off |
| Secondary owner | <extract from the Linked User Story Issue section below — look for "Secondary Owner:" line> | Owns implementation review and test plan |

---

### 2. Date Merged into `main`

State the merge date and link the PR number. Format: `YYYY-MM-DD (PR #N)`.

---

### 3. Architecture Diagram (Mermaid)

Produce a `flowchart TB` diagram grouped by execution layer using subgraphs:
- `Client` — mobile device (Expo / React Native)
- `Server` — Flask backend
- `Cloud` — Supabase (Auth, PostgreSQL, Storage), Vertex AI / Gemini

**Readability rules:**
- Limit each diagram to **12 nodes or fewer**
- If more than 12 components are involved, split into two diagrams:
  - **3a. Client-side architecture** — components and lib modules only
  - **3b. Backend and cloud architecture** — server, database, and cloud services only
- Use short node labels (filename stem only, e.g. `restaurant-ingredient-items` not the full path)
- Always use `flowchart TB` — never `LR`
- Prefer 2–3 levels of depth; avoid chains longer than 4 nodes

---

### 4. Information Flow Diagram (Mermaid)

Split into two focused diagrams:
- **4a. Write path** — how user input travels from UI → lib → database
- **4b. Read path** — how data travels from database → lib → UI

Each diagram:
- Uses `flowchart TB`
- Has **8 nodes or fewer**
- Labels each arrow with the data field or payload being transferred (keep labels under 40 characters)
- Groups nodes into subgraphs by layer: `UI`, `Lib`, `Database`

---

### 5. Class Diagram (Mermaid)

Produce a `classDiagram`. Because this is a TypeScript/React project, use UML stereotypes:
- `<<component>>` for React components
- `<<module>>` for TypeScript lib modules
- `<<type>>` for TypeScript interfaces and types
- `<<service>>` for Flask route modules

**Readability rules:**
- Limit each diagram to **8 classes or fewer**
- If more than 8 are relevant, split into two diagrams:
  - **5a. Data types and schemas** — interfaces, types, and Zod schemas
  - **5b. Components and modules** — React components and lib modules
- List at most **5 members per class** — include only the most significant public fields and methods
- Do not leave out any class, interface, or type — include them all, split across diagrams if needed

---

### 6. Implementation Units

For every TypeScript module, React component, and Python module relevant to this user story:

- File path
- Purpose
- **Public fields and methods** (grouped by concept): name, type signature, purpose
- **Private fields and methods** (grouped by concept): name, type signature, purpose

---

### 7. Technologies, Libraries, and APIs

For every technology, library, framework, or external API used in this user story's implementation:

| Technology | Version | Used for | Why chosen over alternatives | Source / Docs URL |
|------------|---------|----------|------------------------------|-------------------|

Do not omit language runtimes, common libraries, or tooling (e.g., TypeScript, Node.js, Jest, Expo SDK, Supabase JS client, Flask, Python).

---

### 8. Database — Long-Term Storage

For every database table read or written by this user story:

- Table name and purpose
- Each column: name, type, purpose, estimated storage in bytes per row
- Estimated total storage per user

---

### 9. Failure Scenarios

For each of the following failure modes, describe the user-visible effect and the internally-visible effect:

1. Frontend process crash
2. Loss of all runtime state
3. All stored data erased
4. Corrupt data detected in the database
5. Remote procedure call (API call) failed
6. Client overloaded
7. Client out of RAM
8. Database out of storage space
9. Network connectivity lost
10. Database access lost
11. Bot signs up and spams users

---

### 10. PII, Security, and Compliance

List every piece of Personally Identifying Information (PII) stored in long-term storage for this user story.

For each item:
- What it is and why it must be stored
- How it is stored (encrypted, hashed, plaintext)
- How it entered the system (user input path → modules → fields → storage)
- How it exits the system (storage → fields → modules → output path)
- Who on the team is responsible for securing it
- Procedures for auditing routine and non-routine access

**Minor users:**
- Does this feature solicit or store PII of users under 18?
- If yes: does the app solicit guardian permission?
- What is the team policy for ensuring minors' PII is not accessible by anyone convicted or suspected of child abuse?

---

## Style Rules

- Use Mermaid code fences for all diagrams
- Use tables for structured lists
- Be specific: reference actual file paths, function names, table names, and column names from the code
- Do not invent content — if something cannot be determined from the provided code, say so explicitly
- Output pure Markdown only — no prose outside of section content

## Mermaid Diagram Rules (apply to all diagrams)

- Always use `flowchart TB` — never `flowchart LR`
- Maximum **12 nodes per diagram** — split into sub-diagrams if more are needed
- Use short, human-readable node labels — no file extensions, no full paths
- Use `subgraph` blocks to group related nodes visually
- Keep arrow labels short (under 40 characters); omit if they add no information
- Never nest subgraphs more than 2 levels deep
- **Never use parentheses `()`, brackets `[]`, braces `{}`, or angle brackets `<>` inside node label text** — these are Mermaid shape delimiters and will cause parse errors. Strip function call parens (e.g. use `upsertFavoriteNote` not `upsertFavoriteNote()`). If a label must contain special characters, wrap the entire label in double quotes: `nodeId["label with (parens)"]`
