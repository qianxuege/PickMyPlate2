/**
 * generateDevSpec.mjs
 *
 * Generates or updates a development specification for a user story
 * by calling the Gemini API with the PR diff and changed source files.
 *
 * Environment variables (set by the GitHub Actions workflow):
 *   PR_NUMBER        — pull request number
 *   PR_TITLE         — pull request title
 *   PR_BODY          — pull request body
 *   PR_URL           — pull request HTML URL
 *   PR_BRANCH        — head branch name (e.g. feat/us4-dish-filtering)
 *   PR_MERGED_AT     — merge timestamp (ISO 8601)
 *   PR_DIFF_PATH     — path to the unified diff file
 *   CHANGED_FILES    — space-separated list of files changed in the PR
 *   EXISTING_SPEC_PATH — path to existing dev spec (empty if creating new)
 *   DEV_SPEC_OUT_PATH  — output path for the generated/updated spec
 *   GEMINI_API_KEY   — Gemini API key (or use GCP_PROJECT + GCP_ACCESS_TOKEN)
 *   GEMINI_MODEL     — model override (default: gemini-2.5-flash)
 *   GCP_PROJECT      — GCP project (Vertex AI fallback)
 *   GCP_ACCESS_TOKEN — GCP access token (Vertex AI fallback)
 */

import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

const MAX_DIFF_CHARS = 80000;
const MAX_SOURCE_CHARS = 60000;
const DEFAULT_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const CREATE_PROMPT_PATH = "ai-workflows/DEV_SPEC_CREATE_PROMPT.md";
const UPDATE_PROMPT_PATH = "ai-workflows/DEV_SPEC_UPDATE_PROMPT.md";

async function main() {
  const diffPath = process.env.PR_DIFF_PATH;
  if (!diffPath) throw new Error("PR_DIFF_PATH is required.");

  const outPath = process.env.DEV_SPEC_OUT_PATH;
  if (!outPath) throw new Error("DEV_SPEC_OUT_PATH is required.");

  const existingSpecPath = process.env.EXISTING_SPEC_PATH || "";
  const isUpdate = existingSpecPath !== "" && await fileExists(existingSpecPath);

  const [diff, sourceContext, promptTemplate, existingSpec, linkedIssue] = await Promise.all([
    fs.readFile(diffPath, "utf8"),
    buildSourceContext(),
    fs.readFile(isUpdate ? UPDATE_PROMPT_PATH : CREATE_PROMPT_PATH, "utf8"),
    isUpdate ? fs.readFile(existingSpecPath, "utf8") : Promise.resolve(""),
    fetchLinkedIssue(),
  ]);

  const prompt = buildPrompt(promptTemplate, diff, sourceContext, existingSpec, isUpdate, linkedIssue);
  process.stdout.write(`Calling Gemini (${isUpdate ? "update" : "create"} mode)...\n`);

  let specMarkdown = await callGemini(prompt);

  // Pre-sanitize pass: automatically fix deterministic patterns that Gemini
  // consistently gets wrong before entering the validation loop.
  specMarkdown = preSanitizeMermaid(specMarkdown);

  // Self-healing Mermaid validation loop — runs until clean or MAX_FIX_ATTEMPTS reached.
  // Each fix call receives a truncated history of recent errors so Gemini knows what it got
  // wrong without the prompt growing unboundedly across many attempts.
  const MAX_FIX_ATTEMPTS = 5;
  const errorHistory = []; // accumulated per-attempt error records
  for (let attempt = 1; attempt <= MAX_FIX_ATTEMPTS; attempt++) {
    const mermaidErrors = validateMermaidBlocks(specMarkdown);
    if (mermaidErrors.length === 0) {
      process.stdout.write(`Mermaid validation passed${attempt > 1 ? ` after ${attempt - 1} fix(es)` : ""}.\n`);
      break;
    }

    process.stdout.write(
      `Mermaid validation attempt ${attempt}/${MAX_FIX_ATTEMPTS}: found ${mermaidErrors.length} error(s). Asking Gemini to fix...\n`,
    );
    mermaidErrors.forEach(({ diagramIndex, errors }) => {
      process.stdout.write(`  Diagram ${diagramIndex + 1}: ${errors.join("; ")}\n`);
    });

    // Record this attempt's errors in the history before calling fix
    errorHistory.push({ attempt, mermaidErrors });

    specMarkdown = await fixMermaidErrors(specMarkdown, mermaidErrors, errorHistory);

    // After the last attempt, do a final validation check
    if (attempt === MAX_FIX_ATTEMPTS) {
      const remaining = validateMermaidBlocks(specMarkdown);
      if (remaining.length > 0) {
        process.stdout.write(
          `Warning: ${remaining.length} Mermaid error(s) remain after ${MAX_FIX_ATTEMPTS} fix attempts. Writing spec anyway.\n`,
        );
      } else {
        process.stdout.write(`Mermaid validation passed after ${MAX_FIX_ATTEMPTS} fix(es).\n`);
      }
    }
  }

  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, specMarkdown);
  process.stdout.write(`Dev spec written to ${outPath}\n`);
}

