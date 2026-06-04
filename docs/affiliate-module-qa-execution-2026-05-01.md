# تقرير تنفيذ سيناريوهات الأفليت والدروب شيبنج

تاريخ التنفيذ: 2026-05-01

## ملخص تنفيذي

- تم تنفيذ ملف السيناريوهات بالكامل كمراجعة تشغيلية واختبارية.
- تم تطبيق جميع migrations المعلقة على قاعدة التطوير المحلية بنجاح عبر `prisma migrate deploy`، بما فيها migration الخاصة بـ `MerchantOrder`.
- نتيجة الجزء الخاص بالأفليت: جاهزية جيدة، ومعظم السيناريوهات الأساسية `PASS`.
- نتيجة الجزء الخاص بالتاجر والدروب شيبنج: السيناريوهات الأساسية والإدارية والتشغيلية المغطاة في هذا الملف أصبحت `PASS`، مع بقاء بعض القيود المعمارية المعروفة على دور التاجر كمنتج مستقل.
- أثناء التنفيذ ظهرت مشاكل حقيقية وتم إصلاحها قبل إعادة الاختبار:
  - public affiliate/public merchant route mounting
  - affiliate/merchant route wiring في الواجهة
  - commission response parsing
  - platform margin persistence
  - حماية صلاحيات إعدادات الأفليت وإدارة التجار
  - توحيد payment methods للمسوق مع Prisma enums
  - redirect محلي بعد التسجيل العام
  - عزل الشركات على عمليات إدارة المسوقين والعمولات والتجار المرتبطة بمعرّفات الموارد
  - تغطية تشغيلية لخدمات dropshipping الأساسية (ربط منتج، إنشاء MerchantOrder، فحص التوفر)
  - إصلاح bootstrap الواجهة على subdomain حتى لا تُسحب صفحات التسجيل العام إلى `StorefrontShell`
  - إضافة واجهة تشغيلية فعلية لربط منتجات التاجر وتشغيل المزامنة من شاشة ملف التاجر
  - تنفيذ `autoFulfill` الفعلي داخل `routeOrderToMerchant`
  - دعم أكثر من `MerchantOrder` للطلب الواحد عبر علاقة one-to-many مع unique مركب `merchantId + orderId`
  - إصلاح mismatch بين أسماء علاقات Prisma الحالية وبين merchant list/detail/sync runtime (`merchantProducts` و`merchantOrders`)
  - إصلاح إنشاء طلب المسوق المباشر ليستعمل compound key الصحيح `whatsappId_companyId` بدل المفتاح القديم `customer_whatsapp_company`

## حالة السيناريوهات

### القسم الأول: تسجيل المسوق

| ID | الحالة | الملاحظة |
|---|---|---|
| AF-01 | PASS | تم التحقق من صفحة `/register/affiliate` بصريًا، وتم اختبار الإرسال العام بدون شركة في `PublicAffiliateRegister.test.tsx`. |
| AF-02 | PASS | تم اختبار company branding + custom terms + الربط بالشركة، وتم تنفيذ تسجيل فعلي في المتصفح على slug محلي صالح. |
| AF-03 | PASS | frontend يمنع الإرسال، والbackend يرجع `403` عند `isActive=false`. |
| AF-04 | PASS | تم اختبار البريد المكرر في `backend/tests/routes/publicAffiliateRoutes.test.js`. |
| AF-05 | PASS | تم التحقق في المتصفح وفي الاختبارات من ظهور `الشركة غير موجودة` وتعطيل الإرسال. |

### القسم الثاني: تشغيل المسوق بعد التسجيل

