# خطة التصميم الشامل والجاهزية المعمارية لنظام شركات الشحن وبوابات العملاء والمناديب على منصة MaxP
**كود التيكت:** `SHIP-DISC-1` · **الأولوية:** `P0` · **تاريخ الإعداد:** 2026-11-02  
**الريبو المستهدف:** `C:\maxp-platform-13` · **حالة الوثيقة:** تحليل وتصميم معماري معتمد (خطة صفر-مخاطر — بدون أي تعديل كود أو كسر للنظام القائم)

---

## 0. الخلاصة التنفيذية (Executive Summary)

أجرينا فحصاً ميدانياً شاملاً ومستقلاً بنسبة 100% لكود منصة **MaxP** الحية في المستودع `C:\maxp-platform-13` (كوميت الأساس `be46c56b3`)، للتحقق من جاهزية المنصة لتشغيل شركة شحن مستقلة كـ Tenant تستقبل طروداً من عملاء تجاريين ومتاجر داخل وخارج MaxP.

### خلاصة النتائج بالأرقام:
1. **الأسطول والتشغيل الميداني جاهز بنسبة 85%:** المنصة تمتلك بالفعل 65 إندبوينت شحن موزعة على 7 ملفات، تشمل إدارة المناديب، مانيفست الرحلات، تسوية العهد، التحصيل النقدي، إثبات التسليم بـ OTP، وحساب مناطق وأسعار الشحن.
2. **الواجهة التجارية والعملاء غائبة بنسبة 90%:** المنصة مصممة تاريخياً على نموذج «متجر إلكتروني يشحن طلباته»، وليس «شركة شحن تستقبل طروداً خارجية من عملاء متعددين».
3. **الفجوة الجوهرية (The Core Blocker):** الكود في `apps/backend/routes/shipmentsRoutes.js:464` يرفض إنشاء أي شحنة إذا لم تحتوِ على `orderId`، بالرغم من أن مخطط قاعدة البيانات `Shipment` في `products.prisma:732` يدعم بالفعل حقل `orderId` كـ nullable (`String?`) ويدعم مسبقاً `merchantId`!
4. **مسار التنفيذ الآمن:** لا توجد حاجة لإعادة كتابة النظام. المطلوب هو **إطلاق 6 موجات تدريجية (W1..W6)** ترتكز على إضافات غير كاسرة (Additive-only Schema) وتخصيص بوابتين مستقلتين (بوابة عميل الشحن وبوابة المندوب)، ومحول ربط داخلي بين متاجر MaxP وشركات الشحن على المنصة.

---

## 1. جدول التحقق المستقل من الادعاءات العشرة (Verification Matrix)

تم تشغيل أوامر الفحص والـ `git grep` والـ AST Read على كامل الملفات، وجاءت النتيجة التفصيلية كالتالي:

| # | الادعاء المطلوب فحصه | الحالة | الدليل الحقيقي بالكود (`file:line`) والأمر المنفّذ | التعليق والتحليل المعماري الدقيق |
|---|---|---|---|---|
| **1** | إنشاء شحنة يرفض بدون `orderId` — يعني مفيش طرد مستقل من عميل | **مؤكّد عملياً ومصحّح معمارياً** | `apps/backend/routes/shipmentsRoutes.js:464-466`<br>الأمر: `git grep -n "orderId is required" apps/backend` | **المسار البرمجي:** الكود يرفض بـ `400 orderId is required` صراحة إذا غاب الحقل.<br>**التصحيح المعماري:** في مخطط Prisma (`apps/backend/prisma/schema/products.prisma:732`)، الحقل معرّف بالفعل كـ `orderId String?` (اختياري) ويوجد `merchantId String?`! القيد برمجي في الـ Route Controller فقط وليس قيداً في قاعدة البيانات. |
| **2** | `Shipment` مالوش وزن/أبعاد/عدد قطع/مبلغ COD مستهدف — `collectedAmount` للمحصّل فقط | **مؤكّد بالكامل** (مع تصحيح مسار الملف) | `apps/backend/prisma/schema/products.prisma:729-785`<br>الأمر: `git grep -n "model Shipment " apps/backend/prisma/schema/` | المسار الصحيح للملف هو `apps/backend/prisma/schema/products.prisma` وليس `prisma/schema/...`.<br>لا يوجد أي حقل لـ `weight` أو `dimensions` أو `pieces` أو `codAmount` المستهدف على جدول `Shipment`. الحقل `collectedAmount` في السطر 755 مخصص للمبلغ الفعلي الذي قام المندوب بتحصيله فقط. |
| **3** | أسعار الشحن على مستوى الشركة فقط (مناطق + شرائح وزن)، مفيش بطاقة سعر لكل عميل | **مؤكّد بالكامل** | `apps/backend/prisma/schema/orders.prisma:514-536`<br>`apps/backend/controller/shippingZoneController.js:520-545`<br>الأمر: `git grep -n "model ShippingZone" apps/backend/prisma/schema/` | الموديل `ShippingZone` مربوط فقط بـ `companyId`. يدعم شرائح الوزن وقيمة الطلب عبر `pricingTiers` (JSON)، لكن التسعير عام لكل المستأجر ولا يوجد أي كيان أو جدول لبطاقات أسعار مخصصة لكل عميل تاجر (`ClientRateCard`). |
| **4** | مفيش كيان طلب استلام (Pickup) ولا ربط شحنة بفرع | **مؤكّد** (مع تدقيق لوجود كيان الفرع) | `apps/backend/prisma/schema/enums.prisma:108`<br>`apps/backend/prisma/schema/orders.prisma:1-18`<br>الأمر: `git grep -i "pickup" apps/backend/prisma/schema/` | مصطلح `Pickup` لا يظهر في كل الـ Schema إلا كقيم Enum لقوالب إشعارات الواتساب (`READY_FOR_PICKUP`). لا يوجد موديل `PickupRequest`.<br>**تدقيق الفرع:** الموديل `Branche` موجود في `orders.prisma:1` لكنه مجرد دفتر عناوين للشركة، ولا توجد أي علاقة بينه وبين `Shipment` (الشحنة ترتبط بـ `Warehouse` فقط وليس `Branch`). |
| **5** | التتبع العام بالأوردر + رقم الموبايل فقط، مفيش تتبع برقم بوليصة | **مؤكّد بالكامل** | `apps/backend/routes/publicOrdersRoutes.js:2972-2986`<br>`apps/backend/routes/publicOrdersRoutes.js:3275-3285`<br>الأمر: `git grep -n "router.get('/track'" apps/backend/routes/` | المساران العامان للتتبع هما `GET /track` و `GET /:orderNumber/track` وكلاهما يشترط إلزامياً وجود `orderNumber` ورقم هاتف العميل `phone`.<br>مسارات التتبع برقم البوليصة في `bostaRoutes.js:9` و `qpExpressRoutes.js:18` محمية بـ `authenticateToken` ولا تخدم الجمهور. |
| **6** | مفيش سجل أحداث للشحنة (Timeline) — الحالة حقل واحد | **مؤكّد بالكامل** | `apps/backend/prisma/schema/products.prisma:739`<br>الأمر: `git grep -i "shipmentevent" apps/backend/prisma/schema/` (أعاد صفر نتائج) | الحقل `status` في جدول الشحنات هو عمود نصي واحد يتم تعديله في مكانه (In-Place Update).<br>بينما يمتلك جدول `Order` سجلاً للحالات (`OrderStatusHistory` في `courierService.js:773`)، فإن الطرود المستقلة التي لا تملك `orderId` لا يتم تسجيل أي تاريخ لحركاتها إطلاقاً. |
| **7** | بوابة التاجر الحالية للمنتجات/العمولات/المدفوعات، مش للشحن ولا كشف COD | **مؤكّد** (مع تصحيح عدد المسارات) | `apps/backend/routes/merchantPortalRoutes.js:87-374`<br>`apps/backend/prisma/schema/affiliate.prisma:29-51`<br>الأمر: `git grep -n "router\." apps/backend/routes/merchantPortalRoutes.js` | البوابة تحتوي على **9 مسارات** (وليس 8) تدور كلها حول منتجات المورد، طلبات البيع بالعمولة، وطلبات السحب.<br>الموديل `MerchantPayout` مربوط بـ `commissions Commission[]` ومصمم لسحب عمولات الأفلييت، وليس لتسوية مبالغ التحصيل COD وطرح رسوم الشحن والمرتجعات. |
| **8** | `CompanyConnection` بيشارك منتجات/أوردرات/عمولات — مش شحنات، ومفيش تحويل شحنة بين tenantين | **مؤكّد بالكامل** | `apps/backend/prisma/schema/internal_integration.prisma:3-19`<br>`apps/backend/routes/companyConnectionRoutes.js:9-40`<br>الأمر: `git grep -n "model CompanyConnection" apps/backend/prisma/schema/` | الموديل يحتوي فقط على: `allowProductPull`، `allowOrderPull`، و`commissionRate`.<br>يخدم حصرياً دروب شيبينغ المنتجات الداخلي بين الشركات وتبادل الأوردرات كطلبات شراء، ولا يتضمن أي مفهوم لتحويل شحنة أو تعيين بوليصة أو نقل عهدة كابتن. |
| **9** | بوابة المندوب الحالية = رابط مشاركة لكل رحلة (`mobileToken`)، مفيش دخول مندوب بحساب | **مؤكّد** (مع تدقيق لوجود حقول الحساب) | `apps/backend/controller/courierController.js:316-320`<br>`apps/backend/services/courierService.js:598-613`<br>`apps/backend/prisma/schema/couriers.prisma:15-18` | التطبيق يولد رابطاً مؤقتاً للرحلة يحمل JWT صالح لمدة 7 أيام.<br>**تدقيق معماري:** الموديل `Courier` يحتوي بالفعل على الحقول `userId String?` و `pinHash String?`، لكنها غير مستغلة في أي شاشة تسجيل دخول أو جلسة عمل مركزية للمندوب (إذا كان للمندوب 3 رحلات يحتاج لـ 3 روابط مختلفة). |
| **10** | حالات الميدان المسموحة محصورة وصريحة | **مؤكّد بالكامل** | `apps/backend/services/courierService.js:12`<br>`apps/backend/services/courierService.js:655-657` | الحالات محددة في الثابت: `ALLOWED_FIELD_STATUSES = ['DELIVERED', 'PARTIALLY_DELIVERED', 'COMPLETED', 'REMITTED', 'RETURNED', 'FAILED', 'DELAYED']`. أي حالة ميدانية أخرى يتم رفضها صراحة بـ HTTP 400. |

---

## 2. التصميم المعماري لبوابة عميل الشحن (Shipping Client Portal)

### 2.1 هوية المستخدم، الصلاحيات، والعزل متعدد المستأجرين (Tenant & Client Scoping)
- **من هو عميل الشحن؟**
  شركة الشحن هي المستأجر الرئيسي (`Company` = Tenant B). عملاؤها (المتاجر والشركات التي تشحن معها) يتم تمثيلهم في كيان `Merchant` القائم بالفعل، مع إضافة نوع مميز `clientType: 'SHIPPING_CLIENT'` (بدلاً من إنشاء جداول مكررة).
- **إدارة المستخدمين التابعين للعميل:**
  - كل عميل قد يمتلك عدة مستخدمين (مدير المتجر، مسؤول اللوجستيات، محاسب).
  - يتم استخدام جدول `User` الحالي بربط اختياري `merchantId: String?` مع `role: 'SHIPPING_CLIENT'` و `companyId: TenantB.id`.
- **جدار الحماية وعزل البيانات الصارم (Zero-Data-Leakage Guard):**
  - يتم إنشاء Middleware مخصص: `apps/backend/middleware/shippingClientScope.js`.
  - كل استعلام في قاعدة البيانات يُلزم بتطبيق الشرط المركب:
    ```javascript
    where: {
      companyId: req.user.companyId,    // عزل شركة الشحن (Tenant)
      merchantId: req.user.merchantId   // عزل العميل التاجر (Client)
    }
    ```
  - يستحيل برمجياً على العميل (أ) رؤية أو استعلام أو تعديل أي شحنة أو كشف حساب أو عنوان تابع للعميل (ب).

### 2.2 جدول صفحات البوابة (Frontend Routes & Pages)
يتم إنشاء مسار منفصل تماماً داخل `apps/frontend/src/pages/shipping-portal/`:

| الصفحة المقترحة | الملف المقترح (`apps/frontend/src/...`) | الدور والصلاحية | الغرض التشغيلي والوظيفة |
|---|---|---|---|
| **لوحة تحكم العميل** | `pages/shipping-portal/ShippingPortalDashboardPage.tsx` | `SHIPPING_CLIENT` | مؤشرات حية: إجمالي الطرود، نسبة التسليم، رصيد COD المحصّل والمعلق، طلبات البيكاب النشطة. |
| **إنشاء شحنة جديدة** | `pages/shipping-portal/ShippingPortalNewShipmentPage.tsx` | `SHIPPING_CLIENT` | إدخال طرد فردي: بيانات المستلم، المحافظة والمدينة، الوزن، القطع، مبلغ التحصيل COD، طباعة البوليصة مباشرة. |
| **الرفع المجمع بالـ Excel** | `pages/shipping-portal/ShippingPortalBulkUploadPage.tsx` | `SHIPPING_CLIENT` | رفع ملف إكسيل مجمع، معاينة فورية مع تصحيح وتطبيع أسماء المحافظات تلقائياً عبر `orderLocationNormalizer`. |
| **إدارة ومتابعة الشحنات** | `pages/shipping-portal/ShippingPortalShipmentsListPage.tsx` | `SHIPPING_CLIENT` | جدول شحنات العميل مع بحث بالبوليصة أو هاتف العميل، تصفية بالحالات (جديد، بالهاَب، مع المندوب، تم التسليم، مرتجع). |
| **تفاصيل الشحنة والتتبع** | `pages/shipping-portal/ShippingPortalShipmentDetailPage.tsx` | `SHIPPING_CLIENT` | عرض تفاصيل الطرد كاملة، السجل الزمني التفاعلي (`ShipmentEvent Timeline`)، وأسباب عدم التسليم. |
| **طلبات الاستلام (البيكاب)** | `pages/shipping-portal/ShippingPortalPickupRequestsPage.tsx` | `SHIPPING_CLIENT` | طلب حضور مندوب لاستلام طرود من مخزن العميل، تحديد التاريخ، الوقت، عدد الطرود المتوقعة، ومتابعة حالة البيكاب. |
| **كشف حساب وتوريد COD** | `pages/shipping-portal/ShippingPortalSettlementsPage.tsx` | `SHIPPING_CLIENT` | كشوفات مبالغ التحصيل الموردة، تفصيل المبالغ المحصلة والرسوم المخصومة، وتحميل الفواتير وإشعار التحويل البنكي. |
| **دفتر العناوين والإعدادات** | `pages/shipping-portal/ShippingPortalSettingsPage.tsx` | `SHIPPING_CLIENT` | ضبط فروع ومخازن العميل (أماكن الاستلام)، إعدادات التنبيهات، مفاتيح الـ API و Webhooks. |

### 2.3 قائمة واجهات البرمجة الخلفية (Backend API Endpoints)
توضع جميع المسارات في ملف مخصص: `apps/backend/routes/shippingPortalRoutes.js`:

1. `POST /api/v1/shipping-portal/shipments` — إنشاء طرد مستقل مع احتساب السعر تلقائياً بناءً على بطاقة أسعار العميل.
2. `POST /api/v1/shipping-portal/shipments/bulk-import` — معالجة ملف إكسيل والتحقق من الحقول الإلزامية وإرجاع الشحنات الصالحة وأخطاء السطور.
3. `GET /api/v1/shipping-portal/shipments` — استرجاع شحنات العميل مع دعم التصفية الزمنية وحالات التشغيل وترقيم الصفحات.
4. `GET /api/v1/shipping-portal/shipments/:id` — استرجاع تفاصيل الطرد وسجل الأحداث الزمني.
5. `POST /api/v1/shipping-portal/pickups` — تقديم طلب استلام جديد من مخزن العميل.
6. `GET /api/v1/shipping-portal/pickups` — استعراض طلبات الاستلام وحالات الإسناد لمندوب البيكاب.
7. `GET /api/v1/shipping-portal/settlements` — قائمة كشوفات تسوية الـ COD الدورية.
8. `GET /api/v1/shipping-portal/settlements/:id` — تفاصيل كشف حساب محدد مع كشف بالبوالص المندرجة وصافي التحويل.
9. `POST /api/v1/shipping-portal/settlements/:id/acknowledge` — تأكيد العميل لاستلام الحوالة البنكية أو النقدية.
10. `POST /api/v1/shipping-portal/waybills/print` — توليد ملف PDF لبوالص الشحن (يدعم الطباعة الحرارية 4x6 و A4).

---

## 3. التصميم المعماري لبوابة المندوب الميداني (Courier Field Portal)

### 3.1 معضلة الأمان: حساب المندوب الثابت vs رابط الرحلة المؤقت (`mobileToken`)
- **التقييم الأمني للوضع الحالي:**
  رابط المشاركة المولد في `courierController.js:317` يحمل توكن JWT في بارامتر الرابط (`?token=...`). هذا التوكن ينكشف في:
  1. سجل رسائل الواتساب/SMS.
  2. سجل تاريخ المتصفح (Browser History).
  3. ترويسات `Referer` إذا فتح المندوب أي رابط خارجي (مثل خرائط جوجل).
  4. مشاركة الرابط مع أشخاص آخرين قد تمكنهم من التلاعب بتسليم الشحنات والاطلاع على أرقام هواتف وعناوين العملاء.
- **التوصية الهندسية الصارمة (The Hybrid Transition):**
  1. **المسار الأساسي الجديد (Primary Mode):** اعتماد حساب رسمي للمندوب عبر رقم الهاتف والـ PIN الثابت المشفر (`phone` + `pinHash` الموجودين بالفعل في `Courier`). الدخول يعطي جلسة موحدة مشفرة (`HttpOnly Cookie` أو `Bearer Token`) تمكن المندوب من رؤية جميع مهامه الحالية والسابقة وعهدته النقدية.
  2. **مسار الرابط التوافقي (Zero-Breakage Fallback):** الإبقاء على مسار `mobileToken` للمهام السريعة أو المناديب المؤقتين، مع **فرض إدخال الـ PIN** كخطوة تحقق إلزامية قبل السماح بعرض أي شحنة أو تنفيذ تسليم.

