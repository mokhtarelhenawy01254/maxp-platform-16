# Affiliate/Dropshipping Complete UAT - 2026-05-02

## النتيجة

- الحالة: `UAT_COMPLETE`
- البيئة: `local-development`
- API UAT: `38/38 PASS`
- Browser/Desktop UAT: `PASS`
- Mobile smoke UAT: `PASS`
- التقرير الخام: `backend/tmp/codex-affiliate-full-uat-20260502031429.json`

## الشركة الجديدة

- الاسم: `Codex Affiliate UAT 20260502031429`
- Company ID: `cmonrpzak0000vpg4dji7oy0a`
- Slug: `owner-codex-affiliate-full-uat-20260502031429`

## الحسابات التجريبية

- Owner: `owner+codex-affiliate-full-uat-20260502031429@codex-uat.local`
- Affiliate: `affiliate+codex-affiliate-full-uat-20260502031429@codex-uat.local`
- Auto merchant: `merchant-auto+codex-affiliate-full-uat-20260502031429@codex-uat.local`
- Manual merchant: `merchant-manual+codex-affiliate-full-uat-20260502031429@codex-uat.local`

## ما تم اختباره

- إنشاء شركة جديدة ومالك `OWNER` من البداية.
- إنشاء شركة ثانية لعزل البيانات.
- تعطيل برنامج الأفليت ثم منع تسجيل المسوق.
- تفعيل البرنامج وحفظ العمولة، مدة الكوكيز، شروط البرنامج، ونوع/قيمة هامش المنصة.
- تحميل صفحة تسجيل المسوق العامة بالـ `slug` مع اسم الشركة والشروط المخصصة.
- رفض `slug` غير صالح للمسوق.
- إنشاء منتجات اختبار للشركة.
- إنشاء مخزنين وشركتي شحن وربط مخزون الشركة بالمنتج الثاني.
- تسجيل تاجر عام على شركة معينة من الدومين الرئيسي باستخدام `slug` مع تجاهل أي إعدادات تشغيلية يرسلها التاجر.
- ضبط الشركة لإعدادات التاجر التشغيلية بعد التسجيل: العمولة، `webhookUrl`، و`autoFulfill`.
- ضبط طريقة تنفيذ التاجر من الشركة: تاجر يشحن بنفسه أو تنفيذ من مخزن الشركة.
- ضبط شركة الشحن الافتراضية لكل تاجر من شركات شحن الشركة.
- رفض تسجيل التاجر بدون شركة أو على شركة غير موجودة.
- إنشاء تاجر من لوحة الشركة.
- إنشاء حسابات دخول بدور `MERCHANT` للتجار.
- بورتال التاجر يعرض التاجر الصحيح فقط.
- التاجر يرى منتجاته فقط ويحدث السعر والمخزون والمزامنة.
- منع التاجر من تعديل منتجات تاجر آخر أو استخدام API إدارة التجار.
- ربط المنتجات بالتجار وتشغيل مزامنة المخزون.
- اختيار مورد الدروب شيبنج صاحب مخزون كاف، وليس الأرخص إذا كان مخزونه غير كاف.
- اختيار مورد `COMPANY_WAREHOUSE` بناءً على مخزون الشركة المتاح، حتى لو مخزون التاجر نفسه يساوي صفرًا.
- تسجيل مسوق على الشركة عبر `slug`.
- رفض البريد المكرر.
- منع المسوق المعلق من إنشاء طلب.
- تفعيل المسوق وتعديل عمولته من الشركة.
- المسوق يضيف منتجات ويحصل على سعره.
- منع المسوق من أدوات الإدارة وبورتال التاجر.
- إنشاء طلب أفليت وتقسيمه على تاجرين.
- تنفيذ طلب التاجر الآلي تلقائيًا.
- تنفيذ طلب التاجر اليدوي من البورتال مع رقم تتبع.
- حجز مخزون الشركة عند توجيه طلب `COMPANY_WAREHOUSE` ثم خصم الكمية وتصفير الحجز عند التنفيذ.
- إنشاء/تحديث سجل شحنة لكل `MerchantOrder` مع المخزن وشركة الشحن المختارين.
- المسوق يرى طلباته، عملاءه، عمولاته، وإحصائياته.
- رفض سحب أقل من الحد الأدنى وقبول سحب صحيح.
- الشركة ترى عمولات `AFFILIATE`, `MERCHANT`, و`PLATFORM`.
- شركة ثانية لا تستطيع قراءة أو تعديل موارد الشركة الأولى.

## فحص المتصفح

