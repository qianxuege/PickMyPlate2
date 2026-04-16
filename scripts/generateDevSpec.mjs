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

  const specMarkdown = await callGemini(prompt);

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
      `Look for "Primary Owner" and "Secondary Owner" lines to populate Section 1.`,
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
