# تحصين نظام فوترة الطلبات وسد ثغرة الخصم العشوائي لتطبيقات الـ PPU

**التاريخ:** 2026-09-19  
**الملفات المعدلة:**  
- `apps/backend/services/orderBasedBillingService.js`
- `apps/backend/services/businessSpecialtyService.js`
- `apps/backend/services/catalog/marketplaceCatalogService.js`
- `apps/backend/services/catalog/marketplaceCatalogDiffService.js`
- `apps/backend/controller/marketplaceController.js`
- `apps/backend/services/pendingBillingService.js`
- `apps/backend/scripts/sync_target_marketplace_catalog_entries.js`
- `apps/backend/utils/initializeCompanyDefaults.js`
- `apps/backend/prisma/schema/marketplace.prisma`
- `apps/backend/tests/services/orderBasedBillingSafety.test.js`

---

## 1. المشكلة (Problem Description)
عند إنشاء أي طلب عبر المتجر الإلكتروني (`storefront`)، كان النظام يحتسب رسوماً غير مستحقة لتطبيقات غير مرتبطة بالطلبات (مثل `AI Chat Basic` بقيمة 0.50 ج.م، و `HR Basic` بقيمة 5.00 ج.م، و `WhatsApp Integration` بقيمة 0.10 ج.م):
1. **للشركات ذات الرصيد الصفري (مثل شركة `red line`):** كان الطلب يدخل في حالة تعليق (`billingHold`) ويُحجب تماماً عن لوحة تحكم التاجر وتُعمّى بيانات المشتري بـ `***` بحجة نقص رصيد المحفظة.
2. **للشركات التي لديها رصيد (مثل شركة `Swan`):** كان يتم سحب مبالغ تصل إلى 6.60 ج.م عن كل أوردر في صمت، مما كبد شركة `Swan` وحدها استنزافاً يقارب 9,716 ج.م عبر آلاف المعاملات.

---

## 2. الأسباب الجذرية (Root Causes)
1. **قيمة افتراضية خاطئة في قاعدة البيانات:**
   مايجريشن `20260729000001_add_ppu_billing_method` أضاف عمود `ppuBillingMethod` بقيمة افتراضية `DEFAULT 'PER_ORDER'`. هذا جعل جميع تطبيقات الـ PPU السابقة والجديدة تأخذ صفة الخصم لكل طلب.
2. **استعلام أعمى في محرك فوترة الطلبات:**
   كانت دالة `computePpuCosts` في `orderBasedBillingService.js` تجلب أي تطبيق مفعل للشركة بنظام `PAY_PER_USE` بدون فحص تصنيف التطبيق أو وحدته، مع وجود fallback سام:
   `const method = app.ppuBillingMethod || 'PER_ORDER';`
3. **تثبيت التطبيقات كـ PPU تلقائياً أثناء التسجيل:**
   معالج التسجيل (`businessSpecialtyService.js` و `initializeCompanyDefaults.js`) كان يثبت `ai-chat-basic` كـ `PAY_PER_USE` نشط لكل الشركات الجديدة في 17 نشاطاً تجارياً مختلفاً.

---

## 3. الحل المطبق والتحصين الهندسي الخماسي (5-Layer Defense)
1. **القائمة البيضاء الصارمة (Strict Whitelist):**
   - حظر فوترة أي تطبيق على الطلبات إلا إذا كان ضمن القائمة المصرح بها حصراً (`ALLOWED_ORDER_PPU_SLUGS = new Set(['store'])`).
   - اشتراط أن يكون تصنيف التطبيق `ECOMMERCE` ووحدته الاسمية `طلب`.
2. **إسقاط وتطهير الـ Fallback السام:**
   - إسقاط الـ DEFAULT من عمود قاعدة البيانات (`ALTER COLUMN "ppuBillingMethod" DROP DEFAULT`).
   - إزالة `|| 'PER_ORDER'` من كافة ملفات الخدمات والكتالوج والمايجريشن وجعل القيمة الافتراضية `NULL`.
3. **عزل معالج التسجيل (Onboarding Shield):**
   - منع تعيين أي تطبيق PPU غير المتجر كـ `PAY_PER_USE` أثناء التسجيل في `initializeCompanyDefaults.js`، وتعيينه كـ `FREE`.
4. **تطهير قاعدة البيانات وفك تعليق الطلبات:**
   - فك تعليق طلب شركة `red line` رقم `#ORD-351236-958` ومسح الفاتورة المعلقة.
   - تحويل تطبيقات `ai-chat-basic` و `hr-basic` و `whatsapp-integration` للشركات الحالية إلى `FREE` لمنع أي مطالبات مستقبلية.
5. **شبكة أمان الاختبارات الآلية (Regression Test Guard):**
   - إضافة اختبار `apps/backend/tests/services/orderBasedBillingSafety.test.js` لضمان استحالة محاسبة أي تطبيق غير المتجر على الطلبات مستقبلاً.