// ---------------------------------------------------------------------------
// Prompt assembly
// ---------------------------------------------------------------------------

function buildPrompt(template, diff, sourceContext, existingSpec, isUpdate, linkedIssue) {
  const metadata = {
    prNumber: process.env.PR_NUMBER || "",
    prTitle: process.env.PR_TITLE || "",
    prBody: process.env.PR_BODY || "",
    prUrl: process.env.PR_URL || "",
    prBranch: process.env.PR_BRANCH || "",
    mergedAt: process.env.PR_MERGED_AT || "",
  };

  const truncatedDiff =
    diff.length > MAX_DIFF_CHARS
      ? `${diff.slice(0, MAX_DIFF_CHARS)}\n\n[diff truncated — ${diff.length} total chars]`
      : diff;

  const parts = [
    template,
    "",
    "---",
    "",
    "## Pull Request Metadata",
    "",
    "```json",
    JSON.stringify(metadata, null, 2),
    "```",
  ];

  if (linkedIssue) {
    parts.push(
      "",
      "## Linked User Story Issue",
      "",
      `The PR body references issue #${linkedIssue.number}. Its content is below.`,
      `Look for "Primary Owner:" and "Secondary Owner:" lines to populate Section 1.`,
      "",
      "```",
      `Title: ${linkedIssue.title}`,
      `Author: ${linkedIssue.author}`,
      `Assignees: ${linkedIssue.assignees}`,
      "",
      linkedIssue.body,
      "```",
    );
  }

  parts.push(
    "",
    "## Unified Diff",
    "",
    "```diff",
    truncatedDiff,
    "```",
    "",
    "## Changed Source Files",
    "",
    sourceContext,
  );

  if (isUpdate && existingSpec) {
    parts.push(
      "",
      "## Existing Development Specification",
      "",
      existingSpec,
    );
  }

  return parts.join("\n");
}

// ---------------------------------------------------------------------------
// Linked issue fetching
// ---------------------------------------------------------------------------

