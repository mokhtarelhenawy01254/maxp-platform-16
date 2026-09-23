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


def period_date_range(period: str) -> tuple[datetime, datetime | None]:
    """Return (start_datetime, end_datetime) for a named period.

    - 'today': today 00:00:00 -> None
    - 'yesterday': yesterday 00:00:00 -> today 00:00:00 (exclusive)
    - 'week': 7 days ago -> None
    - 'month': 30 days ago -> None
    - 'all': 2000-01-01 -> None
    """
    now = datetime.utcnow()
    p = (period or "today").lower().strip()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    if p == "today":
        return today_start, None
    elif p == "yesterday":
        yesterday_start = today_start - timedelta(days=1)
        return yesterday_start, today_start
    elif p == "week":
        return now - timedelta(days=7), None
    elif p == "month":
        return now - timedelta(days=30), None
    elif p == "all":
        return datetime(2000, 1, 1), None
    return now - timedelta(days=30), None


def period_start_date(period: str) -> datetime:
    """Return the start datetime for a named period (today, yesterday, week, month, all)."""
    start, _ = period_date_range(period)
    return start
