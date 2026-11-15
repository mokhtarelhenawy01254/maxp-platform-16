# تقرير إنجاز مهمة SHIP-GOV — تطبيع المحافظة وإصلاح الشحن = 0 وحفظ المحافظة من shippingAddress

- **معرف المهمة:** SHIP-GOV
- **التاريخ:** 2026-11-06
- **المستودع:** `C:\maxp-platform-13` (main)
- **الكوميتات المعتمدة للمهمة:**
  - `1c4de5362` (`fix(shipping): normalize governorate from shippingAddress and add pre-confirmation shippingLine`)
  - `be46c56b3` (`fix(storefront): expose resolvedGovernorate to render shipping cost line in pdp quick order`)
- **حالة النشر والـ CI:**
  - GitHub Actions Run ID: `41501065028` (نجاح النشر للباك إند بدون توقف)
  - GitHub Actions Run ID: `41510991306` (نجاح بناء ونشر الفرونت إند)

---

## 1. المشكلة والسبب الجذري (Root Cause)

1. **انعدام قراءة المحافظة من العنوان الفرعي:**
   في `apps/backend/services/enhancedOrderService.js`:
   كان كود حساب التكلفة يقرأ المحافظة حصراً من `data.governorate || data.city` ويتجاهل تماماً كائن `data.shippingAddress`.
   وعندما يرسل العميل أو المتجر العنوان ككائن `shippingAddress: { governorate: "Alexandria", ... }`، كان المتغير يسقط إلى `undefined` ويعود الشحن كـ `0` ويسجل الطلب `Order.governorate = null`.

2. **عدم تطبيع الأسماء الإنجليزية لمحافظات مصر:**
   قواعد بيانات مناطق الشحن وأسعارها مسجلة بالعربية (مثل: "الإسكندرية"، "الدقهلية"، "القاهرة"). عدم وجود طبقة تحويل إنجليزي-عربي منع مطابقة المناطق عند إرسال الاسم بالإنجليزية (مثل "Alexandria" أو "Dakahlia").

3. **حجب سطر تفاصيل الشحن في واجهة المستخدم:**
   في `usePdpQuickOrderController.ts`:
   المتغير `resolvedGovernorate` لم يكن مصدراً في كائن الإرجاع، مما أدى لجعل `ctrl.resolvedGovernorate` غير معرف في `QuickOrderSummary.tsx` وإخفاء سطر تكلفة الشحن قبل التأكيد.

---

## 2. التعديلات المنجزة

1. **وحدة تطبيع مركزية (`apps/backend/utils/orderLocationNormalizer.js`):**
   - استخراج وتطبيع المحافظة والمدينة والمنطقة من جميع المسارات الممكنة.
   - قاموس شامل لجميع محافظات مصر إنجليزي-عربي مع توحيد الهمزات والألف والياء.
   - توليد كائن `shippingLine: { cost, label, governorate, isFree }`.

2. **خدمة الطلبات المحسنة (`apps/backend/services/enhancedOrderService.js`):**
   - تطبيع العنوان في دوال `createEnhancedOrder`، `calculateOrderCosts`، `calculateShipping`، و`prepareOrderData`.
   - استرجاع سعر الشحن من المناطق المعتمدة عند إرسال 0 أو عدم التحديد.
   - حفظ `Order.governorate` و`Order.city` بالقيم المطبّعة الصريحة داخل الطلب.

3. **متحكمات ومسارات الشحن والطلبات (`shippingZoneController.js`، `publicOrdersRoutes.js`، `orders.js`):**
   - دعم قراءة المحافظة من `req.body.shippingAddress` وتضمين `shippingLine` في استجابة الحساب المبدئي.

4. **الواجهة الأمامية (`usePdpQuickOrderController.ts` & `QuickOrderSummary.tsx`):**
   - تصدير `resolvedGovernorate` وتأمين إظهار سطر تكلفة الشحن فوق الإجمالي في نموذج الطلب السريع.

---

## 3. نتائج الاختبارات الآلية (Automated Verification)

```
PASS apps/backend/tests/services/shippingGovernorateNormalization.test.js
  R3 - Shipping Governorate Normalization & Zero-Shipping Fix
    √ Case 1: Order with shippingAddress only (English "Alexandria") -> shipping = 90 & Order.governorate = "الإسكندرية"
    √ Case 2: Order with Arabic governorate in base field ("الإسكندرية") -> same result (zero regression)
    √ Case 3: Order without any governorate -> legacy fallback behavior preserved with clear log
    √ Case 4: JSON string shippingAddress with state/region field is correctly parsed and normalized

Test Suites: 1 passed, 1 total
Tests:       4 passed, 4 total
```

---

## 4. التحقق الحي على الإنتاج (Live Verification)

- **متجر سوان (`swan.maxp.online`):**
  - نداء POST مع `{ shippingAddress: { governorate: "Alexandria" } }` -> إرجاع الشحن 75 ج.م (الإسكندرية).
- **متجر R³ (`r3.maxp.online`):**
  - نداء POST مع `{ shippingAddress: { governorate: "Alexandria" } }` -> إرجاع الشحن 90 ج.م (الإسكندرية - باقي المحافظات).
  - نداء POST مع `{ shippingAddress: { governorate: "Cairo" } }` -> إرجاع الشحن 80 ج.م (القاهرة والجيزة).
  - نموذج الشراء السريع على المنتج `لونج-شميز-كتان` يعرض سطر تكلفة الشحن والإجمالي (720 + 90 = 810 ج.م) بوضوح.
