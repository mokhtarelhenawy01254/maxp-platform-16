# Medical Center Manager Tools

لديك مجموعتين من الأدوات: أدوات الاستعلام/الحجز (مثل موظف الاستقبال) وأدوات الإدارة (CRUD + تقارير).

## أدوات الاستعلام (للتحقق السريع)

### booking_info
اعرض كل معلومات المركز: الفروع، الخدمات، الأطباء. **لا تحتاج parameters.**

### booking_slots
اعرض المواعيد المتاحة في تاريخ معين.
- `date`: YYYY-MM-DD (اختياري)
- `gender`: MALE أو FEMALE (اختياري)

### booking_reserve
احجز موعداً جديدًا (للضرورة أو لما يطلب المدير حجز يدوي).
- `patient_name`, `patient_phone`, `gender` (اختياري), `service_name`, `branch_name`, `appointment_date` (YYYY-MM-DD), `appointment_time` (HH:MM)

### booking_status
تفاصيل/إلغاء موعد.
- `appointment_id`, `action`: check أو cancel

## إدارة الفروع (Branches)

### booking_branches_list
قائمة كل الفروع. **بدون parameters.**

### booking_branch_create
إضافة فرع جديد.
- `name`: اسم الفرع (مطلوب)
- `address`: العنوان (اختياري)
- `phone`: رقم هاتف الفرع (اختياري)
- `workingDays`: أيام/ساعات العمل JSON (اختياري)
- `genderDays`: توزيع أيام الرجال/السيدات JSON (اختياري)

### booking_branch_update
تعديل بيانات فرع.
- `branch_id`: معرف الفرع (مطلوب)
- `name`, `address`, `phone`, `workingDays`, `genderDays`, `isActive`: الحقول المراد تعديلها (كلها اختيارية)

### booking_branch_delete
حذف فرع.
- `branch_id`: معرف الفرع (مطلوب)

## إدارة الأطباء (Doctors)

### booking_doctors_list
قائمة كل الأطباء.
- `branch_id`: معرف الفرع (اختياري — لتصفية الأطباء حسب الفرع)

### booking_doctor_create
إضافة طبيب جديد.
- `branchId`: معرف الفرع (مطلوب)
- `title`: المسمى الوظيفي مثل "دكتور" (مطلوب)
- `name`: اسم الطبيب (اختياري)
- `specialty`: التخصص (اختياري)
- `phone`: رقم الهاتف (اختياري)
- `gender`: MALE أو FEMALE (اختياري)

### booking_doctor_update
تعديل بيانات طبيب.
- `doctor_id`: معرف الطبيب (مطلوب)
- `branchId`, `title`, `name`, `specialty`, `phone`, `gender`, `isActive`: الحقول المراد تعديلها (كلها اختيارية)

### booking_doctor_delete
حذف طبيب.
- `doctor_id`: معرف الطبيب (مطلوب)

## إدارة الخدمات (Services)

### booking_services_list
قائمة كل الخدمات. **بدون parameters.**

### booking_service_create
إضافة خدمة جديدة.
- `name`: اسم الخدمة (مطلوب)
- `description`: الوصف (اختياري)
- `requiresConsultation`: تتطلب استشارة؟ (اختياري، default true)
- `branches`: قائمة معرفات الفروع لربط الخدمة بها (اختياري)

### booking_service_update
تعديل بيانات خدمة.
- `service_id`: معرف الخدمة (مطلوب)
- `name`, `description`, `requiresConsultation`, `isActive`: الحقول المراد تعديلها (كلها اختيارية)

### booking_service_delete
حذف خدمة.
- `service_id`: معرف الخدمة (مطلوب)

### booking_service_toggle
تفعيل/إيقاف خدمة بدون حذفها (يقلب الحالة الحالية تلقائيًا).
- `service_id`: معرف الخدمة (مطلوب)

## إدارة المواعيد (Appointments)

### booking_appointments_list
قائمة المواعيد بفلاتر.
- `status`: الحالة (اختياري: pending/confirmed/cancelled/completed)
- `branchId`: معرف الفرع (اختياري)
- `doctorId`: معرف الطبيب (اختياري)
- `serviceId`: معرف الخدمة (اختياري)
- `dateFrom`: تاريخ بداية YYYY-MM-DD (اختياري)
- `dateTo`: تاريخ نهاية YYYY-MM-DD (اختياري)

### booking_appointment_update_status
تحديث حالة موعد (يشمل التأكيد، الإلغاء، الإكمال).
- `appointment_id`: معرف الموعد (مطلوب)
- `status`: الحالة الجديدة (مطلوب: confirmed/cancelled/completed/pending)
- `notes`: ملاحظات (اختياري)

### booking_appointments_bulk_delete
حذف مواعيد متعددة دفعة واحدة.
- `ids`: قائمة معرفات المواعيد (مطلوب: ["id1","id2"])

## التقارير (Reports)

### booking_reports_summary
تقرير ملخص لنشاط المركز.
- `period`: الفترة (مطلوب: today / week / month)

## أدوات مساعدة

### agent_handoff_to
تحويل المهمة لإيجنت آخر (مثل `medical-center-agent` لحجز موعد للعميل).
- `agentRole`: دور الإيجنت المستهدف
- `task`: وصف المهمة

### knowledge_search
بحث في قاعدة المعرفة للرد على أسئلة عامة.
- `query`: نص البحث