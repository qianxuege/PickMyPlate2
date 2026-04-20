"""
Validate ParsedMenu JSON (schema v1) — mirrors lib/menu-scan-schema.ts.

Backend assigns UUIDs with assign_server_uuid_ids, then validates shapes the Expo client
can persist into diner_menu_sections / diner_scanned_dishes (UUID primary keys).
"""

from __future__ import annotations

import math
import re
import uuid
from typing import Any

MENU_SCAN_SCHEMA_VERSION = 1

_COMMON_PLURAL_ALLERGENS = {
    "peanuts": "Peanut",
    "nuts": "Nut",
    "tree nuts": "Tree nut",
    "eggs": "Egg",
}
_INGREDIENT_SYNONYMS = {
    "seafood": ("seafood", "fish", "salmon", "tuna", "cod", "shrimp", "prawn", "crab", "lobster", "clam", "mussel", "oyster", "scallop", "shellfish"),
    "shellfish": ("shellfish", "shrimp", "prawn", "crab", "lobster", "clam", "mussel", "oyster", "scallop"),
    "peanut": ("peanut", "peanuts", "groundnut"),
    "nut": ("nut", "nuts", "peanut", "peanuts", "almond", "cashew", "walnut", "pecan", "pistachio", "hazelnut"),
    "tree nut": ("tree nut", "tree nuts", "almond", "cashew", "walnut", "pecan", "pistachio", "hazelnut"),
}
DEFAULT_PRICE_CURRENCY = "USD"


def normalize_llm_menu_shape(menu: Any) -> Any:
    """
    Gemini often uses section \"name\" instead of \"title\", and null price.currency.
    Apply fixes in-place on the LLM dict before validate_parsed_menu.
    """
    if menu is None or not isinstance(menu, dict):
        return menu
    sections = menu.get("sections")
    if not isinstance(sections, list):
        return menu
    for sec in sections:
        if not isinstance(sec, dict):
            continue
        title = sec.get("title")
        if not (isinstance(title, str) and title.strip()):
            alt = sec.get("name")
            if isinstance(alt, str) and alt.strip():
                sec["title"] = alt.strip()
        items = sec.get("items")
        if not isinstance(items, list):
            continue
        for it in items:
            if not isinstance(it, dict):
                continue
            pr = it.get("price")
            if not isinstance(pr, dict):
                continue
            cur = pr.get("currency")
            if cur is None or (isinstance(cur, str) and not cur.strip()):
                pr["currency"] = DEFAULT_PRICE_CURRENCY
            elif not isinstance(cur, str):
                pr["currency"] = str(cur).strip() or DEFAULT_PRICE_CURRENCY
    return menu


def normalize_llm_scalar_coercions(menu: Any) -> None:
    """
    Coerce common LLM JSON quirks so validate_parsed_menu matches TS strict checks:
    schema_version as \"1\" string, spice_level as \"2\" string, price.amount as numeric string,
    missing price object on items.
    """
    if not isinstance(menu, dict):
        return
    sv = menu.get("schema_version")
    if sv == "1":
        menu["schema_version"] = MENU_SCAN_SCHEMA_VERSION
    elif isinstance(sv, float) and sv == float(MENU_SCAN_SCHEMA_VERSION):
        menu["schema_version"] = MENU_SCAN_SCHEMA_VERSION

    sections = menu.get("sections")
    if not isinstance(sections, list):
        return
    for sec in sections:
        if not isinstance(sec, dict):
            continue
        items = sec.get("items")
        if not isinstance(items, list):
            continue
        for it in items:
            if not isinstance(it, dict):
                continue
            if not isinstance(it.get("price"), dict):
                it["price"] = {"amount": None, "currency": DEFAULT_PRICE_CURRENCY, "display": None}
            pr = it["price"]
            if not isinstance(pr, dict):
                continue
            amt = pr.get("amount")
            if isinstance(amt, str):
                s = amt.strip().replace("$", "").replace("¥", "").replace("€", "").replace(",", "")
                if not s:
                    pr["amount"] = None
                else:
                    try:
                        pr["amount"] = float(s)
                    except ValueError:
                        pr["amount"] = None
            sl = it.get("spice_level")
            if isinstance(sl, str) and sl.strip() != "":
                t = sl.strip()
                if t.isdigit() and len(t) == 1:
                    it["spice_level"] = int(t)
                elif t.lower() in ("0.0", "1.0", "2.0", "3.0"):
                    it["spice_level"] = int(float(t))


