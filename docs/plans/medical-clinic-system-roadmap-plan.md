# خطة تنفيذ: نظام إدارة العيادات المتكامل (ترقية النظام الطبي)

**التاريخ**: 2026-07-31
**التعقيد**: High
**الاستراتيجية الأساسية**: اتباع نمط **نظام التعليم** الموجود والجاهز في المنصة (المرجع الكامل لكل الحاجات دي). كل خطوة ليها تطبيق جاهز ننسخه/نعدله.

### علاقة الكيانات (قرار معتمد)

```
Customer (جهة التواصل/الحاجز من CRM)
   │  customerId? (اختياري)
   ▼
Patient (الملف الطبي)  ◀── 1:N ── Appointment
```

- `Customer` = جهة الاتصال/الحاجز (اللي بيكلم من واتساب/فيسبوك). بيانات تسويقية.
- `Patient` = الملف الطبي المستقل (تاريخ مرضي، تشخيص، وصفات، مديونية). بيانات طبية حساسة.
- **عميل واحد → كذا مريض** (أم حجزت لطفلها، راجل حجز لزوجته، شركة لموظفيها). الربط اختياري:
  - الحاجز هو المريض نفسه → ربط 1:1
  - الحاجز غير المريض → كذا `Patient` لنفس `Customer`
- مطابقة وقت الحجز بالهاتف: لو فيه `Customer` بنفس الرقم اربطه، ولو ليه `Patient` اربط بيه.

---

## نظرة عامة

النظام الطبي الحالي = **نظام حجوزات فقط** (فروع + أطباء + خدمات + مواعيد + AI). المراجعة كشفت 4 فجوات سوقية:
1. لا يوجد ملف مريض / تاريخ طبي (EHR)
2. لا يوجد تحصيل / مدفوعات / إيراد
3. الأطباء بدون شيفت، بدون أجندة، بدون بوابة دخول خاصة
4. التقارير بدون جانب مالي

الخريطة تحوّل النظام ده لنظام إدارة عيادات متكامل على 8 سبرنت، كل سبرنت **قابل للتجربة والإطلاق لوحده**.

### خريطة الملفات المرجعية (اعمل كل جديد على غرارها)

| الجديد (الطبي) | المرجع الجاهز (التعليم/الحجز) |
|---|---|
| `Patient` | `EducationStudent` — `apps/backend/prisma/schema/education.prisma:44` |
| `DoctorAvailability` | `EducationTeacherAvailability` — `education.prisma:96` |
| `DoctorPayment` | `EducationTeacherPayment` — `education.prisma:115` |
| `MedicalInvoice`/`MedicalPayment` | `EducationEnrollment` + `EducationTeacherPayment` — `education.prisma:160,115` |
| `bookingPatientsController.js` | `educationStudentsController.js` — `apps/backend/controller/` |
| `bookingPatientPortalRoutes.js` | `educationParentPortalRoutes.js` — `apps/backend/routes/` |
| `bookingDoctorPortalRoutes.js` | `educationTeacherPortalRoutes.js` — `apps/backend/routes/educationTeacherPortalRoutes.js` |
| `verifyDoctorToken.js` | `verifyTeacherToken.js` — `apps/backend/utils/verifyTeacherToken.js` |
| `bookingDoctorAuthController.js` | `educationTeacherAuthController.js` — `apps/backend/controller/` |
| صفحات بوابة الطبيب | `apps/frontend/src/pages/teacher/*` + `pages/auth/TeacherLoginPage.tsx` |
| تبويبات الحجز الجديدة | `apps/frontend/src/pages/admin/booking/*Tab.tsx` |
| تقارير الإيراد | `bookingReportsController.js` — `apps/backend/controller/bookingReportsController.js` |

---

## المتطلبات المسبقة

- معرفة سريعة بنظام التعليم: `apps/backend/controller/education*Controller.js` + `apps/backend/routes/education*Routes.js` + صفحاته في `apps/frontend/src/pages/`.
- آلية عمل Prisma migrations (نفس نمط `apps/backend/prisma/migrations/add_booking_module`).
- مسار تركيب الروابط في `apps/backend/server.js` (السطور 752-768 للحجز والتعليم).
- مسار القائمة الجانبية الطبية: `apps/frontend/src/config/sidebar.ts:932-946`.
- ملاحظة: أدوات AI الطبية (`booking_reserve`، `booking_info`...) معرّفة خارج الكود المحلي (في قاعدة بيانات/تعريفات الإيجنت). أي أداة جديدة لازم تُضاف في **نظام تعريفات الأدوات** اللي بيشغّلها الـ runtime، مش بس في `TOOLS.md`.

