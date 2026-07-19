from __future__ import annotations

from src.evals.tool_execution_eval import (
    evaluate_tool_execution_result,
    summarize_tool_execution_eval,
)


def test_tool_execution_eval_scores_tool_params_and_reply_prompt():
    scored = evaluate_tool_execution_result(
        {
            "id": "shipping_rate_with_city_executes",
            "expected_primary_tool": "shipping_rates",
            "expected_params": {"governorate": "Cairo"},
        },
        {
            "tool": "shipping_rates",
            "params": {"governorate": "Cairo"},
            "toolResult": {"status": "success", "result": {"rate": 50}},
            "llmPrompt": (
                "[Tool Results]\n{}\n[/Tool Results]\n"
                "Generate the customer-facing reply from these structured results."
            ),
            "finalReply": "model reply",
        },
    )

    assert scored["passed"] is True
    assert scored["checks"]["tool"]["passed"] is True
    assert scored["checks"]["params"]["passed"] is True
    assert scored["checks"]["structuredToolResult"]["passed"] is True
    assert scored["checks"]["llmPrompt"]["passed"] is True
    assert scored["checks"]["finalReply"]["passed"] is True


def test_tool_execution_eval_report_summary_counts_failures():
    report = summarize_tool_execution_eval([
        {"id": "case-1", "passed": True},
        {"id": "case-2", "passed": False},
    ])

    assert report == {
        "summary": {"total": 2, "passed": 1, "failed": 1, "score": 0.5},
        "cases": [
            {"id": "case-1", "passed": True},
            {"id": "case-2", "passed": False},
        ],
    }
