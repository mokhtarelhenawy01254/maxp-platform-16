# خطة تنفيذ إصلاح نظام الأشعة — النسخة المعتمدة

> **الحالة:** مراجعة وتصحيح مقابل الكود الفعلي (13 أغسطس 2026)
> **المصادر:** `radiology-audit-backend.md`, `radiology-audit-frontend.md`, `radiology-2026-standards.md`, `radiology-claims-verification.md`
> **مبدأ الترتيب:** ما يكلّف فلوس/بيانات/امتثال اليوم أولًا → قياس قبل الأداء → تأجيل الميزات التخمينية لحين وجود عميل/تكامل فعلي.

---

## الأخطاء المصححة في التقارير السابقة (مرجع سريع)

| # | الادعاء القديم | الحقيقة | المرجع |
|---|---|---|---|
| 1 | Refund ممكن يطلع negative (استرجاع 50 ثم 50 على 80) | الاسترجاع سجل سالب والمجموع يشمل الاسترجاعات السابقة → الثاني يُرفض | `radiologyPaymentsController.js:109-121` |
| 2 | paidAmount ممكن off-by-1 من float | `total - remaining` = paidAmount بالظبط للمبالغ الصحيحة | `StudiesTab.tsx:129` |
| 3 | مفيش TS types للـ responses | 8 interfaces في `shared.ts:65-121` | `apps/frontend/src/pages/radiology/shared.ts` |
| 4 | RadiologyExamAddition ميت | عنده CRUD كامل + routes + tests + `ExamAdditionsTab.tsx` — تكرار ميزة مش dead code | `radiologyExamAdditionsController.js` |
| 5 | engineSequence يُعيد بناء الـ viewer مع كل re-render | `ids` memo على `[studyId]` فقط — إعادة البناء تحدث فقط عند تغيير الدراسة (مطلوب) | `DicomViewer.tsx:106-113` |
| 6 | insurance TOCTOU ينتج paidAmount = 2×total | فيه `$transaction` لكن القراءة/التحقق خارجه → lost update + ضعف ledger (الـ 2× الحقيقي في مسار الدراسة) | `radiologyInsuranceController.js:265-292` |
| 7 | حذف study بـ onDelete ناقص → orphan | مفيش route لحذف دراسة أصلًا، والـ default في Prisma = Restrict (الحذف يفشل لا يتـ orphan) | `radiologyRoutes.js` |
| 8 | PDPL enforcement غير مؤكد | **مؤكد**: اللائحة 1 نوفمبر 2025، التطبيق الكامل **31 أكتوبر 2026** (Clyde & Co, Lexology) | قانون 151/2020 |

---

## أولويات فورية — Sprint 1 (هذا الأسبوع، حماية الفلوس والبيانات)

### 1. إغلاق سباق الدفع (TOCTOU) — P0
**الخطورة:** استرجاعين/دفعتين متوازيين يضاعفان المبلغ.
**المكان:**
- `recordStudyPayment` / `refundStudyPayment` (`radiologyPaymentsController.js:54-132`)
- `radiologyInsuranceController.js:265-292`
**الحل:** نقل القراءة + التحقق جوه `prisma.$transaction` مع قفل الصف (`SELECT ... FOR UPDATE` عبر raw أو إعادة قراءة داخل tx)، وكتابة الإنقاص كعملية ذرية.
**تحقق:** اختبار متوازيين (Promise.all) يُفشل الثاني.

### 2. تخفيض حدود الرفع (upload memoryStorage) — P0
**الخطورة:** `multer.memoryStorage` بحجم حتى **10GB في الذاكرة لكل request** (`radiologyRoutes.js:9-21`).
**الحل (مؤقت فوري):**
- تقليل `files` إلى 50 و `fileSize` إلى 20MB
- أو التحويل إلى `diskStorage` مؤقت + حذف بعد الحفظ
- **لاحقًا:** مع مشروع S3 يُصبح رفع مباشر من الـ client إلى الـ object storage

### 3. تصحيح PII في الـ PDF — P0
**المكان:** `radiologyPdfService.js:39` (طباعة `patientPhone` verbatim).
**الحل:** redaction للأرقام (إظهار أول 3 + ***) + إزالة `nationalId` إن وُجد من أي قالب طباعة (أيضًا فحص `radiologyLabelsRoutes` للّاصقات).
**تحقق:** اختبار وحدة على `generateStudyReportPdf` يتحقق من غياب الرقم الكامل.

### 4. قفل التقرير الموقّع — P0
**الخطورة:** `upsertStudyReport` يقبل تعديل نص تقرير SIGNED إذا لم يُرسل `reportStatus` في الطلب (`radiologyController.js:743-758`).
**الحل:** في فرع الـ update، إذا كان `existing.reportStatus === 'SIGNED'` يرفض تعديل `reportText` بدون مرور على `advanceReport` (un-sign flow صريح).

