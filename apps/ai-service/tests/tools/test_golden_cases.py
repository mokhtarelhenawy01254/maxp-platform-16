"""Unit and integration tests for golden eval cases (AGENT-COV-5b).

Pure stdlib + asserts, runnable both ways:
  * CI:            pytest tests/tools/test_golden_cases.py
  * standalone:    python tests/tools/test_golden_cases.py
"""
from __future__ import annotations

import copy
import os
import sys
from pathlib import Path

# Ensure apps/ai-service is on sys.path
AI_SERVICE_DIR = Path(__file__).resolve().parents[2]
REPO_ROOT = Path(__file__).resolve().parents[4]
if str(AI_SERVICE_DIR) not in sys.path:
    sys.path.insert(0, str(AI_SERVICE_DIR))

# Reconfigure stdout to utf-8 if supported on Windows
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

from src.evals.golden_cases import known_capabilities, load_cases, validate
from src.tools.app_cards import APP_CARDS
from src.tools.definitions.help_guides import HELP_GUIDES, search_guides
import re


GOLDEN_FILE = AI_SERVICE_DIR / "evals" / "golden" / "app_cases.json"


def test_real_golden_cases_validate_clean():
    """Verify that the production app_cases.json validates with 0 errors."""
    assert GOLDEN_FILE.exists(), f"Golden cases file missing at {GOLDEN_FILE}"

    data = load_cases(GOLDEN_FILE)
    cases = data.get("cases", [])
    assert isinstance(cases, list)
    assert len(cases) >= 81, f"Expected at least 81 cases, found {len(cases)}"

    known = known_capabilities(REPO_ROOT)
    assert len(known) >= 50, f"Expected at least 50 known capabilities, found {len(known)}"

    errors = validate(data, known, APP_CARDS.keys())
    if errors:
        error_msg = "\n".join(f"  - {err}" for err in errors)
        assert False, f"Golden cases failed validation with {len(errors)} error(s):\n{error_msg}"


def test_coverage_all_27_slugs_at_least_three_cases():
    """Verify that every single required app card has at least 3 golden cases."""
    data = load_cases(GOLDEN_FILE)
    cases = data.get("cases", [])

    by_app: dict[str, list[dict]] = {}
    for c in cases:
        app = c.get("app")
        by_app.setdefault(app, []).append(c)

    known = known_capabilities(REPO_ROOT)

    for slug in APP_CARDS.keys():
        app_cases = by_app.get(slug, [])
        assert len(app_cases) >= 3, (
            f"App '{slug}' has only {len(app_cases)} golden case(s); expected >= 3"
        )

        # Check if the app has a write capability in WRITE_TOOL_NAMES among known capabilities
        app_has_write = any(
            known.get(cap, {}).get("write")
            for c in app_cases
            for cap in c.get("expected_capabilities", [])
        )
        if app_has_write:
            approval_cases = [c for c in app_cases if c.get("expect_approval") is True]
            assert len(approval_cases) >= 1, (
                f"App '{slug}' contains write capability but has no case with expect_approval=True"
            )


def test_negative_fake_capability():
    """Negative test: A case with an unknown/hallucinated capability must fail validation."""
    data = load_cases(GOLDEN_FILE)
    test_cases = copy.deepcopy(data.get("cases", []))

    # Inject hallucinated capability into the first case
    test_cases[0]["expected_capabilities"].append("hallucinated_fake_tool_xyz123")

    known = known_capabilities(REPO_ROOT)
    errors = validate({"cases": test_cases}, known, APP_CARDS.keys())

    assert len(errors) >= 1, "Expected validation to fail for hallucinated capability, but it passed"
    assert any("hallucinated_fake_tool_xyz123" in err and test_cases[0]["id"] in err for err in errors), (
        f"Error message did not mention the fake tool and case id: {errors}"
    )


