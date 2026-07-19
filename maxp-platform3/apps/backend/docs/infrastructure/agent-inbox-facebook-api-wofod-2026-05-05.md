# Agent Inbox Facebook API - Wofod

## الهدف

إضافة قناة API داخلية وآمنة تسمح للأيجنت بقراءة محادثات Facebook الخاصة بالشركة، سحب آخر الرسائل من Meta Graph API عند الحاجة، وتقييم جودة الردود لاكتشاف:

- محادثات آخر رسالة فيها من العميل ولم يتم الرد عليها.
- ردود وصلت بعد وقت طويل.
- ردود عامة لا تجيب على سؤال واضح مثل السعر أو الشحن أو التوفر.
- أخطاء إرسال Facebook محفوظة على المحادثة مثل `RECIPIENT_NOT_AVAILABLE`.

لا توجد صلاحية إرسال مباشر للعميل في هذه المرحلة.

## المسارات

### إدارة المفتاح من الواجهة

- الصفحة: `/settings/agent-inbox`
- API:
  - `GET /api/v1/agent-inbox/admin/context`
  - `POST /api/v1/agent-inbox/admin/credentials`
  - `POST /api/v1/agent-inbox/admin/credentials/:credentialId/rotate`
  - `DELETE /api/v1/agent-inbox/admin/credentials/:credentialId`

الصفحة تدعم Super Admin search باسم الشركة، والبحث الافتراضي المقترح هو `Wofod`.

### استهلاك الأيجنت

تستخدم هذه المسارات مفتاح خدمة عبر `X-API-Key` أو `Authorization: Bearer <key>`:

- `GET /api/v1/agent-inbox/facebook/conversations?limit=10&includeEvaluation=1`
- `GET /api/v1/agent-inbox/facebook/conversations/:conversationId/messages?includeEvaluation=1`
- `POST /api/v1/agent-inbox/facebook/conversations/:conversationId/pull`
- `POST /api/v1/agent-inbox/facebook/pull-recent`
- `POST /api/v1/agent-inbox/facebook/conversations/:conversationId/evaluate`

## السكوبات

- `facebook-inbox:read`: قراءة المحادثات وسحب الرسائل.
- `facebook-inbox:evaluate`: تقييم الردود.
- `facebook-inbox:draft`: محجوزة لمرحلة المسودات لاحقاً.

مفاتيح المهام القديمة تظل افتراضياً على `tasks:read` و `tasks:write` فقط.

## مثال

```bash
curl -H "X-API-Key: ain_xxx" \
  "https://maxp.online/api/v1/agent-inbox/facebook/conversations?limit=10&includeEvaluation=1"
```

## اعتبارات الأمان

- يتم تخزين hash المفتاح فقط في `task_api_credentials`.
- المفتاح يظهر مرة واحدة عند الإنشاء أو التدوير.
- المسارات الخارجية تتجاوز `globalSecurity` فقط حتى تصل إلى middleware مفتاح الخدمة، ولا تعتبر public فعلياً.
- لا يتم إرجاع `pageAccessToken` أو `facebookId` الخام؛ يتم إرجاع masked identifiers فقط.
- الإرسال للعميل غير مفعّل في هذه المرحلة.

## ملفات التنفيذ

- `backend/services/taskIntegrationService.js`
- `backend/services/agentInboxFacebookService.js`
- `backend/controller/agentInboxController.js`
- `backend/routes/agentInboxRoutes.js`
- `backend/middleware/globalSecurity.js`
- `frontend/src/pages/settings/AgentInboxKeyPage.tsx`
- `frontend/src/services/agentInboxService.ts`
- `frontend/src/config/sidebar.ts`