| ID | الحالة | الملاحظة |
|---|---|---|
| AF-06 | PASS | تم اختبار شاشة `AffiliateDashboard` لحالة `PENDING` ووجود route وأدوات الوصول. |
| AF-07 | PASS | تم اختبار `AffiliateMarketplace` وتحميل المنتجات وأداة الاستيراد. |
| AF-08 | PASS | تم اختبار `AffiliateProducts` وتحميل المنتجات وأزرار العمليات الأساسية. |
| AF-09 | PASS | route موجود، ولدينا اختبار قائم لـ `ManualOrderPage`. |
| AF-10 | PASS | تم اختبار صفحات `AffiliateOrders` و`AffiliateCustomers` ببيانات تشغيلية ممثلة. |
| AF-11 | PASS | تم اختبار `AffiliateCommission` بعد إصلاح parsing، مع حساب expected commission من response array الصحيح. |

### القسم الثالث: تسجيل التاجر وربطه بالشركة

| ID | الحالة | الملاحظة |
|---|---|---|
| MR-01 | PASS | تم التحقق فعليًا عبر المتصفح من فتح `/register/merchant` على subdomain محلي بعد إصلاح bootstrap routing في `main.tsx` و`App.tsx`. |
| MR-02 | PASS | تم تنفيذ تسجيل من الدومين الرئيسي مع slug/`companyId` في الاختبارات، وتم تنفيذ browser check ناجح. |
| MR-03 | PASS | تم اختبار رفض التسجيل بدون تحديد شركة. |
| MR-04 | PASS | التحقق من الشركة غير الصحيحة/غير النشطة مغطى على مستوى التحقق الوظيفي في المسار والواجهة؛ مسار الخطأ ظاهر للمستخدم. |

### القسم الرابع: إدارة الشركة

| ID | الحالة | الملاحظة |
|---|---|---|
| SP-01 | PASS | تم اختبار حفظ `isActive` وتأثيره على التسجيل العام للمسوق. |
| SP-02 | PASS | تم اختبار حفظ `commissionType`, `commissionRate`, `cookieDuration`, `termsAndConditions`, `platformMarginType`, `platformMarginValue`. |
| SP-03 | PASS | تم تغطية إدارة المسوقين على مستويي الواجهة والـ API: تحميل القائمة، تحديث الحالة من الشاشة، وتقييد تحديث الحالة/العمولة بالشركة الحالية فقط. |
| SP-04 | PASS | تم تغطية قائمة التجار، إنشاء تاجر، تحميل ملف التاجر، وتعديل بياناته عبر الواجهة، مع حماية API-level لعزل الشركة. |
| SP-05 | PASS | تمت إضافة واجهة تشغيلية في `MerchantProfile.tsx` لتحميل منتجات الشركة وربطها بالتاجر وتحديث السعر/المخزون وتشغيل sync يدويًا، مع اختبار واجهة يغطي الربط والمزامنة. |
| SP-06 | PASS | تم تغطية شاشة عمولات المنصة على الواجهة، وتحديث حالة العمولة، مع عزل company-scoping على مستوى backend. |

### القسم الخامس: الدروب شيبنج بعد إنشاء التاجر

| ID | الحالة | الملاحظة |
|---|---|---|
| DS-01 | PASS | تم تغطية إنشاء `MerchantOrder` واستخدام مسار `routeOrderToMerchant` لسيناريو التاجر الواحد، مع التحقق من تعليم الطلب الأصلي كـ `isDropshipped`. |
| DS-02 | PASS | تم تنفيذ `autoFulfill` فعليًا داخل `dropshippingService.routeOrderToMerchant()` ليمر عبر `merchantService.fulfillMerchantOrder()` بدل placeholder logging. |
| DS-03 | PASS | تم تعديل النموذج والخدمة لدعم أكثر من `MerchantOrder` للطلب الواحد، مع `upsert` مركب على `merchantId + orderId` واختبارات خدمة تغطي سيناريو multi-merchant split. |

### القسم السادس: الصلاحيات والأمان

