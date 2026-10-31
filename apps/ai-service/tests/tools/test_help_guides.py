"""Unit tests for help_guide tool (SUP-3).

Pure stdlib + asserts, runnable both ways:
  * pytest:        pytest apps/ai-service/tests/tools/test_help_guides.py
  * standalone:    python apps/ai-service/tests/tools/test_help_guides.py
"""

from __future__ import annotations

import ast
import re
import asyncio
import os
import sys

# Ensure apps/ai-service is on sys.path
_AI_SERVICE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if _AI_SERVICE_DIR not in sys.path:
    sys.path.insert(0, _AI_SERVICE_DIR)

# Reconfigure stdout to utf-8 if supported on Windows
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

from src.tools.definitions.help_guides import (
    HELP_GUIDES,
    HelpGuideInput,
    execute_help_guide,
    get_guide,
    help_guide,
    help_guide_tool,
    search_guides,
)


def test_guides_metadata_integrity():
    """Verify that exactly 17 guides exist, each with non-empty screens and 3-5 steps."""
    assert len(HELP_GUIDES) == 17, f"Expected 17 guides, found {len(HELP_GUIDES)}"

    for slug, guide in HELP_GUIDES.items():
        assert "title_ar" in guide and bool(guide["title_ar"]), f"{slug}: missing title_ar"
        assert "intents" in guide and isinstance(guide["intents"], list) and len(guide["intents"]) > 0, f"{slug}: intents empty"
        assert "steps" in guide and isinstance(guide["steps"], list), f"{slug}: steps not a list"
        step_count = len(guide["steps"])
        assert 3 <= step_count <= 5, f"{slug}: expected 3-5 steps, found {step_count}"
        assert "screens" in guide and isinstance(guide["screens"], list), f"{slug}: screens not a list"
        assert len(guide["screens"]) > 0, f"{slug}: screens is empty"
        for sc in guide["screens"]:
            assert sc.startswith("/"), f"{slug}: screen '{sc}' must start with /"
        assert "ticket_when" in guide and bool(guide["ticket_when"]), f"{slug}: missing ticket_when"


def test_twenty_real_world_queries():
    """Verify that all 20 real merchant questions return the exact expected top-1 slug."""
    queries_and_expected = [
        ("عايز أضيف منتج", "store"),
        ("أرفع منتجات جديدة", "store"),
        ("أغير حالة أوردر", "order-workflow"),
        ("أبعت واتساب للعميل", "whatsapp-business"),
        ("البوت مش بيرد", "bot-automation"),
        ("أعدل كمية المخزون", "inventory-pro"),
        ("أطلع بوليصة شحن", "order-shipping-turbo"),
        ("أربط شركة شحن", "order-shipping-turbo"),
        ("أشوف النواقص", "inventory-pro"),
        ("أظبط مدة الإرجاع", "returns-settings"),
        ("أسباب المرتجعات", "returns-reasons-analytics"),
        ("نسبة الإلغاء", "orders-analytics"),
        ("صافي الربح", "profit-analytics"),
        ("الأوردر جاي منين", "campaign-attribution"),
        ("تكلفة الأوردر للحملة", "campaign-attribution-analytics"),
        ("أعمل حملة فيسبوك", "facebook-ads-pro"),
        ("أربط صفحة فيسبوك", "facebook-pages-connect"),
        ("الرسائل فين", "unified-inbox"),
        ("أرد على عميل", "unified-inbox"),
        ("أغير حالة مجموعة أوردرات", "bulk-orders"),
    ]

    for query, expected_slug in queries_and_expected:
        res = search_guides(query)
        assert res["count"] > 0, f"Query '{query}' returned 0 results"
        top_result = res["results"][0]
        assert top_result["slug"] == expected_slug, (
            f"Query '{query}' returned slug '{top_result['slug']}', expected '{expected_slug}' "
            f"(score={top_result['score']}, all results={[r['slug'] for r in res['results']]})"
        )
        assert "title_ar" in top_result
        assert "score" in top_result
        assert "first_step" in top_result and bool(top_result["first_step"])


def test_unsupported_query_returns_zero_results_and_message():
    """Verify that a question with no matching guide returns 0 results and mentions 'مفيش دليل'."""
    res = search_guides("عايز أبيع أسهم")
    assert res["count"] == 0
    assert len(res["results"]) == 0
    assert "مفيش دليل" in res.get("message_ar", "")
    assert res.get("support_ticket_link_suggested") is True


