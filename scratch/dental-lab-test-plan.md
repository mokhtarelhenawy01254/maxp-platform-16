# خطة اختبار نظام معمل الأسنان - Dental Lab E2E Test Plan

> **النظام:** `apps/backend` + `apps/frontend` — نموذج `dental_lab.prisma`
> **الدور:** اختبار E2E من إنشاء شركة جديدة حتى تسليم وإغلاق حالات، عبر كل الأدوار
> **التاريخ:** 2026-08-29

---

## 0) ملخص تنفيذي (TL;DR)

### ما هو نظام معمل الأسنان؟
نظام SaaS vertical داخل MaxP بيخدم معامل الأسنان (تاج، جسر، طقم، زراعة، تجميلي). بيغطي:
- **استلام الطلب** من طبيب الأسنان (داخليًا أو عبر بوابة الطبيب)
- **تتبع الإنتاج** عبر 7 مراحل (RECEIVED→DESIGN→MANUFACTURING→QC→READY→DELIVERED→CLOSED)
- **إدارة الفريق** (OWNER / MANAGER / RECEPTION / TECHNICIAN / ACCOUNTANT)
- **الفواتير والتحصيل** (آلي أو يدوي + Paymob/Stripe gateway)
- **بوابة الطبيب** (PIN-based) لمتابعة حالاته وتقديم طلبات جديدة
- **ذكاء اصطناعي** (Gemini 2.5 Flash) لقراءة صور السكان/Work Order تلقائياً
- **تقارير** (طبيب، فني، نوع شغل، متأخرات، aging)

### الأرقام الرئيسية
- **16 موديول اختبار** | **~85 سيناريو** (SC-*) | **3 دكاترة + 5 فنيين + 5+ حالات لكل دكتور**
- **دورة حياة:** ~10 أيام (تاج زيركون) → 14 يوم (زراعة)
- **Backend:** Node.js + Express + Prisma (PostgreSQL)
- **Frontend:** React + TypeScript + i18n (عربي/إنجليزي)

### الـ Gaps المؤكدة في الكود (10)
| # | الفجوة | الأولوية |
|---|---|---|
| GAP-2 | لا يوجد bulk-advance للحالات | P2 (UX) |
| GAP-3 | لا يوجد Refund flow | P3 |
| GAP-4 | لا يوجد Duplicate case | P3 (UX helper) |
| GAP-5 | لا يوجد Inventory/Materials module | P1 (مطلوب للمعامل الحقيقية) |
| GAP-6 | لا يوجد PDF لتصدير Doctor Statement | P2 |
| GAP-7 | لا يوجد Barcode generation | P2 (يدوي مفيد) |
| GAP-8 | لا يوجد Warranty period tracking | P2 |
| GAP-9 | لا يوجد Fitting/Trial stage مستقل | P2 (Bisque try مهم في الزيركون) |
| GAP-10 | Dunning interval ثابت (لا dynamic من settings) | P3 |

### ⚠️ نقاط لازم تاخد بالك منها قبل ما تبدأ
1. **`enforceCreditLimit`** — لازم تفعّله في الـ settings عشان تختبره
2. **AI Scan Parser** — لازم يكون في `ai_keys` row بمفتاح Google Gemini
3. **Billing Policy** — ابدأ بـ `AUTO_ON_DELIVERY` (الافتراضي) عشان تشوف الـ flow
4. **Company isolation** — كل السيناريوهات معزولة على مستوى companyId، متقلقش

---

## 1) ملخص النظام (ما قرأته من الكود والـ web research)

