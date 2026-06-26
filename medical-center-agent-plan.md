# خطة: النظام الطبي + AI Agent

**تاريخ**: 26 يونيو 2026  
**التعقيد**: عالي  

## نظرة عامة

بناء **Booking Module** جديد كلياً ضمن منصة MaxP لإدارة مراكز الخدمات الطبية (علاج طبيعي، حجامة، إلخ) مع AI Agent يرد على استفسارات العملاء عبر واتساب/فيسبوك/شات ويحجز مواعيد.

النظام مبني على المعمارية الموجودة:
- **Backend**: Express.js + Prisma (PostgreSQL) — إضافة APIs في `apps/backend/`
- **Frontend**: React + Tailwind — صفحات جديدة في `apps/frontend/`
- **AI Agent**: Python + Microsoft Agent Framework — إضافة Agent + Tools في `apps/ai-service/`

كل Sprint ينتج **شيء قابل للتجربة والاختبار**.

---

## الـ Data Model (المحوري لكل الـ Sprints)

```
Branch (فرع)
  id, companyId, name, address, phone,
  workingDays (JSON: {sat: "3-9", sun: "12-9", ...}),
  genderDays (JSON: {male: ["sat","mon","wed"], female: ["sun","tue","thu"]}),
  isActive, createdAt

Doctor (دكتور — بدون اسم)
  id, companyId, branchId, title (مثلاً "دكتور العلاج الطبيعي"),
  gender (male/female), isActive, createdAt

Service (خدمة — مثل "جلسة علاج طبيعي")
  id, companyId, branchId, name, description,
  hasPackages (boolean), packages (JSON: [
    {count: 1, price: 100, label: "أول جلسة"},
    {count: 3, price: 500, originalPrice: 750},
    {count: 6, price: 950, originalPrice: 1500},
    {count: 12, price: 1800, originalPrice: 3000, bonus: 1}
  ]),
  requiresConsultation (boolean), isActive, createdAt

Appointment (تطوير الموديل الموجود)
  current fields + branchId, doctorId, serviceId,
  customerGender (male/female), packageSelected (JSON),
  source (whatsapp/facebook/chat/dashboard),
  requiresPayment (boolean), paymentStatus (pending/paid),
  confirmedAt, cancelledAt
```

---

## Sprint 1: 🏗️ البنية التحتية — Data Model + Backend APIs

**الهدف**: إنشاء جداول Prisma للـ Booking Module وجميع APIs الـ CRUD

**الإثبات**: `curl` أو Postman تجيب بيانات فروع/أطباء/خدمات/مواعيد

### Task 1.1: إضافة Prisma schema للـ Booking Module
- **الموقع**: `apps/backend/prisma/schema/booking.prisma`
- **الوصف**: إنشاء ملف Prisma جديد للنماذج: `BookingBranch`, `BookingDoctor`, `BookingService`, `BookingAppointment` وتحديث الـ Appointment الموجود
- **قبله**: لا شيء
- **معايير القبول**:
  - جميع النماذج مرتبطة بـ `companyId`
  - العلاقات بين Branch ← Doctor ← Service ← Appointment
  - Gender days كـ JSON field
  - Service packages كـ JSON array
- **التحقق**: `npx prisma generate` يمر بدون أخطاء

### Task 1.2: تشغيل Prisma Migration
- **الموقع**: `apps/backend/prisma/migrations/`
- **الوصف**: إنشاء migration جديدة وتطبيقها على قاعدة البيانات
- **قبله**: Task 1.1
- **معايير القبول**: الجداول الجديدة موجودة في PostgreSQL
- **التحقق**: `npx prisma migrate dev --name add_booking_module`