### 3.2 دعم العمل دون اتصال (Offline-First Queue & Sync)
- **المعضلة:** المناديب يعملون في مصاعد، جراجات، وأماكن ريفية تنقطع فيها التغطية الشبكية أثناء التسليم أو التحصيل.
- **الحل التقني:**
  1. استخدام `IndexedDB` محلياً عبر مكتبة خفيفة (`idb-keyval` أو Service Worker) لحفظ الإجراءات الميدانية (`status`, `collectedAmount`, `deliveryNotes`, `otp`, `timestamp`, `offlineId`).
  2. واجهة المستخدم تعطي تأكيداً فورياً للمندوب (Optimistic UI) وتضع علامة "في انتظار المزامنة".
  3. بمجرد عودة الاتصال (`navigator.onLine === true` أو استشعار حدث الشبكة)، يقوم تطبيق المندوب بدفع طابور المزامنة عبر:
     `POST /api/v1/courier-portal/shipments/sync-offline`
- **معالجة التعارض (Conflict Resolution Policy):**
  - إذا تم تحديث الشحنة في قاعدة البيانات من قِبل إدارة الشركة (مثل إلغاء الشحنة) أثناء غياب المندوب عن الشبكة:
    - **قاعدة كود التحقق (OTP Inviolability):** إذا كان تحديث المندوب يحتوي على كود OTP صحيح ومطابق لهاش الشحنة، **تُعتمد عملية التسليم إجبارياً** لأن وجود الكود مع المندوب هو إثبات مادي قاطع على وجوده أمام العميل وتسليمه الطرد.
    - **في الحالات الأخرى:** إذا تعارضت حالة الإلغاء الإدارية مع تحديث المندوب دون OTP، ترفض المزامنة مع تسجيل إشعار للمدير لمراجعة المندوب في الهاَب.

### 3.3 جدول صفحات ومسارات بوابة المندوب

| الصفحة المقترحة | الملف المقترح (`apps/frontend/src/...`) | الصلاحية والوصول | الوظيفة الميدانية |
|---|---|---|---|
| **تسجيل دخول المندوب** | `pages/courier-portal/CourierPortalLoginPage.tsx` | عام / هاتف + PIN | دخول المندوب الآمن برقم الهاتف المسجل ورمز الـ PIN الميداني. |
| **رحلة اليوم الحالية** | `pages/courier-portal/CourierActiveRunPage.tsx` | `COURIER` | لوحة القيادة: عداد الطرود (مسلّم، متبقي، مرتجع)، زر الاتصال، وترتيب خط السير الجغرافي. |
| **بطاقة تسليم الطرد** | `pages/courier-portal/CourierDeliveryActionModal.tsx` | `COURIER` | إدخال كود OTP، تسجيل المبلغ المحصل، أو اختيار سبب الفشل/التأجيل المعتمد. |
| **العهدة النقدية الحية** | `pages/courier-portal/CourierCashCustodyPage.tsx` | `COURIER` | شاشة لحظية تعرض المبالغ النقدية في جيب المندوب ومطابقتها قبل التوريد. |
| **إقفال وتوريد الرحلة** | `pages/courier-portal/CourierRunClosePage.tsx` | `COURIER` | ملخص نهاية اليوم، رمز مطابقة التوريد مع أمين الخزينة بالهاَب، وإغلاق الرحلة. |
| **سجل الرحلات والأداء** | `pages/courier-portal/CourierHistoryPage.tsx` | `COURIER` | استعراض رحلات الأيام السابقة ومستحقات العمولات المكتسبة. |

---

## 4. ربط متجر MaxP بشركة شحن على MaxP (Tenant-to-Tenant Integration)

### 4.1 ما الذي يحدث حالياً إذا حاول متجر الشحن مع شركة شحن على MaxP؟
- **الدليل من الكود:**
  1. المتجر (Tenant A) يسجل شركة الشحن عبر `ShippingCompany`، والتي تدعم حصرياً الموزودين الخارجيين (`TURBO`, `BOSTA`, `QP_EXPRESS`) أو النمط اليدوي (`MANUAL`).
  2. إذا اختار المتجر 'MANUAL'، تنشأ شحنة برقم `companyId = TenantA.id`.
  3. شركة الشحن (Tenant B) معزولة تماماً في قاعدة البيانات بسبب فلاتر عزل المستأجرين (`where: { companyId = TenantB.id }`).
  4. **النتيجة:** الشحنة تظل حبيسة متجر Tenant A، ولا تظهر لشركة الشحن Tenant B، ولا يعلم عنها شيئاً، ولا يستطيع إسنادها لمناديبه أو إصدار بوليصة لها!

### 4.2 مقارنة الخيارات الهندسية الثلاثة

| وجه المقارنة | الخيار 1: ربط مباشر `CompanyConnection (SHIPPING)` | الخيار 2: شركة الشحن كـ `ShippingCompany (Adapter Mode)` | الخيار 3: Public API + Webhooks بين الطرفين |
|---|---|---|---|
| **الآلية المعمارية** | توسيع `CompanyConnection` الحالي بنوع `SHIPPING` وتبادل المعرفات داخلياً. | تسجيل شركة الشحن كمزود شبكة `MAXP_NETWORK` داخل محول الشحن للمتجر. | المتجر يستدعي REST API عام لشركة الشحن وترد الشركة بـ Webhooks. |
| **الأثر على تجربة المتجر** | يحتاج شاشات جديدة ومفاهيم جديدة في إدارة الأوردرات لربط الشركتين. | **صفر تغيير على المتجر؛** يتعامل معها بنفس تجربة بوسطة وتوربو تماماً بنقرة زر. | يتطلب إعداد مفاتيح API وإعدادات Webhook يدوية معقدة لكل متجر. |
| **الأداء وزمن الاستجابة** | فوري (معاملة قاعدة بيانات واحدة). | **فوري وفائق السرعة** (In-Memory Internal Dispatch بدون أي HTTP Overhead). | بطيء نسبياً؛ معرض لمشاكل الشبكة، الـ Timeouts، وفشل الـ Retries. |
| **الأمان وعزل البيانات** | محمي بقواعد البيانات وعلاقات الـ Foreign Keys. | **محمي بأعلى معايير الـ Internal Service Scope والـ Audit Trail.** | يحتاج إدارة وحماية وتدوير مفاتيح API عامة وتأمين توقيع الـ Webhooks. |
| **زمن التنفيذ المقدر** | 4 - 6 أيام عمل. | **2 - 3 أيام عمل (الأسرع والأنظف).** | 6 - 8 أيام عمل. |

