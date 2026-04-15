# Automated LLM PR Review

This repository uses a GitHub Actions workflow at `.github/workflows/llm-review.yml` to run an automated Gemini review on pull requests.

## What happens

- The workflow triggers when a pull request is opened, synchronized, reopened, or marked ready for review.
- It fetches the PR diff from the GitHub API.
- It sends the diff and PR metadata to Gemini with a structured review prompt.
- It posts or updates a single PR comment titled `LLM Review`.
- It uploads `llm-review.json` and `llm-review.md` as workflow artifacts.

This makes the review repeatable and visible for teammates and instructors.

## Human judgment

Every PR runs automated LLM review. Human approval is still required.

The Gemini output is advisory. Reviewers verify whether each finding is real, decide which suggestions to apply, and make the final merge decision.

## Authentication options

The workflow supports either of these configurations:

### Option 1: Gemini API key

Add these GitHub repository secrets:

- `GEMINI_API_KEY`
- `GEMINI_MODEL` optional, defaults to `gemini-2.5-flash`

This is the fastest setup.

### Option 2: Vertex AI with Google Cloud credits via service account JSON

Add these GitHub repository secrets:

- `GCP_CREDENTIALS_JSON`
- `GCP_PROJECT`
- `VERTEX_LOCATION` optional, defaults to `us-central1`
- `GEMINI_MODEL` optional, defaults to `gemini-2.5-flash`

`GCP_CREDENTIALS_JSON` should contain the full contents of a service account key JSON file with Vertex AI access.

This path does not depend on enabling the IAM Service Account Credentials API for GitHub Actions, because the workflow exchanges the service account key for an OAuth token directly inside the review script.

### Option 3: Vertex AI with GitHub OIDC Workload Identity Federation

Add these GitHub repository secrets:

- `GCP_WORKLOAD_IDENTITY_PROVIDER`
- `GCP_SERVICE_ACCOUNT`
- `GCP_PROJECT`
- `VERTEX_LOCATION` optional, defaults to `us-central1`
- `GEMINI_MODEL` optional, defaults to `gemini-2.5-flash`

Recommended Google Cloud setup:

1. Enable the Vertex AI API in your Google Cloud project.
2. Create a service account for GitHub Actions.
3. Grant it `roles/aiplatform.user`.
4. Configure GitHub OIDC Workload Identity Federation for the repository.
5. Save the provider resource name and service account email in the GitHub secrets above.

Use this option if you want the workflow billed to your Google Cloud project and covered by your credits.

## Manual test run

After the workflow is merged to the default branch:

1. Open or update a pull request.
2. Confirm the `LLM PR Review` workflow ran in the Actions tab.
3. Confirm the PR shows an `LLM Review` bot comment.
4. Open the workflow run and verify the uploaded artifact is present.

You can also trigger the workflow manually with `workflow_dispatch` and pass a pull request number.