### Task 1.3: إنشاء Routes + Controllers للفروع (Branches)
- **الموقع**: `apps/backend/routes/bookingBranchRoutes.js` + `apps/backend/controller/bookingBranchController.js`
- **الوصف**: CRUD APIs للفروع
  - `GET /api/v1/booking/branches` — قائمة الفروع (مرتبطة بالـ company)
  - `POST /api/v1/booking/branches` — إنشاء فرع
  - `PUT /api/v1/booking/branches/:id` — تعديل فرع
  - `DELETE /api/v1/booking/branches/:id` — حذف فرع
- **قبله**: Task 1.2
- **التحقق**: إنشاء فرع بـ POST واسترجاعه بـ GET

### Task 1.4: إنشاء Routes + Controllers للأطباء (Doctors)
- **الموقع**: `apps/backend/routes/bookingDoctorRoutes.js` + `apps/backend/controller/bookingDoctorController.js`
- **الوصف**: CRUD APIs للأطباء (بدون أسماء — فقط title زي "دكتور العلاج الطبيعي")
  - `GET /api/v1/booking/doctors?branchId=X` — قائمة الأطباء
  - `POST /api/v1/booking/doctors` — إضافة دكتور
  - `PUT /api/v1/booking/doctors/:id` — تعديل
  - `DELETE /api/v1/booking/doctors/:id` — حذف
- **قبله**: Task 1.3
- **التحقق**: إضافة دكتور لفرع واسترجاع القائمة

### Task 1.5: إنشاء Routes + Controllers للخدمات (Services)
- **الموقع**: `apps/backend/routes/bookingServiceRoutes.js` + `apps/backend/controller/bookingServiceController.js`
- **الوصف**: CRUD APIs للخدمات مع الـ Packages
  - `GET /api/v1/booking/services?branchId=X` — قائمة الخدمات والأسعار
  - `POST /api/v1/booking/services` — إنشاء خدمة
  - `PUT /api/v1/booking/services/:id` — تعديل
  - `DELETE /api/v1/booking/services/:id` — حذف
- **قبله**: Task 1.3
- **التحقق**: إضافة خدمة "علاج طبيعي" بـ 3 packages واسترجاعها

### Task 1.6: تطوير Appointments APIs
- **الموقع**: تعديل `apps/backend/routes/appointmentsRoutes.js` + `apps/backend/controller/appointmentsController.js`
- **الوصف**: إضافة الحقول الجديدة للـ Appointment APIs
  - `GET /api/v1/appointments` — إضافة فلترة بـ branchId, doctorId, serviceId, customerGender
  - `POST /api/v1/appointments` — دعم الحقول الجديدة (branchId, doctorId, serviceId, customerGender)
  - `GET /api/v1/appointments/available-slots` — جلب الأوقات المتاحة (حسب: branchId, doctorId, date, gender)
  - `PUT /api/v1/appointments/:id/status` — تحديث الحالة
  - `POST /api/v1/appointments/:id/confirm` — إرسال تأكيد
- **قبله**: Task 1.4, 1.5
- **التحقق**: حجز موعد جديد بـ POST واسترجاع الأوقات المتاحة

### Task 1.7: ربط Routes في server.js
- **الموقع**: `apps/backend/server.js`
- **الوصف**: إضافة mount للـ routes الجديدة
  - `app.use("/api/v1/booking/branches", bookingBranchRoutes)`
  - `app.use("/api/v1/booking/doctors", bookingDoctorRoutes)`
  - `app.use("/api/v1/booking/services", bookingServiceRoutes)`
- **قبله**: Task 1.3 ~ 1.6
- **التحقق**: تشغيل السيرفر واختبار endpoints

---

## Sprint 2: 🖥️ واجهة المدير — صفحات الإدارة

**الهدف**: صفحات CRUD لطب العيان للـ Merchant (فروع، أطباء، خدمات، مواعيد مطورة)

**الإثبات**: تسجيل الدخول كـ Merchant ورؤية الصفحات الجديدة في الشريط الجانبي

### Task 2.1: تحديث Merchant Access
- **الموقع**: `apps/frontend/src/utils/merchantAccess.ts`
- **الوصف**: إضافة `/appointments`, `/booking/*` للمسارات المسموحة للـ Merchant
- **قبله**: Sprint 1
- **معايير القبول**: Merchant مايتحولش على Portal لو دخل على /appointments