---

## Sprint 1: ملف المريض (EHR) — النواة

> **✅ مكتمل (2026-07-31)** — Patient model + CRUD + تبويب المرضى. تفاصيل التنفيذ في `latest-updates.md`.

**الهدف**: كل مريض ليه ملف ببياناته، والصفحات تديره.
**المعاينة/التحقق**: افتح `/admin/booking` → تبويب "المرضى" → اعمل بحث/إضافة/تعديل مريض.

### Task 1.1: سكيما `Patient` + ربطها بـ `Appointment`
- **الموقع**: `apps/backend/prisma/schema/booking.prisma`
- **الوصف**: أضف نموذج `Patient`:
  - `id`, `companyId`, `customerId?` (ربط اختياري بـ Customer)، `firstName`, `lastName`, `phone`, `email?`, `gender?`, `birthDate?`, `bloodType?`, `allergies` (Json), `chronicDiseases` (Json), `medications` (Json), `notes`, `isActive`, timestamps.
  - أضف `patientId String?` في `Appointment` + علاقة.
- **القبول**: النموذج يظهر في Prisma client بعد الـ migrate.
- **التحقق**: `npx prisma migrate dev --name add_patient_model` + تشغيل سكربت تحقق (`list_prisma_models.js` نمط).

### Task 1.2: Backend CRUD للمرضى
- **الموقع**: `apps/backend/controller/bookingPatientsController.js` (جديد) + `apps/backend/routes/bookingPatientsRoutes.js` (جديد) + mount في `apps/backend/server.js`
- **الوصف**: endpoints: `GET /patients` (بحث بالاسم/الهاتف + pagination)، `GET /patients/:id` (مع جلب المواعيد)، `POST /patients`، `PUT /patients/:id`، `DELETE` (soft via isActive).
- **القبول**: الـ API يرجع بيانات مرتبة ونفس نمط بقية الـ booking controllers (auth بـ `req.user.companyId`).
- **التحقق**: `curl`/Postman على `http://localhost:3007/api/v1/booking/patients`.

### Task 1.3: Frontend تبويب المرضى
- **الموقع**: `apps/frontend/src/pages/admin/booking/PatientsTab.tsx` + `PatientModal.tsx` (جديد) + ربط في `BookingManagementPage.tsx` + `apps/frontend/src/config/sidebar.ts:932-946` (إضافة `/admin/booking/patients`)
- **الوصف**: جدول مرضى (اسم/هاتف/جنس/عدد زيارات/آخر زيارة) + مودال إنشاء/تعديل + بحث. اتبع `DoctorsTab.tsx` كنمط.
- **القبول**: إضافة مريض من الواجهة يظهر فوراً في الجدول.
- **التحقق**: `npx vitest run src/pages/admin/booking/__tests__` + تجربة يدوية.

---

## Sprint 2: ربط المواعيد بالمرضى (Find-or-Create)

> **✅ مكتمل (2026-07-31)** — `bookingPatientService.findOrCreatePatient` + ربط في مساري الحجز + backfill script + PatientDetailModal مع تاريخ الزيارات.

**الهدف**: كل حجز جديد أو قديم مربوط بملف مريض فعلي.
**المعاينة/التحقق**: اعمل حجز باسم "محمد أحمد" رقم "0100..." مرتين → تلاقي نفس الملف اتسجل فيه زيارة واحدة وزادت لزيارتين.

### Task 2.1: تحويل الحجوزات القديمة
- **الموقع**: `apps/backend/scripts/backfill_patients.js` (جديد)
- **الوصف**: سكربت لمرة واحدة: يحول كل `Appointment` من غير `patientId` → `Patient` جديد (من customerName + customerPhone + customerGender) مع dedupe بالهاتف.
- **القبول**: صفر مواعيد من غير `patientId` بعد التشغيل، وعدد المرضى المتوقع.
- **التحقق**: تشغيل + تقرير عد قبل/بعد.

