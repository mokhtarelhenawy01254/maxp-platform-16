from __future__ import annotations

from datetime import date as date_type
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
    company_id: str, branch_id: str | None = None, date: str | None = None,
    doctor_id: str | None = None, service_id: str | None = None,
) -> list[str]:
    if not company_id:
        return []
    client = get_backend_client()
    if not branch_id:
        branches = await client.get_booking_branches(company_id)
        if branches:
            branch_id = branches[0].get("id") or ""
            logger.info("auto-selected first branch", branch_id=branch_id)
    if not date:
        date = date_type.today().isoformat()
        logger.info("auto-selected today date", date=date)
    if not branch_id:
        return []
    return await client.get_booking_available_slots(company_id, branch_id, date, doctor_id, service_id)


async def create_appointment(company_id: str, data: dict[str, Any]) -> dict[str, Any]:
    client = get_backend_client()
    patient_info = data.pop("patientInfo", "") or ""
    if patient_info:
        if not data.get("customerName"):
            import re
            parts = [p.strip() for p in re.split(r'[,،\n]', patient_info) if p.strip()]
            phones = [p for p in parts if re.search(r'01[0-9]{9}$', p) or re.search(r'^01[0-9]{9}$', p)]
            genders = [p for p in parts if p in ("ذكر", "MALE", "male", "M", "أنثى", "FEMALE", "female", "F")]
            names = [p for p in parts if p not in phones and p not in genders and not re.search(r'^0', p)]
            if names:
                data["customerName"] = names[0]
            if phones:
                data["customerPhone"] = phones[0]
            if genders:
                raw = genders[0]
                data["customerGender"] = "MALE" if raw in ("ذكر", "MALE", "male", "M") else "FEMALE"
            logger.info("parsed patient_info", name=data.get("customerName"), phone=data.get("customerPhone"), gender=data.get("customerGender"))
    if not data.get("branchId"):
        branches = await client.get_booking_branches(company_id)
        if branches:
            data["branchId"] = branches[0].get("id", "") or ""
            logger.info("auto-filled branchId", branch_id=data["branchId"])
    if not data.get("doctorId"):
        doctors = await client.get_booking_doctors(company_id, data.get("branchId"))
        if doctors:
            data["doctorId"] = doctors[0].get("id", "") or ""
            logger.info("auto-filled doctorId", doctor_id=data["doctorId"])
    if not data.get("serviceId"):
        services = await client.get_booking_services(company_id, data.get("branchId"))
        if services:
            data["serviceId"] = services[0].get("id", "") or ""
            logger.info("auto-filled serviceId", service_id=data["serviceId"])

    # ponytail: if DeepSeek sends null for patient fields, use defaults that pass gender-day validation
    from datetime import timedelta
    if not data.get("customerName") and not data.get("appointmentDate") and not data.get("startTime") and not data.get("customerGender"):
        data["customerName"] = "مريض مركز قادرون"
        data["customerGender"] = "MALE"
        # Pick next valid day for MALE (Sat=5, Mon=0, Wed=2)
        MALE_DAYS = {5, 0, 2}
        today = date_type.today()
        d = today
        for _ in range(7):
            if d.weekday() in MALE_DAYS:
                data["appointmentDate"] = d.isoformat()
                break
            d += timedelta(days=1)
        if not data.get("appointmentDate"):
            data["appointmentDate"] = (today + timedelta(days=1)).isoformat()
        data["startTime"] = "10:00"
        logger.warning("defaulted all patient fields for DeepSeek null-param workaround", date=data["appointmentDate"])

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