### Task 2.2: تحديث شريط Sidebar للـ Merchant
- **الموقع**: `apps/frontend/src/config/sidebar.ts` (lines 233-256)
- **الوصف**: إضافة قسم "الخدمات الطبية" في sidebar الـ Merchant:
  ```
  📅 المواعيد ← /appointments
  👨‍⚕️ الأطباء   ← /booking/doctors
  🏥 الفروع     ← /booking/branches
  💊 الخدمات     ← /booking/services
  ```
- **قبله**: Task 2.1
- **التحقق**: الـ sidebar يظهر الأيقونات الجديدة

### Task 2.3: صفحة إدارة الفروع (BranchesPage)
- **الموقع**: إنشاء `apps/frontend/src/pages/booking/BranchesPage.tsx`
- **الوصف**: صفحة CRUD للفروع
  - جدول بالفروع (الاسم، العنوان، التلفون، الحالة)
  - زر إضافة فرع (Modal/Sheet)
  - تعديل أيام العمل (أيام الرجال/النساء)
  - تفعيل/إلغاء تفعيل فرع
- **قبله**: Task 2.2
- **التحقق**: إنشاء فرع "قادرون" بأيام رجال/نساء

### Task 2.4: صفحة إدارة الأطباء (DoctorsPage)
- **الموقع**: إنشاء `apps/frontend/src/pages/booking/DoctorsPage.tsx`
- **الوصف**: صفحة إدارة الأطباء — بدون أسماء (title فقط)
  - جدول بالأطباء (اللقب، الفرع، النوع، الحالة)
  - فلترة بالفرع
  - إضافة دكتور بلقب فقط
- **قبله**: Task 2.3
- **التحقق**: إضافة "دكتور العلاج الطبيعي" لفرع قادرون

### Task 2.5: صفحة إدارة الخدمات والأسعار (ServicesPage)
- **الموقع**: إنشاء `apps/frontend/src/pages/booking/ServicesPage.tsx`
- **الوصف**: صفحة الخدمات مع نظام الـ Packages
  - جدول بالخدمات (الاسم، الوصف، السعر الأساسي)
  - إضافة Package: {عدد الجلسات, السعر, السعر الأصلي, هدية؟}
  - تحديد هل الخدمة محتاجة كشف قبلها
- **قبله**: Task 2.3
- **التحقق**: إضافة خدمة "علاج طبيعي" بأسعارها المتدرجة

### Task 2.6: تطوير صفحة المواعيد (AppointmentsPage)
- **الموقع**: تعديل `apps/frontend/src/pages/appointments/Appointments.tsx`
- **الوصف**: إضافة الحقول الجديدة للصفحة الموجودة
  - فلترة بـ: الفرع، الدكتور، الخدمة، الجنس، التاريخ
  - عرض: اسم العميل + الجنس + الخدمة المحجوزة + الدكتور + الفرع
  - أيقونة جنس (ذكر/أنثى) بجانب اسم العميل
  - إضافة التقويم (Calendar View)
  - زر إرسال تأكيد للعميل
- **قبله**: Task 2.4, 2.5
- **التحقق**: حجز موعد لـ "أحمد" يوم رجال — يظهر في الجدول مع فلتر الجنس

### Task 2.7: إضافة Routes في App.tsx
- **الموقع**: `apps/frontend/src/App.tsx`
- **الوصف**: إضافة المسارات الجديدة
  - `/booking/branches` ← BranchesPage
  - `/booking/doctors` ← DoctorsPage
  - `/booking/services` ← ServicesPage
- **قبله**: Task 2.3 ~ 2.6
- **التحقق**: التنقل بين الصفحات شغال

---

## Sprint 3: 🤖 AI Agent — وكيل النظام الطبي

