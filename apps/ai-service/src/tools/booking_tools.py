from __future__ import annotations

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
        if not s.get("isActive"):
            continue
        branch_services = s.get("branchServices", [])
        packages = []
        for bs in branch_services:
            bs_pkgs = bs.get("packages")
            if bs_pkgs:
                bn = bs.get("branch", {}).get("name", "")
                if isinstance(bs_pkgs, list):
                    for pkg in bs_pkgs:
                        entry = dict(pkg)
                        entry["branch"] = bn
                        packages.append(entry)
                else:
                    packages.append({"branch": bn, "packages_data": bs_pkgs})
        svc_list.append({
            "id": s.get("id"), "name": s.get("name"),
            "description": s.get("description"),
            "packages": packages,
        })

    doc_list = []
    for d in doctors:
        doc_list.append({"id": d.get("id"), "name": d.get("name"), "specialty": d.get("specialty")})

    return {"branches": summary, "services": svc_list, "doctors": doc_list, "total_branches": len(branches)}


# ── booking_slots ──

async def get_slots(company_id: str, date: str, gender: str = "") -> dict[str, Any]:
    if not company_id:
        return {"error": "no company_id"}
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

AR_MALE_NAMES = {
    "محمد", "أحمد", "علي", "محمود", "عمرو", "خالد", "عبد", "عبدالله", "عبدالرحمن", "عبدالعزيز",
    "طارق", "وائل", "حسام", "مصطفى", "إبراهيم", "يوسف", "عمر", "حسن", "حسين", "كريم", "اسلام",
    "إسلام", "مينا", "بيشوي", "مارتن", "بيتر", "جورج", "كيرلس", "يوسف", "ميسرة", "مكرم", "ممدوح",
    "سامح", "رامي", "هاني", "عادل", "شريف", "وجيه", "مجدي", "تامر", "أشرف", "أسامة", "سامي",
    "فادي", "وسيم", "بلال", "عمار", "زياد", "يحيى", "هشام", "جلال", "سيد", "رضا", "نبيل", "عاطف",
    "باسم", "ماهر", "جميل", "سعيد", "فتحي", "لطفي", "أنور", "منير", "صبري", "توفيق", "شعبان",
    "عوض", "فهمي", "حلمي", "داود", "سليمان", "يحي", "نوح", "هارون", "موسى", "يعقوب", "يوسف",
    "ياسر", "خضر", "خوليو", "بدر", "فاروق", "سعد", "فارس", "خليل", "رياض", "صالح", "وجدي", "ثروت",
    "حاتم", "مهاب", "أيهاب", "وليد", "هيثم", "رؤوف", "عماد", "سهيل", "سري", "داوود", "حمدي",
}
AR_FEMALE_NAMES = {
    "فاطمة", "سارة", "مريم", "نور", "آية", "السيدة", "هدير", "مي", "إسراء", "علا", "دينا",
    "ريهام", "نشوى", "غادة", "هبة", "منى", "سامية", "نادية", "ليلى", "هدى", "رانيا", "داليا",
    "ياسمين", "جasmine", "شيرين", "المصري", "ملك", "ملاك", "يسرا", "سوسن", "فيروز", "رحاب",
    "عبير", "سحر", "حنان", "أمل", "أحلام", "نهى", "هناء", "سعاد", "فريدة", "فريال", "نهلة",
    "هند", "صفاء", "marwa", "مروة", "إيمان", "رمضان", "بثينة", "وداد", "كريمة", "سهام", "فاطمه",
    "سحر", "نجوى", "عزة", "هالة", "رانيا", "شيرين", "ندى", "رشا", "وفاء", "نهى", "أميرة",
    "يسرى", "دعاء", "سلمى", "ميار", "كارما", "لوجين", "جنا", "روان", "ريتاج", "تسنيم", "مليكة",
    "إيلاف", "لين", "زينب", "خديجة", "عائشة", "حفصة", "هاجر", "موسى", "صفية", "ريحانة", "بشرى",
}
AMBIGUOUS_NAMES = {
    "نور", "شمس", "سعد", "سعدي", "ريان", "رمضان", "عيد", "حبيب", "حبيبة", "دلال", "أمل",
    "فرح", "يسر", "هناء", "منى", "سمير", "سميرة", "حسن", "حسنة", "ناصر", "نصرة", "صباح",
    "نجاح", "سعادة", "عزيز", "عزيزة", "كمال", "كريمة", "فخر", "فخرية", "إشراق", "إشراقة",
    "سلام", "سلامة", "براء", "براءة", "تقوى", "هدى", "هدية", "فوز", "فوزية", "نورهان",
    "هيثم",  # mostly male but can be ambiguous in some dialects
}


