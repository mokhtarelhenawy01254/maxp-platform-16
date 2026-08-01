# Plan: إصلاح صلاحيات الوصول + توجيه ما بعد تسجيل الدخول

**Generated**: 2026-07-31
**Estimated Complexity**: High
**Status**: تم التنفيذ (2026-07-31) — السبرنت 1→6 مكتملة كودياً، الاختبارات المعنية خضراء

## Implementation Status

- ✅ **Sprint 1**: `postAuthRouting.ts` + `routeAccess.ts` جديدان، `authRouting.ts` أصبح re-export، تتبّع آخر صفحة في `App.tsx`، `Register.tsx` محسّن. اختبارات `authRouting.test.ts` (19) خضراء.
- ✅ **Sprint 2**: `.some()`→`.every()`، مكوّن `AccessDenied` موحّد في كل الحراس (بدون كشف أدوار)، `/company-dashboard` مفتوح لكل أدوار الشركة.
- ✅ **Sprint 3**: `ModernLogin` بتحويلة واحدة (`hasNavigatedRef`)، الوجهة تُحسب عبر `resolvePostAuthDestination(userData, fromPath)`.
- ✅ **Sprint 4**: `productRoutes.js`/`customerRoutes.js` بصلاحيات `create/edit/delete` حقيقية، `orders.js` بفحص `orders.view` على مستوى الراوتر + `orders.create`/`orders.status.change` للنهايات الحرجة. اختبارات `rbacMiddleware.test.js` (21) خضراء.
- ✅ **Sprint 5**: `superAdminMiddleware` يقبل `SUPER_ADMIN` فقط (+ `platformAdminRoles` صريحة اختيارية)، `Login.tsx` بلا أدوار قديمة، أدوار الشركة القديمة (Team Lead/Developer/...) تعامل كأدوار شركة.
- ✅ **Sprint 6**: السايدبار `fail-closed` عند غياب الصلاحيات، `DefaultPageRedirect` يستخدم `resolvePostAuthDestination`.

### ملاحظات / مؤجلة
- ✅ **سكربت ترحيل الأدوار**: `apps/backend/scripts/migrateLegacyPlatformRoles.js` + أمر `npm run migrate:legacy-roles` (dry-run افتراضياً، `--apply` للتطبيق). **طُبّق على البرودكشن**: `mayar@maxp.com` "Project Manager"→`MANAGER`، صفر أدوار قديمة متبقية.
- ✅ **`seed:permissions`**: شُغّل محلياً و**على البرودكشن** — 161 صلاحية (OWNER=161، COMPANY_ADMIN=157، MANAGER=64، AGENT=23، AFFILIATE=5).
- ✅ **إصلاح إنتاجي**: الأغلفة التفصيلية للطلبات (`orders.create/edit/status.change`) سببت 403 لدور مخصص "تجهيز" (بيشتغل تحضير طلبات عبر `/orders-new`/`/orders-v2` نفس الراوتر). **رُجّع** إلى حارس `orders.view` فقط على مستوى الراوتر + hotfix مباشر على السيرفر.
- ✅ **تدقيق أدوار البرودكشن**: كل الأدوار المخصصة فُحصت (المدمجة سليمة؛ "تجهيز" اتصلحت). **قرار المستخدم**: الصلاحيات تتبع إعدادات الأدوار (شاشة الأدوار هي المصدر) — فلا seed تعديل على AGENT.
- ✅ **مزامنة الفرونت مع الباك**: `/customers/new`→`customers.create`، `/customers/:id/edit`→`customers.edit`، `/products/new`→`products.create`، `/products/:id/edit`→`products.edit` — منع فتح نماذج لا يستطيع المستخدم حفظها.
- **مؤجل**: مسارات الإعدادات/الواتساب خارج النطاق (قرار المستخدم).
- **ملاحظة بيئة**: بعض التعديلات تُلتقط تلقائياً في commits بواسطة بيئة العمل.

## Overview

هدف الخطة إصلاح ثلاثة محاور مترابطة:

1. **ثغرات صلاحيات فعلية (Backend)**: الباك بيقبل عمليات (إنشاء/تعديل/حذف) بصلاحية "عرض" فقط، ومسارات الطلبات مفتوحة لأي عضو بالشركة، وتصادم أدوار الشركة مع أدوار المنصة الداخلية ("Team Lead" يدخل لوحة السوبر أدمن).
2. **ثغرات فرونت**: `PermissionProtectedRoute` يستخدم `.some()` بدل `.every()`، السايدبار `fail-open`، شاشات "لا صلاحية" متناقضة وكاشفة لأسماء الأدوار.
3. **توجيه ما بعد الدخول**: تحويلة مزدوجة في `ModernLogin`، موظف بيقف على صفحة ممنوعه، وعدم احترام إعداد الصفحة الافتراضية، وتفعيل ميزة **"الدخول على آخر صفحة وقف عندها قبل تسجيل الخروج"**.

**القرارات المعتمدة (من المستخدم):**
- الأولوية بعد الدخول: **آخر صفحة قبل الخروج → إعداد الصفحة الافتراضية → اختيار الدور**.
- نطاق الإصلاح: **الحرج + تجربة المستخدم**.
- لو الصفحة الأخيرة بقى مالهوش وصول لها: **يروح بصمت للإعداد الافتراضي**.

---

## Sprint 1: بنية أساسية للتوجيه بعد الدخول

**Goal**: ملف مركزي واحد يقرر وجهة ما بعد الدخول + تتبّع آخر صفحة، وتستبدل كل الملفات القديمة المتناثرة.
**Demo/Validation**:
- بعد اللوجن كموظف تروح لآخر صفحة كنت فيها قبل الخروج.
- بدون آخر صفحة → تروح لإعداد الصفحة الافتراضية.
- بدون كل ده → تروح لصفحة الدور.

### Task 1.1: إنشاء `apps/frontend/src/utils/postAuthRouting.ts`
- **Description**: مصدر الحقيقة الوحيد:
  - `isAllowedPostAuthPath(path)` — يقبل المسارات الداخلية فقط ويرفض: `/auth/*`, `/register/*`, `/lp/*`, `/payment/*`, `/checkout/*`, `/store*`, `/faq`, `/`, وغيرها (نفس معايير `isPublicRoute` في `App.tsx:1543`).
  - `getLastPathKey(user)` → `maxp_lastPath:${userId}:${companyId}` (مفتاح لكل مستخدم/شركة).
  - `saveLastPath(user, pathname)` — يحفظ عند التنقل في صفحات التطبيق.
  - `resolvePostAuthDestination(user, stateFromPath?)` — بالترتيب:
    1. `stateFromPath` (استئناف جلسة منتهية من صفحة محمية) إذا كان `isAllowedPostAuthPath`.
    2. آخر صفحة محفوظة (`lastPath`) إذا كانت مسموحة للمستخدم (Task 2.1).
    3. الصفحة الافتراضية (`user.settings.defaultPage` ثم `localStorage["maxp-default-page"]`).
    4. Fallback حسب الدور (Task 1.2).
- **Dependencies**: none
- **Acceptance Criteria**: دوال نقية قابلة للاختبار، بدون side effects غير المقصودة.
- **Validation**: unit tests في `postAuthRouting.test.ts` (تغطي الـ 4 مستويات والرفض).

### Task 1.2: Fallback حسب الدور (موحّد ومنقّح)
- **Location**: `apps/frontend/src/utils/postAuthRouting.ts`
- **Description**: استبدال منطق `getPostAuthDestination` في `authRouting.ts`:
  - `MERCHANT` → `/merchant-portal` (مقيد بـ `isMerchantPrivatePathAllowed`).
  - `AFFILIATE` → `/affiliates/dashboard` (مقيد بـ `isAffiliatePrivatePathAllowed`).
  - أدوار النظام (بعد Task 4.1 ستكون `SUPER_ADMIN` فقط) → `superAdmin_lastPath` أو `/super-admin/dev-dashboard`.
  - أدوار الشركة (`COMPANY_ADMIN`, `OWNER`, `MANAGER`, `TEAM_LEADER`, `MODERATOR`, `EMPLOYEE`, `ADMIN`) → **`/company-dashboard`** (بدل `/marketplace` الحالية التي لا تناسب المستخدمين الحاليين).
  - غير المعروف → `/marketplace`.