### 5. سدّ الوصول على PHI — P0
**المكان:** `radiologyRoutes.js:56-58` — رفع الصور وجلبها (`getStudyImageFile`) بدون `requireRole`؛ والـ PDF (`/studies/:id/report/pdf`) كذلك.
**الحل:** وضع `requireRole(MANAGER_ROLES)` على جلب الملفات الخام والـ PDF، وإبقاء الـ metadata للقائمة متاحًا للفريق الطبي.

### 6. Audit log لوصول الصور — P0 (استُبعد من التقارير بلا سبب)
**المكان:** إضافة middleware على `GET /studies/:id/images/:imageId` + `/studies/:id/report/pdf`.
**الحل:** استخدام `activityLog` (موجود + له controller) — سجّل: user, studyId, imageId, timestamp, IP.
**تحقق:** استعلام الـ audit يظهر كل وصول صورة.

### 7. استشارة قانونية على PDPL (سريعة) — P0
**الحقيقة:** التطبيق الكامل **31 أكتوبر 2026** (~2.5 شهر من تاريخ الخطة).
**المطلوب فورًا:** تعيين DPO (أو تعاقد)، إعداد نموذج إبلاغ الاختراق (72 ساعة)، بدء ملفات ترخيص PDPC.
**ملاحظة:** هذه أولوية عمل **غير تقنية** لكنها تسبق أي ميزة 2026.

### 8. اختبارات انحدار للفلوس — P0
**الحل:** إضافة tests تغطي: recordPayment تحت التوازي، refund فوق المدفوع، حدود transition للتقرير، منع تعديل SIGNED، redaction الـ PDF.

---

## Sprint 2 (1-2 أسبوع) — أداء رخيص بدون بنية جديدة

### 9. قياس قبل الأداء (اجباري قبل pagination/indexes)
**اسأل قاعدة البيانات:**
```sql
SELECT count(*), pg_size_pretty(sum(pg_column_size(data))) FROM "RadiologyStudyImage";
SELECT count(*) FROM "RadiologyStudy";
SELECT count(*) FROM "RadiologyAppointment";
```
**القاعدة:** لو أقل من ~50K صف، تأجل pagination والـ trigram indexes — لا تُبنِ تحسينات لسيناريو غير موجود.

### 10. Cache-Control + ETag على DICOM — رخيص ومؤثر
**المكان:** `getStudyImageFile` (`radiologyController.js:652-679`).
**الحل:** `Cache-Control: private, max-age=604800` + `ETag` (hash من `updatedAt`/`id`) + `If-None-Match` → 304.
**الأثر:** فتح نفس الدراسة من الـ viewer لا يعيد تنزيل الصور.

### 11. Lazy loading في الـ viewer (الـ OOM الحقيقي في الـ frontend)
**المكان:** `DicomViewer.tsx:173` (`await viewport.setStack(imageIds)`).
**الحل:** `setStack` لأول 10 شرائح ثم إضافة الباقي تدريجيًا (`viewport.setStack` مع النمو، أو `addImages`)، مع مؤشر تقدم.
**الأثر:** يلغي تحميل/فك 2000 شريحة دفعة واحدة (~4GB في المتصفح).

### 12. جدولة الرفع السيريالي
**المكان:** `radiologyController.js:611-631` — `await create` لكل ملف في loop.
**الحل:** `createMany` للصفوف (بدون data البايت؟ لا — البايت في نفس الصف) أو تشغيل متوازٍ محدود بـ concurrency 5. الأولوية بعد قرار التخزين (انظر S3).

### 13. حذف dead code + deps
- `apps/frontend/src/pages/radiology/ReceptionTab.tsx` (غير مستورد — لا يُعبّأ لكنه ميت)
- `apps/frontend/src/components/radiology/polysegStub.js`
- `@icr/polyseg-wasm` + `dicom-parser` من `package.json` (deps ميتة)

### 14. تحقق من صلاحية الرفع (Multer يثق بالامتداد)
**الحل:** فحص توقيع DICOM (`DICM` في البايت 128) في `uploadStudyImages` ورفض الملفات غير الصالحة قبل الحفظ (حاليًا تُحفظ حتى لو لم تُفسّر).

---

## Sprint 3 (2-4 أسبوع) — تنظيف الـ schema و الأساس

### 15. تنظيف نموذج الإضافات
**الحل:** قرار واحد: إما `isAddition` على `RadiologyExamType` (المستخدم فعليًا) أو `RadiologyExamAddition`. إبقاء الاثنين = صيانة مزدوجة. (اختيار إبقاء `isAddition` + إزالة `RadiologyExamAddition` + `ExamAdditionsTab`، أو عكسه).

### 16. `tagIds` — connect أو disconnect
**الحالة:** حقل في schema (`radiology.prisma:53`) بلا أي controller يكتبه/يقرأه.
**الحل:** إما وسم فعلي في دراسة/تقرير، أو إزالة الحقل في migration.

### 17. Transition validator للمواعيد
**المكان:** `radiologyAppointmentsController.js:179-183` — يتحقق من القيمة فقط.
**الحل:** نفس نمط `validateRadiologyStudyTransition` (`radiologyController.js:69`) — DONE/CANCELLED نهائية، و CHECKED_IN فقط من SCHEDULED.

