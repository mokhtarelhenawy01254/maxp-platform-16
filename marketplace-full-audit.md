# تدقيق سوق التطبيقات (Marketplace Audit)

> تاريخ: 2026-06-26 | المصدر: `apps/backend/catalog/marketplace/` و `prisma/seeds/marketplaceSeed.js`

---

## 1. 🔴 ملف JSON مكسور — `apps.json` لا يُقرأ

**الملف:** `apps/backend/catalog/marketplace/apps.json`
**الخطأ:** Trailing comma في آخر خاصية داخل `features` object للتطبيق `medical-system` (السطر 947–948)
**الرسالة:** `SyntaxError: Expected double-quoted property name in JSON at position 30741 (line 948 column 5)`
**Severity:** 🔴 HIGH
**الأثر:** أي كود يحاول `JSON.parse(apps.json)` مباشرة سينفجر. بعض الـ parsers المتسامحة قد تنجح (JS native loose parse) لكن strict parsers و Node.js `require` يفشلان.
**الحل:** إزالة الفاصلة الزائدة بعد آخر عنصر في `features`:

```json
"dashboard": {
  "enabled": true,
  "name": "لوحة التحكم",
  "description": "إحصائيات وأداء المنشأة الطبية — عدد المواعيد، الإلغاءات، الإيرادات.",
  "access": "PAID"
}                          // <-- كانت "}," وأصبحت "}"
```

**ملاحظة:** ملفات `bundles.json` و `categories.json` سليمة وتُقرأ بدون مشاكل.

---

## 2. 🔴 ازدواجية في الوظائف بين التطبيقات

### 2.1 حجوزات المواعيد (`booking-app`) ← النظام الطبي (`medical-system`)

| العنصر | Appointment Booking ($149) | Medical System ($249) |
|---|---|---|
| المواعيد (CRUD) | ✅ | ✅ |
| المواعيد المتاحة | ✅ | ✅ |
| فروع/أطباء/خدمات | ❌ | ✅ |
| تقويم المواعيد | ❌ | ✅ |
| لوحة تحكم بإحصائيات | ❌ | ✅ |
| `requiredApps` | none | none |

**المشكلة:** `booking-app` هو **مجموعة فرعية كاملة** من `medical-system`. أي عميل يشتري Medical System ($249) يحصل على كل ميزات Booking مجانًا. هذا يخلق:
- التباس لدى العميل: لماذا أدفع $149 للتطبيق الصغير إذا كان موجودًا داخل الكبير؟
- تعقيد في البيع: هل نوقف `booking-app`؟ هل نجعله مطلوبًا من `medical-system`؟

**Severity:** 🔴 HIGH
**الحل المقترح:**
1. إما إزالة `booking-app` من الكتالوج وجعل الحجوزات ميزة داخل `medical-system`
2. أو جعل `booking-app` مجانيًا (مثل CRM Lite) كتطبيق مستقل للحجز البسيط بدون الخدمات الطبية
3. أو إضافة `requiredApps: ["medical-system"]` لـ `booking-app` لو كان إضافة وليس بديلًا

### 2.2 Ecommerce Basic ($199) + Store Basic ($249)

| Ecommerce Basic | Store Basic |
|---|---|
| إدارة الطلبات | ✅ | ❌ |
| إدارة المنتجات | ✅ | ❌ |
| الواجهة الأمامية (Storefront) | ❌ | ✅ |
| الثيمات والقوالب | ❌ | ✅ |

**المشكلة:** وظيفيًا، أي متجر يحتاج **الاثنين معًا** ($448/شهر) لتشغيل متجر كامل. هل هما تطبيقان منفصلان أم تطبيق واحد مقسم بشكل مصطنع؟

**Severity:** 🟡 MEDIUM
**الحل المقترح:** دمج `ecommerce-basic` و `store-basic` في تطبيق واحد `commerce-core` بسعر $399 (خصم ضمني $49) وإلغاء الاثنين كتطبيقين منفصلين، أو توضيح أن `store-basic` يتطلب `ecommerce-basic`.

### 2.3 Commerce Advanced ($179) + Quantity Offers Pro ($149)

**المشكلة:** كلا التطبيقين في ECOMMERCE ويضيفان ميزات على صفحة المنتج والطلب. قد يكونان قابلين للدمج.

**Severity:** 🟢 LOW
**الحل المقترح:** ترقب — إذا اشترى 80%+ من العملاء الاثنين معًا، ادمجهما.