- **Dependencies**: 1.1
- **Acceptance Criteria**: لا يوجد أي دور شركة يقع على صفحة محظورة عليه.
- **Validation**: تحديث `authRouting.test.ts` وإضافة حالات أدوار الشركة.

### Task 1.3: تتبّع آخر صفحة في `App.tsx`
- **Location**: `apps/frontend/src/App.tsx` — `AppContent` (حيث `pathname`, `isAuthenticated`, `user` متاحة)
- **Description**: `useEffect` عند كل تغيير `pathname`: لو `isAuthenticated && isAllowedPostAuthPath(pathname)` → `saveLastPath(user, pathname)`. لا يُمسح على اللوج أوت (مقصود).
- **Dependencies**: 1.1
- **Acceptance Criteria**: آخر صفحة تتحدث أثناء التنقل، وتختفي منها صفحات اللوجن/اللاندينج.
- **Validation**: فحص يدوي + اختبار وحدة للدالة.

### Task 1.4: ربط الوجهات القديمة بالملف الجديد
- **Location**: `apps/frontend/src/utils/authRouting.ts` (يتحول wrapper أو يُحذف)، `Register.tsx:325,342-364`، `ModernLogin.tsx`
- **Description**: كل المستدعين يستخدموا `resolvePostAuthDestination`. في `Register.tsx` الحساب الجديد مالهوش `lastPath` فستسقط تلقائياً لإعداد/دور (يبقى `/marketplace` لشركة جديدة — مطابق لاختبار `Register.test.tsx`).
- **Dependencies**: 1.2
- **Acceptance Criteria**: لا استخدام مباشر لـ `getPostAuthDestination` القديمة بعد الترحيل.
- **Validation**: `npm test` لملفات `auth` و`Register`.

---

## Sprint 2: إصلاح بوابة الصلاحيات في الفرونت

**Goal**: حارس موحّد + `.every()` + سجل مسارات صلاحيات + عدم كشف أسماء الأدوار.
**Demo/Validation**:
- موظف معاه `products.view` فقط لا يفتح صفحة إنشاء منتج.
- موظف بلا صلاحية يقف على صفحة محمية يرى شاشة موحدة فيها زر "الانتقال لصفحتك" يوصله لصفحة مسموح بها.

### Task 2.1: سجل مسارات الصلاحيات `routePermissionMap`
- **Location**: ملف جديد `apps/frontend/src/utils/routeAccess.ts`
- **Description**: خريطة `path-prefix → permission|roles` لكل المسارات المحمية (من `App.tsx`):
  - `/customers*` → `customers.view`، `/products/new` → `products.create`، `/products*` → `products.view`، `/orders/returns*` → `orders.returns.view`، إلخ.
  - `isPathAllowedForUser(path, user)`: يتيح للـ `SUPER_ADMIN`/أصحاب الدور المعتمد، ويفحص `user.permissions` بمنطق **كل** الصلاحيات المطلوبة.
- **Dependencies**: none
- **Acceptance Criteria**: كل المسارات اللي حوالينها `PermissionProtectedRoute` في `App.tsx` موجودة في الخريطة.
- **Validation**: اختبارات وحدة للخريطة.

### Task 2.2: تصحيح `.some()` → `.every()` وتنظيف المسارات متعددة الصلاحيات
- **Location**: `apps/frontend/src/components/protection/CompanyProtectedRoute.tsx:213`
- **Description**:
  - `hasAccess = requiredPermissions.length === 0 || requiredPermissions.every(p => userPerms.includes(p))`.
  - مراجعة كل `requiredPermissions` متعددة العناصر في `App.tsx` (مثل `['products.create','products.view']` عند `:3630,3680`) وتحويلها لصلاحية واحدة أدق: `/products/new` → `['products.create']`.
- **Dependencies**: 2.1
- **Acceptance Criteria**: موظف `MODERATOR` (products.view فقط) ممنوع من `/products/new`، ويسمح لـ `TEAM_LEADER`.
- **Validation**: اختبارات الوحدة الحالية + اختبار جديد لحالة `.every()`.

