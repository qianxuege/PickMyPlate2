"""
PickMyPlate menu parsing API (Flask).

Run locally:
  cd backend && python -m venv .venv && source .venv/bin/activate
  pip install -r requirements.txt
  cp .env.example .env   # then fill values
  python app.py

Endpoints:
  GET  /health
  POST /v1/parse-menu   JSON body — see parse_menu_handler docstring
"""

from __future__ import annotations

import copy
import json
import os
import sys
import traceback
from typing import Any
from urllib.parse import quote, urlparse

from dotenv import load_dotenv
from flask import Flask, jsonify, request

load_dotenv()

from auth_supabase import REQUIRE_AUTH, auth_error_response, verify_bearer_token
from mock_menu import MOCK_PARSED_MENU

MOCK_MENU_PARSE = os.getenv("MOCK_MENU_PARSE", "1") == "1"
MAX_JSON_BODY_BYTES = 2 * 1024 * 1024  # 2 MiB guardrail for preferences payload


def _is_flask_debug(app: Flask) -> bool:
    return bool(app.debug) or os.getenv("FLASK_DEBUG", "0") == "1"


def _log_supabase_object_ref(*, supabase_url: str, bucket: str, path: str) -> None:
    base = supabase_url.rstrip("/")
    encoded_path = quote(path, safe="/")
    object_url = f"{base}/storage/v1/object/{bucket}/{encoded_path}"
    print("[menu-parse][debug] Supabase Storage object", file=sys.stderr, flush=True)
    print(f"  bucket: {bucket}", file=sys.stderr, flush=True)
    print(f"  path:   {path}", file=sys.stderr, flush=True)
    print(f"  object URL (private bucket; use service role or signed URL to fetch):", file=sys.stderr, flush=True)
    print(f"  {object_url}", file=sys.stderr, flush=True)


def _log_ocr_text(text: str) -> None:
    print("[menu-parse][debug] OCR full text (Document Text Detection):", file=sys.stderr, flush=True)
    print(text if text else "(empty)", file=sys.stderr, flush=True)
    print("[menu-parse][debug] --- end OCR text ---", file=sys.stderr, flush=True)


def _log_final_menu_after_tag_allowlist(menu: dict[str, Any]) -> None:
    """After tag filtering; matches JSON returned to the client (ok=true)."""
    print("[menu-parse][debug] Final ParsedMenu (after validation + tag allowlist):", file=sys.stderr, flush=True)
    print(json.dumps(menu, ensure_ascii=False, indent=2), file=sys.stderr, flush=True)
    print("[menu-parse][debug] --- end Final ParsedMenu ---", file=sys.stderr, flush=True)


def _log_backend_supabase_project_hint() -> None:
    """Help debug Storage 404s: Expo uploads to EXPO_PUBLIC_*; Flask must use the same project."""
    url = os.getenv("SUPABASE_URL", "").strip()
    key_set = bool(os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip())
    if not url:
        print("[backend] SUPABASE_URL is not set.", file=sys.stderr, flush=True)
        return
    host = urlparse(url).netloc or url
    print(
        f"[backend] Storage downloads use SUPABASE_URL host: {host}",
        file=sys.stderr,
        flush=True,
    )
    print(
        f"[backend] SUPABASE_SERVICE_ROLE_KEY set: {'yes' if key_set else 'no'}",
        file=sys.stderr,
        flush=True,
    )
    print(
        "[backend] If uploads work in the app but downloads 404 here, align this URL with "
        "EXPO_PUBLIC_SUPABASE_URL (same Supabase project).",
        file=sys.stderr,
        flush=True,
    )


