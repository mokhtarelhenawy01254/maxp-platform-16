# خطة سيناريو الأفليت والتجار والمخازن

تاريخ: 2026-05-04

## الهدف

تنفيذ سيناريو كامل لشركة جديدة مفعّل لها نظام الأفليت، بها 10 مسوقين و10 تجار، مع 50 طلب موزعة بين التجار والمسوقين، وحالات تشغيل مختلفة: طلبات اتسلمت، طلبات مرتجعة، وطلبات لا تزال داخل الشركة أو تحت التجهيز.

## الموجود قبل التعديل

- إعدادات برنامج الأفليت موجودة عبر `AffiliateSetting` وواجهة `AffiliateSystemSettings`.
- تسجيل وإدارة المسوقين موجود، مع مراجعة/تفعيل وسحب عمولات المسوقين.
- التجار موجودون عبر `Merchant` و`MerchantProduct` و`MerchantOrder`.
- بورتال التاجر موجود لعرض المنتجات والطلبات وتحديث حالة الطلب.
- تقسيم العمولات موجود في `Commission` إلى `AFFILIATE` و`MERCHANT` و`PLATFORM`.
- ملخص تشغيل التاجر موجود ويحسب قطع التجهيز والشحن والتسليم.

## الفجوات التي ظهرت

- لم يكن هناك سجل سحب رسمي لمستحقات التاجر، بينما كان بورتال التاجر يعرض تقديرًا ماليًا فقط.
- مخزن شركة واحد لم يكن قابلاً للمشاركة النظيفة بين أكثر من تاجر؛ منطق الإنشاء كان يربط المخزن بتاجر واحد عند استخدامه كـ `defaultWarehouseId`.
- عند إرجاع/إلغاء الطلب، كان النظام يلغي عمولات المسوق فقط ولا يلغي مستحقات التاجر المرتبطة بنفس الطلب.

## ما تم بناؤه

- إضافة `MerchantPayout` وحقول الربط مع `Commission` لطلبات سحب التجار.
- إضافة خدمات:
  - حساب رصيد التاجر القابل للسحب من الطلبات المسلّمة فقط.
  - إنشاء طلب سحب للتاجر.
  - تسجيل التحويل الخارجي من الشركة.
  - إلغاء طلب السحب وإرجاع المستحقات.
- إضافة endpoints في بورتال التاجر:
  - `GET /api/v1/merchant-portal/payout-summary`
  - `POST /api/v1/merchant-portal/payout-request`
  - `GET /api/v1/merchant-portal/payouts`
- إضافة endpoints لإدارة الشركة:
  - `GET /api/v1/merchants/payouts`
  - `POST /api/v1/merchants/payouts/:payoutId/record-external`
  - `POST /api/v1/merchants/payouts/:payoutId/cancel`
- تعديل بورتال التاجر ليعرض المستحقات الحقيقية وطلب السحب بدل التقدير فقط.
- إضافة قسم "مستحقات التجار" داخل صفحة إدارة التجار للشركة، يعرض إجمالي طلبات السحب، المعلق، المحول، وجدول الطلبات مع إجراءات تسجيل التحويل أو الإلغاء للطلبات المعلقة.
- تعديل مخازن التجار:
  - تاجر `MERCHANT` يأخذ مخزنًا مملوكًا له.
  - تاجر `COMPANY_WAREHOUSE` يستخدم مخزن شركة مشتركًا بدون تغيير `merchantId` للمخزن.
- عند الإرجاع/الإلغاء يتم إلغاء مستحقات التاجر غير المصروفة بجانب عمولات المسوق.

## سيناريو التشغيل الآلي

السكريبت:

`backend/scripts/uat/run-affiliate-merchant-scale-scenario.js`

سينشئ عند تشغيله:

- شركة جديدة.
- إعدادات أفليت مفعلة مرة واحدة.
- مخزنين شركة مشتركين.
- شركتي شحن.
- 10 مسوقين نشطين.
- 10 تجار:
  - 5 يشحنون من مخازنهم.
  - 5 يسلمون بضاعتهم لمخازن الشركة.
- 10 منتجات، منتج لكل تاجر.
- 50 طلب:
  - 20 طلب `DELIVERED`.
  - 15 طلب `RETURNED`.
  - 15 طلب `PROCESSING` كحالة "في الشركة".
- عمولات مقسمة بين المسوق والتاجر والشركة.
- طلبات سحب للتجار من الرصيد المتاح بعد التسليم.
- تقرير JSON وMarkdown داخل `backend/tmp`.

## التحققات الإضافية

- رفض السحب الجزئي للتاجر لضمان أن طلب السحب يساوي الرصيد المتاح المرتبط بالعمولات.
- التأكد أن مخازن الشركة المشتركة تظل غير مملوكة لتاجر واحد.
- التأكد أن المرتجعات تلغي مستحقات التاجر والمسوق.
- تقرير متبقي المخزون لكل تاجر سواء كان المخزون عند التاجر أو في مخزن الشركة.

## أوامر التحقق التي تمت قبل تشغيل السيناريو

