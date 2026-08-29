# خطة: تفعيل سيناريو "معمل أسنان" (Dental Lab) داخل منصة maxp-platform

> وثيقة تحليلية + مخطط بناء فقط. **لم يُعدَّل أي ملف في الريبو** — هذا الملف (`DENTAL_LAB_PLAN.md`) هو الوحيد المُنشأ.
> تاريخ التحليل: 2026-08-29. المسار: `H:\maxp-platform` (الكود في `apps/backend` و `apps/frontend`).

---

## ١) ملخص سريع (TL;DR)

المنصة **متعددة المستأجرين فعلاً**، وفيه **نظام معمل أسنان شبه مكتمل** (schema + controllers + routes + frontend). اللي ناقص مش "هل نقدر نعمل الشركة دي؟" — إحنا أصلاً عندنا أساسها — الناقص هو:

1. **أدوار الأسنان متعملة بـ "حل مؤقت" (settings JSON)** مش بالـ RBAC الرسمي بتاع المنصة.
2. **مفيش دور `ASSISTANT`** (مساعد) — الأدوار الحالية: `OWNER, MANAGER, RECEPTION, TECHNICIAN, ACCOUNTANT`.
3. **مفيش موديل "مواعيد/جدول" (scheduling)** — السيناريو محتاج جدول مواعيد مرضى وتسليم/استلام.
4. **مفيش login مخصص لموظفي المعمل** — بيدخلوا من دخول المنصة العادي، والدور بتاعهم بيتحدد من إعداد محفوظ (`dentalSetting.teamRoles`) مش من نظام الصلاحيات.
5. **مفيش seed** لشركة معمل + مالك + فريق + خدمات + حالات تجريبية.

---

## ٢) نظام الـ auth والـ roles الحالي (الوصف الفعلي بعد الفحص)

### ٢.١ الطبقات الموجودة فعلاً

| الطبقة | المكان | الوظيفة |
|---|---|---|
| **Tenant** | `prisma/schema/core.prisma` → `model Company` | الشركة = المستأجر. كل الموديلات فيها `companyId`. |
| **User** | `core.prisma` → `model User` | المستخدم (فيه `role`, `companyId`, `departmentId`, `positionId`, `employeeNumber`, `hireDate`, إلخ — فيه جذور HR). |
| **UserCompany** | `core.prisma` → `model UserCompany` | الربط بين المستخدم والشركة: فيه `role UserCompaniesRole` و `roleId String?` (يربط بـ `Role`). |
| **RBAC الرسمي** | `prisma/schema/permissions.prisma` → `Role`, `Permission`, `RolePermission` + `enum PermissionDomain` | نظام صلاحيات حبيبي (granular). مصدره `services/permissionService.js`. |
| **RBAC middleware** | `middleware/rbacMiddleware.js` | `requirePermission()`, `requireDbPermission()`, `requireMinRole()`, `hasPermission()`. فيه `ROLES_HIERARCHY` (SUPER_ADMIN=∞، COMPANY_ADMIN=100، TEAM_LEADER=50، MODERATOR=10). |
| **دخول المنصة** | `controller/authController.js` + `utils` (jwt) | `authenticateToken` → بيحط `req.user` (فيه `role`, `companyId`, `userPermissions`). |
| **دخول بوابة الدكتور (العميل)** | `utils/dentalPortalAuth.js` + `controller/dentalLabPortalController.js` (`portalLogin`) | الدكتور (العميل اللي بيبعت حالات) يدخل برقم تليفون + `portalPin`، بياخد JWT فيه `role: 'DENTAL_DOCTOR'`. |

### ٢.٢ `UserCompaniesRole` (enum في `enums.prisma`)
القيم الحالية: `OWNER, SUPER_ADMIN, COMPANY_ADMIN, MANAGER, AGENT, AFFILIATE`.
⚠️ **ملهاش أي دور خاص بالأسنان** — مفيش `DENTAL_DOCTOR` / `DENTAL_STAFF` هنا. دور الدكتور بيُحمل بس كـ JWT claim مش من الموديل ده.

### ٢.٣ نظام أدوار الأسنان الموازي (ده الأهم)
السيناريو بتاع المعمل **شغّال بأدوار منفصلة عن RBAC الرسمي**:

- `services/dentalRoles.js`:
  ```js
  const DENTAL_ROLES = ['OWNER', 'MANAGER', 'RECEPTION', 'TECHNICIAN', 'ACCOUNTANT'];
  // resolveDentalRole: لو platform role في (SUPER_ADMIN, COMPANY_ADMIN, OWNER) => 'OWNER'
  //                   غير كده => يقرأ من dentalSetting.teamRoles[user.id] | افتراضي 'RECEPTION'
  ```
- `dentalRoleGuard(allowed = [])` middleware: يجيب `teamRoles` من `dentalSetting` (مفتاح `teamRoles` = JSON map: `userId -> role`) ويقارن.
- **المكان اللي بيتحفظ فيه الدور**: `dentalSetting` (`model DentalSetting` في `dental_lab.prisma`) — يعني **دور الموظف محفوظ كـ JSON في إعداد مش كـ سجل في `Role`/`UserCompany.roleId`**.
- المسارات الداخلية لموظفي المعمل (`routes/dentalLabRoutes.js`) كلها محمية بـ:
  ```js
  verifyToken.authenticateToken,            // دخول المنصة العادي
  dentalRoleGuard(['OWNER','MANAGER',...])  // تحديد دور الأسنان من الإعداد
  ```

### ٢.٤ نماذج الأسنان (`prisma/schema/dental_lab.prisma`)
موجودة وكاملة نسبياً:
`DentalLabDoctor` (الدكتور العميل، فيه `portalPin`)، `DentalWorkType` (نوع الشغل/الخدمة: تلبيس/جسر/طقم/زراعة/تجميلي)، `DentalTechnician` (فيه `userId` يربط بحساب منصة + `role` = `RECEPTION|CAD|TECHNICIAN|QC`)، `DentalLabCase` (الحالة، فيها `status`, `stages`, `priority`, `dueDate`, `paymentStatus`)، `DentalCaseStage`, `DentalCaseAssignment`, `DentalCaseAttachment`, `DentalInvoice`, `DentalPayment`, `DentalCustomFieldDef`, `DentalCaseStatusHistory`, `DentalSetting`, `DentalCreditNote`, `DentalQualityCheck`, `DentalRefabrication`.

### ٢.٥ الـ frontend
- `apps/frontend/src/pages/dental-lab/` : إدارة المعمل (Dashboard, Cases, Doctors, Technicians, WorkTypes, Invoices, Reports, Settings, Notifications, + `DentalTechnicianPortal.tsx`).
- `apps/frontend/src/pages/dental-doctor/` : بوابة الدكتور العميل (Login, Dashboard, Catalog, NewOrder, Cases, Invoices, CaseDetail).

---

## ٣) هل المشروع يدعم "شركة (tenant) فيها دكتور + فريق عمل بأدوار مختلفة"؟

**إجابة: نعم بشكل جزئي — الأساس موجود والسيناريو قابل للتنفيذ لكن محتاج تكميلات.**

- ✅ **الـ tenant (= Company)** موجود ومربوط بكل الموديلات.
- ✅ **الدكتور المالك (owner/admin)** = أي مستخدم منصة رتبته `COMPANY_ADMIN`/`OWNER` بيتحول تلقائياً لدور أسنان `OWNER` (صلاحيات كاملة) عبر `resolveDentalRole`.
- ✅ **فريق العمل** = مستخدمو المنصة أعضاء في الشركة، ودورهم الأسناني بيتحدد من `dentalSetting.teamRoles` (RECEPTION / TECHNICIAN / ACCOUNTANT / MANAGER).
- ✅ **صلاحيات مختلفة لكل دور** مفروضة فعلاً في `dentalLabRoutes.js` (مثال: `technician` يشوف ويحرّك الحالات بس؛ `reception` ينشئ حالات ويخصص؛ `accountant` يدير الفواتير؛ `owner/manager` يعدّل الإعدادات والفريق).
- ⚠️ **لكن**: ده نظام صلاحيات "قائم على الدور فقط" (role-based) مش "قائم على الصلاحية" (permission-based) عبر الـ RBAC الرسمي. ومحفوظ في إعداد JSON مش في جداول `Role`/`Permission`.

**النقاط اللي لسه مش مدعومة دعم كامل:**
- لا يوجد دور `ASSISTANT` (مساعد) — مطلوب في السيناريو.
- لا يوجد login مستقل لموظفي المعمل (بيستخدموا دخول المنصة العام، وده تمام لكن مفيش "بوابة موظف" مخصصة بصلاحياتها).
- لا يوجد **جدول مواعيد/مواعيد مرضى** (scheduling) في `dental_lab.prisma` — السيناريو محتاجه.
- لا يوجد ربط بين أدوار الأسنان ونظام `Role`/`Permission` الرسمي (يعني الـ RBAC الحالي للمنصة **مش** بيغطي الأسنان).

