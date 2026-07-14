from __future__ import annotations

from typing import Any

from agent_framework import FunctionTool
from pydantic import BaseModel, Field

from src.tools.backend_client import api_get, api_post


class InfoInput(BaseModel):
    company_id: str = Field(default="", description="Tenant ID (auto-injected)")

class CheckAvailabilityInput(BaseModel):
    company_id: str = Field(default="", description="Tenant ID (auto-injected)")
    check_in: str = Field(default="", description="تاريخ الوصول (مثال: 2026-07-15)")
    check_out: str = Field(default="", description="تاريخ المغادرة (مثال: 2026-07-17)")
    property_id: str = Field(default="", description="معرف الفندق (اختياري)")

class ReserveInput(BaseModel):
    company_id: str = Field(default="", description="Tenant ID (auto-injected)")
    customer_name: str = Field(..., description="اسم الضيف")
    customer_phone: str = Field(..., description="رقم جوال الضيف")
    customer_email: str = Field(default="", description="البريد الإلكتروني للضيف")
    check_in: str = Field(..., description="تاريخ الوصول (مثال: 2026-07-15)")
    check_out: str = Field(..., description="تاريخ المغادرة (مثال: 2026-07-17)")
    property_id: str = Field(..., description="معرف الفندق")
    rooms: list[dict] = Field(..., description="قائمة الغرف المختارة: [{'roomTypeId': '...', 'roomId': '...', 'nightlyRate': 0}]")
    adults: int = Field(default=1, description="عدد البالغين")
    children: int = Field(default=0, description="عدد الأطفال")
    customer_notes: str = Field(default="", description="ملاحظات إضافية")
    deposit_required: bool = Field(default=False, description="يتطلب عربون؟")
    deposit_amount: float | None = Field(default=None, description="مبلغ العربون المطلوب")
    deposit_paid: bool = Field(default=False, description="هل تم دفع العربون؟")
    payment_method: str = Field(default="", description="طريقة الدفع: cash/card/transfer")

class MyReservationsInput(BaseModel):
    company_id: str = Field(default="", description="Tenant ID (auto-injected)")
    phone: str = Field(..., description="رقم جوال الضيف")

class CancelReservationInput(BaseModel):
    company_id: str = Field(default="", description="Tenant ID (auto-injected)")
    reservation_id: str = Field(..., description="معرف الحجز")


async def hotel_info(input_data: InfoInput) -> dict[str, Any]:
    data = await api_get(f"/api/v1/hotel/properties?companyId={input_data.company_id}")
    if not data.get("success"):
        return {"error": "حدث خطأ في جلب معلومات الفندق"}
    return {"hotels": data.get("data", [])}

async def hotel_check_availability(input_data: CheckAvailabilityInput) -> dict[str, Any]:
    if not input_data.check_in or not input_data.check_out:
        return {"message": "من فضلك أدخل تاريخ الوصول وتاريخ المغادرة للتحقق من توفر الغرف.", "needs_dates": True}
    params = f"checkIn={input_data.check_in}&checkOut={input_data.check_out}"
    if input_data.property_id:
        params += f"&propertyId={input_data.property_id}"
    params += f"&companyId={input_data.company_id}"
    data = await api_get(f"/api/v1/hotel/availability?{params}")
    if not data.get("success"):
        return {"error": "حدث خطأ في التحقق من التوفر"}
    return {"available_room_types": data.get("data", [])}

async def hotel_reserve(input_data: ReserveInput) -> dict[str, Any]:
    payload = {
        "companyId": input_data.company_id,
        "customerName": input_data.customer_name,
        "customerPhone": input_data.customer_phone,
        "customerEmail": input_data.customer_email,
        "checkIn": input_data.check_in,
        "checkOut": input_data.check_out,
        "propertyId": input_data.property_id,
        "rooms": input_data.rooms,
        "adults": input_data.adults,
        "children": input_data.children,
        "customerNotes": input_data.customer_notes,
        "depositRequired": input_data.deposit_required,
        "depositAmount": input_data.deposit_amount,
        "depositPaid": input_data.deposit_paid,
        "paymentMethod": input_data.payment_method,
        "source": "whatsapp",
        "createdByType": "ai_service",
    }
    data = await api_post("/api/v1/hotel/reservations", payload)
    if not data.get("success"):
        return {"error": data.get("error", "حدث خطأ في إنشاء الحجز")}
    return {"reservation": data.get("data", {})}

async def hotel_my_reservations(input_data: MyReservationsInput) -> dict[str, Any]:
    data = await api_get(f"/api/v1/hotel/reservations?companyId={input_data.company_id}")
    if not data.get("success"):
        return {"error": "حدث خطأ في جلب الحجوزات"}
    reservations = data.get("data", [])
    customer_reservations = [r for r in reservations if r.get("customerPhone") == input_data.phone]
    return {"reservations": customer_reservations}

async def hotel_cancel_reservation(input_data: CancelReservationInput) -> dict[str, Any]:
    data = await api_post(f"/api/v1/hotel/reservations/{input_data.reservation_id}/status", {"status": "CANCELLED", "companyId": input_data.company_id})
    if not data.get("success"):
        return {"error": data.get("error", "حدث خطأ في إلغاء الحجز")}
    return {"result": "تم إلغاء الحجز بنجاح", "reservation": data.get("data", {})}


hotel_info_tool = FunctionTool(
    name="hotel_info",
    description="معلومات الفندق: عرض أنواع الغرف المتاحة مع الأسعار الأساسية (لكل غرفة PER_ROOM أو لكل شخص PER_PERSON)، السعة، والخدمات.",
    func=hotel_info,
    input_model=InfoInput,
)

hotel_check_availability_tool = FunctionTool(
    name="hotel_check_availability",
    description="التحقق من توفر الغرف في تواريخ محددة: عرض الغرف المتاحة حسب النوع والسعر الفعلي (بما في ذلك الأسعار الموسمية). يعرض pricingModel (PER_ROOM = السعر للغرفة, PER_PERSON = السعر للشخص) و pricePerExtraAdult لسعر الشخص الإضافي.",
    func=hotel_check_availability,
    input_model=CheckAvailabilityInput,
)

hotel_reserve_tool = FunctionTool(
    name="hotel_reserve",
    description="حجز غرفة أو أكثر لضيف في الفندق. يرسل customer_name, customer_phone, check_in, check_out, property_id, rooms (array of objects), adults, children. يدعم deposit_required (عربون), deposit_amount, deposit_paid, payment_method. تنبيه: property_id مطلوب (يؤخذ من hotel_info). rooms يجب أن تكون array من objects وليس string: [{'roomTypeId': '...', 'roomId': '...', 'nightlyRate': 500}].",
    func=hotel_reserve,
    input_model=ReserveInput,
)

hotel_my_reservations_tool = FunctionTool(
    name="hotel_my_reservations",
    description="عرض حجوزات الضيف باستخدام رقم الهاتف.",
    func=hotel_my_reservations,
    input_model=MyReservationsInput,
)

hotel_cancel_reservation_tool = FunctionTool(
    name="hotel_cancel_reservation",
    description="إلغاء حجز موجود. فقط الحجوزات ذات الحالة PENDING أو CONFIRMED يمكن إلغاؤها.",
    func=hotel_cancel_reservation,
    input_model=CancelReservationInput,
)

__all_tools__ = [
    hotel_info_tool,
    hotel_check_availability_tool,
    hotel_reserve_tool,
    hotel_my_reservations_tool,
    hotel_cancel_reservation_tool,
]