### Task 2.3: مكوّن `AccessDenied` موحّد
- **Location**: `apps/frontend/src/components/protection/AccessDenied.tsx` (جديد)
- **Description**: شاشة واحدة بسيطة: أيقونة + "ليس لديك صلاحية الوصول" + زران "الانتقال لصفحتك الرئيسية" (يرسل إلى `resolvePostAuthDestination(user)`) و"العودة".
- **Dependencies**: 1.2
- **Acceptance Criteria**: نفس الشاشة في كل الحراس.
- **Validation**: فحص يدوي لكل حراس.

### Task 2.4: استخدام المكوّن في كل الحراس + إزالة كشف الأدوار
- **Location**: `ProtectedRoute.tsx:90-113`، `CompanyProtectedRoute.tsx:53-81,156-176,215-236`
- **Description**: استبدال الشاشات المتفرقة بـ `AccessDenied`، **حذف سطر "الأدوار المطلوبة: {...}"** (`CompanyProtectedRoute.tsx:169`). إزالة `fallbackRedirect` إن استُغني عنه.
- **Dependencies**: 2.3
- **Acceptance Criteria**: لا يوجد كشف لأسماء الأدوار، وتجربة موحدة.
- **Validation**: فحص يدوي + تحديث أي اختبار يعتمد على النصوص القديمة.

### Task 2.5: صفحة `/company-dashboard` لكل أدوار الشركة
- **Location**: `App.tsx:2544` + `MainDashboardPage`
- **Description**: فتح `RoleProtectedRoute` للوحة ليسمح بكل أدوار الشركة (أو نقل الفحص لصفحة واحدة مبنية على الصلاحيات). التحقق أن `MainDashboardPage` لا تتعطل مع `MODERATOR`/`EMPLOYEE` (تعتمد على `dashboard.view` المتاحة لهم، وترشّح البيانات حسب الصلاحية).
- **Dependencies**: 2.2
- **Acceptance Criteria**: `MODERATOR` يفتح اللوحة ويراها مكيفة بدل شاشة الرفض.
- **Validation**: تجربة حية بحساب موظف + مراجعة استدعاءات API في `MainDashboardPage`.

---

## Sprint 3: إصلاح التوجيه بعد الدخول (التحويلة المزدوجة + آخر صفحة)

**Goal**: تحويلة واحدة بعد اللوجن، والموظف يروح لآخر صفحته أو إعداده بدل صفحة محظورة.
**Demo/Validation**:
- اللوجن بيعمل تحويلة واحدة فقط (مفيش وميض صفحة).
- موظف سجّل خروجه من `/orders` يعود إليه.
- المستخدم اللي غير متاح له آخر صفحة يقع على الصفحة الافتراضية.

### Task 3.1: إزالة التحويلة المزدوجة في `ModernLogin.tsx`
- **Description**:
  - حذف `useEffect` اللي بيعمل `navigate(getPostAuthDestination(user))` (`ModernLogin.tsx:34-39`).
  - إضافة `hasNavigatedRef` لمنع التحويلتين معاً: في `handleSubmit` بعد `login()` → `resolvePostAuthDestination(userData, location.state?.from?.pathname)` → `navigate(dest, { replace: true })` مرة واحدة.
  - تغيير `from` من `"/company-dashboard"` إلى `null` (`ModernLogin.tsx:32`).
  - إبقاء تأثير "المستخدم المسجّل بالفعل يفتح صفحة اللوجن يُحوَّل تلقائياً" عبر effect واحد يحترم `hasNavigatedRef`.
- **Dependencies**: 1.4, 2.1
- **Acceptance Criteria**: لا سباق تحويلات؛ الوجهة محسوبة مرة واحدة.
- **Validation**: تجربة حية + تحديث اختبارات `ModernLogin` إن وجدت.

