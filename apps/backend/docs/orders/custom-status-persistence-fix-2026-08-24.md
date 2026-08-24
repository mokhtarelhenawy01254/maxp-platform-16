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
