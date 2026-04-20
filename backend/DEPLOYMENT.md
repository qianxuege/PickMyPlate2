# Backend Deployment — Google Cloud Run

This guide covers deploying the Flask backend to **Google Cloud Run** from scratch, plus how to redeploy after code changes and how a teammate can deploy to their own GCP project.

---

## Prerequisites

Install once on your machine:

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (only needed for local image testing)
- [Google Cloud CLI](https://cloud.google.com/sdk/docs/install) (`gcloud`)
- An active GCP project with **billing enabled**
- An Apple-style willingness to wait 3–8 min for builds

---

## What's already in the repo

| File | Purpose |
|------|---------|
| `backend/Dockerfile` | `python:3.11-slim` base, installs `requirements.txt`, runs `python app.py` |
| `backend/.dockerignore` | Excludes `.venv`, `__pycache__`, `*.json` (so the local SA key never lands in the image), `.env` |
| `backend/app.py` | Reads `PORT` from env and binds to `0.0.0.0` — Cloud Run requirement |

You don't need to touch these files unless you change the runtime, dependencies, or startup command.

---

## One-time GCP setup

Run these once per GCP project. A teammate deploying to their own project just substitutes `<YOUR_PROJECT_ID>`.

```bash
# 1. Authenticate
gcloud auth login
gcloud auth application-default login

# 2. Set the active project
gcloud config set project <YOUR_PROJECT_ID>

# 3. Enable required APIs
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  aiplatform.googleapis.com \
  vision.googleapis.com
```

### Service account

Cloud Run needs a service account that can call **Vertex AI** (Gemini + Imagen) and **Cloud Vision**. Create one or reuse the existing one.

```bash
# Create (skip if reusing)
gcloud iam service-accounts create pickmyplate-backend \
  --display-name="PickMyPlate Backend (Cloud Run)"

# Grant required roles
SA="pickmyplate-backend@<YOUR_PROJECT_ID>.iam.gserviceaccount.com"

gcloud projects add-iam-policy-binding <YOUR_PROJECT_ID> \
  --member="serviceAccount:$SA" \
  --role="roles/aiplatform.user"

gcloud projects add-iam-policy-binding <YOUR_PROJECT_ID> \
  --member="serviceAccount:$SA" \
  --role="roles/vision.user"
```

> **No JSON key file needed.** Cloud Run authenticates the service account automatically via Application Default Credentials. The local `pickmyplate-491303-43467a8ebb59.json` is for local dev only and is excluded from the image by `.dockerignore`.

---

## First deployment

From the **repo root**:

```bash
gcloud run deploy pickmyplate-backend \
  --source backend \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --service-account pickmyplate-backend@<YOUR_PROJECT_ID>.iam.gserviceaccount.com \
  --set-env-vars MOCK_MENU_PARSE=1,FLASK_DEBUG=0
```

What this does:
- Uploads the `backend/` directory to **Cloud Build**
- Builds the Docker image and pushes it to **Artifact Registry** (auto-created)
- Deploys a new revision to **Cloud Run** in `us-central1`
- Returns a public HTTPS URL like `https://pickmyplate-backend-xxxxx-uc.a.run.app`

Verify:
```bash
curl https://pickmyplate-backend-xxxxx-uc.a.run.app/health
# {"status":"ok"}
```

---

## Setting real environment variables

Mock mode (`MOCK_MENU_PARSE=1`) is only useful for the first smoke test. Switch to the real pipeline:

### Non-secret values

```bash
gcloud run services update pickmyplate-backend \
  --region us-central1 \
  --update-env-vars MOCK_MENU_PARSE=0,GCP_PROJECT=<YOUR_PROJECT_ID>,VERTEX_LOCATION=us-central1,REQUIRE_AUTH=1
```

### Secrets (recommended path: Secret Manager)

```bash
# Store each secret once
echo -n "<paste-supabase-service-role-key>" | gcloud secrets create SUPABASE_SERVICE_ROLE_KEY --data-file=-
echo -n "<paste-supabase-jwt-secret>"        | gcloud secrets create SUPABASE_JWT_SECRET        --data-file=-
echo -n "https://YOUR_PROJECT.supabase.co"   | gcloud secrets create SUPABASE_URL               --data-file=-

# Grant the Cloud Run SA access to read them
SA="pickmyplate-backend@<YOUR_PROJECT_ID>.iam.gserviceaccount.com"
for s in SUPABASE_SERVICE_ROLE_KEY SUPABASE_JWT_SECRET SUPABASE_URL; do
  gcloud secrets add-iam-policy-binding "$s" \
    --member="serviceAccount:$SA" \
    --role="roles/secretmanager.secretAccessor"
done

# Mount them as env vars on the service
gcloud run services update pickmyplate-backend \
  --region us-central1 \
  --update-secrets SUPABASE_SERVICE_ROLE_KEY=SUPABASE_SERVICE_ROLE_KEY:latest,SUPABASE_JWT_SECRET=SUPABASE_JWT_SECRET:latest,SUPABASE_URL=SUPABASE_URL:latest
```

### Quick-and-dirty path (env vars only — fine for early dev)

```bash
gcloud run services update pickmyplate-backend \
  --region us-central1 \
  --update-env-vars SUPABASE_URL=https://...,SUPABASE_SERVICE_ROLE_KEY=...,SUPABASE_JWT_SECRET=...
```

> Avoid this in production — env vars are visible to anyone with `roles/run.viewer`.

---

## Redeploying after code changes

Just re-run the deploy command. Cloud Run keeps the previous revision around and shifts traffic instantly:

```bash
gcloud run deploy pickmyplate-backend \
  --source backend \
  --region us-central1
```

Existing env vars and the service account stay attached — you don't need to re-pass them.

To roll back:
```bash
gcloud run services update-traffic pickmyplate-backend \
  --region us-central1 \
  --to-revisions <PREVIOUS_REVISION_NAME>=100
```
Find revision names with `gcloud run revisions list --service pickmyplate-backend --region us-central1`.

---

## Pointing the Expo app at the new backend

Update the Expo env var (locally `.env`, plus EAS secret for TestFlight builds):

```bash
EXPO_PUBLIC_MENU_API_URL=https://pickmyplate-backend-xxxxx-uc.a.run.app
```

EAS secret:
```bash
eas secret:create --scope project --name EXPO_PUBLIC_MENU_API_URL --value "https://..."
```

---

## Teammate deploying to their own GCP project

The doc above already supports this — every command uses `<YOUR_PROJECT_ID>`. Concretely the teammate needs to:

1. Create their own GCP project, enable billing
2. Run the **One-time GCP setup** section against their project
3. Either:
   - **Share Supabase** with you (use the same `SUPABASE_URL` / keys / JWT secret) so both backends talk to the same database, **or**
   - Spin up their own Supabase project, run the migrations (`npx supabase db push`), and use those credentials
4. Run the **First deployment** command
5. Set env vars per **Setting real environment variables**
6. Send the URL to whoever owns the Expo app config (or set their own `EXPO_PUBLIC_MENU_API_URL`)

No code changes required — the deployment is fully driven by `backend/Dockerfile` and the `gcloud run deploy` command.

---

## Useful commands

```bash
# Tail logs
gcloud run services logs tail pickmyplate-backend --region us-central1

# View current config
gcloud run services describe pickmyplate-backend --region us-central1

# List revisions
gcloud run revisions list --service pickmyplate-backend --region us-central1

# Delete the service entirely (be careful)
gcloud run services delete pickmyplate-backend --region us-central1
```

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| Build fails with "permission denied" on Artifact Registry | First-time deploy in this project | Re-run `gcloud services enable artifactregistry.googleapis.com` and retry — gcloud auto-creates the repo |
| `/v1/parse-menu` returns 500 with Vertex error | Service account missing `roles/aiplatform.user` | Re-run the role binding from **Service account** section |
| `/v1/parse-menu` works but OCR fails | Cloud Vision API not enabled | `gcloud services enable vision.googleapis.com` |
| App can't reach the URL from device | Service deployed without `--allow-unauthenticated` | Re-run deploy with that flag, or `gcloud run services add-iam-policy-binding pickmyplate-backend --member=allUsers --role=roles/run.invoker --region us-central1` |
| Env var change didn't take effect | Cloud Run caches; new revision not deployed | `gcloud run services update` deploys a new revision automatically — wait ~30s |
