# خطة إصلاح حساب التاجر ليستخدم نفس أدوات النظام

**Generated**: 2026-05-03  
**Status**: نسخة مصححة بعد مراجعة علاقة التاجر بالمنتجات والطلبات والمخازن  
**Estimated Complexity**: High

## التصحيح الأساسي

النسخة السابقة فصلت بورتال التاجر زيادة عن اللازم. الاتجاه الصحيح:

- الطلب الذي يصنعه المسوق هو نفس الطلب الذي تعمل عليه الشركة، وهو نفس الطلب الذي يعمل عليه التاجر إذا كان هو الذي سيجهزه.
- المنتج الذي يسجله التاجر هو نفس `Product` داخل كتالوج الشركة، وليس أداة منتجات جديدة.
- مخزون التاجر يكون `Warehouse` حقيقي داخل نظام المخازن، لكنه موسوم بأنه مخزن عند تاجر محدد.
- `MerchantOrder` لا يكون طلبًا موازيًا، بل assignment/fulfillment slice يحدد أي تاجر مسؤول عن أي جزء من الطلب الأصلي.
- الواجهة لا تصنع أدوات جديدة. تستخدم أدوات المنتجات والطلبات والمخازن الموجودة، لكن بفلترة وصلاحيات حسب دور التاجر ووضع التنفيذ.

## نموذج العمل الصحيح

### دورة البيع

1. المسوق يرسل العميل للمتجر أو ينشئ/يسبب الطلب.
2. النظام ينشئ `Order` أصلي:
   - `Order.affiliateId` أو `affiliateReferralId`
   - `Order.orderSource = AFFILIATE_REFERRAL` أو ما يناسب
   - `Order.orderItems`
3. الشركة ترى نفس الطلب في أدوات الطلبات الحالية.
4. النظام يحدد مصدر تنفيذ كل item:
   - من مخزن الشركة
   - أو من مخزن تاجر
5. إذا item أو order slice على تاجر، ينشأ/يحدث `MerchantOrder` كـ fulfillment assignment فقط.
6. التاجر لا يرى “طلبًا جديدًا”. يرى نفس الطلب الأصلي لكن scoped للجزء المكلف به.

### دورة المنتجات

1. التاجر يسجل منتجاته من نفس أداة المنتجات.
2. المنتج يتحفظ في `Product` داخل نفس `companyId`.
3. المنتج يتوسم كمصدر تاجر، ويرتبط بسجل `MerchantProduct`.
4. ينشأ أو يستخدم مخزن التاجر المرتبط.
5. مخزون المنتج يسجل في `Inventory` على مخزن التاجر.
6. الشركة ترى المنتج في أدوات المنتجات الحالية مع badge واضح: `منتج تاجر` واسم التاجر.

### دورة المخازن

كل تاجر له مخزن واحد أو أكثر من نفس جدول `Warehouse`.

الحد الأدنى المطلوب:

- `Warehouse.type = "merchant"` أو قيمة واضحة مثل `merchant_fulfillment`
- إضافة علاقة صريحة لاحقًا:
  - `Warehouse.merchantId`
  - أو metadata مؤقتة لو عايزين مرحلة بدون migration، لكن العلاقة الصريحة أفضل.

الشركة ترى مخازنها ومخازن التجار، لكن مميزة.

التاجر يرى مخزنه فقط، ويحدث مخزون منتجاته فقط.

## شكل حساب التاجر

### الدور

`User.role = MERCHANT`

الربط الحالي يمكن أن يظل مؤقتًا عبر:

- `User.companyId`
- `User.email`
- `Merchant.companyId`
- `Merchant.email`

لكن الخطة الأفضل:

- إضافة `Merchant.userId` لاحقًا كربط صريح.
- إضافة `Warehouse.merchantId` لتمييز مخازن التاجر.

### ما يظهر للتاجر