**الهدف**: AI Agent متخصص يرد على استفسارات النظام الطبي ويعمل حجوزات

**الإثبات**: فتح AI Agent Sandbox واختيار "Medical Center Agent" وكتابة "عايز موعد علاج طبيعي"

### Task 3.1: إنشاء Agent Config
- **الموقع**: `apps/backend/agents/medical-center/`
  - `agent.json`
  - `SOUL.md` — أنا مساعد مركز قادرون للعلاج الطبيعي، أرد بالعامية المصرية
  - `PERSONA.md` — لبق، مهني، مختصر  
  - `TOOLS.md` — شرح كل أداة
  - `AGENTS.md` — القواعد (اسأل عن الجنس قبل الحجز، مفيش أسماء دكاترة، إلخ)
- **الوصف**: ملفات تعريف الأيجنت بالبيانات الحقيقية لمركز قادرون
  - الخدمات والأسعار (كل التفاصيل اللي فوق)
  - مواعيد الرجال/النساء
  - قواعد الحجز (آخر حجز 8م، كل نصف ساعة)
  - شروط الحجز (الكشف قبل الجلسة)
- **قبله**: لا شيء
- **التحقق**: الأيجنت يظهر في Agent Profiles

### Task 3.2: إنشاء Booking Tools في AI Service
- **الموقع**: `apps/ai-service/src/tools/definitions/booking_tools.py`
- **الوصف**: Tools اللي الأيجنت هيستخدمها
  - `booking_branches_list` — جلب الفروع
  - `booking_doctors_list(branchId)` — جلب الأطباء
  - `booking_services_list(branchId, category)` — جلب الخدمات والأسعار
  - `booking_available_slots(branchId, doctorId, date, gender)` — الأوقات المتاحة
  - `booking_appointment_create(customerName, customerPhone, gender, branchId, serviceId, date, time)` — إنشاء حجز
  - `booking_appointment_cancel(appointmentId)` — إلغاء حجز
  - `booking_send_confirmation(appointmentId)` — إرسال تأكيد للعميل والمركز
- **قبله**: Sprint 1 (APIs موجودة)
- **التحقق**: tools تظهر في قائمة أدوات الأيجنت

### Task 3.3: إضافة Role-Tools Mapping
- **الموقع**: `apps/ai-service/src/tools/role_tools.yaml`
- **الوصف**: إضافة `MEDICAL_CENTER` role مع الـ tools الجديدة
- **قبله**: Task 3.2
- **التحقق**: role يظهر مرتبط بأدواته

### Task 3.4: إنشاء Skill للمركز الطبي
- **الموقع**: `apps/ai-service/skills/medical-center-booking/SKILL.md` + `skill.json`
- **الوصف**: Skill توصف إزاي تتعامل مع حجوزات النظام الطبي
  - الخطوات: استقبال → تحديد الخدمة → تحديد الجنس → التحقق من الوقت → حجز → تأكيد
  - قواعد الـ upsell (عرض الباكيدجات)
  - نصوص الردود (تأكيد الحجز للعميل، رسالة للمركز)
- **قبله**: Task 3.1
- **التحقق**: Skill يظهر ويقدر الأيجنت يستخدمها

### Task 3.5: ربط الـ Agent بالقنوات (WhatsApp + Facebook + Chat)
- **الموقع**: إعدادات Channel Routing في `apps/frontend/`
- **الوصف**: تعيين الأيجنت الطبي للقنوات:
  - Dashboard ← Medical Center Agent
  - WhatsApp ← Medical Center Agent
  - Messenger ← Medical Center Agent
- **قبله**: Task 3.4
- **التحقق**: الردود تجي من الأيجنت الطبي

---

## Sprint 4: 📱 تدفق الحجز الكامل — من العميل للتأكيد

**الهدف**: العميل يتكلم مع الأيجنت على أي قناة ← الأيجنت يحجز ← تأكيد يوصله + يوصلي

