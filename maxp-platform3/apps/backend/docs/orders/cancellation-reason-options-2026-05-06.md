# الأسباب الجاهزة لإلغاء الطلب - 2026-05-06

## المطلوب

إتاحة إدخال قائمة أسباب جاهزة من صفحة `/analytics/orders/cancellations` بحيث تظهر داخل نافذة إلغاء الطلب عند تغيير الحالة إلى `ملغي`.

## ما الذي تغيّر

- صفحة تحليل الإلغاءات أصبحت تحتوي على زر واضح باسم `إضافة أسباب الإلغاء` في أعلى الصفحة، وبطاقة إعدادات لحفظ أسباب الإلغاء الجاهزة.
- يتم حفظ الأسباب على مستوى الشركة داخل جدول `order_invoice_settings`.
- صفحة تفاصيل الطلب تعرض قائمة اختيار بالأسباب الجاهزة داخل نافذة `تحديث حالة الطلب` عند اختيار `ملغي`.
- العرض السريع للطلب (`EnhancedOrderModal`) يعرض نفس قائمة الأسباب الجاهزة مع بقاء حقل الكتابة اليدوية متاحًا.

## الباك إند

- تمت إضافة عمود جديد: `order_invoice_settings.cancellationReasonOptions`
- تمت إضافة المسارات التالية:
  - `GET /api/v1/analytics/cancellations/settings`
  - `PUT /api/v1/analytics/cancellations/settings`

## الواجهة

- يتم إدخال الأسباب كسطور منفصلة، مع تنظيف التكرار والمسافات الزائدة عند الحفظ.
- زر `إضافة أسباب الإلغاء` ينقل المستخدم مباشرة إلى مربع كتابة الأسباب ويركز المؤشر بداخله.
- يمكن للمستخدم اختيار سبب جاهز كما هو، أو اختياره ثم تعديله يدويًا قبل تنفيذ الإلغاء.

## التحقق

- Backend syntax: `npm run check:syntax`
- Backend focused tests:
  - `npm test -- --runTestsByPath tests/controller/analyticsController.cancellations.test.js tests/controller/analyticsController.cancellationSettings.test.js`
- Frontend focused test:
  - `npm test -- --runTestsByPath src/services/__tests__/cancellationReasonService.test.ts`
- Frontend focused lint:
  - `npx eslint src/pages/Analytics/orders/CancellationAnalytics.tsx src/pages/orders/OrderDetails.tsx src/components/orders/EnhancedOrderModal.tsx src/services/cancellationReasonService.ts src/services/cancellationReasonUtils.ts --ext ts,tsx --rule "@typescript-eslint/no-explicit-any: off"`