---

## 3. 🟡 الباندلز (الحزم) — أسعار غير منطقية

### 3.1 Messaging Bundle — $999/شهر مع "خصم 69%"

| التطبيق | السعر الفردي |
|---|---|
| CRM Lite | $0 (مجاني) |
| Unified Inbox | $299 |
| AI Chat Basic | $0 (Pay Per Use) |
| **المجموع** | **$299** |

**السعر الحقيقي للمفردات:** $299
**سعر الباقة:** $999 ← **أغلى بـ 3.34x من شراء كل تطبيق على حدة!**
**الخصم المذكور:** 69٪ ← هذا يعني أن السعر الأصلي قبل الخصم كان $3,223 وهو غير منطقي.

### 3.2 AI + Inbox Bundle — $999/شهر مع "خصم 0%"

| التطبيق | السعر الفردي |
|---|---|
| Unified Inbox | $299 |
| AI Chat Basic | $0 (Pay Per Use) |
| **المجموع** | **$299** |

**السعر الحقيقي للمفردات:** $299
**سعر الباقة:** $999 ← **أغلى بـ 3.34x!**
**الخصم:** 0% (لا يوجد خصم)

**Severity:** 🔴 HIGH
**الأثر:** أي عميل يقارن الأسعار سيكتشف أن الباقات مضللة. السمعة تتضرر.
**الحل المقترح:**
- إما حساب صحيح للسعر الأساسي (مثلاً 20-30% خصم عن المجموع)
- أو جعل الباقة تحتوي تطبيقات إضافية غير مذكورة
- أو تعديل السعر إلى $399 مع خصم 25%

---

## 4. 🔴 فجوة بين Catalog (16) و Seed (45+)

**apps.json** يحتوي **19 تطبيقًا** فقط، بينما **marketplaceSeed.js** يحتوي **45+ مدخلاً** (مع تكرارات).

### تطبيقات في الـ seed **وليست** في الكاتالوج:

| # | Slug | Category | السعر |
|---|---|---|---|
| 1 | inventory-pro | ECOMMERCE | $199 |
| 2 | telegram-business | COMMUNICATION | $99 |
| 3 | ai-chat-pro | AI | $799 |
| 4 | ai-image-studio | AI | $149 |
| 5 | hr-assets | HR | $149 |
| 6 | hr-recruitment | HR | $199 |
| 7 | store-pro | ECOMMERCE | $499 |
| 8 | ai-rag-knowledge | AI | $199 |
| 9 | hr-payroll | HR | $249 |
| 10 | hr-core | HR | $249 |
| 11 | hr-attendance-pro | HR | $149 |
| 12 | whatsapp-business | COMMUNICATION | $199 |
| 13 | woocommerce-sync | INTEGRATION | $99 |
| 14 | invoicing-pro | FINANCE | $149 |
| 15 | facebook-catalog-shop | MARKETING | $149 |
| 16 | crm-loyalty | CRM | $299 |
| 17 | smart-scheduler | PRODUCTIVITY | $149 |
| 18 | webhooks-pro | INTEGRATION | $99 |
| 19 | wallet-system | FINANCE | $149 |
| 20 | turbo-analytics | ANALYTICS | $99 |
| 21 | appointments-pro | PRODUCTIVITY | $149 |
| 22 | opportunities-pipeline | CRM | $199 |
| 23 | kudos-recognition | HR | $79 |
| 24 | gamification-pro | MARKETING | $249 |
| 25 | facebook-pages-connect | MARKETING | $99 |
| 26 | facebook-pixel-capi | MARKETING | $99 |
| 27 | broadcast-pro | MARKETING | $199 |
| 28 | ecommerce-pro | ECOMMERCE | $399 |
| 29 | hr-basic | HR | $199 |
| 30 | hr-attendance | HR | $99 |
| 31 | telegram-integration | COMMUNICATION | $149 |
| 32 | crm-basic | CRM | $199 |
| 33 | analytics-advanced | ANALYTICS | $299 |
| 34 | order-core | ECOMMERCE | $149 |
| 35 | order-shipping-turbo | ECOMMERCE | $99 |
| 36 | order-shipping-reports | ECOMMERCE | $49 |
| 37 | order-invoicing | FINANCE | $149 |
| 38 | messaging-bundle | — (bundle) | $999 |
| 39 | ai-inbox-bundle | — (bundle) | $999 |

### تطبيقات في الكاتالوج **ليست** في الـ seed:

| Slug | Category |
|---|---|
| conversion-suite | MARKETING |
| quantity-offers-pro | ECOMMERCE |
| ugc-reviews-pro | MARKETING |
| commerce-advanced | ECOMMERCE |
| procurement-pro | ECOMMERCE |
| affiliate-pro | MARKETING |
| order-source-tracking | ECOMMERCE |
| campaign-attribution | MARKETING |
| order-confirmation-distribution | PRODUCTIVITY |
| unified-inbox | PRODUCTIVITY |
| notification-automation | PRODUCTIVITY |
| booking-app | PRODUCTIVITY |
| medical-system | MEDICAL |
| crm-lite | CRM |

**Severity:** 🔴 HIGH
**الأثر:** عدم التطابق يعني:
- الكاتالوج الجديد (JSON) لا يعكس كل التطبيقات المتاحة فعليًا
- الـ seed القديم لا يزال يُستخدم للتطبيقات القديمة وقد يُحمل بيانات غير صحيحة
- صعوبة التأكد من أي التطبيقات "حية" وأيها "متقاعد"
- الـ feature map يشير إلى appSlugs غير موجودة في أي من المصدرين

---

## 5. 🟡 تكرار في ملف الـ Seed

`whatsapp-business` مكرر **مرتين** في ملف `marketplaceSeed.js`:
- السطر 355: ضمن مجموعة APPS
- السطر 927: ضمن مجموعة APPS (نفس البيانات بالضبط)

**Severity:** 🟡 MEDIUM
**الأثر:** عند تشغيل الـ seed، قد يُحاول إدراج تطبيق مكرر مما يسبب أخطاء unique constraint أو بيانات مكررة في قاعدة البيانات.
**الحل:** إزالة أحد التكرارين.

---

## 6. 🟡 Catalog Version قديم

**الملف:** `index.json`
```
"catalogVersion": "2026-05-01-feature-gates"
"generatedAt": "2026-05-01T00:00:00.000Z"
```

**المشكلة:** التطبيقات الأحدث (Unified Inbox — 2026-06-19، Booking App — 2026-06-26، Medical System — 2026-06-26) أُضيفت للكاتالوج لكن رقم الإصدار لم يتغير.

**Severity:** 🟡 MEDIUM
**الأثر:** أدوات الـ caching والتحديث تعتمد على `catalogVersion` لمعرفة إذا تغير شيء. إصدار قديم قد يمنع الـ frontend من تحميل البيانات الجديدة.
**الحل:** تحديث `catalogVersion` و `generatedAt` عند كل تعديل.

---

## 7. 🟢 تطبيقات بدون Logo/Cover Image

جميع التطبيقات الـ 19 في `apps.json` تحتوي على `"logo": null` و `"coverImage": null`.

**Severity:** 🟢 LOW
**الأثر:** الماركت بليس يعتمد على حقل `icon` (أيقونات Lucide/named icons) بدل الصور، لكن إذا أردنا لاحقًا صورًا حقيقية للتطبيقات، سنحتاج إضافتها لكل تطبيق.

---

## 8. 🟡 AI Chat Basic — سعر وهمي

- **السعر الشهري:** $0 (مجاني)
- **نموذج التسعير:** PAY_PER_USE ($0.50/رسالة)
- **متطلب:** `store-basic` ($249/شهر)

**المشكلة:** 
- يظهر في قائمة التطبيقات بسعر $0 (مضلل)
- التكلفة الفعلية: $249/شهر (Store Basic) + $0.50/رسالة
- بدون توضيح، العميل يظن أن AI Chat يكلف $0 فقط

**Severity:** 🟡 MEDIUM
**الأثر:** تجربة مستخدم سيئة عند الفوترة.
**الحل:**
- عرض رسالة "يتطلب Store Basic ($249/شهر)" بجانب السعر
- أو حساب الـ Effective Cost وإظهارها

---

## 9. 🔴 الـ Feature Map يشير إلى تطبيقات غير موجودة في الكاتالوج

`marketplaceFeatureMap.ts` يستخدم `appSlug` لربط feature gates. هذه الـ appSlugs غير موجودة في `apps.json`:

| appSlug | الظهور في الكاتالوج | الظهور في الـ seed |
|---|---|---|
| order-core | ❌ | ✅ |
| order-shipping-turbo | ❌ | ✅ |
| order-invoicing | ❌ | ✅ |
| inventory-pro | ❌ | ✅ |
| crm-loyalty | ❌ | ✅ |
| whatsapp-business | ❌ | ✅ (مكرر) |
| telegram-integration | ❌ | ✅ |
| facebook-pages-connect | ❌ | ✅ |
| facebook-pixel-capi | ❌ | ✅ |
| facebook-catalog-shop | ❌ | ✅ |
| broadcast-pro | ❌ | ✅ |
| analytics-advanced | ❌ | ✅ |
| smart-scheduler | ❌ | ✅ |
| webhooks-pro | ❌ | ✅ |
| wallet-system | ❌ | ✅ |
| hr-basic | ❌ | ✅ |
| hr-attendance-pro | ❌ | ✅ |
| hr-payroll | ❌ | ✅ |
| hr-assets | ❌ | ✅ |

**Severity:** 🔴 HIGH
**الأثر:** الـ Feature Map يقفل ويسمح بالصفحات بناءً على هذه الـ slugs. إذا التاجر اشترى تطبيقًا من الماركت بليس، لكن gate slug يختلف عن app slug، الـ gating لن يعمل. نظامان للتطبيقات — نظام الكاتالوج (البيع) ونظام الـ gates (التفعيل) — غير متزامنين.

---

## 10. 🟢 Order Source Tracking / Campaign Attribution / Order Confirmation — هل هي أدوات داخلية؟

**المشكلة:** هذه التطبيقات الثلاثة تصف ميزات للمشغل الداخلي للشركة (فرق التشغيل والتأكيد والتوزيع)، وليس للتاجر النهائي. لكنها معروضة في ماركت بليس موجه للتجار.
- `order-source-tracking`: "هذه البيانات للتجار" × "للمسؤولين فقط" — وصف متناقض
- `order-confirmation-distribution`: "بدون كشف هذه البيانات للتاجر" — تناقض مع فكرة بيعها للتاجر
- `campaign-attribution`: مستهدف "فرق التسويق" لكن featureMap يربطه بـ `ecommerce-basic`

**Severity:** 🟡 MEDIUM
**الأثر:** حيرة العميل: هل هذا التطبيق أنا أشتريه كنهاية أم هو للمنصة نفسها؟

---

## الخلاصة — مصفوفة الأولويات

| # | المشكلة | Severity | الأثر على العميل | الأثر على التشغيل |
|---|---|---|---|---|
| 1 | JSON مكسور | **HIGH** | — | الـ catalog لا يُقرأ آليًا |
| 2 | ازدواجية الحجوزات والطبي | **HIGH** | التباس في الشراء | — |
| 3 | أسعار الباندلز غير منطقية | **HIGH** | ثقة العميل تتأثر | — |
| 4 | فجوة catalog vs seed | **HIGH** | تطبيقات مفقودة من العرض | gates لا تعمل |
| 5 | featureMap و catalog غير متطابقين | **HIGH** | gates لا تعمل مع التطبيقات المشتراة | gating معطل |
| 6 | catalogVersion قديم | **MEDIUM** | — | تحديثات لا تصل |
| 7 | AI Chat Basic سعر مضلل | **MEDIUM** | فاتورة غير متوقعة | — |
| 8 | أدوات داخلية معروضة كتطبيقات | **MEDIUM** | حيرة العميل | — |
| 9 | whatsapp-business مكرر في seed | **MEDIUM** | — | خطأ أثناء الـ seeding |
| 10 | Ecommerce/Store غير واضحين | **MEDIUM** | حيرة الشراء | — |
| 11 | صور الشعارات ناقصة | **LOW** | تجربة بصرية | — |

## توصيات عاجلة

1. **إصلاح JSON** ← إزالة trailing comma في `medical-system` (تأثير فوري)
2. **تحديث أسعار الباندلز** ← جعل الباقات أرخص من المجموع الفردي (مصداقية)
3. **تزامن الكاتالوج مع الـ Seed** ← تحديد أي التطبيقات حية ونقلها إلى `apps.json`
4. **تزامن الـ Feature Map مع الكاتالوج** ← جعل appSlug في gates يطابق app slug في الكاتالوج
5. **إضافة feature-level gating** ← بدل الاعتماد على app-wide gates
6. **توحيد Booking مع Medical** ← إما حذف Booking أو جعله مجانيًا مستقلاً
7. **تحديث `index.json`** ← رفع رقم الإصدار عند كل تغيير
8. **إزالة تكرار `whatsapp-business` من الـ seed**