التاجر لا يحتاج “بورتال جديد” بمعنى أدوات منفصلة. يحتاج نفس الأدوات بواجهة scoped:

| الأداة | نفس أداة النظام | ما يظهر للتاجر |
| --- | --- | --- |
| المنتجات | Products | منتجاته فقط، أو نموذج إضافة منتج مقيّد |
| المخزون | Inventory/Warehouse | مخزنه فقط وحركات مخزونه |
| تجهيز الطلبات | Preparation Queue / Orders | الطلبات أو أجزاء الطلبات المكلف بتجهيزها |
| الفاتورة/ورقة التجهيز | OrderInvoice / printPreparationSlip | تظهر فقط إذا التاجر هو المنفذ |
| الحساب | Profile | بيانات حساب تاجر مبسطة |
| المستحقات | Commissions/Payout read model | مستحقاته فقط عند اكتمال نموذج الدفع |

### ما لا يظهر للتاجر

- كل طلبات الشركة.
- كل المنتجات.
- كل العملاء.
- أدوات المسوقين.
- إعدادات الشركة.
- إدارة المخازن العامة.
- إدارة شركات الشحن العامة.
- عمولات المسوقين أو المنصة.
- منتجات أو طلبات تاجر آخر.

## وضعان لتنفيذ الطلب

### الوضع 1: التاجر يجهز من عنده

شرط الدخول:

- `Merchant.fulfillmentMode = MERCHANT`
- أو `MerchantOrder.fulfillmentSource = MERCHANT`
- والطلب/العناصر مرتبطة بمخزن التاجر.

ما يظهر:

- رقم الطلب الأصلي.
- بيانات العميل اللازمة للتوصيل والطباعة:
  - الاسم
  - الهاتف
  - العنوان
  - المحافظة/المدينة
  - ملاحظات العميل الضرورية للتنفيذ
- العناصر المكلف بها فقط:
  - اسم المنتج
  - الصورة
  - SKU
  - اللون/المقاس/الvariant
  - الكمية
  - السعر اللازم للفاتورة أو التحصيل حسب سياسة الشركة
- حالة التجهيز.
- حقل مرجع التنفيذ/التتبع الذي يدخله التاجر.
- أداة طباعة:
  - فاتورة أو packing slip من نفس `OrderInvoice` / `printPreparationSlip`
  - مفلترة على عناصر التاجر عند الطلب متعدد التجار
- أزرار التنفيذ من نفس flow الطلبات:
  - قيد التجهيز
  - جاهز للشحن
  - تم التسليم لشركة الشحن أو تم التنفيذ
  - فشل/تعذر مع سبب

ما لا يظهر:

- هامش الشركة.
- عمولة المسوق.
- عمولة المنصة.
- عناصر يجهزها تاجر آخر.
- أدوات تعديل بيانات العميل أو تعديل قيمة الطلب.

### الوضع 2: الشركة تجهز من عندها

شرط الدخول:

- `Merchant.fulfillmentMode = COMPANY_WAREHOUSE`
- أو `MerchantOrder.fulfillmentSource = COMPANY_WAREHOUSE`

ما يظهر للتاجر:

- رقم الطلب الأصلي.
- اسم العميل فقط، إن احتجناه للمتابعة.
- اسم المنتج/العناصر المرتبطة به.
- الكمية.
- الحالة العامة.
- ملاحظة أن التنفيذ من مخزن الشركة.

ما لا يظهر:

- عنوان العميل الكامل.
- الهاتف لو ليس مطلوبًا.
- أزرار التجهيز.
- الطباعة.
- تغيير الحالة.
- تحديث التتبع.
- اختيار المخزن أو شركة الشحن.

هنا التاجر مجرد صاحب منتج/طرف مالي، وليس جهة تنفيذ.

## Sprint 0: تثبيت القرار وإلغاء فكرة الأداة الموازية

**Goal**: تعديل اتجاه التنفيذ قبل كتابة كود جديد.

### Task 0.1: تحديث لغة المنتج في docs

