# 🚨 URGENT — تراجع عن قبول عرض بالخطأ على أوردر حقيقي + إصلاحان وقائيان
> **من:** Mokhtar (عبر Swan Ads / opencode) — 2026-10-09 مساءً (~18:25–18:40)
> **الأولوية:** 🚨 عاجل — قبل أي تأكيد/شحن للطلب (الطلب لسه PENDING)
> **الحالة:** RESOLVED ✅ (تم التراجع 1:1 وتطبيق الإصلاحين الوقائيين واجتياز كافة فحوصات القبول)

## الخلاصة في سطر
أثناء اختبار حي لصفحة العرض (المنتقي الجديد)، ضغطة على زر القبول النهائي أضافت قطعة عرض فعليًا لطلب حقيقي في حالة PENDING.

## التفاصيل الدقيقة (تم التحقق منها من الـAPI الحي)
- **الطلب:** `ORD-501139-413` — guestOrder id: `cmv0ltajd004hjuv4gx449035` (الطلب الأصلي: "كوتشي Dash" ×1 @620 — الإجمالي الأصلي 690)
- **القطعة المضافة بالخطأ:** `Swan Aura - أبيض × نبيتي - 41` @399 × 1 (`isPostPurchaseOffer: true`)
- **الوقت:** ~15:25Z اليوم
- **الأثر الحالي (موثّق):**
  1. `guestOrder.items`: +عنصر العرض
  2. `guestOrder.total` / `finalTotal`: +399 (بقيمة 1,089)
  3. `guestOrder.metadata`: `postPurchaseOfferAccepted=true` + كائن `postPurchaseOffer`
  4. مخزون الفاريانت `...uj8vvx` ("أبيض × نبيتي - 41"): 991 → 990
- **اللي ما اتأثرش:** الأوردر الرئيسي (جدول orders) — لسه 690/عنصر واحد (`updatedAt` قديم)؛ **المزامنة في accept handler لم تعمل**. لا تأكيد ولا شحن اتنفذ.

## المطلوب

### 1) التراجع العاجل (الأهم) — أعِد الحالة الأصلية 1:1
- **`guestOrder` `cmv0ltajd004hjuv4gx449035`:**
  - `items`: احذف العنصر الذي به `isPostPurchaseOffer: true` / `addedPostPurchase: true` — سيب "كوتشي Dash" كما هو
  - `total = 690` — `finalTotal = 690`
  - `metadata`: احذف مفتاحي `postPurchaseOfferAccepted` و `postPurchaseOffer` — سيب الباقي (`attribution` / `sessionDetails` / `guestOrderId`)
- **المخزون:** `productVariant` id ينتهي بـ `uj8vvx` → أرجِع `stock` من 990 إلى **991**
- **فحص دفاعي:** لو اتكون صف `orderItem` يتيم في الجدول الرئيسي (`isPostPurchaseOffer`) لنفس الطلب — احذفه

### 2) التحقق بعد التراجع (Acceptance)
- `GET /api/public/orders/ORD-501139-413/track` مع فون المطابقة → `itemsCount=1` و `metaFlag=false`
- `GET /api/public/post-purchase-offer` → مخزون `uj8vvx` = **991**
- `guestOrder.total` / `finalTotal` = 690

### 3) إصلاحان وقائيان (كانا هيمنعوا الحادثة من أساسها)
- **a) حماية زمنية في `/api/v1/public/orders/:id/accept-offer`:** ارفض القبول لو `order.createdAt` أقدم من 6 ساعات →
  `{ success: false, message: 'انتهت صلاحية العرض لهذا الطلب' }`
  (العرض بطبيعته لحظي بعد الشراء بتايمر 5 دقائق — الحماية تمنع أي فتح يدوي للرابط على أوردر قديم من الكتابة)
- **b) إصلاح مزامنة الأوردر الرئيسي:** في نفس المعالج — البحث الحالي `findFirst({ orderNumber, companyId })` لم يجد/لم يحدّث الأوردر الرئيسي **بصمت** (try/catch يبتلع الخطأ بلا أثر). استخدم نفس نمط `/track`:
  `OR: [{ id: orderNumber }, { orderNumber }]` + سجّل الأخطاء بوضوح بدل الابتلاع، وراجع وضع تحديث الاثنين في transaction واحد.

## ملاحظة
الفيتشر نفسه شغال صح (متُحقق منه لايف) ولا يحتاج تغييرات غير بند 1 (التراجع) وبند 3 (الوقائيان).