async function fetchLinkedIssue() {
  const prBody = process.env.PR_BODY || "";
  const repoOwner = process.env.GITHUB_REPOSITORY || "";
  const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN || "";

  if (!token || !repoOwner) return null;

  // Parse issue numbers from "Closes #N", "Fixes #N", "Relates to #N" patterns
  const matches = [...prBody.matchAll(/(?:closes|fixes|relates\s+to)\s+#(\d+)/gi)];
  if (matches.length === 0) return null;

  const issueNumber = matches[0][1];

  try {
    const response = await fetch(
      `https://api.github.com/repos/${repoOwner}/issues/${issueNumber}`,
      { headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" } },
    );
    if (!response.ok) return null;

    const issue = await response.json();
    return {
      number: issue.number,
      title: issue.title || "",
      author: issue.user?.login || "",
      assignees: (issue.assignees || []).map((a) => a.login).join(", ") || "none",
      body: issue.body || "",
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Source file context
// ---------------------------------------------------------------------------

async function buildSourceContext() {
  const changedFiles = (process.env.CHANGED_FILES || "")
    .split(/\s+/)
    .map((f) => f.trim())
    .filter((f) => f && isSourceFile(f));

  if (changedFiles.length === 0) return "(no source files identified)";

  let totalChars = 0;
  const sections = [];

  for (const filePath of changedFiles) {
    if (totalChars >= MAX_SOURCE_CHARS) {
      sections.push(`\n[source context truncated — ${changedFiles.length} files total]\n`);
      break;
    }
    try {
      const content = await fs.readFile(filePath, "utf8");
      const excerpt =
        totalChars + content.length > MAX_SOURCE_CHARS
          ? content.slice(0, MAX_SOURCE_CHARS - totalChars) + "\n[file truncated]"
          : content;
      sections.push(`### ${filePath}\n\n\`\`\`\n${excerpt}\n\`\`\``);
      totalChars += excerpt.length;
    } catch {
      sections.push(`### ${filePath}\n\n(could not read file)`);
    }
  }

  return sections.join("\n\n");
}

function isSourceFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return [".ts", ".tsx", ".js", ".mjs", ".py", ".sql"].includes(ext);
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Mermaid pre-sanitizer — deterministic fixes applied before validation
// ---------------------------------------------------------------------------

/**
 * Automatically repair common recurring Mermaid errors that Gemini reliably
 * produces, so the validation loop starts from a cleaner baseline.
 *
 * Operates only inside ```mermaid ... ``` blocks. Does not touch prose sections.
 */
function preSanitizeMermaid(spec) {
  return spec.replace(/```mermaid\s*\n([\s\S]*?)```/g, (fullMatch, body) => {
    let fixed = body;

    // 1. TypeScript array notation in arrow pipe labels: -->|Type[]| → -->|Type list|
    //    Matches any [...] that looks like a type annotation (starts with uppercase or
    //    contains word chars) inside a pipe label.
    fixed = fixed.replace(
      /(\|[^|]*?)([A-Za-z_]\w*)\[\]([^|]*?\|)/g,
      (m, pre, typeName, post) => `${pre}${typeName} list${post}`,
    );

    // 2. TypeScript array notation in unquoted square-bracket node labels:
    //    nodeId[Type[]] → nodeId["Type list"]
    //    nodeId[foo Type[] bar] → nodeId["foo Type list bar"]
    fixed = fixed.replace(
      /(\w+)\[([^\]"]*?)([A-Za-z_]\w*)\[\]([^\]"]*?)\]/g,
      (m, nodeId, pre, typeName, post) =>
        `${nodeId}["${(pre + typeName + " list" + post).trim()}"]`,
    );

    // 3. Hyphens in node IDs that appear before shape delimiters or arrows.
    //    e.g. my-node[label] → my_node[label], my-node --> → my_node -->
    //    Only replaces hyphens in the ID token, not inside quoted labels.
    fixed = fixed.replace(
      /\b([A-Za-z_][A-Za-z0-9_]*(?:-[A-Za-z0-9_]+)+)(\s*(?:-->|---|[\[({]))/g,
      (m, nodeId, suffix) => `${nodeId.replace(/-/g, "_")}${suffix}`,
    );

    // 4. Old-style labeled arrows: -- label --> → -->|label|
    fixed = fixed.replace(/--\s+([^-\n][^\n]*?)\s+-->/g, (_m, label) => `-->|${label.trim()}|`);

    return `\`\`\`mermaid\n${fixed}\`\`\``;
  });
}

// ---------------------------------------------------------------------------
// Mermaid validation and self-healing
// ---------------------------------------------------------------------------

/**
 * Extract all ```mermaid ... ``` blocks from a Markdown string.
 * Returns an array of { diagramIndex, content, start, end } objects,
 * where start/end are character offsets in the original string.
 */
function extractMermaidBlocks(spec) {
  const blocks = [];
  const re = /```mermaid\s*\n([\s\S]*?)```/g;
  let match;
  let index = 0;
  while ((match = re.exec(spec)) !== null) {
    blocks.push({
      diagramIndex: index++,
      content: match[1],
      fullMatch: match[0],
      start: match.index,
      end: match.index + match[0].length,
    });
  }
  return blocks;
}

/**
 * Validate all Mermaid blocks in the spec.
 * Returns an array of { diagramIndex, content, errors[] } for blocks with errors.
 * Returns an empty array if all diagrams are clean.
 */
function validateMermaidBlocks(spec) {
  const blocks = extractMermaidBlocks(spec);
  const results = [];

  for (const block of blocks) {
    const errors = checkMermaidContent(block.content);
    if (errors.length > 0) {
      results.push({ diagramIndex: block.diagramIndex, content: block.content, errors });
    }
  }
  return results;
}

/**
 * Run all grammar checks on a single Mermaid diagram's content (without fences).
 * Returns a list of human-readable error strings.
 */
function checkMermaidContent(content) {
  const errors = [];
  const lines = content.split("\n");

  // Detect diagram type from first meaningful line
  const firstMeaningful = lines.find((l) => l.trim() && !l.trim().startsWith("%%")) || "";
  const isClassDiagram = /^\s*classDiagram\b/.test(firstMeaningful);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;
    const trimmed = line.trim();

    // Skip blank lines, comments, diagram type declarations, subgraph/end markers
    if (
      trimmed === "" ||
      trimmed.startsWith("%%") ||
      trimmed === "end" ||
      /^(flowchart|graph|classDiagram|sequenceDiagram|erDiagram|gantt|pie|gitGraph)\b/i.test(trimmed) ||
      /^(subgraph|direction|TB|LR|TD|BT|RL)\b/i.test(trimmed) ||
      /^(classDef|style|linkStyle|click)\b/i.test(trimmed)
    ) continue;

    let m;

    // Strip quoted string content so checks don't fire on label text.
    // Replace "..." with "___" (same length preserves offsets enough for error reporting).
    const lineNoQuotes = line.replace(/"[^"]*"/g, (s) => '"' + "_".repeat(s.length - 2) + '"');

    // -------------------------------------------------------------------
    // Check 1: Invalid characters in node IDs (hyphens, dots, slashes).
    // Node IDs must be alphanumeric + underscores only.
    // Run against lineNoQuotes so we don't flag chars inside quoted labels.
    // Three sub-cases:
    //   a) Token before an arrow or shape delimiter on the same line
    //   b) Token after an arrow on the same line
    //   c) Standalone bare token — entire (non-structural) line is just an ID
    // -------------------------------------------------------------------
    const invalidNodeIdRe = /[-./]/; // characters banned in node IDs

    // 1a: node ID before arrow or shape delimiter
    const nodeBeforeRe = /\b([A-Za-z_][A-Za-z0-9_./-]*)\s*(?:-->|---|~~>|--o|--x|[\[({>])/g;
    while ((m = nodeBeforeRe.exec(lineNoQuotes)) !== null) {
      if (invalidNodeIdRe.test(m[1])) {
        errors.push(`Line ${lineNum}: node ID "${m[1]}" contains invalid chars (- . /) — use underscores only`);
      }
    }

    // 1b: node ID after arrow
    const nodeAfterRe = /(?:-->|---|~~>|--o|--x)\s*(?:\|[^|]*\|\s*)?([A-Za-z_][A-Za-z0-9_./-]*)\s*(?:[\[({>]|$)/g;
    while ((m = nodeAfterRe.exec(lineNoQuotes)) !== null) {
      if (invalidNodeIdRe.test(m[1])) {
        errors.push(`Line ${lineNum}: node ID "${m[1]}" contains invalid chars (- . /) — use underscores only`);
      }
    }

    // 1c: standalone bare node ID — line is just one or more bare tokens (possibly joined by &)
    // e.g. "my-node" or "nodeA & my-node"
    const strippedLine = lineNoQuotes
      .replace(/\[[^\]]*\]/g, "")   // remove [...] labels
      .replace(/\([^)]*\)/g, "")    // remove (...) labels
      .replace(/\{[^}]*\}/g, "")    // remove {...} labels
      .replace(/-->.*$/g, "")       // remove arrows and everything after
      .replace(/---.*$/g, "")
      .trim();
    // Guard: skip if remaining text still contains > or | (leftover arrow syntax);
    // do NOT include - in this check since hyphens appear in the node IDs we want to catch.
    if (strippedLine && !/[>|]/.test(strippedLine)) {
      // What remains should be only bare node IDs (possibly separated by & or whitespace)
      const bareTokens = strippedLine.split(/[\s&]+/).filter(Boolean);
      for (const tok of bareTokens) {
        if (/^[A-Za-z_][A-Za-z0-9_./-]*$/.test(tok) && invalidNodeIdRe.test(tok)) {
          errors.push(`Line ${lineNum}: standalone node ID "${tok}" contains invalid chars (- . /) — use underscores only`);
        }
      }
    }

    // -------------------------------------------------------------------
    // Check 1b: Reserved Mermaid keywords used as bare (unquoted) node IDs.
    // Covers keywords from flowchart, sequence, class, state, ER, git diagrams.
    // Run against lineNoQuotes to avoid false positives inside quoted labels.
    // -------------------------------------------------------------------
    const RESERVED_KW = [
      // Structural / flow control
      "end", "subgraph", "direction", "graph", "flowchart",
      // Styling
      "style", "classDef", "linkStyle", "click",
      // Sequence diagram
      "participant", "actor", "activate", "deactivate", "destroy",
      "create", "note", "loop", "alt", "else", "opt", "par", "and",
      "break", "critical", "option", "rect", "title", "autonumber",
      // State diagram
      "state", "choice", "fork", "join", "concurrency",
      // ER diagram
      "erDiagram", "entity", "relationship",
      // Class diagram
      "namespace",
      // Git diagram
      "commit", "branch", "checkout", "merge", "cherry-pick", "tag",
      // Misc
      "section", "gantt", "pie", "gitGraph",
    ].join("|");
    const reservedPattern = new RegExp(`\\b(${RESERVED_KW})\\b`, "gi");
    // Only flag when the keyword appears in a node-ID position (before/after an arrow or shape delimiter)
    const reservedBeforeRe = new RegExp(`\\b(${RESERVED_KW})\\s*(?:-->|---|[\\[({>])`, "gi");
    const reservedAfterRe = new RegExp(`(?:-->|---)\\s*(?:\\|[^|]*\\|\\s*)?(${RESERVED_KW})\\s*(?:[\\[({>]|$)`, "gi");
    while ((m = reservedBeforeRe.exec(lineNoQuotes)) !== null) {
      errors.push(`Line ${lineNum}: "${m[1]}" is a reserved Mermaid keyword — rename this node`);
    }
    while ((m = reservedAfterRe.exec(lineNoQuotes)) !== null) {
      errors.push(`Line ${lineNum}: "${m[1]}" is a reserved Mermaid keyword — rename this node`);
    }
    // Also catch standalone reserved keywords on their own line (bare node definition)
    if (strippedLine && !/[>|]/.test(strippedLine)) {
      const bareTokens2 = strippedLine.split(/[\s&]+/).filter(Boolean);
      for (const tok of bareTokens2) {
        if (reservedPattern.test(tok) && /^[A-Za-z]+$/.test(tok)) {
          errors.push(`Line ${lineNum}: standalone node ID "${tok}" is a reserved Mermaid keyword — rename this node`);
        }
        reservedPattern.lastIndex = 0; // reset stateful regex
      }
    }

    // -------------------------------------------------------------------
    // Check 2: Special characters inside square-bracket node labels [...].
    // The label text must not contain unquoted [ ] ( ) { } / characters.
    // Safe form: nodeId["label text here"]
    // -------------------------------------------------------------------
    // Find all [...] label blocks on the line
    const sqLabelRe = /\[([^\]]*)\]/g;
    while ((m = sqLabelRe.exec(line)) !== null) {
      const label = m[1];
      // If the label starts with a double-quote, it is a quoted label — safe to skip.
      // (The regex may clip at an inner ] so we can't rely on it ending with a quote.)
      if (label.trimStart().startsWith('"')) continue;
      // Otherwise flag any dangerous characters inside
      if (/[[()/{}\]]/.test(label)) {
        errors.push(
          `Line ${lineNum}: node label [${label}] contains special chars ([ ] ( ) { } /) — wrap entire label in double quotes`,
        );
      }
    }

    // -------------------------------------------------------------------
    // Check 3: Special characters inside arrow pipe labels -->|label|.
    // Labels between | | must not contain ( ) [ ] { } — they confuse the
    // Mermaid shape parser.
    // -------------------------------------------------------------------
    const arrowLabelRe = /--[->ox~]*\|([^|]*)\|/g;
    while ((m = arrowLabelRe.exec(line)) !== null) {
      const label = m[1];
      if (/[()[\]{}]/.test(label)) {
        errors.push(
          `Line ${lineNum}: arrow label "|${label}|" contains special chars (( ) [ ] { }) — remove or simplify the label`,
        );
      }
    }

    // -------------------------------------------------------------------
    // Check 4: Old-style "-- text -->" labeled arrow syntax.
    // -------------------------------------------------------------------
    if (/--\s+\S[^-]*\s+-->/.test(line)) {
      errors.push(`Line ${lineNum}: use "-->|label|" syntax instead of "-- label -->" for labeled arrows`);
    }

    // -------------------------------------------------------------------
    // Check 5: Curly braces { } in class diagram member lines.
    // Return types like ": {ok: boolean}" cause a parse error in classDiagram.
    // -------------------------------------------------------------------
    if (isClassDiagram && /[{}]/.test(line) && !trimmed.startsWith("class ") && !trimmed.startsWith("%%")) {
      errors.push(`Line ${lineNum}: class diagram member contains "{ }" — simplify return type or remove braces`);
    }

    // -------------------------------------------------------------------
    // Check 6: Unclosed double-quote in a label.
    // -------------------------------------------------------------------
    const quoteCount = (line.match(/"/g) || []).length;
    if (quoteCount % 2 !== 0) {
      errors.push(`Line ${lineNum}: odd number of double-quotes — possible unclosed label`);
    }

    // -------------------------------------------------------------------
    // Check 7: Raw & or # outside of quoted strings.
    // -------------------------------------------------------------------
    const unquotedLine = line.replace(/"[^"]*"/g, '""');
    if (/[&#]/.test(unquotedLine)) {
      errors.push(`Line ${lineNum}: unquoted "&" or "#" in label — wrap label in double quotes`);
    }
  }

  return errors;
}

/**
 * Call Gemini with a targeted prompt to fix only the broken diagrams.
 * @param {string} spec - full spec markdown
 * @param {Array} mermaidErrors - current round's errors: [{ diagramIndex, content, errors[] }]
 * @param {Array} errorHistory - all prior rounds: [{ attempt, mermaidErrors[] }]
 * Returns the spec with fixed diagrams substituted back in.
 */
async function fixMermaidErrors(spec, mermaidErrors, errorHistory = []) {
  const blocks = extractMermaidBlocks(spec);

  // Build a prompt that shows only the broken diagrams + their errors
  const brokenSections = mermaidErrors.map(({ diagramIndex, content, errors }) => {
    return [
      `### Diagram ${diagramIndex + 1}`,
      "",
      "**Errors found in this attempt:**",
      errors.map((e) => `- ${e}`).join("\n"),
      "",
      "**Current (broken) Mermaid code:**",
      "```mermaid",
      content.trimEnd(),
      "```",
    ].join("\n");
  });

  // Summarise errors from recent prior attempts so Gemini sees what it got wrong before.
  // Cap at the last 3 attempts to keep the prompt from growing unboundedly.
  const MAX_HISTORY_ENTRIES = 3;
  const priorAttemptSummary = errorHistory
    .slice(0, -1)                          // exclude the current (last) attempt
    .slice(-MAX_HISTORY_ENTRIES);          // keep only the most recent N entries
  const historySection = priorAttemptSummary.length > 0
    ? [
        `## Prior fix attempts — last ${priorAttemptSummary.length} shown (DO NOT repeat these mistakes)`,
        "",
        ...priorAttemptSummary.map(({ attempt, mermaidErrors: prevErrors }) =>
          [
            `### Attempt ${attempt} errors`,
            ...prevErrors.flatMap(({ diagramIndex, errors }) =>
              errors.map((e) => `- Diagram ${diagramIndex + 1}: ${e}`),
            ),
          ].join("\n"),
        ),
        "",
      ]
    : [];

  const fixPrompt = [
    "You are fixing broken Mermaid diagrams in a development specification.",
    "Return ONLY the corrected Mermaid diagrams — one per section, in the same order as shown below.",
    "Do not add any prose, explanations, or extra text.",
    "",
    "## Rules (strictly enforce every rule — previous attempts violated them)",
    "- Always use `flowchart TB` — never `flowchart LR`",
    "- Node IDs must be alphanumeric with underscores only — NO hyphens, NO slashes, NO dots",
    "  WRONG: `dish-detail`, `app/config`, `dish.tsx`  RIGHT: `dish_detail`, `app_config`, `dish_tsx`",
    "- NEVER put file paths or route strings in node IDs or labels. Use short descriptive aliases.",
    "  WRONG: `dish_dishId_tsx[dish/[dishId].tsx]`  RIGHT: `dish_detail[dish detail]`",
    "  WRONG: `restaurant-edit-dish/[dishId].tsx`    RIGHT: `edit_dish_screen`",
    "- NEVER use TypeScript array notation `Type[]` in node labels or arrow labels — the `[]` breaks the parser.",
    "  WRONG: `-->|DinerFavoriteListItem[] with note|`  RIGHT: `-->|DinerFavoriteListItem list with note|`",
    "  WRONG: `lib[IngredientFormRow[]]`               RIGHT: `lib[IngredientFormRow list]` or `lib[\"IngredientFormRow list\"]`",
    "- Never use `()`, `[]`, `{}`, `/`, or `<>` inside unquoted node label text — wrap in double quotes if needed",
    "- Arrow pipe labels `-->|label|` must NOT contain `()`, `[]`, or `{}` — simplify or remove them",
    "- Always use `-->|label|` for labeled arrows — never `-- label -->`",
    "- Never use reserved keywords (`end`, `subgraph`, `style`, `classDef`) as bare node IDs",
    "- In classDiagram, member return types must not use `{` or `}` — write `map` or `object` instead",
    "",
    ...historySection,
    "## Diagrams to fix",
    "",
    brokenSections.join("\n\n"),
    "",
    "## Output format",
    "Return one fenced Mermaid block per diagram, in order, with no other text:",
    "```mermaid",
    "flowchart TB",
    "...",
    "```",
  ].join("\n");

  const fixedText = await callGemini(fixPrompt);

  // Extract the fixed diagrams from the response
  const fixedBlocks = [];
  const fixedRe = /```mermaid\s*\n([\s\S]*?)```/g;
  let fm;
  while ((fm = fixedRe.exec(fixedText)) !== null) {
    fixedBlocks.push(fm[0]); // full fenced block including backticks
  }

  if (fixedBlocks.length !== mermaidErrors.length) {
    process.stdout.write(
      `Warning: expected ${mermaidErrors.length} fixed diagram(s), got ${fixedBlocks.length}. Skipping replacement.\n`,
    );
    return spec;
  }

  // Replace broken diagrams in spec with fixed versions (process in reverse order to preserve offsets)
  const errorIndices = mermaidErrors.map((e) => e.diagramIndex);
  let result = spec;

  // Rebuild by replacing matching blocks; work backwards to keep indices stable
  for (let i = errorIndices.length - 1; i >= 0; i--) {
    const diagIdx = errorIndices[i];
    const originalBlock = blocks[diagIdx];
    if (!originalBlock) continue;
    result =
      result.slice(0, originalBlock.start) +
      fixedBlocks[i] +
      result.slice(originalBlock.end);
  }

  return result;
}

// ---------------------------------------------------------------------------
// Gemini API calls (mirrors llmReview.mjs)
// ---------------------------------------------------------------------------

async function callGemini(prompt) {
  if (process.env.GEMINI_API_KEY) return callGeminiApi(prompt);
  if (process.env.GCP_PROJECT) {
    const accessToken =
      process.env.GCP_ACCESS_TOKEN || (await getServiceAccountAccessToken());
    if (!accessToken) throw new Error("Missing Google Cloud auth.");
    process.env.GCP_ACCESS_TOKEN = accessToken;
    return callVertexGemini(prompt);
  }
  throw new Error("Missing Gemini credentials. Set GEMINI_API_KEY or GCP_PROJECT.");
}

async function callGeminiApi(prompt) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${DEFAULT_MODEL}:generateContent?key=${encodeURIComponent(process.env.GEMINI_API_KEY)}`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.2 },
    }),
  });
  return extractText(await parseResponse(response, "Gemini API"));
}

async function callVertexGemini(prompt) {
  const location = process.env.VERTEX_LOCATION || "us-central1";
  const endpoint = `https://${location}-aiplatform.googleapis.com/v1/projects/${encodeURIComponent(process.env.GCP_PROJECT)}/locations/${encodeURIComponent(location)}/publishers/google/models/${DEFAULT_MODEL}:generateContent`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.GCP_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.2 },
    }),
  });
  return extractText(await parseResponse(response, "Vertex AI"));
}

async function parseResponse(response, provider) {
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(`${provider} request failed with ${response.status}: ${JSON.stringify(payload)}`);
  }
  return payload;
}

function extractText(payload) {
  const text = payload?.candidates?.[0]?.content?.parts
    ?.map((p) => p.text || "")
    .join("")
    .trim();
  if (!text) throw new Error("Gemini returned no text content.");
  // Strip markdown code fences if the model wrapped the whole output
  const fenced = text.match(/^```(?:markdown)?\s*([\s\S]*?)```\s*$/i);
  return fenced ? fenced[1].trim() : text;
}

async function getServiceAccountAccessToken() {
  if (!process.env.GCP_CREDENTIALS_JSON) return "";
  const credentials = JSON.parse(process.env.GCP_CREDENTIALS_JSON);
  const now = Math.floor(Date.now() / 1000);
  const tokenUri = credentials.token_uri || "https://oauth2.googleapis.com/token";
  const scope = "https://www.googleapis.com/auth/cloud-platform";
  const assertion = signJwt(
    { iss: credentials.client_email, sub: credentials.client_email, aud: tokenUri, iat: now, exp: now + 3600, scope },
    credentials.private_key,
  );
  const body = new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion });
  const response = await fetch(tokenUri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(`OAuth token exchange failed: ${JSON.stringify(payload)}`);
  return payload.access_token || "";
}

function signJwt(claims, privateKeyPem) {
  const header = { alg: "RS256", typ: "JWT" };
  const enc = (v) => base64UrlEncode(JSON.stringify(v));
  const signer = crypto.createSign("RSA-SHA256");
  signer.update(`${enc(header)}.${enc(claims)}`);
  signer.end();
  return `${enc(header)}.${enc(claims)}.${base64UrlEncode(signer.sign(privateKeyPem))}`;
}

function base64UrlEncode(value) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

main().catch((err) => {
  process.stderr.write(`${err.stack || err.message}\n`);
  process.exitCode = 1;
});
