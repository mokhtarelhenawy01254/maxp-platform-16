from __future__ import annotations

from typing import Any


def _write_result(name: str, action_args: dict[str, Any], company_id: str) -> dict[str, Any]:
    return {
        "status": "awaiting_approval",
        "action_type": name,
        "action_args": action_args,
        "company_id": company_id,
    }


def _executed_result(action: str, result: dict[str, Any]) -> dict[str, Any]:
    return {
        "status": "EXECUTED",
        "action": action,
        "result": result,
    }