def assign_server_uuid_ids(menu: Any) -> None:
    """
    Assign a fresh uuid4 for every section and every dish item. The LLM may omit ids
    or emit placeholders — Postgres PKs are always issued here so repeats across
    parses never collide and hex format is guaranteed.
    Mutates menu in place.
    """
    if menu is None or not isinstance(menu, dict):
        return
    sections = menu.get("sections")
    if not isinstance(sections, list):
        return

    seen: set[str] = set()

    def _new_id() -> str:
        u = str(uuid.uuid4())
        while u in seen:
            u = str(uuid.uuid4())
        seen.add(u)
        return u

    for sec in sections:
        if not isinstance(sec, dict):
            continue
        sec["id"] = _new_id()
        items = sec.get("items")
        if not isinstance(items, list):
            continue
        for it in items:
            if not isinstance(it, dict):
                continue
            it["id"] = _new_id()


def _is_nonempty_str(v: Any) -> bool:
    return isinstance(v, str) and len(v) > 0


def _normalize_spice_level(v: Any) -> int | None:
    """DB check: spice_level 0..3. JSON numbers may be float (e.g. 2.0 from LLMs)."""
    if isinstance(v, bool):
        return None
    if v in (0, 1, 2, 3):
        return int(v)
    if isinstance(v, (int, float)):
        fv = float(v)
        if math.isnan(fv) or math.isinf(fv):
            return None
        if fv.is_integer():
            i = int(fv)
            if 0 <= i <= 3:
                return i
    return None


def _is_uuid_str(s: str) -> bool:
    try:
        uuid.UUID(s)
        return True
    except (ValueError, TypeError):
        return False


def _parse_price(raw: Any) -> dict[str, Any] | None:
    if raw is None or not isinstance(raw, dict):
        return None
    currency = raw.get("currency")
    if not isinstance(currency, str) or len(currency) == 0:
        return None
    amount = raw.get("amount")
    if amount is not None and not isinstance(amount, (int, float)):
        return None
    display = raw.get("display")
    if display is not None and not isinstance(display, str):
        return None
    amt: float | None = None
    if amount is not None:
        if isinstance(amount, bool):
            return None
        amt = float(amount)
        if math.isnan(amt) or math.isinf(amt):
            return None
        # Match diner_scanned_dishes.price_amount numeric(12, 2)
        if abs(amt) >= 10**10:
            return None
        amt = round(amt, 2)
    return {
        "amount": amt,
        "currency": currency,
        "display": None if display is None else display,
    }


def _parse_ingredients(raw: Any) -> list[str] | None:
    if raw is None:
        return []
    if not isinstance(raw, list):
        return None
    out: list[str] = []
    for t in raw:
        if isinstance(t, str):
            s = t.strip()
            if s:
                out.append(s)
            continue
        if isinstance(t, dict):
            n = t.get("name")
            if isinstance(n, str) and n.strip():
                out.append(n.strip())
                continue
            ing = t.get("ingredient")
            if isinstance(ing, str) and ing.strip():
                out.append(ing.strip())
                continue
            return None
        return None
    return out


def _parse_optional_calories_estimated(raw: Any) -> int | None:
    """Optional LLM field: rough kcal for one serving; omit or null when unknown."""
    if raw is None:
        return None
    if isinstance(raw, bool):
        return None
    if isinstance(raw, (int, float)):
        if isinstance(raw, float) and (math.isnan(raw) or math.isinf(raw)):
            return None
        n = int(round(float(raw)))
        if 0 <= n <= 20000:
            return n
        return None
    if isinstance(raw, str) and raw.strip():
        try:
            n = int(round(float(raw.strip().replace(",", ""))))
            if 0 <= n <= 20000:
                return n
        except ValueError:
            return None
    return None


