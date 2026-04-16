"""POST /v1/restaurant-dishes/<id>/estimate-calories — Vertex mocked."""

from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest

import app as app_module


@pytest.fixture(autouse=True)
def _reset_cooldown():
    app_module.reset_calorie_estimate_cooldown_for_tests()
    yield
    app_module.reset_calorie_estimate_cooldown_for_tests()


@pytest.fixture
def flask_client():
    return app_module.create_app().test_client()


class _SupabaseTrack:
    def __init__(self, responses: list[MagicMock]):
        self._responses = list(responses)
        self.updates: list[dict] = []

    def table(self, _name: str):
        return _Chain(self)


class _Chain:
    def __init__(self, outer: _SupabaseTrack):
        self._outer = outer
        self._pending_update: dict | None = None

    def select(self, *_a, **_k):
        return self

    def eq(self, *_a, **_k):
        return self

    def limit(self, *_a, **_k):
        return self

    def update(self, patch: dict):
        self._pending_update = patch
        return self

    def insert(self, *_a, **_k):
        return self

    def execute(self):
        if self._pending_update is not None:
            self._outer.updates.append(self._pending_update)
        if not self._outer._responses:
            raise AssertionError("no queued Supabase response")
        return self._outer._responses.pop(0)


def _row(**kwargs):
    m = MagicMock()
    m.data = [kwargs]
    return m


def _empty():
    m = MagicMock()
    m.data = []
    return m


def test_estimate_success(flask_client):
    dish_id = "00000000-0000-0000-0000-0000000000d1"
    track = _SupabaseTrack(
        [
            _row(
                id=dish_id,
                section_id="s1",
                name="Soup",
                ingredients=["a"],
            ),
            _row(id="s1", scan_id="sc1"),
            _row(id="sc1", restaurant_id="r1", restaurant_name="Cafe"),
            _empty(),
        ]
    )
    with patch("storage_supabase.get_supabase_admin", return_value=track), patch(
        "llm_dish_vertex.generate_dish_calories_estimate",
        return_value=512,
    ):
        res = flask_client.post(f"/v1/restaurant-dishes/{dish_id}/estimate-calories")
    assert res.status_code == 200
    assert res.get_json() == {"ok": True, "calories_estimated": 512}
    assert track.updates == [{"calories_estimated": 512}]


def test_estimate_null_from_llm(flask_client):
    dish_id = "00000000-0000-0000-0000-0000000000d2"
    track = _SupabaseTrack(
        [
            _row(id=dish_id, section_id="s1", name="?", ingredients=[]),
            _row(id="s1", scan_id="sc1"),
            _row(id="sc1", restaurant_id="r1", restaurant_name="X"),
            _empty(),
        ]
    )
    with patch("storage_supabase.get_supabase_admin", return_value=track), patch(
        "llm_dish_vertex.generate_dish_calories_estimate",
        return_value=None,
    ):
        res = flask_client.post(f"/v1/restaurant-dishes/{dish_id}/estimate-calories")
    assert res.status_code == 200
    assert res.get_json()["calories_estimated"] is None
    assert track.updates == [{"calories_estimated": None}]


def test_estimate_llm_runtime_error_502(flask_client):
    dish_id = "00000000-0000-0000-0000-0000000000d3"
    track = _SupabaseTrack(
        [
            _row(id=dish_id, section_id="s1", name="X", ingredients=[]),
            _row(id="s1", scan_id="sc1"),
            _row(id="sc1", restaurant_id="r1", restaurant_name="Y"),
        ]
    )
    with patch("storage_supabase.get_supabase_admin", return_value=track), patch(
        "llm_dish_vertex.generate_dish_calories_estimate",
        side_effect=RuntimeError("bad json"),
    ):
        res = flask_client.post(f"/v1/restaurant-dishes/{dish_id}/estimate-calories")
    assert res.status_code == 502
    assert "calories_estimate_failed" in res.get_json().get("error", "")


def test_estimate_rate_limited(monkeypatch, flask_client):
    monkeypatch.setenv("CALORIE_ESTIMATE_MIN_INTERVAL_SECONDS", "2")
    dish_id = "00000000-0000-0000-0000-0000000000d4"

    def build_track():
        return _SupabaseTrack(
            [
                _row(id=dish_id, section_id="s1", name="S", ingredients=[]),
                _row(id="s1", scan_id="sc1"),
                _row(id="sc1", restaurant_id="r1", restaurant_name="Z"),
                _empty(),
            ]
        )

    with patch("storage_supabase.get_supabase_admin", side_effect=lambda: build_track()), patch(
        "llm_dish_vertex.generate_dish_calories_estimate",
        return_value=100,
    ):
        assert flask_client.post(f"/v1/restaurant-dishes/{dish_id}/estimate-calories").status_code == 200
        r2 = flask_client.post(f"/v1/restaurant-dishes/{dish_id}/estimate-calories")
    assert r2.status_code == 429
    body = r2.get_json()
    assert body.get("error") == "calorie_estimate_rate_limited"
    assert "retry_after_seconds" in body