### 18. Float → Decimal للفلوس
**المكان:** كل حقول money في `radiology.prisma` (`price`, `paidAmount`, `amount`, `totalAmount`...).
**ملاحظة:** الأثر حقيقي فقط مع المبالغ الكبيرة — نفّذها مع اختبارات جمع/خصم دقيقة.

### 19. إغلاق `financial-summary` بالدور
**المكان:** `radiologyAdminRoutes.js:27` — مفتوح لأي مستخدم مصادق.
**الحل:** `requireRole(MANAGER_ROLES)`.

### 20. سد الثغرات الصغيرة المثبتة
- `markDelivered` دون validate على سلسلة الدراسة
- `attachToActiveShift` يبتلع الأخطاء بصمت → log + فشل واضح
- `branchId` حقل مكتوب ولا يُقرأ
- `recordRole` يقبل `by` كنص حر → ربط بمستخدم
- `previewQuote` لا يتحقق أن priceListId تتبع الشركة
- `studyNumber @unique` بـ 4 أرقام = تصادم محتمل → زيادة البادئة/الطول أو retry إلى 8
- الفهارس الناقصة: `@@index` على `companyId+status`, `companyId+createdAt`, `billingType`

---

## مشروع منفصل — تخزين DICOM (S3/MinIO/VNA) — الشهر+ القادم

> **قرار إداري قبل أي كود:** MinIO ذاتي الاستضافة أم S3 أم قرص محلي مع VNA؟
> **شرط مسبق:** قياس الحجم الحالي (بند 9) لتقدير التكلفة والترحيل.

### 21. الخطة
1. طبقة تجريد تخزين (`storageAdapter`) — interface واحد: `put/get/delete/presignedUrl`، تطبيقان: Postgres (الحالي) و S3.
2. migration script: قراءة `data` من `RadiologyStudyImage` → رفع إلى object storage → تحديث الصف بحقل `storageKey` (بدل البايت) — على دفعات، قابلة للاستئناف.
3. تعديل `uploadStudyImages` (رفع مباشر، لا memoryStorage) و `getStudyImageFile` (stream/presigned URL).
4. تعديل `DicomViewer` لاستخدام الـ presigned URLs (وضع `?token=` أو header مخصص لأن `beforeSend` موجود).
5. **التراجع الآمن:** فترة انتقالية يقرأ فيها الـ adapter من أي من المخزنين حسب وجود `storageKey`.
6. اختبار الحمل: 200 شريحة CT (~10GB) رفع وتصفح في نفس الوقت.

**تحذير:** لا تُدمج هذه مع أي مهمة أخرى — أخطاءها تُهلك الصور.

---

## Sprint 4 (بعد البنية) — الامتثال 2026

### 22. PDPL الجاهزية التقنية (deadline 31 أكتوبر 2026)
- MFA على كل endpoints ePHI (أو على الأقل مدخلات الأدوار الطبية/الكاشير)
- نموذج إبلاغ اختراق 72 ساعة + تسجيل زمني
- قائمة الـ subprocessors + BAA (Rology، مقدمي السحابة)

### 23. Critical Findings workflow
**المتطلب:** إشارة عاجلة على تقرير + تسليم + escalation + timestamp + إشعار (WhatsApp/بريد).

### 24. DICOMweb — **فقط** عند وجود تكامل فعلي
**الترتيب:** QIDO-RS ثم WADO-RS ثم STOW-RS.
**شرط البدء:** جهة خارجية (EMR/AI) مستعدة للاختبار — غير ذلك تأجيل.

### 25. AI pipeline
**الموجود:** `ai-service` Python + Cornerstone جاهزان.
**البداية الصغرى:** ربط DICOM SR للـ AI + flag auto-triage، وليس بناء منصة AI.

---

## لاحقًا (6+ شهور) — حسب الطلب فقط

- FHIR R4 `ImagingStudy` resource
- Radiation Dose tracking (RDSR/CTDIvol/DLP)
- Speech-to-text عربي للتقارير
- MPR + Measurements + Annotations في الـ viewer
- Prior comparison + Key Image Selection
- BI-RADS / LungRADS قوالب
- Peer review / RADPEER

---

## ملخص الأولوية النهائي

| Sprint | المدة | المحتوى |
|---|---|---|
| 1 | هذا الأسبوع | الدفع (TOCTOU)، upload memory، PDF redaction، قفل SIGNED، role gates، audit log، استشارة PDPL، اختبارات الفلوس |
| 2 | 1-2 أسبوع | قياس، Cache-Control، lazy viewer، dead code، Multer validation |
| 3 | 2-4 أسبوع | schema cleanup، transition validator، Decimal، الفهارس، الثغرات الصغيرة |
| S3 project | شهر+ | تخزين DICOM خارج Postgres (منفصل) |
| 4 | حسب الحاجة | PDPL تقني (قبل 31/10/2026)، Critical Findings، DICOMweb (عند طلب)، AI |
