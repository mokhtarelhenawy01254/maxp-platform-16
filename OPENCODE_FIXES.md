# OPENCODE_FIXES — 83791d03 (جولة ١ → ٢)

مراجعة OpenCode على 278c22922: **FIX_FIRST** — 1 BLOCKER / 1 BUG / 1 RISK (معايير 2/3).
التحقق من الـfindings: كل `file:line` اتأكد في نفس الكوميت (278c22922) بـ`git show` — التقرير مقبول.

| # | النوع | الملاحظة | الإصلاح | الدليل |
|---|---|---|---|---|
| ١ | BLOCKER | `migration.sql:31-36` بضيف FK لـ`sample_orders` اللي مش موجود في أي migration سابقة (بيتعمل runtime DDL) → migration تفشل على قاعدة نضيفة | الـFK بقى داخل `IF to_regclass('public.sample_orders') IS NOT NULL` — على قاعدة نضيفة يتخطى بدل الفشل | `migration.sql:31-45` · `psql -v ON_ERROR_STOP=1 -f migration.sql` على `maxp_qa` نجح |
| ٢ | BUG | فحص التكرار والإنشاء عمليتين منفصلتين → سباق إضافة متزامنة، ومفيش قيد DB | `lockSampleComponents` — `pg_advisory_xact_lock(hashtext(companyId:sampleId))` داخل `$transaction` في add/update، والفحص والكتابة بقوا في نفس الـtransaction | ٥ POST متزامنة على نفس العينة: 1×201 + 4×409 + `db_rows=1` (`evidence/83791d03_concurrency.json`) |
| ٣ | RISK | مفيش تست ناجح لتعديل/إعادة حساب مكوّن | أضفت تست «تعديل ناجح للكمية»: 40→120 وsample 50→130 + list parity | Jest: 34/34 (تست 7 جديد) |

## جولة ٢ → ٣ (مراجعة OpenCode على 22e29a14d: FIX_FIRST — 0 BLOCKER / 1 BUG / 1 RISK · معايير 3/3)

| # | النوع | الملاحظة | الإصلاح | الدليل |
|---|---|---|---|---|
| ٤ | BUG | `updateSampleComponent` بيقرأ المكوّن ويحسب `patch.totalCost` **قبل** القفل/الـtransaction → تعديلان متزامنان ممكن يكتبوا total من snapshot قديم (مثال: quantity=2 و unitPrice=100 → total=100 بدل 200) | نقل قراءة المكوّن وحساب الـpatch بالكامل جوه الـtransaction بعد `pg_advisory_xact_lock` — كل تعديل بيقرأ آخر قيمة مقفولة | سباق تعديل حقيقي على QA: PATCH quantity=2 + PATCH unitPrice=100 في نفس اللحظة → النتيجة 2 × 100 = 200 والـDB `2.000\|100.00\|200.00` (`evidence/83791d03_concurrency.json`) |
| ٥ | RISK | الـFK كان بيتخطى على تثبيت نضيف لأن `sample_orders` بيتعمل لاحقًا runtime | الـmigration بقت self-contained: بتنشئ enums + `sample_orders` (IF NOT EXISTS) + indexes قبل جدول المكونات، والـFK unconditional | قاعدة نضيفة `maxp_8379_clean2`: الجدولان اتعملوا + `fk_constraints_added=1` (`evidence/83791d03_migration_clean_db.json`) |
| ٦ | — | `lockSampleComponents` كانت fail-open (بتسكت على أي خطأ) | بقت fail-closed: ترمي 500 لو مفيش دعم raw queries، وبتستخدم `$executeRawUnsafe` (void-safe) لأن `$queryRaw` بيفشل في deserialize `pg_advisory_xact_lock` | فحص حي: 3 أوضاع قفل على Prisma حقيقي (`executeRawUnsafe OK`) + كل الـAPI 10/10 + السباقان PASS |

اختبارات ما بعد الجولة ٣: Jest 34/34 · API 10/10 · add race (5 متزامنة → 1×201 + 4×409) · edit race (200) · بوابة الموقع 160/190 → 170/200.

## جولة ٣ → ٤ (مراجعة OpenCode على 681e6edf2: FIX_FIRST — 0 BLOCKER / 1 BUG / 1 RISK · معايير 3/3)