def _normalize_name(name: str) -> str:
    n = name.strip().lower()
    # Normalize Arabic variants
    n = n.replace("آ", "ا").replace("أ", "ا").replace("إ", "ا").replace("ء", "")
    n = n.replace("ة", "ه")
    return n


def _infer_gender_from_name(name: str) -> str | None:
    """Infer MALE/FEMALE from Arabic first name. Returns None if ambiguous/unknown."""
    if not name:
        return None
    # Take first name token
    first = name.split()[0]
    norm = _normalize_name(first)
    if norm in AMBIGUOUS_NAMES:
        return None
    if norm in AR_MALE_NAMES:
        return "MALE"
    if norm in AR_FEMALE_NAMES:
        return "FEMALE"
    # Try removing common suffixes/prefixes
    clean = norm.replace("ال", "")
    if clean in AR_MALE_NAMES:
        return "MALE"
    if clean in AR_FEMALE_NAMES:
        return "FEMALE"
    return None


async def reserve_appointment(
    company_id: str,
    patient_name: str,
    patient_phone: str,
    gender: str = "",
    service_name: str = "",
    branch_name: str = "",
    appointment_date: str = "",
    appointment_time: str = ""
) -> dict[str, Any]:
    """Create an appointment using structured parameters."""
    if not company_id:
        return {"error": "no company_id"}
    if not patient_name or not patient_phone or not service_name:
        return {"error": "بيانات غير مكتملة. مطلوب: اسم المريض، الهاتف، والخدمة المطلوبة."}

    client = get_backend_client()

    name = patient_name.strip()
    phone = patient_phone.strip()
    date_str = appointment_date.strip() if appointment_date else ""
    time_str = appointment_time.strip() if appointment_time else ""

    # 1. Find branch — search by name if provided, else pick first with genderDays, else first
    branches = await client.get_booking_branches(company_id)
    if not branches:
        return {"error": "لا يوجد فروع متاحة"}
    
    branch = None
    if branch_name:
        branch_lower = branch_name.strip().lower().replace("ة", "ه")
        for b in branches:
            b_name = (b.get("name") or "").lower().replace("ة", "ه")
            if branch_lower in b_name or b_name in branch_lower:
                branch = b
                break
    
    if not branch:
        branch = next((b for b in branches if b.get("genderDays")), branches[0])
        
    branch_id = branch.get("id", "")
    branch_name = branch.get("name", "")

    # 2. Find service by name (partial match) — active only
    services = await client.get_booking_services(company_id)
    active_services = [s for s in services if s.get("isActive")]
    if not active_services:
        return {"error": "لا توجد خدمات متاحة"}
    matched_svc = None
    if service_name:
        svc_lower = service_name.strip().lower().replace("ة", "ه")
        for s in active_services:
            s_name = (s.get("name") or "").lower().replace("ة", "ه")
            if svc_lower in s_name or s_name in svc_lower:
                matched_svc = s; break
    if not matched_svc:
        matched_svc = active_services[0]  # fallback
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

    # 6. Gender inference + gender-day validation + auto-correct
    date_obj = date_type.fromisoformat(date_str)
    day_idx = date_obj.weekday()

    gd = _try_parse_json(branch.get("genderDays"))
    male_days_set = {d2i(k) for k in (gd.get("male", []) if gd else [])}
    female_days_set = {d2i(k) for k in (gd.get("female", []) if gd else [])}
    has_gender_days = bool(male_days_set or female_days_set)

    g = gender.upper().strip()
    if not g:
        inferred = _infer_gender_from_name(name)
        if inferred:
            g = inferred
            logger.info("inferred_gender_from_name", name=name, gender=g)

    if has_gender_days and g not in ("MALE", "M", "FEMALE", "F"):
        # Ambiguous or unknown gender when branch has gender days configured.
        # Ask politely instead of guessing.
        return {
            "needs_gender": True,
            "message": "عذرًا، اسمك جميل وممكن يكون لشخص أو شخصة. عشان أقدر أحددلك اليوم المناسب في الفرع، هل حضرتك راجل ولا ست؟"
        }

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
