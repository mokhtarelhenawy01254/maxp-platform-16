# إصلاح انحدار قوالب واتساب ميتا — 132018 + اختيار غير حاسم

**التاريخ**: 2026-08-23
**النوع**: إصلاح انحدار إنتاجي (regression) + تقوية اختيار القوالب
**الحالة**: منفّذ ومختبَر محلياً (29/29 اختبار)

---

## 1. الشكوى

"إشعارات الطلبات مرة تتبعت كقالب واتساب معتمد ومرة لا تصل إطلاقاً / تتبعت نص حر."

## 2. التشخيص (من بيانات الإنتاج الفعلية)

فُحصت `whatsapp_notification_logs` آخر 14 يوم لشركة Swan (`cmleybpf70028juo2wwpmp8rt`) — جلسة Meta Cloud فقط بدون أي Baileys:

| المؤشر | القيمة |
|--------|--------|
| فشل 132018 "issue with the parameters in your template" | **159** |
| فشل 131048 (spam rate limit) | 79 |
| فشل 131047 (نافذة 24 ساعة) | 78 |
| ORDER_CONFIRMED: TEXT vs TEMPLATE المرسلة | 353 TEXT مقابل 7 TEMPLATE |

### السبب الجذري الأول — فقدان إصلاح تنظيف الأسطر الجديدة في استرجاع force-push

- commits الاسترجاع يوم **2026-08-20** (`1a6039fd`, `92b2c941`, `6ee49d2d`, `fccb9da1`)
  أعادت `WhatsAppNotificationService.js` و`metaTemplateVariables.js` من نسخة أقدم.
- النسخة المستعادة من `buildMetaBodyParams` ضاع منها:
  ```js
  text = text.replace(/\r?\n/g, ' ').replace(/\s+/g, ' ').trim();
  ```
- ميتا ترفض أي باراميتر body فيه `\n` بـ **132018**.
- الدليل الزمني: `swan_confirmed_msbtz...` نجح 100% حتى 19 أوت، وفشل 132018
  اعتباراً من **2026-08-20 19:52** (بعد نشر الاسترجاع مساءً) — 66 فشل متتالي،
  بينما قالب `delayed_with_captain...` (باراميتراته سطر واحد بلا أسطر جديدة)
  استمر يعمل بعد نفس الوقت.
- المتغير المتسبب: `orderItems` (نص متعدد الأسطر يُبنى في
  `sendOrderStatusNotification`).

### السبب الجذري الثاني — اختيار قالب غير حاسم عند تكرار السجلات

- `findNotificationTemplateForEvent` كانت تستخدم `findFirst` مع
  `orderBy: { isDefault: 'desc' }` فقط — وشركة Swan عندها مثلاً **8 سجلات**
  للحدث `DELIVERED` (2 منها مربوطة بقالب معتمد والباقي نص عادي/غير معتمد)
  وكلها `isDefault=false`.
- ترتيب Postgres عند تعادل isDefault غير حاسم → كل إرسال قد يختار سجلاً مختلفاً
  → مرة قالب ميتا ومرة نص حر (يفشل خارج نافذة 24 ساعة بـ131047).
- كما ضاع من الاسترجاع فلتر `metaTemplateName: { not: null }` من استعلام
  قناة META_CLOUD (كان fix 8789d032).

## 3. الإصلاحات

### 3.1 `apps/backend/utils/metaTemplateVariables.js`
استعادة تنظيف الأسطر الجديدة وضغط المسافات في `buildMetaBodyParams`.

### 3.2 `apps/backend/services/whatsapp/WhatsAppNotificationService.js`
`findNotificationTemplateForEvent`:
- فلتر `metaTemplateStatus: { equals: 'APPROVED', mode: 'insensitive' }`
  مباشرةً في where لاستعلامي قناة META_CLOUD والـ legacy.
- إعادة فلتر `metaTemplateName: { not: null }` (استعادة 8789d032).
- ترتيب حاسم: `[isDefault desc, updatedAt desc, createdAt desc]`.
- إعادة تحقق JS-side (`isApprovedLink`) كحزام أمان.

مسارات أخرى (broadcast/bulk عبر `buildBroadcastBodyParams`) كان التنظيف موجوداً
بها بالفعل ولم تتأثر.

## 4. الاختبارات

- `tests/utils/metaTemplateVariables.test.js` — اختبارات 132018 موجودة أصلاً
  (رجعت مع الاسترجاع بينما التنفيذ نفسه لم يرجع!) وأصبحت تمر الآن.
- `tests/services/whatsappOrderStatusTemplatePriority.test.js` — أُضيف اختبار
  "🚨 deterministic selection" يثبّت: فلتر APPROVED + metaTemplateName not null +
  الترتيب الحاسم في أول استعلام ميتا.
- النتيجة: 29/29 ✅ + `npm run check:syntax` (1194 ملف) ✅.

## 5. مخلفات مؤكدة خارج نطاق هذا الإصلاح (للمتابعة)

1. **131048** (79 فشل): حد الرسائل التسويقي لرقم الواتساب — يحتاج رفع جودة
   الرقم لدى ميتا، ليس مشكلة كود.
2. **131026** (~98): أرقام غير قابلة للتسليم (ليست واتساب/مرفوضة).
3. سجلات القوالب المكررة نفسها (8 سجلات لحدث DELIVERED) — يفضَّل تنظيفها من
   صفحة القوالب والإبقاء على سجل واحد مربوط بالمعتمد لكل حدث.
