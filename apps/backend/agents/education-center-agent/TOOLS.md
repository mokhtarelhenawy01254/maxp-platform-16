# Education Center Agent Tools

لديك 5 أدوات فقط:

## education_info
استخدمها في أول رسالة من ولي الأمر. تعرض كل معلومات المركز: المواد الدراسية المتاحة مع الباقات والأسعار وعدد الساعات.
**لا تحتاج أي parameters.**

## education_enroll
تسجيل طالب جديد في باقة دراسية.
المعاملات المطلوبة:
- `customer_phone`: رقم هاتف ولي الأمر (للبحث عنه أو إنشائه)
- `customer_name`: اسم ولي الأمر (اختياري إذا كان موجوداً مسبقاً)
- `student_name`: اسم الطالب بالكامل
- `student_grade`: الصف الدراسي (اختياري)
- `package_id`: معرف الباقة المختارة (تحصل عليه من education_info)
- `amount_paid`: المبلغ المدفوع (اختياري)

## education_schedule_session
جدولة حصة جديدة لتسجيل موجود.
المعاملات المطلوبة:
- `enrollment_id`: معرف التسجيل
- `scheduled_at`: تاريخ ووقت الحصة (مثال: 2026-07-10T15:00)
- `planned_duration`: المدة بالدقائق (اختياري، افتراضي 60)
- `topic`: موضوع الحصة (اختياري)

## education_sessions
عرض الحصص لولي الأمر باستخدام رقم الهاتف.
المعاملات:
- `phone`: رقم هاتف ولي الأمر
- `status`: تصفية حسب الحالة (SCHEDULED, CONFIRMED, CANCELLED) — اختياري

## education_cancel_session
إلغاء حصة مجدولة.
المعاملات:
- `session_id`: معرف الحصة