### Task 3.2: الحساب الجديد في `Register.tsx`
- **Description**: استبدال `postAuthDest || NEW_ACCOUNT_DESTINATION` بـ `resolvePostAuthDestination(userData)` مع استثناء الحساب الجديد من `lastPath` (لا يكون موجوداً أصلاً)، ومراعاة `redirect`/`source` الحالية للمسارات الخاصة (`ai-inbox`, `action=free/paid`).
- **Dependencies**: 1.4
- **Acceptance Criteria**: الحساب الجديد يبقى على `/marketplace` ما لم يكن `redirect` محدداً (يتطابق مع `Register.test.tsx`).
- **Validation**: `npm test Register` + تجربة حية.

### Task 3.3: الفحص المسبق للصلاحية قبل التوجيه لآخر صفحة
- **Description**: داخل `resolvePostAuthDestination`، عند اختيار `lastPath`/`stateFromPath`: لو `isPathAllowedForUser(path, user) === false` → تُسقَط بصمت وتُنزل للصفحة الافتراضية ثم الدور (قرار المستخدم).
- **Dependencies**: 2.1
- **Acceptance Criteria**: المستخدم لا يقف أبداً على صفحة محظورة بعد اللوجن.
- **Validation**: اختبار وحدة (مستخدم صلاحيته اتغيرت).

---

## Sprint 4: إغلاق ثغرات الباك (صلاحيات دقيقة فعلياً)

**Goal**: `products`, `customers`, `orders` تنفّذ صلاحياتها الحقيقية لا مجرد "عرض".
**Demo/Validation**:
- `AGENT`/`MODERATOR` لا يستطيع إنشاء/تعديل/حذف منتج أو عميل من API مباشرة.
- حسابات المطورين الحاليين لا تفقد وصولها (fallback خريطة الأدوار).

### Task 4.1: `productRoutes.js` — تطبيق الصلاحيات الدقيقة
- **Location**: `apps/backend/routes/productRoutes.js`
- **Description**: جدول تحويل:
  - GET (قائمة/تفاصيل/فئات/تراش/أصناف/عروض/صور) → `products.view`
  - POST (create/duplicate) → `products.create`
  - PATCH/PUT (تعديل منتج/صنف/عرض/حالة bulk) → `products.edit`
  - DELETE (منتج/صنف/عرض/تراش دائم) → `products.delete`
- **Dependencies**: none
- **Acceptance Criteria**: `curl` كـ `AGENT` لإرسال `POST /` يعيد 403.
- **Validation**: اختبارات API يدوية + ركض `rbacMiddleware.test.js`.

### Task 4.2: `customerRoutes.js` — تطبيق الصلاحيات الدقيقة
- **Location**: `apps/backend/routes/customerRoutes.js`
- **Description**: `customers.view` للقراءة، `customers.create` للإنشاء، `customers.edit` للتعديل/العلامات (تصحيح `customers.update` غير المعرّفة عند `:64-65`)، `customers.delete` للحذف.
- **Dependencies**: 4.1
- **Acceptance Criteria**: حذف عميل يتطلب `customers.delete` فعلياً.
- **Validation**: اختبار يدوي بـ `AGENT` (معاه `customers.create` فقط في السيد) → رفض الحذف.

### Task 4.3: `orders.js` — فحص مستوى `orders.view` + تدقيق نهايات التعديل
- **Location**: `apps/backend/routes/orders.js` (بعد نقطة تخطي الميرشنت عند `:96-110`)
- **Description**:
  1. إضافة `requireDbPermission('orders.view')` على مستوى الراوتر بعد `checkAppAccess('order-core')`.
  2. تدقيق مسارات التعديل الحرجة وتطبيق: `orders.status.change` (تغيير الحالة)، `orders.assign`، `orders.invoices.manage`/`orders.invoices.print`، `orders.manual.create`، `orders.quickstatus.manage`، `orders.returns.manage` — بحسب التعريفات في `rbacMiddleware.js`.
- **Dependencies**: 4.1
- **Acceptance Criteria**: `MODERATOR` يبقي قادراً على العمل اليومي (حسب `PERMISSIONS`)، والأدوار الغريبة (AFFILIATE/CUSTOMER) تُرفض.
- **Validation**: فحص تدريجي + اختبارات للطلبات.

