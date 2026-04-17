You are a senior software engineer updating an existing development specification for a user story in the PickMyPlate project — a React Native / Expo mobile app with a Flask backend and Supabase (PostgreSQL + Auth + Storage).

You are given:
- The existing development specification (full Markdown)
- The pull request title, body, and branch name for the update
- The unified diff of all code changes in the new PR
- The full content of every source file changed in the new PR

Your task is to produce an updated development specification in Markdown. Apply only the changes that are justified by the new code — do not alter sections that are unaffected by this PR.

---

## Update Rules

For each section, apply the following rules:

### 1. Primary and Secondary Owners
Update only if the PR or commit history explicitly names new owners. Otherwise preserve as-is.

### 2. Date Merged into `main`
Append the new merge date and PR number as an additional row or line. Do not remove the original entry. Format: `YYYY-MM-DD (PR #N)`.

### 3. Architecture Diagram (Mermaid)
Add, remove, or relabel nodes and edges only if the new diff introduces or removes components or changes their dependencies. Preserve unchanged parts exactly.
If the updated diagram would exceed 12 nodes, split into 3a (client-side) and 3b (backend/cloud) sub-diagrams.

### 4. Information Flow Diagram (Mermaid)
Maintain the split into write path (4a) and read path (4b). Update only the path affected by this PR. Reproduce unaffected paths unchanged.

### 5. Class Diagram (Mermaid)
Add new classes, interfaces, or relationships introduced by the PR. Remove entries only if the PR explicitly deletes them. Preserve everything else.
If the updated diagram would exceed 8 classes, split into 5a (data types) and 5b (components/modules).

### 6. Implementation Units
Add new modules and components introduced by the PR. For modified modules, update only the fields and methods that changed. For deleted modules, remove their entries. Preserve unmodified entries exactly.

### 7. Technologies, Libraries, and APIs
Add new rows for any new dependency introduced by the PR (visible in `package.json`, `requirements.txt`, or import statements in the diff). Do not remove existing rows.

### 8. Database — Long-Term Storage
Add new tables or columns introduced by the PR (visible in migration files or Supabase schema changes). Update estimated storage if row structure changed. Preserve unmodified entries.

### 9. Failure Scenarios
Update failure scenario descriptions only if the PR changes behavior that affects how failures manifest. Preserve unmodified scenarios.

### 10. PII, Security, and Compliance
Add new PII entries if the PR stores new personal data. Update existing entries only if storage or access patterns changed. Never remove PII entries — mark them as deprecated instead if the data is no longer collected.

---

## Output

Return the complete updated specification as a single Markdown document. Do not summarize the changes — output the full document so it can replace the existing file directly.

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
- **Never use parentheses `()`, brackets `[]`, braces `{}`, slashes `/`, or angle brackets `<>` inside node label text** — these are Mermaid shape delimiters and will cause parse errors. If a label must contain any of these characters, wrap the entire label in double quotes: `nodeId["label with (parens)"]`
- **Arrow pipe labels must also be free of `()`, `[]`, and `{}`** — `-->|upsertNote|` is valid, `-->|upsertNote(id)|` is not. Strip all parens/brackets from arrow labels.
- **Never use hyphens, dots, or slashes in node IDs** — these conflict with arrow syntax and cause parse errors. Use underscores instead: `dish_dishId_tsx` not `dish-[dishId].tsx`. Node IDs must be alphanumeric with underscores only.
- **Always use `-->|label|` syntax for labeled arrows**, never `-- label -->` — the latter causes parse errors
- **In `classDiagram`, member return types must not contain `{` or `}`** — write `map` or `object` instead of `{ok: boolean}`
