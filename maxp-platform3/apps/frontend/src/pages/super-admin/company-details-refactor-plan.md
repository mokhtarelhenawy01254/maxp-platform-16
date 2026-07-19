# خطة: إعادة هيكلة صفحة تفاصيل الشركة (Super Admin)

**التاريخ**: 2026-06-13
**التعقيد**: عالي
**الملفات المستهدفة**:
- `apps/frontend/src/pages/super-admin/SuperAdminCompanyDetails.jsx` (~2378 سطر)
- `apps/frontend/src/pages/super-admin/company-details/CompanyActivationCenter.jsx` (~436 سطر)
- `apps/frontend/src/pages/super-admin/company-details/CompanyBillingSection.jsx` (~278 سطر)
- `apps/frontend/src/pages/super-admin/company-details/helpers.js` (~491 سطر)
- (إنشاء جديد) `apps/frontend/src/pages/super-admin/company-details/useActionModal.js`
- (إنشاء جديد) `apps/frontend/src/pages/super-admin/company-details/statusMeta.js`

## نظرة عامة

المشاكل الرئيسية:
1. **بيانات مكررة** في 3 أماكن (Hero card + مالي + الإدارة)
2. **7 أزرار في Hero toolbar** بدون هرمية واضحة
3. **14 MetricCard** قبل المحتوى الإجرائي
4. **Funnel** خاص بالعملاء في صفحة Super Admin
5. **نفس نمط Modal** مكرر 4-5 مرات
6. **أزرار مكررة** (شحن المحفظة × 3، إدارة التفعيل × 2)
7. **قوائم متطابقة** في Activation Center (خطط/باقات/أدوات)
8. **Badge ملونة** مكررة يدويًا في كل دالة StatusMeta

---

## Sprint 1: توحيد الـ StatusMeta وإزالة تكرار Badge

**الهدف**: دمج دوال `getXxxMeta` الـ 7 في دالة واحدة لتقليل 250+ سطر من التكرار المحض

**التحقق**: build يمر، كل badge يظهر بنفس اللون

### Task 1.1: إنشاء ملف `statusMeta.js` بدالة `getStatusMeta`
- **الموقع**: `company-details/statusMeta.js`
- **الوصف**: دالة واحدة `getStatusMeta(category, status)` تدعم:
  - `plan`, `subscription`, `invoice`, `payment`, `receipt`, `app`, `usage` (للـ tone)
- **مخرجات**: نفس شكل `{ label, className }`
- **القبول**: كل الحالات الـ 25+ مغطاة
- **التحقق**: build

### Task 1.2: إزالة `getPlanMeta`, `getSubscriptionStatusMeta`, `getInvoiceStatusMeta` إلخ من `helpers.js`
- **الوصف**: حذف 7 دوال (حوالي 170 سطر) واستيراد `getStatusMeta` بدلًا منها في كل مكان
- **الملفات**: `helpers.js`, `SuperAdminCompanyDetails.jsx`, `CompanyActivationCenter.jsx`, `CompanyBillingSection.jsx`, `CompanyTeamSection.jsx`

---

## Sprint 2: إنشاء Hook `useActionModal` لتوحيد نمط الـ Modal

**الهدف**: تقليل تكرار Modal pattern (إلغاء + زر تحميل + أيقونة) من 6 نسخ إلى 1

**التحقق**: كل المودالات الأربعة تشتغل نفس الشيء

### Task 2.1: إنشاء `useActionModal.js`
- **الموقع**: `company-details/useActionModal.js`
- **الوصف**: React Hook يعيد:
  - `modalProps` تحتوي على `footer` جاهز (زر إلغاء + زر تأكيد مع Loader)
  - `execute` function تدير `loading`/`error`
- **المدخلات**: `{ onConfirm, confirmLabel, confirmIcon, confirmDisabled }`
- **القبول**: 4 مودالات تستخدم نفس الـ hook

### Task 2.2: تطبيق الـ Hook على المودالات الأربعة
- تعديل الشركة
- نقل الملكية
- إضافة عضو
- شحن المحفظة

---

## Sprint 3: تبسيط Hero Toolbar (7 → 4 أزرار)

**الهدف**: تقليل الـ cognitive load في أول الصفحة

**التحقق**: المستخدم يقدر يعرف الإجراءات الأساسية خلال 3 ثوان

### Task 3.1: إعادة ترتيب الأزرار بهرمية واضحة
```
[الرجوع]     [تحديث]
─────────────────────────
[تعديل الشركة]  [شحن المحفظة]     ← Primary actions
[دخول كأدمن]                     ← Secondary (inline)
[نقل الملكية]  [إضافة عضو]        ← تبقى في مكانها داخل التبويب فقط
```
- **الوصف**: نقل "إدارة التفعيل" من الـ toolbar (لأنها مجرد scroll إلى نفس التبويب)، نقل "إضافة عضو" و "نقل الملكية" من الـ toolbar إلى داخل التبويب فقط

### Task 3.2: إزالة "شحن المحفظة" من Activation Center
- **الوصف**: مستخدم يدخل التبويب عشان يشغل أدوات مش عشان يشحن. نقل الزر إلى مكان واحد في الـ Hero toolbar.

### Task 3.3: إزالة تكرار `flex items-center justify-between gap-3` (خط 1334, 1340, 1346, 1352)
- **الوصف**: Fix duplicate CSS classes في hero card

