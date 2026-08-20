# برومبت توجيه الـ agent التنفيذي — المهام المتبقّية من خطة الإشعارات

> **انسخ النص الموجود بين الخطين `===== BEGIN =====` و `===== END =====` بالأسفل وابعه للايجنت.**
> هذا الملف نفسه للتوثيق فقط — الـ agent لا يحتاج لقراءته.

---

## ===== BEGIN — انسخ من هنا =====

أهلاً. عندك مهمة استكمال على خطة إشعارات واتساب للطلبات. **الخطة الأصلية (§1.1-pre إلى §5.3) سبق اتنفّذت بالكامل** — الكود موجود وشغّال (`node --check` سليم على كل الملفات). مهمتك دلوقتي هي **3 مهام تبقّيّة** بس، مرتبة بالأولوية. اقرأ كل واحدة بالترتيب ونفّذها.

### المرجع الأساسي
- ملف الخطة: `apps/backend/docs/notifications/whatsapp-order-notifications-fix-plan-2026-08-03.md` — اقرأ §0 و§8 (سجل التقدم) أولاً لتفهم ما تم.
- مهم: **الوثيقة فيها تفاوَت** — الكود المقترح في بعض الأقسام (خاصة §1.2) لا يطابق التنفيذ الفعلي. الكود الفعلي في الملفات هو المصدر، الوثيقة مرجع للمقاصد فقط.

### قواعد صارمة (طبّقها على كل مهمة)
1. **لا تغيّر سلوك شغّال** بدون سبب موثّق. كل المهام هنا إمّا إضافة اختبارات، أو توثيق، أو تحسينات صيانة معزولة.
2. بعد كل ملف تعدّله: `node --check <file>` لازم ينجح.
3. بعد كل اختبار تكتبه: شغّله وتأكد إنه يعدّي: `npx jest <path>`.
4. **لا تعمل `git add` أو `git commit` أو `git push`** — اترك التعديلات في working tree للمراجعة.
5. لو لقيت bug حقيقي في التنفيذ الموجود أثناء المراجعة (مش من ضمن المهام)، **لا تصلحه** — سجّله في تقرير النهاية فقط مع `file:line` والسبب.
6. حدّث §8 (سجل التقدم) في الوثيقة بعد كل مهمة.

---

## المهمة 1 (الأهم): اختبارات Jest للوحدات الحرجة الجديدة

**الجذر**: المراجعة الأخيرة أثبتت إنه **لا توجد أي اختبارات** للـ modules الجديدة (`notificationQueueWorker`, `companyBranding`, `syncPreparationMetadata`, `getPersistedNotificationEventType`, `isDuplicateNotification`). دي منطقة حساسة (إشعارات للعملاء + فيروس مزدوج سابق) — لازم اختبارات.

اكتب اختبارات Jest في `apps/backend/tests/` تغطّي السلوكيات التالية بالظبط. **استخدم نفس نمط الاختبارات الموجودة** في `apps/backend/tests/` (راجع مثلاً `tests/services/` أو `tests/utils/` للأسلوب: mock الـ prisma/dependencies، اختبار الوحدة معزولة، لا DB حقيقي).

### 1أ — `getPersistedNotificationEventType` mapping (الأهم — يحمي §1.1-pre و§2.1-pre)
ملف: `apps/backend/tests/services/whatsapp/notificationTypes.test.js` (أو المسار اللي يطابق النمط)
الحالات المطلوبة:
- `RETURNED` → `ORDER_RETURNED`
- `REFUNDED` → `ORDER_REFUNDED`
- `PARTIALLY_REFUNDED` → `PARTIAL_REFUND`
- الحالات الـ 8 المرسومة أصلاً (CONFIRMED, PROCESSING, PREPARING/PICKING, PACKAGED/PACKED, SHIPPED, OUT_FOR_DELIVERY, DELIVERED, CANCELLED) تبقى كما هي.
- `TASK_*` → `ANNOUNCEMENT`
- قيمة فارغة/null → لا ترمي (تُرجع كما هي أو فارغ).
- **اختبار الانحدار الحرج**: إدخال `eventType` محوّل في `whatsAppNotificationLog` يجب أن يُنجح (لا يرمي enum error) — استخدم mock للتأكد إن القيمة واحدة من قيم `WhatsAppNotificationLogsEventType`.

### 1ب — `isDuplicateNotification` (§3.1)
اختبار أنّ:
- لو في صف log خلال النافذة (10ث) بنفس `orderId`+`eventType` → يرجع `true`.
- لو `orderId` موجود بس `eventType` مختلف → `false`.
- لو `recipientPhone` فقط يطابق (guest order، بدون orderId) → `true`.
- لو أقدم من النافذة → `false`.

### 1ج — `resolveCompanyBrand` (§2.2) في `utils/companyBranding.js`
- company بـ `name`+`customDomain` → يستخدم customDomain.
- company بـ `website` (بـ `https://`) → يستخرج الـ host صح.
- company بـ `slug` بس → `${slug}.${PLATFORM_BASE_DOMAIN}`.
- company `undefined`/`null` → fallback محايد ('Store' / 'store.maxp.online')، **لا يرمي**.
- **اختبار الانحدار**: النتيجة لا تحتوي أبداً على "Mokhtar" أو "mokhtarelhenawy" هاردكود.