### Task 4.4: مزامنة بذور الصلاحيات
- **Location**: `apps/backend/prisma/seeds/seedPermissions.js`
- **Description**: التأكد أن الأدوار المدمجة في DB تحوي مفاتيح `create/edit/delete` (موجودة فعلاً لـ `MANAGER`/`AGENT` عند `:280-348`)، وإعادة تشغيل السيد `npm run seed` أو سكربت `seedPermissions.js` في بيئة لا تفقد صلاحيات. مراجعة `scripts/grant_full_permissions_to_role.js` لمعالجة أي دور مخصص ناقص.
- **Dependencies**: 4.1, 4.2
- **Acceptance Criteria**: `COMPANY_ADMIN`/`TEAM_LEADER` لا يفقدون `products.edit` بعد التحديث (fallback + سيد).
- **Validation**: تشغيل سكربت تحقق من صلاحيات دور بعد السيد.

---

## Sprint 5: إزالة تصادم أدوار المنصة الداخلية

**Goal**: أدوار الشركة لا تُعامل كأدمن نظام، وصلاحية لوحة النظام تكون صريحة فقط.
**Demo/Validation**:
- موظف بدور "Team Lead" لا يصل إلى `/super-admin/*`.
- أدمن المنصة الحقيقي يصل طبيعياً.

### Task 5.1: الفرونت — تقييد أدوار النظام
- **Location**: `apps/frontend/src/utils/postAuthRouting.ts` (كانت `authRouting.ts:1-7`)، `pages/auth/Login.tsx:28-38`
- **Description**: `SYSTEM_ROLES` → `['SUPER_ADMIN']` فقط. إزالة `"Project Manager", "Team Lead", "Developer", "Tester"` من أي قائمة تحويل داخلية.
- **Dependencies**: 1.2
- **Acceptance Criteria**: لا مسار كود يحوّل أدوار الشركة لمساحة السوبر أدمن.
- **Validation**: grep على القائمة القديمة في الفرونت.

### Task 5.2: الباك — تقييد `requireSuperAdmin`
- **Location**: `apps/backend/middleware/superAdminMiddleware.js:118-132`
- **Description**:
  - `systemRoles` الافتراضية → `['SUPER_ADMIN']` فقط.
  - **لا فريق منصة داخلي** (قرار المستخدم): إزالة مسار "كل مفاتيح `settings.permissions` تصبح أدوار نظام" نهائياً — لا حاجة لقائمة `platformAdminRoles` حالياً، ويمكن إضافتها لاحقاً فقط لو ظهر استخدام داخلي.
  - `normalizeRole`/`ROLE_HIERARCHY` تُبسّط أو تُترك كمساعدة ترقية (لا تُستخدم كأساس لمنح صلاحية نظام).
- **Dependencies**: none
- **Acceptance Criteria**: `requireSuperAdmin` لا يمرر "Team Lead"/"Developer" افتراضياً أو من الـ settings.
- **Validation**: تحديث `tests/middleware` إن وُجد + اختبار يدوي.

### Task 5.3: مراجعة بقية قوائم الأدوار القديمة
- **Location**: `authController.js:637`, `superAdminController.js:300,1457`, `adminCompnayController.js:24` (`FOLLOW_UP_OWNER_ROLES`), `apps/backend/legacy_mysql/scripts/check_system_users.js`
- **Description**: فصل "أدوار فرق المنصة" عن "أدوار الشركات". أي قائمة تستخدم أسماء "Team Lead/Developer/..." لصلاحيات إدارية يجب أن تعتمد على `platformAdminRoles` الصريحة.
- **Dependencies**: 5.2
- **Acceptance Criteria**: مرجع واحد لأدوار المنصة.
- **Validation**: grep شامل لـ "Team Lead"/"Developer" في الباك ومراجعة كل استخدام.

