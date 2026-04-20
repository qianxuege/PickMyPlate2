from __future__ import annotations

from parsed_menu_validate import (
    add_personalized_avoidance_tags,
    allergy_dish_tags,
    allergy_label_to_base,
    avoidance_dish_tags,
    avoidance_label_to_base,
    build_allowed_tags_from_user_preferences,
    constrain_menu_tags_to_allowed_tags,
)


def test_allergy_label_to_base_normalizes_common_labels():
    assert allergy_label_to_base("seafood allergy") == "Seafood"
    assert allergy_label_to_base("Peanuts allergy") == "Peanut"
    assert allergy_label_to_base("tree nuts allergy") == "Tree nut"


def test_allergy_dish_tags_include_content_warning_and_safe_tags():
    assert allergy_dish_tags("Seafood allergy") == ["Seafood", "Contains seafood", "Seafood-free"]


def test_avoidance_label_to_base_normalizes_dislike_labels():
    assert avoidance_label_to_base("No Cilantro") == "Cilantro"
    assert avoidance_label_to_base("No Olives") == "Olive"


def test_avoidance_dish_tags_include_content_warning_and_safe_tags():
    assert avoidance_dish_tags("No Cilantro") == ["Cilantro", "Contains cilantro", "Cilantro-free"]


def test_allowed_tags_expand_allergy_and_dislike_smart_tags():
    allowed = build_allowed_tags_from_user_preferences(
        {
            "dietary": ["Dairy-free"],
            "smart_tags": [
                {"category": "allergy", "label": "Seafood allergy"},
                {"category": "dislike", "label": "No Cilantro"},
                {"category": "like", "label": "Loves Sushi"},
            ],
        }
    )

    assert "Dairy-free" in allowed
    assert "Seafood" in allowed
    assert "Contains seafood" in allowed
    assert "Seafood-free" in allowed
    assert "Seafood allergy" not in allowed
    assert "Cilantro" in allowed
    assert "Contains cilantro" in allowed
    assert "Cilantro-free" in allowed
    assert "No Cilantro" not in allowed
    assert "Loves Sushi" in allowed


def test_constrain_menu_tags_keeps_derived_allergy_and_dislike_tags_only():
    menu = {
        "sections": [
            {
                "items": [
                    {"tags": ["Seafood", "Contains seafood", "Seafood allergy", "Unknown"]},
                    {"tags": ["Seafood-free", "Cilantro-free"]},
                    {"tags": ["Cilantro", "Contains cilantro", "No Cilantro"]},
                ]
            }
        ]
    }
    allowed = build_allowed_tags_from_user_preferences(
        {
            "smart_tags": [
                {"category": "allergy", "label": "Seafood allergy"},
                {"category": "dislike", "label": "No Cilantro"},
            ]
        }
    )

    constrain_menu_tags_to_allowed_tags(menu, allowed)

    assert menu["sections"][0]["items"][0]["tags"] == ["Seafood", "Contains seafood"]
    assert menu["sections"][0]["items"][1]["tags"] == ["Seafood-free", "Cilantro-free"]
    assert menu["sections"][0]["items"][2]["tags"] == ["Cilantro", "Contains cilantro"]


def test_add_personalized_avoidance_tags_marks_clear_safe_dishes_free():
    prefs = {"smart_tags": [{"category": "allergy", "label": "Seafood allergy"}]}
    allowed = build_allowed_tags_from_user_preferences(prefs)
    menu = {
        "sections": [
            {
                "items": [
                    {
                        "name": "Chicken Teriyaki",
                        "description": "Grilled chicken with teriyaki sauce.",
                        "ingredients": ["chicken", "teriyaki sauce", "rice"],
                        "tags": ["French"],
                    }
                ]
            }
        ]
    }

    add_personalized_avoidance_tags(menu, prefs, allowed | {"French"})

    assert menu["sections"][0]["items"][0]["tags"] == ["French", "Seafood-free"]


def test_add_personalized_avoidance_tags_marks_matching_dishes_contains():
    prefs = {
        "smart_tags": [
            {"category": "allergy", "label": "Seafood allergy"},
            {"category": "dislike", "label": "No Cilantro"},
        ]
    }
    allowed = build_allowed_tags_from_user_preferences(prefs)
    menu = {
        "sections": [
            {
                "items": [
                    {
                        "name": "Salmon Tacos",
                        "description": "Fresh salmon with cilantro crema.",
                        "ingredients": ["salmon", "cilantro", "tortilla"],
                        "tags": [],
                    }
                ]
            }
        ]
    }

    add_personalized_avoidance_tags(menu, prefs, allowed)

    assert menu["sections"][0]["items"][0]["tags"] == [
        "Seafood",
        "Contains seafood",
        "Cilantro",
        "Contains cilantro",
    ]