- Owner: تسجيل الدخول يفتح `/company-dashboard`، وقسم الأفليت والدروب شيبنج يعرض أدوات الإدارة.
- Affiliate: تسجيل الدخول يفتح `/affiliates/dashboard`، والقائمة تعرض أدوات الأفليت فقط، والروابط الممنوعة ترجع إلى `/affiliates/dashboard`.
- Merchant: تسجيل الدخول يفتح `/merchant-portal`، والقائمة تعرض أدوات التاجر فقط، والروابط الممنوعة ترجع إلى `/merchant-portal`.
- Merchant warehouse fulfillment: بورتال التاجر يعرض `طريقة التنفيذ: من مخزن الشركة` ويعرض على الطلب اسم المخزن وشركة الشحن ورقم التتبع.
- Public registration: صفحة تسجيل المسوق تعرض اسم الشركة وشروطها، وصفحة تسجيل التاجر تعرض حقول الهوية والتواصل فقط، بدون عمولة أو `Webhook URL` أو `autoFulfill`.

## فحص الموبايل

تم تشغيل smoke test على viewport `390x844` باستخدام Playwright:

- Affiliate: القائمة فتحت، أدوات المسوق فقط ظاهرة، لا يوجد page-level horizontal overflow، ولا توجد console errors.
- Merchant: القائمة فتحت، أدوات التاجر فقط ظاهرة، لا يوجد page-level horizontal overflow، ولا توجد console errors.
- `/profile` لكل دور يعرض حسابًا خارجيًا مبسطًا بدون تبويبات HR.

## إصلاحات UX أثناء الجولة

- إضافة ترجمة `sidebar.merchants` في العربية والإنجليزية.
- تحويل `affiliateManagement` في العربية من `Affiliate Management` إلى `إدارة المسوقين`.

## أوامر التحقق

- `node --check backend/scripts/uat/run-affiliate-dropshipping-uat.js`
- `node --check backend/services/fulfillmentService.js`
- `node --check backend/services/merchantService.js`
- `node --check backend/services/dropshippingService.js`
- `node --check backend/controller/purchaseOrderController.js`
- `node --check backend/routes/merchantRoutes.js`
- `node --check backend/routes/publicMerchantRoutes.js`
- `node --check backend/routes/merchantPortalRoutes.js`
- `node --check backend/routes/affiliateRoutes.js`
- `node backend/scripts/uat/run-affiliate-dropshipping-uat.js`
- `npx jest --runInBand --runTestsByPath tests/services/dropshippingService.test.js tests/services/merchantService.test.js tests/routes/merchantRoutes.test.js tests/routes/publicMerchantRoutes.test.js`
- `npx eslint src\pages\public\PublicMerchantRegister.tsx src\pages\public\__tests__\PublicMerchantRegister.test.tsx --ext .ts,.tsx`
- `npm test -- --runTestsByPath src\pages\public\__tests__\PublicMerchantRegister.test.tsx`
- `npx eslint src\App.tsx src\components\layout\Layout.tsx src\config\sidebar.ts src\pages\merchant-portal\MerchantPortalDashboard.tsx src\pages\profile\Profile.tsx src\utils\merchantAccess.ts src\utils\__tests__\merchantAccess.test.ts src\config\__tests__\sidebar.affiliateMerchant.test.ts src\__tests__\affiliateMerchantRoutes.test.ts --ext .ts,.tsx`
- `npm test -- --runTestsByPath src\utils\__tests__\merchantAccess.test.ts src\config\__tests__\sidebar.affiliateMerchant.test.ts src\__tests__\affiliateMerchantRoutes.test.ts`
- `npm run build`

## ملاحظات غير حاجزة

- `npm run build` نجح، مع تحذيرات Vite المعروفة عن حجم بعض chunks، وتعطيل minify افتراضيًا على Windows، وملفات Geist التي تتحل وقت التشغيل.
- Jest نجح `12/12` مع تحذيرات غير حاجزة: `ts-jest isolatedModules` و`punycode` deprecation.

## جولة متابعة - 2026-05-02

- تم تشغيل API UAT كامل مرة أخرى على شركة جديدة بدون حذف أي بيانات.
- الشركة: `Codex Affiliate UAT 20260502021340`
- Company ID: `cmonpjrx90000vpq4mru3bw3l`
- Slug: `owner-codex-affiliate-full-uat-20260502021340`
- التقرير الخام: `backend/tmp/codex-affiliate-full-uat-20260502021340.json`
- نتيجة API UAT: `36/36 PASS`

### Browser/Desktop Follow-Up

- Owner: تسجيل الدخول إلى `/company-dashboard` نجح، والقائمة تعرض أدوات إدارة الأفليت والدروب شيبنج للشركة:
  `إدارة المسوقين`, `الأكشن السريع`, `إدارة التجار`, `العمولات`, `إعدادات النظام`.