- **Location**:
  - `docs/merchant-portal-system-refactor-plan-ar-2026-05-03.md`
  - `docs/merchant-site-complete-scenarios-ar-2026-05-03.md`
- **Description**: تثبيت أن المنتجات والطلبات والمخازن هي أدوات النظام نفسها، وأن أي merchant route هو scope أو façade فقط.
- **Acceptance Criteria**:
  - لا توجد صياغة تقول إن للتاجر أداة طلبات منفصلة.
  - `MerchantOrder` موصوف كـ fulfillment assignment.

### Task 0.2: منع UI جديد في merchant portal

- **Location**:
  - `frontend/src/pages/merchant-portal/MerchantPortalDashboard.tsx`
- **Description**: وقف إضافة features جديدة للملف الحالي. أي إصلاح جديد يكون refactor reuse.
- **Acceptance Criteria**:
  - لا تتم إضافة tables/forms/cards محلية جديدة.

## Sprint 1: مخزن التاجر داخل نظام المخازن

**Goal**: جعل التاجر يملك مخزنًا معروفًا في نفس نظام المخازن.

### Task 1.1: إضافة ربط مخزن بالتاجر

- **Location**:
  - `backend/prisma/schema/inventory.prisma`
  - migration جديدة
- **Description**: إضافة `merchantId` اختياري على `Warehouse`، مع index، وربطه بـ `Merchant`.
- **Acceptance Criteria**:
  - يمكن معرفة أن المخزن تابع لتاجر.
  - الشركة ترى المخزن ضمن مخازنها.
  - التاجر لا يرى إلا مخزنه.

### Task 1.2: إنشاء مخزن تلقائي للتاجر

- **Location**:
  - `backend/services/merchantService.js`
  - `backend/routes/merchantRoutes.js`
  - `backend/routes/publicMerchantRoutes.js`
- **Description**: عند إنشاء أو اعتماد تاجر، ينشأ له مخزن افتراضي إذا لم يكن موجودًا.
- **Acceptance Criteria**:
  - اسم المخزن واضح: `مخزن التاجر - {merchant.name}`.
  - `type = merchant`.
  - `merchantId = merchant.id`.

### Task 1.3: تقييد inventory للتاجر

- **Location**:
  - `backend/controller/inventoryController.js`
  - `backend/routes/inventoryRoutes.js`
- **Description**: نفس inventory API، لكن لو المستخدم `MERCHANT` يتم فلترة كل شيء على مخازنه ومنتجاته فقط.
- **Acceptance Criteria**:
  - `GET /inventory` للتاجر يعرض مخزون مخزنه فقط.
  - `POST /inventory/update-stock` لا يقبل إلا warehouse تابع للتاجر ومنتج مرتبط به.
  - لا يستطيع النقل من/إلى مخزن الشركة إلا إذا الشركة فتحت workflow واضح لاحقًا.

## Sprint 2: منتجات التاجر من نفس أداة المنتجات

**Goal**: التاجر يستخدم نفس Products tool، لكن في scope محدود.

### Task 2.1: Role-scoped Products API

- **Location**:
  - `backend/routes/products*`
  - service الخاص بالمنتجات إن وجد
  - `backend/services/merchantService.js`
- **Description**: دعم دور `MERCHANT` في نفس endpoints الخاصة بالمنتجات.
- **Acceptance Criteria**:
  - `MERCHANT` يرى منتجاته فقط.
  - عند إنشاء منتج من تاجر:
    - `Product.companyId = merchant.companyId`
    - المنتج يتوسم كمصدر تاجر
    - ينشأ `MerchantProduct`
    - ينشأ inventory row في مخزن التاجر
  - لا يستطيع التاجر تعديل حقول الشركة الحساسة مثل:
    - publish/global visibility بدون approval
    - affiliate settings
    - SEO العام إذا الشركة لا تسمح
    - pricing النهائي لو السياسة عند الشركة