def test_get_guide_formatting():
    """Verify that get_guide returns numbered steps, full https URLs for screens, agent, and ticket_when."""
    res = get_guide("store")
    assert res["slug"] == "store"
    assert res["title_ar"] == "إضافة منتج وتظبيط المتجر"
    assert res["agent"] == "inventory-pricing-agent"
    assert "ticket_when" in res and bool(res["ticket_when"])

    # Numbered steps
    assert len(res["steps"]) == 5
    for i, step in enumerate(res["steps"]):
        assert step.startswith(f"{i+1}."), f"Step '{step}' does not start with '{i+1}.'"

    # Screens are full URLs
    assert len(res["screens"]) == 3
    for screen in res["screens"]:
        assert screen.startswith("https://maxp.online/"), f"Screen '{screen}' is not full https://maxp.online URL"

    # Message AR formatted
    assert "https://maxp.online/products" in res["message_ar"]
    assert "inventory-pricing-agent" in res["message_ar"]


def test_get_guide_nonexistent():
    """Verify that get_guide for nonexistent slug returns clear error and 'مفيش دليل'."""
    res = get_guide("nonexistent-feature")
    assert "error" in res
    assert "مفيش دليل" in res.get("message_ar", "")


def test_pure_function_no_network_imports():
    """Verify help_guides.py has zero network/HTTP imports (pure stdlib)."""
    banned_modules = {
        "requests",
        "httpx",
        "aiohttp",
        "urllib.request",
        "http.client",
        "socket",
    }
    src_path = os.path.join(_AI_SERVICE_DIR, "src", "tools", "definitions", "help_guides.py")
    with open(src_path, "r", encoding="utf-8") as f:
        tree = ast.parse(f.read(), filename=src_path)

    imported_modules: set[str] = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for alias in node.names:
                imported_modules.add(alias.name.split(".")[0])
        elif isinstance(node, ast.ImportFrom):
            if node.module:
                imported_modules.add(node.module.split(".")[0])

    forbidden = imported_modules & banned_modules
    assert not forbidden, f"Forbidden network imports found in help_guides.py: {forbidden}"


def test_async_help_guide_invocation():
    """Verify async help_guide handles HelpGuideInput properly."""
    # Test search
    inp_search = HelpGuideInput(action="search", query="أغير حالة أوردر")
    res_search = asyncio.run(help_guide(inp_search))
    assert res_search["action"] == "search"
    assert res_search["results"][0]["slug"] == "order-workflow"

    # Test get
    inp_get = HelpGuideInput(action="get", slug="order-workflow")
    res_get = asyncio.run(help_guide(inp_get))
    assert res_get["action"] == "get"
    assert res_get["slug"] == "order-workflow"
    assert len(res_get["steps"]) == 4
    assert res_get["screens"][0] == "https://maxp.online/orders"
    assert res_get["agent"] == "order-confirmation-agent"

    # Tool registration attributes
    assert help_guide_tool.name == "help_guide"
    assert help_guide_tool.input_model == HelpGuideInput




def test_all_guide_screens_exist_in_frontend_app_tsx():
    """Verify that every screen URL in HELP_GUIDES exists in frontend App.tsx (0 dead links) (SUP-5)."""
    repo_root = os.path.dirname(os.path.dirname(_AI_SERVICE_DIR))
    app_tsx_path = os.path.join(repo_root, "apps", "frontend", "src", "App.tsx")
    assert os.path.isfile(app_tsx_path), f"App.tsx not found at {app_tsx_path}"

    with open(app_tsx_path, "r", encoding="utf-8") as f:
        app_content = f.read()

    routes = set(re.findall(r'path=["\']([^"\']+)["\']', app_content))
    assert len(routes) > 100, f"Expected >100 routes in App.tsx, found {len(routes)}"

    dead_screens = []
    total_screens = 0
    for slug, guide in HELP_GUIDES.items():
        for screen in guide.get("screens", []):
            total_screens += 1
            clean_path = screen.replace("https://maxp.online", "")
            if clean_path not in routes:
                dead_screens.append((slug, screen, clean_path))

    assert not dead_screens, f"Dead screen links found in HELP_GUIDES: {dead_screens}"


def test_help_guides_zero_forbidden_promise_or_discount_phrases():
    """Verify 0 forbidden promise/discount phrases in HELP_GUIDES (SUP-4 & SUP-5)."""
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
    for slug, guide in HELP_GUIDES.items():
        text = str(guide)
        for phrase in forbidden_phrases:
            if phrase in text:
                violations.append((slug, phrase))

    assert not violations, f"Forbidden phrases found in HELP_GUIDES: {violations}"


if __name__ == "__main__":
    test_functions = [
        (name, func)
        for name, func in sorted(globals().items())
        if name.startswith("test_") and callable(func)
    ]
    failed = 0
    print(f"Running {len(test_functions)} standalone help_guides tests...\n")
    for name, fn in test_functions:
        try:
            fn()
            print(f"  PASS  {name}")
        except Exception as exc:
            failed += 1
            print(f"  FAIL  {name}: {exc}")

    print(f"\nResult: {len(test_functions) - failed}/{len(test_functions)} tests passed.")
    sys.exit(1 if failed else 0)