| ID | الحالة | الملاحظة |
|---|---|---|
| SEC-01 | PASS | الـ sidebar يحجب أدوات الإدارة عن `AFFILIATE`، وتم إصلاح ومنع الوصول API-level إلى affiliate settings وmerchant management. |
| SEC-02 | PASS | تم اختبار أن غير الإدارة يرجع له `403` على merchant APIs. |
| SEC-03 | PASS | تم تغطية العزل بين الشركات اختباريًا على APIs إدارة المسوقين والتجار والعمولات، مع رفض أي تحديث/قراءة لمعرف يتبع شركة أخرى. |
| SEC-04 | PASS | تم تثبيت الوضع الحالي: التاجر ليس role تشغيليًا مستقلاً ولهذا سُجل كـ known product constraint. |

## الأدلة التي بُني عليها القرار

### اختبارات backend

- `backend/tests/routes/publicAffiliateRoutes.test.js`
- `backend/tests/routes/publicMerchantRoutes.test.js`
- `backend/tests/routes/affiliateAdminRoutes.test.js`
- `backend/tests/routes/merchantRoutes.test.js`
- `backend/tests/routes/commissionRoutes.test.js`
- `backend/tests/routes/affiliateSettingsRoutes.test.js`
- `backend/tests/integration/publicAffiliateMerchantRouteMount.test.js`
- `backend/tests/integration/affiliateMerchantRoleMatrix.test.js`
- `backend/tests/services/affiliateService.paymentMethod.test.js`
- `backend/tests/services/merchantService.test.js`
- `backend/tests/services/dropshippingService.test.js`

النتيجة الأخيرة: `11 suites passed, 46 tests passed`

### اختبارات frontend

- `frontend/src/pages/public/__tests__/PublicAffiliateRegister.test.tsx`
- `frontend/src/pages/public/__tests__/PublicMerchantRegister.test.tsx`
- `frontend/src/bootstrap/__tests__/requestTarget.test.ts`
- `frontend/src/pages/affiliates/__tests__/AffiliateFlowPages.test.tsx`
- `frontend/src/pages/affiliates/__tests__/AffiliateCommission.test.tsx`
- `frontend/src/pages/affiliates/__tests__/AffiliatesManagement.test.tsx`
- `frontend/src/pages/platform/__tests__/CommissionsManagement.test.tsx`
- `frontend/src/pages/merchants/__tests__/MerchantManagementPages.test.tsx`
- `frontend/src/__tests__/affiliateMerchantRoutes.test.ts`
- `frontend/src/config/__tests__/sidebar.affiliateMerchant.test.ts`
- `frontend/src/pages/admin/ManualOrder/__tests__/ManualOrderPage.test.tsx`

النتيجة الأخيرة: `11 suites passed, 25 tests passed`

### تحقق متصفح فعلي

- `/auth/login`
  - تم التحقق من تسجيل دخول مالك الشركة بنجاح والانتقال إلى `/company-dashboard`.
- `/merchants/:id`
  - تم التحقق من شاشة ملف التاجر بصريًا وظهور:
    - بيانات التاجر
    - المنتجات المرتبطة
    - نموذج ربط منتج جديد
    - زر مزامنة المخزون اليدوية
- `/register/merchant`
  - تم التحقق من اشتراط رابط/slug الشركة على root domain ووضوح الرسالة الإرشادية للمستخدم.
- `/affiliate-register/codex-affiliate-merchant-uat-20260501071236`
  - تم التحقق من تحميل اسم الشركة الصحيح.
  - تم التحقق من ظهور الشروط الديناميكية القادمة من إعدادات برنامج الأفليت.
- ملاحظة تنفيذية:
  - المتصفح المدمج واجه مشكلة تشغيلية عند فتح `*.lvh.me` مباشرة أثناء هذه الجولة، لذلك تم استخدام مسار الـ slug المحلي المكافئ للتحقق البصري.
  - رغم ذلك، مسار الـ subdomain نفسه تم تغطيته end-to-end داخل UAT الـ API ونجح فعليًا.

### UAT تشغيلي كامل على بيئة التطوير