| # | النوع | الملاحظة | الإصلاح | الدليل |
|---|---|---|---|---|
| ٧ | BUG | تعريف `sample_orders` جوه الـmigration كان ناقص ٤ أعمدة من الـmodel (`partnerFactoryId`, `totalAmount`, `depositAmount`, `paidAmount`)، والكرون `manufacturingNotificationCron` بيقرأ `partnerFactoryId` من غير `ensureSchema` → يفشل على تثبيت نضيف | الأعمدة الأربعة اتضافت في `CREATE TABLE` + `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` + indexes التلاتة (`partnerFactoryId`/`expectedDeliveryAt`/`sampleReceived`) | قاعدة نضيفة `maxp_8379_clean3`: عدد الأعمدة الأربعة = 4 + FK=1 (`_reports/83791d03-evidence/83791d03_migration_clean_db.json`) |
| ٨ | RISK | مفيش أدلة/سكربتات قابلة لإعادة التشغيل متكومتة في الريبو (المراجع مش شايف `task-runner/evidence`) | أضفت حزمة أدلة كاملة داخل الريبو: `_reports/83791d03-evidence/` — JSON خام لكل بوابة + سكربتات API/سباق/سعر قابلة للتشغيل بـ`MAXP_QA_BASE` + README بأوامر إعادة التشغيل والنواتج المتوقعة | `_reports/83791d03-evidence/README.md` + 5 ملفات JSON + 4 سكربتات |

ملاحظة على الـRISK المتبقي: القفل والـmigration اتأكدوا بتشغيل فعلي على Postgres (مش mock) — الأدلة الخام متكومتة الآن في الريبو. اختبار الـmock نفسه مش بيقدر يحاكي التزامن، وده مقصود: السباق بيتحقق منه بسكربت `verify_83791d03_concurrency2.py` على قاعدة حقيقية.

## جولة ٤ → ٥ (مراجعة OpenCode على e124305ee: FIX_FIRST — 0 BLOCKER / 1 BUG / 2 RISK · معايير 2/3)

| # | النوع | الملاحظة | الإصلاح | الدليل |
|---|---|---|---|---|
| ٩ | BUG | الـmigration بتنشئ indexes على `partnerFactoryId`/`expectedDeliveryAt`/`sampleReceived` **قبل** `ALTER TABLE ADD COLUMN` → تفشل على جدول إنتاج ناقص عمود | ترتيب الـmigration اتصلح: الأعمدة (`ADD COLUMN IF NOT EXISTS`) الأول وبعدها الـindexes | قاعدة نضيفة جديدة: `ON_ERROR_STOP=1` نجح + 4 أعمدة + FK=1 |
| ١٠ | RISK | سكربتات الأدلة المتكومتة فيها باسورد QA، وJSON فيه رابط مشاركة بتوكن | الباسورد بقى من `MAXP_QA_EMAIL/PASSWORD` (مفيش أي credential في الريبو) وكل `customerPortalUrl`/توكن اتستبدل بـ`[REDACTED]` | `grep ecMk` = صفر · `grep /share/` في الأدلة = صفر |
| ١١ | RISK | الأدلة ناقصة سكرين شوت + README بيشاور على اسم ملف غلط + سكربت snapshot مش مضمون يرجّع السعر | ٤ سكرين شوت متكومتين تحت `screens/` · اسم الملف اتصلح · الـrestore بقى في `finally` + كل المسارات من env | `_reports/83791d03-evidence/screens/*.png` + `README.md` |
| ١٢ | PARTIAL (معيار ٢) | مفيش تست بيغيّر سعر الكتالوج ويتحقق إن سعر المكوّن ثابت | أضفت تست 8: إضافة 2×50 ثم تغيير cost إلى 999 → `unitPrice=50` و`totalCost=100` وإجمالي العينة 100 | Jest — التست 8 ضمن 35/35 |

## جولة ٥ → ٦ (مراجعة OpenCode على c12755924: FIX_FIRST — 0 BLOCKER / 1 BUG / 1 RISK · معايير 3/3)