### 1.1 الأقسام الأساسية (8 تابات في الواجهة الرئيسية)
| التبويب | الوظيفة | الدور المسموح |
|---|---|---|
| Dashboard | إجماليات: حالات اليوم، جاهز، متأخر، إيرادات، مديونيات | OWNER/MANAGER/RECEPTION |
| Cases | دورة حياة الحالة الكاملة RECEIVED→DESIGN→MANUFACTURING→QC→READY→DELIVERED→CLOSED | OWNER/MANAGER/RECEPTION (+ TECHNICIAN للـ advance فقط) |
| Doctors | إدارة أطباء الأسنان (العملاء) + Credit Limit | OWNER/MANAGER (MANAGER للتعديل، RECEPTION عرض فقط) |
| Work Types | كتالوج أنواع الشغل (تاج/جسر/طقم/زراعة/تجميلي) مع سعر و lead time | OWNER/MANAGER/RECEPTION |
| Technicians | إدارة الفنيين بأدوار (RECEPTION/CAD/TECHNICIAN/QC) | OWNER/MANAGER |
| Invoices | الفواتير + المدفوعات + رابط الدفع + PDF | OWNER/MANAGER/ACCOUNTANT |
| Settings | Billing policy، Stage templates، Custom fields، Team roles، Doctor pricing، WhatsApp templates، Wages، Dunning | OWNER/MANAGER |
| Reports | Doctor statement، Technician productivity، Work type revenue، Overdue، Aging | OWNER/MANAGER/ACCOUNTANT |

### 1.2 البوابة الخارجية للطبيب (Doctor Portal)
- Login بالـ PIN
- كتالوج، سلة، طلب جديد، حالاتي، تفاصيل الحالة، فواتيري
- اعتماد التصميم (Design Approval) — رفع مرفقات

### 1.3 نظام الفنيين
- Technician self-service: `/me`, `/my-cases`, `/my-wage` (أجر حسب المرحلة)
- Doctor Pricing: قائمة أسعار خاصة لكل طبيب حسب نوع العمل

### 1.4 دورة حياة الحالة (CASE_STATUS_CHAIN)
```
RECEIVED → DESIGN → MANUFACTURING → QC → READY → DELIVERED → CLOSED
```
- كل مرحلة لها `Stage` قابل للتعيين (assignee)
- **Billing Policy:**
  - `AUTO_ON_RECEIPT` — فاتورة فورية عند الاستلام
  - `AUTO_ON_DELIVERY` — فاتورة عند التسليم (الافتراضي)
  - `MANUAL` — يدوي
- **Guards:** `requireInvoiceBeforeDelivery=true` + `requireFullPaymentBeforeDelivery=false` + `enforceCreditLimit=false`

### 1.5 قدرات متقدمة موجودة في الكود
- **AI Scan Parser** — Gemini 2.5 Flash يقرأ صورة أمر الشغل ويستخرج (patient, teeth, shade, material, workTypeHint)
- **Delivery Estimate** — يحسب متوسط مدة التنفيذ من تاريخ الشركة (تعلم آلي بسيط)
- **Dunning/Notifications** — جدولة تذكيرات التحصيل (cron كل 6 ساعات)
- **Quality Checks** — Pass/Fail لكل حالة
- **Refabrications** — إعادة تصنيع + تتبع الحل
- **Credit Notes** — إشعارات دائنة للطبيب
- **Custom Fields** — حقول مخصصة على الحالات
- **Status History** — audit trail كامل (STAGE/ORDER/PAYMENT/INVOICE dimensions)
- **Work Order PDF** — طباعة أمر شغل
- **Invoice PDF** + **Payment Link** (Paymob/Stripe جاهز)
- **Team Roles** — 5 أدوار (OWNER/MANAGER/RECEPTION/TECHNICIAN/ACCOUNTANT)

---

## 2) مراحل الاختبار E2E (من الصفر)

### مرحلة 0: Bootstrap الشركة
1. تسجيل حساب جديد على maxp.online من المتصفح
2. إنشاء شركة جديدة باسم "معمل النور للأسنان"
3. تفعيل vertical "Dental Lab" من إعدادات الشركة
4. ضبط الإعدادات الأساسية:
   - Billing Policy → `AUTO_ON_DELIVERY`
   - `requireInvoiceBeforeDelivery=true`
   - `enforceCreditLimit=true` (للاختبار)
5. ضبط Stage Templates الافتراضية

### مرحلة 1: البيانات الأساسية (Setup)
1. إضافة **أنواع شغل** (5+ أنواع):
   - تاج زيركون — 1500 ج.م — 5 أيام
   - جسر 3 وحدات — 3500 ج.م — 7 أيام
   - طقم كامل — 4500 ج.م — 10 أيام
   - قشرة إيماكس — 1200 ج.م — 4 أيام
   - زراعة + تاج — 6000 ج.م — 14 يوم
