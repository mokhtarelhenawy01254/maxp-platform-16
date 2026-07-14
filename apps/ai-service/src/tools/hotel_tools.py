from __future__ import annotations

from typing import Any

from src.tools.backend_client import api_get, api_post


async def get_hotel_info(company_id: str) -> dict[str, Any]:
    data = await api_get(f"/hotel/properties?companyId={company_id}")
    if not data.get("success"):
        return {"error": "حدث خطأ في جلب معلومات الفندق"}
    return {"hotels": data.get("data", [])}


async def check_availability(company_id: str, check_in: str, check_out: str, property_id: str | None = None) -> dict[str, Any]:
    params = f"checkIn={check_in}&checkOut={check_out}"
    if property_id:
        params += f"&propertyId={property_id}"
    data = await api_get(f"/hotel/availability?{params}&companyId={company_id}")
    if not data.get("success"):
        return {"error": "حدث خطأ في التحقق من التوفر"}
    return {"available_room_types": data.get("data", [])}


async def reserve_rooms(
    company_id: str,
    customer_name: str,
    customer_phone: str,
    check_in: str,
    check_out: str,
    property_id: str,
    rooms: list[dict],
    adults: int = 1,
    children: int = 0,
    customer_notes: str = "",
) -> dict[str, Any]:
    payload = {
        "companyId": company_id,
        "customerName": customer_name,
        "customerPhone": customer_phone,
        "checkIn": check_in,
        "checkOut": check_out,
        "propertyId": property_id,
        "rooms": rooms,
        "adults": adults,
        "children": children,
        "customerNotes": customer_notes,
        "source": "whatsapp",
        "createdByType": "ai_service",
    }
    data = await api_post("/hotel/reservations", payload)
    if not data.get("success"):
        return {"error": data.get("error", "حدث خطأ في إنشاء الحجز")}
    return {"reservation": data.get("data", {})}


async def get_my_reservations(company_id: str, phone: str) -> dict[str, Any]:
    data = await api_get(f"/hotel/reservations?companyId={company_id}")
    if not data.get("success"):
        return {"error": "حدث خطأ في جلب الحجوزات"}
    reservations = data.get("data", [])
    customer_reservations = [r for r in reservations if r.get("customerPhone") == phone]
    return {"reservations": customer_reservations}


async def cancel_reservation(company_id: str, reservation_id: str) -> dict[str, Any]:
    data = await api_post(f"/hotel/reservations/{reservation_id}/status", {"status": "CANCELLED", "companyId": company_id})
    if not data.get("success"):
        return {"error": data.get("error", "حدث خطأ في إلغاء الحجز")}
    return {"result": "تم إلغاء الحجز بنجاح", "reservation": data.get("data", {})}
