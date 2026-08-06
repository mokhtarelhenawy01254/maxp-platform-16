# خطة مراجعة وتطوير نظام المحاسبة المالية (الدفع حسب الاستخدام — Pay-Per-Use)

> التاريخ: ٦ أغسطس ٢٠٢٦
> النطاق: تطبيق المتجر `store` + نظام المحفظة `companyWallet` + فواتير الاستخدام `appUsageLog`
> النتيجة: تدقيق كامل + مقارنة بأفضل ممارسات ٢٠٢٦ + خطة تنفيذ للميزة المطلوبة (تعليق الطلبات حتى شحن الرصيد)

---

## ١. الملخص التنفيذي

نظام المحاسبة المالية الحالي (الدفع حسب الاستخدام) فيه **٦ أخطاء مؤكدة بالكود** و**٥ نقاط ضعف تصميمية**، أهمها:

1. **الخصم الشهري للمنصة والأدوات لا يعمل فعليًا** — `billingCronService` يكتب في جدول `wallet_transactions` المخصص لمحافظ *العملاء* (`customer_wallets`) بينما المحفظة هنا محفظة *شركة* (`company_wallets`)، والجدول مربوط بقيود Foreign Key على `customer_wallets` → كل عملية خصم تفشل وتُسجَّل كخطأ. (تسريب إيرادات مباشر + اشتراكات لا تُجدَّد تلقائيًا).
2. **تقرير الاستخدام (`GET /wallet/billing/usage`) مكسور** — يستعلم عن حقول غير موجودة في `appUsageLog` (`companyId` و `action`).
3. **تسريب الإيرادات الصامت** — `billOrderPpuApps` عندما يكون رصيد المحفظة أقل من تكلفة الطلب **يتخطى الفاتورة بصمت** (لا خصم، لا سجل، لا أثر) مع بقاء الطلب ظاهرًا للمتجر. هذا بالضبط السلوك اللي لاحظته.
4. **لا يوجد طابور تحصيل مؤجّل** — بعد أي عملية شحن للرصيد لا يوجد أي معالجة للمبالغ غير المحصلة.
5. **تضارب في جداول سجل الحركة** — بعض الأماكن تكتب في `Transaction` (صح للشركات) وبعضها في `walletTransaction` (خطأ).
6. **`totalSpent` غير مُحدّث** في مساري باقة الشراء وشراء الثيم.

**التحسينات المقترحة** ترفع النظام من "محاسبة إرشادية" إلى "محاسبة فعلية" مطابقة لأفضل ممارسات Stripe/Orb/Metronome/Twilio في ٢٠٢٤–٢٠٢٦، وتضيف الميزة المطلوبة: **الطلبات تُنشأ دائمًا، لكنها تختفي من قائمة الطلبات حتى يُشحن الرصيد، وعند الشحن يُخصم كامل المبلغ المستحق ويظهر الطلب**.

---

## ٢. المنهجية

- ٣ عملاء (agents) بحثوا بالتوازي:
  - عميل استكشاف خريطة الفوترة الكاملة (نماذج، مسارات، نقاط الخصم، نقاط الشحن).
  - عميل استكشاف واجهة إعدادات المتجر + قائمة الطلبات + الفلاتر.
  - عميل تدقيق ميداني للتحقق من الأخطاء بأسطر الكود بالضبط (file:line).
- عميل بحث خارجي لأفضل ممارسات الفوترة حسب الاستخدام ٢٠٢٤–٢٠٢٦ (Stripe Metronome / Orb / Lago / OpenMeter / Twilio / Vonage / Meta WhatsApp BSP).
- فحص التطبيق الحي: `https://maxp.online/my-apps/store/settings` (شركة Swan — تطبيق `store` بسعر ٢ جنيه لكل طلب، ١٨ طلبًا = ٣٦ جنيه هذا الشهر).

---

## ٣. كيف يعمل النظام اليوم (الخريطة الفعلية)

```
عميل يشتري من المتجر
   └─ publicOrdersRoutes.js:2131 → prisma.order.create (الطلب يظهر فورًا في "الطلبات")
        └─ publicOrdersRoutes.js:2370 → billOrderPpuApps(...)
             ├─ لكل تطبيق PPU نشط (store=2ج/طلب، hr-basic=5ج، whatsapp=0.1ج، ai-chat=0.5ج)
             │    ├─ الرصيد كافي؟  → خصم من المحفظة + تسجيل Transaction + appUsageLog  ✅
             │    └─ الرصيد غير كافٍ؟ → SKIP صامت (لا شيء يُسجَّل)  ❌  ← المشكلة
```

