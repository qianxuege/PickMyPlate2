import fs from "node:fs/promises";
import crypto from "node:crypto";

const MAX_DIFF_CHARS = 120000;
const DEFAULT_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const REVIEW_JSON_PATH = process.env.REVIEW_JSON_PATH || "llm-review.json";
const REVIEW_MARKDOWN_PATH =
  process.env.REVIEW_MARKDOWN_PATH || "llm-review.md";
const COMMENT_MARKER = "<!-- llm-review-comment -->";

async function main() {
  const diffPath = process.env.PR_DIFF_PATH;
  if (!diffPath) {
    throw new Error("PR_DIFF_PATH is required.");
  }

  const diff = await fs.readFile(diffPath, "utf8");
  const prompt = buildPrompt(diff);
  const rawResponse = await callGemini(prompt);
  const review = normalizeReview(parseJsonResponse(rawResponse));

  await fs.writeFile(REVIEW_JSON_PATH, JSON.stringify(review, null, 2));
  await fs.writeFile(REVIEW_MARKDOWN_PATH, renderMarkdown(review));

  process.stdout.write(
    `Saved review outputs to ${REVIEW_JSON_PATH} and ${REVIEW_MARKDOWN_PATH}.\n`,
  );
}

function buildPrompt(diff) {
  const metadata = {
    prNumber: process.env.PR_NUMBER || "",
    prTitle: process.env.PR_TITLE || "",
    prBody: process.env.PR_BODY || "",
    prUrl: process.env.PR_URL || "",
    baseRef: process.env.BASE_REF || "",
    headRef: process.env.HEAD_REF || "",
    changedFiles: process.env.CHANGED_FILES || "",
  };

  const normalizedDiff = diff.trim();
  const truncated =
    normalizedDiff.length > MAX_DIFF_CHARS
      ? `${normalizedDiff.slice(0, MAX_DIFF_CHARS)}\n\n[diff truncated for token limits]`
      : normalizedDiff;

  return `
You are reviewing a GitHub pull request for PickMyPlate.
Your review is advisory only. Humans still decide whether to merge.

Focus only on the highest-value concerns:
- correctness bugs
- behavioral regressions
- security or privacy issues
- broken edge cases
- missing or insufficient tests for risky changes

Do not praise the code. Do not restate the diff.
Do not invent files or line numbers.
If there are no material issues, return an empty findings array.

Return strict JSON matching this schema:
{
  "summary": "one short paragraph",
  "risk": "low" | "medium" | "high",
  "findings": [
    {
      "severity": "low" | "medium" | "high",
      "file": "repo-relative path or empty string if unknown",
      "issue": "specific problem",
      "suggestion": "specific fix or mitigation"
    }
  ],
  "testing": [
    "short recommendation or gap"
  ]
}

Pull request metadata:
${JSON.stringify(metadata, null, 2)}

Unified diff:
${truncated}
`.trim();
}

async function callGemini(prompt) {
  if (process.env.GEMINI_API_KEY) {
    return callGeminiApi(prompt);
  }

  if (process.env.GCP_PROJECT) {
    const accessToken =
      process.env.GCP_ACCESS_TOKEN || (await getServiceAccountAccessToken());
    if (!accessToken) {
      throw new Error(
        "Missing Google Cloud auth. Set GCP_ACCESS_TOKEN or GCP_CREDENTIALS_JSON with GCP_PROJECT.",
      );
    }

    process.env.GCP_ACCESS_TOKEN = accessToken;
    return callVertexGemini(prompt);
  }

  throw new Error(
    "Missing Gemini credentials. Set GEMINI_API_KEY or GCP_ACCESS_TOKEN with GCP_PROJECT.",
  );
}

