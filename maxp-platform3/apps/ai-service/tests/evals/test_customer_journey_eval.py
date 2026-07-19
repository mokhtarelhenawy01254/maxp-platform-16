from __future__ import annotations

from src.evals.customer_journey_eval import (
    evaluate_customer_order_journey,
    summarize_customer_journey_eval,
)


def _turn_with_trace(name: str, params: dict, *, reply: str = "model reply") -> dict:
    return {
        "reply": reply,
        "pipeline_trace": {
            "modelSelection": {
                "provider": "NVIDIA",
                "model": "openai/gpt-oss-120b",
                "keyId": "nvidia-key-1",
            },
            "toolExecutions": [
                {
                    "name": name,
                    "status": "success",
                    "success": True,
                    "params": params,
                    "output": {"status": "STRUCTURED_TOOL_RESULT"},
                }
            ],
        },
    }


def _passing_order_journey() -> list[dict]:
    return [
        _turn_with_trace(
            "product.search",
            {"query": "running shoes", "use_vector": False},
        ),
        _turn_with_trace(
            "inventory.check",
            {
                "product_name_or_sku": "Sprint X",
                "product_size": "42",
                "product_color": "black",
                "use_vector": False,
            },
        ),
        _turn_with_trace(
            "shipping.rates",
            {"governorate": "Cairo"},
        ),
        {
            "reply": "Your order has been created.",
            "tool_calls": [
                {
                    "tool": "order.create_confirmed",
                    "status": "success",
                    "params": {
                        "customer_name": "Test Customer",
                        "customer_phone": "01000000000",
                        "product_name": "Sprint X",
                        "product_price": 1499,
                        "product_size": "42",
                        "product_color": "black",
                        "quantity": 1,
                        "address": "10 Test Street",
                        "city": "Cairo",
                        "confirmed_by_customer": True,
                    },
                    "output": {
                        "status": "EXECUTED",
                        "action": "ORDER_CREATED",
                        "result": {"orderNumber": "ORD-1001"},
                    },
                }
            ],
            "pipeline_trace": {
                "modelSelection": {
                    "provider": "NVIDIA",
                    "model": "openai/gpt-oss-120b",
                    "keyId": "nvidia-key-1",
                },
                "toolExecutions": [
                    {
                        "name": "inventory.check",
                        "status": "success",
                        "success": True,
                        "params": {
                            "product_name_or_sku": "Sprint X",
                            "product_size": "42",
                            "product_color": "black",
                            "use_vector": False,
                        },
                        "output": {
                            "status": "AVAILABLE",
                            "price": {"amount": 1499, "currency": "EGP"},
                        },
                    },
                    {
                        "name": "order.create_confirmed",
                        "status": "success",
                        "success": True,
                        "params": {
                            "customer_name": "Test Customer",
                            "customer_phone": "01000000000",
                            "product_name": "Sprint X",
                            "product_price": 1499,
                            "product_size": "42",
                            "product_color": "black",
                            "quantity": 1,
                            "address": "10 Test Street",
                            "city": "Cairo",
                            "confirmed_by_customer": True,
                        },
                        "output": {
                            "status": "EXECUTED",
                            "action": "ORDER_CREATED",
                            "result": {"orderNumber": "ORD-1001"},
                        },
                    },
                ],
            },
        },
    ]


def test_customer_order_journey_eval_passes_complete_direct_order_flow() -> None:
    report = evaluate_customer_order_journey(
        _passing_order_journey(),
        expected_provider="NVIDIA",
        expected_key_id="nvidia-key-1",
    )

    assert report["passed"] is True
    assert report["failures"] == []
    assert report["checks"]["toolSequence"]["passed"] is True
    assert report["checks"]["vectorPolicy"]["passed"] is True
    assert report["checks"]["orderExecution"]["passed"] is True
    assert report["checks"]["orderApproval"]["passed"] is True
    assert report["checks"]["providerPolicy"]["passed"] is True
    assert report["checks"]["finalReplies"]["passed"] is True


def test_customer_order_journey_eval_fails_when_inventory_vector_policy_is_missing() -> None:
    turns = _passing_order_journey()
    turns[1]["pipeline_trace"]["toolExecutions"][0]["params"].pop("use_vector")

    report = evaluate_customer_order_journey(turns, expected_provider="NVIDIA")

    assert report["passed"] is False
    assert "vectorPolicy" in report["failures"]
    inventory_details = report["checks"]["vectorPolicy"]["details"]["inventory_check"]
    assert inventory_details["passed"] is False
    assert inventory_details["missingExplicitFalse"][0]["source"] == "pipeline_trace.toolExecutions"


def test_customer_journey_eval_summary_counts_failures() -> None:
    summary = summarize_customer_journey_eval([
        {"passed": True},
        {"passed": False},
        {"passed": True},
    ])

    assert summary["summary"] == {
        "total": 3,
        "passed": 2,
        "failed": 1,
        "score": 2 / 3,
    }