2. إضافة **3 دكاترة على الأقل** (عملاء):
   - د. أحمد سامي — عيادة النور
   - د. منى عبد الله — عيادة ابتسامة
   - د. خالد إبراهيم — عيادة د. خالد (له credit limit عالي)
3. إضافة **فريق العمل** (5+):
   - OWNER (المالك)
   - MANAGER (مدير المعمل)
   - RECEPTION (موظف استقبال)
   - TECHNICIAN × 2 (CAD + Bench)
   - ACCOUNTANT (محاسب)
4. ربط الفنيين بحسابات المنصة (userId)

### مرحلة 2: دورة الحالة الكاملة (Happy Path)
1. RECEPTION يفتح البوابة أو التطبيق → يضيف حالة جديدة لتاج زيركون
2. رفع سكان أمر الشغل → Scan Parser يحلل الصورة (لو مفعل AI)
3. تعيين فني CAD → status=DESIGN
4. الفني يعمل Design → advance لـ MANUFACTURING
5. تعيين فني Bench → التصنيع
6. QC Review (Pass) → status=READY
7. عمل Invoice تلقائي (AUTO_ON_DELIVERY) → status=DELIVERED
8. تسجيل دفعة جزئية/كاملة
9. CLOSE الحالة

### مرحلة 3: سيناريوهات متقدمة
1. **Credit Limit** — إنشاء حالة تتجاوز حد الائتمان للطبيب
2. **Refabrication** — QC fail → إعادة تصنيع
3. **Dunning** — فاتورة متأخرة 30 يوم → تشغيل التذكيرات
4. **Custom Fields** — إضافة "تاريخ التركيب" كحقل مخصص
5. **Doctor Pricing** — سعر خاص لد. خالد = 1300 بدل 1500

### مرحلة 4: بوابة الطبيب
1. د. أحمد يفتح `dental-portal/login` → يدخل phone + PIN
2. Dashboard الطبيب: حالاتي، جاهز، متأخر، مستحقاتي
3. تصفح الكتالوج → إضافة للسلة → تأكيد الطلب
4. متابعة حالة → رفع مرفق → اعتماد التصميم
5. عرض الفواتير

### مرحلة 5: Technician Portal
1. الفني يسجل دخول → يشوف حالاته فقط
2. يحدّث المرحلة (advance)
3. يعرض أجره (`/my-wage`)

### مرحلة 6: التقارير
- تقرير Doctor Statement
- تقرير Technician Productivity
- تقرير Work Type Revenue
- تقرير Overdue + Aging

---

## 3) سيناريوهات الاختبار التفصيلية (TIDs)

> **Convention:** `SC-XX-YY` — XX=الموديول، YY=رقم السيناريو
> كل سيناريو له: **Pre-conditions** + **Steps** + **Expected** + **Code Ref**

### S1: Authentication & Multi-tenancy
| ID | السيناريو | المتوقع | Code |
|---|---|---|---|
| SC-AUTH-01 | تسجيل شركة جديدة وتفعيل Dental Lab vertical | company.created + DentalSetting(rows default) | schema/dental_lab.prisma |
| SC-AUTH-02 | تسجيل دخول RECEPTION من token مختلف عن OWNER | role guard صحيح | services/dentalRoles.js |
| SC-AUTH-03 | RECEPTION يحاول يدخل `/team` (للـ OWNER فقط) | 403 | routes/dentalLabRoutes.js:131 |
| SC-AUTH-04 | شركة A تحاول تشوف بيانات شركة B | 404 (عزل كامل) | routes/dentalLabRoutes.js:14-38 |
| SC-AUTH-05 | طبيب من شركة A يحاول يدخل portal شركة B | 401 | utils/dentalPortalAuth.js |

