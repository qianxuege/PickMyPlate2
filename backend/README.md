# PickMyPlate Flask API

Local menu-parse service: health check, mock `ParsedMenu` response, hooks for Supabase Storage download and optional JWT verification.

## Setup

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
```

Edit `.env`:

- **`MOCK_MENU_PARSE=1`**: no Supabase/GCP needed for a quick mock menu response.
- **`MOCK_MENU_PARSE=0`**: requires Supabase (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`) to download the image, **Cloud Vision** for OCR, and **Vertex AI (Gemini)** for structured `ParsedMenu` JSON (`GCP_PROJECT`, `VERTEX_LOCATION`, `GEMINI_MODEL` optional). Enable **Vertex AI API** in the same GCP project; grant the service account `roles/aiplatform.user` (Vertex AI User).

With **`FLASK_DEBUG=1`** (default when running `python app.py`), each `/v1/parse-menu` request logs to **stderr**: the Storage bucket/path/object URL and the **full OCR text**.

## GCP: Vision OCR and an existing Vertex project

**Vertex AI** and **Cloud Vision** are different products. Turning on Vertex does **not** automatically enable Vision. Use the **same** GCP project for both; you only need to flip one more switch and point credentials at it.

1. **Open your existing project** in [Google Cloud Console](https://console.cloud.google.com/).
2. **Enable Cloud Vision API**  
   **APIs & Services → Library → search “Cloud Vision API” → Enable.**  
   (Vertex AI API can stay enabled as-is.)
3. **Billing**  
   Vision is billable after free tier; the project must have billing enabled (same as most Vertex usage).
4. **Service account** (reuse or create)  
   **IAM & Admin → Service Accounts** → pick the account you use for Vertex, or create one.  
   Grant a role that can call Vision, e.g. **Cloud Vision AI User** (`roles/vision.user`), or for dev only a broader role like **Editor** (tighter in production).
5. **JSON key**  
   **Service account → Keys → Add key → JSON** → download and store outside git.  
   Set in `backend/.env`:
   ```bash
   GOOGLE_APPLICATION_CREDENTIALS=/absolute/path/to/your-key.json
   ```
   The Python client (`google-cloud-vision`) uses **Application Default Credentials** via this env var—no extra secret file inside the repo. **Pillow** (installed via `requirements.txt`) decodes each download, applies EXIF orientation, optionally downscales very large images, and re-encodes to baseline JPEG before Vision so valid Supabase files are less likely to hit `Bad image data` from the Vision API.
6. **Restart Flask** after changing `.env`.

**Vertex (Gemini)** uses the **same** project and service account as Vision; attach **`Vertex AI User`** (`roles/aiplatform.user`) if not already present.

### LLM strategy (`MENU_LLM_STRATEGY`)

- **`text_first`** (default): one Gemini call with **OCR text + user preferences** only; if the JSON is invalid or has no dishes, a **second** call sends **text + menu image** (better for messy OCR, lower cost when text is enough).
- **`multimodal_always`**: a single call with OCR text **and** the image (strongest layout signal, higher token cost).
- **`text_only`**: text only, no image (cheapest; no automatic retry).
- **`image_only`**: skips OCR and sends **image + user preferences** only (fastest; depends on image text readability).

Output is validated server-side to match `lib/menu-scan-schema.ts` (schema v1) so the Expo client can insert `diner_menu_scans` → `diner_menu_sections` → `diner_scanned_dishes`.

## Run

```bash
python app.py
```

Defaults: `http://0.0.0.0:8080`, `FLASK_DEBUG=1`.

## Endpoints

| Method | Path | Description |
| ------ | ---- | ----------- |
| GET | `/health` | `{ "status": "ok" }` |
| POST | `/v1/parse-menu` | See `app.py` docstring; `MOCK_MENU_PARSE=1` → mock menu; `MOCK_MENU_PARSE=0` → download → OCR → Gemini → `{ ok, menu }` |
| POST | `/v1/dishes/<dish_id>/generate-image` | Generate and persist a dish preview image if `image_url` is empty |

## Environment

| Variable | Purpose |
| -------- | ------- |
| `MOCK_MENU_PARSE` | `1` (default): skip Storage/OCR; return mock menu. `0`: download → OCR → Vertex Gemini → `ParsedMenu`. |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | Storage download when `MOCK_MENU_PARSE=0` |
| `GOOGLE_APPLICATION_CREDENTIALS` | Path to GCP service account JSON (Vision + Vertex enabled on the project). |
| `GCP_PROJECT` / `VERTEX_LOCATION` | Vertex AI (Gemini) when `MOCK_MENU_PARSE=0`. |
| `GEMINI_MODEL` | Optional; default `gemini-2.0-flash-001`. |
| `MENU_LLM_STRATEGY` | `text_first` (default), `multimodal_always`, or `text_only` — see section above. |
| `FLASK_DEBUG` | `1`: print Storage ref + OCR text + **each Gemini raw/parsed response** + **final ParsedMenu after tag allowlist** to stderr on each parse (`MOCK_MENU_PARSE=0`). |
| `SUPABASE_JWT_SECRET` + `REQUIRE_AUTH=1` | Optional Bearer JWT verification on `/v1/parse-menu` |
| `CORS_ORIGINS` | Default `*`; set to your Expo web origin in production |
| `VERTEX_IMAGE_MODEL` | Optional; default `imagen-3.0-fast-generate-001` |
| `DISH_IMAGES_BUCKET` | Optional; default `dish-images` |

## Dish image generation (US3)

Endpoint:

- `POST /v1/dishes/<dish_id>/generate-image`

Behavior:

- Returns the existing `image_url` if the dish already has one
- Otherwise generates a dish preview image from dish metadata
- Uploads the generated image to Supabase Storage
- Saves the public URL back to `diner_scanned_dishes.image_url`
- Uses Vertex AI Imagen with the existing `GOOGLE_APPLICATION_CREDENTIALS`, `GCP_PROJECT`, and `VERTEX_LOCATION`

The default storage path is:

- `dish-images/<dish_id>.png`