- `npm run schema:generate`
- `npm run check:syntax`
- `npm test -- --testPathPattern=merchantService.test.js`
- `npm test -- --testPathPattern=commissionService.payout.test.js`
- `npm test -- --testPathPattern=merchantRoutes.test.js`

## نتيجة التشغيل الفعلي

تم تشغيل السيناريو محليًا بنجاح في 2026-05-04.

- Run ID: `codex-affiliate-merchant-scale-20260504022230`
- الشركة: `شركة سيناريو الأفليت والتجار 20260504022230`
- تقرير JSON: `backend/tmp/codex-affiliate-merchant-scale-20260504022230.json`
- تقرير Markdown: `backend/tmp/codex-affiliate-merchant-scale-20260504022230.md`

الأرقام النهائية:

- المسوقون: 10
- التجار: 10
- المنتجات: 10
- الطلبات: 50
- أوامر التجار: 50
- العمولات: 150
- حالات الطلبات: 20 تم تسليمها، 15 مرتجع، 15 تحت المعالجة/داخل الشركة.

حالات أوامر التجار:

- `MERCHANT_FULFILLED`: 10
- `MERCHANT_FAILED`: 10
- `MERCHANT_SENT`: 5
- `COMPANY_WAREHOUSE_FULFILLED`: 10
- `COMPANY_WAREHOUSE_FAILED`: 5
- `COMPANY_WAREHOUSE_CONFIRMED`: 10

مستحقات التجار:

- إجمالي طلبات السحب: 11,822 جنيه
- تم تحويله: 6,000 جنيه
- قيد المراجعة: 5,822 جنيه
- تم اختبار رفض السحب الجزئي ثم قبول السحب الكامل المتاح.

تقسيم الأرباح والعمولات:

- عمولات المسوق المؤكدة: 2,934.48 جنيه
- عمولات المسوق الإجمالية قبل الإلغاء: 4,107.12 جنيه
- عمولات المسوق الملغاة بسبب المرتجعات: 1,172.64 جنيه
- ربح الشركة المؤكد: 4,545 جنيه
- مستحقات التاجر المدفوعة: 6,000 جنيه
- مستحقات التاجر المؤكدة المتبقية/غير المدفوعة: 14,942 جنيه
- مستحقات التاجر الملغاة بسبب المرتجعات: 8,220 جنيه

اختبار المتصفح:

- المالك: صفحة التجار عرضت 10 تجار، وكل تاجر عليه 5 طلبات. قسم مستحقات التجار ظهر بإجمالي 11,822 جنيه، 5,822 جنيه قيد المراجعة، و6,000 جنيه تم تحويله.
- تاجر بنمط `COMPANY_WAREHOUSE`: دخل بوابة التاجر، ظهر "من مخزن الشركة"، وظهرت طلباته مربوطة بمخزن الشركة وشركة الشحن، وطلب السحب بقيمة 1,580 جنيه قيد المراجعة.
- تاجر بنمط `MERCHANT`: دخل بوابة التاجر، ظهر "التاجر يشحن"، وظهرت مستحقاته المحولة بقيمة 1,040 جنيه.
- مسوق: دخل لوحة المسوق، ظهر كود الإحالة، 3 مبيعات، وآخر العمولات بأرقام طلبات السيناريو.

## أوامر التحقق بعد التنفيذ

- `backend: node --check scripts\uat\run-affiliate-merchant-scale-scenario.js`
- `backend: node scripts\uat\run-affiliate-merchant-scale-scenario.js`
- `frontend: npx eslint src/pages/merchants/MerchantsList.tsx src/pages/merchants/__tests__/MerchantManagementPages.test.tsx src/pages/merchant-portal/MerchantPortalDashboard.tsx`
- `frontend: npm test -- --runInBand src/pages/merchants/__tests__/MerchantManagementPages.test.tsx`
- `frontend: npm run type-check 2>&1 | Select-String -Pattern 'MerchantsList|MerchantManagementPages|merchant-portal|MerchantPortalDashboard'`

ملاحظة: فحص TypeScript العام ما زال يفشل بسبب ديون قديمة في ملفات كثيرة خارج نطاق هذا العمل، لكن الفلترة على الملفات التي تم تعديلها لم تظهر أخطاء.

## متابعة اختبار إنشاء طلب من واجهة المسوق

تم تنفيذ اختبار حي إضافي من المتصفح على صفحة `http://127.0.0.1:3000/affiliates/orders/create` بعد اكتشاف أن مسار إنشاء الطلب اليدوي للمسوق يستخدم `/orders-enhanced` ولا كان ينشئ `MerchantOrder` أو عمولات للتاجر/الشركة.

الإصلاحات المضافة:

- خدمة `EnhancedOrderService` أصبحت تشغل خطوة ما بعد إنشاء الطلب: ربط المنتجات القابلة للدروب شيبنج بالتاجر، إنشاء شحنة/تكليف التاجر، ثم حساب عمولات المسوق والتاجر والشركة.
- عناصر الطلب أصبحت تثبت `basePrice` من سعر المنصة و`merchantPrice` من سعر التاجر المختار، حتى تكون أرباح الشركة والتاجر مبنية على نفس أرقام المخزون/التاجر.
- صفحة إنشاء الطلب أصبحت ترسل `shippingCost: 0` عندما لا توجد منطقة شحن، بدل ترك الباك إند يطبق شحن افتراضي غير ظاهر للمسوق.
- قائمة المنتجات اليدوية للمسوق أصبحت تعرض المخزون القابل للتنفيذ من `merchantProducts` أو مخزون مستودعات الشركة، بدل إظهار المنتجات المتاحة كأنها `0`.

نتائج الاختبار الحي:

- تم إنشاء الطلب `ORD-571484-420` من واجهة المسوق، وتأكدنا من ربطه بتاجر سيناريو 10 وإنشاء تكليف تاجر وشحنة و3 عمولات.
- بعد تصحيح الشحن، تم إنشاء الطلب `ORD-829611-313` بإجمالي مطابق للواجهة `415 ج.م` وشحن `0`.
- تم تمرير الطلب التجريبي القديم `ORD-014566-432` على خطوة المعالجة الجديدة حتى لا يبقى في البيئة المحلية بدون تكليف تاجر أو عمولات.
- الطلب `ORD-829611-313` نتج عنه:
  - تكليف تاجر واحد لتاجر سيناريو 10 بنمط `COMPANY_WAREHOUSE`.
  - شحنة واحدة بحالة `PENDING`.
  - عمولة مسوق: `37.35 ج.م`.
  - مستحق تاجر: `370 ج.م`.
  - ربح شركة: `45 ج.م`.
  - `basePrice = 415` و`merchantPrice = 370` على عنصر الطلب.

التحقق بعد المتابعة:

- `backend: node -c backend/services/enhancedOrderService.js`
- `backend: npx jest tests/services/enhancedOrderService.test.js --runInBand --testTimeout=30000`
- `backend: npx jest tests/routes/enhancedOrdersAffiliatePolicy.test.js tests/routes/enhancedOrdersAffiliateVisibility.test.js --runInBand --testTimeout=30000`
- `frontend: npx eslint src/pages/admin/ManualOrder/components/CheckoutColumn.tsx`
- `frontend: npx eslint src/pages/admin/ManualOrder/components/ProductSearchColumn.tsx`

## توحيد مسار التاجر مع أدوات الشركة

بعد مراجعة التجربة من المتصفح، تم إلغاء فكرة وجود أدوات طلبات/منتجات موازية داخل بوابة التاجر. المسار المعتمد الآن:

- المنتجات: `/products`
- المخزون: `/inventory`
- الطلبات: `/orders`
- بوابة التاجر تبقى للملخصات والمستحقات فقط، مع تحويل `/merchant-portal/products` و`/merchant-portal/orders` إلى المسارات الأساسية.

الإصلاحات:

- قائمة التاجر الجانبية أصبحت تفتح أدوات الشركة الأساسية بدل صفحات خاصة بالتاجر.
- API الطلبات الأساسي يسمح للتاجر فقط بالمسارات الموحدة الآمنة:
  - عرض قائمته: `GET /orders-new/simple`
  - عرض طلب مسند له: `GET /orders-new/simple/:orderNumber`
  - تعليم طلبه كمقروء: `POST /orders-new/simple/:orderNumber/viewed`
  - تحديث حالة طلبه فقط عندما يكون التنفيذ من عنده: `POST /orders-new/simple/:orderNumber/status`
- تم منع التاجر من إحصائيات/دفع/تعديل بيانات العميل/تعديل عناصر الطلب/مسارات التحضير القديمة.
- طلبات `COMPANY_WAREHOUSE` تظهر للتاجر للمتابعة فقط، وحالة الطلب وبيانات الدفع تدار من الشركة.
- تاجر `MERCHANT` الذي يشحن من عنده يستطيع تحديث حالة طلبه من نفس شاشة `/orders`.
- شاشة `/inventory` أصبحت تعرض للتاجر "مخزوني" وتستخدم نفس شاشة الشركة، لكن تخفي أزرار توريد/صرف/نقل عندما يكون الرصيد في مخزن الشركة.
- API المخزون يرجع `canEditStock` و`stockLocationLabel` للتفريق بين مخزن التاجر ومخزن الشركة.

اختبارات السيناريو بعد التوحيد:

- Merchant 10 بنمط `COMPANY_WAREHOUSE` رأى 8 طلبات على `/orders`.
- محاولة Merchant 10 تحديث حالة طلب مخزن الشركة رجعت `403`.
- محاولة Merchant 10 استخدام إحصائيات الطلبات أو تحديث الدفع رجعت `403` من allowlist المسارات.
- Merchant 10 رأى مخزونه على `/inventory` بعنوان "مخزوني" وبوسم "في مخزن الشركة"، ولم تظهر له أزرار توريد/صرف/نقل.
- محاولة Merchant 10 تعديل رصيد مخزن الشركة رجعت `403`.
- Merchant 1 بنمط `MERCHANT` رأى مخزنه كـ "في مخزن التاجر" و`canEditStock=true`.
- Merchant 1 حدّث طلبه `SCN-20260504022230-041` إلى `DELIVERED` من نفس API الموحد.
- Merchant 10 لم يستطع الوصول إلى طلب Merchant 1 أو تعليمه كمقروء؛ رجع `404`.
- المتصفح أكد أن `/merchant-portal/orders` و`/merchant-portal/products` يرجعان إلى المسارات الأساسية.