- نقطة الخصم الوحيدة للاستخدام: `services/orderBasedBillingService.js:83-89`.
- نقاط شحن الرصيد الأربعة: `walletController.rechargeWallet`، ويبهوك كاشير `kashierRoutes.js:192`، إضافة أدمن `adminWalletRoutes.js:72`، اعتماد إيصال `walletPayment.js:518`. **لا يوجد أي منها يعالج المبالغ المؤجلة بعد الشحن.**
- لا يوجد أي سجل Order تُنشئه المنصة نفسها؛ الطلبات المعروضة في "الطلبات" هي طلبات المتجر الحقيقية.

---

## ٤. الأخطاء المؤكدة (بالأدلة)

| # | الخطأ | الدليل | التأثير | الخطورة |
|---|-------|--------|---------|---------|
| 1 | `billingCronService` يكتب حركة خصم الشركة في جدول `wallet_transactions` المخصص لمحافظ العملاء (FK على `customer_wallets`) | `billingCronService.js:168-177, 344-353` + `migration.sql:10195` + `WalletTransaction` في `misc.prisma:240-258` | الخصم الشهري لرسوم المنصة واشتراكات الأدوات **يفشل في كل مرة** → إيرادات متكررة ضائعة + اشتراكات لا تُعلَّق بشكل صحيح | 🔴 حرجة |
| 2 | `getUsageReport` يستعلم حقولًا غير موجودة `companyId` و `action` على `appUsageLog` | `walletController.js:403, 419-433, 440` | تقرير الاستخدام `/wallet/billing/usage` **مكسور (خطأ وقت التشغيل)** | 🔴 حرجة |
| 3 | `billOrderPpuApps` يتخطى الفاتورة صامتًا عند نقص الرصيد | `orderBasedBillingService.js:75-79` | تسريب إيرادات بلا أي أثر/أداة تدقيق | 🔴 حرجة |
| 4 | لا معالجة للمبالغ المؤجلة بعد أي شحن | كل مسارات الشحن (4) بلا استدعاء | المبالغ المستحقة لا تُحصّل أبدًا | 🔴 حرجة |
| 5 | `subscribeToBundle` و `purchaseTheme` ينقصان الرصيد دون تحديث `totalSpent` | `marketplaceController.js:2005-2010` و `storefrontThemeCatalogService.js:1374-1379` | إحصائيات الإنفاق غير دقيقة | 🟠 متوسطة |
| 6 | `rechargeWallet` لا يحدّث `totalDeposited` (رغم أن الحقل موجود!) | `walletController.js:200-206` + تعليق خاطئ سطر 204 | إجمالي المودَع غير دقيق | 🟠 متوسطة |
| 7 | كود ميت `usageTrackingService.js` يشير لنماذج/حقول غير موجودة (`pricingRule`, `lastBilledAt`, `companyId/action/unitCost`) | `usageTrackingService.js:15, 69, 84-88, 186` | لا تأثير حالي لكنه مصدر ارتباك مستقبلي | 🟡 منخفضة |

---

## ٥. نقاط الضعف التصميمية مقارنةً بأفضل ممارسات ٢٠٢٦

| الممارسة في ٢٠٢٦ (Stripe/Orb/Metronome/Twilio) | الحالي هنا | الفجوة |
|---|---|---|
| **لا تُقدَّم خدمات مدفوعة مجانًا أبدًا** — عند صفر الرصيد يُغلق الوصول أو يُسجَّل كدَين صريح | skip صامت بلا سجل | تسريب + لا أثر تدقيق |
| **سجل دَين صريح** (`pending`/`awaiting_funding`) لكل استخدام غير محصَّل | لا يوجد أي سجل | لا إمكانية للتحصيل لاحقًا |
| **تحصيل تلقائي عند الشحن** بأولوية (الأقدم أولًا) | لا يوجد | المبالغ تتبخر |
| **حماية من الازدواج** — idempotency key + قيد `(walletId, key)` + خصم ذري `balance >= cost` | قراءة-ثم-كتابة بدون قيود | احتمال خصم مزدوج في عمليات متوازية |
| **سجل دفتر أستاذ ببيانات قبل/بعد** `balanceBefore/balanceAfter` + تصحيحات بإدخالات عكسية | جزئي (Transaction فيه balanceBefore/After، لكن بلا حماية ازدواج) | لا إمكانية مراجعة كاملة |
| **تنبيهات انخفاض الرصيد وعتبات** | `checkLowBalances` مجرد `TODO` بلا إشعار | العملاء لا يعرفون قبل النفاد |
| **لوحة محاسبة واضحة للمتجر** (رصيد حي، استخدام، تكلفة متوقعة) | بطاقات مبعثرة + `billing/usage` مكسور | الشفافية غائبة |
| **اتساق `totalSpent`/`totalDeposited`** | غير متناسق (4 مسارات مختلفة) | تقارير مالية مضللة |