### Task 5.4: ترحيل بيانات مستخدمي "Team Lead"
- **Description**: سكربت فحص/ترحيل مرة واحدة يجد مستخدمي الشركات الذين `role`/`roleRef.key` = `Team Lead`/`Developer`/`Tester`/`Project Manager`/`Agent` ويحوّلهم للـ RBAC المناسب (`TEAM_LEADER`/`MODERATOR`/`EMPLOYEE`)، مع حفظ تقرير قبل/بعد. **لا يوجد فريق منصة داخلي محتفظ بهذه الأدوار** (قرار المستخدم) — أي مستخدم بهذه الأدوار هو مستخدم شركة خاطئ ويُصحح.
- **Dependencies**: 5.2
- **Acceptance Criteria**: صفر مستخدمي شركة بدور منصة داخلي في التقارير.
- **Validation**: سكربت يحسب العدد قبل وبعد.

---

## Sprint 6: إصلاح السايدبار fail-open + تجربة متسقة

**Goal**: المستخدم يرى في القائمة فقط ما يملك صلاحيته، ولا يوجد فتح كامل عند غياب الصلاحيات.
**Demo/Validation**:
- `AGENT` بدون صلاحيات محمّلة يرى قائمة فارغة أو قائمة أمان (لا كل النظام).

### Task 6.1: إغلاق fail-open في السايدبار
- **Location**: `apps/frontend/src/config/sidebar.ts:141-144`
- **Description**: `BUILT_IN_ROLES` مع `userPerms.length === 0` → **`false`** (رفض) بدل `true`. التحقق أن كل الأدوار المدمجة لها صلاحيات seed (سبرنت 4.4 يضمن ذلك).
- **Dependencies**: 4.4
- **Acceptance Criteria**: غياب الصلاحيات = إخفاء (fail-closed).
- **Validation**: فحص يدوي بحساب `AGENT` بعد إعادة السيد.

### Task 6.2: توثيق دلالة `.some()` في القائمة
- **Description**: في `sidebar.ts:150,174` إبقاء `.some()` لقوائم العرض (إظهار القسم إذا كان لديك أي صلاحية مرتبطة) مع تعليق يوضح الفرق بين دلالة القائمة (أي) وحراسة المسار (كل).
- **Dependencies**: none
- **Acceptance Criteria**: لا تغيير سلوكي، فقط توثيق.
- **Validation**: مراجعة كود.

---

## Testing Strategy

- **Unit**: `postAuthRouting.test.ts`, `routeAccess.test.ts`, تحديث `authRouting.test.ts`, `Register.test.tsx`, `CompanyProtectedRoute`/`AccessDenied` tests.
- **Backend**: `rbacMiddleware.test.js`, `permissionService.test.js` + اختبارات API يدوية (curl) بأدوار `AGENT`/`MODERATOR`/`TEAM_LEADER` على المنتجات/العملاء/الطلبات.
- **E2E (يدوي)**: تسجيل دخول كـ (أدمن شركة، موظف بصلاحيات جزئية، موظف بلا صلاحيات) والتحقق: الوجهة بعد الدخول، لا وميض، شاشة رفض موحدة، السايدبار مكيّف.
- **فرق دلالة**: أي تعديل على `requiredPermissions`/`allowedRoles` يتم معه تحديث اختبارات الصفحة.

## Potential Risks & Gotchas (مراجعة ذاتية للخطة)