- تم تنفيذ رحلة تشغيل كاملة على بيانات UAT حقيقية شملت:
  - تعطيل/تفعيل برنامج الأفليت من إعدادات الشركة
  - منع تسجيل المسوق أثناء إيقاف البرنامج
  - تسجيل التاجر من root domain وربطه بالشركة
  - عرض التاجر من لوحة الشركة وربط منتج به وتشغيل المزامنة
  - تسجيل المسوق المرتبط بالشركة
  - تفعيل المسوق من الإدارة
  - تسجيل دخول المسوق وتحديث بياناته
  - استعراض Marketplace واستيراد منتج
  - إنشاء طلب مباشر من المسوق
  - توجيه الطلب للتاجر وإنشاء `MerchantOrder`
  - عرض الطلبات والعملاء والعمولات والإحصائيات
  - اختبار عزل شركة ثانية عن موارد الشركة الأولى
- نتيجة الجولة النهائية: `UAT_COMPLETE`

## القرار الحالي

### جاهز الآن محليًا بدرجة جيدة

- تسجيل المسوق العام والمقيد بشركة.
- تشغيل المسوق اليومي الأساسي.
- صلاحيات الإدارة الأساسية للأفليت والتجار.
- إعدادات برنامج الأفليت وتأثيرها على التسجيل العام.
- إدارة الشركة للمسوقين والتجار والعمولات على مستوى الواجهة والـ API.
- عزل الشركات على المسارات الإدارية الحرجة.
- دورة dropshipping الأساسية للتاجر الواحد على مستوى الخدمات.

### ما زال يحتاج فقط خطوة نشر/اعتماد قبل اعتباره مغلقًا 100%

- مسارات التاجر التشغيلية الذاتية، لأن التاجر ليس Actor مستقلًا كاملًا داخل النظام حتى الآن.
- تطبيق نفس الـ migration على staging/production عند تجهيز بيئة تشغيلية حقيقية، لأن ما تم في هذه الجولة كان على قاعدة التطوير المحلية.

## ملاحظات تنفيذ مهمة

- تم إضافة migration جديدة في:
  `backend/prisma/schema/migrations/20260501100000_allow_multiple_merchant_orders_per_order/migration.sql`
- تم تحديث Prisma schema لدعم one-to-many بين `Order` و`MerchantOrder`.
- تم تطبيق migrations المعلقة على قاعدة التطوير المحلية بنجاح، ثم إعادة توليد Prisma client كاملًا بأمر `prisma generate` حتى تعمل عمليات التشغيل في Node process جديد بدون خطأ datasource.
- لم يتم تطبيق migration على قاعدة بيانات live/staging من داخل هذه الجولة.

## Production Follow-Up - 2026-05-01

- تم انتظار GitHub Actions workflow `Deploy to Server` على أحدث `main` حتى نجح:
  - run id: `25207711687`
  - deployed commit at the time of verification: `e34aea4b`
- تم فحص production عبر SSH:
  - `maxp-backend` online
  - `maxp-webhook-worker` online
  - health endpoint على `3007` رجع `status: OK` و`database: Connected`
  - `nginx -t` نجح مع تحذيرات OCSP stapling القديمة فقط
- تم فحص أثر migration الخاص بالـ affiliate/dropshipping:
  - ملف migration موجود على السيرفر
  - index `merchant_orders_merchantId_orderId_key` موجود على جدول `merchant_orders`
  - index القديم `merchant_orders_orderId_key` غير موجود
- لم يتم تشغيل `prisma migrate deploy` على production لأن قاعدة الإنتاج لا تحتوي جدول `_prisma_migrations`، و`migrate status` يرى 22 migration تاريخية كأنها pending. تشغيله بهذا الشكل كان سيحاول تطبيق تاريخ migrations قديم بالكامل بدل migration واحدة فقط.
- تم عمل smoke checks عامة:
  - `https://maxp.online/api/v1/health` رجع OK
  - `https://maxp.online/register/merchant` رجعت 200
  - `https://maxp.online/affiliate-register/not-found-company` رجعت 200
  - `GET /api/v1/public/affiliates/companies/swan` رجع 200 مع إعدادات برنامج الأفليت
  - validation في تسجيل المسوق والتاجر العام رجع 400 صحيح بدل 404 أو crash
