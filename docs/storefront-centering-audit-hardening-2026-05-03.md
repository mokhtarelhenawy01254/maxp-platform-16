# تثبيت فحص تمركز واجهات المتجر - 2026-05-03

## السياق

فشل GitHub Action الخاص بـ `Storefront Validation` في خطوة `Frontend Storefront Centering Audit (1440px)` لأن سكريبت الفحص كان يبدأ قياس عناصر `.container` بمجرد ظهور `.storefront-shell`.

في بعض الثيمات والمسارات كانت الصفحة ما زالت تعرض شاشة التحميل `StorefrontStartupFallback` وعليها `aria-busy="true"`، لذلك كان الفحص يقيس حاويات fallback غير نهائية بدل صفحة المتجر الحقيقية.

## الإصلاح

- تم جعل سكريبت `audit-storefront-centering.ts` ينتظر انتهاء حالة `aria-busy="true"` قبل قياس الحاويات.
- تم تثبيت `margin-left` و `margin-right` بقيمة `auto` على `.storefront-shell .container` حتى لا تكسر utilities لاحقة تمركز الحاوية في عروض سطح المكتب.

## التحقق المحلي

- `npm run audit:storefront-centering -- --widths 1440 --themes furniture-demo --base-url http://127.0.0.1:3001`
- `npm run audit:storefront-centering -- --widths 1440 --base-url http://127.0.0.1:3001`
- `npx eslint src/storefront/scripts/audit-storefront-centering.ts`

النتيجة: فحص `1440px` الكامل مر على 60 ثيم وكل مسارات المتجر بدون فشل.