---

## ٦. خطة التحسينات مع التأثير

### الإصلاحات العاجلة (أسبوع ١)

| الإصلاح | الحل | التأثير | الجهد |
|---|---|---|---|
| **F1. إصلاح خصم الكرون الشهري** | في `billingCronService` استبدال `walletTransaction.create` بـ `transaction.create` (جدول `transactions` الخاص بمحافظ الشركات) مع enum `DEBIT` الصحيح | استعادة إيرادات الاشتراكات الشهرية + إيقاف فشل دائم خفي | 🟢 صغير |
| **F2. إصلاح تقرير الاستخدام** | تعديل `walletController.getUsageReport` للاستعلام بـ `companyApp: { companyId }` وإزالة `action` من groupBy | تقرير `/billing/usage` يعمل ويخدم لوحة المحاسبة | 🟢 صغير |
| **F3. وقف الـ skip الصامت** | ربط بالميزة الجديدة (§٧): إن لم يكفِ الرصيد → تسجيل سجل دَين صريح بدل الـ skip | أثر تدقيق كامل + أساس للتحصيل | 🟡 متوسط |
| **F4. تحديث `totalSpent`** في باقة/ثيم + `totalDeposited` في الشحن المباشر | سطران في `subscribeToBundle` و`purchaseTheme` و`rechargeWallet` | تقارير مالية دقيقة | 🟢 صغير |
| **F5. حذف/إصلاح الكود الميت** | حذف `usageTrackingService.js` أو إصلاحه للنموذج الحالي | نظافة + منع أخطاء مستقبلية | 🟢 صغير |

### تحسينات البنية (أسبوع ٢)

| التحسين | الحل | التأثير | الجهد |
|---|---|---|---|
| **H1. حماية من الازدواج** | خصم ذري `UPDATE ... SET balance = balance - x WHERE balance >= x` + قيد فريد `(walletId, referenceId)` على `transactions` | منع خصم مزدوج/سباق | 🟡 متوسط |
| **H2. محرك تحصيل مؤجّل** | خدمة `processPendingUsageCharges(companyId)` تُستدعى بعد كل شحن (§٧) | تحصيل تلقائي فوري عند الشحن | 🟡 متوسط |
| **H3. تنبيهات انخفاض الرصيد** | ربط `checkLowBalances` بخدمة إشعارات حقيقية + تنبيه عند عتبات (50%/25%/صفر) | تقليل حالات النفاد المفاجئ | 🟢 صغير |
| **H4. لوحة محاسبة موحدة** | إصلاح + دمج `/billing/summary` و `/billing/usage` و `/billing/invoices` في قسم "المحاسبة المالية" في إعدادات المتجر | شفافية كاملة للمتجر | 🟠 كبير |

---

## ٧. الميزة المطلوبة: تعليق الطلبات حتى شحن الرصيد (Hold → Auto-collect)

### ٧.١ السلوك الحالي مقابل المرغوب

| | الحالي | المرغوب |
|---|---|---|
| رصيد كافٍ | يُنشأ الطلب + خصم فوري + يظهر في "الطلبات" | كما هو (لا تغيير) |
| رصيد غير كافٍ | يُنشأ الطلب + **يظهر في "الطلبات" + لا خصم إطلاقًا** | يُنشأ الطلب + **مخفي من "الطلبات"** + تُسجَّل قيمة مستحقة |
| بعد الشحن | لا شيء يحدث | **يُخصم المبلغ المستحق تلقائيًا** من الرصيد + **يظهر الطلب** في "الطلبات" |

