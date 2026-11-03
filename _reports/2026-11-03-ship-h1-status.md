# تقرير إنجاز التيكت — SHIP-H1 (عاجل): تصحيح تقريب الوزن الزائد لأعلى (Math.ceil)

**التاريخ:** 2026-11-03 · **الريبو:** `C:\maxp-platform-13` · **الأولوية:** 🔴 P0 (مالي) · **الحالة:** تم بنجاح ✅

---

## 1. المشكلة التي تم علاجها
كان ملف `apps/backend/services/shipping/policyService.js` يقوم بحساب وحدات الكيلوجرام الزائدة (`extraUnits`) باستخدام التقريب لأسفل (`Math.floor`)، مما تسبب في جعل أي كسر كيلوجرام إضافي مجانياً للمرسل، متسبباً في تسريب إيرادات الشحن.

على سبيل المثال للبطاقة ذات المعطيات:
- السعر الأساسي (`basePrice`): 70 ج.م
- الوزن المشمول (`baseWeightKg`): 1 كجم
- سعر الكيلو الإضافي (`extraKgPrice`): 10 ج.م
- رسوم الدفع عند الاستلام (`codFeeFixed`): 5 ج.م

| وزن الشحنة (`weightKg`) | السعر السابق (Bug) | السعر بعد التصحيح (SHIP-H1) | وحدات الوزن الزائد (`extraUnits`) |
|-------------------------|--------------------|-----------------------------|-----------------------------------|
| **1.0 كجم** | 75 ج.م | **75 ج.م** ✅ | 0 وحدة (استثناء صريح: الوزن <= المشمول) |
| **1.0000001 كجم** | 75 ج.م | **85 ج.م** ✅ | 1 وحدة (تجاوز الوزن الأساسي) |
| **1.2 كجم** | 75 ج.م ❌ | **85 ج.م** ✅ | 1 وحدة (تقريب 0.2 لأعلى) |
| **2.5 كجم** | 85 ج.م ❌ | **95 ج.م** ✅ | 2 وحدة (تقريب 1.5 لأعلى) |
| **3.2 كجم** | 95 ج.م ❌ | **105 ج.م** ✅ | 3 وحدة (تقريب 2.2 لأعلى) |
| **4.0 كجم** | 105 ج.م | **105 ج.م** ✅ | 3 وحدة (3 كيلو إضافية تماماً) |

---

## 2. التعديلات المطبقة
1. **`apps/backend/services/shipping/policyService.js`**:
   - تطبيق معادلة التقريب لأعلى مع حماية النقطة العائمة:
     ```javascript
     const extraWeight = Math.max(0, weight - baseWeight);
     // SHIP-H1: Extra weight rounded UP (ceil) to nearest whole kg with floating-point epsilon protection
     let extraUnits = 0;
     if (weight > baseWeight) {
       extraUnits = Math.ceil(Math.max(0, weight - baseWeight) - 1e-9);
     }
     const extraWeightFee = extraUnits * extraKgPrice;
     ```
   - استثناء صريح: لو `weight <= baseWeight` تكون `extraUnits = 0`.
   - الإبقاء على كافة منطق الـ COD وتحديد مناطق الشحن والسياسات كما هي دون أدنى تغيير.

2. **`apps/backend/tests/shipping/shippingWeightCeil.test.js`**:
   - جناح اختبارات متكامل يغطي الحالات الست بدقة + حالة كسر الوزن الأصغر من الأساسي + استدعاء نقطة النهاية عبر HTTP API.

3. **`apps/backend/tests/shipping/standaloneShipment.test.js`**:
   - تحديث الاختبار القديم ليتوافق مع السقف الجديد للوزن 2.5 كجم (90 ج.م بدلاً من 80 ج.م).

---

## 3. نتائج الاختبارات وفحص السينتاكس
- **Jest Test Suites**:
  - `shippingWeightCeil.test.js`: 8 passed / 8 total
  - `standaloneShipment.test.js`: 8 passed / 8 total
  - الإجمالي: **16 passed / 16 total** بنسبة 100%.
- **Syntax Check**:
  - فحص السينتاكس والمسارات النسبية: 0 أخطاء (All passed).