1. **مستخدم حالي يملك صلاحية بـ fallback وقد يفقدها بعد التقسيم الدقيق**: خريطة `rbacMiddleware` تدعم `hasPermission(role, key)` كـ fallback عند غياب صلاحيات DB، والسيد يحوي المفاتيح الكاملة. التخفيف: Task 4.4 إعادة سيد + فحص تقرير أدوار قبل النشر. إضافة تذكير: **لا يُنشر Sprint 4 قبل Sprint 6.1** وإلا السايدبار يكشف لكل الأدوار.
2. **`.some()`→`.every()` قد تحجب صفحات بنية أصلاً**: `every` مع `['products.create','products.view']` ستحجب مستخدم معاه `create` فقط (غير شائع). الحل: تحويل المسارات متعددة الصلاحيات لصلاحية واحدة أدق (Task 2.2). إبقاء `.some()` في القائمة عمداً.
3. **`lastPath` كسر للتبديل بين الشركات**: مفتاح مضمّن فيه `companyId` يمنع توجيه مستخدم لصفحة تخص شركة أخرى. ضمان ألا يحفظ `lastPath` لصفحات عامة/تسجيل (Task 1.3).
4. **MERCHANT/AFFILIATE و `lastPath`**: الميرشنت اللي آخر صفحته خارج مساحته سيتكرر bounce من `App.tsx:1575-1597`. الحل مدمج: للـ MERCHANT/AFFILIATE يتم التحقق بـ `isMerchantPrivatePathAllowed`/`isAffiliatePrivatePathAllowed` قبل قبول `lastPath` (Task 1.2).
5. **`state.from` vs `lastPath`**: `from` (استئناف فوري لجلسة منتهية) يأتي أولاً لأن نيّته أحدث من "آخر صفحة قبل خروج قديم". لو تعارض `from` مع صلاحيات المستخدم الحالية يُرفض (Task 3.3).
6. **مخاطرة التعديل في `orders.js` الكبير**: إضافة `orders.view` على مستوى الراوتر آمن (كل الأدوار الأربعة تملكها)، لكن التدقيق النقطي للنهايات الحساسة يحتاج قائمة تحقق وتحديث اختبارات. يُنفّذ على دفعات ولا يُغلق على الـ MODERATOR في العمليات اليومية (مطابق لخريطة الصلاحيات).
7. **`ModernLogin` وإبقاء "المستخدم المسجّل يفتح اللوجن"**: حذف الـ effect كاملاً سيُبقي المسجّل على صفحة اللوجن. الحل: effect واحد + `hasNavigatedRef` يمنع التداخل (Task 3.1).
8. **لا فريق منصة داخلي**: بعد تقييد `systemRoles` إلى `SUPER_ADMIN` فقط، أي مستخدم بدور "Developer/Tester/Team Lead/Project Manager" سيُعامل كموظف شركة. Task 5.4 يفحص ويصحّح البيانات الموجودة ويُصدر تقرير قبل التحديث، بحيث لا يُكتشف مستخدم بصلاحيات نظام خاطئة بعد النشر.
9. **السيد يعيد كتابة صلاحيات الأدوار المخصصة؟**: `seedPermissions.js` يعمل upsert للدور الافتراضي فقط ولا يمس الأدوار المخصصة — لكن أي نص يدوي للمفاتيح الجديدة يجب أن يسبقه فحص أن الأدوار المخصصة لا تفقد مفاتيحها (Task 4.4 + `grant_full_permissions_to_role.js`).
10. **`DefaultPageRedirect` عند `/`**: يقرأ `maxp-default-page` ويُسقط `/apps`؛ بعد التوحيد يجب أن يعتمد على `resolvePostAuthDestination` أيضاً حتى لا يتعارض مع `lastPath`.

## Rollback Plan

- **Frontend**: كل التغييرات في ملفات قابلة للعزل (أدوات/مكوّنات)؛ revert سهل لملفين/ثلاثة. تخزين `lastPath` تحت مفتاح جديد لا يمس `maxp-default-page` القديم (توافق رجعي).
- **Backend**: تغيير مفاتيح `requireDbPermission` في `productRoutes/customerRoutes/orders.js` يُعكس بسهولة (git revert)؛ يجب عمل snapshot للبيانات قبل سكربت الترحيل 5.4.
- إبقاء اختبارات قبل/بعد لكل سبرنت كمعيار تراجع.

## Summary

- 6 سبرنت: بنية التوجيه → حراسة الفرونت → إصلاح اللوجن/آخر صفحة → صلاحيات الباك → تصادم أدوار المنصة → السايدبار.
- كل سبرنت قابل للعرض والاختبار بشكل مستقل.
- الأولوية للمخاطرة: **لا يُنشر Sprint 4 (صلاحيات الباك) إلا بعد Sprint 6.1 (إغلاق السايدبار)** لتجنب كشف كل النظام مؤقتاً، و**Sprint 5 يُنشر مع تقرير الترحيل 5.4** لأن لا فريق منصة داخلي يحتفظ بالأدوار القديمة.
- قرارات المستخدم: لا فريق منصة داخلي · نطاق الباك = orders/customers/products فقط (الباقي مؤجل) · آخر صفحة بمفتاح لكل مستخدم+شركة.
