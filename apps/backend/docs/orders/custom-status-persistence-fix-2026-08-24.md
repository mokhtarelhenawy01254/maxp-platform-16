# إصلاح تخزين الحالات المخصصة — 2026-08-24

## المشكلة

كود الحالة المخصصة (مثل `DELAYED-WITH-CAPTAIN`) ماكانش بيتخزن أبدًا على الطلب: عمود
`Order.status` enum مقفول، فالتحديث كان بيتحوّل لقيمة `mapsToSystem` والكود المخصص
بيضيع (بيفضل موجود بس في `OrderStatusHistory.status`). النتائج:

- **العرض:** بعد تطبيق الحالة المخصصة، الليست والتفاصيل بترجع الحالة النظامية الماب
  عليها — الحالة المخصصة "بتختفي" كأنها متطبقتش.
- **التحديث الصامت (no-op):** تطبيق حالة مخصصة على طلب قاعد بالفعل في قيمة الـ
  mapping كان بيرجع مبكرًا — لا تحديث ولا تاريخ ولا إشعار واتساب ولا خطأ.
- **الفلتر:** الفلترة بحالة مخصصة بترجع 0 نتائج دايمًا.
- **الإحصائيات:** كل نقاط العد كانت groupBy على الـ enum بس — الحالات المخصصة
  مستحيلة تظهر ("مش صورة حقيقية").
- **إشعارات حالات التجهيز:** مسارَي التحديث الفردي والـ bulk في `routes/orders.js`
  كانوا بيتخطوا إشعار الواتساب نهائيًا.

## الإصلاح

1. **العمود الجديد** `Order.customStatusCode String?` + index `[companyId,
   customStatusCode]` (deploy بيشغّل `db push` تلقائيًا).
2. **`services/orderService.js updateOrderStatus`:**
   - يخزّن الكود المخصص جنب الـ enum ويمسحه لما التاجر يرجّع لحالة نظامية مباشرة.
   - الـ no-op بقى يقارن "الحالة الفعلية" (customStatusCode لو موجود) — تغيير الحالة
     المخصصة بيكتب تاريخ ويشغّل الإشعار حتى لو الـ enum متغيرش.
   - إعادة حلّ بعد workflow override (كان ممكن كود مخصص يوصل لـ prisma.update فيكسر
     الـ enum).
3. **المصدر الموحّد** `utils/orderEffectiveStatus.js`: تعبير SQL + نسخة JS لأولوية
   الحالة الفعلية (كود مخصص ← تجهيز محوّلة ← enum) — بيستخدمه فلتر الليست وكل نقاط
   الإحصائيات: `orderStatusController.getStatusStats`، `simpleOrderService`،
   `enhancedOrderService`، `companyDashboardController`.
4. **مسارات التجهيز** (فردي + bulk، عادي + ضيف) بتمسح الكود المخصص وتبعت الإشعار
   عبر `preparationQueueService.notifyPreparationStageChange` (كان بيتخطى).
5. **دمج الفلاتر:** فروع الحالة بتتدمج كـ AND group مستقلة — البحث كان بيمسح فلاتر
   الحالة (`Object.assign` على OR)، والفلتر المخصص كان بيتدمج بـ OR بدل AND، والعدّاد
   كان بيتجاهل باقي الفلاتر.
6. **توحيد التحقق** في `PATCH /:orderNumber/status`: enum + `orderStatusConfig`
   النشطة (كان `orderStatusDefinition` — جدول الـ workflow)؛ و`PENDING_CANCELLATION`
   اتضافت لقائمة `VALID_ORDER_STATUSES`.
7. **الواجهة:** أسماء الحالات المخصصة العربية في بادج الليست (`Orders.tsx`) وتفاصيل
   الطلب (`OrderHeader.tsx`) وسجل النشاط (`OrderActivityLog.tsx` عبر `statusNameMap`).

## سكريبت الـ Backfill (بعد الـ deploy)

```bash
cd /var/www/backend2 && NODE_ENV=production node scripts/backfill-order-custom-status-codes.js
```

بيرجّع آخر كود مخصص لكل طلب من `statusHistory` بشرطين محافظين: (1) آخر سجل كوده حالة
مخصصة نشطة عند شركة الطلب، (2) `order.status` لسه واقف على قيمة الـ `mapsToSystem`.
Idempotent — بيمسك `customStatusCode IS NULL` بس.

## الاختبارات

- `tests/services/orderService.customStatus.test.js` — 6 حالات جديدة (تخزين الكود،
  مسحه، الـ no-op بفروعه، استبدال المخصص بالنظامي).
- `tests/utils/orderEffectiveStatus.test.js` — 8 حالات للأولوية والـ mapping والعدّ.

## ملاحظات

