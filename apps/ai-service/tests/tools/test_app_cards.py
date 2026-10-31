"""Unit and integration tests for app_cards.py and store_capability(action="app") (AGENT-COV-4).

Pure stdlib + asserts, runnable both ways:
  * CI:            pytest tests/tools/test_app_cards.py
  * standalone:    python tests/tools/test_app_cards.py
"""

from __future__ import annotations

import asyncio
import os
import sys
import time
import types

# Ensure apps/ai-service is on sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

# Reconfigure stdout to utf-8 if supported on Windows
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

# ---------------------------------------------------------------------------
# Lightweight stdlib fallback shims for environments without third-party deps
# ---------------------------------------------------------------------------
try:
    import structlog
except ImportError:
    class _DummyLogger:
        def info(self, *a, **kw): pass
        def warning(self, *a, **kw): pass
        def error(self, *a, **kw): pass
        def bind(self, *a, **kw): return self

    mod = types.ModuleType("structlog")
    mod.get_logger = lambda *a, **kw: _DummyLogger()
    sys.modules["structlog"] = mod

try:
    import agent_framework
except ImportError:
    mod = types.ModuleType("agent_framework")

    class FunctionInvocationContext:
        def __init__(self, agent_role=None):
            self.agent_role = agent_role

    class FunctionTool:
        def __init__(self, name, description, func, input_model):
            self.name = name
            self.description = description
            self.func = func
            self.input_model = input_model

    mod.FunctionInvocationContext = FunctionInvocationContext
    mod.FunctionTool = FunctionTool
    sys.modules["agent_framework"] = mod

try:
    import pydantic
except ImportError:
    mod = types.ModuleType("pydantic")

    class BaseModel:
        def __init__(self, **kw):
            for k, v in self.__class__.__dict__.items():
                if not k.startswith("_") and not callable(v):
                    setattr(self, k, v)
            for k, v in kw.items():
                setattr(self, k, v)

    def Field(*args, **kwargs):
        if "default" in kwargs:
            return kwargs["default"]
        if "default_factory" in kwargs and callable(kwargs["default_factory"]):
            return kwargs["default_factory"]()
        return None

    mod.BaseModel = BaseModel
    mod.Field = Field
    sys.modules["pydantic"] = mod

from src.tools.app_cards import APP_CARDS, get_app_card, list_app_slugs
from src.tools.definitions import store_capability as sc_mod
from src.tools.definitions.store_capability import StoreCapabilityInput, store_capability

# The 26+ canonical slugs guarded by checkAppAccess in the backend
REQUIRED_APP_SLUGS = [
    "order-core",
    "order-invoicing",
    "order-shipping-turbo",
    "order-shipping-hub",
    "inventory-pro",
    "coupons-pro",
    "crm-basic",
    "crm-lite",
    "campaign-attribution",
    "whatsapp-business",
    "unified-inbox",
    "facebook-pages-connect",
    "hr-core",
    "treasury-expenses-pro",
    "accounting",
    "procurement-pro",
    "manufacturing",
    "pos-pro",
    "cafe-restaurant-pro",
    "booking-app",
    "academy-app",
    "dental-lab-app",
    "radiology-app",
    "marketing-agency-pro",
    "internal-courier-fleet",
    "amazon-affiliate-pro",
    "woocommerce-pro",
]

# The 17 applications comprising the complete store bundle (baca)
STORE_COMPLETE_BUNDLE_SLUGS = [
    "store",
    "order-workflow",
    "whatsapp-business",
    "bot-automation",
    "bulk-orders",
    "order-preparation-hold",
    "order-shipping-turbo",
    "inventory-pro",
    "returns-settings",
    "returns-reasons-analytics",
    "orders-analytics",
    "profit-analytics",
    "campaign-attribution",
    "campaign-attribution-analytics",
    "facebook-ads-pro",
    "facebook-pages-connect",
    "unified-inbox",
]



def _has_arabic(text: str) -> bool:
    """Return True if the text contains Arabic characters."""
    return any("\u0600" <= ch <= "\u06ff" for ch in text)


def test_app_cards_zero_forbidden_promise_or_discount_phrases():
    """Verify 0 forbidden promise/discount phrases in all APP_CARDS (SUP-4 & SUP-5)."""
    forbidden_phrases = [
        "أوعدك",
        "هنعمل لك",
        "خصم مضمون",
        "ميزة جاية",
        "هتنزل الأسبوع الجاي",
        "هينزل بكره",
        "مضمون 100%",
    ]
    violations = []
    for slug, card in APP_CARDS.items():
        text = str(card)
        for phrase in forbidden_phrases:
            if phrase in text:
                violations.append((slug, phrase))

    assert not violations, f"Forbidden phrases found in APP_CARDS: {violations}"


# ===========================================================================
# 1. App Cards Unit Tests
# ===========================================================================

def test_app_cards_total_count_is_38():
    """Verify that APP_CARDS contains exactly 38 application cards (27 original + 11 bundle additions)."""
    assert len(APP_CARDS) == 38, f"Expected exactly 38 cards, found {len(APP_CARDS)}"


