from __future__ import annotations

import re
from datetime import date as date_type, timedelta
from typing import Any

import structlog

from src.tools.backend_client import get_backend_client

logger = structlog.get_logger(__name__)

MALE_DAYS = {5, 0, 2}    # sat, sun, tue → actually sat=5, mon=0, wed=2 per Qaderon
FEMALE_DAYS = {6, 1, 3}  # sun, mon, wed → actually sun=6, tue=1, thu=3

AR_DAY_NAMES = {5: "السبت", 6: "الأحد", 0: "الإثنين", 1: "الثلاثاء", 2: "الأربعاء", 3: "الخميس", 4: "الجمعة"}


# ── booking_info ──

async def get_center_info(company_id: str) -> dict[str, Any]:
    """Merges branches + services + doctors into one response."""
    if not company_id:
        return {"error": "no company_id"}
    client = get_backend_client()
    branches = await client.get_booking_branches(company_id)
    services = await client.get_booking_services(company_id)
    doctors = await client.get_booking_doctors(company_id)

    # Build clean summary per branch
    summary = []
    for b in branches:
        gd = _try_parse_json(b.get("genderDays"))
        wd = _try_parse_json(b.get("workingDays"))
        male_days = [AR_DAY_NAMES.get(d2i(k), k) for k in (gd.get("male", []) if gd else [])]
        female_days = [AR_DAY_NAMES.get(d2i(k), k) for k in (gd.get("female", []) if gd else [])]
        summary.append({
            "id": b.get("id"), "name": b.get("name"), "address": b.get("address"),
            "phone": b.get("phone"),
            "male_days": male_days, "female_days": female_days,
            "hours": wd,
        })

    svc_list = []
    for s in services:
        svc_list.append({
            "id": s.get("id"), "name": s.get("name"),
            "description": s.get("description"),
            "price": s.get("packages"),
        })

    doc_list = []
    for d in doctors:
        doc_list.append({"id": d.get("id"), "name": d.get("name"), "specialty": d.get("specialty")})

    return {"branches": summary, "services": svc_list, "doctors": doc_list, "total_branches": len(branches)}


# ── booking_slots ──

async def get_slots(company_id: str, date: str, gender: str = "", request: str = "") -> dict[str, Any]:
    if not company_id:
        return {"error": "no company_id"}
    # Extract date & gender from request text (overrides stale date from DeepSeek multi-turn)
    if request:
        _, extracted_date, _, _, _, gender_from_text = _parse_request(request)
        if extracted_date:
            date = extracted_date
            logger.info("slots_date_overridden", request=request[:80], date=date)
        if not gender and gender_from_text:
            gender = gender_from_text
    if not date:
        date = date_type.today().isoformat()
    client = get_backend_client()
    branches = await client.get_booking_branches(company_id)
    if not branches:
        return {"slots": [], "message": "لا يوجد فروع"}
    # Pick branch with non-null genderDays; fallback to first
    branch = next((b for b in branches if b.get("genderDays")), branches[0])
    branch_id = branch.get("id", "")

    slots_raw = await client.get_booking_available_slots(company_id, branch_id, date)
    available = [s["startTime"] for s in slots_raw if s.get("available")]
    booked = [s["startTime"] for s in slots_raw if not s.get("available")]

    # Gender info
    gd = _try_parse_json(branch.get("genderDays"))
    day_idx = date_type.fromisoformat(date).weekday()
    day_name = AR_DAY_NAMES.get(day_idx, str(day_idx))
    male_days = [d2i(k) for k in (gd.get("male", []) if gd else [])]
    female_days = [d2i(k) for k in (gd.get("female", []) if gd else [])]
    is_male_day = day_idx in male_days
    is_female_day = day_idx in female_days

    return {
        "date": date, "day": day_name,
        "available": available, "booked": booked,
        "is_male_day": is_male_day, "is_female_day": is_female_day,
        "note": "رجال" if is_male_day else ("سيدات" if is_female_day else "مغلق"),
    }


# ── booking_reserve ──

