from __future__ import annotations

from typing import Any

import structlog

from src.tools.backend_client import get_backend_client
from src.tools.definitions._helpers import _write_result

logger = structlog.get_logger(__name__)


async def list_branches(company_id: str) -> list[dict[str, Any]]:
    if not company_id:
        return []
    client = get_backend_client()
    return await client.get_booking_branches(company_id)


async def list_doctors(company_id: str, branch_id: str | None = None) -> list[dict[str, Any]]:
    if not company_id:
        return []
    client = get_backend_client()
    return await client.get_booking_doctors(company_id, branch_id)


async def list_services(company_id: str, branch_id: str | None = None) -> list[dict[str, Any]]:
    if not company_id:
        return []
    client = get_backend_client()
    return await client.get_booking_services(company_id, branch_id)


async def available_slots(
    company_id: str, branch_id: str, date: str,
    doctor_id: str | None = None, service_id: str | None = None,
) -> list[str]:
    if not company_id:
        return []
    client = get_backend_client()
    return await client.get_booking_available_slots(company_id, branch_id, date, doctor_id, service_id)


async def create_appointment(company_id: str, data: dict[str, Any]) -> dict[str, Any]:
    client = get_backend_client()
    return await client.create_booking_appointment(company_id, data)


async def confirm_appointment(company_id: str, appointment_id: str) -> dict[str, Any]:
    client = get_backend_client()
    return await client.confirm_booking_appointment(company_id, appointment_id)


async def cancel_appointment(company_id: str, appointment_id: str, reason: str | None = None) -> dict[str, Any]:
    client = get_backend_client()
    return await client.cancel_booking_appointment(company_id, appointment_id, reason)


async def appointment_details(company_id: str, appointment_id: str) -> dict[str, Any] | None:
    if not company_id:
        return None
    client = get_backend_client()
    return await client.get_booking_appointment_details(company_id, appointment_id)