### ٧.٢ التصميم المقترح

1. **عند إنشاء طلب متجر** (`publicOrdersRoutes.js:2370` → `billOrderPpuApps`):
   - احسب التكلفة الإجمالية لكل تطبيقات PPU النشطة (كما هو اليوم).
   - `الرصيد >= التكلفة` → الخصم والتسجيل والظهور (سلوك اليوم).
   - `الرصيد < التكلفة` → **بدل الـ skip**:
     - إنشاء `billingHistory` بنوع `APP_USAGE` وحالة `PENDING` والمبلغ المستحق و`referenceId = order.id`.
     - وضع علامة على الطلب `metadata.billingHold = { heldAt, pendingAmount, billingHistoryId }`.
     - الطلب لا يظهر في قائمة "الطلبات" (فلتر افتراضي جديد).
2. **فلتر قائمة الطلبات**: في `/orders-new/simple` (و `/orders-enhanced`) استبعاد الطلبات ذات `billingHold` النشط افتراضيًا، مع كشف أن "هناك N طلب معلّق حتى الشحن" للمتجر.
3. **بعد أي شحن رصيد** (المسارات الأربعة): استدعاء `processPendingUsageCharges(companyId)`:
   - تُرتب `billingHistory` PENDING حسب `createdAt` (الأقدم أولًا).
   - لكل سجل: إن كان `الرصيد >= المبلغ` → خصم + تسجيل `Transaction` + إنشاء `appUsageLog` + تحديث `billingHistory` إلى `SUCCESS` + **إظهار الطلب** (مسح `billingHold`).
   - تتوقف تلقائيًا عند نفاد الرصيد وتُحاول في الشحن التالي.
4. **أمان/حدود** (توصية صناعية):
   - حد أقصى للتعليق (عدد/مدة) حتى لا تتراكم ديون غير محدودة.
   - إشعار للمتجر بعدد الطلبات المعلقة والمبلغ المستحق.
   - إخطار واضح للمتجر أن الطلبات غير ظاهرة بسبب الرصيد.

### ٧.٣ الملفات المتأثرة

- `services/orderBasedBillingService.js` — منطق التعليق بدل الـ skip.
- `services/pendingBillingService.js` (جديد) — محرك التحصيل المؤجّل.
- `routes/orders.js` + `routes/enhancedOrders.js` — فلتر الطلبات المعلقة.
- `controller/walletController.js` (شحن مباشر) + `routes/kashierRoutes.js` + `routes/adminWalletRoutes.js` + `routes/walletPayment.js` — استدعاء المحرك بعد الشحن.
- `routes/publicOrdersRoutes.js` — تمرير `order.id` للمحرك.
- (اختياري) Migration: عمود `billingHoldAt DateTime?` + `billingHoldAmount Decimal?` على `orders` بدل الاعتماد على metadata فقط.
- الواجهة: `pages/orders/Orders.tsx` + `AppSettings.tsx` (إظهار الطلبات المعلقة والمبلغ المستحق).

### ٧.٤ التأثير

- **إيجابي**: تحويل تسريب الإيرادات إلى تحصيل تلقائي؛ شفافية للمتجر؛ حوافز للشحن؛ أثر تدقيق كامل (كل طلب له فاتورة PENDING/SUCCESS).
- **مخاطر** (يجب التعامل معها): تجربة المتجر (طلبات مخفية) — يُعالَج بإشعار واضح + حد أقصى؛ تعارض مع معنى `ON_HOLD` المستخدم لأغراض أخرى → نستخدم علامة `billingHold` منفصلة في metadata/عمود جديد وليس الحالة.

---

## ٨. مراحل التنفيذ المقترحة

1. **المرحلة ١ — إصلاحات عاجلة (F1–F5)**: تستعيد إيرادات الكرون، وتُصلح تقرير الاستخدام، وتوقف الـ skip الصامت. (يومان)
2. **المرحلة ٢ — محرك التعليق والتحصيل (الميزة المطلوبة)**: تعديل `billOrderPpuApps` + خدمة التحصيل + فلتر الطلبات + ربط مسارات الشحن. (٣–٤ أيام)
3. **المرحلة ٣ — حماية من الازدواج + تنبيهات (H1, H3)**. (يومان)
4. **المرحلة ٤ — لوحة المحاسبة الموحدة (H4)**. (٣–٥ أيام)

