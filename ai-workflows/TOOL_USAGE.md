# Tool Usage Guide for LLM Workflow

This document explains how to **start** the workflow in different tools. The **canonical copy-and-paste prompt** is the full contents of:

**`ai-workflows/how_to_run_this.md`**

Open that file, paste it into your tool, replace the `<PASTE>` placeholders under **Input**, then send. The model must follow `IMPLEMENT_USER_STORY.md` and `RULES.md` for the full workflow (including Git branch rules, push, and PR steps). This file only explains how to launch that prompt in each tool.

The workflow is **tool-agnostic** and works across:

- Claude Code
- Cursor
- Codex / ChatGPT

---

## General Instructions

For each user story:

1. Copy **all** of `how_to_run_this.md` into the chat (or CLI), then fill in **User Story**, **Machine Acceptance Criteria**, and **Human Acceptance Criteria**.
2. Follow the steps and stops defined in `IMPLEMENT_USER_STORY.md` (the prompt tells the model to do this).
3. Perform 1–2 review/revision iterations (Steps 5–6).
4. Complete human validation (**Step 7**), then follow **Step 8** in `IMPLEMENT_USER_STORY.md` (push and open a pull request).

**Branch rule:** do not edit the repo or run project commands on `main`. See **Branch safety** in `IMPLEMENT_USER_STORY.md` and **Git and branches** in `RULES.md`.

---

## Using Claude Code (CLI)

Start Claude Code:

```bash
claude
```

Optional iterative wrapper:

```bash
/loop
```

Then paste the **full** contents of `ai-workflows/how_to_run_this.md`, with the three **Input** sections filled in.

Claude will:

- plan
- implement
- review
- revise iteratively (within the human-in-the-loop rules in the prompt)

---

## Using Cursor

1. Open Cursor chat (or Agent).
2. Paste the **full** contents of `ai-workflows/how_to_run_this.md`, with the three **Input** sections filled in.
3. Execute in phases as the model stops for approval after each step.
4. Review suggested file changes before applying (the prompt requires approval before applying).

---

## Using Codex / ChatGPT

1. Paste the **full** contents of `ai-workflows/how_to_run_this.md`, with the three **Input** sections filled in.
2. Manually drive approvals when the model stops after each step.
3. Apply changes in your editor or paste diffs as you approve them.
4. After final approval, push and open a PR using **Step 8** in `IMPLEMENT_USER_STORY.md`.

---

## Best Practices

- Use **`how_to_run_this.md` as the single short prompt**; branch checks, push, and PR live in `IMPLEMENT_USER_STORY.md` and `RULES.md`.
- Always include acceptance criteria
- Keep prompts scoped to a single user story
- Do not allow large unrelated file rewrites
- Review diffs before applying changes
- Stop after 1–2 iterations to avoid overfitting
- Never treat `main` as the working branch for implementation; use a feature branch

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

- consistent AI usage across tools (same prompt: `how_to_run_this.md`)
- repeatable development process
- clear separation of AI and human responsibilities
- safe branching (no direct work on `main`) and an explicit push/PR path after final approval