def test_all_17_store_complete_bundle_slugs_have_cards():
    """Verify that all 17 application slugs in the store-complete bundle have registered cards (assert 17/17)."""
    assert len(STORE_COMPLETE_BUNDLE_SLUGS) == 17
    covered = [s for s in STORE_COMPLETE_BUNDLE_SLUGS if get_app_card(s) is not None]
    assert len(covered) == 17, (
        f"Missing bundle cards: {set(STORE_COMPLETE_BUNDLE_SLUGS) - set(covered)} "
        f"({len(covered)}/17)"
    )
    assert len(covered) == len(STORE_COMPLETE_BUNDLE_SLUGS)


def test_every_card_has_exact_five_questions_and_non_empty_metadata():
    """Every single card in APP_CARDS must have exactly 5 questions and non-empty screens, limits, name_ar, summary_ar."""
    assert len(APP_CARDS) == 38, f"Expected 38 cards, got {len(APP_CARDS)}"
    for slug, card in APP_CARDS.items():
        assert card.get("name_ar"), f"Slug '{slug}' has empty name_ar"
        assert _has_arabic(card["name_ar"]), f"Slug '{slug}' name_ar is not Arabic"
        assert card.get("summary_ar"), f"Slug '{slug}' has empty summary_ar"
        assert _has_arabic(card["summary_ar"]), f"Slug '{slug}' summary_ar is not Arabic"
        assert isinstance(card.get("screens"), list) and len(card["screens"]) > 0, f"Slug '{slug}' has empty screens"
        for screen in card["screens"]:
            assert screen.startswith("/"), f"Slug '{slug}' screen '{screen}' does not start with /"
        assert isinstance(card.get("capability_domains"), list) and len(card["capability_domains"]) > 0, f"Slug '{slug}' has empty capability_domains"
        assert isinstance(card.get("limits"), list) and len(card["limits"]) > 0, f"Slug '{slug}' has empty limits"
        for limit in card["limits"]:
            assert _has_arabic(limit), f"Slug '{slug}' limit '{limit}' is not Arabic"
        questions = card.get("top_questions", [])
        assert isinstance(questions, list), f"Slug '{slug}' top_questions is not a list"
        assert len(questions) == 5, f"Slug '{slug}' must have exactly 5 questions, found {len(questions)}"
        for q in questions:
            assert q and _has_arabic(q), f"Slug '{slug}' question is empty or not Arabic: {q!r}"


def test_all_26_slugs_have_complete_cards():
    """Verify that every single required slug has a card with non-empty fields."""
    for slug in REQUIRED_APP_SLUGS:
        card = get_app_card(slug)
        assert card is not None, f"Slug '{slug}' missing from APP_CARDS"
        assert card.get("name_ar"), f"Slug '{slug}' has empty name_ar"
        assert _has_arabic(card["name_ar"]), f"Slug '{slug}' name_ar is not Arabic"
        assert card.get("summary_ar"), f"Slug '{slug}' has empty summary_ar"
        assert _has_arabic(card["summary_ar"]), f"Slug '{slug}' summary_ar is not Arabic"
        assert isinstance(card.get("screens"), list) and len(card["screens"]) > 0, f"Slug '{slug}' has empty screens"
        for screen in card["screens"]:
            assert screen.startswith("/"), f"Slug '{slug}' screen '{screen}' does not start with /"
        assert isinstance(card.get("capability_domains"), list) and len(card["capability_domains"]) > 0, f"Slug '{slug}' has empty capability_domains"
        assert isinstance(card.get("limits"), list) and len(card["limits"]) > 0, f"Slug '{slug}' has empty limits"
        for limit in card["limits"]:
            assert _has_arabic(limit), f"Slug '{slug}' limit '{limit}' is not Arabic"


def test_every_card_has_at_least_five_egyptian_questions():
    """Every card must provide at least 5 natural Egyptian Arabic merchant questions."""
    for slug in REQUIRED_APP_SLUGS:
        card = get_app_card(slug)
        assert card is not None
        questions = card.get("top_questions", [])
        assert isinstance(questions, list), f"Slug '{slug}' top_questions is not a list"
        assert len(questions) >= 5, f"Slug '{slug}' has fewer than 5 questions ({len(questions)})"
        for q in questions:
            assert q and _has_arabic(q), f"Slug '{slug}' question is empty or not Arabic: {q!r}"


def test_get_app_card_nonexistent_returns_none():
    """Querying an unknown slug or empty string must return None."""
    assert get_app_card("nonexistent") is None
    assert get_app_card("unknown-slug-xyz") is None
    assert get_app_card("") is None
    assert get_app_card(None) is None  # type: ignore