### Task 2.2: إعادة استخدام Products UI

- **Location**:
  - `frontend/src/pages/products/Products.tsx`
  - `frontend/src/pages/products/components/*`
  - `frontend/src/pages/products/hooks/useProducts.ts`
- **Description**: جعل نفس صفحة المنتجات تعمل في `merchant scope`.
- **Acceptance Criteria**:
  - لا صفحة `MerchantProducts` جديدة.
  - نفس `ProductsTable`, `ProductsHeader`, `ProductNewFinal` تستخدم مع props/permissions.
  - التاجر يرى أزرار الإضافة والتعديل المسموحة فقط.

### Task 2.3: Badge وفلترة مصدر المنتج

- **Location**:
  - `frontend/src/pages/products/components/ProductTableRow.tsx`
  - `frontend/src/pages/products/components/ProductsFilters.tsx`
- **Description**: إضافة badge `منتج تاجر` واسم التاجر للشركة، وفلتر مصدر المنتج.
- **Acceptance Criteria**:
  - الشركة تميز منتجات التجار من منتجاتها.
  - التاجر لا يرى badge زائد يشوشه إلا عند الحاجة.

## Sprint 3: الطلبات من نفس أداة الطلبات والتجهيز

**Goal**: التاجر يعمل على نفس الطلب الأصلي، بنفس أدوات التجهيز، حسب وضع التنفيذ.

### Task 3.1: تحويل MerchantOrder إلى assignment فقط

- **Location**:
  - `backend/services/dropshippingService.js`
  - `backend/services/merchantService.js`
  - `backend/routes/merchantPortalRoutes.js`
- **Description**: مراجعة كل استخدام لـ `MerchantOrder` لضمان أنه لا يمثل طلبًا مستقلًا في UI، بل يربط:
  - `merchantId`
  - `orderId`
  - العناصر أو payload المكلف بها
  - `fulfillmentSource`
  - `warehouseId`
  - `shippingCompanyId`
- **Acceptance Criteria**:
  - أي طلب أفليت يظل `Order` واحد.
  - الشركة والتاجر يريان نفس order number.
  - الطلب متعدد التجار يظهر للشركة كطلب واحد مع fulfillment splits.

### Task 3.2: Scope existing order/preparation APIs

- **Location**:
  - `backend/routes/enhancedOrders.js`
  - `backend/routes/orders.js`
  - `backend/services/enhancedOrderService.js`
  - routes الخاصة بـ `/orders-new/preparation/queue`
- **Description**: نفس endpoints ترجع data scoped لو `req.user.role = MERCHANT`.
- **Acceptance Criteria**:
  - التاجر يرى الطلبات التي له فيها `MerchantOrder`.
  - ترجع فقط العناصر الخاصة به.
  - في وضع `MERCHANT` ترجع full fulfillment fields.
  - في وضع `COMPANY_WAREHOUSE` ترجع read-only summary.

### Task 3.3: Reuse PreparationQueue للتاجر

- **Location**:
  - `frontend/src/pages/orders/PreparationQueue.tsx`
  - `frontend/src/pages/orders/preparation/*`
  - route/sidebar config
- **Description**: استخدام نفس `PreparationQueue` مع `scope="merchant"` أو اعتماد role من auth.
- **Acceptance Criteria**:
  - لا توجد صفحة طلبات تاجر منفصلة.
  - نفس cards/actions/filters تعمل للتاجر لكن ببياناته.
  - أدوات الطباعة تظهر فقط في وضع `MERCHANT`.

### Task 3.4: Reuse OrderDetails للعرض المحدود

- **Location**:
  - `frontend/src/pages/orders/OrderDetails.tsx`
  - `frontend/src/pages/orders/components/*`
- **Description**: نفس صفحة تفاصيل الطلب، لكن في merchant scope:
  - full execution view لو التاجر ينفذ.
  - read-only minimal view لو الشركة تنفذ.