def _parse_item(raw: Any) -> dict[str, Any] | None:
    if raw is None or not isinstance(raw, dict):
        return None
    if not _is_nonempty_str(raw.get("id")):
        return None
    if not _is_nonempty_str(raw.get("name")):
        return None
    desc = raw.get("description")
    if desc is not None and not isinstance(desc, str):
        return None
    price = _parse_price(raw.get("price"))
    if price is None:
        return None
    sl = _normalize_spice_level(raw.get("spice_level"))
    if sl is None:
        return None
    tags = raw.get("tags")
    if not isinstance(tags, list) or not all(isinstance(t, str) for t in tags):
        return None
    ingredients = _parse_ingredients(raw.get("ingredients"))
    if ingredients is None:
        return None
    cal_est = _parse_optional_calories_estimated(raw.get("calories_estimated"))
    return {
        "id": raw["id"],
        "name": raw["name"],
        "description": desc,
        "price": price,
        "spice_level": sl,
        "tags": tags,
        "ingredients": ingredients,
        "calories_estimated": cal_est,
    }


def _parse_section(raw: Any) -> dict[str, Any] | None:
    if raw is None or not isinstance(raw, dict):
        return None
    if not _is_nonempty_str(raw.get("id")):
        return None
    if not _is_nonempty_str(raw.get("title")):
        return None
    items_raw = raw.get("items")
    if not isinstance(items_raw, list):
        return None
    items: list[dict[str, Any]] = []
    for it in items_raw:
        parsed = _parse_item(it)
        if parsed is None:
            return None
        items.append(parsed)
    return {"id": raw["id"], "title": raw["title"], "items": items}


def validate_parsed_menu(raw: Any) -> tuple[bool, str, dict[str, Any] | None]:
    """
    Returns (ok, error_message, menu_dict).
    On success menu_dict matches TS ParsedMenu (plain dict, JSON-serializable).
    """
    if raw is None or not isinstance(raw, dict):
        return False, "body must be an object", None
    if raw.get("schema_version") != MENU_SCAN_SCHEMA_VERSION:
        return False, f"schema_version must be {MENU_SCAN_SCHEMA_VERSION}", None
    rn = raw.get("restaurant_name")
    if rn is not None and not isinstance(rn, str):
        return False, "restaurant_name must be string or null", None
    sections_raw = raw.get("sections")
    if not isinstance(sections_raw, list):
        return False, "sections must be an array", None
    sections: list[dict[str, Any]] = []
    for i, s in enumerate(sections_raw):
        sec = _parse_section(s)
        if sec is None:
            return False, f"Invalid section at index {i}", None
        sections.append(sec)
    menu: dict[str, Any] = {
        "schema_version": MENU_SCAN_SCHEMA_VERSION,
        "restaurant_name": rn,
        "sections": sections,
    }
    return True, "", menu


def allergy_label_to_base(label: str) -> str:
    stripped = label.strip().rstrip(".")
    stripped = re.sub(r"^allergic to\s+", "", stripped, flags=re.IGNORECASE).strip()
    stripped = re.sub(r"\s+allerg(?:y|ies)$", "", stripped, flags=re.IGNORECASE).strip()
    lower = stripped.lower()
    if lower in _COMMON_PLURAL_ALLERGENS:
        return _COMMON_PLURAL_ALLERGENS[lower]
    if lower.endswith("s") and not lower.endswith(("ss", "us", "fish")):
        stripped = stripped[:-1]
    return " ".join(part[:1].upper() + part[1:].lower() for part in stripped.split() if part)


def allergy_dish_tags(label: str) -> list[str]:
    base = allergy_label_to_base(label)
    if not base:
        return []
    return [base, f"Contains {base.lower()}", f"{base}-free"]