---

## ٤) السيناريو التفصيلي المقترح: "معمل أسنان — دكتور مالك + فريق عمل"

> تخيّل شركة tenant اسمها **"معمل روضة الفنان لأنظمة الأسنان"** (company slug: `rooda-dental-lab`).

### ٤.١ حساب الدكتور المالك (Owner / Admin — صلاحيات كاملة)
- **الهوية**: د. **محمود الراضي** — أخصائي تركيبات وزراعات، مالك المعمل.
- **نوع الحساب**: مستخدم منصة برتبة `COMPANY_ADMIN` (داخل الـ tenant) → يُحلّ تلقائياً لدور أسنان `OWNER`.
- **صلاحياته**: كل حاجة — إنشاء/تعديل/حذف الأطباء (العملاء)، أنواع الشغل، الموظفين، الحالات، الفواتير، الإعدادات، التقارير، تحديد أدوار الفريق (`PUT /team/:userId/role`).
- **ملاحظة**: في السيناريو ده "الدكتور" هو صاحب المعمل (مش الدكتور العميل اللي بيبعت الحالات). العملاء (الأطباء اللي بيبعتوا cases) هم سجلات `DentalLabDoctor` منفصلة.

### ٤.٢ حسابات فريق العمل (Staff — صلاحيات محدودة)

| الاسم | الدور الأسناني | الصلاحيات (المفروضة حالياً في `dentalLabRoutes`) | اللي يقدر يعمله |
|---|---|---|---|
| **منى سعيد** | `RECEPTION` (استقبال) | `verifyToken + dentalRoleGuard(['OWNER','MANAGER','RECEPTION'])` | تسجيل الحالات الواردة، تخصيص فني، رفع مرفقات، عرض الكتالوج، الداشبورد، التقارير التقنية |
| **كريم عادل** | `TECHNICIAN` (فني معمل) | `['OWNER','MANAGER','RECEPTION','TECHNICIAN']` للتحريك/الجودة | مشاهدة حالاته (`/my-cases`)، تحريك مراحل الحالة (`advanceCaseStatus`)، تسجيل فحص جودة، مشاهدة أجرته (`/my-wage`) — **مالهوش** وصول للفواتير/الإعدادات |
| **(مطلوب إضافته) سارة جمال** | `ASSISTANT` (مساعد) | *غير موجود حالياً* | مساعدة الاستقبال: عرض الحالات، طباعة أوراق العمل، تحديث بيانات المريض — **مالهوش** إنشاء/حذف أو فواتير |
| **أ. حسام فؤاد** | `ACCOUNTANT` (محاسب) | `['OWNER','MANAGER','ACCOUNTANT']` | الفواتير فقط: عرض/إنشاء فاتورة، تسجيل دفعة، كشف حساب طبيب، تقارير مالية — **مالهوش** حالات/فنيين |
| **نائب المدير (اختياري)** | `MANAGER` | `OWNER` ناقص تغيير أدوار الفريق | كل حاجة عدا `setTeamRole`/بعض الإعدادات الحساسة |

### ٤.٣ البيانات الأولية المقترح إدخالها (seed)

**أ) أنواع الشغل / خدمات الأسنان (`DentalWorkType`)** — تُستخدم كـ "منتجات/خدمات":
| الاسم | التصنيف | السعر (مثال) | مدة التصنيع |
|---|---|---|---|
| تلبيس زيركون | زيركون | 450 | 5 أيام |
| تلبيس إيماكس | إيماكس | 600 | 5 أيام |
| جسر (3 وحدات) | جسر | 1200 | 7 أيام |
| طقم كامل (كريلي) | طقم | 1800 | 10 أيام |
| زرعة CAD/CAM | زراعة | 900 | 6 أيام |
| فينير تجميلي | تجميلي | 700 | 5 أيام |
| صيانة/تعديل | أخرى | 150 | 2 يوم |

**ب) الأطباء العملاء (`DentalLabDoctor`)** — عملاء المعمل (مش فريقه):
- د. ليلى ناصر — عيادة ناصم دنت، الجيزة، تليفون +2010…， PIN: `1234`
- د. عمرو حسن — مركز ابتسامة المستقبل، القاهرة، PIN: `5678`

