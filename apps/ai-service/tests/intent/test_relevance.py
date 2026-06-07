from __future__ import annotations

from src.intent.relevance import resolve_admin_policy_plan, resolve_tool_plan


def test_legacy_resolve_tool_plan_never_routes_admin_by_keywords():
    plan = resolve_tool_plan(
        "show product catalog and shipping rates",
        ["product_search", "shipping_rates"],
        {"channel": "admin"},
    )

    assert plan.intent == "general.chat"
    assert plan.requiresTool is False
    assert plan.primaryTool is None
    assert plan.allowedTools == []
    assert plan.blockedReason == "MODEL_CLASSIFIER_REQUIRED"
    assert plan.classification == {"classifierRequired": True}


def test_deprecated_admin_policy_plan_is_disabled():
    plan = resolve_admin_policy_plan(
        "create a product",
        ["product_create"],
        {"channel": "admin"},
    )

    assert plan is None