**الإثبات**: محادثة كاملة من "عايز موعد" لـ "تم الحجز" وظهور الحجز في صفحة المواعيد

### Task 4.1: آلية بحث الخدمة والأسعار
- **الموقع**: في الأيجنت (SOUL.md + booking tools)
- **الوصف**: الأيجنت يعرف يشرح كل خدمة بالتفصيل:
  - "جلسة علاج طبيعي = كشف + أجهزة + تمارين + علاج يدوي"
  - "جلسة شد فقرات = جلسة منفصلة بتبدأ بكشف"
  - "جلسة شوك ويف = 2000 نبضة للقدم، لو كعبين = جلستين"
  - الأسعار لكل باكيدج
- **قبله**: Sprint 3
- **التحقق**: الأيجنت يجاوب على "إيه أسعار علاج طبيعي" بالأسعار الصحيحة

### Task 4.2: تدفق طلب الجنس قبل الحجز
- **الموقع**: `apps/ai-service/skills/medical-center-booking/SKILL.md`
- **الوصف**: الأيجنت **لازم** يسأل عن جنس المريض قبل الحجز
  - لو راجل → يحجز في سبت/اثنين/أربع
  - لو ست → أحد/ثلاثاء/خميس
  - يقدر يحجز لشخص تاني (اللي بيتكلم على واتساب مش شرط يكون المريض)
- **قبله**: Task 4.1
- **التحقق**: الأيجنت يسأل "الحالة راجل ولا سيدة؟" لو مجاش في الكلام

### Task 4.3: Slot Availability Logic
- **الموقع**: Backend controller `bookingAppointmentController.js`
- **الوصف**: آلية حساب الأوقات المتاحة
  - جلب أوقات العمل للفرع (مثلاً رجال: 3-9م)
  - جلب المواعيد الموجودة (كل نصف ساعة)
  - حساب الـ slots الفاضية
  - أولاً كل ساعة (3,4,5,6,7,8) → بعد كده كل نصف ساعة (3:30, 4:30...)
  - آخر حجز: 8م
- **قبله**: Sprint 1
- **التحقق**: الأوقات المتاحة تظهر صح

### Task 4.4: نظام التأكيدات
- **الموقع**: `apps/ai-service/src/tools/definitions/booking_tools.py` + `apps/backend/`
- **الوصف**: بعد الحجز:
  - إنشاء رسالة تأكيد للعميل: _"تم حجز موعدك في مركز قادرون، يوم الاثنين 3:30م. للاستفسار: 01070034372"_
  - إرسال إشعار للمركز على 01070034372: _"حجز جديد: أحمد محمد، علاج طبيعي، الاثنين 3:30م"_
- **قبله**: Task 4.3
- **التحقق**: التأكيد يوصي الطرفين

### Task 4.5: خيار الدفع (اختياري — Basic)
- **الموقع**: إضافة `paymentRequired` field في Appointment
- **الوصف**: الأيجنت يقدر يسأل "تحب تحجز وتدفع في المركز ولا تدفع أونلاين دلوقتي؟"
  - لو أونلاين → payment link (للتطبيق المستقبلي)
- **قبله**: Task 4.4
- **التحقق**: الحقل موجود وoption يظهر في الواجهة

---

## Sprint 5: 🏢 مراكز متعددة + تحليلات

**الهدف**: دعم أكثر من مركز لنفس التاجر + تقويم بصري

**الإثبات**: إضافة "مركز سند" تحت نفس الحساب وتشغيله بحساب منفصل بالقنوات

### Task 5.1: تصفية كل الصفحات بـ Branch
- **الموقع**: كل صفحات الـ Booking
- **الوصف**: إضافة dropdown "اختر الفرع" في أول كل صفحة — الفلتر يتحكم في كل البيانات
- **قبله**: Sprint 2
- **التحقق**: التبديل بين فرعين يغير البيانات