### Task 2.2: Find-or-Create عند إنشاء الموعد
- **الموقع**: `apps/backend/controller/bookingAppointmentsController.js` (`createAppointment`) + `apps/backend/controller/publicBookingController.js`
- **الوصف**: عند الحجز، ابحث مريض بالهاتف؛ لو موجود اربطه، لو لأ أنشئه (في transaction مع الموعد). ارفع `patientId` في الـ response.
- **القبول**: أي حجز بيطلع معاه `patientId` في الرد.
- **التحقق**: سكريبت اختبار (نمط `apps/backend/scripts/test-10-scenarios.js`).

### Task 2.3: تحديث أداة AI `booking_reserve`
- **الموقع**: تعريف الأداة في نظام الأدوات + `apps/backend/agents/medical-center-agent/TOOLS.md`
- **الوصف**: الأداة ترجع `patient` (أو `patientId`) في النتيجة، و`TOOLS.md` تذكر إن الإيجنت يعرض على المريض أنه "عميل عائد/جديد".
- **القبول**: نتيجة الحجز من واتساب فيها معرف المريض.

### Task 2.4: صفحة ملف المريض مع تاريخ الزيارات
- **الموقع**: `apps/frontend/src/pages/admin/booking/PatientDetailModal.tsx` (جديد)
- **الوصف**: افتح مريض → شوف بياناته + جدول مواعيده السابقة مع الحالة (متابعة/مكتمل/ملغي).
- **القبول**: الملف يعرض كل زيارة مرتبة.

---

## Sprint 3: التاريخ الطبي (تشخيص + وصفة + متابعة)

> **✅ مكتمل (2026-07-31)** — حقول طبية على الموعد (diagnosis/treatmentPlan/prescription/vitals/followUpDate) + تخزين/استرجاع + UI في الموعد وملف المريض.

**الهدف**: الملف فيه سجل طبي فعلي لكل زيارة.
**المعاينة/التحقق**: افتح موعد → اكتب تشخيص + وصفة + ملاحظات → ارجع لملف المريض وشوف السجل كامل.

### Task 3.1: حقول طبية في `Appointment`
- **الموقع**: `apps/backend/prisma/schema/misc.prisma` (نموذج `Appointment`، سطر 261)
- **الوصف**: أضف `diagnosis`, `treatmentPlan`, `prescription`, `vitals` (Json), `followUpDate?`.
- **القبول**: migration ناجحة.

### Task 3.2: Backend لتخزين/استرجاع
- **الموقع**: `apps/backend/controller/bookingAppointmentsController.js` (`updateAppointment`)
- **الوصف**: سماح بتحديث الحقول الطبية + إرجاعها في `getAllAppointments`/`getById`.
- **القبول**: تعديل تشخيص موعد يظهر في الاسترجاع.

### Task 3.3: UI التاريخ الطبي
- **الموقع**: `apps/frontend/src/pages/admin/booking/AppointmentModal.tsx` (حقول جديدة) + `PatientDetailModal.tsx` (تبويب "التاريخ الطبي")
- **الوصف**: حقول التشخيص/الوصفة/المتابعة في مودال الموعد، وعرضها كمحضر زيارات في الملف (تاريخ + طبيب + تشخيص + وصفة).
- **القبول**: متابعة زيارة المريض بالتسلسل الزمني.

---

## Sprint 4: المدفوعات والتحصيل

> **✅ مكتمل (2026-07-31)** — `MedicalInvoice` + `MedicalPayment` + Backend CRUD (مع مزامنة `Appointment.paymentStatus`) + تبويب "المدفوعات" مع InvoiceModal/PaymentModal.

**الهدف**: كل موعد/باقة ليه فاتورة وحالة دفع، والإيراد محسوب.
**المعاينة/التحقق**: اعمل فاتورة لموعد بـ 500 جنيه، سجل دفع 300 → حالة "جزئي"، والـ Dashboard بيظهر إجمالي الإيراد.