### S2: Doctors (العملاء)
| ID | السيناريو | المتوقع | Code |
|---|---|---|---|
| SC-DOC-01 | إضافة د. أحمد (phone unique) | doctor.created + creditLimit=0 | controller.dentalLabController.listDoctors |
| SC-DOC-02 | إضافة د. مكرر بنفس phone | 400/handled | schema unique index phone |
| SC-DOC-03 | تعديل creditLimit = 5000 | doctor.updated | controller.createDoctor |
| SC-DOC-04 | Doctor Statement Report يظهر الرصيد | report.returns correct total/paid/remaining | controller.getDoctorStatement |
| SC-DOC-05 | حذف دكتور عليه حالات + فواتير | SetNull على doctorId (لا cascade) | schema onDelete: SetNull |
| SC-DOC-06 | تعطيل طبيب (isActive=false) | يظهر في القائمة لكن فاتوراته تستمر | controller.listDoctors |

### S3: Work Types
| ID | السيناريو | المتوقع | Code |
|---|---|---|---|
| SC-WT-01 | إضافة 5 أنواع شغل (تاج/جسر/طقم/قشرة/زراعة) | 5 rows | controller.createWorkType |
| SC-WT-02 | sortOrder للترتيب | يظهر بالترتيب الصحيح | schema sortOrder |
| SC-WT-03 | حذف نوع شغل عليه حالات | SetNull | schema onDelete: SetNull |
| SC-WT-04 | تعديل price → priceSnapshot للحالات الجديدة يحفظ الجديد | الحالات القديمة محتفظة بالسعر القديم | schema priceSnapshot |

### S4: Technicians + Wages
| ID | السيناريو | المتوقع | Code |
|---|---|---|---|
| SC-TECH-01 | إضافة فني بـ role=RECEPTION (مدير) | row created | controller.createTechnician |
| SC-TECH-02 | wagePerStage = 50 ج.م | يستخدمه بدلاً من defaultPerStage | services/dentalPricing.js |
| SC-TECH-03 | TECHNICIAN يفتح `/dental-lab` في الواجهة | يعرض Technician Portal (ليس admin) | DentalLabManagementPage:41 |
| SC-TECH-04 | الفني يحدّث مرحلة لحالة غير معينة له | policy guard | routes:96 advance role guard |
| SC-TECH-05 | تقرير Technician Productivity | يحسب completed stages × wage | controller.getTechnicianProductivity |
| SC-TECH-06 | TECHNICIAN يحذف طبيب | 403 | routes:76 deleteDoctor guard |

### S5: Case Lifecycle (القلب)
| ID | السيناريو | المتوقع | Code |
|---|---|---|---|
| SC-CASE-01 | RECEPTION يفتح حالة جديدة لتاج زيركون | caseNumber=DL-YYYYMMDD-0001 | generateCaseNumber |
| SC-CASE-02 | stages تتولد تلقائياً (5 stages) | stages.length=5 | buildStagesData |
| SC-CASE-03 | advance RECEIVED → DESIGN (مع تعيين فني) | stage[0]=DONE, stage[1]=IN_PROGRESS | controller.advanceCaseStatus |
| SC-CASE-04 | advance MANUFACTURING → QC (بدون تعيين) | assignment.same technician | controller.advanceCaseStatus |
| SC-CASE-05 | Quality Check Pass | DentalQualityCheck passed=true | controller.recordQualityCheck |
| SC-CASE-06 | Quality Check Fail + Flag Refabrication | Refabrication row open, status→DESIGN | controller.flagRefabrication |
| SC-CASE-07 | status=READY → DELIVERED (AUTO_ON_DELIVERY) | autoCreateInvoiceForCase fired | controller autoCreateInvoiceForCase:56 |
| SC-CASE-08 | requireInvoiceBeforeDelivery=true + لم تُنشأ فاتورة | error 400 | controller.getBillingPolicy |
| SC-CASE-09 | enforceCreditLimit=true + إجمالي > creditLimit | error 400 blocked | services/dentalBillingPolicy.assertCreditLimit |
| SC-CASE-10 | status=CLOSED | invoice PAID (manual) → closed | controller.advanceCaseStatus |
| SC-CASE-11 | Delivery Estimate يحسب متوسط lead time من history | suggests due date | services/dentalDeliveryEstimate.suggestDueDate |
| SC-CASE-12 | scan-parse: رفع صورة سكان → AI يحلل → fill fields | patientName/teeth/shade/material/wType populated | controller.parseScan |