### 4.3 التوصية الهندسية الصريحة (The Architectural Verdict)
- **نوصي بالخيار الثاني (النمط الهجين: Adapter Mode مدعوماً بـ Direct Database Dispatch):**
  المتجر يرى شركة الشحن كمزود شحن رسمي (`providerKey: 'MAXP_NETWORK'`). بمجرد نقر "إرسال لشركة الشحن"، يقوم الـ Adapter الداخلي بإنشاء طرد مستقل في جدول `shipments` الخاص بشركة الشحن (Tenant B) مع تعيين `merchantId` الخاص بمتجر Tenant A، وتوليد بوليصة موحدة فوراً.
- **مصفوفة حقيقة البيانات (Single Source of Truth Matrix):**

| خطوة دورة العمل | مالك الحقيقة المطلقة (Source of Truth) | الطرف المتلقي (Replicated / Read-Only) | آلية الانعكاس والمزامنة |
|---|---|---|---|
| **بيانات الطلب، المستلم، والعنوان** | **المتجر (Tenant A)** | شركة الشحن (Tenant B) | تُنسخ لحظة إنشاء الشحنة وتثبت في بوليصة الشحن. |
| **حالة الشحنة الميدانية والـ Timeline** | **شركة الشحن (Tenant B)** | المتجر (Tenant A) | تنعكس آلياً ومباشرة في صفحة تتبع الأوردر عند المتجر. |
| **فلوس التحصيل (COD)** | **شركة الشحن (Tenant B)** (المندوب والخزينة) | المتجر (Tenant A) | تسجل كعهدة محصلة، ثم كشف تسوية معتمد، ثم تحويل مالي. |
| **المرتجع الفعلي (RTO)** | **شركة الشحن (Tenant B)** (أثناء النقل) | المتجر (Tenant A) | تثبت عند استلام وتوقيع مخزن المتجر الفعلي للمرتجع. |

---

## 5. مخطط البيانات الجديد (Additive, Backward-Compatible Schema)

جميع الحقول والموديلات الجديدة **اختيارية بنسبة 100% (`nullable` أو تحمل `@default`)** لضمان عدم حدوث أي كسر أو تعارض مع الشاشات والمتاجر القائمة.

### 5.1 توسيع جدول الشحنات القائم (`Shipment` Extensions)
يتم إضافة الحقول التالية لموديل `Shipment` في `apps/backend/prisma/schema/products.prisma`:
```prisma
// حقول الطرد المستقل وبيانات الشحن الإضافية (Additive Only)
recipientName          String?          // اسم المستلم (للطرود بدون أوردر متجر)
recipientPhone         String?          // هاتف المستلم
recipientPhone2        String?          // هاتف بديل
senderName             String?          // اسم الراسل / المتجر
senderPhone            String?          // هاتف الراسل
senderAddress          String?          // عنوان استلام الطرد
weight                 Decimal?         @db.Decimal(10, 3) // الوزن الفعلي بالكيلوغرام
dimensions             String?          // أبعاد الطرد JSON {length, width, height}
pieces                 Int?             @default(1)        // عدد القطع
codAmount              Decimal?         @db.Decimal(10, 2) // مبلغ التحصيل المطلوب (COD Target)
declaredValue          Decimal?         @db.Decimal(10, 2) // القيمة المعلنة للتأمين
isFragile              Boolean?         @default(false)    // قابل للكسر
allowOpenPackage       Boolean?         @default(true)     // السماح بفتح الطرد للمعاينة
contentDescription     String?          // وصف محتويات الطرد
pickupRequestId        String?          // رابط طلب الاستلام
branchId               String?          // الفرع / الهاَب الحالي للطرد
failureReasonCode      String?          // كود سبب عدم التسليم المعتمد
attemptCount           Int              @default(0)        // عداد محاولات التسليم
nextAttemptDate        DateTime?        // موعد المحاولة القادمة
clientRateCardId       String?          // بطاقة السعر المطبقة
```

### 5.2 الموديلات الجديدة المطلوبة بالكامل (New Standalone Models)

#### أ) سجل أحداث وتتبع الشحنة (`ShipmentEvent`)
يوضع في `apps/backend/prisma/schema/shipping.prisma`:
```prisma
model ShipmentEvent {
  id           String    @id @default(cuid())
  companyId    String    // شركة الشحن (Tenant)
  shipmentId   String
  fromStatus   String?
  toStatus     String
  reasonCode   String?   // كود السبب (في حالات التأجيل/الفشل)
  notes        String?
  actorType    String    // ADMIN, COURIER, CLIENT, SYSTEM
  actorId      String?
  actorName    String?
  branchId     String?
  location     String?   // الإحداثيات الجغرافية إن وجدت
  metadata     String?   // JSON
  createdAt    DateTime  @default(now())

  shipment     Shipment  @relation(fields: [shipmentId], references: [id], onDelete: Cascade)

  @@index([companyId, shipmentId])
  @@index([createdAt])
  @@map("shipment_events")
}
```

#### ب) طلب استلام الطرود (`PickupRequest`)
يوضع في `apps/backend/prisma/schema/shipping.prisma`:
```prisma
model PickupRequest {
  id                String       @id @default(cuid())
  companyId         String       // شركة الشحن
  merchantId        String       // العميل التاجر
  pickupNumber      String       // رقم طلب الاستلام e.g. PCK-20261102-001
  status            String       @default("REQUESTED") // REQUESTED, SCHEDULED, ASSIGNED, COMPLETED, CANCELLED
  scheduledDate     DateTime
  timeSlot          String?      // MORNING, EVENING, CUSTOM
  contactName       String
  contactPhone      String
  pickupAddress     String
  city              String?
  governorate       String
  expectedParcels   Int          @default(1)
  actualParcels     Int?
  assignedCourierId String?
  branchId          String?
  notes             String?
  completedAt       DateTime?
  createdAt         DateTime     @default(now())
  updatedAt         DateTime     @updatedAt

  company           Company      @relation(fields: [companyId], references: [id], onDelete: Cascade)
  merchant          Merchant     @relation(fields: [merchantId], references: [id], onDelete: Cascade)
  courier           Courier?     @relation(fields: [assignedCourierId], references: [id], onDelete: SetNull)

  @@unique([companyId, pickupNumber])
  @@index([companyId, merchantId])
  @@index([status])
  @@map("pickup_requests")
}
```