def test_negative_write_capability_without_approval():
    """Negative test: A mutating capability with expect_approval=False must fail validation."""
    known = known_capabilities(REPO_ROOT)
    sample_cases = [
        {
            "id": "neg-test-write-no-approval",
            "app": "order-core",
            "question": "الغِي الأوردر رقم 1052 فورا بدون موافقة",
            "expected_capabilities": ["order_cancel"],
            "forbidden_capabilities": [],
            "expect_approval": False,  # ERROR: order_cancel is in WRITE_TOOL_NAMES
        }
    ]

    errors = validate(sample_cases, known, APP_CARDS.keys())
    assert len(errors) >= 1, "Expected validation to fail for write capability with expect_approval=False"
    assert any("order_cancel" in err and "expect_approval" in err and "False" in err for err in errors), (
        f"Expected approval failure error, got: {errors}"
    )


def test_negative_empty_or_short_question():
    """Negative test: Empty or excessively short questions (<8 chars) must fail validation."""
    known = known_capabilities(REPO_ROOT)
    sample_cases = [
        {
            "id": "neg-test-empty-question",
            "app": "order-core",
            "question": "أوردر؟",  # 6 chars < 8 chars
            "expected_capabilities": ["order_summary"],
            "forbidden_capabilities": [],
            "expect_approval": False,
        }
    ]

    errors = validate(sample_cases, known, APP_CARDS.keys())
    assert len(errors) >= 1, "Expected validation to fail for short question"
    assert any("too short" in err for err in errors), f"Expected short question error, got: {errors}"


def test_negative_duplicate_id():
    """Negative test: Duplicate case IDs must be detected and rejected."""
    known = known_capabilities(REPO_ROOT)
    sample_cases = [
        {
            "id": "dup-id-1",
            "app": "order-core",
            "question": "كام أوردر جالي النهاردة في المتجر؟",
            "expected_capabilities": ["order_summary"],
            "forbidden_capabilities": [],
            "expect_approval": False,
        },
        {
            "id": "dup-id-1",  # DUPLICATE
            "app": "order-core",
            "question": "عايز أشوف إجمالي مبيعات اليوم من الطلبات",
            "expected_capabilities": ["order_summary"],
            "forbidden_capabilities": [],
            "expect_approval": False,
        },
    ]

    errors = validate(sample_cases, known, APP_CARDS.keys())
    assert len(errors) >= 1, "Expected validation to fail for duplicate ID"
    assert any("duplicate case id" in err and "dup-id-1" in err for err in errors), (
        f"Expected duplicate id error, got: {errors}"
    )


def test_negative_catalog_app_mismatch():
    """Negative test: A capability bound to one app in catalog cannot be expected for another."""
    known = known_capabilities(REPO_ROOT)
    sample_cases = [
        {
            "id": "mismatch-app-test",
            "app": "coupons-pro",  # WRONG: returns_requests_list is bound to order-core
            "question": "استعرض طلبات المرتجعات المعلقة في النظام",
            "expected_capabilities": ["returns_requests_list"],
            "forbidden_capabilities": [],
            "expect_approval": False,
        }
    ]

    errors = validate(sample_cases, known, APP_CARDS.keys())
    assert len(errors) >= 1, "Expected validation to fail for catalog app mismatch"
    assert any("bound to app 'order-core'" in err for err in errors), (
        f"Expected app mismatch error, got: {errors}"
    )




def test_twenty_how_to_golden_queries_return_expected_slug_first_attempt():
    """Verify all 20 real how-to golden questions return the exact expected slug on the first try (SUP-5)."""
    data = load_cases(GOLDEN_FILE)
    cases = [c for c in data.get("cases", []) if c.get("expected_slug") is not None]
    assert len(cases) == 20, f"Expected exactly 20 how-to cases with expected_slug, found {len(cases)}"

    print("\n  --- 20 Real 'How-To' Questions Benchmark Report ---")
    print(f"  {'#':<3} | {'Merchant Question':<28} | {'Expected Slug':<28} | {'Actual Slug':<28} | {'Score':<6} | {'Status'}")
    print("  " + "-" * 105)

    passed = 0
    failures = []
    for idx, c in enumerate(cases, 1):
        q = c["question"]
        expected_slug = c["expected_slug"]
        res = search_guides(q)
        top = res["results"][0] if res.get("count", 0) > 0 else None
        actual_slug = top["slug"] if top else None
        score = top["score"] if top else 0
        is_ok = (actual_slug == expected_slug)
        if is_ok:
            passed += 1
            status = "PASS"
        else:
            status = "FAIL"
            failures.append((q, expected_slug, actual_slug))

        print(f"  {idx:<3} | {q:<28} | {expected_slug:<28} | {str(actual_slug):<28} | {score:<6} | {status}")

    print("  " + "-" * 105)
    print(f"  Benchmark Result: {passed}/20 passed on top-1 result.\n")

    assert passed == 20, f"Expected 20/20 passed, but {len(failures)} failed: {failures}"