def avoidance_label_to_base(label: str) -> str:
    stripped = label.strip().rstrip(".")
    stripped = re.sub(r"^no\s+", "", stripped, flags=re.IGNORECASE).strip()
    stripped = re.sub(r"^(?:i\s+)?(?:don't|do not)\s+like\s+", "", stripped, flags=re.IGNORECASE).strip()
    stripped = re.sub(r"^(?:i\s+)?(?:dislike|hate)\s+", "", stripped, flags=re.IGNORECASE).strip()
    lower = stripped.lower()
    if lower.endswith("s") and not lower.endswith(("ss", "us", "fish")):
        stripped = stripped[:-1]
    return " ".join(part[:1].upper() + part[1:].lower() for part in stripped.split() if part)


def avoidance_dish_tags(label: str) -> list[str]:
    base = avoidance_label_to_base(label)
    if not base:
        return []
    return [base, f"Contains {base.lower()}", f"{base}-free"]


def _avoidance_groups_from_user_preferences(prefs: Any) -> list[tuple[str, str, str]]:
    if prefs is None or not isinstance(prefs, dict):
        return []

    groups: list[tuple[str, str, str]] = []
    smart = prefs.get("smart_tags")
    if not isinstance(smart, list):
        return groups

    seen: set[str] = set()
    for row in smart:
        if not isinstance(row, dict):
            continue
        lab = row.get("label")
        cat = row.get("category")
        if not isinstance(lab, str) or not lab.strip():
            continue
        if cat == "allergy":
            base = allergy_label_to_base(lab)
        elif cat == "dislike":
            base = avoidance_label_to_base(lab)
        else:
            continue
        if not base:
            continue
        key = base.lower()
        if key in seen:
            continue
        seen.add(key)
        groups.append((base, f"Contains {base.lower()}", f"{base}-free"))
    return groups


def _dish_mentions_base(item: dict[str, Any], base: str) -> bool:
    text_parts: list[str] = []
    for key in ("name", "description"):
        value = item.get(key)
        if isinstance(value, str):
            text_parts.append(value)
    ingredients = item.get("ingredients")
    if isinstance(ingredients, list):
        for ingredient in ingredients:
            if isinstance(ingredient, str):
                text_parts.append(ingredient)

    haystack = " ".join(text_parts).lower()
    if not haystack:
        return False

    terms = _INGREDIENT_SYNONYMS.get(base.lower(), (base.lower(),))
    return any(re.search(rf"\b{re.escape(term)}s?\b", haystack) for term in terms)


def add_personalized_avoidance_tags(menu: dict[str, Any], prefs: Any, allowed: frozenset[str]) -> None:
    """
    Adds deterministic dish-property tags for allergy/dislike preferences after LLM parsing.
    If a dish name/description/ingredients mention the avoided item, add "X" and
    "Contains x"; otherwise add "X-free". Only allowed tags are added.
    """
    groups = _avoidance_groups_from_user_preferences(prefs)
    if not groups:
        return

    for sec in menu.get("sections") or []:
        for it in sec.get("items") or []:
            raw = it.get("tags")
            tags = [x for x in raw if isinstance(x, str)] if isinstance(raw, list) else []

            for base, contains, free in groups:
                base_allowed = _resolve_tag_to_allowed(base, allowed)
                contains_allowed = _resolve_tag_to_allowed(contains, allowed)
                free_allowed = _resolve_tag_to_allowed(free, allowed)
                if not (base_allowed or contains_allowed or free_allowed):
                    continue

                lowered = {tag.lower() for tag in tags}
                has_contains = contains.lower() in lowered or base.lower() in lowered or _dish_mentions_base(it, base)

                if has_contains:
                    tags = [tag for tag in tags if tag.lower() != free.lower()]
                    for tag in (base_allowed, contains_allowed):
                        if tag and tag.lower() not in {existing.lower() for existing in tags}:
                            tags.append(tag)
                elif free_allowed and free.lower() not in lowered:
                    tags.append(free_allowed)

            it["tags"] = tags