### S6: Attachments
| ID | السيناريو | المتوقع | Code |
|---|---|---|---|
| SC-ATT-01 | رفع صورة سكان (PHOTO) | DentalCaseAttachment kind=PHOTO | controller.uploadCaseAttachment |
| SC-ATT-02 | رفع design review (DESIGN_REVIEW) | يُعرض في iframe مع CSP | routes:43 design-review |
| SC-ATT-03 | رفع ملف بحجم > 50MB | 400 LIMIT_FILE_SIZE | routes:198 multer error |
| SC-ATT-04 | رفع exe/html | kind=OTHER | (لا يوجد فلتر صريح) |
| SC-ATT-05 | حذف attachment | row deleted | controller.deleteCaseAttachment |
| SC-ATT-06 | طبيب في البوابة يرفع مرفق | uploadedBy=doctor:<id> | schema uploadedBy |

### S7: Invoices & Payments
| ID | السيناريو | المتوقع | Code |
|---|---|---|---|
| SC-INV-01 | createInvoice من حالة (AUTO_ON_DELIVERY) | INV-DL-YYYYMMDD-0001 + auto-create | controller.createInvoice |
| SC-INV-02 | دفعة جزئية 500 من فاتورة 1500 | status=PARTIAL, paid=500, remaining=1000 | controller.recordInvoicePayment |
| SC-INV-03 | دفع كامل → status=PAID | invoice closed | controller.recordInvoicePayment |
| SC-INV-04 | methods=CASH/CARD/BANK/VODAFONE_CASH/OTHER | validation | schema validation |
| SC-INV-05 | Invoice PDF يولّد | PDF stream | controller.getInvoicePdf |
| SC-INV-06 | getInvoicePaymentLink (Paymob stub) | returns gateway config | controller.getInvoicePaymentLink |
| SC-INV-07 | عمل VOID لفاتورة | status=VOID, لا تحسب في credit limit | schema onDelete + controller |

### S8: Credit Notes
| ID | السيناريو | المتوقع | Code |
|---|---|---|---|
| SC-CN-01 | إضافة Credit Note لحالة (إعادة تصنيع) | row + amount + reason | (لا يوجد route POST — read-only من /credit-notes) |
| SC-CN-02 | عرض Credit Notes | list per company | routes:142 |

> ✅ **تم التحقق:** Credit Note يتعمل **تلقائياً** عند `resolveRefabrication` (controller.dentalLabController:1967-1981) — مش لازم endpoint منفصل.

### S9: Settings
| ID | السيناريو | المتوقع | Code |
|---|---|---|---|
| SC-SET-01 | تعديل billingPolicy.invoiceMode=MANUAL | invoices لا تُنشأ تلقائياً | services/dentalBillingPolicy |
| SC-SET-02 | إضافة stageTemplate مخصص لـ "زراعة" | 6 stages للزراعة | utils.getStageTemplates |
| SC-SET-03 | إضافة customField "تاريخ التركيب" (DATE) | يظهر في نموذج الحالة | controller.createCustomField |
| SC-SET-04 | تعيين teamRole للمستخدم X = ACCOUNTANT | routes/team/role guard | controller.setTeamRole |
| SC-SET-05 | doctorPricing: د.خالد → تاج زيركون 1300 ج.م | يظهر في الـ dropdown | services/dentalPricing |
| SC-SET-06 | dunningEnabled=true | جدولة التذكيرات تفعل | services/dentalLabNotificationService |

### S10: Notifications & Dunning
| ID | السيناريو | المتوقع | Code |
|---|---|---|---|
| SC-NOTIF-01 | scanOverdueNotifications | يكتشف الحالات المتأخرة | controller.scanOverdueNotifications |
| SC-NOTIF-02 | runDunningCheck | يولد رسائل WhatsApp/SMS للفواتير | dentalLabNotificationService |
| SC-NOTIF-03 | updateNotificationSchedule (كل 6 ساعات) | scheduler يلتقط | routes:169 interval |

