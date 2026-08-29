# Fix: Meta-Bound Templates Not Displayed On Status Templates Page (2026-08-26)

## المشكلة
على صفحة `/orders/status-templates`، حالات كتير بتظهر "بدون قالب ميتا" رغم إن القوالب مربوطة بميتا معتمدة (APPROVED) وبتتبعت فعلاً على الواتساب.

## السبب الجذري
انفصال بين منطق الإرسال ومنطق العرض:

- **الإرسال** (`findNotificationTemplateForEvent` في `WhatsAppNotificationService.js`): بيلقط القالب المربوط بميتا بالاعتماد على `metaTemplateName + APPROVED` **بغض النظر عن الـ channel** → القوالب بتتبعت صح.
- **العرض** (`getStatusesWithTemplates` في `orderStatusController.js`): كان بيفصل القوالب في `metaMap` **بس لو `channel === 'META_CLOUD'`**. لكن القوالب المربوطة بميتا عند أغلب الشركات مسجّلة بـ `channel='AUTO'` (نموذج قديم legacy — ربط ميتا على القالب العادي). فالنتيجة: القوالب المربوطة بتقع في `regularMap` و`metaMap` تفضل فاضية → الصفحة تعرض "بدون قالب ميتا" رغم إنها مربوطة وبتتبعت.
- مع تكرار صفوف لنفس الحالة (أحيانًا فيه قالب عادي + قالب مربوط)، الـ first-wins القديم كان ممكن يختار الصف من غير ربط ميتا فيخبّي المربوط.

## الإصلاح
`apps/backend/controller/orderStatusController.js` — `getStatusesWithTemplates`:

- أي قالب عليه `metaTemplateName` (حتى لو `channel='AUTO'`) يتحسب **قالب ميتا** (metaMap) — مطابق لمنطق الـ sender.
- عند تكرار صفوف لنفس الحالة، نفضّل الصف المربوط بميتا، ثم المعتمد (APPROVED) على الـ pending.
- القوالب من غير ربط ميتا تفضل في regularMap (واتساب عادي).

الفرونت (`TemplateCenter.tsx` → `getMetaSlotTemplate`) كان بيدعم الـ legacy path أصلاً، فبعد الإصلاح يظهر القالب المربوط كـ "✅ معتمد" لكل الحالات المربوطة.

## الاختبار
- `apps/backend/tests/controller/orderStatusController.getStatusesWithTemplates.test.js` (جديد):
  - القالب المربوط بـ channel AUTO يظهر في metaTemplate وليس regular.
  - عند تكرار صفوف لنفس الحالة يُفضّل الصف المربوط المعتمد.
- `node --check` + `npm run check:syntax` سليمان.