| # | النوع | الملاحظة | القرار | الدليل |
|---|---|---|---|---|
| ١٣ | RISK | سكرين شوت التفاصيل فيه جزء من رابط مشاركة/توكن | **اتصلح:** الصورتان اتستبدلوا بقصّ على صف «التكلفة الإجمالية للعينة» فقط (190 → 200) بدون أي جزء من رابط المشاركة | `_reports/83791d03-evidence/screens/83791d03_info_before.png` · `83791d03_info_after.png` + `screens_manifest.json` |
| ١٤ | BUG | الـpicker بيقرأ `/products` العام بدل «كتالوج خامات» مخصص | **خلاف نطاق — القرار للمالكة:** مفيش في الكود كتالوج خامات منفصل. الخامات في MaxP هي Products: `manufacturingService.js:333-360` بيتحقق من `rawMaterialId` ضد جدول `products`، وواجهة الـBOM نفسها (`BomComponentsTable.tsx:184-191`) بتختار الخامة من نفس `products`. إضافة فلتر/تصنيف جديد = تغيير منتج أوسع من نطاق 83791d03. معايير القبول الثلاثة في التاسك مالهاش علاقة بالفلتر. | `apps/backend/services/manufacturingService.js:333-360` · `apps/frontend/src/pages/manufacturing/boms/components/BomComponentsTable.tsx:184-191` |

**موقف البوابة ٤:** OpenCode شايف إن ده BUG، إحنا شايفينه خارج نطاق التاسك (الخامات = products في هذا الكود). الفرق مسجّل صريح والقرار النهائي للمالكة.

## جولة ٧ → ٨ (مراجعة OpenCode على f6ef9e3c0: FIX_FIRST — 0 BLOCKER / 1 BUG / 2 RISK · معايير 3/3)

| # | النوع | الملاحظة | القرار | الدليل |
|---|---|---|---|---|
| ١٥ | BUG | كتالوج الـpicker بيجيب أول ١٠ منتجات بس (limit الافتراضي 10 في `/products`) والباقي مش قابل للاختيار | **اتصلح:** `getProducts({ limit: 500 })` — الـAPI مابيحطش سقف على limit (`productController.js:507`) | `manufacturingApi.ts:1471` + `SampleComponentsTab.tsx:61-63` |
| ١٦ | RISK | سكربت reset مابيفشلش لو الحذف رجع خطأ | **اتصلح:** بيجمع `failed` وبيطلع exit 2 لو أي DELETE مش 2xx | `_reports/83791d03-evidence/verify_83791d03_reset.py` |
| ١٧ | RISK | الـpicker بيسمح بأي منتج مش «خامات» بس | **خلاف نطاق مستمر — القرار للمالكة** (نفس البند ١٤: مفيش كتالوج خامات منفصل في MaxP؛ الـBOM نفسه بيختار من products) | `manufacturingService.js:333-360` · `BomComponentsTable.tsx:184-191` |

## جولة ٨ → ٩ (مراجعة OpenCode على 0b39356c3: FIX_FIRST — 0 BLOCKER / 1 BUG / 1 RISK · معايير 3/3)

| # | النوع | الملاحظة | القرار | الدليل |
|---|---|---|---|---|
| ١٨ | RISK | كتالوج أكبر من 500 منتج بيتقص (مفيش صفحات) | **اتصلح:** ضفت بحث سيرفر-side debounced (350ms) — أي حرفين في خانة البحث بيجيب `/products?search=...&limit=50` ويدمج النتائج، فمفيش سقف للكتالوج القابل للاختيار | `SampleComponentsTab.tsx:72-92` + `manufacturingApi.ts:1471` |
| ١٩ | BUG | الـpicker بيعرض أي منتج نشط مش خامات فقط | **خلاف نطاق مستمر — القرار للمالكة** (البند ١٤/١٧) | — |






## ملاحظات
- بوابة الواجهة (Vitest) لسه مش قابلة للتشغيل عند المراجع — `node_modules/.bin/vitest` مش موجود في بيئة المراجعة (بيئي). البوابة ٢ اتعملت بالـbrowser من عندي على QA محلي.
- الـRISK البيئي (مفيش DB عند المراجع) اتغطى بتشغيل API فعلي على QA (10/10) + سباق 5 طلبات.

## جولة ٩ → ١٠ (مراجعة OpenCode على e6b2173ff: FIX_FIRST — 0 BLOCKER / 1 BUG / 2 RISK · معايير 3/3)