- الواتساب المتقدم لسه (مرحلة تالية): ربط الحالات المخصصة بقالب Meta approved
  لشركات META_CLOUD، توسيع lookup لكل statusTypes، dedup collision.
- `analyticsController` لسه بيرفض الحالات المخصصة في التقارير التحليلية.

## جولة التحصين 2026-08-25 (بعد بلاغ لايف: "بغيّر الحالة من التفاصيل ومش بتتغير")

- **stale-prep-hijack (سبب البلاغ)**: `PREPARATION_PIPELINE_STATUSES` كان شايل
  PENDING/CONFIRMED/SCHEDULED/PROCESSING فتغيير الحالة ليهم من التفاصيل كان بيكتبها
  في `metadata.preparationStatus` والعرض بيرجمها PROCESSING للأبد. الإصلاح:
  `PREP_METADATA_STATUSES` (المراحل الحقيقية بس) للكتابة، والحالات النظامية تمسح
  أي مرحلة قديمة. نُظّفت 30 طلبًا ملوثًا في الإنتاج (منهم ORD-225303-802) —
  1,109 طلب بمراحل سليمة لم تُمس.
- **الكُتّاب المباشرون الأربعة** كانوا هيسیبون كودًا مخصصًا ميتًا معلقًا بعد تغيير
  الحالة: fallback تربو، سينك ووكومرس، ومسارا الـ workflow (validateStatusChange
  + handleApproval) — كلهم دلوقتي يمسحون/يحلّون الكود المخصص صح.
- **workflow handleApproval**: `findUnique({id, companyId})` غير صالح (تركيبة غير
  unique) → كل الموافقات كانت بتفشل 500. اتحوّل findFirst.
- **فلتر الحالات النهائية**: كود مخصص محفوظ صراحةً من التاجر بقى يعدي من حاجز
  الحالات النهائية (WITH_THE_CAPTAIN→SHIPPED كانت بتختفي من الفلتر).
- `requestedIsCustom` بيتعاد حسابه بعد override الـ workflow.
- اختبارات: preparationSync اتحدثت للسلوك الجديد + حالة انحدار للبلاغ اللايف.

## جولة 2026-08-25 (مساءً): دروبداونات + مابينج تربو

- **الحالات المحذوفة في الدروبداونات**: الدمج مع قوائم hardcoded كان بيرجّع حالات
  حذفها التاجر (+ حالات تربو وهمية في صفحة التفاصيل). رد `/order-status` بقى مصدر
  الحقيقة، والقوائم الافتراضية rescue فقط عند الرد الفاضي (Orders.tsx +
  useOrderDetails + إصلاح mojibake في EnhancedOrderModal).
- **مابينج تربو يتجاهل الحالة المخصصة**: بوابة `statusChanged` في turbo sync كانت
  بتقارن الـ enum فقط — طلب واقف في SHIPPED ومابينج تربو لحالة مخصصة ماب عليها
  (WITH_THE_CAPTAIN) كان بيتخطى بالكامل. البوابة بقت تقيس "الحالة الفعلية"
  (الكود المخصص)، وبعد نجاح المسار الموحد بنشيل status من الـ payload المباشر
  (كان بيمسح الكود المخصص اللي لسه اتكتب — تراجع من جولة الأمس اتسدد).

## المرحلة 3 — الواتساب المتقدم (2026-08-25 ليلًا)

- **توسيع lookup الحالات المخصصة** في `sendOrderStatusNotification` لكل الأنواع
  (order/shipping/preparation/payment) — حالات preparation/payment كانت بتقع في
  fallback مفعّل قسرًا (متجاهل notifyCustomer وبدون الاسم العربي في {{status}}).
- **rawEventType String?** على `WhatsAppNotificationLog`: هوية الحالة الأصلية —
  الـ dedup بقى على الكود المخصص نفسه (حالتان على نفس mapsToSystem خلال 10 ثوانٍ
  كانت الثانية بتتبلع)، والتقارير تقدر تنسب الإرسال للحالة الصح.
- **meta-fallback لـ META_CLOUD**: لو قالب الحالة المخصصة لسه غير معتمد عند ميتا،
  بنرجّع لقالب الحالة النظامية الماب عليها (المعتمد غالبًا، والأقرب دلاليًا) بدل
  النص الحر اللي بيفشل 131047 خارج نافذة الـ 24 ساعة (فشل صامت).
- **زر التجربة** اتفعّل في صفحة قوالب حالات الطلبات (`enableTestSender`) — التاجر
  يجرّب قالب أي حالة برقم موبايل قبل الاعتماد عليه.
- درس: تعليقات `///` العربية متعددة الأسطر في prisma بتكسر `prisma generate`
  بخطأ فاضي على Windows — سطر واحد إنجليزي بس.