def create_app() -> Flask:
    app = Flask(__name__)

    from flask_cors import CORS

    _log_backend_supabase_project_hint()

    CORS(
        app,
        resources={r"/v1/*": {"origins": os.getenv("CORS_ORIGINS", "*")}},
        methods=["GET", "POST", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type"],
    )

    @app.get("/health")
    def health():
        return jsonify({"status": "ok"}), 200

    @app.post("/v1/parse-menu")
    def parse_menu():
        """
        Request JSON (scheme B — image already in Storage):
          {
            "storage_bucket": "menu-uploads",   // optional
            "storage_path": "user-id/scan.jpg", // required when not mocking
            "user_preferences": { ... }         // optional; passed to LLM later
          }

        Response:
          { "ok": true, "menu": <ParsedMenu> }
          { "ok": false, "error": "..." }
        """
        if REQUIRE_AUTH:
            payload = verify_bearer_token(request.headers.get("Authorization"))
            if payload is None:
                return auth_error_response()

        # Read body once. Do NOT use get_data(cache=False) before get_json — it exhausts the stream
        # and get_json then sees an empty body (parsed keys: []).
        raw = request.get_data()
        if len(raw) > MAX_JSON_BODY_BYTES:
            return jsonify({"ok": False, "error": "request body too large"}), 413

        body: dict[str, Any] = {}
        if raw:
            try:
                parsed = json.loads(raw.decode("utf-8"))
                if isinstance(parsed, dict):
                    body = parsed
            except (json.JSONDecodeError, UnicodeDecodeError, TypeError):
                body = {}
        storage_bucket = (body.get("storage_bucket") or "menu-uploads").strip()
        storage_path = body.get("storage_path")
        user_preferences = body.get("user_preferences")

        if _is_flask_debug(app):
            print("[menu-parse][debug] POST /v1/parse-menu", file=sys.stderr, flush=True)
            print(
                f"  MOCK_MENU_PARSE raw env={os.getenv('MOCK_MENU_PARSE', '')!r} effective={MOCK_MENU_PARSE}",
                file=sys.stderr,
                flush=True,
            )
            print(f"  Content-Type: {request.content_type!r}", file=sys.stderr, flush=True)
            print(f"  raw body length: {len(raw)}", file=sys.stderr, flush=True)
            print(f"  parsed keys: {list(body.keys())}", file=sys.stderr, flush=True)
            print(
                f"  storage_path type={type(storage_path).__name__!s} repr={storage_path!r}",
                file=sys.stderr,
                flush=True,
            )

        if user_preferences is not None and not isinstance(user_preferences, (dict, list)):
            return jsonify({"ok": False, "error": "user_preferences must be object or array"}), 400

        if MOCK_MENU_PARSE:
            # OCR + Vertex not used; return mock shape with server-issued UUIDs each time.
            from parsed_menu_validate import (
                assign_server_uuid_ids,
                build_allowed_tags_from_user_preferences,
                constrain_menu_tags_to_allowed_tags,
                parsed_menu_has_items,
                validate_parsed_menu,
                validate_parsed_menu_db_ids,
            )

            menu_raw = copy.deepcopy(MOCK_PARSED_MENU)
            assign_server_uuid_ids(menu_raw)
            ok, v_err, menu = validate_parsed_menu(menu_raw)
            if not ok or menu is None:
                return jsonify({"ok": False, "error": f"menu_invalid: {v_err}"}), 502
            id_ok, id_err = validate_parsed_menu_db_ids(menu)
            if not id_ok:
                return jsonify({"ok": False, "error": f"menu_invalid: {id_err}"}), 502
            allowed_tags = build_allowed_tags_from_user_preferences(
                user_preferences if isinstance(user_preferences, dict) else None
            )
            constrain_menu_tags_to_allowed_tags(menu, allowed_tags)
            if not parsed_menu_has_items(menu):
                return jsonify({"ok": False, "error": "menu_empty: no dishes extracted"}), 502
            if _is_flask_debug(app):
                _log_final_menu_after_tag_allowlist(menu)
            return (
                jsonify(
                    {
                        "ok": True,
                        "menu": menu,
                        "debug": {"mock": True, "user_preferences_received": user_preferences is not None},
                    }
                ),
                200,
            )

        if not storage_path or not isinstance(storage_path, str) or not storage_path.strip():
            return jsonify({"ok": False, "error": "storage_path is required when MOCK_MENU_PARSE=0"}), 400

        path_clean = storage_path.strip()

        try:
            from storage_supabase import download_storage_object

            image_bytes = download_storage_object(storage_bucket, path_clean)
        except Exception as e:
            if _is_flask_debug(app):
                traceback.print_exc(file=sys.stderr)
            return jsonify({"ok": False, "error": f"storage_download_failed: {e!s}"}), 502

        supabase_url = os.getenv("SUPABASE_URL", "").strip()
        if _is_flask_debug(app) and supabase_url:
            _log_supabase_object_ref(supabase_url=supabase_url, bucket=storage_bucket, path=path_clean)
        elif _is_flask_debug(app) and not supabase_url:
            print(
                "[menu-parse][debug] SUPABASE_URL not set; skipping object URL log.",
                file=sys.stderr,
                flush=True,
            )

        # OCR is the slowest part; allow skipping it for image-only LLM strategy.
        menu_llm_strategy = os.getenv("MENU_LLM_STRATEGY", "text_first").strip().lower()
        if menu_llm_strategy == "image_only":
            ocr_text = ""
            if _is_flask_debug(app):
                print(
                    "[menu-parse][debug] MENU_LLM_STRATEGY=image_only; skipping OCR (extract_document_text).",
                    file=sys.stderr,
                    flush=True,
                )
        else:
            try:
                from ocr_vision import extract_document_text

                ocr_text = extract_document_text(image_bytes)
            except Exception as e:
                return jsonify({"ok": False, "error": f"ocr_failed: {e!s}"}), 502

            if _is_flask_debug(app):
                _log_ocr_text(ocr_text)

        try:
            from llm_menu_vertex import parse_menu_with_vertex
            from parsed_menu_validate import (
                assign_server_uuid_ids,
                build_allowed_tags_from_user_preferences,
                constrain_menu_tags_to_allowed_tags,
                normalize_llm_menu_shape,
                normalize_llm_scalar_coercions,
                parsed_menu_has_items,
                validate_parsed_menu,
                validate_parsed_menu_db_ids,
            )

            menu_raw = parse_menu_with_vertex(
                ocr_text=ocr_text,
                user_preferences=user_preferences if isinstance(user_preferences, dict) else None,
                image_bytes=image_bytes,
                storage_path=path_clean,
                debug_llm=_is_flask_debug(app),
            )
        except Exception as e:
            return jsonify({"ok": False, "error": f"llm_failed: {e!s}"}), 502

        normalize_llm_menu_shape(menu_raw)
        normalize_llm_scalar_coercions(menu_raw)
        assign_server_uuid_ids(menu_raw)

        ok, v_err, menu = validate_parsed_menu(menu_raw)
        if not ok or menu is None:
            return jsonify({"ok": False, "error": f"menu_invalid: {v_err}"}), 502

        id_ok, id_err = validate_parsed_menu_db_ids(menu)
        if not id_ok:
            return jsonify({"ok": False, "error": f"menu_invalid: {id_err}"}), 502

        allowed_tags = build_allowed_tags_from_user_preferences(
            user_preferences if isinstance(user_preferences, dict) else None
        )
        constrain_menu_tags_to_allowed_tags(menu, allowed_tags)

        if not parsed_menu_has_items(menu):
            return jsonify({"ok": False, "error": "menu_empty: no dishes extracted"}), 502

        if _is_flask_debug(app):
            _log_final_menu_after_tag_allowlist(menu)

        return jsonify({"ok": True, "menu": menu}), 200

    return app


app = create_app()


if __name__ == "__main__":
    port = int(os.getenv("PORT", "8080"))
    debug = os.getenv("FLASK_DEBUG", "1") == "1"
    app.run(host="0.0.0.0", port=port, debug=debug)
