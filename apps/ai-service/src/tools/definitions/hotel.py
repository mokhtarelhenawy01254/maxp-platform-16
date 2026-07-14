from __future__ import annotations

from typing import Any

from agent_framework import FunctionTool
from pydantic import BaseModel, Field

from src.tools import hotel_tools


class InfoInput(BaseModel):
    company_id: str = Field(default="", description="Tenant ID (auto-injected)")

class CheckAvailabilityInput(BaseModel):
    company_id: str = Field(default="", description="Tenant ID (auto-injected)")
    check_in: str = Field(..., description="تاريخ الوصول (مثال: 2026-07-15)")
    check_out: str = Field(..., description="تاريخ المغادرة (مثال: 2026-07-17)")
    property_id: str = Field(default="", description="معرف الفندق (اختياري)")

class ReserveInput(BaseModel):
    company_id: str = Field(default="", description="Tenant ID (auto-injected)")
    customer_name: str = Field(..., description="اسم الضيف")
    customer_phone: str = Field(..., description="رقم جوال الضيف")
    check_in: str = Field(..., description="تاريخ الوصول (مثال: 2026-07-15)")
    check_out: str = Field(..., description="تاريخ المغادرة (مثال: 2026-07-17)")
    property_id: str = Field(..., description="معرف الفندق")
    rooms: list[dict] = Field(..., description="قائمة الغرف المختارة: [{'roomTypeId': '...', 'roomId': '...', 'nightlyRate': 0}]")
    adults: int = Field(default=1, description="عدد البالغين")
    children: int = Field(default=0, description="عدد الأطفال")
    customer_notes: str = Field(default="", description="ملاحظات إضافية")

class MyReservationsInput(BaseModel):
    company_id: str = Field(default="", description="Tenant ID (auto-injected)")
    phone: str = Field(..., description="رقم جوال الضيف")

class CancelReservationInput(BaseModel):
    company_id: str = Field(default="", description="Tenant ID (auto-injected)")
    reservation_id: str = Field(..., description="معرف الحجز")


async def hotel_info(input_data: InfoInput) -> dict[str, Any]:
    """Returns ALL hotel info: properties and their room types."""
    return await hotel_tools.get_hotel_info(input_data.company_id)

async def hotel_check_availability(input_data: CheckAvailabilityInput) -> dict[str, Any]:
    """Checks available room types for given dates."""
    return await hotel_tools.check_availability(
        company_id=input_data.company_id,
        check_in=input_data.check_in,
        check_out=input_data.check_out,
        property_id=input_data.property_id or None,
    )

async def hotel_reserve(input_data: ReserveInput) -> dict[str, Any]:
    """Creates a hotel reservation for a guest."""
    return await hotel_tools.reserve_rooms(
        company_id=input_data.company_id,
        customer_name=input_data.customer_name,
        customer_phone=input_data.customer_phone,
        check_in=input_data.check_in,
        check_out=input_data.check_out,
        property_id=input_data.property_id,
        rooms=input_data.rooms,
        adults=input_data.adults,
        children=input_data.children,
        customer_notes=input_data.customer_notes,
    )

async def hotel_my_reservations(input_data: MyReservationsInput) -> dict[str, Any]:
    """Returns all reservations for a guest by phone number."""
    return await hotel_tools.get_my_reservations(input_data.company_id, input_data.phone)

async def hotel_cancel_reservation(input_data: CancelReservationInput) -> dict[str, Any]:
    """Cancels a reservation by ID."""
    return await hotel_tools.cancel_reservation(input_data.company_id, input_data.reservation_id)


hotel_info_tool = FunctionTool(
    name="hotel_info",
    description="معلومات الفندق: عرض أنواع الغرف المتاحة مع الأسعار الأساسية والسعة والخدمات.",
    func=hotel_info,
    input_model=InfoInput,
)

hotel_check_availability_tool = FunctionTool(
    name="hotel_check_availability",
    description="التحقق من توفر الغرف في تواريخ محددة: عرض الغرف المتاحة حسب النوع والسعر الفعلي (بما في ذلك الأسعار الموسمية).",
    func=hotel_check_availability,
    input_model=CheckAvailabilityInput,
)

hotel_reserve_tool = FunctionTool(
    name="hotel_reserve",
    description="حجز غرفة أو أكثر لضيف في الفندق. يتطلب: اسم الضيف، الجوال، تاريخ الوصول والمغادرة، الغرف المختارة.",
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
