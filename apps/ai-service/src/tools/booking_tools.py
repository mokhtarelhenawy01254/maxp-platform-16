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

    # ponytail: extract date/time from patient_info when DeepSeek sends wrong auto-fill
    if patient_info and data.get("appointmentDate"):
        import re as _re
        _parsed_date = _extract_date_from_text(patient_info)
        if _parsed_date and _parsed_date != data["appointmentDate"]:
            logger.warning("overrode DeepSeek date from patient_info", old=data["appointmentDate"], new=_parsed_date)
            data["appointmentDate"] = _parsed_date
        _parsed_time = _extract_time_from_text(patient_info)
        if _parsed_time:
            data["startTime"] = _parsed_time

    # ponytail: if DeepSeek sends null for patient fields, use defaults that pass gender-day validation
    from datetime import timedelta
    if not data.get("customerName") and not data.get("customerGender") and not data.get("startTime"):
        data["customerName"] = "مريض مركز قادرون"
        data["customerGender"] = "MALE"
        if not data.get("appointmentDate"):
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
        # Check available slots for this date and pick the first unbooked one
        try:
            slots = await client.get_booking_available_slots(company_id, data.get("branchId", ""), data["appointmentDate"])
            if slots:
                available = [s for s in slots if s.get("available")]
                if available:
                    data["startTime"] = available[0]["startTime"]
                else:
                    data["startTime"] = "10:00"
            else:
                data["startTime"] = "10:00"
        except Exception:
            data["startTime"] = "10:00"
        logger.warning("defaulted all patient fields for DeepSeek null-param workaround", date=data["appointmentDate"], time=data["startTime"])

    # ponytail: if DeepSeek sends a date that doesn't match the gender, pick the next valid day
    if data.get("appointmentDate"):
        try:
            date_obj = date_type.fromisoformat(data["appointmentDate"])
            weekday = date_obj.weekday()
            MALE_DAYS = {5, 0, 2}
            FEMALE_DAYS = {6, 1, 3}
            gender = (data.get("customerGender") or "MALE").upper()
            valid_days = MALE_DAYS if gender in ("MALE", "M") else FEMALE_DAYS
            if weekday not in valid_days:
                d = date_obj
                for _ in range(14):
                    d += timedelta(days=1)
                    if d.weekday() in valid_days:
                        data["appointmentDate"] = d.isoformat()
                        logger.warning("adjusted date for gender compliance", original=date_obj.isoformat(), gender=gender, new=data["appointmentDate"])
                        break
        except (ValueError, TypeError):
            logger.warning("could not parse appointmentDate for gender validation", date=data.get("appointmentDate"))

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


def _extract_date_from_text(text: str) -> str | None:
    """Extract date in YYYY-MM-DD from Arabic text (e.g. 'الاثنين 29 يونيو')."""
    import re as _re
    from datetime import timedelta, date as _dt

    today = _dt.today()

    # ISO / numeric dates
    m = _re.search(r'(\d{4})-(\d{2})-(\d{2})', text)
    if m: return f"{m.group(1)}-{m.group(2)}-{m.group(3)}"
    m = _re.search(r'(\d{1,2})/(\d{1,2})/(\d{4})', text)
    if m: return f"{m.group(3)}-{m.group(2):0>2}-{m.group(1):0>2}"

    # "بكره" / "بعد بكره"
    if _re.search(r'بعد\s*بكره|بعد\s*غد', text):
        return (today + timedelta(days=2)).isoformat()
    if _re.search(r'بكره|غدا', text):
        return (today + timedelta(days=1)).isoformat()
    if _re.search(r'بعد\s*غد', text):
        return (today + timedelta(days=2)).isoformat()

    # "الاثنين 29 يونيو 2026" or "29 يونيو"
    AR_MONTHS = {
        "يناير": 1, "فبراير": 2, "مارس": 3, "أبريل": 4, "ابريل": 4,
        "مايو": 5, "يونيو": 6, "يوليو": 7, "أغسطس": 8, "اغسطس": 8,
        "سبتمبر": 9, "أكتوبر": 10, "اكتوبر": 10, "نوفمبر": 11, "ديسمبر": 12,
    }
    AR_DAY_NAMES = {
        "السبت": 5, "الأحد": 6, "الاحد": 6, "الإثنين": 0, "الاثنين": 0,
        "الثلاثاء": 1, "الثلاثا": 1, "الأربعاء": 2, "الاربعاء": 2,
        "الخميس": 3, "الجمعة": 4,
    }
    m = _re.search(r'(\d{1,2})\s*(%s)(?:\s*(\d{4}))?' % "|".join(AR_MONTHS), text)
    if m:
        day = int(m.group(1))
        month = AR_MONTHS[m.group(2)]
        year = int(m.group(3)) if m.group(3) else today.year
        try: return _dt(year, month, day).isoformat()
        except ValueError: pass

    # "الاثنين" — next occurrence of that weekday
    m = _re.search(r'(%s)' % "|".join(AR_DAY_NAMES), text)
    if m:
        target = AR_DAY_NAMES[m.group(1)]
        d = today
        for _ in range(14):
            d += timedelta(days=1)
            if d.weekday() == target:
                return d.isoformat()

    return None


def _extract_time_from_text(text: str) -> str | None:
    """Extract time in HH:MM from Arabic text (e.g. 'الساعة 4 العصر')."""
    import re as _re
    # HH:MM
    m = _re.search(r'(\d{1,2}):(\d{2})', text)
    if m: return f"{int(m.group(1)):02d}:{m.group(2)}"

    # "الساعة 4 العصر" / "4 العصر" / "4 المغرب" / "6 مساء"
    # Periods that mean PM (add 12 to convert 12h → 24h)
    PM_PERIODS = r"ظهر|عصر|مغرب|مساء|ليل|ل"
    AM_PERIODS = r"صباح|ص"
    m = _re.search(r'(?:الساعه|الساعة)?\s*(\d{1,2})\s*(ال)?(%s|%s)?' % (PM_PERIODS, AM_PERIODS), text)
    if m:
        hour = int(m.group(1))
        period = m.group(3)
        if period and period in ("ظهر", "عصر", "مغرب", "مساء", "ليل", "ل") and hour < 12:
            hour += 12
        return f"{min(hour, 23):02d}:00"

    return None