def test_out_of_scope_golden_case_returns_zero_results_and_ticket_suggestion():
    """Verify out-of-scope question returns 0 results, 'مفيش دليل', and suggests ticket link (SUP-5)."""
    data = load_cases(GOLDEN_FILE)
    cases = [c for c in data.get("cases", []) if c.get("id") == "sup-out-of-scope-stocks-1"]
    assert len(cases) == 1, "Missing sup-out-of-scope-stocks-1 case"
    case = cases[0]

    res = search_guides(case["question"])
    assert res["count"] == 0, f"Expected 0 results for out-of-scope question, got {res['count']}"
    assert len(res["results"]) == 0
    assert "مفيش دليل" in res.get("message_ar", ""), f"Expected 'مفيش دليل' in message_ar, got '{res.get('message_ar')}'"
    assert res.get("support_ticket_link_suggested") is True, "Expected support_ticket_link_suggested=True"


def test_identity_disclosure_golden_case_contract():
    """Verify identity disclosure contract: 'أنا مساعد آلي من فريق MaxP' (SUP-4 & SUP-5)."""
    data = load_cases(GOLDEN_FILE)
    cases = [c for c in data.get("cases", []) if c.get("id") == "sup-identity-disclosure-1"]
    assert len(cases) == 1, "Missing sup-identity-disclosure-1 case"
    case = cases[0]

    expected_disclosure = case.get("expected_disclosure")
    assert expected_disclosure == "أنا مساعد آلي من فريق MaxP"

    # Also verify that both agent SOUL.md files contain this exact disclosure
    exec_soul_path = REPO_ROOT / "apps" / "backend" / "agents" / "executive-assistant-agent" / "SOUL.md"
    assert exec_soul_path.exists(), f"Missing {exec_soul_path}"
    exec_soul = exec_soul_path.read_text(encoding="utf-8")
    assert "أنا مساعد آلي من فريق MaxP" in exec_soul, "executive-assistant-agent/SOUL.md must contain disclosure"

    sup_soul_path = REPO_ROOT / "apps" / "backend" / "agents" / "support-agent" / "SOUL.md"
    assert sup_soul_path.exists(), f"Missing {sup_soul_path}"
    sup_soul = sup_soul_path.read_text(encoding="utf-8")
    assert "أنا مساعد آلي من فريق MaxP" in sup_soul, "support-agent/SOUL.md must contain disclosure"


def test_golden_replies_have_zero_forbidden_promise_or_discount_phrases():
    """Verify 0 forbidden promise/discount phrases in goldens, app_cards, and help_guides (SUP-4 & SUP-5)."""
    forbidden_phrases = [
        "أوعدك",
        "هنعمل لك",
        "خصم مضمون",
        "ميزة جاية",
        "هتنزل الأسبوع الجاي",
        "هينزل بكره",
        "مضمون 100%",
    ]
    data = load_cases(GOLDEN_FILE)
    violations = []

    # Check app_cases.json
    for c in data.get("cases", []):
        text = str(c)
        for phrase in forbidden_phrases:
            if phrase in text:
                violations.append((f"case:{c.get('id')}", phrase))

    # Check APP_CARDS
    for slug, card in APP_CARDS.items():
        text = str(card)
        for phrase in forbidden_phrases:
            if phrase in text:
                violations.append((f"app_card:{slug}", phrase))

    # Check HELP_GUIDES
    for slug, guide in HELP_GUIDES.items():
        text = str(guide)
        for phrase in forbidden_phrases:
            if phrase in text:
                violations.append((f"help_guide:{slug}", phrase))

    assert not violations, f"Forbidden promise/discount phrases detected: {violations}"


