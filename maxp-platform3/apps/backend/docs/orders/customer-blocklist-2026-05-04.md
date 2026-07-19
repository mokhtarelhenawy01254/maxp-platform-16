# Customer Blocklist MVP - 2026-05-04

## الهدف

إضافة حظر للعملاء عاليي المخاطر بحيث تستطيع الشركة منع أو تقييد إنشاء الطلبات حسب الهاتف أو البريد أو معرفات Facebook وWhatsApp.

## أين تظهر الميزة

- الطلبات > إعدادات الطلبات > حظر العملاء: إدارة إعدادات الحظر وقائمة الحظر النشطة.
- العملاء > صفحة تفاصيل العميل: زر حظر العميل أو فك الحظر، مع بانر واضح إذا كان العميل محظورا.
- الطلبات > تفاصيل الطلب: يظهر زر حظر العميل داخل كارت بيانات العميل، ويمكن اختيار الأكشن والسبب من نفس الطلب، مع بانر إذا كان العميل محظورا.
- الطلب اليدوي: عند إدخال رقم عميل محظور يظهر تحذير، ويتم منع إنشاء الطلب إلا إذا كانت صلاحية التجاوز مفعلة ودور المستخدم مسموحا له.
- المتجر العام: checkout يتحقق من الحظر ويمنع الطلب برسالة مخصصة للعميل.
- طلبات AI/المحادثات: إنشاء الطلب من الخدمات الداخلية يتحقق من قواعد الحظر قبل الحفظ.

## إعدادات الحظر

الإعدادات الحالية محفوظة لكل شركة في `customer_block_settings`:

- `enabled`: تشغيل أو إيقاف نظام الحظر.
- `blockCheckout`: تطبيق الحظر على checkout العام.
- `blockManualOrders`: تطبيقه على الطلبات اليدوية الداخلية.
- `blockAffiliateManualOrders`: تطبيقه على طلبات المسوقين.
- `blockAiOrderCreation`: تطبيقه على طلبات الذكاء/المحادثات.
- `matchPhone`, `matchEmail`, `matchFacebook`, `matchWhatsapp`: حقول المطابقة.
- `allowManagerOverride`: السماح بتجاوز إداري من الأدوار المصرح لها.
- `defaultAction`: الأكشن الافتراضي عند عدم تحديده.
- `checkoutMessage`: الرسالة التي تظهر للعميل في المتجر.
- `internalWarningMessage`: الرسالة التي تظهر للفريق الداخلي.

## أكشنات الحظر

- `BLOCK_ORDERS`: منع إنشاء الطلب.
- `REQUIRE_MANAGER_APPROVAL`: منع الطلب حتى يتم تجاوزه إداريا.
- `BLOCK_COD_ONLY`: منع الدفع عند الاستلام فقط، والسماح بطرق الدفع غير النقدية.

## أسباب الحظر

- `FAKE_ORDERS`: طلبات وهمية.
- `REPEATED_REFUSAL`: رفض استلام متكرر.
- `ABUSE`: إساءة للدعم.
- `FRAUD`: احتيال.
- `WRONG_DATA`: بيانات غير صحيحة.
- `OTHER`: سبب آخر.

## نقاط التنفيذ

- `backend/services/customerBlocklistService.js`: منطق المطابقة والتقييم وإنشاء/فك قواعد الحظر.
- `backend/routes/customerBlocklistRoutes.js`: API للإعدادات والقواعد والتحقق.
- `backend/controller/customerBlocklistController.js`: طبقة التحكم.
- `backend/routes/publicOrdersRoutes.js`: منع checkout العام.
- `backend/routes/enhancedOrders.js` و`backend/services/enhancedOrderService.js`: منع الطلبات اليدوية والموسعة.
- `backend/services/orderService.js`: منع طلبات الذكاء/المحادثات.
- `frontend/src/pages/settings/CustomerBlockSettings.tsx`: واجهة الإعدادات والقائمة.
- `frontend/src/pages/customers/CustomerDetails.tsx`: حظر/فك حظر من صفحة العميل.
- `frontend/src/pages/orders/components/CustomerInfoCard.tsx`: حظر/فك حظر من تفاصيل الطلب.
- `frontend/src/pages/admin/ManualOrder/components/CheckoutColumn.tsx`: تحذير ومنع الطلب اليدوي.

