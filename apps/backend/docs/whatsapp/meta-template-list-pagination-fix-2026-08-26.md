# Fix: Meta Template List Pagination (2026-08-26)

## المشكلة
صفحة `/orders/status-templates`: قوالب ميتا المعتمدة لقوالب الأوردرز (`swan_shipped_*`, `swan_pending_*`, `swan_confirmed_*`...) مش بتظهر في قائمة "اختيار قالب معتمد" — كل الحالات بتظهر "بدون قالب ميتا".

## السبب الجذري
`MetaCloudProvider.listTemplates(sessionId)` كان بينادي Graph API:

```
GET https://graph.facebook.com/{apiVersion}/{wabaId}/message_templates
```

**بدون** `?limit=` ولا معالجة cursor. ميتا بترجع **25 قالب في الصفحة الواحدة افتراضيًا**. لما WABA فيه قوالب كتير (مثلاً حساب swan فيه 25+ قالب loyalty/cashback بأسماء عشوائية)، قوالب الأوردرز بتقع بعد الصفحة الأولى ومتظهرش.

الدليل: `GET /api/v1/whatsapp-notifications/templates/meta-available` كان بيرجع بالظبط 25 قالب، كلهم loyalty — صفر قوالب أوردرز رغم إنها APPROVED على ميتا ومربوطة في الداتابيز من قبل.

## الإصلاح
`apps/backend/services/whatsapp/providers/MetaCloudProvider.js` — `listTemplates()`:

- Pagination كامل: `?limit=200` + متابعة `paging.cursors.after` لحد ما الصفحات تخلص.
- حماية من اللوب اللانهائي لو صفحة فاضية رجعت.
- نفس الدالة بتخدم كل المستهلكين فالتغطية شاملة:
  - `GET /whatsapp-notifications/templates/meta-available` (قائمة الاختيار في الصفحة)
  - `POST /templates/:id/resubmit-meta` (حل templateId من الاسم)
  - `POST /templates/sync-status`
  - `whatsappMetaTemplateController` list/broadcast

## التحقق
- `node --check` على الملف ✅
- بعد الـ deploy: ناد `meta-available?sessionId=...` واتأكد إن عدد القوالب > 25 وإن قوالب `swan_shipped/swan_pending/swan_confirmed` ظاهرة.