def test_all_guide_screens_exist_in_frontend_app_tsx():
    """Verify that every screen URL in HELP_GUIDES exists in frontend App.tsx (0 dead links) (SUP-5)."""
    app_tsx_path = REPO_ROOT / "apps" / "frontend" / "src" / "App.tsx"
    assert app_tsx_path.is_file(), f"App.tsx not found at {app_tsx_path}"

    with open(app_tsx_path, "r", encoding="utf-8") as f:
        app_content = f.read()

    routes = set(re.findall(r'path=["\']([^"\']+)["\']', app_content))
    assert len(routes) > 100, f"Expected >100 routes in App.tsx, found {len(routes)}"

    dead_screens = []
    total_screens_checked = 0
    for slug, guide in HELP_GUIDES.items():
        for screen in guide.get("screens", []):
            clean_path = screen.replace("https://maxp.online", "")
            total_screens_checked += 1
            if clean_path not in routes:
                dead_screens.append((slug, screen, clean_path))

    assert not dead_screens, f"Dead screen links found in HELP_GUIDES: {dead_screens}"
    print(f"\n  [Screens Audit] Checked {total_screens_checked} guide screen URLs across {len(HELP_GUIDES)} guides -> 0 dead links.")


def run_all_tests() -> int:
    """Standalone test runner displaying comprehensive results and coverage."""
    tests = [
        ("Real Golden Cases Validation", test_real_golden_cases_validate_clean),
        ("27 Apps Coverage (>=3 cases each)", test_coverage_all_27_slugs_at_least_three_cases),
        ("20 Real 'How-To' Questions (Top-1 Slug)", test_twenty_how_to_golden_queries_return_expected_slug_first_attempt),
        ("Out-of-Scope Fallback & Ticket Suggestion", test_out_of_scope_golden_case_returns_zero_results_and_ticket_suggestion),
        ("Identity Disclosure Contract", test_identity_disclosure_golden_case_contract),
        ("Zero Forbidden Promise / Discount Phrases", test_golden_replies_have_zero_forbidden_promise_or_discount_phrases),
        ("Zero Dead Links in Help Guide Screens", test_all_guide_screens_exist_in_frontend_app_tsx),
        ("Negative: Hallucinated Capability", test_negative_fake_capability),
        ("Negative: Write Capability Missing Approval", test_negative_write_capability_without_approval),
        ("Negative: Empty / Short Question (<8 chars)", test_negative_empty_or_short_question),
        ("Negative: Duplicate Case ID", test_negative_duplicate_id),
        ("Negative: Catalog App Slug Mismatch", test_negative_catalog_app_mismatch),
    ]

    print("=" * 72)
    print("MaxP AI Service — Golden Cases Test Suite (AGENT-COV-5b)")
    print("=" * 72)

    passed = 0
    failed = 0

    for name, test_func in tests:
        try:
            test_func()
            print(f"  [PASS] {name}")
            passed += 1
        except AssertionError as exc:
            print(f"  [FAIL] {name}: {exc}")
            failed += 1
        except Exception as exc:
            print(f"  [ERROR] {name}: {type(exc).__name__}: {exc}")
            failed += 1

    # Print summary & coverage details
    data = load_cases(GOLDEN_FILE)
    cases = data.get("cases", [])
    by_app = {}
    for c in cases:
        by_app.setdefault(c["app"], []).append(c)

    print("-" * 72)
    print(f"Total Cases:     {len(cases)}")
    print(f"Apps Covered:    {len(by_app)} / {len(APP_CARDS)}")
    write_cases = sum(1 for c in cases if c.get("expect_approval") is True)
    print(f"Write Gate (Approval Required): {write_cases} cases")
    print(f"Test Results:    {passed} passed, {failed} failed")
    print("=" * 72)

    return 0 if failed == 0 else 1


if __name__ == "__main__":
    sys.exit(run_all_tests())