### 1د — `syncPreparationMetadata` (§5.2) في `orderService.js`
- لو الـ status في `PREPARATION_PIPELINE_STATUSES` → يُحدّث `metadata.preparationStatus`.
- لو ليس في الـ pipeline → لا يعدّل الـ metadata.
- idempotent: استدعاء مرتين بنفس الـ status لا يُنتج update ثاني (أو update بنفس القيمة).

**معايير النجاح للمهمة 1**: كل الاختبارات تعدّي، `npx jest` لمجموعة الإشعارات يرجع green، ولا dependency على DB/Redis حقيقي (كلها mock).

---

## المهمة 2: توحيد الوثيقة مع التنفيذ الفعلي

الوثيقة فيها أماكن الكود المقترح فيها **لا يطابق** ما تم تنفيذه. هذا يخدع أي قارئ/منفّذ مستقبلي. صحّحها لتعكس الحقيقة:

### 2أ — §1.2: الكود المقترح حالياً يعرض `orderStatusHistory.createMany`. هذا **خاطئ** — الـ agent المنفّذ السابق اكتشف إن `updateOrderStatus` يكتب `statusHistory` متداخلاً (`orderService.js:1065-1073`، `statusHistory: { create: {...} }`)، فأزال `createMany` لتجنّب صفّي history مكررين.
- حدّث الكود المقترح في §1.2 ليطابق `cron/orderStatusAutoChangeCron.js` الفعلي (بدون createMany، مع `userId: 'SYSTEM_AUTO'`).
- أضف ملاحظة واضحة: "تنبيه: `updateOrderStatus` يكتب `OrderStatusHistory` متداخلاً عبر `statusHistory.create` داخل `prisma.order.update` — لا تستخدم `createMany` منفصل وإلا ستنتج صفوف مكررة. مرّر هوية المنفّذ عبر المعامل `userId` (يظهر كـ `changedBy`)."

### 2ب — §3.1: وثّق القرار النهائي
الـ agent رفض قيد DB الفريد (`@@unique`) بناءً على تبرير صحيح (يمنع إعادة الإرسال المشروعة بعد flip-flop). حالياً §8 يذكر هذا، لكن §3.1 نفسها لا تزال تقترح الـ migration. أضف في §3.1 بند "القرار النهائي (بعد التنفيذ): رُفض القيد الفريد الدائم — تم اعتماد `isDuplicateNotification` بنافذة زمنية فقط. السبب: القيد الدائم يمنع إعادة الإرسال المشروعة بعد النافذة (مثال: CONFIRMED→CANCELLED→CONFIRMED بعد >10ث). لا migration مطلوبة."

### 2ج — §5.1: وثّق ما تمّ وما تأجّل بدقة
الـ agent نفّذ جزئياً: استخرج `DEFAULT_TEMPLATES`→`templates/defaultTemplates.js`، الموازنة→`sessionBalancer.js`، `formatPhoneNumber`→`utils/phoneFormat.js`، الأنواع→`notificationTypes.js`. الملف نزل من 4206→3227 سطر. **المتأجّل**: استخراج الـ senders/queue logic، وi18n للرسائل. حدّث §5.1 لتقول بالظبط إيه اللي اتّم وإيه اللي لسه متأجّل (مع سبب: circular deps / ميزة منتج).

**معايير النجاح للمهمة 2**: الوثيقة تطابق التنفيذ الفعلي في كل قسم تم. مفيش كود مقترح يخالف الكود الموجود.

---

## المهمة 3 (أقل أولوية): تحقق سلوكي سريع + تقرير

بدون ما تعدّل كود شغّال، تحقّق من النقاط التالية ووثّق النتائج في تقرير النهاية:

1. **`scheduleNotification` (§4.1 الجزء أ)**: أكّد إنها **لا ترجع** `{success: false, reason: 'no_session'}` عند غياب الجلسة وقت الجدولة — لازم تكمّل وتصفّف `sessionId=''` وتأجّل الحل للمعالجة. راجع `WhatsAppNotificationService.js` حوالي السطر 1489-1495. لو بتطلع `no_session` قبل الطابور، سجّلها كـ bug.
2. **`processNotificationQueue`**: أكّد إن الإرسال الفعلي بيستخدم `sendNotification({...})` (اللي فيه META_CLOUD + DB fallback) وليس `WhatsAppMessageHandler.sendText` مباشر (التنبيه الأمني في §1.1). لو لسه `sendText` مباشر، سجّله.
3. **التداخل (re-entrancy)**: أكّد وجود guard `processingQueue` (أو مماثل) داخل `processNotificationQueue` يمنع جولتين متداخلتين.

---

## تقرير النهاية (إجباري)
في آخر شغلك، اكتب تقرير مختصر يحوي:
- قائمة الملفات اللي أنشأتها/عدّلتها (مع المسارات).
- نتائج `npx jest` (عدد tests passed/failed لكل ملف).
- نتائج المهمة 3 (التحقق السلوكي) — لكل نقطة: OK / bug مع `file:line`.
- أي bugs اكتشفتها (خارج نطاق المهام) — مع `file:line` ووصف، **بدون إصلاح**.
- أي قرار تصميمي اضطررت له.

**ابدأ بقراءة `apps/backend/docs/notifications/whatsapp-order-notifications-fix-plan-2026-08-03.md` §0 و§8، ثم نفّذ المهمة 1 أولاً.**

## ===== END — انسخ إلى هنا =====