### S11: Reports
| ID | السيناريو | المتوقع | Code |
|---|---|---|---|
| SC-REP-01 | Doctor Statement: د. أحمد = 10 حالات، 5 مدفوعة، 5000 ج.م متبقي | report | controller.getDoctorStatement |
| SC-REP-02 | Technician Productivity: أحمد الفني = 30 مرحلة × 50 ج.م = 1500 ج.م | report | controller.getTechnicianProductivity |
| SC-REP-03 | Work Type Revenue: تاج زيركون = 15000 ج.م | report | controller.getWorkTypeRevenue |
| SC-REP-04 | Overdue Report | list of overdue cases | controller.getOverdueReport |
| SC-REP-05 | Aging Report (30/60/90 يوم) | buckets | controller.getAgingReport |

### S12: Doctor Portal (External)
| ID | السيناريو | المتوقع | Code |
|---|---|---|---|
| SC-PORT-01 | د. أحمد يدخل بـ phone + PIN | token issued | controller.portalLogin |
| SC-PORT-02 | PIN خاطئ | 401 | utils/dentalPortalAuth |
| SC-PORT-03 | د. أحمد يشوف Dashboard (حالاتي/مستحقاتي) | stats correct | controller.portalDashboard |
| SC-PORT-04 | د. أحمد يطلب عمل من الكتالوج | case.source=PORTAL | controller.placeOrder |
| SC-PORT-05 | د. أحمد يرفع مرفق (سكان) | kind=SCAN | controller.uploadCaseAttachment |
| SC-PORT-06 | د. أحمد يعتمد تصميم (design-approval) | status=QC أو MANUFACTURING | controller.designApproval |
| SC-PORT-07 | د. أحمد يشوف فواتيره فقط | filtered by doctorId | controller.myInvoices |
| SC-PORT-08 | د. أحمد يطلب عمل فوق creditLimit | error blocked | services/dentalBillingPolicy |

### S13: Team & Multi-User
| ID | السيناريو | المتوقع | Code |
|---|---|---|---|
| SC-TEAM-01 | OWNER يضيف ACCOUNTANT ويضبط role=ACCOUNTANT | teamRoles[userId]=ACCOUNTANT | controller.setTeamRole |
| SC-TEAM-02 | ACCOUNTANT يدخل Invoices tab | يعرض الفواتير | routes:112 guard |
| SC-TEAM-03 | ACCOUNTANT يحاول يضيف حالة (cases POST) | 403 | routes:92 guard |
| SC-TEAM-04 | RECEPTION يدخل Cases tab | يستطيع إضافة + advance | routes:92 guard |
| SC-TEAM-05 | RECEPTION يدخل Settings tab | 403 | routes:127 guard |

### S14: Status History Audit Trail
| ID | السيناريو | المتوقع | Code |
|---|---|---|---|
| SC-AUD-01 | كل advance → DentalCaseStatusHistory row | dimension=STAGE | utils/dentalLabStatusHistory |
| SC-AUD-02 | Payment → dimension=PAYMENT | row created | same |
| SC-AUD-03 | Auto Invoice → dimension=INVOICE | row created | same |
| SC-AUD-04 | تغير orderStatus (PENDING→CHECKED_IN→IN_PROGRESS→COMPLETED) | 4 rows | (نفس pattern) |

### S15: Edge Cases & Negative
| ID | السيناريو | المتوقع | Code |
|---|---|---|---|
| SC-EDGE-01 | price = 0 (مجاني) | total=0, paymentStatus=PAID (auto) | derivePaymentStatus |
| SC-EDGE-02 | price سالب | 400 validation | toPositiveNumber |
| SC-EDGE-03 | تاريخ dueDate في الماضي | حالة متأخرة تلقائياً | dashboard overdueCount |
| SC-EDGE-04 | case.advance بدون سبب في QC FAIL | مطلوب reason | controller.advanceCaseStatus |
| SC-EDGE-05 | حذف شركة كاملة | cascade كل dental rows؟ | (نحتاج اختبار) |
| SC-EDGE-06 | Race condition على caseNumber | قفل صف + retry (P2002) | generateSequentialNumberTx:56 |
| SC-EDGE-07 | upload بدون file | multer error | routes:198 |
| SC-EDGE-08 | portalToken expired | 401 | utils/dentalPortalAuth |

