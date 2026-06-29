from __future__ import annotations
from pydantic import BaseModel, Field
from src.skills.base import Skill

class BookingReserveInput(BaseModel):
    serviceName: str = Field(description="Service or doctor name to book (e.g. 'شوك ويف', 'دكتور أسنان')")
    date: str = Field(description="Appointment date — can be relative ('الاثنين الجاي', 'بكرة') or specific ('29 يونيو')")
    time: str = Field(description="Appointment time — relative ('5 العصر', 'الصبح') or specific ('3:00')")
    patientName: str | None = Field(None, description="Patient full name")
    phoneNumber: str | None = Field(None, description="Patient phone number (Egyptian 01x format)")
    gender: str | None = Field(None, description="Gender: ذكر or أنثى")

async def reserve_booking(params: BookingReserveInput) -> dict:
    # ponytail: stub — calls actual booking service via Node.js bridge
    return {
        "status": "confirmed",
        "bookingId": "bk_" + __import__("uuid").uuid4().hex[:12],
        "serviceName": params.serviceName,
        "date": params.date,
        "time": params.time,
        "message": f"تم حجز {params.serviceName} يوم {params.date} الساعة {params.time}",
    }

booking_reserve = Skill(
    name="booking_reserve",
    description="Reserve a medical appointment or service booking. Use when customer wants to book a doctor, clinic appointment, or service. Arabic keywords: حجز, دكتور, كشف, عيادة, موعد, مركز",
    input_schema=BookingReserveInput,
    handler=reserve_booking,
)
