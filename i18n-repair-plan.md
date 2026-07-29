# خطة إصلاح شامل لنظام الترجمة (i18n)

## ملخص التنفيذ: 3 مراحل — 15 مهمة — 30 يوم

---

## المرحلة الأولى: إنقاذ سريع (الأسبوع 1)
_حلول فورية للمشاكل الحرجة التي تسبب أعطالاً ظاهرية_

| # | المهمة | الملف/الموقع | الخطورة | الوصف |
|---|--------|-------------|---------|-------|
| 1 | **إصلاح interpolation variables** | `apps/frontend/src/locales/{ar,en}/translation.json` | **حرج** | خلط بين `{var}` (109 key) و `{{var}}` (428 key). i18next لا يتعرف على `{var}` — ستظهر كما هي. الحل: إضافة `interpolation: { prefix: '{', suffix: '}' }` في i18n/index.ts |
| 2 | **إزالة page reload عند تغيير اللغة** | `apps/frontend/src/i18n/index.ts:152` | **عالي** | `window.location.reload()` بعد `changeLanguage()` — هذا يدمر تجربة المستخدم ويُلغي فائدة react-i18next |
| 3 | **حذف ملفات backup** | `locales/{ar,en}/translation.backup.json` | **متوسط** | قديمة (أقل بـ59 سطراً)، غير مستخدمة، تسبب التباساً. git هو backup الحقيقي |
| 4 | **حذف مجلد `scripts/scripts/`** | `scripts/scripts/` | **عالي** | 5 سكربتات مكررة بمسارات مختلفة ومستوى أقل — أحدها يستخدم مساراً خاطئاً (`../frontend/` بدلاً من `../apps/frontend/`) |

---

## المرحلة الثانية: إصلاح البنية التحتية (الأسبوع 2-3)
_إصلاح السكربتات، توحيد النظام، وإزالة الأخطاء البرمجية_

### 5. توحيد نظام السكربتات

| المشكلة | الإصلاح |
|---------|---------|
| خلط CommonJS (`require`) مع ESM (`import`) | توحيد على ESM باستخدام `.mjs` لكل السكربتات |
| سكربتات بدون معالجة أخطاء JSON | إضافة `try/catch` حول كل `JSON.parse` |
| `merge-translations.js` يفقد مفاتيح الملفات ذات الاسم نفسه في مجلدات فرعية مختلفة | استخدام المسار النسبي كمفتاح (مثلاً `orders/common` بدلاً من `common`) |
| `i18n-check.js` لا يُرجع `exit code` غير صفري | إضافة `process.exit(1)` عند اكتشاف أخطاء — لدعم CI |
| `fill-translations.js` يكتب نصوصاً عربية في ملفات EN | تغيير الـ fallback ليبقي على `__TODO_TRANSLATE__` بدلاً من إتلافه |
| `replace-arabic-with-i18n.js` — `String.replace` في while loop يسبب bug | استخدام replacer function مع regex |
| `sync-i18n.js` يحذف مفاتيح AR الخاصة بصمت | إضافة تحذير أو خيار حفظ عند الحذف |
| `automate-translation.js` — تكرار نفس key لنفس النص العربي عبر ملفات مختلفة | استخدام map عام بدلاً من per-file |

### 6. توحيد تسمية المفاتيح

| النمط الحالي | عدد المفاتيح | المشكلة | الإجراء |
|-------------|-------------|---------|---------|
| `camelCase` | ~90% | جيد | الحفاظ عليه |
| `snake_case` | ~5% | غير متسق | تحويل إلى camelCase |
| `k_1` إلى `k_45` | 45 مفتاحاً | لا معنى دلالي، الأرقام قابلة للكسر | إعادة تسمية إلى `ticketInquiry`, `ticketComplaint`, إلخ |
| `noData` + `no_data` | مكرر | نفس المعنى | دمج في `noData` واحد |

### 7. إصلاح جودة الترجمة الإنجليزية (مفاتيح tickets)

| المفتاح | الحالي | الصحيح |
|--------|--------|--------|
| `k_3` | `"to thank"` | `"Thanks"` |
| `k_25` | `"There is no description"` | `"No description"` |
| `k_39` | `"illegible"` | `"Unread"` |
| `k_43` | `"the previous"` | `"Previous"` |
| `k_44` | `"page"` (lowercase) | `"Page"` |
| `k_45` | `"the next"` | `"Next"` |

### 8. إصلاح جودة الترجمة العربية (نصوص عربي-إنجليزي في نفس القيمة)

| المفتاح | الحالي | الصحيح |
|--------|--------|--------|
| `k_9` | `"استفسار (Inquiry)"` | `"استفسار"` |
| `k_10` | `"شكوى (Complain)"` | `"شكوى"` |
| `k_11` | `"شكر (Gratitude)"` | `"شكر"` |
| `k_12` | `"اقتراح (Suggestion)"` | `"اقتراح"` |

### 9. إزالة الإيموجي من ملفات الترجمة

نقل الإيموجي (`🔒`, `🛡️`) من ملفات JSON إلى طبقة الـ component باستخدام `<span role="img">`.

### 10. تقسيم `translation.json` إلى namespace files