- **Acceptance Criteria**:
  - في وضع التنفيذ الذاتي: customer fulfillment data ظاهرة.
  - في وضع الشركة: بيانات العميل الحساسة وأدوات التنفيذ مخفية.

## Sprint 4: الفاتورة والطباعة حسب وضع التنفيذ

**Goal**: التاجر الذي يجهز من عنده يستطيع طباعة الفاتورة أو ورقة التجهيز من نفس أدوات النظام.

### Task 4.1: Merchant-scoped invoice/packing slip

- **Location**:
  - `frontend/src/components/orders/OrderInvoice.tsx`
  - `frontend/src/utils/printPreparationSlip.ts`
  - `backend/routes/orderInvoice*`
- **Description**: دعم طباعة نسخة scoped للتاجر.
- **Acceptance Criteria**:
  - لو الطلب كله عند تاجر واحد، الفاتورة عادية لكن بصلاحيات تاجر.
  - لو الطلب متعدد التجار، نسخة التاجر تعرض عناصره فقط.
  - لا تظهر عمولات أو هوامش أو عناصر تاجر آخر.

### Task 4.2: Hide print tools in company-fulfillment mode

- **Location**:
  - `frontend/src/pages/orders/preparation/components/*`
  - `frontend/src/pages/orders/components/*`
- **Description**: إخفاء الطباعة وأزرار التنفيذ إذا `fulfillmentSource = COMPANY_WAREHOUSE`.
- **Acceptance Criteria**:
  - التاجر يرى فقط اسم العميل والمنتج والكمية والحالة العامة.

## Sprint 5: شكل القائمة والصلاحيات

**Goal**: التاجر يرى نفس الأدوات، لكن بنسخة scoped وليست بوابة موازية.

### Sidebar المقترح للتاجر

| label | route | component reused |
| --- | --- | --- |
| منتجاتي | `/products` أو `/merchant/products` حسب قرار routing | `Products` scoped |
| مخزني | `/inventory` أو `/merchant/inventory` | `Inventory` scoped |
| تجهيز الطلبات | `/orders/preparation` أو `/merchant/orders` | `PreparationQueue` scoped |
| تفاصيل الطلب | `/orders/:id` | `OrderDetails` scoped |
| مستحقاتي | `/merchant/commissions` | commission read model |
| حسابي | `/profile` | profile scoped |

ملاحظة مهمة:

لو استخدمنا routes العامة مثل `/products` و`/orders/preparation`، يجب أن تكون route guards وbackend scopes قوية جدًا.  
لو استخدمنا `/merchant/*`، يجب أن يكون component نفسه هو نفس component النظام، وليس صفحة جديدة.

### Task 5.1: Route guard لا يمنع الأدوات المشتركة

- **Location**:
  - `frontend/src/utils/merchantAccess.ts`
  - `frontend/src/App.tsx`
  - `frontend/src/config/sidebar.ts`
- **Description**: السماح للتاجر بدخول الأدوات المشتركة المصرح بها فقط.
- **Acceptance Criteria**:
  - التاجر لا يعود دائمًا إلى `/merchant-portal` عند فتح `/products` لو قررنا استخدامها.
  - كل route مشتركة تعمل في merchant scope.

### Task 5.2: Backend is the source of truth

- **Location**:
  - backend route middleware/services
- **Description**: لا نعتمد على frontend لإخفاء البيانات. كل endpoint يفلتر حسب الدور.
- **Acceptance Criteria**:
  - request crafted من تاجر لا يرى إلا بياناته.
  - owner/company admin لا يتأثر.

## Sprint 6: إلغاء/تقليل البورتال الحالي

**Goal**: إزالة الإحساس بتطبيق منفصل.

### Task 6.1: تحويل MerchantPortalDashboard إلى landing خفيفة أو إزالته

- **Location**:
  - `frontend/src/pages/merchant-portal/MerchantPortalDashboard.tsx`