> أولوية التنفيذ الموصى بها: **F1 ثم F2 ثم F3+الميزة (٧) ثم الباقي**.

---

## ٩. ملحق: حالة التنفيذ الفعلي (تم)

> تم تنفيذ **كل المراحل (1–4)** بناءً على قرارك (كل المراحل + عمود جديد + من النهارده فقط). تم الاختبار فعليًا على قاعدة بيانات محلية (Postgres) بنجاح.

### الملفات المعدّلة (Backend)

| الملف | التعديل |
|---|---|
| `services/billingCronService.js` | F1: استبدال `walletTransaction.create` بـ `transaction.create` (جدول `transactions` لمحافظ الشركات) في خصم رسوم المنصة واشتراكات الأدوات |
| `controller/walletController.js` | F2: إصلاح `getUsageReport` (حذف الحقول غير الموجودة `companyId/action`) • F4: تحديث `totalDeposited` عند الشحن • ربط التحصيل المؤجل بعد الشحن • إضافة `heldOrders` إلى `/billing/summary` |
| `controller/marketplaceController.js` | F4: إضافة `totalSpent` في `subscribeToBundle` |
| `services/storefrontThemeCatalogService.js` | F4: إضافة `totalSpent` عند شراء الثيم |
| `services/usageTrackingService.js` | F5: حذف (كود ميت بنماذج/حقول غير موجودة) |
| `services/orderBasedBillingService.js` | الميزة: حساب PPU موحّد (`computePpuCosts`) + تعليق الطلب عند نقص الرصيد + خصم ذري + حماية من الازدواج |
| `services/pendingBillingService.js` | **جديد**: محرك التحصيل المؤجل `processPendingUsageCharges` (الأقدم أولًا، خصم ذري، إظهار الطلب) |
| `routes/publicOrdersRoutes.js` | تمرير `orderId` لمحرك الفوترة |
| `routes/kashierRoutes.js` + `routes/adminWalletRoutes.js` + `routes/walletPayment.js` | ربط التحصيل المؤجل بعد كل شحن رصيد |
| `routes/orders.js` + `routes/enhancedOrders.js` + `services/enhancedOrderService.js` | إخفاء الطلبات المعلّقة افتراضيًا (`billingHoldAt: null`)، مع `includeHeld=true` لكشفها |
| `services/billingNotificationService.js` | H3: تنبيهات انخفاض الرصيد لمديري الشركة (مرة/يوم) |
| `prisma/schema/orders.prisma` + `migrations/20260806000000_add_order_billing_hold/` | عمودا `billingHoldAt` + `billingHoldAmount` على `orders` |

### الملفات المعدّلة (Frontend)

| الملف | التعديل |
|---|---|
| `pages/marketplace/AppSettings.tsx` | H4: قسم "المحاسبة المالية — دفع حسب الاستخدام" (رصيد + استخدام + طلبات معلّقة + زر شحن) |
| `pages/orders/Orders.tsx` | بانر تنبيه بالطلبات المعلّقة + رابط شحن الرصيد |

### نتائج الاختبار (على قاعدة بيانات محلية)

```
✅ [TEST 1: HOLD]          → held=true، billingHoldAt=set، billingHistory=PENDING(2)، إشعار أُرسل
✅ [TEST 2: WALLET]        → الرصيد لم يتغير أثناء التعليق (1)
✅ [TEST 3: AUTO-COLLECT]  → بعد شحن 5: خصم 2، رصيد=4، totalSpent=2، إظهار الطلب، Transaction + appUsageLog، billingHistory=SUCCESS
✅ [TEST 4: NO REMAINING]  → لا فواتير PENDING متبقية
```

### ملاحظات النشر

1. **التحديث يجب أن يتزامن مع تطبيق الـ migration** (`prisma db push` في `prestart` أو تشغيل `migrations/20260806000000_add_order_billing_hold/migration.sql`) لأن الكود الجديد يستعلم حقل `billingHoldAt` في قائمة الطلبات.
2. **من النهارده فقط**: الطلبات القديمة (قبل الترقية) لن تُحصَّل أو تُعلَّق — تبدأ الميزة من أول طلب جديد بعد الترقية.
3. فشل اختبارَي `walletService.autoCreate.test.js` و `marketplaceController.hybrid.test.js` **قائم من قبل** (لا علاقة لهذه التعديلات).