### S16: AI Scan Parser
| ID | السيناريو | المتوقع | Code |
|---|---|---|---|
| SC-AI-01 | upload صورة سكان لـ case جديد | ترجع JSON + fill form | controller.parseScan |
| SC-AI-02 | لا يوجد AI key في DB | null (لا يفشل) | dentalScanParser:34 |
| SC-AI-03 | صورة مش واضحة (Gemini يفشل) | 400/handled | (نحتاج اختبار) |
| SC-AI-04 | response Gemini بدون JSON خام | stripCodeFences | parseScanJson:65 |

---

## 4) Gaps / فجوات في الكود (اللي السيناريوهات لا تغطيها)

| GAP | الوصف | التوصية |
|---|---|---|
| **GAP-1** | لا يوجد `POST /credit-notes` — فقط GET | إضافة `controller.createCreditNote` + route |
| **GAP-2** | لا يوجد bulk action على الحالات (e.g. advance multiple) | إضافة `POST /cases/bulk-advance` |
| **GAP-3** | لا يوجد route لإرجاع/Refund (return) | إضافة endpoint + return flow |
| **GAP-4** | لا يوجد route لنسخ الحالة (duplicate) | UX helper في الواجهة |
| **GAP-5** | لا يوجد "Inventory/Materials" module | أضف DentalMaterial + تتبع استهلاك |
| **GAP-6** | لا يوجد تصدير PDF لكشوف الحساب | إضافة export CSV/PDF |
| **GAP-7** | لا يوجد barcode generation للـ case | أضف barcode للطباعة |
| **GAP-8** | لا يوجد route لـ "Warranty" (رغم ذكره في web research) | إضافة warranty period + reminder |
| **GAP-9** | لا يوجد "Fitting/Trial" stage منفصل (Bisque try) | أضف stage template للـ fitting |
| **GAP-10** | Dunning cron كل 6 ساعات ثابتة — لا dynamic من settings | استخدم dunningIntervalHours من settings |

---

## 5) خطة التنفيذ (Order of Operations)

### 5.1 Phase 1: Setup (يوم 1)
- [ ] إنشاء شركة جديدة في المتصفح
- [ ] إضافة 5 work types
- [ ] إضافة 3 doctors (1 منهم له credit limit)
- [ ] إضافة 5 team members (OWNER/MANAGER/RECEPTION/TECH×2/ACCOUNTANT)

### 5.2 Phase 2: Happy Path (يوم 1)
- [ ] SC-CASE-01 → SC-CASE-12 (دورة كاملة على 3 دكاترة × 3 cases لكل واحد)

### 5.3 Phase 3: Edge Cases (يوم 2)
- [ ] GAP-1: Credit Notes (تغطية اليدوي عبر DB مباشرة إذا الـ route ناقص)
- [ ] SC-CASE-09: Credit Limit exceed
- [ ] SC-CASE-06: Refabrication
- [ ] SC-AI-01: Scan Parser

### 5.4 Phase 4: Portal (يوم 2)
- [ ] SC-PORT-01 → SC-PORT-08 (3 دكاترة)

### 5.5 Phase 5: Reports & Multi-user (يوم 3)
- [ ] SC-REP-01 → SC-REP-05
- [ ] SC-TEAM-01 → SC-TEAM-05

---

## 6) معايير النجاح (Acceptance)

- ✅ كل SC-* من 1 إلى 16 يمر بنجاح
- ✅ Audit Trail يحفظ كل تغيير
- ✅ Multi-tenancy معزول
- ✅ Doctor Portal يعرض بيانات صحيحة فقط
- ✅ التقارير تطابق البيانات الفعلية
- ⚠️ GAP-1 (Credit Notes POST) — أما نضيفه أو نقبل الفجوة