### Task 4.1: نماذج `MedicalInvoice` + `MedicalPayment`
- **الموقع**: `apps/backend/prisma/schema/booking.prisma`
- **الوصف** (بنمط التعليم، مش تعقيد التجارة):
  - `MedicalInvoice`: رقم تسلسلي، `patientId`, `appointmentId?`, `total`, `discount`, `dueDate?`, `status` (UNPAID/PARTIAL/PAID/REFUNDED), `notes`.
  - `MedicalPayment`: `invoiceId`, `amount`, `method` (CASH/CARD/WALLET/ONLINE), `paidAt`, `notes`.
- **القبول**: migration + سكربت تسلسل أرقام فواتير لكل شركة.

### Task 4.2: Backend
- **الموقع**: `apps/backend/controller/bookingInvoicesController.js` + `bookingInvoicesRoutes.js` + mount في `server.js`
- **الوصف**: إنشاء فاتورة، تسجيل دفعة، تحديث حالة، إلغاء/Refund. خلي حالة `Appointment.paymentStatus` تُشتق من الفاتورة.
- **القبول**: تسجيل دفعة يحدث حالة الفاتورة والموعد معاً (transaction).

### Task 4.3: UI المدفوعات
- **الموقع**: `apps/frontend/src/pages/admin/booking/InvoicesTab.tsx` (جديد) + `PaymentModal.tsx` + ربط في `BookingManagementPage.tsx` + `sidebar.ts`
- **الوصف**: جدول فواتير (مريض/مبلغ/مسدد/متبقي/حالة) + مودال دفع + زر "تحصيل" داخل `PatientDetailModal` و `AppointmentModal`.
- **القبول**: التحصيل من 3 أماكن (تبويب/ملف مريض/موعد) بيحدث نفس السجل.

---

## Sprint 5: نظام الأطباء المتكامل + بوابة الطبيب

> **✅ مكتمل (2026-07-31)** — BookingDoctor (email/password/رسوم/عمولة) + DoctorAvailability مربوط بحساب الـ slots + مصادقة وبوابة طبيب كاملة (`/doctor/login` + لوحة/جدول/مرضى/مدفوعات/أوقات عمل).

**الهدف**: طبيب ليه شيفت/أجندة + دخول خاص + مدفوعاته.
**المعاينة/التحقق**: أنشئ طبيب بكلمة مرور → ادخل من `/doctor/login` → شوف جدول مواعيده ومدفوعاته.

### Task 5.1: تطوير `BookingDoctor`
- **الموقع**: `apps/backend/prisma/schema/booking.prisma` (سطر 27)
- **الوصف**: أضف `email?`, `password?` (hash)، `employeeId?` (ربط بـ HR)، `consultationFee?`, `commissionRate?`, `bio?`, `avatarUrl?`.
- **القبول**: migration + hash للكلمة عند التعديل عبر API.

### Task 5.2: أجندة الطبيب `DoctorAvailability`
- **الموقع**: `apps/backend/prisma/schema/booking.prisma` + `apps/backend/controller/bookingDoctorsController.js`
- **الوصف**: نموذج `DoctorAvailability` (نفس نمط `EducationTeacherAvailability`) + CRUD + **ربطه بحساب الـ slots** في `getAvailableSlots` و`createAppointment` (لو الطبيب محدده).
- **القبول**: لو طبيب معطل الأحد، الـ slots بتستبعده.
- **التحقق**: سكريبت اختبار نمط `apps/backend/scripts/test-physio-coordinator.js`.

### Task 5.3: مصادقة وبوابة الطبيب
- **الموقع**: `apps/backend/utils/verifyDoctorToken.js` + `apps/backend/controller/bookingDoctorAuthController.js` (نسخ من `verifyTeacherToken.js` + `educationTeacherAuthController.js`) + `apps/backend/routes/bookingDoctorPortalRoutes.js` + mount
- **الوصف**: `POST /login`, `GET /me`, `PUT /me/password`, `GET /dashboard`, `GET /schedule?weekStart=`, `GET /appointments`, `GET /payments`.
- **القبول**: دخول الطبيب بيعمل JWT ويجيب بياناته فقط (company-scoped).

### Task 5.4: UI بوابة الطبيب
- **الموقع**: `apps/frontend/src/pages/auth/DoctorLoginPage.tsx` + `apps/frontend/src/pages/doctor/*` (Dashboard/Schedule/Patients/Payments) + روتات في `apps/frontend/src/App.tsx` (نمط `TeacherLoginPage` + `pages/teacher/*`)
- **الوصف**: ديزاين طبي بسيط: لوحة بيومه، جدوله الأسبوعي، مرضاه (من المواعيد)، مدفوعاته.
- **القبول**: `/doctor/login` + `/doctor/dashboard` تشتغل وتفصل بيانات الطبيب.