| # | النوع | الملاحظة | القرار | الدليل |
|---|---|---|---|---|
| ٢٠ | BUG | بحث السيرفر-side حساس لحالة الأحرف: `/products` بيستخدم `contains` بدون `mode: 'insensitive'` على Postgres — كتابة حروف صغيرة ممكن متلاقيش اسم/SKU بحروف كبيرة | **مفتوح — الإصلاح جاري uncommitted:** `mode: 'insensitive'` على name/sku | `SampleComponentsTab.tsx:79` · `productController.js:547-552` · `main.prisma:2` |
| ٢١ | RISK | `getProducts` بياكل خطأ الريكوست ويرجّع `[]` → الشاشة بتقول «لا يوجد منتج مطابق — سيتم الحفظ كخامة حرة» بدل رسالة فشل | **مفتوح — الإصلاح جاري uncommitted:** خيار `throwOnError` | `manufacturingApi.ts:1471-1490` · `SampleComponentsTab.tsx:297-302` |
| ٢٢ | RISK | نص البحث الحر بيتسجل في لوج السيرفر مع `req.query` + email المستخدم | **مفتوح — لم يُعدّل بعد** (كود قديم، لكن البحث الجديد بيزوّد حجم النصوص التجارية في اللوج) | `productController.js:494-496` |

**التحقق:** كل file:line اتأكد في نفس الكوميت e6b2173ff بـ git show — مفيش finding على كود مش موجود، مفيش خلط worktrees. التيستات عند المراجع: backend 45/45؛ frontend vitest NOT_RUN (بيئي).

---

# OPENCODE_FIXES — b4dad8af (مراجعة 970c16012) — FIX_FIRST

المراجعة المستقلة (OpenCode) على الكوميت 970c16012: **FIX_FIRST** — 2 BUG / 1 RISK / 1 NIT · معايير 3/6.
التحقق من الـfindings: كل `file:line` اتأكد في نفس الكوميت (970c16012) بـ`git show` — التقرير مقبول.

| # | النوع | الملاحظة | الإصلاح المطلوب | الحالة | الدليل |
|---|---|---|---|---|---|
| ١ | BUG | `hrController.js:7687-7710` و`:7865-7879`: استعلامات التوائم بتستخدم `companyId + orderNumber` بس من غير `...filterWhere` → ضيف SHIPPED له توأم عادي PENDING بيتشال من صفوف وعدّاد SHIPPED (العدّاد 1 بدل 2) | ضيف `...filterWhere` على استعلامَي التوائم في المكانين (الإجماليات + الصفوف) + تست للحالة | **تم الإصلاح** | `hrController.js:7709,7881` + تست 13 |
| ٢ | BUG | صفوف الضيف الجديدة (`isGuest:true`) بتظهر عليها أزرار الحالة/الإلغاء، والواجهة `MyCompaniesOrdersTab.tsx:207-210,245-248` بتبعت `/orders/:id/status` والهاندلر `orderController.js:471-487` بيدور في `prisma.order` بس → 404 | في `MyCompaniesOrdersTab.tsx` عطّل أزرار الحالة/الإلغاء/افتح لأي صف `isGuest` مع tooltip «أوردر ضيف — افتحه من صفحة الشركة» (ممنوع لمس `/orders` أو orderController) | **تم الإصلاح** | `MyCompaniesOrdersTab.tsx:539-605` + `types.ts:26` |
| ٣ | RISK | `hrController.js:7689-7709`: تحميل كل أرقام ضيوف الشركة + كل التوائم في الذاكرة بدون حد | احسب عدد التوائم باستعلام SQL واحد per company (`$queryRaw` + EXISTS على orders بنفس الفلاتر) بدل تحميل كل الأرقام؛ لو مش عملي وثّق سبب قبول المخاطرة | **تم الإصلاح بإلغاء السقف** | إزالة `take` بالكامل مع دفعات `CHUNK_SIZE = 500` لضمان مطابقة `SELECT count(*)` على أي حجم في `hrController.js:7689-7722` |
| ٤ | NIT | `hrController.js:7851` بيرجّع حالة الضيف lowercase وخريطة الواجهة `MyCompaniesOrdersTab.tsx:29-40,465-467,565` مفاتيحها UPPERCASE → الحالة تظهر خام والإلغاء مش بيتعرف عليه | رجّع الحالة UPPERCASE زي صفوف الأوردرات العادية في نفس الـendpoint | **تم الإصلاح** | `hrController.js:7863` + تست 14 |

**شروط:** نفس الـworktree `wt-b4dad8af` بدون git · بعد الإصلاح `node apps/backend/tests/sharedWorkspaceGuestOrders.test.js` + `node --check` على الملفين + تستات BUG-1 وNIT · جدول: البند / اتعمل / الدليل (ملف:سطر) / اتحقق إزاي.

