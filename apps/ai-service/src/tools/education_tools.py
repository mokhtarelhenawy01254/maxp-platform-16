from __future__ import annotations

from typing import Any

import structlog

from src.tools.backend_client import get_backend_client

logger = structlog.get_logger(__name__)


async def get_center_info(company_id: str) -> dict[str, Any]:
    """Returns subjects + packages for an education center."""
    if not company_id:
        return {"error": "no company_id"}
    client = get_backend_client()

    subjects = await client.get_education_subjects(company_id)
    packages = await client.get_education_packages(company_id)

    # Group packages by subject
    subject_list = []
    for s in subjects:
        subject_pkgs = [p for p in packages if p.get("subjectId") == s["id"]]
        pkg_list = [{
            "id": p["id"], "name": p.get("name", ""),
            "hours": p.get("hoursCount", 0),
            "session_duration_minutes": p.get("sessionDuration"),
            "price": p.get("price", 0),
        } for p in subject_pkgs]
        subject_list.append({
            "id": s["id"], "name": s.get("name", ""),
            "description": s.get("description", ""),
            "packages": pkg_list,
        })

    return {"subjects": subject_list, "total_subjects": len(subjects)}


async def enroll_student(
    company_id: str,
    customer_phone: str,
    customer_name: str,
    student_name: str,
    student_grade: str = "",
    package_id: str = "",
    amount_paid: float = 0,
) -> dict[str, Any]:
    """Enroll a student. Creates customer + student if needed."""
    if not company_id:
        return {"error": "no company_id"}
    if not customer_phone or not student_name or not package_id:
        return {"error": "بيانات غير مكتملة. مطلوب: هاتف ولي الأمر، اسم الطالب، والباقة."}

    client = get_backend_client()

    # 1. Find or create customer by phone
    customers = await client.search_customers(company_id, customer_phone, limit=5)
    customer = None
    if customers:
        customer = next((c for c in customers if c.get("phone") == customer_phone), customers[0])

    if not customer:
        name_parts = customer_name.strip().split(" ", 1)
        first = name_parts[0] or customer_name
        last = name_parts[1] if len(name_parts) > 1 else ""
        customer_data = await client.create_customer(company_id, {
            "firstName": first, "lastName": last, "phone": customer_phone,
        })
        customer = customer_data if isinstance(customer_data, dict) else {}
        logger.info("created_customer_for_enrollment", phone=customer_phone, customer_id=customer.get("id"))

    customer_id = customer.get("id")
    if not customer_id:
        return {"error": "تعذر إنشاء ولي الأمر. حاول مرة أخرى."}

    # 2. Create student
    s_name_parts = student_name.strip().split(" ", 1)
    s_first = s_name_parts[0] or student_name
    s_last = s_name_parts[1] if len(s_name_parts) > 1 else ""
    student_data = await client.create_education_student(company_id, {
        "customerId": customer_id,
        "firstName": s_first,
        "lastName": s_last,
        "grade": student_grade,
    })
    student = student_data if isinstance(student_data, dict) else {}
    student_id = student.get("id")
    if not student_id:
        return {"error": "تعذر إنشاء الطالب. حاول مرة أخرى."}

    # 3. Get package details
    pkg = await client.get_education_package(company_id, package_id)
    if not pkg:
        return {"error": "الباقة غير موجودة"}

    # 4. Create enrollment (teacher assigned by admin later)
    enrollment_data = await client.create_education_enrollment(company_id, {
        "studentId": student_id,
        "packageId": package_id,
        "amountPaid": amount_paid or 0,
    })
    enrollment = enrollment_data if isinstance(enrollment_data, dict) else {}

    customer_name_display = f"{customer.get('firstName', '')} {customer.get('lastName', '')}".strip()
    return {
        "enrollment": enrollment,
        "student": {"id": student_id, "name": student_name},
        "customer": {"id": customer_id, "name": customer_name_display, "phone": customer_phone},
        "package": {"id": package_id, "name": pkg.get("name", ""), "hours": pkg.get("hoursCount", 0)},
    }


async def schedule_session(
    company_id: str,
    enrollment_id: str,
    scheduled_at: str,
    planned_duration: int = 60,
    topic: str = "",
) -> dict[str, Any]:
    """Schedule a session for an enrollment."""
    if not company_id or not enrollment_id or not scheduled_at:
        return {"error": "بيانات غير مكتملة. مطلوب: معرف التسجيل وموعد الحصة."}

    client = get_backend_client()

    # Verify enrollment exists and has remaining hours
    enrollment = await client.get_education_enrollment(company_id, enrollment_id)
    if not enrollment:
        return {"error": "التسجيل غير موجود"}
    if enrollment.get("remainingHours", 0) <= 0:
        return {"error": "رصيد الساعات منتهي. قم بشراء باقة جديدة."}

    # Create the session
    session_data = await client.create_education_session(company_id, {
        "enrollmentId": enrollment_id,
        "scheduledAt": scheduled_at,
        "plannedDuration": planned_duration,
        "topic": topic,
    })

    student = enrollment.get("student", {})
    subject = enrollment.get("package", {}).get("subject", {})
    teacher = enrollment.get("teacher", {})

    return {
        "session": session_data,
        "student_name": f"{student.get('firstName', '')} {student.get('lastName', '')}".strip(),
        "subject": subject.get("name", ""),
        "teacher": teacher.get("name", ""),
        "scheduled_at": scheduled_at,
        "duration": planned_duration,
        "remaining_hours": enrollment.get("remainingHours", 0),
    }


async def get_sessions_for_phone(
    company_id: str,
    phone: str,
    status: str = "",
) -> dict[str, Any]:
    """View sessions for a parent's phone number."""
    if not company_id:
        return {"error": "no company_id"}
    if not phone:
        return {"error": "رقم الهاتف مطلوب"}

    client = get_backend_client()

    # Find customer by phone
    customers = await client.search_customers(company_id, phone, limit=3)
    customer = next((c for c in customers if c.get("phone") == phone), None)
    if not customer:
        return {"sessions": [], "message": "لا يوجد ولي أمر بهذا الرقم"}

    customer_id = customer.get("id")

    # Get students for this customer
    students = await client.get_education_students(company_id, customer_id)
    if not students:
        return {"sessions": [], "message": "لا يوجد طلاب مسجلون لولي الأمر هذا"}

    student_ids = [s["id"] for s in students]
    student_map = {s["id"]: f"{s.get('firstName', '')} {s.get('lastName', '')}".strip() for s in students}

    # Get sessions for all students
    all_sessions = []
    for sid in student_ids:
        sessions = await client.get_education_sessions(company_id, sid, status)
        for sess in (sessions if isinstance(sessions, list) else []):
            sess["_student_name"] = student_map.get(sid, "")
        all_sessions.extend(sessions if isinstance(sessions, list) else [])

    all_sessions.sort(key=lambda x: x.get("scheduledAt", ""), reverse=True)

    return {
        "sessions": all_sessions,
        "customer_name": f"{customer.get('firstName', '')} {customer.get('lastName', '')}".strip(),
        "total": len(all_sessions),
    }


async def cancel_session(
    company_id: str,
    session_id: str,
) -> dict[str, Any]:
    """Cancel a scheduled session."""
    if not company_id or not session_id:
        return {"error": "معرف الحصة مطلوب"}

    client = get_backend_client()
    result = await client.cancel_education_session(company_id, session_id)
    return {"result": result, "message": "تم إلغاء الحصة بنجاح"}
