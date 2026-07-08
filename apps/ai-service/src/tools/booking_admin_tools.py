from __future__ import annotations

from typing import Any

import structlog

from src.tools.backend_client import get_backend_client

logger = structlog.get_logger(__name__)


# ── Branches ──

async def list_branches(company_id: str) -> dict[str, Any]:
    if not company_id:
        return {"error": "no company_id"}
    client = get_backend_client()
    branches = await client.get_booking_branches(company_id)
    return {"branches": branches, "total": len(branches)}


async def create_branch(company_id: str, data: dict[str, Any]) -> dict[str, Any]:
    if not company_id:
        return {"error": "no company_id"}
    if not data.get("name"):
        return {"error": "اسم الفرع مطلوب"}
    client = get_backend_client()
    result = await client.create_booking_branch(company_id, data)
    return {"branch": result, "message": "✅ تم إنشاء الفرع"}


async def update_branch(company_id: str, branch_id: str, data: dict[str, Any]) -> dict[str, Any]:
    if not company_id or not branch_id:
        return {"error": "company_id و branch_id مطلوبان"}
    client = get_backend_client()
    result = await client.update_booking_branch(company_id, branch_id, data)
    return {"branch": result, "message": "✅ تم تحديث الفرع"}


async def delete_branch(company_id: str, branch_id: str) -> dict[str, Any]:
    if not company_id or not branch_id:
        return {"error": "company_id و branch_id مطلوبان"}
    client = get_backend_client()
    result = await client.delete_booking_branch(company_id, branch_id)
    return {"result": result, "message": "✅ تم حذف الفرع"}


# ── Doctors ──

async def list_doctors(company_id: str, branch_id: str = "") -> dict[str, Any]:
    if not company_id:
        return {"error": "no company_id"}
    client = get_backend_client()
    doctors = await client.get_booking_doctors(company_id, branch_id)
    return {"doctors": doctors, "total": len(doctors)}


async def create_doctor(company_id: str, data: dict[str, Any]) -> dict[str, Any]:
    if not company_id:
        return {"error": "no company_id"}
    if not data.get("branchId") or not data.get("title"):
        return {"error": "الفرع (branchId) والمسمى (title) مطلوبان"}
    client = get_backend_client()
    result = await client.create_booking_doctor(company_id, data)
    return {"doctor": result, "message": "✅ تم إضافة الطبيب"}


async def update_doctor(company_id: str, doctor_id: str, data: dict[str, Any]) -> dict[str, Any]:
    if not company_id or not doctor_id:
        return {"error": "company_id و doctor_id مطلوبان"}
    client = get_backend_client()
    result = await client.update_booking_doctor(company_id, doctor_id, data)
    return {"doctor": result, "message": "✅ تم تحديث بيانات الطبيب"}


async def delete_doctor(company_id: str, doctor_id: str) -> dict[str, Any]:
    if not company_id or not doctor_id:
        return {"error": "company_id و doctor_id مطلوبان"}
    client = get_backend_client()
    result = await client.delete_booking_doctor(company_id, doctor_id)
    return {"result": result, "message": "✅ تم حذف الطبيب"}


# ── Services ──

async def list_services(company_id: str) -> dict[str, Any]:
    if not company_id:
        return {"error": "no company_id"}
    client = get_backend_client()
    services = await client.get_booking_services(company_id)
    return {"services": services, "total": len(services)}


async def create_service(company_id: str, data: dict[str, Any]) -> dict[str, Any]:
    if not company_id:
        return {"error": "no company_id"}
    if not data.get("name"):
        return {"error": "اسم الخدمة مطلوب"}
    client = get_backend_client()
    result = await client.create_booking_service(company_id, data)
    return {"service": result, "message": "✅ تم إضافة الخدمة"}


async def update_service(company_id: str, service_id: str, data: dict[str, Any]) -> dict[str, Any]:
    if not company_id or not service_id:
        return {"error": "company_id و service_id مطلوبان"}
    client = get_backend_client()
    result = await client.update_booking_service(company_id, service_id, data)
    return {"service": result, "message": "✅ تم تحديث الخدمة"}


async def delete_service(company_id: str, service_id: str) -> dict[str, Any]:
    if not company_id or not service_id:
        return {"error": "company_id و service_id مطلوبان"}
    client = get_backend_client()
    result = await client.delete_booking_service(company_id, service_id)
    return {"result": result, "message": "✅ تم حذف الخدمة"}


async def toggle_service(company_id: str, service_id: str) -> dict[str, Any]:
    if not company_id or not service_id:
        return {"error": "company_id و service_id مطلوبان"}
    client = get_backend_client()
    result = await client.toggle_booking_service(company_id, service_id)
    status = "مفعّلة" if result.get("isActive") else "متوقفة"
    return {"service": result, "message": f"✅ الخدمة الآن {status}"}


# ── Appointments ──

async def list_appointments(company_id: str, filters: dict[str, Any] | None = None) -> dict[str, Any]:
    if not company_id:
        return {"error": "no company_id"}
    client = get_backend_client()
    appointments = await client.get_booking_appointments(company_id, filters or {})
    return {"appointments": appointments, "total": len(appointments)}


async def update_appointment_status(company_id: str, appointment_id: str, status: str, notes: str = "") -> dict[str, Any]:
    if not company_id or not appointment_id:
        return {"error": "company_id و appointment_id مطلوبان"}
    if not status:
        return {"error": "status مطلوب"}
    client = get_backend_client()
    result = await client.update_booking_appointment_status(company_id, appointment_id, status, notes)
    return {"appointment": result, "message": f"✅ تم تحديث الحالة إلى {status}"}


async def bulk_delete_appointments(company_id: str, ids: list[str]) -> dict[str, Any]:
    if not company_id:
        return {"error": "no company_id"}
    if not ids:
        return {"error": "ids مطلوبة"}
    client = get_backend_client()
    result = await client.bulk_delete_booking_appointments(company_id, ids)
    return {"result": result, "message": f"✅ تم حذف {len(ids)} موعد"}


# ── Reports ──

async def reports_summary(company_id: str, period: str = "today") -> dict[str, Any]:
    if not company_id:
        return {"error": "no company_id"}
    client = get_backend_client()
    result = await client.get_booking_reports_summary(company_id, period)
    return {"reports": result}