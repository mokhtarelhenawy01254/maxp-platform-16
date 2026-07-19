# UI Library Standard: Admin and Procurement

**Date**: 2026-05-02
**Scope**: Admin app, procurement/purchasing screens, merchant/company operational dashboards

## Decision

المكتبة الأساسية التي سنبني عليها واجهات النظام التشغيلية هي **MUI Material** مع Emotion.

السبب: قسم المشتريات مبني بالفعل على MUI (`@mui/material`, `@mui/icons-material`, `@mui/x-date-pickers`) ومعظم شاشات الإدارة المهمة تستخدم نفس الاتجاه. لذلك توحيد النظام على MUI أقل مخاطرة من إدخال مكتبة جديدة أو نقل كل الشاشات دفعة واحدة.

## Version Policy

- تم تحديث MUI داخل نفس خط الإصدار الآمن:
  - `@mui/material`: `^7.3.10`
  - `@mui/icons-material`: `^7.3.10`
  - `@mui/x-date-pickers`: `^8.28.4`
- آخر إصدار major متاح على npm وقت المراجعة هو MUI `9.0.0` و X Date Pickers `9.0.4`.
- لن ننتقل إلى MUI 9 مباشرة في نفس sprint لأنه major upgrade وقد يكسر APIs أو styling. انتقال MUI 9 يكون migration منفصل مع codemods واختبار regression للشاشات الكبيرة.

## Implementation Done

- تم تحويل `MuiThemeWrapper` من wrapper فارغ إلى `MUI ThemeProvider` فعلي.
- الثيم يدعم:
  - Light/dark mode بناء على `derivedTheme`.
  - RTL/LTR localization حسب لغة i18n.
  - ألوان موحدة للأدمن: teal أساسي و amber ثانوي.
  - typography موحد للـ MUI components.
  - شكل موحد للكروت، الأزرار، الحوارات، والجداول.
- تم تعديل Vite manual chunks بحيث يبقى `clsx` داخل `vendor-mui` لتجنب cycle بين `vendor-mui` و `vendor-ui-framework`.

## Mobile Verification

تم تشغيل اختبار موبايل حقيقي بـ Playwright على:

- URL: `http://localhost:3000/procurement/dashboard`
- Viewport: `390x844`
- Device scale factor: `3`
- Touch/mobile enabled

النتيجة:

- الصفحة فتحت بنجاح.
- لا يوجد horizontal overflow على مستوى الصفحة.
- الكروت الأساسية تتراص عموديًا بعرض مناسب للموبايل.
- لا توجد console errors أثناء اختبار الموبايل.
- Screenshot محلي: `frontend/tmp/procurement-dashboard-mobile.png`

## Procurement Mobile Cards Implementation

تم تنفيذ sprint تحويل الجداول الأساسية في المشتريات إلى كروت على الموبايل مع إبقاء الجداول على الديسكتوب:

- `Suppliers`
- `Purchase Orders`
- `Purchase Invoices`
- `Supplier Payments`

التنفيذ أضاف primitive مشترك:

- `frontend/src/components/procurement/ProcurementMobileCard.tsx`
- `frontend/src/components/procurement/procurementResponsiveSx.ts`

نتيجة اختبار الموبايل بعد إنشاء بيانات تطوير حقيقية:

- Viewport: `390x844`
- `visibleTables`: `0` على كل صفحات الموبايل
- `hasHorizontalOverflow`: `false`
- `hasCreatedRecord`: `true`
- `consoleErrors`: `[]`

Screenshots:

- `frontend/tmp/procurement-mobile-suppliers.png`
- `frontend/tmp/procurement-mobile-purchase-orders.png`
- `frontend/tmp/procurement-mobile-purchase-invoices.png`
- `frontend/tmp/procurement-mobile-supplier-payments.png`

أثناء الاختبار تم اكتشاف وإصلاح bug في تسجيل دفعة المورد:

- `supplierPaymentController` كان يحاول ضبط حالة الفاتورة إلى `PARTIALLY_PAID`.
- Prisma enum الحالي لفواتير المشتريات يدعم فقط `PENDING`, `PAID`, `CANCELLED`.
- الحل الحالي: الفاتورة الجزئية تظل `PENDING` ويتم الاعتماد على `paidAmount` و `remainingAmount` لتمثيل حالة الدفع الجزئي.

## UX Weak Points

- بعض شاشات المشتريات تستخدم `GridLegacy`. هذا يعمل الآن، لكن الأفضل في sprint لاحق تحويله إلى MUI Grid الحديث أو Stack/CSS grid.
- التوحيد الكامل لا يعني نقل storefront/themes إلى MUI؛ المتجر العام له theme engine مختلف ومقصود. التوحيد المقصود هنا هو واجهات التشغيل: admin, procurement, merchant portal, affiliate/company dashboards.

## Next Recommended Sprint

1. إزالة `GridLegacy` تدريجيًا من procurement.
2. إضافة shared MUI primitives للصفحات التشغيلية:
   - `PageHeader`
   - `StatsCard`
   - `ResponsiveDataList`
   - `EmptyState`
3. تشغيل browser mobile smoke لكل شاشة مشتريات بعد أي تغيير في البيانات أو الـ permissions.
4. قرار لاحق: هل نضيف enum رسمي `PARTIALLY_PAID` لفواتير المشتريات أم نعتمد دائمًا على `remainingAmount`.