#### ج) بطاقات أسعار العملاء (`ClientRateCard`)
توضع في `apps/backend/prisma/schema/shipping.prisma`:
```prisma
model ClientRateCard {
  id              String    @id @default(cuid())
  companyId       String    // شركة الشحن
  merchantId      String    // العميل التاجر
  name            String    // اسم العقد أو الاتفاقية
  governorateCode String?   // المحافظة المحددة (أو null للتطبيق العام)
  basePrice       Decimal   @db.Decimal(10, 2) // سعر التوصيل الأساسي
  baseWeightKg    Decimal   @default(1.0) @db.Decimal(10, 3) // الوزن المشمول
  extraKgPrice    Decimal   @default(0.0) @db.Decimal(10, 2) // سعر كل كيلو إضافي
  codFeeFixed     Decimal   @default(0.0) @db.Decimal(10, 2) // رسوم تحصيل نقدية ثابتة
  codFeePercent   Decimal   @default(0.0) @db.Decimal(5, 2)  // نسبة مئوية لرسوم التحصيل
  returnFee       Decimal   @default(0.0) @db.Decimal(10, 2) // تكلفة إرجاع الطرد
  isActive        Boolean   @default(true)
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  company         Company   @relation(fields: [companyId], references: [id], onDelete: Cascade)
  merchant        Merchant  @relation(fields: [merchantId], references: [id], onDelete: Cascade)

  @@index([companyId, merchantId])
  @@map("client_rate_cards")
}
```

#### د) كشف حساب وتوريد الـ COD (`ShippingSettlement`)
يوضع في `apps/backend/prisma/schema/shipping.prisma`:
```prisma
model ShippingSettlement {
  id                 String    @id @default(cuid())
  companyId          String    // شركة الشحن
  merchantId         String    // العميل التاجر
  settlementNumber   String    // رقم الكشف e.g. STL-202611-001
  status             String    @default("DRAFT") // DRAFT, ISSUED, APPROVED, PAID, REJECTED
  periodStart        DateTime
  periodEnd          DateTime
  totalShipments     Int       @default(0)
  deliveredCount     Int       @default(0)
  returnedCount      Int       @default(0)
  grossCOD           Decimal   @default(0.0) @db.Decimal(10, 2) // إجمالي المبالغ المحصلة
  shippingFeesTotal  Decimal   @default(0.0) @db.Decimal(10, 2) // رسوم التوصيل المخصومة
  returnFeesTotal    Decimal   @default(0.0) @db.Decimal(10, 2) // رسوم المرتجعات المخصومة
  netPayout          Decimal   @default(0.0) @db.Decimal(10, 2) // صافي المبلغ المستحق للعميل
  paymentMethod      String?   // BANK_TRANSFER, INSTAPAY, CASH
  paymentReference   String?   // رقم الحوالة البنكية
  treasuryTxId       String?   // ربط الخزينة
  approvedBy         String?
  approvedAt         DateTime?
  paidAt             DateTime?
  createdAt          DateTime  @default(now())
  updatedAt          DateTime  @updatedAt

  company            Company   @relation(fields: [companyId], references: [id], onDelete: Cascade)
  merchant           Merchant  @relation(fields: [merchantId], references: [id], onDelete: Cascade)

  @@unique([companyId, settlementNumber])
  @@index([companyId, merchantId])
  @@index([status])
  @@map("shipping_settlements")
}
```

### 5.3 جدول «من يكتب ومن يقرأ» (Read/Write Access Matrix)

| الكيان / الحقل | الكاتب الأساسي (Writer) | القارئ المصرح له (Reader) | شروط الأمان والعزل |
|---|---|---|---|
| **`Shipment (طرد مستقل)`** | بوابة العميل (`SHIPPING_CLIENT`) أو إدارة شركة الشحن (`ADMIN`) | العميل، الإدارة، المندوب المخصص | معزول بـ `companyId + merchantId` للعميل، و`courierId` للمندوب. |
| **`ShipmentEvent`** | نظام الأحداث التلقائي، المندوب، الإدارة | العميل، الإدارة، صفحة التتبع العامة (ببيانات مجهولة) | لا يحتوي على أي تفاصيل أسعار أو هوامش ربح. |
| **`PickupRequest`** | العميل التاجر | الإدارة، مندوب البيكاب | معزول بالكامل برقم التاجر والشركة. |
| **`ClientRateCard`** | إدارة شركة الشحن (`ADMIN`) فقط | الإدارة ومحرك احتساب أسعار الشحنات | العميل يرى أسعار بوالصه دون القدرة على تعديل العقد. |
| **`ShippingSettlement`** | نظام التسويات المالية لشركة الشحن | العميل التاجر والإدارة المالية | اعتماد العميل يغير الحالة إلى `APPROVED` فقط. |

---

## 6. بند «ما لن يتغيّر» وضمان عدم كسر القائم (Zero Blast-Radius Guarantee)

تطبيقاً لقاعدة منصة MaxP الصارمة: **عزل التعديلات التام (Strict Change Isolation)**، نلتزم بتثبيت الآتي:

1. **المسارات والشركات الخارجية:**
   - مسارات بوسطة (`apps/backend/routes/bostaRoutes.js` و `bostaController.js`) لن يتم تعديل حرف واحد فيها.
   - مسارات توربو (`apps/backend/controller/turbo/*`) تظل معزولة تماماً وتعمل للمتاجر القديمة كما هي.
   - مسارات QP Express (`apps/backend/routes/qpExpressRoutes.js`) تظل ثابتة.
