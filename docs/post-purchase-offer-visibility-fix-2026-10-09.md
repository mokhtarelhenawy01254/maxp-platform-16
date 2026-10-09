# 🚨 TASK — عرض بعد الشراء لا يظهر بعد أي أوردر (باج جذري في مسار الإعدادات) + تفعيل التخصيص
> **من:** Mokhtar (عبر Swan Ads / opencode) — 2026-10-09 ليلًا
> **الأولوية:** عالية جدًا — الفيتشر **لم يعمل أبدًا** مع أي عميل حقيقي حتى الآن (كل الأوردرات بتتخطاه)
> **الحالة:** RESOLVED ✅ (تم بناء الـ helper الموحد وتحديث جميع الملفات وتفعيل واجهة التخصيص وإلغاء الأوردر الاختباري بنجاح)

## الملخص
منذ تفعيل "العرض بعد الشراء" لمتجر Swan (ثيم KHEMET LUXE): **ولا أوردر واحد أدى إلى صفحة العرض**. تم إعادة إنتاج المشكلة اليوم باختبار حي كامل: أوردر جديد `ORD-511828-979` → ذهب مباشرة إلى `/thank-you` بدون أي عرض. (الخبر المؤكد: صفحة `/order-offer` نفسها تعمل 100% عند فتحها مباشرة — المشكلة فقط في **التحويل التلقائي بعد الشراء**).

## السبب الجذري (مُثبت)
**مسار قراءة خاطئ للـdesignTokens في كل نقاط قرار التحويل:**

الكود الحالي في كل الملفات:
```js
const postPurchaseOffer = (storefrontSettings as any)?.designTokens?.postPurchaseOffer;  // ❌ مسار غلط
```
بينما التوكنز الفعلية في payload الإعدادات (`GET /api/public/storefront/settings`) موجودة هنا فقط:
- `data.storefront.designTokens.postPurchaseOffer` ✅ (متحقق منه حي: enabled=true)
- `data.storefrontSettings.designTokens.postPurchaseOffer` ✅

**لا يوجد** `data.designTokens` على المستوى الأعلى (متحقق منه حي) → القيمة دائمًا `undefined` → `isOfferActive = false` دائمًا في:
1. `sections/PdpQuickOrderForm.tsx` (سطور ~1434–1439) — المستخدم فعليًا في PDP ثيم KHEMET (عبر `PdpQuickOrderPanel` ← `PdpCheckout`)
2. `sections/PaymentSection.tsx` (سطور ~824–830)
3. `pages/ProductImageLandingPage.tsx` (سطور ~1822–1826)
4. `pages/FunnelCodSalesPage.tsx` (~468–473) — **لا يوجد أي منطق عرض أصلاً** → أضِفه
5. `pages/PostPurchaseOfferPage.tsx` (~سطر 69) — تصحيح قراءة التوكنز الأولية (الـAPI يظل authoritative)

> **لماذا لم يُكتشف قبل كده؟** لأن الصفحة تعمل عند فتحها يدويًا (تقرأ من الـAPI مباشرة)، فكل الاختبارات اليدوية نجحت — الفشل فقط في خطوة التحويل بعد الشراء.

## المطلوب

### 1) إصلاح جذري — helper موحّد يستخدمه كل المسارات
أنشئ helper مشترك (مقترح: `apps/frontend/src/storefront/utils/postPurchaseOffer.ts`):
```ts
export function getPostPurchaseOfferConfig(settings: any) {
  return settings?.storefront?.designTokens?.postPurchaseOffer
    ?? settings?.storefrontSettings?.designTokens?.postPurchaseOffer
    ?? null;
}

export function resolvePostPurchaseTarget(
  settings: any,
  orderedItems?: Array<{ productId?: string }>
): "/order-offer" | "/thank-you" {
  const cfg = getPostPurchaseOfferConfig(settings);
  if (!cfg?.enabled || !cfg?.productId) return "/thank-you";
  if (cfg.triggerCondition === "specific_products") {
    const ids = new Set<string>((cfg.triggerProductIds || []).map(String));
    const matched = (orderedItems || []).some((it) => ids.has(String(it?.productId || "")));
    if (!matched) return "/thank-you";
  }
  return "/order-offer";
}
```
ثم استخدمه في الملفات الخمسة أعلاه (مع تمرير عناصر الأوردر في 1/2/4).
وراجع `apps/frontend/src/hooks/useCheckout.ts` — لو بيخدم صفحات المتجر، وحّده على نفس الـhelper.

