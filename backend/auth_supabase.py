"""
Optional Bearer JWT verification using Supabase JWT secret (HS256).
Enable by setting SUPABASE_JWT_SECRET and REQUIRE_AUTH=1.
"""

from __future__ import annotations

import os
from typing import Any

import jwt

REQUIRE_AUTH = os.getenv("REQUIRE_AUTH", "0") == "1"
JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET", "").strip()
JWT_ALGORITHMS = ["HS256"]


def verify_bearer_token(auth_header: str | None) -> dict[str, Any] | None:
    """
    Parse Authorization: Bearer <token> and verify signature + exp.
    Returns the JWT payload (includes 'sub' = user id) or None.
    """
    if not auth_header or not auth_header.startswith("Bearer "):
        return None
    token = auth_header[len("Bearer ") :].strip()
    if not token or not JWT_SECRET:
        return None
    try:
        return jwt.decode(
            token,
            JWT_SECRET,
            algorithms=JWT_ALGORITHMS,
            audience="authenticated",
        )
    except jwt.PyJWTError:
        return None


def auth_error_response():
    from flask import jsonify

    return jsonify({"ok": False, "error": "unauthorized"}), 401