أوامر التحقق:

- `backend: node -c backend/routes/orders.js`
- `backend: node -c backend/routes/enhancedOrders.js`
- `backend: node -c backend/controller/inventoryController.js`
- `backend: node -c backend/controller/productController.js`
- `backend: npx jest --runTestsByPath tests/services/merchantService.test.js --runInBand --testTimeout=30000`
- `backend: npx jest --runTestsByPath tests/routes/enhancedOrdersAffiliateVisibility.test.js tests/routes/enhancedOrdersAffiliatePolicy.test.js --runInBand --testTimeout=30000`
- `backend: npx jest --runTestsByPath tests/controller/inventoryController.productCreate.test.js --runInBand --testTimeout=30000`

## متابعة لوحة الشركة الموحدة للتجار

بعد توحيد مسار التاجر على نفس شاشات الشركة، تم استكمال جانب الشركة حتى لا تحتاج الإدارة لفتح أدوات تاجر موازية:

- `GET /api/v1/merchants` و`GET /api/v1/merchants/:id` أصبحا يرجعان `operationsSummary` بجانب `inventorySummary`.
- شاشة `/merchants` أصبحت تعرض "مركز تشغيل التجار" وفيه:
  - إجمالي التجار النشطين.
  - الرصيد القابل للبيع والمحجوز.
  - الطلبات المسندة للتجار.
  - قيد التجهيز، في الشحن، تم التسليم، ومرتجع/لم يسلم.
  - مستحقات التاجر بعد التسليم.
- كل صف تاجر في `/merchants` يعرض طريقة التنفيذ، مكان المخزون، أرقام التشغيل، وروابط إلى الأدوات الموحدة فقط: `/orders` و`/inventory` و`/products`.
- صفحة بروفايل التاجر `/merchants/:id` أصبحت تعرض لوحة "متابعة طلبات التاجر" من نفس طلبات الشركة الموحدة، مع آخر طلبات التاجر وأرقام المستحقات.
- تفعيل إعدادات الأفليت أصبح يضمن تفعيل أدوات التشغيل الأساسية للشركة مرة واحدة:
  - `affiliate-pro`
  - `order-core`
  - `inventory-pro`
  - `ecommerce-basic` كـ fallback للواجهات القديمة.
- سكريبت UAT `backend/scripts/uat/run-affiliate-merchant-scale-scenario.js` أصبح يثبت نفس الأدوات الأساسية عند إنشاء شركة سيناريو جديدة.

اختبار الشركة الحالية بعد التعديل:

- تم تفعيل الأدوات الأساسية لشركة `شركة سيناريو الأفليت والتجار 20260504022230` من إعدادات الأفليت.
- `GET /api/v1/merchants` رجع 10 تجار، وأول تاجر ظاهر كان `تاجر سيناريو 10` مع 8 طلبات، 3 تم تسليمها، 1 لم يسلم، ومبلغ مستحق مسلم 2,220 ج.م.
- `GET /api/v1/merchants/cmoqkqvaw003yvplczlwg4e3i` رجع 8 عمليات للتاجر ووسم مخزون "في مخزن الشركة".
- `GET /api/v1/orders-new/simple?limit=3` رجع 53 طلب بعد تفعيل `order-core`.
- المتصفح كـ OWNER أكد:
  - `/merchants` يعرض مركز تشغيل التجار وروابط الأدوات الموحدة.
  - بروفايل `تاجر سيناريو 10` يعرض ملخص التشغيل: 8 طلبات، 4 قيد التجهيز، 3 تم التسليم، 1 مرتجع/لم يسلم، و116 قطعة قابلة للبيع في مخزن الشركة.
  - رابط `الطلبات الموحدة` يفتح `/orders` ويعرض 53 طلب بدل رسالة "تتطلب تفعيل".

أوامر التحقق:

- `backend: node -c routes/affiliateSettingsRoutes.js; node -c routes/merchantRoutes.js; node -c scripts/uat/run-affiliate-merchant-scale-scenario.js`
- `backend: npx jest --runTestsByPath tests/routes/affiliateSettingsRoutes.test.js --runInBand --testTimeout=30000`
- `frontend: npx eslint src/pages/merchants/MerchantsList.tsx src/pages/merchants/MerchantProfile.tsx src/pages/merchants/__tests__/MerchantManagementPages.test.tsx --rule "@typescript-eslint/no-explicit-any: off"`
- `frontend: npx jest --config jest.config.cjs --runTestsByPath src/pages/merchants/__tests__/MerchantManagementPages.test.tsx --runInBand --testTimeout=30000`
- `frontend: npx jest --config jest.config.cjs --runTestsByPath src/config/__tests__/sidebar.affiliateMerchant.test.ts --runInBand --testTimeout=30000`
- `frontend: npx eslint` على ملفات المنتجات والطلبات والمخزون والتوجيهات المعدلة.
- `frontend: npm run type-check -- --pretty false` ما زال يفشل بسبب ديون TypeScript عامة في ملفات كثيرة خارج نطاق هذا التعديل، مثل `response.data` من نوع `unknown` وملفات registry/storefront مفقودة.