---

## Sprint 4: دمج البيانات المكررة وإزالة Hero Card الزائد

**الهدف**: كل معلومة تظهر مرة واحدة فقط في الصفحة

**التحقق**: ما فيش رصيد محفظة أو تاريخ تجديد مكرر

### Task 4.1: تحديد البيانات المكررة
| المعلومة | الموقع | القرار |
|---|---|---|
| رصيد المحفظة | Hero + مالي | تُزال من Hero وتُترك في مالي |
| تاريخ التجديد | Hero + اشتراك | تُزال من Hero وتُترك في اشتراك |
| رسوم الاشتراك | Hero + اشتراك | تُزال من Hero |
| فشل المدفوعات | Hero + فواتير | تُزال من Hero |
| الفواتير المفتوحة | Hero + (مكرر داخليًا) | تُزال من Hero |
| الأدوات النشطة | Hero + أدوات مثبتة | تُزال من Hero |
| فواتير غير مسددة | Hero + BillingSection | تُزال من Hero |

### Task 4.2: تحويل Hero Card من "مركز مراجعة" إلى "لقطة سريعة" خفيفة
- **الوصف**: استبدال البطاقة المالية بـ Hero خفيف يعرض:
  - اسم الشركة + الخطة + الحالة (موجود)
  - Badge واحد: "آخر تحديث" فقط
  - لا قائمة مالية
- **التحقق**: Hero card يصبح 1/3 حجمه الحالي

---

## Sprint 5: تقليل MetricCards ودمج Funnel

**الهدف**: من 14 بطاقة إلى 6-8 بطاقات ذات قيمة

**التحقق**: الصفحة تصير أسرع فهمًا

### Task 5.1: إزالة Funnel من Super Admin
- **الوصف**: "رحلة العميل الجديد" و "آخر أحداث الـ Funnel" وكل `funnelAnalytics` و `funnelSummary` و `funnelMetrics` — خاصة بالعميل وليس السوبر أدمن
- **الملفات**: كل الـ 100+ سطر من `getCompanyFunnelAnalytics` و `getCompanyFunnelSummary` وإزالة `SectionShell` بالكامل
- **التحقق**: تختفي من تبويب "عام"

### Task 5.2: تقليل MetricCards في التبويبات
- **الوصف**: تخفيض كل مجموعة إلى 3-4 فقط
  - **عام**: Users, Customers, Products, Conversations, Facebook → **3** (Users, Customers, Facebook)
  - **مالي**: Wallet, Billing, Subscription, Usage, Active Apps → **3** (Wallet, Next Renewal, Monthly Usage)

---

## Sprint 6: تبسيط Activation Center

**الهدف**: تقليل 436 سطر إلى 200-250 بدون فقدان وظيفة

**التحقق**: نفس الوظيفة بالضبط بسطر أقل

### Task 6.1: استخراج `PlanItemRow`, `BundleItemRow`, `AppItemRow`
- **الوصف**: المكونات الثلاثة تتبع نفس النمط (py-4 → flex → title + badges + description → button)
- **القبول**: إزالة 100+ سطر مكرر

### Task 6.2: إنشاء `StatusBadge` موحد للون الأخضر/العنبر/السماء
- **الوصف**: بدل كتابة `className="rounded-full border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/60 dark:bg-emerald-950/30 dark:text-emerald-300"` 15 مرة، استعمال دالة `getStatusBadgeClass('success')`

---

## Sprint 7: تنظيف وإعادة هيكلة الـ Main Page

**الهدف**: من 2378 سطر إلى ~1500 سطر

**التحقق**: build يمر والصفحة تشتغل

### Task 7.1: إزالة الـ imports غير المستخدمة
- `getCompanyFunnelAnalytics`, `getCompanyFunnelSummary`, `getFunnelEventLabel`
- `History`, `ArrowUpCircle`, `MessageSquare`, `Package` (إذا لم تعد مستخدمة)

### Task 7.2: إزالة دوال Funnel من الملف الرئيسي
- `funnelSummary`, `funnelAnalytics`, `recentFunnelEvents`, `funnelMetrics`
- قسم `funnelSummary ? (` بالكامل من التبويب "عام"

### Task 7.3: إزالة `refreshActivationCatalog` والبيانات المرتبطة من الـ main page
- نقلها إلى داخل `CompanyActivationCenter` كـ internal hook/data fetching

---

## استراتيجية الاختبار

- **بناء**: `npm run build` (أساسي)
- **بصري**: F5 Hard Refresh لكل Sprint
- **تأكد**: الأزرار نفس الوظيفة، البيانات نفس القيم

## المخاطر

| الخطر | التخفيف |
|---|---|
| إزالة Funnel يمكن أن تكسر شيئًا آخر يستخدم `getCompanyFunnelAnalytics` | البحث باستخدام Grep قبل الحذف |
| تحريك الأزرار يربك المستخدم | الإبقاء على الوظائف نفسها، فقط تغيير الموقع |
| `useActionModal` قد لا يناسب كل الحالات | عمل hook مرن مع خيارات `customFooter` |
| إزالة Hero card قد تفقد بيانات مهمة | مراجعة مع الفريق قبل الحذف |

## خطة التراجع

- كل Sprint يعمل commit منفصل
- أي مشكلة → `git checkout -- .` في الملفات المتأثرة