**ج) الفنيين (`DentalTechnician`)**:
- كريم عادل — `role: TECHNICIAN`، `userId` مربوط بحسابه، أجر/مرحلة افتراضي.
- (اختياري) م. أحمد CAD — `role: CAD`.

**د) جداول المواعيد (مقترحة — تحتاج موديل جديد، انظر البند ٥):**
- مواعيد استلام من المرضى/الأطباء: كل يوم 9–12، 1–5.
- مواعيد تسليم متوقعة: محسوبة من `dueDate` في الحالة.
- وراديات/مواعيد الفنيين: shifts (ممكن تستخدم `ShiftAssignment` الموجود في HR لو عايز تربط).

**هـ) حالات تجريبية (`DentalLabCase`)**: 5–10 حالات موزعة على الحالات (RECEIVED → DESIGN → MANUFACTURING → QC → READY → DELIVERED) لأطباء العملاء، مع stages و dueDate.

---

## ٥) قائمة النواقص الصريحة (إيه اللي لازم يُبنى)

### أ. الأدوار (Roles)
1. **إضافة دور `ASSISTANT`** إلى `DENTAL_ROLES` في `services/dentalRoles.js` وتوزيعه على المسارات المناسبة في `routes/dentalLabRoutes.js` (مثال: `dentalRoleGuard(['OWNER','MANAGER','RECEPTION','ASSISTANT'])` على عرض/طباعة الحالات).
2. **تمييز `RECEPTION` عن `ASSISTANT`**: حالياً متداخلين؛ قرر صلاحيات كل واحد صراحة.

### ب. الـ RBAC (دمج الأسنان في النظام الرسمي — الأهم للأمان والقابلية للتوسع)
3. **إضافة `DENTAL` إلى `enum PermissionDomain`** في `permissions.prisma`.
4. **عمل seed لصلاحيات الأسنان** (`Permission` rows) مثل:
   `dental.cases.view`, `dental.cases.create`, `dental.cases.advance`, `dental.cases.delete`,
   `dental.technicians.manage`, `dental.doctors.manage`, `dental.worktypes.manage`,
   `dental.invoices.view`, `dental.invoices.manage`, `dental.settings.manage`,
   `dental.team.manage`, `dental.reports.view`.
5. **إنشاء أدوار RBAC** (`Role` rows): `DENTAL_OWNER`, `DENTAL_MANAGER`, `DENTAL_RECEPTIONIST`, `DENTAL_TECHNICIAN`, `DENTAL_ASSISTANT`, `DENTAL_ACCOUNTANT` وربطها بصلاحياتها في `RolePermission`.
6. **ربط موظفي الأسنان بـ `UserCompany.roleId`** بدل الاعتماد على `dentalSetting.teamRoles` (أو على الأقل مزامنة الاثنين)، واستخدام `requireDbPermission('dental.cases.create')` بدل `dentalRoleGuard` الصلب — ده بيخلي الصلاحيات قابلة للتعديل من الإدارة من غير كود.

### ج. الموديلات (Models — ناقص فعلي في الـ schema)
7. **`DentalStaff` موحّد** (أو توسيع `DentalTechnician`): سجل فيه `userId`, `name`, `phone`, `role` (OWNER/MANAGER/RECEPTION/TECHNICIAN/ASSISTANT/ACCOUNTANT), `isActive`, `hireDate`, `workingHours` — عشان الموظف له بروفايل بيانات مش مجرد خريطة إعداد.
8. **جدول مواعيد `DentalAppointment`** (مطلوب في السيناريو "جداول مواعيد"): حقول `companyId`, `patientName`, `patientPhone`, `doctorId` (العميل), `caseId?`, `scheduledAt`, `durationMin`, `type` (RECEIVE|DELIVERY|CONSULT|QC), `status`, `assignedStaffId`, `notes`. (ملاحظة: في `booking.prisma` فيه نظام مواعيد طبي كامل لكنه **منفصل** عن الأسنان — ممكن إعادة استخدامه أو الربط به بدل إعادة اختراعه).
9. **ربط `DentalLabDoctor.userId`** للمالك/المدير لو عايز الدكتور المالك يكون له بروفايل موحّد (حالياً `DentalLabDoctor` مفيهوش `userId`).
10. **توحيد `DentalTechnician.role`** (`RECEPTION|CAD|TECHNICIAN|QC`) مع أدوار الأسنان في `dentalRoles.js` (فيه تداخل/ازدواجية حالياً بين المفهومين).