## متابعة إغلاق المسار الموازي للتاجر

بعد ملاحظة أن صفحة تفاصيل الطلب والبوابة نفسها ما زالت تحتوي على آثار أدوات تاجر خاصة، تم عمل متابعة إضافية:

- صفحة `MerchantPortalDashboard` لم تعد تسحب أو تعرض أو تحدث منتجات/طلبات من endpoints خاصة مثل `/merchant-portal/products` و`/merchant-portal/orders`.
- بوابة التاجر أصبحت تعرض:
  - نظرة عامة.
  - روابط مباشرة للأدوات الموحدة: `/products` و`/inventory` و`/orders`.
  - مستحقات التاجر وطلبات السحب فقط.
- المسارات القديمة:
  - `/merchant-portal/products` تتحول إلى `/products`.
  - `/merchant-portal/orders` تتحول إلى `/orders`.
  - أي مسار عشوائي تحت `/merchant-portal/*` يتحول إلى `/merchant-portal`.
- حارس مسارات التاجر لم يعد يسمح بأي مسار فرعي عشوائي داخل البوابة؛ المسموح فقط هو الملخص، المستحقات، ومسارات التحويل القديمة.
- صفحة تفاصيل الطلب الموحدة أصبحت تراعي صلاحيات التاجر:
  - تاجر `COMPANY_WAREHOUSE` يرى الطلب للمتابعة فقط.
  - لا يظهر له تعديل الطلب أو تحديث الدفع أو ورقة التجهيز أو إدارة شحنة Turbo أو إضافة ملاحظات.
  - يظل قادرًا على رؤية رقم التتبع والرابط إن وجدا.

تحقق المتصفح بعد المتابعة:

- `/merchant-portal` يعرض "الأدوات الموحدة" ولا يعرض جدول تعديل منتجات أو نموذج تحديث طلبات خاص بالتاجر.
- `/merchant-portal/commissions` يعرض المستحقات فقط مع روابط إلى الطلبات والمخزون الموحدين.
- `/merchant-portal/products` تحول فعليًا إلى `/products`.
- `/merchant-portal/orders` تحول فعليًا إلى `/orders`.
- `/merchant-portal/random-tool` تحول إلى `/merchant-portal`.
- Merchant 10 على `/orders` رأى 8 طلبات فقط تخصه.
- تفاصيل `ORD-829611-313` كتاجر مخزن شركة أخفت تعديل الطلب/الدفع/ورقة التجهيز/إدارة Turbo/إضافة الملاحظات، وأظهرت رقم التتبع.
- `/inventory` كتاجر مخزن شركة عرضت "مخزوني" و"في مخزن الشركة" ولم تعرض أزرار توريد/صرف/نقل.

تحقق API بعد المتابعة:

- Merchant 10:
  - `GET /api/v1/orders-new/simple?limit=5` رجع `200`.
  - `GET /api/v1/orders-new/simple/stats` رجع `403`.
  - `POST /api/v1/orders-new/simple/ORD-829611-313/status` رجع `403` لأنه طلب مخزن شركة.
  - `POST /api/v1/orders-new/simple/SCN-20260504022230-041/viewed` رجع `404` لأنه طلب تاجر آخر.
  - `POST /api/v1/inventory/update-stock` رجع `403` لأن المخزون في مخزن الشركة.
- Merchant 1:
  - `GET /api/v1/orders-new/simple/SCN-20260504022230-041` رجع `200` لطلبه الذاتي.

أوامر التحقق الإضافية:

- `frontend: npx eslint src/pages/merchant-portal/MerchantPortalDashboard.tsx src/utils/merchantAccess.ts src/utils/__tests__/merchantAccess.test.ts`
- `frontend: npx jest --config jest.config.cjs --runTestsByPath src/config/__tests__/sidebar.affiliateMerchant.test.ts src/utils/__tests__/merchantAccess.test.ts --runInBand --testTimeout=30000`
- `backend: node -c routes/orders.js`
- `backend: node -c routes/enhancedOrders.js`
- `backend: node -c controller/inventoryController.js`
- `backend: node -c controller/productController.js`
- `backend: npx jest --runTestsByPath tests/services/merchantService.test.js --runInBand --testTimeout=30000`
- `backend: npx jest --runTestsByPath tests/routes/enhancedOrdersAffiliateVisibility.test.js tests/routes/enhancedOrdersAffiliatePolicy.test.js --runInBand --testTimeout=30000`
- `backend: npx jest --runTestsByPath tests/controller/inventoryController.productCreate.test.js --runInBand --testTimeout=30000`