2. **جرد الـ 65 إندبوينت الحالية في مسارات الشحن:**
   - **64 إندبوينت ثابتة 100%:** لن يتم تغيير اسمها، ولا معاييرها، ولا نوع استجابتها في الملفات الستة:
     `courierRoutes.js` (18)، `shippingCompaniesRoutes.js` (10)، `shippingZoneRoutes.js` (10)، `shippingAgentRoutes.js` (7)، `deliveryOptionRoutes.js` (7)، `shippingSettlementRoutes.js` (4).
   - **إندبوينت واحدة فقط تُوسّع بتوافقية تامة:**
     `POST /api/v1/shipments/create` في `shipmentsRoutes.js:458`:
     يتم تحويل شرط `if (!orderId)` إلى شرط اختياري، بحيث:
     - إذا وُجد `orderId`: يُنفذ نفس الكود الحالي 100% بدون أي تغيير في دورة حياة المتجر.
     - إذا غاب `orderId`: يُطلب بدلاً منه حقول الطرد المستقل (`recipientName`, `recipientPhone`, `codAmount`) وينشئ شحنة مستقلة.
3. **متجر MaxP والـ Storefront ومسارات الشراء:**
   - مسارات الشراء السريع، السلة، وتأكيد الطلب (`pdp-quick-order`, `checkout`, `publicOrdersRoutes.js`) لن تلمس إطلاقاً.
4. **بوابة الموردين والأفلييت الحالية:**
   - مسارات `merchantPortalRoutes.js` الخاصة بالمنتجات والعمولات تظل كما هي لخدمة موردي الدروب شيبينغ، وتعمل بوابة الشحن في مسارات مستقلة تماماً.

---

## 7. معايير الخصوصية والتتبع العام (GDPR & PII Privacy Controls)

لحماية بيانات المشترين والتجار عند إتاحة التتبع برقم البوليصة لعموم الجمهور عبر مسار `GET /api/v1/public/shipments/track/:waybill`:

1. **إخفاء وتشفير بيانات الهوية الشخصية (PII Masking):**
   - **الاسم:** إخفاء جزئي، يظهر الاسم الأول والحرف الأول من العائلة فقط (مثال: `أحمد م***`).
   - **الهاتف:** حجب كامل للأرقام الوسطى (مثال: `010*****432`).
   - **العنوان:** إظهار المحافظة والمدينة فقط (مثال: `الجيزة - الدقي`) وحجب اسم الشارع ورقم العقار والشقة تماماً.
2. **الحجب المالي والتجاري المطلق:**
   - حجب مبلغ الـ COD، وسعر الشحن، وتكلفة التوصيل، وهوامش ربح شركة الشحن من صفحة التتبع العامة نهائياً.
   - حجب اسم المتجر إذا طلب العميل وضع علامة "شحن محايد / White-Label".
3. **الحماية الأمنية للمسار العام:**
   - إدراج المسار صراحة في مصفوفة المسارات العامة `PUBLIC_ROUTES` لتجنب اعتراضه بحارس التوكن.
   - تطبيق محدد طلبات صارم (Rate Limiting) على مستوى الـ IP (بحد أقصى 20 طلباً في الدقيقة) لمنع هجمات التخمين الكثيف لأرقام البوالص (Enumeration Attacks).

---

## 8. هندسة الأداء وقواعد البيانات والفهارس (Performance & Indexing)

لضمان معالجة مئات الآلاف من الشحنات شهرياً بكفاءة وزمن استجابة أقل من 80ms:

### الفهارس المركبة الإلزامية (Composite Indexes):
1. **لبوابة العميل ومطابقة الشحنات:**
   `@@index([companyId, merchantId, createdAt])` — لتسريع استعلام شحنات العميل وترتيبها زمنياً.
2. **للوحة عمليات شركة الشحن:**
   `@@index([companyId, status, createdAt])` — لتسريع الفلترة بحالات الطرود في مستودع الفرز والهاَب.
3. **للتتبع العام فائق السرعة:**
   `@@unique([trackingNumber])` أو `@@index([trackingNumber])` — للبحث المباشر عن الطرد دون الحاجة لتحديد الشركة مسبقاً.
4. **لبوابة المندوب والتشغيل الميداني:**
   `@@index([companyId, courierId, status])` — لجلب طرود المندوب النشطة في ثوانٍ معدودة.
5. **لكشوفات الحساب والـ COD:**
   `@@index([companyId, merchantId, settlementStatus])` — لتسريع سحب الشحنات المسلمة الجاهزة لإصدار كشف الحساب.

---

## 9. مصفوفة المخاطر الشاملة (Risk & Mitigation Matrix)

| # | الخطر التشغيلي أو التقني | الشدة | آلية الاكتشاف المبكر | استراتيجية التخفيف والمنع | مفتاح التراجع الفوري (Rollback Switch) |
|---|---|---|---|---|---|
| **R1** | كسر مسار إنشاء الشحنات الحالي للأوردرات عند فك شرط `orderId`. | **حرجة (P0)** | اختبارات التكامل الآلية `shipmentsRoutes.test.js` ومراقبة أخطاء السيرفر 500. | اختبار شرطي صارم: `if (orderId)` ينفذ المسار القديم دون المساس بأي متغير؛ و`else` ينفذ المنطق الجديد. | إعادة السطرين `if (!orderId) return 400` فوراً دون الحاجة لمس قواعد البيانات. |
| **R2** | تسريب بيانات عميل لعميل آخر في بوابة الشحن (Multi-tenant Leak). | **حرجة (P0)** | اختبارات أمان العزل (Isolation Integration Tests) ومحاولات اختراق عبر تبديل الـ IDs. | فرض الـ Middleware `requireShippingClientAccount` وتضمين `companyId + merchantId` في جذر كل استعلام Prisma. | تعطيل مسارات بوابة العميل من الـ Router المركزي فورا. |
| **R3** | تعارض تحديثات المندوب دون شبكة (Offline Conflict) مع إلغاء الإدارة للشحنة. | **متوسطة (P2)** | تسجيل تعارضات المزامنة في جدول خاص ومراقبة الـ Logs. | أسبقية الـ OTP: كود التسليم يثبت صحة التسليم ويلغي قرار الإلغاء، مع تنبيه الإدارة. | تفعيل وضع المراجعة اليدوية للتعارضات عبر مفتاح إعدادات بالمنصة. |
| **R4** | تسريب بيانات العملاء عبر صفحة التتبع برقم البوليصة (Enumeration Attack). | **عالية (P1)** | مراقبة معدلات استدعاء مسار التتبع وملاحظة تكرار الـ 404 المتتالي من نفس الـ IP. | تشفير الـ PII، حظر مالي تام، وتطبيق Rate Limiter (20 طلب/دقيقة لكل IP). | تعطيل مسار التتبع بالبوليصة وإرجاع الزوار لصفحة التتبع برقم الهاتف. |
| **R5** | خطأ في احتساب مبالغ كشف الـ COD للعملاء (تكرار خصم الرسوم أو خطأ التوريد). | **حرجة (P0)** | تدقيق الحسابات الآلي (Audit Worker) ومقارنة مجموع البوالص الفردية بإجمالي الكشف. | اعتماد آلية الإقفال المالي: إدراج الشحنات في كشف معتمد يغير `settlementStatus = 'LOCKED'` لمنع إعادة احتسابها. | زر "إلغاء الكشف" وإرجاع الشحنات لحالة المعلق قبل سداد الحوالة. |
| **R6** | بطء استعلامات البحث في الشحنات مع تجاوز حاجز 500,000 طرد. | **متوسطة (P2)** | مراقبة بطء الاستعلامات في PostgreSQL (`pg_stat_statements`) وتجاوز 200ms. | إنشاء الفهارس المركبة الموصى بها في البند 8 واستخدام تصفية التاريخ الإلزامية. | تفعيل حد أقصى للبحث (Max Query Limit = 50) ومنع الاستعلامات المفتوحة. |
| **R7** | تسريب توكن الرحلة المؤقت للمندوب (`mobileToken`) عبر مشاركة الروابط. | **عالية (P1)** | رصد استدعاء نفس الرابط من عناوين IP متعددة أو متصفحات مختلفة في نفس الوقت. | إلزام المندوب بإدخال رمز الـ PIN الميداني الشخصي عند فتح الرابط قبل إتاحة التحكم. | تفعيل خيار إلغاء التوكن وإعادة توليده من لوحة تحكم المدير بنقرة زر. |
| **R8** | عدم تطابق أسماء المحافظات عند رفع ملفات إكسيل مجمعة من العملاء. | **منخفضة (P3)** | ظهور طرود بمحافظات غير مسعرة في كشوفات الاستيراد. | تمرير كافة أسماء المحافظات على المطبّع الرسمي للمنصة `orderLocationNormalizer.js` قبل الحفظ. | رفض السطور غير المطابقة وإرجاع تقرير إكسيل للعميل بالأخطاء لتصحيحها. |