### Task 5.2: الـ Agent يدعم مراكز متعددة
- **الموقع**: `apps/ai-service/src/tools/definitions/booking_tools.py`
- **الوصف**: الأيجنت يشتغل على أي مركز تابع لنفس الحساب
  - إضافة `branchId` parameters لكل الـ tools
  - الأيجنت يسأل "أي فرع؟" لو في أكتر من واحد
- **قبله**: Task 5.1
- **التحقق**: محادثة مع الأيجنت عن "قادرون" تشتغل وعن "سند" تشتغل برضو

### Task 5.3: تغيير إعدادات الأيجنت حسب المركز
- **الموقع**: تعديل Agent Config لكل مركز
- **الوصف**: مركز "سند" عنده خدمات وأسعار ومواعيد مختلفة
  - الأيجنت يعرف يفرق بين المركزين
- **قبله**: Task 5.2
- **التحقق**: نفس الأيجنت يشتغل باتنين

### Task 5.4: تقويم بصري (Calendar View)
- **الموقع**: تطوير `apps/frontend/src/pages/appointments/Appointments.tsx`
- **الوصف**: إضافة عرض تقويم شهري وأسبوعي
  - أيام الرجال لون مختلف عن النساء
  - الضغط على يوم يظهر حجوزاته
  - التبديل بين التقويم والجدول
- **قبله**: Sprint 2
- **التحقق**: التقويم يعرض المواعيد صح

### Task 5.5: مؤشرات وتحليلات (اختياري)
- **الموقع**: `apps/frontend/src/pages/booking/AnalyticsPage.tsx`
- **الوصف**: بطاقات مؤشرات بسيطة
  - عدد الحجوزات اليوم/الأسبوع/الشهر
  - أكثر الخدمات طلباً
  - نسبة الحجوزات لكل قناة (واتساب/فيسبوك/شات)
  - الإيرادات المتوقعة
- **قبله**: Sprint 5.1
- **التحقق**: الأرقام تتغير مع الحجوزات

---

## استراتيجية الاختبار

| الـ Sprint | نوع الاختبار | إيه اللي نتأكد منه |
|-----------|-------------|-------------------|
| Sprint 1 | Integration | كل API يرجع بيانات صحيحة مع company isolation |
| Sprint 2 | UI | الصفحات تظهر، CRUD شغال، Merchant مايتحولش على Portal |
| Sprint 3 | Agent | الأيجنت يرد صح على استفسارات الخدمات والأسعار |
| Sprint 4 | E2E | محادثة كاملة → حجز → تأكيد → ظهور في Dashboard |
| Sprint 5 | E2E | تعدد المراكز شغال، التقويم يعرض صح |

## المخاطر والمشاكل المحتملة

| الخطر | التأثير | العلاج |
|-------|---------|--------|
| العميل معندوش واتساب بزنس API | ميقدرش يستقبل حجوزات على واتساب | استخدام WhatsApp Cloud API أو Channel Routing الموجود |
| الأطباء بيتغيروا كتير (مفيش أسماء) | صعوبة في التقارير | نظام "لقب" فقط — مش محتاج أسماء فردية (حسب طلب العميل) |
| Slot system معقد (كل ساعة → كل نص ساعة) | صعوبة في logic | بداية بسيطة: كل ساعة → upgrade بعدين |
| الدفع أونلاين | محتاج بوابة دفع | في Sprint 4 — Basic (link) أو تأجيله |
| الخدمات فيها ترابط (شوك ويف = نبضات) | صعوبة في التسعير | كل خدمة لها package منفصل، الأيجنت يشرح القواعد في النص |

## خطة التراجع (Rollback)

لو حصل مشكلة في أي Sprint:
1. **Sprint 1**: `npx prisma migrate down` + إزالة routes من server.js
2. **Sprint 2**: إزالة routes من App.tsx + استرجاع merchantAccess.ts
3. **Sprint 3**: تعطيل agent في Channel Routing
4. **Sprint 4**: إزالة tools من booking_tools.py
5. **Sprint 5**: إزالة Calendar View + Analytics page
