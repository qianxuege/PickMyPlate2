"""
Vertex AI Gemini: generate a concise dish description (summary) for
restaurant menu editing.

Returns JSON:
  { "description": string | null }
"""

from __future__ import annotations

import json
import os
import re
from typing import Any, Sequence

_vertex_initialized = False


def _ensure_vertex() -> None:
    global _vertex_initialized
    if _vertex_initialized:
        return
    project = os.getenv("GCP_PROJECT", "").strip()
    if not project:
        raise RuntimeError("GCP_PROJECT must be set for Vertex AI dish summary generation")
    location = os.getenv("VERTEX_LOCATION", "us-central1").strip()
    import vertexai

    vertexai.init(project=project, location=location)
    _vertex_initialized = True


def _model_name() -> str:
    return os.getenv("GEMINI_MODEL", "gemini-2.0-flash-001").strip() or "gemini-2.0-flash-001"


def _json_from_model_text(text: str) -> Any:
    """
    Parse model output; strip ```json fences if present.
    (Mirrors llm_menu_vertex behavior so parsing is consistent.)
    """
    t = text.strip()
    m = re.match(r"^```(?:json)?\s*\n?(.*)\n?```\s*$", t, re.DOTALL | re.IGNORECASE)
    if m:
        t = m.group(1).strip()
    return json.loads(t)


SYSTEM_INSTRUCTION = """You are PickMyPlate's menu assistant.
Given a dish's name, ingredients, and optional restaurant context, write ONE short summary (1–2 sentences).

Hard rules:
1. Output a single JSON object only (no markdown, no extra text).
2. JSON shape must be:
   { "description": string | null }
3. description:
   - If you can infer something plausible from the inputs, write a concise 1–2 sentence description.
   - If inputs are too empty/unclear, use null.
4. Do not include disclaimers or repeated boilerplate.
5. Keep it natural for a menu detail screen.
"""


def generate_dish_description(
    *,
    dish_name: str,
    ingredients: Sequence[str] | None,
    restaurant_name: str | None,
    debug_llm: bool = False,
) -> str | None:
    """
    Generates and returns description text (or None).
    Raises RuntimeError on invalid model output.
    """
    _ensure_vertex()

    from vertexai.generative_models import GenerationConfig, GenerativeModel

    model = GenerativeModel(_model_name(), system_instruction=SYSTEM_INSTRUCTION)
    gen_cfg = GenerationConfig(
        temperature=0.3,
        response_mime_type="application/json",
    )

    ing_list: list[str] = []
    if ingredients:
        ing_list = [str(x).strip() for x in ingredients if isinstance(x, str) and str(x).strip()]

    parts: list[str] = [
        f"Dish name: {dish_name or '(unknown)'}.",
        f"Restaurant context: {restaurant_name or '(unknown)'}.",
    ]
    if ing_list:
        parts.append(f"Ingredients: {', '.join(ing_list[:12])}.")
    else:
        parts.append("Ingredients: (unknown).")

    user_message = "\n".join(parts)
    response = model.generate_content(user_message, generation_config=gen_cfg)
    if not response.candidates:
        raise RuntimeError("Gemini returned no candidates")

    text = response.text or ""
    if not text.strip():
        raise RuntimeError("Gemini returned empty text")

    parsed = _json_from_model_text(text)
    if not isinstance(parsed, dict):
        raise RuntimeError("Gemini JSON root must be an object")

    desc = parsed.get("description")
    if desc is None:
        return None
    if isinstance(desc, str):
        s = desc.strip()
        return s if s else None

    if debug_llm:
        # eslint-style: keep backend simple; no print if not debug
        pass

    return None