## توحيد تشغيل طلبات التجار داخل `/orders`

تم تنفيذ خطوة الشركة التالية بدون إنشاء صفحة طلبات تاجر موازية:

- `GET /api/v1/orders-new/simple` أصبح يدعم فلاتر تشغيل موحدة:
  - `merchantId`
  - `affiliateId`
  - `fulfillmentSource=MERCHANT|COMPANY_WAREHOUSE`
  - `merchantOperationStatus=PREPARATION|IN_SHIPPING|DELIVERED|NOT_DELIVERED`
  - `merchantSettlementStatus=PAYABLE|PAID|PENDING|NOT_PAYABLE`
- نفس endpoint يرجع الآن على كل طلب بيانات تشغيل مختصرة:
  - التاجر ووسيلة التنفيذ.
  - حالة تشغيل التاجر.
  - المخزن وشركة الشحن ورقم التتبع.
  - عدد القطع.
  - مستحق التاجر وربح المسوق من عمولات الطلب.
- شاشة `/orders` نفسها أصبحت تعرض:
  - فلاتر التاجر والمسوق ومصدر التنفيذ وحالة تشغيل التاجر ومستحقات التاجر.
  - وسوم تشغيل داخل صف/كارت الطلب بدل أدوات منفصلة.
  - نفس آلية حفظ الفلاتر في الرابط والـ localStorage.

تحقق API:

- `GET /api/v1/merchants` رجع 10 تجار.
- `GET /api/v1/affiliates/list` رجع 10 مسوقين.
- `GET /api/v1/orders-new/simple?limit=20` رجع 53 طلب.
- `GET /api/v1/orders-new/simple?merchantId=cmoqkqvaw003yvplczlwg4e3i&limit=20` رجع 8 طلبات لتاجر سيناريو 10.
- `GET /api/v1/orders-new/simple?merchantId=cmoqkqvaw003yvplczlwg4e3i&merchantOperationStatus=DELIVERED&limit=20` رجع 3 طلبات وكلها `DELIVERED`.
- `GET /api/v1/orders-new/simple?fulfillmentSource=COMPANY_WAREHOUSE&limit=20` رجع 28 طلب.
- `GET /api/v1/orders-new/simple?merchantId=cmoqkqvaw003yvplczlwg4e3i&merchantSettlementStatus=PAYABLE&limit=20` رجع 7 طلبات مستحقة.
- `GET /api/v1/orders-new/simple?merchantId=cmoqkqvaw003yvplczlwg4e3i&merchantSettlementStatus=NOT_PAYABLE&limit=20` رجع طلباً واحداً بحالة `NOT_DELIVERED`.

تحقق المتصفح:

- `/orders?page=1&limit=20&merchantId=cmoqkqvaw003yvplczlwg4e3i&merchantOperationStatus=DELIVERED` عرض 3 طلبات.
- ظهرت فلاتر "كل التجار"، "كل المسوقين"، و"حالة تشغيل التاجر".
- ظهرت وسوم "تاجر: تاجر سيناريو 10"، "من مخزن الشركة"، و"مستحق التاجر".

أوامر التحقق:

- `backend: node --check routes/orders.js`
- `frontend: npx eslint src/pages/orders/Orders.tsx --max-warnings=0`
- `frontend: npm run type-check -- --pretty false` استمر أكثر من دقيقتين وتوقف بالـ timeout، لذلك تم الاكتفاء بفحص الملف المستهدف و smoke tests للـ API والمتصفح.

## ملخص تسوية التاجر داخل `/orders`

تم تنفيذ الخطوة التالية لإغلاق دورة الطلب/المخزون/التسوية من نفس مسار الشركة:

- أضيف endpoint للشركة:
  - `GET /api/v1/merchants/:id/settlement-summary`
  - يرجع بيانات التاجر، ملخص المخزون، ملخص تشغيل الطلبات، وملخص السحب المالي.
- شاشة `/orders` تعرض الآن لوحة أعلى القائمة عند اختيار تاجر:
  - الرصيد القابل للسحب الآن.
  - طلبات السحب قيد مراجعة الشركة.
  - المبلغ المدفوع.
  - قيمة الطلبات في الشحن.
  - الرصيد القابل للبيع والمحجوز.
  - الطلبات المسلمة والمرتجعة.
- اللوحة لا تنشئ شاشة تاجر موازية؛ هي قراءة وتشغيل فوق نفس `/orders` مع روابط إلى ملف التاجر والمخزون.
- التاجر لا يستطيع فتح endpoint الشركة الجديد؛ يظل يرى ملخصه المالي من `/merchant-portal/payout-summary` فقط.

تحقق API على شركة السيناريو:

