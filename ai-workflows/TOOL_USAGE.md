# Tool Usage Guide for LLM Workflow

This document explains how to execute the workflow in `IMPLEMENT_USER_STORY.md` using different tools.

The workflow is **tool-agnostic** and works across:

- Claude Code
- Cursor
- Codex / ChatGPT

---

## General Instructions

For each user story:

1. Provide:
   - User Story
   - Machine Acceptance Criteria
   - Human Acceptance Criteria

2. Follow the workflow steps in `IMPLEMENT_USER_STORY.md`
3. Perform 1–2 review/revision iterations
4. Validate manually before merging

---

## Using Claude Code (CLI)

Start Claude Code:

```bash
claude
```

Run iterative workflow:

```bash
/loop
```

Then paste:

```
Follow the workflow in ai-workflows/IMPLEMENT_USER_STORY.md.

User Story:
<PASTE>

Machine Acceptance Criteria:
<PASTE>

Human Acceptance Criteria:
<PASTE>
```

Claude will:

- plan
- implement
- review
- revise iteratively

---

## Using Cursor

1. Open Cursor chat
2. Paste:

```
Follow the workflow in ai-workflows/IMPLEMENT_USER_STORY.md.

User Story:
<PASTE>

Machine Acceptance Criteria:
<PASTE>

Human Acceptance Criteria:
<PASTE>
```

3. Execute in phases:
   - planning
   - implementation
   - review
   - revision

4. Review suggested file changes before applying

---

## Using Codex / ChatGPT

1. Paste the same workflow prompt

2. Manually iterate through:
   - planning
   - implementation
   - review
   - revision

3. Copy code into the repository as needed

---

## Best Practices

- Always include acceptance criteria
- Keep prompts scoped to a single user story
- Do not allow large unrelated file rewrites
- Review diffs before applying changes
- Stop after 1–2 iterations to avoid overfitting

---

## Output Expectations

Each run should produce:

- structured plan
- implementation changes
- review feedback
- revised implementation

---

## Summary

This workflow ensures:

- consistent AI usage across tools
- repeatable development process
- clear separation of AI and human responsibilities
