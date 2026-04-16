"""
Vertex AI Gemini — structured ParsedMenu (schema v1) from OCR text ± menu image.

Env:
  GCP_PROJECT, VERTEX_LOCATION (default us-central1)
  GEMINI_MODEL (default gemini-2.0-flash-001)
  MENU_LLM_STRATEGY:
    - text_first (default): text-only first; if invalid or empty dishes, retry with image+text
    - multimodal_always: one call with OCR text + image
    - text_only: text only, no image (no retry)
    - image_only: skip OCR; one call with image only

Requires Vertex AI API + IAM on the same service account as Vision (GOOGLE_APPLICATION_CREDENTIALS).
"""

from __future__ import annotations

import json
import os
import re
import sys
from typing import Any

_vertex_initialized = False


def _ensure_vertex() -> None:
    global _vertex_initialized
    if _vertex_initialized:
        return
    project = os.getenv("GCP_PROJECT", "").strip()
    if not project:
        raise RuntimeError("GCP_PROJECT must be set for Vertex AI menu parsing")
    location = os.getenv("VERTEX_LOCATION", "us-central1").strip()
    import vertexai

    vertexai.init(project=project, location=location)
    _vertex_initialized = True


def _model_name() -> str:
    return os.getenv("GEMINI_MODEL", "gemini-2.0-flash-001").strip() or "gemini-2.0-flash-001"


def _strategy() -> str:
    raw = os.getenv("MENU_LLM_STRATEGY", "text_first").strip().lower()
    if raw in ("text_first", "multimodal_always", "text_only", "image_only"):
        return raw
    return "text_first"


def _json_from_model_text(text: str) -> Any:
    """Parse model output; strip ```json fences if present."""
    t = text.strip()
    m = re.match(r"^```(?:json)?\s*\n?(.*)\n?```\s*$", t, re.DOTALL | re.IGNORECASE)
    if m:
        t = m.group(1).strip()
    return json.loads(t)


SYSTEM_INSTRUCTION = """You are PickMyPlate's menu parser. Your job is to turn menu image (and optionally OCR text) into ONE JSON object. The output shape is fixed (schema_version 1) — same keys and types every time for menu content — so downstream code can parse it. Section and item "id" fields are optional (the server assigns UUIDs). Never omit required keys for titles, items, prices, tags, etc.

Hard rules:
1. Output a single JSON object only. No markdown, no commentary outside JSON.
2. schema_version must be the JSON number 1 (not the string \"1\").
3. restaurant_name: string or null (best guess from header/logo text; null if unknown).
4. sections: array of menu sections. Each section MUST use the key "title" (string) for the section heading — do NOT use "name" for sections. If the menu has no clear sections, use one section with title "Menu" or "All items".
5. Section and dish ids: you may omit "id" on sections and items, or use null. The API assigns real UUID primary keys server-side — do not spend tokens inventing UUIDs.
6. items[].name: dish name as shown on the menu (short).
7. items[].description: string or null — one or two short sentences for the dish detail screen. You may infer a reasonable description from the dish name, section, ingredients, and typical preparations when the menu does not list a line-item blurb. Do NOT paste the same restaurant-wide footnote or disclaimer on every dish (e.g. "All meats can be made into a sandwich" repeated for each line). If nothing specific to that dish can be said, use null.
8. items[].price: required object on every item with keys amount (JSON number or null, not a string), currency (ISO 4217 string, never null — use "USD" when unknown), display (string or null). If no price is printed for that item, set amount to null and display to null — never guess or invent a price. When a price exists, use a JSON number for amount (e.g. 12.5 not \"12.5\").
9. items[].spice_level: JSON integer 0, 1, 2, or 3 only. Infer from dish name, menu cues (hot, spicy, chili, jalapeño, etc.), and typical preparation when not spelled out: 0 = not spicy, 1 = mild, 2 = medium, 3 = hot. Do not output floats or strings for this field.
10. items[].tags: CRITICAL — only strings from the "allowed_tags" array in the user message. Copy each allowed string exactly. Subjective judgment is OK: include a tag when the dish plausibly matches that user preference. If allowed_tags is empty, every items[].tags must be []. Never output tag strings not in allowed_tags.
11. items[].ingredients: string array — key ingredients when inferable from name/description; otherwise []. For very simple snacks or single-component dishes (e.g. popcorn, fries, soda), still list the obvious main component(s) inferred from the name (e.g. popcorn → ["popcorn"] or ["corn"]); avoid [] when the name alone implies what it is.
12. Do not invent dishes that are not supported by the OCR text or the image. If OCR is unreadable, return minimal sections with empty items only if nothing can be inferred; prefer inferring from the image when it is provided.
13. Do not duplicate the same dish in multiple sections unless the menu clearly lists it twice.
"""


def _user_message(ocr_text: str | None, user_preferences: dict[str, Any] | None, *, include_ocr: bool) -> str:
    from parsed_menu_validate import build_allowed_tags_from_user_preferences

    prefs = user_preferences if isinstance(user_preferences, dict) else {}
    prefs_json = json.dumps(prefs, ensure_ascii=False, indent=2)
    allowed = build_allowed_tags_from_user_preferences(prefs)
    allowed_list = sorted(allowed)
    allowed_json = json.dumps(allowed_list, ensure_ascii=False, indent=2)
    if include_ocr:
        text = ocr_text if (ocr_text and ocr_text.strip()) else "(OCR text is empty — rely on the attached image if present.)"
        ocr_block = f"""

OCR text from the menu photo:
---
{text}
---
"""
    else:
        ocr_block = """

OCR text is intentionally skipped. Extract the menu content from the attached image only.
"""

    return f"""User preferences (context for what the diner cares about; same data as below):
{prefs_json}

allowed_tags — the ONLY strings you may put in items[].tags (copy exactly). If this list is empty, use [] for every dish's tags:
{allowed_json}

{ocr_block}

Return ParsedMenu JSON with schema_version 1. tags must be a subset of allowed_tags only; infer spice_level (0–3) and short descriptions where helpful for the dish detail UI; leave price amount/display null when not on the menu."""