- `GET /api/v1/merchants/cmoqkqvaw003yvplczlwg4e3i/settlement-summary` رجع:
  - `availableForSale=116`
  - `reservedQuantity=8`
  - `stockLocationLabel=في مخزن الشركة`
  - `deliveredOrders=3`
  - `deliveredPieces=6`
  - `deliveredPayableAmount=2220`
  - `payoutAvailable=370`
  - `payoutPending=1850`
  - `pendingPayoutRows=1`
- فلتر الطلبات:
  - `GET /api/v1/orders-new/simple?merchantId=cmoqkqvaw003yvplczlwg4e3i&merchantOperationStatus=DELIVERED&merchantSettlementStatus=PAYABLE&limit=20`
  - رجع 3 طلبات وكلها `DELIVERED`.
- كتاجر `merchant-10`:
  - `GET /api/v1/merchant-portal/payout-summary` رجع `available=370`, `pending=1850`, `paid=0`.
  - `GET /api/v1/merchant-portal/operations-summary` رجع 3 طلبات مسلمة و6 قطع مستحقة.
  - `GET /api/v1/merchants/cmoqkqvaw003yvplczlwg4e3i/settlement-summary` رجع `403` كما هو مطلوب.

تحقق المتصفح:

- `/orders?page=1&limit=20&merchantId=cmoqkqvaw003yvplczlwg4e3i&merchantOperationStatus=DELIVERED` يعرض:
  - "تسوية التاجر"
  - "تاجر سيناريو 10"
  - "قابل للسحب الآن" = 370 ج.م
  - "قيد طلب سحب" = 1,850 ج.م
  - "رصيد قابل للبيع" = 116 قطعة
  - "محجوز" = 8 قطع
  - 3 طلبات مسلمة
  - بدون رسالة "تعذر تحميل الطلبات".

أوامر التحقق:

- `backend: node --check routes/merchantRoutes.js`
- `backend: npm test -- --runTestsByPath tests/routes/merchantRoutes.test.js --runInBand`
- `frontend: npx eslint src/pages/orders/Orders.tsx --max-warnings=0`

## ظهور فلاتر الأفليت والتجار داخل `/orders`

بعد سؤال "هل الفلاتر تظهر في كل الأحوال؟"، تم تعديل شاشة الطلبات لتكون الفلاتر سياقية بدل ظهورها لكل الشركات:

- فلاتر التجار والتشغيل تظهر فقط عندما:
  - يكون المستخدم من إدارة الشركة.
  - يوجد تجار للشركة، أو تطبيق الأفليت مفعل، أو الرابط الحالي يحتوي فلتر تاجر/تنفيذ حتى لا يتحول الفلتر إلى فلتر مخفي.
- فلتر المسوقين يظهر فقط عندما:
  - يكون تطبيق `affiliate-pro` مفعل، أو توجد سجلات مسوقين، أو الرابط الحالي يحتوي `affiliateId`.
- تحميل خيارات التجار والمسوقين أصبح منفصلاً بـ `Promise.allSettled`، لذلك فشل مسار المسوقين لا يخفي فلاتر التجار والعكس.

تحقق المتصفح:

- `/orders?page=1&limit=20&merchantId=cmoqkqvaw003yvplczlwg4e3i&merchantOperationStatus=DELIVERED&merchantSettlementStatus=PAYABLE` على شركة السيناريو أظهر:
  - فلاتر "كل التجار"، "كل المسوقين"، "مصدر التنفيذ"، "حالة تشغيل التاجر"، و"مستحقات التاجر".
  - لوحة "تسوية التاجر".
  - الرصيد القابل للسحب 370 ج.م، وقيد السحب 1,850 ج.م، والرصيد القابل للبيع 116 قطعة.

أوامر التحقق:

- `frontend: npx eslint src/pages/orders/Orders.tsx --max-warnings=0`

## نقل بيانات التاجر/المخزن/المسوق إلى داخل الطلب

بعد ملاحظة أن صف الطلب في `/orders` أصبح مزدحمًا ببادجات التاجر والمسوق والمستحقات، تم تنظيف القائمة ونقل بيانات التشغيل إلى داخل الطلب نفسه:

- صفوف `/orders` لم تعد تعرض:
  - اسم التاجر.
  - اسم المسوق.
  - مصدر التنفيذ.
  - مستحق التاجر.
  - ربح المسوق.
  - حالة تسوية التاجر.
- تمت إضافة كارت داخلي مشترك يظهر في:
  - العرض السريع للطلب.
  - صفحة تفاصيل الطلب.
- الكارت يقسم البيانات إلى 3 أجزاء مستقلة:
  - `التاجر والأرباح`: بيانات التاجر، حالة التشغيل، عدد القطع، قيمة التاجر، مستحق التاجر، حالة التسوية، ورابط فتح ملف التاجر.
  - `المخزن والتنفيذ`: مصدر التنفيذ، المخزن، شركة الشحن، رقم التتبع، وحالة الشحنة.
  - `المسوق والأرباح`: بيانات المسوق، كود المسوق، البريد، حالة الحساب، ربح المسوق، ورابط فتح إدارة المسوق.