def parsed_menu_has_items(menu: dict[str, Any]) -> bool:
    return any(len(s.get("items") or []) > 0 for s in menu.get("sections") or [])


def validate_parsed_menu_db_ids(menu: dict[str, Any]) -> tuple[bool, str]:
    """
    Supabase: diner_menu_sections.id / diner_scanned_dishes.id are uuid PKs;
    diner_scanned_dishes.section_id references section id. After assign_server_uuid_ids,
    require valid UUIDs and no duplicate ids within the payload (insert batch semantics).
    """
    section_ids: set[str] = set()
    dish_ids: set[str] = set()
    for s in menu.get("sections") or []:
        sid = s.get("id")
        if not isinstance(sid, str) or not _is_uuid_str(sid):
            return False, f"section id must be a UUID string, got {sid!r}"
        if sid in section_ids:
            return False, f"duplicate section id {sid!r}"
        section_ids.add(sid)
        for it in s.get("items") or []:
            iid = it.get("id")
            if not isinstance(iid, str) or not _is_uuid_str(iid):
                return False, f"dish id must be a UUID string, got {iid!r}"
            if iid in dish_ids:
                return False, f"duplicate dish id {iid!r}"
            dish_ids.add(iid)
    return True, ""


def build_allowed_tags_from_user_preferences(prefs: Any) -> frozenset[str]:
    """
    Exact vocabulary the frontend uses for chip matching (see lib/menu-preferences-payload.ts):
    dietary keys, spice_label, budget_tier, cuisine display names, smart_tag labels only.
    """
    if prefs is None or not isinstance(prefs, dict):
        return frozenset()
    out: set[str] = set()

    dietary = prefs.get("dietary")
    if isinstance(dietary, list):
        for x in dietary:
            if isinstance(x, str) and x.strip():
                out.add(x.strip())

    spice = prefs.get("spice_label")
    if isinstance(spice, str) and spice.strip():
        out.add(spice.strip())

    budget = prefs.get("budget_tier")
    if isinstance(budget, str) and budget.strip():
        out.add(budget.strip())

    cuisines = prefs.get("cuisines")
    if isinstance(cuisines, list):
        for x in cuisines:
            if isinstance(x, str) and x.strip():
                out.add(x.strip())

    smart = prefs.get("smart_tags")
    if isinstance(smart, list):
        for row in smart:
            if isinstance(row, dict):
                lab = row.get("label")
                if isinstance(lab, str) and lab.strip():
                    if row.get("category") == "allergy":
                        out.update(allergy_dish_tags(lab))
                    elif row.get("category") == "dislike":
                        out.update(avoidance_dish_tags(lab))
                    else:
                        out.add(lab.strip())

    return frozenset(out)


def _resolve_tag_to_allowed(tag: str, allowed: frozenset[str]) -> str | None:
    """Exact match first; else case-insensitive match to a single canonical string."""
    if not allowed:
        return None
    t = tag.strip()
    if not t:
        return None
    if t in allowed:
        return t
    tl = t.lower()
    for a in allowed:
        if a.lower() == tl:
            return a
    return None


def constrain_menu_tags_to_allowed_tags(menu: dict[str, Any], allowed: frozenset[str]) -> None:
    """
    Mutates menu in place: each item's tags become only allowed preference strings,
    deduped, in stable order. Aligns with lib/menu-scan-schema.ts chip intersection.
    """
    for sec in menu.get("sections") or []:
        for it in sec.get("items") or []:
            raw = it.get("tags")
            if not isinstance(raw, list):
                it["tags"] = []
                continue
            seen: set[str] = set()
            fixed: list[str] = []
            for x in raw:
                if not isinstance(x, str):
                    continue
                canon = _resolve_tag_to_allowed(x, allowed)
                if canon is not None and canon not in seen:
                    seen.add(canon)
                    fixed.append(canon)
            it["tags"] = fixed
