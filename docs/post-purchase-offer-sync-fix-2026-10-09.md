# 🎯 TASK — قبول العرض لا يظهر في "تفاصيل الطلب" (فشل مزامنة الإدارة) — فيكس دقيق
> **من:** Mokhtar (عبر Swan Ads / opencode) — 2026-10-09 ليلًا
> **الأولوية:** عالية — الكونفيرميشن/الشحن لازم يشوفوا قطعة العرض في تفاصيل الطلب
> **الحالة:** RESOLVED ✅ — تم إزالة الحقول غير الموجودة وتحديث total و subtotal وإضافة orderItem بنجاح

## المشكلة
عند قبول العميلة للعرض بعد الشراء: يتم تحديث `GuestOrder` بنجاح (القطعة + العلامة + الإجماليات)، لكن **سجل الإدارة لا يتحدث أبدًا** — لا تظهر قطعة العرض في "تفاصيل الطلب" ولا تتغير الإجماليات.

## السبب الجذري (مؤكد من السكيما + إعادة إنتاج حية ×3)
في معالج `accept-offer` (`apps/backend/routes/publicOrdersRoutes.js` ~س3906) — بلوك المزامنة:
```js
await prisma.order.update({
  where: { id: primaryOrder.id },
  data: {
    total: nextTotal,
    finalTotal: nextFinalTotal,          // ❌ غير موجود في موديل Order
    items: JSON.stringify(existingItems) // ❌ غير موجود في موديل Order
  }
});
```
- موديل **`Order`** (`prisma/schema/orders.prisma` س295+) **لا يحتوي** على `finalTotal` ولا `items` — الاتنين موجودين في `GuestOrder` فقط (س110/س114).
- Prisma يرمي `Unknown argument` → يُلتقط في `catch (orderSyncErr)` → console.error فقط → **لا `order.update` ولا `orderItem.create`** → الإدارة لا ترى شيئًا.
- ملاحظة: الفيكس السابق (6962de61c) صلّح الـlookup فقط؛ العلة الحقيقية في الـupdate نفسه — وده اللي كان بيفشل من أول نسخة.

**إعادة إنتاج مؤكدة اليوم ×3** (`ORD-331490-717` + `ORD-251748-226` + `ORD-511828-979`):
- Guest side: قطعتين ✓ (`Swan Aura` ظاهرة + العلامة)
- Admin side: `orderItems` ثابت عند قطعة واحدة + الإجمالي لا يتغير ✗

## الفيكس المطلوب (سطرين)
```diff
 await prisma.order.update({
   where: { id: primaryOrder.id },
   data: {
-    total: nextTotal,
-    finalTotal: nextFinalTotal,
-    items: JSON.stringify(existingItems)
+    total: nextTotal
   }
 });
```
- العناصر مصدرها `orderItem` rows — والـ`create` اللي بعده سليم ومكتمل (كله حقول موجودة في `OrderItem`) — وهو اللي بيغذي "تفاصيل الطلب".
- راجع أي استخدام مشابه لـ`items`/`finalTotal` مع `prisma.order.update` خارج الـaccept (لو موجود).

## التحقق بعد الفيكس (Acceptance)
1. POST accept على أوردر اختباري → `GET /api/orders/:id` → `orderItems` = قطعتين + `total` زاد 399.
2. افتح "تفاصيل الطلب" في اللوحة → قطعة العرض ظاهرة (الاسم/المقاس/السعر).
3. سجّل الإصلاح في `apps/backend/docs/storefront/bugs.md`.

## ملاحظات
- أوردر `ORD-331490-717` اتنقل `TRASH` (تنظيف) — لو رجعوه ممكن نعمل مزامنة يدوية له؛ الأهم الفيكس للمستقبل.
- ⚠️ **مؤثر تشغيليًا:** لحد الفيكس، لو عميلة قبلت العرض هتكون القطعة في سجل الستور فقط — الكونفيرميشن ممكن مايشوفوهاش في تفاصيل الطلب. خلّصوا الفيكس سريعًا + بلّغوني للاختبار.