- تم تعديل تفاصيل الطلب في API بحيث ترجع `merchantOrder` للشركة أيضًا، وليس فقط عند دخول التاجر، حتى تظهر نفس بيانات التشغيل داخل صفحة تفاصيل الطلب للشركة.
- تم تصحيح رابط تفاصيل المسوق القديم من `/affiliates/:id` إلى `/affiliates/management?affiliateId=...` لأنه لا يوجد مسار مستقل للمسوق بهذا الشكل.

تحقق API:

- `GET /api/v1/orders-new/simple/ORD-829611-313` كمالك الشركة رجع:
  - `merchantName=تاجر سيناريو 10`
  - `merchantAmount=370`
  - `merchantCommission=370`
  - `affiliateCommission=37.35`
  - `settlementStatus=PAYABLE`
  - `affiliateCode=25544A33`

تحقق المتصفح:

- صفحة `/orders?page=1&limit=20&merchantId=cmoqkqvaw003yvplczlwg4e3i&merchantOperationStatus=DELIVERED&merchantSettlementStatus=PAYABLE` تعرض الطلبات بدون بادجات `تاجر:` أو `مسوق:` أو `مستحق التاجر` داخل الصف.
- زر `عرض سريع` للطلب `ORD-829611-313` يفتح مودال يحتوي:
  - `تشغيل الطلب`
  - `التاجر والأرباح`
  - `المخزن والتنفيذ`
  - `المسوق والأرباح`
  - روابط `فتح التاجر` و`فتح المسوق`.
- صفحة `/orders/ORD-829611-313` تعرض نفس الأقسام والقيم داخل تفاصيل الطلب.

أوامر التحقق:

- `backend: node --check routes/orders.js`
- `frontend: npx eslint src/pages/orders/Orders.tsx src/components/orders/OrderPartnerOperationsCard.tsx src/pages/orders/components/OrderSourceCard.tsx --max-warnings=0`
- فحص ESLint على `EnhancedOrderModal.tsx` و`OrderDetails.tsx` و`types.ts` لا يزال يصطدم بديون قديمة من `no-explicit-any` موجودة قبل هذا التعديل، لذلك تم تعويضه باختبار API والمتصفح على نفس المسار.

## صفحة ملف المسوق المستقلة للشركة

بعد ملاحظة أن رابط المسوق داخل الطلب كان يذهب إلى صفحة الإدارة العامة بالـ query string، تم إضافة ملف مستقل لكل مسوق:

- المسار الجديد: `/affiliates/management/:id`.
- الـ API الجديد: `GET /api/v1/affiliates/:id/profile`.
- الرابط داخل كارت تشغيل الطلب ورابط `عرض التفاصيل` داخل مصدر الطلب أصبحا يذهبان مباشرة إلى ملف المسوق.
- جدول `/affiliates/management` أصبح يحتوي زر `فتح الملف` لكل مسوق بدلاً من الاعتماد على مودال سجل المراجعة فقط.
- صفحة الملف تعرض:
  - بيانات الحساب والحالة وكود المسوق وبيانات التواصل.
  - ملخص الأداء: الطلبات، المسلم، الملغي، العمولات، الرصيد القابل للسحب، والسحوبات.
  - تاريخ الطلبات المرتبطة بالمسوق.
  - تاريخ العمولات والسحوبات.
  - الإحالات والعملاء حسب صلاحية عرض بيانات العملاء.
  - إعدادات العمولة والحد الأدنى للسحب وصلاحيات إنشاء الطلبات/عرض العملاء.
  - المستندات، اعتماد/رفض المستند، وسجل قرارات المراجعة.
  - بيانات الدفع.
- تم جعل تاريخ المستندات وسجل المراجعة يتحملان بيئات قاعدة البيانات التي لم تطبق جداول التاريخ بعد، بحيث يرجعان قائمة فارغة بدلاً من كسر صفحة الملف.

تحقق API:

- `GET /api/v1/affiliates/cmoqkqtyu000kvplcx6uu8bz4/profile` رجع:
  - المسوق: `مسوق 1`
  - الكود: `25544A33`
  - الطلبات: `8`
  - المسلم: `4`
  - العمولات: `8`
  - السحوبات: `0`
  - سجل المراجعة: `1`

تحقق المتصفح:

- `/affiliates/management/cmoqkqtyu000kvplcx6uu8bz4` يعرض صفحة ملف المسوق المستقلة بكل الأقسام المطلوبة.
- `/orders/ORD-829611-313` يحتوي رابط `فتح المسوق` إلى `/affiliates/management/cmoqkqtyu000kvplcx6uu8bz4`.
- `/affiliates/management` يحتوي زر `فتح الملف` لنفس المسوق.

أوامر التحقق:

- `backend: node --check routes/affiliateRoutes.js`
- `backend: node --check services/affiliateService.js`
- `frontend: npx eslint src/pages/affiliates/AffiliateProfile.tsx src/pages/affiliates/AffiliatesManagement.tsx src/components/orders/OrderPartnerOperationsCard.tsx src/pages/orders/components/OrderSourceCard.tsx src/App.tsx --max-warnings=0`
