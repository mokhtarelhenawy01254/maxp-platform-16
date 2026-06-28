from __future__ import annotations

from typing import Any

import structlog

from src.tools.backend_client import get_backend_client

logger = structlog.get_logger(__name__)


async def start_draft(company_id: str) -> dict[str, Any]:
    client = get_backend_client()
    return await client.create_booking_draft(company_id or "")


async def set_draft_field(company_id: str, draft_id: str, field: str, value: str) -> dict[str, Any]:
    if not draft_id:
        return {"error": "draft_id required"}
    allowed = {"branchId", "doctorId", "serviceId", "customerName", "customerPhone", "customerGender", "appointmentDate", "startTime", "notes"}
    if field not in allowed:
        return {"error": f"Invalid field. Allowed: {', '.join(sorted(allowed))}"}
    client = get_backend_client()
    return await client.set_booking_draft_field(company_id or "", draft_id, field, value)


async def get_draft(company_id: str, draft_id: str) -> dict[str, Any]:
    if not draft_id:
        return {"error": "draft_id required"}
    client = get_backend_client()
    return await client.get_booking_draft(company_id or "", draft_id)


async def finalize_draft(company_id: str, draft_id: str) -> dict[str, Any]:
    if not draft_id:
        return {"error": "draft_id required"}
    client = get_backend_client()
    return await client.finalize_booking_draft(company_id or "", draft_id)
