from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any


def _write_result(name: str, action_args: dict[str, Any], company_id: str) -> dict[str, Any]:
    """Return a structured 'awaiting_approval' result for write tools."""
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


def period_start_date(period: str) -> datetime:
    """Return the start datetime for a named period (today, yesterday, week, month, all)."""
    now = datetime.utcnow()
    period = period.lower()
    if period == "today":
        return now.replace(hour=0, minute=0, second=0, microsecond=0)
    elif period == "yesterday":
        return (now - timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
    elif period == "week":
        return now - timedelta(days=7)
    elif period == "month":
        return now - timedelta(days=30)
    elif period == "all":
        return datetime(2000, 1, 1)
    return now - timedelta(days=30)
