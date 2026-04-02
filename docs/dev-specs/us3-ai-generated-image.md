# US3: AI Generated Dish Image

## Owners

- Primary owner: Sofia
- Secondary owner: Yano

## Merge Date

- Merged into `main`: Mar 25, 2026

## Architecture Diagram in Mermaid

```mermaid
flowchart TB
  subgraph Client["Client"]
    DishDetail["Diner Dish Detail Screen\napp/dish/[dishId].tsx\nShows image or placeholder\nLets user trigger AI image generation"]
    DishImageApi["Dish Image API Client\nlib/dish-image-api.ts\nCalls Flask generate-image endpoint"]
    SupabaseClient["Supabase JS Client\nlib/supabase.ts\nReads dish row and auth session"]
  end

  subgraph Server["Server"]
    FlaskRoute["Flask US3 Route\nbackend/app.py\nPOST /v1/dishes/:dishId/generate-image\nAuth + cache check + orchestration"]
    StorageService["Supabase Admin Storage Service\nbackend/storage_supabase.py\nCheck object existence\nUpload generated image"]
    VertexService["Vertex Image Service\nbackend/image_generate_vertex.py\nBuild prompt and request image bytes"]
  end

  subgraph Cloud["Cloud / Storage"]
    DishTable["Supabase Postgres\npublic.diner_scanned_dishes\nStores image_url metadata"]
    DishBucket["Supabase Storage Bucket\ndish-images\nStores generated image files"]
  end

  subgraph External["Third-Party External API / Service"]
    VertexImagen["Google Vertex AI Imagen\nGenerates dish image"]
  end

  DishDetail --> DishImageApi
  DishDetail --> SupabaseClient
  DishImageApi --> FlaskRoute
  SupabaseClient --> DishTable

  FlaskRoute --> DishTable
  FlaskRoute --> StorageService
  FlaskRoute --> VertexService

  StorageService --> DishBucket
  VertexService --> VertexImagen
```

## Information Flow Diagram

This diagram focuses on the diner-side US3 data path for generating an AI dish image. It shows the user information and application data that move between the real repository components involved in image lookup, prompt construction, generation, storage, and UI update.

```mermaid
flowchart LR
  User["User"]
  DishDetail["Diner Dish Detail Screen\napp/dish/[dishId].tsx"]
  SupabaseClient["Supabase JS Client\nlib/supabase.ts"]
  DishImageApi["Dish Image API Client\nlib/dish-image-api.ts"]
  FlaskRoute["Flask Route\nPOST /v1/dishes/:dishId/generate-image\nbackend/app.py"]
  DishTable["Supabase Postgres\npublic.diner_scanned_dishes"]
  SectionTable["Supabase Postgres\npublic.diner_menu_sections"]
  ScanTable["Supabase Postgres\npublic.diner_menu_scans"]
  StorageService["Supabase Admin Storage Helpers\nbackend/storage_supabase.py"]
  DishBucket["Supabase Storage Bucket\ndish-images"]
  VertexService["Vertex Prompt + Image Service\nbackend/image_generate_vertex.py"]
  VertexImagen["Google Vertex AI Imagen"]

  User -->|Tap View AI Image for selected dish| DishDetail

  DishDetail -->|Read dish query: dishId| SupabaseClient
  SupabaseClient -->|SELECT id, section_id, name, description, price_amount, price_currency, price_display, spice_level, tags, ingredients, image_url| DishTable
  DishTable -->|Dish metadata + persisted image_url| SupabaseClient
  SupabaseClient -->|Optional lookup: section_id -> scan_id| SectionTable
  SectionTable -->|scan_id| SupabaseClient
  SupabaseClient -->|Optional lookup: scan_id -> restaurant_name| ScanTable
  ScanTable -->|restaurant_name| SupabaseClient
  SupabaseClient -->|Dish detail state: id, name, description, ingredients, imageUrl, restaurantName| DishDetail

  DishDetail -->|Generate request: dishId| DishImageApi
  DishImageApi -->|Get current session| SupabaseClient
  SupabaseClient -->|Session access_token| DishImageApi
  DishImageApi -->|POST /v1/dishes/:dishId/generate-image Headers: Authorization Bearer token| FlaskRoute

  FlaskRoute -->|SELECT id, section_id, name, description, ingredients, image_url| DishTable
  DishTable -->|Dish record for selected dishId| FlaskRoute
  FlaskRoute -->|SELECT scan_id by section_id| SectionTable
  SectionTable -->|scan_id| FlaskRoute
  FlaskRoute -->|SELECT profile_id, restaurant_name by scan_id| ScanTable
  ScanTable -->|Ownership metadata + restaurant_name| FlaskRoute

  FlaskRoute -->|Cache check: existing image_url| DishTable
  DishTable -->|existing image_url or null| FlaskRoute

  FlaskRoute -->|Check object exists: bucket=dish-images, path=<dish_id>.png| StorageService
  StorageService -->|Lookup object path| DishBucket
  DishBucket -->|Object exists / not found| StorageService
  StorageService -->|Cache result| FlaskRoute

  FlaskRoute -->|Prompt inputs: dish_name, description, ingredients, restaurant_name| VertexService
  VertexService -->|Prompt text| VertexImagen
  VertexImagen -->|Generated image bytes| VertexService
  VertexService -->|image_bytes| FlaskRoute

  FlaskRoute -->|Upload image bytes to bucket path <dish_id>.png| StorageService
  StorageService -->|Write object bytes + content_type image/png| DishBucket
  DishBucket -->|Public object URL| StorageService
  StorageService -->|public_url| FlaskRoute

  FlaskRoute -->|UPDATE image_url = public_url WHERE id = dish_id| DishTable
  DishTable -->|Persisted image_url| FlaskRoute

  FlaskRoute -->|JSON response: ok, image_url, cached| DishImageApi
  DishImageApi -->|imageUrl result or error| DishDetail
  DishDetail -->|Updated hero image URL rendered to user| User
```

- User information in this flow is limited to the authenticated session bearer token and ownership linkage through `diner_menu_scans.profile_id`; the feature does not send diner preference data into the image generation request.
- Application data flowing through US3 includes `dishId`, `section_id`, `scan_id`, `name`, `description`, `ingredients`, `restaurant_name`, cached `image_url`, storage path `<dish_id>.png`, generated image bytes, returned public URL, and the final `{ ok, image_url, cached }` response.
- The backend has two cache checks before generation: first the persisted `diner_scanned_dishes.image_url`, then the presence of the object in the Supabase `dish-images` bucket at `<dish_id>.png`.
- The frontend only receives the public `image_url` or an error outcome; raw image bytes never return to the client from the Flask API.

Needs Manual Verification:
- `REQUIRE_AUTH` is optional in the Flask app, so bearer-token verification is conditional on deployment configuration. The client still sends the session token when available.