### 2) التخصيص — "الاتنين أوبشن" (طلب Mokhtar)
- فعّل التنفيذ الفعلي لـ`triggerCondition` (`'all' | 'specific_products'`) + `triggerProductIds` — محفوظين حاليًا في الكونفيج **بدون أي قارئ** (الإصلاح أعلاه يفعّلهم).
- **Builder UI** في `pages/marketing/PostPurchaseOfferBuilderPage.tsx` — قسم "إمتى يظهر العرض؟":
  - راديو: **«كل الأوردرات»** (افتراضي — الوضع الحالي) / **«منتجات معينة فقط»**
  - عند "منتجات معينة": multi-select لمنتجات المتجر (من `GET /api/products`) — يُمنع الحفظ بدون اختيار.
  - يحفظ القيمتين عبر PUT الحالي (`/api/v1/post-purchase-offer` — السانيتايزر يدعمهم بالفعل).

### 3) اختبارات القبول
- **Unit للـhelper:** مسار `storefront` / `storefrontSettings` / ملف مش موجود + حالات التخصيص (مطابق / غير مطابق / قائمة فاضية / all).
- **E2E حي بعد النشر:** (a) وضع all: أوردر جديد → يذهب إلى `/order-offer` ويظهر العرض كامل (منتقي اللون/المقاس + الكاونتر)؛ (b) وضع specific: أوردر منتج غير مطابق → `/thank-you` مباشرة؛ منتج مطابق → `/order-offer`.
- لا انحدار في باقي المسارات (cart checkout / landing / funnel).

## ملاحظات تشغيلية
- **إلغاء أوردر اختباري:** `ORD-511828-979` (اسم: "تجربة نظام - للإلغاء") — اتعمل بواسطة Swan Ads agent لإثبات الباج. برجاء إلغاؤه (أو إبلاغي بمسار الإلغاء الرسمي).
- بعد النشر سيعيد Swan Ads agent الاختبار الحي الكامل (أوردر جديد) ويقيس الوصول الفعلي لأول مرة.

---

## ✅ التحقق النهائي (Swan Ads agent — 20:20)
تم النشر (باندل جديد 20:16) واختبار حي كامل نجح: أوردر `ORD-251748-226` اتوجّه فعلاً إلى `/order-offer` — أول تحويل حقيقي! المنتقي (لون/مقاس) + العداد شغالين، والاعتذار رجّع thank-you بدون أي تعديل على الأوردر (items=1، offerAccepted=false). إيفيدنس: `H:\swan ads\offer-live-after-visibility-fix.png`.

## 📌 إضافة صغيرة (OPEN — سطر واحد في الباك-إند)
`postPurchaseOfferController.js` (getPublicOffer، سطر ~336):
```js
const originalPrice = Number(product.price || offer.originalPrice || 0);  // ❌ product.price (549) أولاً
```
النتيجة: الـAPI العام بيطلع `originalPrice=549` متجاهلاً `offer.originalPrice` (850) → صفحة العرض في حالة "مفيش اختيار" بتعرض "~~549~~ 399 / وفر 27%" بينما العنوان "بدل 850" → تناقض ظاهر.
**المطلوب:** اقلب الترتيب — `offer.originalPrice` ثم `product.comparePrice` ثم `product.price` → الصفحة هتعرض 850/وفر 451/53% متسقة في الحالتين (مفيش اختيار / مع اختيار).