async def reserve_appointment(company_id: str, request: str) -> dict[str, Any]:
    """Parse one text field into all booking params, then create appointment."""
    if not company_id:
        return {"error": "no company_id"}
    if not request or not request.strip():
        return {"error": "request فارغ. مطلوب: اسم الخدمة + التاريخ + الوقت + اسم المريض + رقم الهاتف."}

    client = get_backend_client()

    # Parse EVERYTHING from the single request text
    service_name, date_str, time_str, name, phone, gender = _parse_request(request)

    # 1. Find branch — pick first with genderDays, else first
    branches = await client.get_booking_branches(company_id)
    if not branches:
        return {"error": "لا يوجد فروع متاحة"}
    branch = next((b for b in branches if b.get("genderDays")), branches[0])
    branch_id = branch.get("id", "")
    branch_name = branch.get("name", "")

    # 2. Find service by name (partial match)
    services = await client.get_booking_services(company_id)
    if not services:
        return {"error": "لا توجد خدمات متاحة"}
    matched_svc = None
    if service_name:
        svc_lower = service_name.strip().lower().replace("ة", "ه")
        for s in services:
            s_name = (s.get("name") or "").lower().replace("ة", "ه")
            if svc_lower in s_name or s_name in svc_lower:
                matched_svc = s; break
    if not matched_svc:
        matched_svc = services[0]  # fallback
    service_id = matched_svc.get("id", "")
    service_label = matched_svc.get("name", "")

    # 3. Find doctor
    doctors = await client.get_booking_doctors(company_id, branch_id)
    doctor_id = doctors[0].get("id", "") if doctors else ""
    doctor_name = doctors[0].get("name", "") if doctors else ""

    # 4. Fallback for missing date
    if not date_str:
        date_str = date_type.today().isoformat()

    # 5. Auto-correct year hallucination (LLMs often output stale years)
    if date_str and any(y in date_str for y in ("2024", "2025")):
        today = date_type.today()
        date_str = date_str.replace("2024", str(today.year)).replace("2025", str(today.year))
        logger.info("auto_corrected_year", corrected_date=date_str, reason="LLM year hallucination")

    # 6. Gender-day validation + auto-correct
    date_obj = date_type.fromisoformat(date_str)
    day_idx = date_obj.weekday()

    gd = _try_parse_json(branch.get("genderDays"))
    male_days_set = {d2i(k) for k in (gd.get("male", []) if gd else [])}
    female_days_set = {d2i(k) for k in (gd.get("female", []) if gd else [])}

    g = gender.upper()
    if g in ("MALE", "M"):
        valid_days = male_days_set
    elif g in ("FEMALE", "F"):
        valid_days = female_days_set
    else:
        valid_days = male_days_set | female_days_set

    original_date = date_str
    if day_idx not in valid_days and valid_days:
        d = date_obj
        for _ in range(14):
            d += timedelta(days=1)
            if d.weekday() in valid_days:
                date_str = d.isoformat(); day_idx = d.weekday(); break
        logger.warning("adjusted date for gender", original=original_date, new=date_str, gender=g)

    # 7. Find available time if not specified
    if not time_str:
        try:
            slots = await client.get_booking_available_slots(company_id, branch_id, date_str)
            avail = [s["startTime"] for s in slots if s.get("available")]
            if avail:
                time_str = avail[0]
            else:
                time_str = "10:00"
        except Exception:
            time_str = "10:00"

    # 8. Create appointment
    data = {
        "branchId": branch_id, "doctorId": doctor_id, "serviceId": service_id,
        "customerName": name, "customerPhone": phone, "customerGender": g,
        "appointmentDate": date_str, "startTime": time_str, "serviceName": service_label,
    }
    try:
        result = await client.create_booking_appointment(company_id, data)
    except Exception as e:
        err = str(e)
        if "محجوز بالفعل" in err:
            return {"error": f"الوقت {time_str} في {date_str} محجوز بالفعل. اختر وقت أو يوم آخر.", "date": date_str, "time": time_str}
        return {"error": f"تعذر الحجز: {err}"}

    return {
        "appointment": result,
        "branch": branch_name,
        "service": service_label,
        "doctor": doctor_name,
        "date": date_str, "time": time_str,
        "patient": name, "phone": phone, "gender": g,
        "day_arabic": AR_DAY_NAMES.get(day_idx, ""),
    }


# ── booking_status ──

async def appointment_status(company_id: str, appointment_id: str, action: str = "check") -> dict[str, Any]:
    if not company_id or not appointment_id:
        return {"error": "appointment_id required"}
    client = get_backend_client()
    if action == "cancel":
        return await client.cancel_booking_appointment(company_id, appointment_id, "")
    else:
        return await client.get_booking_appointment_details(company_id, appointment_id)


# ── helpers ──