def test_list_app_slugs_returns_sorted_list():
    """list_app_slugs() must return a sorted list containing all 38 required slugs."""
    slugs = list_app_slugs()
    assert isinstance(slugs, list)
    assert len(slugs) == 38, f"Expected 38 slugs, got {len(slugs)}"
    assert slugs == sorted(slugs)
    for req in REQUIRED_APP_SLUGS:
        assert req in slugs, f"Required slug '{req}' missing from list_app_slugs()"
    for b_slug in STORE_COMPLETE_BUNDLE_SLUGS:
        assert b_slug in slugs, f"Bundle slug '{b_slug}' missing from list_app_slugs()"


def test_get_app_card_returns_deep_copy():
    """Mutating returned card must not alter the master APP_CARDS dictionary."""
    card = get_app_card("order-core")
    assert card is not None
    original_len = len(card["top_questions"])
    card["top_questions"].append("سؤال تجريبي إضافي؟")
    card2 = get_app_card("order-core")
    assert card2 is not None
    assert len(card2["top_questions"]) == original_len


def test_aliases_resolve_to_canonical_cards():
    """Common slug aliases (e.g. dental-lab -> dental-lab-app) should resolve."""
    card_alias = get_app_card("dental-lab")
    card_canonical = get_app_card("dental-lab-app")
    assert card_alias is not None
    assert card_canonical is not None
    assert card_alias["name_ar"] == card_canonical["name_ar"]


# ===========================================================================
# 2. Integration Tests: store_capability(action="app") with Stubs
# ===========================================================================

def test_store_capability_app_active_returns_card():
    """An active app returns success=True with the card and its localized details."""
    async def _test():
        company_id = "tenant_alpha"
        # Prime the cache with active apps
        sc_mod._apps_cache[company_id] = ({"order-core", "inventory-pro"}, time.monotonic() + 300)

        res = await store_capability(StoreCapabilityInput(
            action="app",
            app_slug="order-core",
            company_id=company_id,
        ))

        assert res.get("success") is True
        assert res.get("action") == "app"
        assert res.get("app_slug") == "order-core"
        assert "card" in res
        assert res["card"]["name_ar"] == "إدارة الطلبات المتقدمة والمرتجعات"
        assert len(res["card"]["top_questions"]) >= 5
        # Top-level unpacked fields present as well
        assert res.get("name_ar") == "إدارة الطلبات المتقدمة والمرتجعات"
        assert "/orders" in res.get("screens", [])

    asyncio.run(_test())


def test_store_capability_app_inactive_returns_needs_activation():
    """An installed or uninstalled app that is not active for the company returns needs_activation=True."""
    async def _test():
        company_id = "tenant_alpha"
        # tenant only has order-core active
        sc_mod._apps_cache[company_id] = ({"order-core"}, time.monotonic() + 300)

        res = await store_capability(StoreCapabilityInput(
            action="app",
            app_slug="hr-core",
            company_id=company_id,
        ))

        assert res.get("success") is True
        assert res.get("needs_activation") is True
        assert res.get("app_slug") == "hr-core"
        assert res.get("card") is None
        assert "مش مفعّل على الشركة" in res.get("message", "")

    asyncio.run(_test())


def test_store_capability_app_without_slug_returns_active_list():
    """action='app' without app_slug returns list of active slugs for the company."""
    async def _test():
        company_id = "tenant_beta"
        sc_mod._apps_cache[company_id] = ({"order-core", "inventory-pro", "coupons-pro"}, time.monotonic() + 300)

        res = await store_capability(StoreCapabilityInput(
            action="app",
            company_id=company_id,
        ))

        assert res.get("success") is True
        assert res.get("action") == "app"
        assert res.get("active_apps") == ["coupons-pro", "inventory-pro", "order-core"]
        assert res.get("count") == 3

    asyncio.run(_test())


def test_store_capability_app_empty_company_returns_empty_active_list():
    """Tenant without active apps returns empty active_apps list."""
    async def _test():
        company_id = "tenant_empty"
        sc_mod._apps_cache[company_id] = (set(), time.monotonic() + 300)

        res = await store_capability(StoreCapabilityInput(
            action="app",
            company_id=company_id,
        ))

        assert res.get("success") is True
        assert res.get("active_apps") == []
        assert res.get("count") == 0

    asyncio.run(_test())


def test_store_capability_unknown_action_returns_error():
    """Actions other than search, execute, app return unknown action error."""
    async def _test():
        res = await store_capability(StoreCapabilityInput(
            action="unknown_action",
            company_id="any",
        ))
        assert res.get("success") is False
        assert "Unknown action" in res.get("error", "")

    asyncio.run(_test())


# ===========================================================================
# Standalone Runner
# ===========================================================================

if __name__ == "__main__":
    tests = [(n, f) for n, f in sorted(globals().items()) if n.startswith("test_") and callable(f)]
    failed = 0
    print(f"Running {len(tests)} tests for app_cards...")
    print()
    for name, fn in tests:
        try:
            fn()
            print(f"PASS  {name}")
        except AssertionError as exc:
            failed += 1
            print(f"FAIL  {name}: {exc}")
        except Exception as exc:
            failed += 1
            print(f"ERROR {name}: {exc}")
    print()
    print(f"{len(tests) - failed}/{len(tests)} passed")
    sys.exit(1 if failed else 0)