## التحقق المنفذ

- `npx prisma validate --schema=prisma/schema`
- `npm run check:syntax`
- `npx jest tests/services/customerBlocklistService.test.js --runInBand --testTimeout=30000 --forceExit`

## ملاحظات تشغيل

هذه الميزة تحتاج تطبيق migration `20260504160000_add_customer_blocklist` أو تشغيل مسار نشر يطبق migrations قبل استخدامها على بيئة جديدة.

## تحديث 2026-05-05 - إتاحة الحظر من تفاصيل الطلب والتحقق على الإنتاج

### تحديث المصدر

- `backend/routes/orders.js`
  - مسار `GET /api/v1/orders/simple/:orderNumber` يعيد الآن `customerId` ضمن بيانات تفاصيل الطلب.
- `frontend/src/pages/orders/types.ts`
  - نوع تفاصيل الطلب أصبح يحمل `customerId` بشكل اختياري.
- `frontend/src/pages/orders/components/CustomerInfoCard.tsx`
  - نفس كارت `معلومات العميل` في صفحة تفاصيل الطلب يعرض الآن زر `حظر العميل` أو `فك الحظر`.
  - عند وجود حظر فعلي يظهر بانر تنبيهي داخل الكارت نفسه.
- `frontend/src/pages/orders/components/CustomerInfoCard.test.tsx`
  - يغطي فتح المودال وربط الأكشن بخدمة الحظر من داخل صفحة الطلب.

### أين تظهر على الإنتاج

- `الطلبات > إعدادات الطلبات > حظر العملاء`
- `الطلبات > تفاصيل الطلب > معلومات العميل`
- رابط `/settings/customer-blocks` القديم يعيد التوجيه تلقائيا إلى `/settings/orders?tab=customer-blocks`.
- الزر ليس في جدول الطلبات نفسه، بل داخل صفحة تفاصيل الطلب.

### تحقق الإصدار

- محليا:
  - `frontend: npm test -- --runInBand src/pages/orders/components/CustomerInfoCard.test.tsx`
  - `frontend: npm run build`
  - `backend: npm run check:syntax`
  - `node scripts/verify-docs.js`
- على الإنتاج:
  - مراجعة PM2 أكدت أن `maxp-backend` و`maxp-webhook-worker` Online
  - health endpoint عاد `OK`
  - مراجعة المتصفح على طلب حقيقي أكدت ظهور زر `حظر العميل` وفتح مودال الحظر من غير تنفيذ حظر فعلي على عميل حقيقي

### ملاحظة تشغيلية

- مسار النشر الذي يفعّل التغيير على السيرفر هو `push` إلى `main` عبر GitHub Actions workflow `Deploy to Server`.

## تحديث 2026-05-07 - تثبيت حظر العملاء كصفحة مستقلة في قائمة الطلبات

- أزيل تبويب `حظر العملاء` من داخل صفحة `إعدادات الطلبات` حتى لا تتكرر نفس الميزة داخل الشاشة نفسها ومع القائمة الجانبية.
- المسار الأساسي للميزة أصبح `/settings/customer-blocks` كصفحة مستقلة ضمن قائمة `الطلبات`.
- الروابط القديمة من نوع `/settings/orders?tab=customer-block` و`/settings/orders?tab=customer-blocks` تتحول تلقائيا إلى الصفحة المستقلة الجديدة.
- أضيف اختبار لقائمة الطلبات يضمن بقاء رابط `حظر العملاء` مستقلا، واختبار لإعادة توجيه الروابط القديمة من داخل `إعدادات الطلبات`.
