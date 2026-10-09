# 🐛 TASK — إصلاح كراش "العرض بعد الطلب" (Post-Purchase Offer) — public API
> **مُرسَل من:** Mokhtar (عبر Swan Ads / opencode agent) — 2026-10-09
> **الأولوية:** عالية (الفيتشر جاهز ومتحجوز عليه — بيمنع تفعيل أداة إيرادات جديدة لستور Swan)
> **الحالة:** OPEN — فيكس جاهز ومحدد بالأسطر، محتاج تنفيذ + نشر + تأكيد

---

## 1. الأعراض (Symptom)
عند تفعيل "العرض بعد الشراء" في متجر Swan (`swan.maxp.online`) واختيار منتج عرض (Swan Aura):

```
GET https://swan.maxp.online/api/public/post-purchase-offer
→ HTTP 500
{
  "success": false,
  "message": "Invalid `prisma.product.findFirst()` invocation: ... `imageUrl` ..."
}
```

نفس السلوك متوقع في الـ admin endpoint:
```
GET https://maxp.online/api/v1/post-purchase-offer
```

## 2. السبب الجذري (Root Cause)
`apps/backend/controller/postPurchaseOfferController.js` بيعمل `select` على حقل **`imageUrl`** — والحقل ده **غير موجود في موديل Product** (السكيما فيها `mainImage` + `images` فقط).

- السطر **80**: `imageUrl: true,` (داخل public offer enrichment)
- السطر **103**: `const img = product.imageUrl || ...`
- السطر **242**: `imageUrl: true,` (داخل admin offer enrichment)
- السطر **277**: `productImage: product.imageUrl || ...`

**ليه ظهر دلوقتي؟** الفيتشر عمره ما اتشغل قبل كده بمنتج مختار — الكود بيكسر أول ما `offer.productId` يبقى موجود (شرط الـ enrichment).

## 3. الإصلاح المطلوب (Fix)
استبدال `imageUrl` بـ`mainImage` في المواضع الأربعة:

```diff
- imageUrl: true,
+ mainImage: true,
```
```diff
- const img = product.imageUrl || (Array.isArray(product.images) && product.images[0]) || '';
+ const img = product.mainImage || (Array.isArray(product.images) && product.images[0]) || '';
```
(نفس التعديل في الـ admin copy عند السطور 242 / 277)

**ملاحظة للتحقق من السكيما:** `apps/backend/prisma/schema/products.prisma` — Product عنده `images String?` و`mainImage String?` — مفيش `imageUrl`.

## 4. اختبارات القبول (Acceptance Tests)
1. `GET /api/v1/public/post-purchase-offer` لمتجر Swan → **200** مع `data.enabled` + `data.product` + `data.product.variants` (فيها variants بمقاسات).
2. صفحة المتجر `/order-offer?orderId=...` بتفتح بالمقاسات (Variant Picker) + العداد — بدون أخطاء كونسول.
3. `/settings/post-purchase-offer` (admin builder) بيحمّل الإعدادات المحفوظة بدون 500.
4. قبول العرض من صفحة المتجر → الأوردر يتحدث بالقطعة **بالمقاس/اللون المختار** + الإجمالي يعاد حسابه.
5. تأكد إن مفيش أي متجر تاني بيتأثر (change isolation).

## 5. سياق تشغيلي مهم (مهم للـ handoff)
- إعدادات العرض لمتجر Swan **محفوظة بالفعل** (Swan Aura بـ399، وفر 150، شحن مجاني، عداد 5 دقايق، النصوص العربية كاملة) — **لكن متوقفة مؤقتاً `enabled: false`** كنوع من الحماية لحين الإصلاح.
- **بعد النشر:** مطلوب تفعيلها بـ`enabled: true` (من الـbuilder أو PUT `api/v1/post-purchase-offer`) — **من غير** إعادة إعداد.
- متجر Swan فقط هو المستخدم للفيتشر حالياً.

## 6. المرجع الأصلي للاكتشاف
- فحص من كود الريبو (opencode session) بتاريخ 2026-10-09.
- الـ payload المحفوظ وكل القيم موثقة في `H:\swan ads\post-purchase-offer-design.md` (خارج الريبو — مرجع Mokhtar).

---
*طلب مباشر من Mokhtar — يُنفذ مع اختبارات القبول أعلاه، ثم يُسجَّل الإصلاح في `apps/backend/docs/storefront/bugs.md`.*