- **Description**: بدل الصفحة الكبيرة، تكون مجرد summary وروابط للأدوات المشتركة أو يتم استبدالها بتحويل مباشر لأول أداة.
- **Acceptance Criteria**:
  - لا tables/forms داخلها.
  - لا status update أو product update داخلها.
  - كل عمل حقيقي يتم داخل Products/Inventory/PreparationQueue.

**تحديث 2026-05-04**: تم حذف الهيدر الكبير الخاص بـ Merchant Portal من صفحة
`/merchant-portal/commissions`، وأصبحت صفحة المستحقات تفتح مباشرة على محتوى
الرصيد والسحوبات بدون كارت الترحيب أو تبويبات البورتال العلوية.

### Task 6.2: إزالة endpoints التشغيلية المكررة تدريجيًا

- **Location**:
  - `backend/routes/merchantPortalRoutes.js`
- **Description**: الاحتفاظ بـ `/me` وsummary فقط، ونقل تشغيل المنتجات/الطلبات للـ endpoints المشتركة scoped.
- **Acceptance Criteria**:
  - `/merchant-portal/products` و`/merchant-portal/orders` لا يكونوا المصدر الأساسي للأدوات.
  - tests تؤكد عدم كسر القديم أثناء الانتقال.

## Sprint 7: الاختبارات وقبول المنتج

### API UAT

- مسوق يسبب طلب أفليت.
- الشركة ترى نفس الطلب في الطلبات.
- التاجر في وضع `MERCHANT` يرى نفس الطلب في تجهيز الطلبات ويطبع ورقة تجهيز.
- التاجر في وضع `COMPANY_WAREHOUSE` يرى read-only فقط.
- المنتج الذي يسجله التاجر يظهر في Products للشركة مع badge.
- مخزون المنتج يتسجل في مخزن التاجر.
- التاجر لا يرى مخزن شركة أو تاجر آخر.

### Browser UAT

- owner:
  - يرى Products بكل المصادر.
  - يرى Warehouses وفيها مخازن التجار مميزة.
  - يرى Orders/Preparation وفيها fulfillment splits.
- affiliate:
  - يسبب الطلب أو يديره حسب صلاحياته.
  - لا يرى أدوات التاجر.
- merchant self-fulfillment:
  - يرى Products scoped.
  - يرى Inventory scoped.
  - يرى PreparationQueue scoped.
  - يطبع invoice/packing slip.
- merchant company-fulfillment:
  - يرى معلومات محدودة فقط.
  - لا يرى print/action buttons.

## قرارات يجب تثبيتها قبل التنفيذ

1. هل route التاجر يستخدم نفس المسارات العامة `/products`, `/inventory`, `/orders/preparation` مع role scope، أم routes تحت `/merchant/*` لكن بنفس components؟
2. هل التاجر يحق له تعديل سعر المنتج النهائي، أم فقط cost/merchant price وتراجع الشركة السعر النهائي؟
3. في الفاتورة المطبوعة من التاجر، هل يظهر اسم الشركة فقط، أم اسم التاجر كمصدر تنفيذ أيضًا؟
4. هل مخزن التاجر مخزن واحد دائمًا، أم قد يكون لكل تاجر أكثر من مخزن؟

## Definition Of Done

الإصلاح يعتبر مكتملًا عندما:

- لا توجد أداة منتجات منفصلة للتاجر.
- لا توجد أداة طلبات منفصلة للتاجر.
- لا توجد أداة مخزون منفصلة للتاجر.
- المنتجات/الطلبات/المخازن هي نفس أدوات النظام.
- الاختلاف الوحيد هو scope الصلاحيات ووضع التنفيذ.
- وضع `MERCHANT` يعرض أدوات التجهيز والطباعة الكاملة المطلوبة.
- وضع `COMPANY_WAREHOUSE` يعرض قراءة محدودة فقط.
- كل هذا مثبت بتستات API وbrowser UAT.