async function callGeminiApi(prompt) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${DEFAULT_MODEL}:generateContent?key=${encodeURIComponent(process.env.GEMINI_API_KEY)}`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: "application/json",
      },
    }),
  });

  return parseModelResponse(response, "Gemini API");
}

async function callVertexGemini(prompt) {
  const location = process.env.VERTEX_LOCATION || "us-central1";
  const endpoint = `https://${location}-aiplatform.googleapis.com/v1/projects/${encodeURIComponent(
    process.env.GCP_PROJECT,
  )}/locations/${encodeURIComponent(location)}/publishers/google/models/${DEFAULT_MODEL}:generateContent`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.GCP_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: "application/json",
      },
    }),
  });

  return parseModelResponse(response, "Vertex AI");
}

async function getServiceAccountAccessToken() {
  if (!process.env.GCP_CREDENTIALS_JSON) {
    return "";
  }

  const credentials = JSON.parse(process.env.GCP_CREDENTIALS_JSON);
  const now = Math.floor(Date.now() / 1000);
  const tokenUri = credentials.token_uri || "https://oauth2.googleapis.com/token";
  const scope = "https://www.googleapis.com/auth/cloud-platform";

  const assertion = signJwt({
    iss: credentials.client_email,
    sub: credentials.client_email,
    aud: tokenUri,
    iat: now,
    exp: now + 3600,
    scope,
  }, credentials.private_key);

  const body = new URLSearchParams({
    grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    assertion,
  });

  const response = await fetch(tokenUri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(
      `OAuth token exchange failed with ${response.status}: ${JSON.stringify(payload)}`,
    );
  }

  return payload.access_token || "";
}

function signJwt(claims, privateKeyPem) {
  const header = { alg: "RS256", typ: "JWT" };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedClaims = base64UrlEncode(JSON.stringify(claims));
  const signer = crypto.createSign("RSA-SHA256");
  signer.update(`${encodedHeader}.${encodedClaims}`);
  signer.end();
  const signature = signer.sign(privateKeyPem);
  return `${encodedHeader}.${encodedClaims}.${base64UrlEncode(signature)}`;
}

function base64UrlEncode(value) {
  const buffer = Buffer.isBuffer(value) ? value : Buffer.from(value);
  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

async function parseModelResponse(response, provider) {
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(
      `${provider} request failed with ${response.status}: ${JSON.stringify(payload)}`,
    );
  }

  const text = payload?.candidates?.[0]?.content?.parts
    ?.map((part) => part.text || "")
    .join("")
    .trim();

  if (!text) {
    throw new Error(`${provider} returned no text content.`);
  }

  return text;
}

function parseJsonResponse(rawResponse) {
  const fenced = rawResponse.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fenced ? fenced[1] : rawResponse).trim();

  // First attempt: parse as-is (works when the model returns clean JSON).
  try {
    return JSON.parse(candidate);
  } catch {
    // gemini-2.5-pro sometimes emits invalid JSON escape sequences such as \w or \d
    // (from regex patterns or Windows-style paths in the diff) even with
    // responseMimeType:"application/json" set.
    // Sanitize by escaping lone backslashes not part of a valid JSON escape sequence.
    // Valid JSON escapes after \: " \ / b f n r t u{4hex}
    const sanitized = candidate.replace(
      /\\(?!["\\\/bfnrt]|u[0-9a-fA-F]{4})/g,
      "\\\\",
    );
    return JSON.parse(sanitized);
  }
}

function normalizeReview(review) {
  return {
    summary: typeof review.summary === "string" ? review.summary.trim() : "",
    risk: normalizeEnum(review.risk, ["low", "medium", "high"], "medium"),
    findings: Array.isArray(review.findings)
      ? review.findings.map((finding) => ({
          severity: normalizeEnum(
            finding?.severity,
            ["low", "medium", "high"],
            "medium",
          ),
          file: typeof finding?.file === "string" ? finding.file.trim() : "",
          issue: typeof finding?.issue === "string" ? finding.issue.trim() : "",
          suggestion:
            typeof finding?.suggestion === "string"
              ? finding.suggestion.trim()
              : "",
        }))
      : [],
    testing: Array.isArray(review.testing)
      ? review.testing
          .filter((item) => typeof item === "string")
          .map((item) => item.trim())
          .filter(Boolean)
      : [],
  };
}

function normalizeEnum(value, allowed, fallback) {
  return allowed.includes(value) ? value : fallback;
}

function renderMarkdown(review) {
  const lines = [
    COMMENT_MARKER,
    "## LLM Review",
    "",
    `**Risk:** ${capitalize(review.risk)}`,
    "",
    review.summary || "No summary was returned.",
    "",
  ];

  if (review.findings.length === 0) {
    lines.push("### Findings", "", "No material issues were identified.", "");
  } else {
    lines.push("### Findings", "");
    review.findings.forEach((finding, index) => {
      const fileSuffix = finding.file ? ` (${finding.file})` : "";
      lines.push(
        `${index + 1}. **${capitalize(finding.severity)}**${fileSuffix}: ${finding.issue}`,
      );
      if (finding.suggestion) {
        lines.push(`   Suggestion: ${finding.suggestion}`);
      }
    });
    lines.push("");
  }

  if (review.testing.length > 0) {
    lines.push("### Testing", "");
    review.testing.forEach((item) => {
      lines.push(`- ${item}`);
    });
    lines.push("");
  }

  lines.push(
    "_Automated Gemini review. Human approval is still required before merge._",
  );

  return `${lines.join("\n")}\n`;
}

function capitalize(value) {
  return value ? `${value[0].toUpperCase()}${value.slice(1)}` : "";
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exitCode = 1;
});
