# Runbook — ترحيل أوردرات الاستبدال (Task 69cc5d36)

دليل تشغيل وترحيل أوردرات الاستبدال (البدائل) لطابور التجهيز: تحويل حالة الأوردرات البديلة من `EXCHANGED` إلى `PENDING_PREPARATION` وكتابة صفوف التدقيق المناسبة في `OrderStatusHistory`.

---

## 1. قاعدة الترتيب الإلزامية

> [!IMPORTANT]
> **الترحيل يجب أن يتم قبل أي نشر للكود الجديد:**
> كوميت `72a7270ce` أزال الاستثناء المؤقت `exchangeExceptionSql` من كود `preparationQueueService.js`. أي نشر للكود على السيرفر قبل تطبيق الترحيل سيؤدي لاختفاء أوردرات الاستبدال الأربعة من طابور التجهيز لأن حالتها في قاعدة البيانات ما زالت `EXCHANGED` (وهي حالة نهائية بالنسبة للتجهيز). لذلك:
> 1. تنفيذ الترحيل أولاً (Dry-run ثم Apply).
> 2. التحقق من ظهور الأوردرات في الطابور.
> 3. نشر الكود والفرونت إند.

---

## 2. استعلام Preflight & Postflight المرجعي

يُستخدم هذا الاستعلام للتحقق قبل وبعد تطبيق الترحيل:

```sql
SELECT o."orderNumber",
       o."status",
       o."metadata"::jsonb->>'preparationStatus' AS prep
FROM "orders" o
JOIN "companies" c ON c."id" = o."companyId"
WHERE c."slug" = 'swan'
  AND (
    o."metadata"::jsonb->>'requestType' = 'exchange'
    OR o."metadata"::jsonb->>'originalOrderId' IS NOT NULL
  )
ORDER BY o."orderNumber";
```

### الأوردرات الأربعة المستهدفة في سوان
1. `ORD-071276-456`
2. `ORD-097894-409`
3. `ORD-311121-315`
4. `ORD-773160-158`

---

## 3. خطوات التشغيل (Runbook Steps)

### أ) قبل النشر (Pre-deployment Audit)
1. فحص عدد أوردرات `WAITING` في طابور التجهيز لسوان:
   ```sql
   SELECT count(*)
   FROM "orders" o
   JOIN "companies" c ON c."id" = o."companyId"
   WHERE c."slug" = 'swan'
     AND o."status"::text = 'PENDING_PREPARATION'
     AND (o."metadata"::jsonb->>'preparationStatus' IS NULL OR o."metadata"::jsonb->>'preparationStatus' = '');
   ```
2. فحص حالة الأوردرات الأربعة المستهدفة والتأكد من أنها مسجلة كبدائل (`requestType='exchange'` أو `originalOrderId IS NOT NULL`).

### ب) تجربة المحاكاة (DRY_RUN = true)
تشغيل السكربت في وضع المحاكاة للتأكد من التقاط الأوردرات الأربعة بالضبط بدون أي تعديل على قاعدة البيانات:
```bash
COMPANY_SLUG=swan DRY_RUN=true node scripts/one-off/migrate-exchange-replacements-69cc5d36.js
```
- التحقق من طباعة أرقام الأوردرات الأربعة في اللوج.
- التأكد من سطر الدليل:
  `{"company":"swan","dry_run":true,"selected":4,"migrated":0,"audit_rows":0,"remaining_exchanged_replacements":4}`

### ج) التطبيق الفعلي (DRY_RUN = false)
تشغيل السكربت في وضع التطبيق:
```bash
COMPANY_SLUG=swan DRY_RUN=false node scripts/one-off/migrate-exchange-replacements-69cc5d36.js
```
- السكربت يفتح `prisma.$transaction` واحد.
- إدراج 4 صفوف في جدول `"OrderStatusHistory"` بـ `changedBy='hermes-migration:task-69cc5d36'`.
- تحديث حالة الـ 4 أوردرات: `status='PENDING_PREPARATION'` مع شرط أمان إضافي `status::text='EXCHANGED'`.
- سطر الدليل بعد النجاح:
  `{"company":"swan","dry_run":false,"selected":4,"migrated":4,"audit_rows":4,"remaining_exchanged_replacements":0}`

### د) بعد النشر والترحيل (Post-deployment Verification)
1. التأكد من أن الـ 4 أوردرات حالتها الآن `PENDING_PREPARATION` ومفتاح `preparationStatus` داخل الـ metadata ما زال NULL/فارغًا لتبدأ دورة التجهيز العادية من مرحلة `WAITING`.
2. التأكد من أن عدد الأوردرات البديلة التي حالتها `EXCHANGED` أصبح **0**.
3. التأكد من أن الأوردرات الأصلية لكل استبدال ما زالت محتفظة بحالتها `EXCHANGED` وعدد ظهورها في طابور التجهيز = **0**.
4. التأكد من أن طلب `GET /api/orders/preparation?workType=exchange` يُرجع `filteredTotal=4` ويحتوي الأرقام الأربعة.
5. التحقق من ثبات إجمالي طابور `WAITING` (زيادة بمقدار 4 إن لم تكن مضافة مسبقًا).

---

## 4. خطة التراجع (Rollback Plan)

إذا دعت الحاجة للتراجع بعد التطبيق:
> [!CAUTION]
> **ممنوع حذف أي صفوف من `OrderStatusHistory` أو `orders`.**

يتم التراجع عبر عكس الحالة للأوردرات الأربعة فقط باستخدام `id` وتسجيل صف تدقيق جديد:
```sql
BEGIN;

INSERT INTO "OrderStatusHistory"
  ("id", "orderId", "status", "oldStatus", "changedBy", "userName", "reason", "createdAt")
SELECT 'migr_rb_' || replace(gen_random_uuid()::text, '-', ''),
       o."id",
       'EXCHANGED',
       'PENDING_PREPARATION',
       'hermes-rollback:task-69cc5d36',
       'Hermes (automated rollback)',
       'تراجع عن ترحيل 69cc5d36 وإعادة البديل إلى EXCHANGED',
       now()
FROM "orders" o
JOIN "companies" c ON c."id" = o."companyId"
WHERE c."slug" = 'swan'
  AND o."orderNumber" IN ('ORD-071276-456', 'ORD-097894-409', 'ORD-311121-315', 'ORD-773160-158')
  AND o."status"::text = 'PENDING_PREPARATION';

UPDATE "orders" o
SET "status" = 'EXCHANGED',
    "updatedAt" = now()
FROM "companies" c
WHERE c."id" = o."companyId"
  AND c."slug" = 'swan'
  AND o."orderNumber" IN ('ORD-071276-456', 'ORD-097894-409', 'ORD-311121-315', 'ORD-773160-158')
  AND o."status"::text = 'PENDING_PREPARATION';

COMMIT;
```