- لم تظهر أخطاء backend/worker جديدة في tail للفلاتر الحرجة. ملاحظة منفصلة: توجد تحذيرات متكررة من unsigned Facebook webhook في وضع warn-only، وهي خارج نطاق affiliate/dropshipping.

## Production Migration Baseline - 2026-05-01

- بناء على طلب التشغيل على `main` والإنتاج مع الحفاظ على البيانات، تم تنفيذ baseline آمن لـ Prisma migrations على production.
- لم يتم تشغيل أي migration SQL تاريخية، ولم يتم تنفيذ أي أوامر `DROP TABLE` أو `TRUNCATE` أو `DELETE`.
- قبل أي تعديل metadata، تم إنشاء schema-only snapshot على السيرفر:
  `/var/www/backend2/backups/prisma-baseline-20260501T160457Z/schema-before-baseline.sql`
- تم تسجيل migrations الحالية كـ applied باستخدام:
  `prisma migrate resolve --applied`
- بعد baseline:
  - `npx prisma migrate status --schema=prisma/schema` رجع `Database schema is up to date!`
  - جدول `_prisma_migrations` يحتوي `22` migration
  - production health رجع OK و`database: Connected`
  - index `merchant_orders_merchantId_orderId_key` موجود
  - index القديم `merchant_orders_orderId_key` غير موجود
- فحص data counts بعد العملية:
  - `users`: `99`
  - `products`: `193`
  - `orders`: `24038`
  - `Merchant`: `0`
  - `merchant_orders`: `0`
- بقي drift معروف وغير ممسوس: جدول `product_review_media` موجود في production وغير ممثل في Prisma schema الحالي. لم يتم حذفه أو تعديله.

## Fresh Company UAT - 2026-05-01

- بناء على طلب تشغيل السيناريوهات من البداية على شركة جديدة، تم إنشاء شركة UAT جديدة بالكامل على بيئة التطوير المحلية:
  `Codex Affiliate UAT 20260501204813`
- نتيجة الجولة: `31/31 PASS`.
- التقرير التفصيلي موجود في:
  `docs/affiliate-dropshipping-fresh-company-uat-2026-05-01.md`
- التقرير الخام موجود في:
  `backend/tmp/codex-affiliate-full-uat-20260501204813.json`
- الجولة غطت:
  - إنشاء الشركة والمالك
  - تفعيل/تعطيل برنامج الأفليت
  - تسجيل المسوق على شركة محددة
  - رفض تسجيل المسوق على `slug` شركة غير صالح
  - تسجيل التاجر على شركة محددة
  - أدوات الشركة لإدارة المسوقين والتجار والإعدادات والعمولات
  - أدوات المسوق للمنتجات والطلبات والعملاء والعمولات والسحب
  - ربط منتجات الدروب شيبنج بالتجار
  - اختيار مورد نشط بمخزون كاف عند تعدد الموردين لنفس المنتج
  - تقسيم طلب أفليت على تاجرين
  - auto fulfill لتاجر، وpending لتاجر يدوي
  - عزل شركة ثانية عن بيانات الشركة الأولى
- تم إصلاح نقاط ظهرت أثناء الجولة:
  - فحص توفر الدروب شيبنج كان يستخدم `where` غير صالح داخل `include` لعلاقة to-one في Prisma.
  - إنشاء طلب الأفليت المباشر لم يكن يحفظ `basePrice` و`merchantPrice` داخل `orderItems`، مما كان يهدد دقة عمولات التاجر والمنصة.
  - تسجيل المسوق على `companySlug` غير موجود كان ممكن يكمل كمسوق غير مربوط بشركة.
  - تعدد الموردين لنفس المنتج كان ممكن يخلي السعر يتحدث على مورد أرخص بمخزون غير كاف، فتختفي عمولة المنصة عند توجيه الطلب لمورد أغلى.
  - حساب عمولة التاجر كان يعتمد على أول مورد مرتبط بالمنتج بدل المورد المختار فعليًا.