---

## Sprint 6: التقارير المالية والطبية

> **✅ مكتمل (2026-07-31)** — financials (إيراد/تحصيل/متبقي/غير مسددة) + أداء أطباء + إحصائيات مرضى في الـ summary، وتصدير CSV للمواعيد والفواتير، وكروت إيراد + زر تصدير في الـ Dashboard.

**الهدف**: إيراد/تحصيل/أداء أطباء/مرضى — أرقام حقيقية.
**المعاينة/التحقق**: `GET /booking/reports/summary?period=month` بيرجع إيراد، تحصيل، متبقي، وأداء طبيب.

### Task 6.1: توسيع `bookingReportsController.js`
- **الوصف**: أضف إلى `getReportsSummary`:
  - `totalRevenue` (مجموع الفواتير المسددة)، `collected`، `outstanding` (متبقي)، `appointmentFees`.
  - `doctorPerformance`: لكل طبيب — زيارات، نسبة حضور/لا-شو، إيراد خدماته.
  - `patientStats`: مرضى جدد، مرضى عائدين، توزيع بالجنس.
- **القبول**: نفس الـ endpoint القديم يرجع بيانات مالية + لا يكسر الواجهة الحالية (additive).

### Task 6.2: Dashboard الطبي
- **الموقع**: `apps/frontend/src/pages/admin/booking/DashboardTab.tsx`
- **الوصف**: كروت جديدة (إيراد اليوم/الشهر، فواتير غير مسددة، أعلى طبيب).
- **القبول**: الأرقام تطابق الـ API.

### Task 6.3: تصدير
- **الموقع**: `apps/backend/controller/bookingReportsController.js` + زر في `AppointmentsTab.tsx`/`InvoicesTab.tsx`
- **الوصف**: CSV للمواعيد والفواتير (نمط أي CSV export موجود في المنصة).
- **القبول**: ملف يتحمّل فيه البيانات المفهرسة.

---

## Sprint 7: إشعارات واتساب + ترقية AI

> **✅ مكتمل (2026-07-31)** — تأكيد/إلغاء الموعد يرسل واتساب تلقائياً للمريض + كرون تذكير مواعيد الغد كل 30 دقيقة + توثيق `patient_lookup` للإيجنت (التعريف الفعلي في الـ runtime خارجي).

**الهدف**: المريض بيتأكد ويُذكر تلقائياً، والإيجنت بيفهم ملف المريض.
**المعاينة/التحقق**: حجز → رسالة تأكيد واتساب للمريض + تذكير قبل الموعد بساعتين.

### Task 7.1: تأكيد الموعد (شيل الـ TODO)
- **الموقع**: `apps/backend/controller/bookingAppointmentsController.js` (`confirmAppointment` سطر 362)
- **الوصف**: استدعِ `WhatsAppNotificationService` (أو نمط `educationNotificationService.js`) لإرسال رسالة تأكيد للمريض برقم موعده/فرعه/طبيبه.
- **القبول**: تأكيد من الـ API يرسل واتساب فعلي (مع رقم مبوب/محاكي).

### Task 7.2: تذكير قبل الموعد
- **الموقع**: كرون/Queue موجودة في `apps/backend/queues` أو cron service
- **الوصف**: وظيفة دورية: مواعيد الغد المؤكدة → رسالة تذكير. متحكم بيه من إعدادات الشركة.
- **القبول**: وظيفة بتشتغل وتطلع log.

### Task 7.3: أدوات AI طبية جديدة
- **الموقع**: تعريفات الأدوات في نظام الـ runtime + `apps/backend/agents/medical-center-agent/TOOLS.md` + `medical-center-manager/TOOLS.md`
- **الوصف**:
  - `patient_lookup`: البحث عن مريض بالهاتف/الاسم مع تاريخه (زيارات/مديونية).
  - `patient_register`: تسجيل مريض جديد.
  - `patient_visit_history`: عرض سجل الزيارات.
  - حدّث `booking_reserve` ترجع `patientId`.
