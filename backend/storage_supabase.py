"""
Download objects from Supabase Storage using the service role (server-side only).
"""

from __future__ import annotations

import os
from typing import Any
from urllib.parse import urlparse

from supabase import Client, create_client

_supabase: Client | None = None


def get_supabase_admin() -> Client:
    global _supabase
    if _supabase is not None:
        return _supabase
    url = os.getenv("SUPABASE_URL", "").strip()
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip()
    if not url or not key:
        raise RuntimeError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set")
    _supabase = create_client(url, key)
    return _supabase


def _looks_like_storage_not_found(exc: BaseException) -> bool:
    s = str(exc).lower()
    return "404" in s or "not_found" in s or "object not found" in s


def _exception_detail(exc: BaseException) -> str:
    """Human-readable chain for logs and API errors (no secrets)."""
    parts: list[str] = [f"{type(exc).__name__}: {exc}"]
    cause: BaseException | None = exc.__cause__
    depth = 0
    while cause is not None and depth < 5:
        parts.append(f"caused by {type(cause).__name__}: {cause}")
        cause = cause.__cause__
        depth += 1
    for attr in ("status_code", "code", "message"):
        if hasattr(exc, attr):
            try:
                val: Any = getattr(exc, attr)
                if val is not None and str(val) not in parts[0]:
                    parts.append(f"{attr}={val!r}")
            except Exception:
                pass
    resp = getattr(exc, "response", None)
    if resp is not None:
        for attr in ("status_code", "reason_phrase"):
            if hasattr(resp, attr):
                try:
                    parts.append(f"response.{attr}={getattr(resp, attr)!r}")
                except Exception:
                    pass
        if hasattr(resp, "text"):
            try:
                txt = (resp.text or "")[:500]
                if txt.strip():
                    parts.append(f"response.text[:500]={txt!r}")
            except Exception:
                pass
    return " | ".join(parts)


def download_storage_object(bucket: str, path: str) -> bytes:
    """Fetch file bytes from a private bucket path."""
    client = get_supabase_admin()
    try:
        data = client.storage.from_(bucket).download(path)
    except Exception as e:
        detail = _exception_detail(e)
        if _looks_like_storage_not_found(e):
            url = os.getenv("SUPABASE_URL", "").strip()
            host = urlparse(url).netloc or "(unknown)"
            raise RuntimeError(
                "Storage 404 — object not found in the Supabase project this server uses "
                f"(bucket={bucket!r}, path={path!r}; SUPABASE_URL host={host!r}). "
                "Use the same project as the Expo app: set backend SUPABASE_URL to match "
                "EXPO_PUBLIC_SUPABASE_URL, and SUPABASE_SERVICE_ROLE_KEY to that project's "
                "service_role key (Dashboard → Project Settings → API). "
                f"Original error: {detail}"
            ) from e
        raise RuntimeError(
            f"Storage download failed (bucket={bucket!r}, path={path!r}): {detail}"
        ) from e

    # httpx/supabase may return memoryview or bytearray — Vision needs plain bytes.
    if isinstance(data, memoryview):
        raw = data.tobytes()
    elif isinstance(data, bytearray):
        raw = bytes(data)
    elif not isinstance(data, bytes):
        raw = bytes(data)
    else:
        raw = data
    if len(raw) == 0:
        raise RuntimeError(
            f"Storage download returned 0 bytes (bucket={bucket!r}, path={path!r}). "
            "The object may be empty or the path may be wrong."
        )
    return raw


def storage_object_exists(bucket: str, path: str) -> bool:
    try:
        download_storage_object(bucket, path)
        return True
    except RuntimeError as exc:
        if "Storage 404" in str(exc):
            return False
        raise


def upload_storage_object(
    bucket: str,
    path: str,
    data: bytes,
    *,
    content_type: str,
    upsert: bool = True,
) -> str:
    client = get_supabase_admin()
    try:
        client.storage.from_(bucket).upload(
            path,
            data,
            {
                "content-type": content_type,
                "x-upsert": "true" if upsert else "false",
            },
        )
    except Exception as e:
        detail = _exception_detail(e)
        raise RuntimeError(
            f"Storage upload failed (bucket={bucket!r}, path={path!r}): {detail}"
        ) from e
    return client.storage.from_(bucket).get_public_url(path)
