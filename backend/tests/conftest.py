"""Pytest defaults for Flask backend."""

from __future__ import annotations

import os

os.environ.setdefault("REQUIRE_AUTH", "0")
os.environ.setdefault("SUPABASE_URL", "http://localhost")
os.environ.setdefault("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key")
