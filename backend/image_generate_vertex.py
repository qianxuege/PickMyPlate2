"""
Generate dish preview images via Vertex AI Imagen.
"""

from __future__ import annotations

import os

_vertex_initialized = False


def _ensure_vertex() -> None:
    global _vertex_initialized
    if _vertex_initialized:
        return
    project = os.getenv("GCP_PROJECT", "").strip()
    if not project:
        raise RuntimeError("GCP_PROJECT must be set for Vertex AI image generation")
    location = os.getenv("VERTEX_LOCATION", "us-central1").strip()
    import vertexai

    vertexai.init(project=project, location=location)
    _vertex_initialized = True


def _image_model_name() -> str:
    return os.getenv("VERTEX_IMAGE_MODEL", "imagen-3.0-fast-generate-001").strip() or "imagen-3.0-fast-generate-001"


def build_dish_image_prompt(
    *,
    dish_name: str,
    description: str | None,
    ingredients: list[str],
    restaurant_name: str | None,
) -> str:
    parts: list[str] = [
        "Create a realistic food photo of a plated restaurant dish.",
        f"Dish name: {dish_name}.",
    ]
    if restaurant_name:
        parts.append(f"Restaurant context: {restaurant_name}.")
    if description:
        parts.append(f"Description: {description.strip()}.")
    if ingredients:
        parts.append(f"Key ingredients: {', '.join(ingredients[:6])}.")
    parts.append(
        "Style: appetizing, natural lighting, restaurant-quality plating, no text, no labels, no watermark."
    )
    return " ".join(parts)


def generate_dish_image_bytes(prompt: str) -> bytes:
    _ensure_vertex()
    from vertexai.preview.vision_models import ImageGenerationModel

    model = ImageGenerationModel.from_pretrained(_image_model_name())
    images = model.generate_images(
        prompt=prompt,
        number_of_images=1,
        aspect_ratio="1:1",
        safety_filter_level="block_some",
        person_generation="dont_allow",
    )
    if not images:
        raise RuntimeError("Vertex AI image generation returned no images")

    first = images[0]
    image_bytes = getattr(first, "_image_bytes", None)
    if isinstance(image_bytes, bytes) and image_bytes:
        return image_bytes

    try:
        return first._pil_image_to_bytes()  # type: ignore[attr-defined]
    except Exception as exc:  # pragma: no cover - SDK fallback
        raise RuntimeError("Could not extract image bytes from Vertex response") from exc