- Affiliate: تسجيل الدخول يفتح `/affiliates/dashboard`، والقائمة تعرض أدوات المسوق فقط، والروابط الممنوعة `/company-dashboard`, `/orders`, `/settings`, `/customers`, `/merchant-portal`, `/merchants` تعيد المستخدم إلى `/affiliates/dashboard`.
- Merchant: تسجيل الدخول يفتح `/merchant-portal`، والقائمة تعرض أدوات بورتال التاجر فقط، والروابط الممنوعة `/company-dashboard`, `/orders`, `/settings`, `/customers`, `/affiliates/dashboard`, `/merchants` تعيد المستخدم إلى `/merchant-portal`.
- Public affiliate registration: صفحة `affiliate-register/owner-codex-affiliate-full-uat-20260502021340` تعرض اسم الشركة وشروط البرنامج المخصصة.
- Public merchant registration: صفحة `/register/merchant` تعرض رسالة الدومين الرئيسي وحقل `رابط الشركة أو الـ slug`.

### Mobile Follow-Up

تم تشغيل smoke test آلي على viewport `390x844` لحسابي affiliate وmerchant:

- لا يوجد page-level horizontal overflow.
- قائمة المسوق تعرض أدوات المسوق فقط ولا تعرض أدوات الشركة/التاجر.
- قائمة التاجر تعرض أدوات البورتال فقط ولا تعرض أدوات الشركة/المسوق.
- لا توجد console errors مؤثرة أثناء الجولة.

## جولة إصلاح تسجيل التاجر العام - 2026-05-02

- سبب الجولة: صفحة تسجيل التاجر العام كانت تعرض `نسبة العمولة`, `Webhook URL`, و`autoFulfill` للتاجر، بينما القرار الصحيح أن الشركة هي التي تحدد هذه الإعدادات.
- تم حذف هذه الحقول من واجهة `/register/merchant`; الصفحة الآن تجمع فقط رابط/slug الشركة، اسم التاجر، البريد، كلمة المرور، الهاتف، والعنوان.
- تم تحصين endpoint العام `/api/v1/public/merchants/register` بحيث ينشئ التاجر من بيانات الهوية والتواصل فقط، ويتجاهل أي `commissionRate`, `webhookUrl`, `autoFulfill`, أو إعدادات تشغيلية لو أُرسلت يدويًا.
- تم تحديث UAT الكامل لإثبات حالتين: التاجر لا يستطيع تحديد إعداداته التشغيلية من التسجيل العام، والشركة تضبطها لاحقًا من إدارة التجار.
- أحدث UAT كامل بعد الإصلاح: `37/37 PASS`.
- الشركة: `Codex Affiliate UAT 20260502022638`
- التقرير الخام: `backend/tmp/codex-affiliate-full-uat-20260502022638.json`
- فحص المتصفح على `/register/merchant`: الحقول التشغيلية غير ظاهرة، ولا توجد console errors.

## جولة المخازن والشحن وطريقة التنفيذ - 2026-05-02

- سبب الجولة: النظام كان يحتاج تغطية صريحة لحالات أن التاجر يشحن بنفسه، أو أن الشركة تنفذ الطلب من مخازنها، مع دعم أكثر من مخزن وأكثر من شركة شحن.
- تم تثبيت طبقة تنفيذ الطلبات رسميًا في Prisma بإضافة `Shipment` وحقول `fulfillmentMode`, `fulfillmentSource`, `warehouseId`, و`shippingCompanyId` بدون حذف بيانات.
- تم إضافة خدمة تنفيذ موحدة تحجز مخزون التاجر في وضع `MERCHANT`، وتحجز/تخصم مخزون الشركة في وضع `COMPANY_WAREHOUSE`.
- تم ربط طلبات التجار بسجل شحنة يحمل شركة الشحن والمخزن ورقم التتبع والمرجع الخارجي.
- تم تحسين استلام أوامر الشراء بحيث يمكن زيادة مخزون مخزن محدد وإنشاء حركة مخزون `PURCHASE`.
- أحدث UAT كامل بعد الجولة: `38/38 PASS`.
- الشركة: `Codex Affiliate UAT 20260502031429`
- التقرير الخام: `backend/tmp/codex-affiliate-full-uat-20260502031429.json`
- فحص المتصفح: تسجيل دخول التاجر `UAT Manual Merchant 20260502031429` أظهر في `/merchant-portal` طريقة التنفيذ `من مخزن الشركة` وطلبًا مرتبطًا بـ `UAT Main Warehouse 20260502031429` و`UAT Economy Ship 20260502031429`.
- حدود القائمة الجانبية للتاجر سليمة: تظهر أدوات البورتال فقط ولا تظهر أدوات الشركة أو المسوق.

## ملاحظة نطاق الشحن

- النظام الآن يسجل شركة الشحن المختارة ويربطها بالشحنة ورقم التتبع.
- التكامل الآلي مع APIs شركات الشحن المختلفة وطباعة البوليصة لكل شركة ما زال طبقة تشغيلية لاحقة؛ الموجود حاليًا هو طبقة بيانات وتخصيص وتتبع آمنة داخل دورة الدروب شيبنج.