بدلاً من ملف واحد ضخم (13,682 سطر / 580KB):
- استخدام i18next multi-namespace loading
- تقسيم حسب المجال: `common`, `auth`, `orders`, `products`, `settings`, `tickets`, إلخ
- كل namespace في ملف منفصل في `locales/{lang}/{namespace}.json`

---

## المرحلة الثالثة: إصلاح الأكواد المصدرية (الأسبوع 3-4)
_إزالة النصوص الثابتة من 200+ ملف_

### 11. القضاء على Ternary Anti-Pattern

**الوصف**: النمط `i18n.language === "ar" ? "نص عربي" : "English text"`
**الانتشار**: ~20 ملفاً، أكبرها `WhatsAppTemplates.tsx` (~60 حالة)

**الإجراء**: استبدال كل حالة بـ `t('key')` وإضافة المفاتيح في ملفات الترجمة

**الملفات ذات الأولوية القصوى**:
- `Apps/frontend/src/pages/whatsapp/WhatsAppTemplates.tsx` — ~60 حالة
- `Apps/frontend/src/storefront/components/CartDrawer.tsx` — ~20 حالة
- `Apps/frontend/src/storefront/pages/ReturnsPage.tsx` — ~20 حالة
- `Apps/frontend/src/storefront/components/BackInStockSignupCard.tsx` — ~10 حالات

### 12. إضافة i18n إلى 223 مكوناً (82%)

**الإجراء التدريجي**:
1. إضافة `const { t } = useTranslation()` للمكونات عالية الزيارات أولاً
2. استخراج كل الـ strings الظاهرة للمستخدم إلى ملفات الترجمة
3. إزالة fallback strings من `t("key", "fallback")` بعد التأكد من وجود المفاتيح

**أولويات المكونات**:
- `ActiveUsersMonitor.jsx` — نصوص عربية + إنجليزية ثابتة كثيرة
- `TimerContext.tsx` — رسائل خطأ بالعربية
- `CompanyContext.tsx` — رسائل تحميل و خطأ
- `AuthSurface.tsx` — نصوص تسويقية بالعربية
- `ABTestDetails.tsx` — كم كبير من النصوص العربية

### 13. إصلاح backend (100+ ملف)

**المشكلة**: رسائل API وإيرور بالعربية مباشرة في الـ controllers و routes و middleware

**الإجراء**:
- إنشاء `backend/shared/messages.js` كقاموس مركزي للرسائل
- توفير دالة `t(key, lang)` في الـ backend
- استبدال كل `message: 'نص عربي'` بـ `message: t('key', lang)`
- RMSالملفات المستهدفة: `controller/activityLogController.js`، `adminWhatsAppController.js`، `adminCompnayController.js`، `agentWorkspaceController.js`، + 16 ملفاً آخر

### 14. تنظيف البيانات الوهمية (mock/seed data)

- `mockData.ts` و `metaTemplateLibrary.ts` — نصوص عربية في بيانات وهمية
- `add_products.js`، `add_categories.js` والملفات المماثلة — أسماء منتجات وفئات بالعربية

**الإجراء**: تحديدها كـ test-only data وإما جعلها تدعم الترجمة أو وضعها في ملفات locale منفصلة

### 15. إضافة أدوات منع العودة للمشكلة

- إضافة ESLint rule:
  - `no-arabic-in-source` — منع الأحرف العربية في الكود المصدر (مع استثناء locale files)
  - `no-i18n-ternary` — منع نمط `i18n.language === "ar"`
  - `require-usetranslation` — في المكونات التي تحتوي على JSX
- إضافة pre-commit hook:
  - تشغيل `i18n-check.js` مع exit code غير صفري في حال وجود مشاكل
  - التأكد من عدم وجود `[AR]` prefixed keys
- إضافة CI pipeline:
  - التحقق من تطابق AR مع EN تلقائياً
  - التحقق من عدم وجود hardcoded strings

---

## الجدول الزمني

```
الأسبوع 1: [1][2][3][4]   ← إصلاحات حرجة فورية
الأسبوع 2: [5][6][7][8]   ← سكربتات + تسمية + جودة ترجمة
الأسبوع 3: [9][10][11]    ← تقسيم + إيموجي + Ternary anti-pattern
الأسبوع 4: [12][13][14][15] ← 223 مكون + backend + data + أدوات منع
```

## مؤشرات الأداء (KPIs)

| المؤشر | الحالي | الهدف |
|--------|--------|-------|
| مكونات تستخدم i18n | 18% (49/272) | 100% |
| Ternary anti-pattern | ~170 حالة | 0 |
| Hardcoded Arabic strings | 40+ ملفاً | 0 (فقط locale files) |
| `{var}` interpolation | 115 مفتاحاً | 0 (كلها `{{var}}`) |
| Emoji في الترجمة | ~5 قيماً | 0 |
| مفاتيح بدون معنى (k_N) | 45 مفتاحاً | 0 |
| تكرار تسمية (noData/no_data) | ~2 | 0 |
| ملفات backup | 2 | 0 |
| سكربتات مكررة | 5 | 0 |

## إجمالي التقييم الحالي: 4/10 — الهدف: 9/10