- **القبول**: الإيجنت عبر واتساب يسأل "أنا عميل قديم" → يطلع التاريخ ويحجز.

---

## Sprint 8 (اختياري لاحقاً): بوابة المريض

**الهدف**: المريض نفسه يدخل يشوف تاريخه ويحجز ويدفع.
**المعاينة/التحقق**: `/patient/login` ببياناته → لوحة + سجل + حجز موعد جديد.
- **المرجع**: `educationParentPortalRoutes.js` + `apps/frontend/src/pages/parent/*`.
- **الوصف**: `PatientAuthController` (login بالهاتف/OTP أو password) + صفحات (Dashboard/Appointments/MedicalHistory/Payments).
- **القبول**: دخول مريض يعرض بياناته فقط.

---

## استراتيجية الاختبار

- **Frontend**: Vitest — اتبع الموجود في `apps/frontend/src/pages/admin/booking/__tests__/` (مثل `BranchesTab.test.tsx`). كل Tab جديد لازم test file.
- **Backend**: سكريبتات اختبار يدوية بنمط `apps/backend/scripts/test-*` + اختبار API عبر `curl`.
- **التكامل**: سيناريو end-to-end: مريض يحجز من واتساب (AI) → ملفه يتعمل → يدفع → تظهر الإيرادات.
- **قبل كل دمج**: `npm run lint` + `npm run typecheck` (حسب إعدادات `apps/frontend/package.json`).

---

## المخاطر والملاحظات

1. **البيانات القديمة**: آلاف الحجوزات من غير `patientId` → سكربت الترحيل لازم يكون dedupe بالهاتف + تقرير قبل/بعد. (Sprint 2)
2. **الـ AI runtime**: أدوات `booking_reserve` معرّفة خارج الكود المحلي — تعديل الأداة يتطلب تحديث التعريف في النظام المُشغّل، مش الكود بس. تحقق قبل الاعتماد على `patientId` من الواتساب.
3. **المدفوعات**: لا تُعدّل `Payment` العام اللي عليه علامة "UNUSED - Legacy" — ابني `MedicalInvoice` جديد (نظافة وعزل). ممكن ترقيته لاحقاً للبوابات عبر `kashierService.js`.
4. **خصوصية البيانات الطبية**: التشخيص/الوصفة حقول حساسة — لازم تظهر فقط لمن له صلاحية (أدوار Owner/Manager + الطبيب نفسه)، وعدم إرجاعها في `getAllAppointments` للعاملين العاديين.
5. **أداء Find-or-Create**: index على `phone` في `Patient` و transaction عند الحجز المتزامن من AI.
6. **توافق الـ slots**: بعد إضافة `DoctorAvailability`، تأكد إن `getAvailableSlots` و`createAppointment` الـ فحص القديم (maxBookingsPerSlot بالفرع) ما اتكسرش — نفّذ tests للسيناريوهين.
7. **شيفرة الهجرة**: migration على قاعدة إنتاج كبيرة — استخدم script مرجعي `apps/backend/prisma/migrations/add_booking_module` كنمط، وراجع `fix-prisma-deployment.md`.

---

## خطة التراجع

- كل Sprint يُدمج في commit مستقل (اتبع نمط التزامات المشروع مثل `add_booking_module`).
- للمراحل الجديدة (Patient/Invoice/DoctorPortal): الحقول كلها `String?`/`Json?` اختيارية — لو ظهرت مشكلة، migration reversable `prisma migrate dev` قبل نشر الإنتاج.
- للبوابات: إيقاف التفعيل = `isAppActive` أو إزالة الروت من `App.tsx`/`sidebar.ts` بدون لمس الداتا.
- سكربتات الترحيل (backfill) تُحفظ في `apps/backend/scripts/` ولا تُحذف — متاحة للتراجع اليدوي.

---

## ملخص الأولوية للمسار الحرج

```
Sprint 1 → Sprint 2 → Sprint 4  (النواة: مرضى + تحصيل = أسرع قيمة سوقية)
                    └→ Sprint 3  (التاريخ الطبي — يبني على 1+2)
Sprint 5 (بوابة الطبيب) — يمكن أن يسير بالتوازي بعد 1+2
Sprint 6 → 7 → 8 (تقارير + إشعارات + بوابة مريض)
```
