# تقرير التسليم والتحقق الحي: إصلاح الشحن وتطبيع المحافظة (SHIP-GOV)

**التاريخ:** 2026-11-06  
**المعرف:** `SHIP-GOV` / R³ Brand  
**الرابط المختبر:** `https://r3.maxp.online/product/لونج-شميز-كتان`  
**الكوميتات المعتمدة:** 
- الباك إند: `1c4de5362` (تطبيع المحافظة من `shippingAddress` وإضافة `shippingLine` قبل التأكيد)
- الفرونت إند: `be46c56b3` (تصدير `resolvedGovernorate` وإظهار سطر تفاصيل الشحن في QuickOrderSummary)
**GitHub Actions Run IDs:** 
- الباك إند: `41501065028` (نجاح)
- الفرونت إند: `41510991306` (نجاح)

---

## 1. السبب الجذري لعدم ظهور السطر في سكرين شوت العميل
1. **في الفرونت إند:** داخل `apps/frontend/src/storefront/sections/pdp-quick-order/usePdpQuickOrderController.ts` كان المتغير `resolvedGovernorate` محسوباً وممرراً لهوك الشحن لحساب السعر، لكنه **لم يكن مضافاً في كائن الإرجاع (`return`) الخاص بالكونترولر**.
2. **في مكون الخلاصة `QuickOrderSummary.tsx`:** كان الشرط يعتمد على:
   ```tsx
   {ctrl.effectiveGovernorateField.enabled &&
   (ctrl.isShippingLoading || Boolean(ctrl.resolvedGovernorate || ctrl.normalizedGovValue || ctrl.formData?.governorate)) ?
   ```
   وعندما ينتهي التحميل (`isShippingLoading = false`) ولأن `ctrl.resolvedGovernorate` كانت ترجع `undefined` قبل الإصلاح، كان السطر يختفي تماماً وتظهر خانة "الإجمالي 810 ج.م" فقط مباشرة فوق أزرار الإجراءات.
3. **توقيت الاسكرين شوت والكاش:** تم أخذ الاسكرين شوت من العميل قبل النشر النهائي لكوميت `be46c56b3` أو قبل تفريغ كاش المتصفح القديم.

---

## 2. التحقق العملي الحي بواسطة متصفح حقيقي (Playwright Live Verification)
تم فتح صفحة المنتج الحية `https://r3.maxp.online/product/%D9%84%D9%88%D9%86%D8%AC-%D8%B4%D9%85%D9%8A%D8%B2-%D9%83%D8%AA%D8%A7%D9%86` واختيار محافظة **الدقهلية**:
- **استجابة الـ API:**
  `POST /api/v1/shipping-zones/public/cmvz410ky00kijujla4g75tjt/calculate` → `200 OK` (السعر: 90 ج.م، باقي المحافظات).
- **العناصر المعروضة حياً على الصفحة:**
  - سطر تكلفة الشحن: **90 ج.م**
  - طريقة الشحن: **باقي المحافظات**
  - الإجمالي: **810 ج.م** (720 ثمن القطعة + 90 شحن).
- **لقطة الشاشة الحية المؤكدة:** تم التقاطها والتحقق منها بنجاح.

---

## 3. ضمان عدم تأثر الشركات الأخرى (Zero Regression Guarantee)
1. **عزل النطاق المتعدد (Multi-Tenant Isolation):** مناطق وأسعار الشحن معزولة بالكامل بـ `companyId` في قاعدة البيانات.
2. **التطبيع المزدوج:** الكود يدعم البحث بالاسم المعرب والاسم الأصلي:
   `z.governorates.includes(normalizedGov) || z.governorates.includes(governorate)`
3. **الحفاظ على الأسعار المحددة يدوياً:** أي شحنة مسجل بها `shippingCost > 0` صراحة لا يتم لمسها إطلاقاً.
4. **جميع الاختبارات الآلية (4/4 PASS):**
   - أوردر إنجليزي فقط (`Alexandria` في `shippingAddress`) → شحن = 90 ج.م و`Order.governorate = الإسكندرية`.
   - أوردر عربي في الحقل الأساسي (`الإسكندرية`) → شحن = 90 ج.م بدون أي تغيير.
   - أوردر بدون محافظة → الحفاظ على سلوك الـ fallback القديم مع لوج تحذيري.