def _log_llm_attempt(*, label: str, raw_text: str, parsed: dict[str, Any]) -> None:
    """stderr when Flask debug — raw model string + parsed JSON for troubleshooting."""
    print(f"[menu-parse][debug] LLM response ({label})", file=sys.stderr, flush=True)
    print("[menu-parse][debug] --- raw text ---", file=sys.stderr, flush=True)
    print(raw_text if raw_text.strip() else "(empty)", file=sys.stderr, flush=True)
    print("[menu-parse][debug] --- parsed JSON ---", file=sys.stderr, flush=True)
    print(json.dumps(parsed, ensure_ascii=False, indent=2), file=sys.stderr, flush=True)
    print(f"[menu-parse][debug] --- end LLM ({label}) ---", file=sys.stderr, flush=True)


def _mime_from_storage_path(path: str) -> str:
    lower = path.lower()
    if lower.endswith(".png"):
        return "image/png"
    if lower.endswith(".webp"):
        return "image/webp"
    return "image/jpeg"


def _generate_json(
    *,
    user_message: str,
    image_bytes: bytes | None,
    image_mime: str | None,
    debug_llm: bool = False,
    attempt_label: str = "gemini",
) -> dict[str, Any]:
    _ensure_vertex()
    from vertexai.generative_models import GenerationConfig, GenerativeModel, Part

    model = GenerativeModel(_model_name(), system_instruction=SYSTEM_INSTRUCTION)
    gen_cfg = GenerationConfig(
        temperature=0.2,
        response_mime_type="application/json",
    )

    if image_bytes and image_mime:
        parts: list[Any] = [
            user_message,
            Part.from_data(image_bytes, mime_type=image_mime),
        ]
        response = model.generate_content(parts, generation_config=gen_cfg)
    else:
        response = model.generate_content(user_message, generation_config=gen_cfg)

    if not response.candidates:
        raise RuntimeError("Gemini returned no candidates")

    text = response.text
    if not text or not text.strip():
        raise RuntimeError("Gemini returned empty text")

    parsed = _json_from_model_text(text)
    if not isinstance(parsed, dict):
        raise RuntimeError("Gemini JSON root must be an object")
    if debug_llm:
        _log_llm_attempt(label=attempt_label, raw_text=text, parsed=parsed)
    return parsed


def parse_menu_with_vertex(
    *,
    ocr_text: str | None,
    user_preferences: dict[str, Any] | None,
    image_bytes: bytes,
    storage_path: str,
    debug_llm: bool = False,
) -> dict[str, Any]:
    """
    Returns a ParsedMenu dict (schema v1). Raises RuntimeError on failure.
    """
    mime = _mime_from_storage_path(storage_path)
    strategy = _strategy()

    if strategy == "image_only":
        msg = _user_message(None, user_preferences, include_ocr=False)
    else:
        msg = _user_message(ocr_text, user_preferences, include_ocr=True)
    # strategy is used below

    if strategy == "image_only":
        return _generate_json(
            user_message=msg,
            image_bytes=image_bytes,
            image_mime=mime,
            debug_llm=debug_llm,
            attempt_label="image_only",
        )

    if strategy == "multimodal_always":
        return _generate_json(
            user_message=msg,
            image_bytes=image_bytes,
            image_mime=mime,
            debug_llm=debug_llm,
            attempt_label="multimodal_always",
        )

    if strategy == "text_only":
        return _generate_json(
            user_message=msg,
            image_bytes=None,
            image_mime=None,
            debug_llm=debug_llm,
            attempt_label="text_only",
        )

    # text_first: try text, then image+text
    from parsed_menu_validate import (
        assign_server_uuid_ids,
        normalize_llm_menu_shape,
        normalize_llm_scalar_coercions,
        parsed_menu_has_items,
        validate_parsed_menu,
        validate_parsed_menu_db_ids,
    )

    first = _generate_json(
        user_message=msg,
        image_bytes=None,
        image_mime=None,
        debug_llm=debug_llm,
        attempt_label="text_first",
    )
    normalize_llm_menu_shape(first)
    normalize_llm_scalar_coercions(first)
    assign_server_uuid_ids(first)
    ok, err, menu = validate_parsed_menu(first)
    if ok and menu:
        id_ok, id_err = validate_parsed_menu_db_ids(menu)
        if id_ok and parsed_menu_has_items(menu):
            return menu

    hints: list[str] = []
    if not ok:
        hints.append(err)
    elif menu:
        id_ok2, id_err2 = validate_parsed_menu_db_ids(menu)
        if not id_ok2:
            hints.append(id_err2)
        elif not parsed_menu_has_items(menu):
            hints.append("no dishes in sections")

    hint_str = " ".join(hints).strip() or "validation failed"

    second = _generate_json(
        user_message=msg
        + "\n\nPrevious attempt failed or was incomplete. Use the attached menu image to produce valid JSON. "
        + "Hints: "
        + hint_str,
        image_bytes=image_bytes,
        image_mime=mime,
        debug_llm=debug_llm,
        attempt_label="text_first_retry_image",
    )
    return second