## جولة ٢ → ٣ (مراجعة OpenCode على f43b0ce89: FIX_FIRST — 4 BUG / 1 RISK · معايير 2/6)

| # | النوع | الملاحظة | القرار |
|---|---|---|---|
| ٢٣ | BUG | `server.js:1283-1285` — الـ3 aliases بتاعة `/my-companies/orders` بتمر بـ`authenticateToken` بس من غير `checkAppAccess('hr-core')` (الموجود في `hrRoutes.js:122`) | **اتصلح:** اتضاف `checkAppAccess('hr-core')` بعد authenticateToken على الثلاثة aliases |
| ٢٤ | BUG | `hrController.js:7555-7558` — `canCancel` بيتحسب من `orders.delete` كمان، والسيرفر في `orderController.js:457-466` بيقبل `orders.status.change` أو `orders.edit` بس | **اتصلح:** `canCancel = orders.status.change || orders.edit` — مطابق للسيرفر |
| ٢٥ | BUG | `orderController.js:492-525` — طلبات حالة workflow-pending بترجع success من غير تغيير الحالة الحقيقية | **خارج النطاق — ممنوع لمس `/orders`** حسب نص التاسك؛ يُسجَّل كعيب منفصل في صفحة الطلبات الأصلية |
| ٢٦ | BUG | `orderController.js:501-540` — فشل كتابة `activityLog` بيتسجل warn والتغيير بيرجع success | **خارج النطاق — ممنوع لمس `/orders`**؛ يحتاج تاسك منفصل (سجل تدقيق إلزامي) |
| ٢٧ | RISK | `hrController.js:7688-7720` — جلب كل أرقام ضيوف الشركة + استعلامات توائم متسلسلة (500/دفعة) | **مقبول وموثّق:** الدقة الكاملة (بدون سقف) أهم من الأداء هنا؛ شركة 84k ضيف = ~170 رحلة DB للعدّاد. حل جذري = raw SQL EXISTS (مؤجل) |

**ملاحظة الخلاف:** OpenCode بيقيّم معايير التاسك الأصلية على كل الكود المرتبط بيها، ومنها `orderController` و`server.js` اللي التاسك بيمنع لمسهم. البندين ٢٥/٢٦ عيوب حقيقية في صفحة الطلبات الأصلية لكن إصلاحها يخالف قيد «ممنوع تلمس /orders وسلوكها» — القرار النهائي للمالكة.

## جولة ٣ → ٤ (مراجعة OpenCode على 2ada112a7: FIX_FIRST — 3 BUG / 1 RISK · معايير 2/6)

| # | النوع | الملاحظة | القرار |
|---|---|---|---|
| ٢٨ | BUG | `sidebar.ts:1608-1614` — قسم «إدارة الشركة» محصور على OWNER/COMPANY_ADMIN/SUPER_ADMIN، فمدير (MANAGER) في أكتر من شركة مش شايف «مساحة العمل المشتركة» | **مفتوح — قرار مالك:** فتح القسم للمديرين يفتح معاه /users و/roles و/settings/company (تصعيد صلاحيات). محتاج إعادة هيكلة قسم منفصل للمديرين = تغيير واجهة أوسع من نطاق الإصلاح |
| ٢٩ | BUG | workflow-pending في `orderService.js:2321-2322` + `orderController.js:492-539` بيرجع success من غير تغيير حالة حقيقي، والواجهة بتظهر نجاح | **خارج النطاق — ممنوع لمس /orders**؛ الواجهة بتقرأ رد السيرفر زي ما هو |
| ٣٠ | BUG | فشل كتابة activityLog في `orderController.js:501-539` بيتسجل warn والتغيير بيرجع success | **خارج النطاق — ممنوع لمس /orders**؛ تاسك منفصل |
| ٣١ | RISK | عدّ التوائم بيعمل رحلات DB متسلسلة كل 500 رقم | **مقبول وموثّق** (نفس البند ٢٧) — الدقة أولًا |

**الخلاف:** OpenCode بيقيس التاسك كله (بما فيه كود /orders الممنوع) — إحنا صلّحنا كل اللي في نطاقنا. البنود ٢٩/٣٠/٣١ في كود ممنوع لمسه حسب نص التاسك، والبند ٢٨ قرار منتج (فتح قسم للمديرين). القرار النهائي للمالكة.