def _parse_request(text: str) -> tuple[str, str, str, str, str, str]:
    """Parse all booking info from a single Arabic text. Returns (service, date, time, name, phone, gender)."""
    import datetime as _dt
    service, date, time, name, phone, gender = "", "", "", "", "", "MALE"
    today = _dt.date.today()
    parts = [p.strip() for p in re.split(r'[,،\n]', text) if p.strip()]

    # Phone: starts with 01 and is 11 digits
    phones = [p for p in parts if re.match(r'^01\d{9}$', p)]
    # Gender
    for p in parts:
        if p in ("ذكر", "MALE", "male", "M", "ر", "رجال", "رجل"):
            gender = "MALE"; break
        if p in ("أنثى", "انثي", "انثى", "FEMALE", "female", "F", "س", "سيدة", "سيدات", "ست"):
            gender = "FEMALE"; break
    # Date: explicit dates like 29-06-2026, 29/06, 29 يونيو, إثنين 29
    for p in parts:
        m = re.match(r'(\d{1,2})[-\/](\d{1,2})(?:[-\/](\d{4}))?$', p)
        if m:
            d, mo, y = int(m.group(1)), int(m.group(2)), int(m.group(3 or '0'))
            if not y: y = today.year
            if y <= 2025: y = today.year
            try: date = _dt.date(y, mo, d).isoformat(); break
            except: pass
        m = re.match(r'(\d{1,2})\s*(يونيو|يوليو|أغسطس|مايو|ابريل|أغسطس)', p)
        if m:
            ar_months = {"يونيو":6,"يوليو":7,"أغسطس":8,"اغسطس":8,"مايو":5,"ابريل":4,"إبريل":4}
            mo_num = ar_months.get(m.group(2))
            if mo_num:
                d = int(m.group(1))
                try: date = _dt.date(today.year, mo_num, d).isoformat(); break
                except: pass
    # Day-of-week references
    if not date:
        day_map = {"السبت":5,"سبت":5,"الأحد":6,"أحد":6,"الإثنين":0,"اثنين":0,"إثنين":0,"الثلاثاء":1,"ثلاثاء":1,"الأربعاء":2,"أربعاء":2,"الخميس":3,"الأربعاء":2,"الجمعة":4}
        for p in parts:
            for kw, idx in day_map.items():
                if kw in p:
                    d = today - _dt.timedelta(days=1)
                    for _ in range(14):
                        d += _dt.timedelta(days=1)
                        if d.weekday() == idx:
                            date = d.isoformat(); break
                    if date: break
            if date: break
    # Service name — look for keywords in text
    svc_keywords = ["حجامه","حجامة","ريكفري","شوك ويف","كشف","علاج طبيعي","تصريف","مساج","مساح","شد الفقرات","شد"]
    import unicodedata
    text_normalized = unicodedata.normalize('NFKC', text).lower()
    for kw in svc_keywords:
        if kw in text_normalized:
            service = kw; break
    # Time: extract 24h or 12h
    for p in parts:
        m = re.match(r'(\d{1,2}):(\d{2})\s*(?:ص|م)?$', p)
        if m:
            time = f"{int(m.group(1)):02d}:{m.group(2)}"; break
        m = re.match(r'(\d{1,2})\s*(العصر|المغرب|المساء|الليل|الصباح|الظهر|صباحا|مساء|ليل|عصر|مغرب)', p)
        if m:
            h = int(m.group(1))
            if m.group(2) in ("الصباح","صباحا","الظهر"):
                time = f"{h:02d}:00"
            elif m.group(2) in ("العصر","المغرب","المساء","الليل","مساء","ليل","عصر","مغرب"):
                time = f"{h + 12 if h < 12 else h:02d}:00"
            break
    # Name: first non-phone non-gender non-date non-time part
    skip = set(phones) | {"ذكر","أنثى","انثي","انثى","MALE","FEMALE","male","female","M","F","ر","س","رجال","رجل","سيدة","سيدات","ست"}
    names = [p for p in parts if p not in skip and not re.match(r'^0\d', p) and not re.match(r'\d{1,2}[-\/]\d{1,2}', p)]
    name = names[0] if names else "مريض"
    phone = phones[0] if phones else "0"
    return service, date, time, name, phone, gender


def _try_parse_json(v: Any) -> dict[str, Any] | None:
    if isinstance(v, dict):
        return v
    if isinstance(v, str) and v.strip().startswith("{"):
        try:
            return __import__("json").loads(v)
        except Exception:
            pass
    return None


def d2i(day: str) -> int:
    """Day name/abbr to weekday index (mon=0)."""
    m = {"sat": 5, "sun": 6, "mon": 0, "tue": 1, "wed": 2, "thu": 3, "fri": 4}
    return m.get(day.lower()[:3], -1)
