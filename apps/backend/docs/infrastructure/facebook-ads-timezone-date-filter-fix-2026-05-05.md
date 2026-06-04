# Facebook Ads timezone date filter fix - 2026-05-05

## المشكلة

فلتر `اليوم` في مركز حملات Meta كان يظهر `2026-05-04` بعد منتصف الليل في القاهرة
رغم أن إعدادات الشركة تعرض `Africa/Cairo` والتاريخ المحلي `2026-05-05`.

## السبب

صفحة Facebook Ads كانت تعتمد على `Date.toISOString().slice(0, 10)` لتوليد قيمة
تاريخ التقارير. هذه الطريقة تستخدم UTC، لذلك عند `2026-05-05 00:30` في القاهرة
قد يكون UTC ما زال في `2026-05-04`.

## التعديل

- إضافة محول تاريخ لتقارير Facebook Ads يحسب اليوم حسب توقيت الحساب الإعلاني عند توفر `timezone_name`.
- تمرير توقيت الحساب الإعلاني المحدد إلى حساب مدى التاريخ في `/advertising/facebook-ads`.
- إزالة الاعتماد على `toISOString()` من التاريخ الافتراضي في صفحة تفاصيل الإعلان.
- إضافة اختبار يغطي حالة القاهرة بعد منتصف الليل عندما يكون UTC في اليوم السابق.

## التحقق

- `npx vitest run src/utils/__tests__/facebookAdsReportFilters.test.ts --environment jsdom`
- `npx eslint src/utils/facebookAdsReportFilters.ts src/utils/__tests__/facebookAdsReportFilters.test.ts src/pages/advertising/FacebookAdsDashboard.tsx src/pages/advertising/AdDetails.tsx --max-warnings=0`
- `VITE_DISABLE_COMPRESSION=true npm run build`