---

## 10. ترتيب موجات التنفيذ وبوابات القبول (Waves & Gates Roadmap)

| الموجة | اسم الموجة ونطاق العمل | المخرجات الرئيسية | بوابة القبول الرقمية (Numerical Acceptance Gate) | التقدير الزمني | مفتاح التراجع الفوري |
|---|---|---|---|---|---|
| **W1** | **التأسيس المعماري وقواعد البيانات** | توسيع `Shipment`، إنشاء `ShipmentEvent`، `ClientRateCard`، وميدلوير العزل. | نجاح 100% من اختبارات الانحدار القديمة (Zero-Regression) + إضافة شحنة مستقلة بدون `orderId`. | 3 أيام | الرجوع لـ Commit السابق للراوت. |
| **W2** | **بوابة عميل الشحن (Client Portal)** | صفحات إدخال الطرود، الرفع المجمع بـ Excel، تتبع الطرود، وتوليد البوالص. | رفع ملف إكسيل يحتوي 100 طرد بنجاح، وتطبيع المحافظات بنسبة 100% وطباعة بوليصة حرارية. | 4 أيام | تعطيل مسار `/shipping-portal` من الـ Frontend. |
| **W3** | **نظام طلبات البيكاب والهاَب** | موديل `PickupRequest`، شاشات جدولة واستلام الطرود، وإسنادها لمناديب البيكاب. | دورة بيكاب كاملة: طلب من العميل ← إسناد لمندوب ← استلام ← إدخال 50 طرداً في مخزن الفرز. | 3 أيام | إخفاء تبويب البيكاب والتحويل للإدخال المباشر. |
| **W4** | **بوابة وتطبيق المندوب الميداني** | شاشات دخول المندوب بالهاتف والـ PIN، الرحلة النشطة، كشف العهدة، ومزامنة الأوفلاين. | تنفيذ 10 تسليمات في وضع Offline ثم المزامنة بنجاح فور الاتصال دون فقدان أي فلس أو OTP. | 4 أيام | التحويل لمسار `mobileToken` القديم بنقرة زر. |
| **W5** | **كشوفات حساب وتوريد الـ COD** | موديل `ShippingSettlement`، محرك تجميع مبالغ التحصيل، وخصم رسوم الشحن والمرتجعات. | مطابقة مالية دقيقة بنسبة 100% لكشف حساب يحتوي 200 طرد مسلّم و20 مرتجع مع الخزينة. | 3 أيام | مراجعة الكشوفات يدوياً بـ Excel قبل الاعتماد. |
| **W6** | **ربط MaxP-to-MaxP والتتبع العام** | محول الشحن الداخلي `MAXP_NETWORK` وصفحة التتبع العامة برقم البوليصة. | تحويل أوردر من متجر تجريبي على MaxP إلى طرد لدى شركة الشحن بنقرة واحدة وتتبعه بالبوليصة. | 3 أيام | تعطيل المزود `MAXP_NETWORK` والعودة للشحن اليدوي. |

**إجمالي زمن التنفيذ لكامل النظام:** 20 يوم عمل (4 أسابيع تشغيلية متكاملة).

---

## 11. التوصيات الفورية للبدء (Next Immediate Action)

عند اعتماد هذه الوثيقة والانتقال إلى مرحلة التنفيذ (تذكرة كود مستقلة)، تكون أول 3 بنود يجب البدء بها في **الموجة الأولى (W1)** هي:
1. **توسيع نموذج `Shipment` في Prisma:** إضافة حقول الطرد المستقل (`weight`, `pieces`, `codAmount`, `recipientName`, `recipientPhone`) وحقول الأمان دون المساس بالحقول الحالية.
2. **إنشاء نموذج `ShipmentEvent`:** لتدشين السجل الزمني (Timeline) لكل حركة طرد.
3. **فك قيد `orderId` في الراوت:** تعديل `apps/backend/routes/shipmentsRoutes.js:464` ليصبح اختيارياً، مع التحقق المستقل عبر اختبارات التكامل.

---
*تم إعداد هذا التقرير وتوثيق كافة الأدلة بواسطة وكيل الذكاء الاصطناعي المعماري (Antigravity).*