### د. الـ auth / الدخول
11. **بوابة موظفين مخصصة (اختياري لكن مستحسن)**: حالياً الموظف بيدخل من دخول المنصة العام ويروح لصفحة `dental-lab`. ممكن يُضاف `dentalStaffAuth` middleware يشبه `dentalPortalAuth` بس للـ `User` (وليس `DentalLabDoctor`)، عشان تعزل بوابة الموظفين عن بوابة الدكتور العميل.
12. التأكد إن `authenticateToken` بيحط `companyId` صح لمستخدمي الأسنان (ده شغّال لأنهم مستخدمو منصة).

### هـ. الـ frontend
13. **صفحة/بوابة `ASSISTANT`** (مساعد) بصلاحيات محدودة (عرض/طباعة/تحديث بيانات مريض).
14. **Dashboards مختلفة حسب الدور** في `dental-lab/` (الـ reception يشوف استقبال، الـ technician يشوف `/my-cases`، الـ accountant يشوف فواتير فقط) — حالياً `DentalLabManagementPage` موحّد ومفيهوش توجيه حسب الدور في الواجهة.
15. **شاشة مواعيد/تقويم** (Calendar) تستهلك `DentalAppointment` (لو اتبني البند ٨).
16. **شاشة إدارة الفريق وتعيين الأدوار** موجودة منطقياً (`PUT /team/:userId/role`) لكن محتاجة UI واضحة لتعيين `ASSISTANT`.

### و. الـ seed / التهيئة
17. **سكربت seed** (`prisma/seeds/seedDentalLab.js` أو مشابه) ينشئ: شركة tenant + مستخدم مالك (`COMPANY_ADMIN`) + مستخدمي فريق (reception/technician/assistant/accountant) + `DentalWorkType` الـ 7 + أطباء عملاء + فنيين + 5–10 حالات تجريبية + إعداد `dentalSetting.teamRoles`.
18. **توثيق** كيفية تفعيل معمل جديد (onboarding) من الـ admin.

---

## ٦) ترتيب التنفيذ المقترح (خارطة طريق)

1. **أساس البيانات**: إضافة `DENTAL` لـ `PermissionDomain` + ميجريشن + seed للـ `Permission`/`Role`/`RolePermission` الخاصة بالأسنان. (بند ٣،٤،٥ أعلاه)
2. **توسيع الأدوار**: إضافة `ASSISTANT` في `dentalRoles.js` + توزيعه على المسارات. (بند ١،٢)
3. **موديل المواعيد**: إنشاء `DentalAppointment` (+ ميجريشن) أو الربط بـ `booking.prisma`. (بند ٨)
4. **توحيد الموظفين**: `DentalStaff` موحّد + ربط `userId` + مزامنة مع `UserCompany.roleId`. (بند ٧،١٠)
5. **صلاحيات الصلاحيات (permission-based)**: تغيير `dentalRoleGuard` تدريجياً ليستعمل `requireDbPermission`. (بند ٦)
6. **الـ frontend**: بوابات/داشبوردات حسب الدور + شاشة مواعيد + UI تعيين الأدوار. (بند ١٣،١٤،١٥،١٦)
7. **الـ seed + التوثيق**: سكربت تهيئة معمل جاهز + دليل الـ onboarding. (بند ١٧،١٨)

---

## ٧) استنتاج نهائي

- **نظام الـ roles الحالي**: منصة متعددة المستأجرين (Company/User/UserCompany) + RBAC رسمي (Role/Permission/RolePermission) **غير مُفعّل على الأسنان** + نظام أدوار أسنان موازٍ (`dentalRoles.js`: `OWNER, MANAGER, RECEPTION, TECHNICIAN, ACCOUNTANT`) محفوظ في `dentalSetting.teamRoles` JSON، محمي بـ `authenticateToken` + `dentalRoleGuard`.
- **هل يدعم السيناريو؟** يدعمه جزئياً: الدكتور المالك = `OWNER` (صلاحيات كاملة)، والفريق = مستخدمو منصة بأدوار محدودة. الناقص: دور `ASSISTANT`، دمج الأسنان في RBAC الرسمي، موديل مواعيد، بوابة/داشبورد موظفين مخصصة، وseed.
- **أكبر فجوة معمارية**: أدوار الأسنان معمولة "حل مؤقت" (إعداد JSON) مش بالـ RBAC الرسمي — ده أول حاجة تظبطها عشان الصلاحيات تبقى قابلة للإدارة والمراجعة.
