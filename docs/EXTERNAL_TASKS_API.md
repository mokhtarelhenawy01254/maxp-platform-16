# External Tasks Integration

التكامل الخاص بصفحة `/tasks` أصبح معتمدًا على قاعدة البيانات فقط، بدون أي `env` fallback.

يوجد مساران:

- `Inbound API`: النظام الخارجي يقرأ أو ينشئ أو يحدّث مهام عندك.
- `Outbound Webhooks`: نظامك يرسل أحداث المهام تلقائيًا إلى النظام الخارجي.

## Inbound API

### Base URL

```text
http://localhost:3007/api/v1/external/tasks
```

### Authentication

يتم إنشاء مفاتيح الـ API من داخل النظام عبر:

- `GET /api/v1/tasks/integrations/credentials`
- `POST /api/v1/tasks/integrations/credentials`
- `PUT /api/v1/tasks/integrations/credentials/:credentialId`
- `POST /api/v1/tasks/integrations/credentials/:credentialId/rotate`
- `DELETE /api/v1/tasks/integrations/credentials/:credentialId`

المفتاح يُرسل بأحد الشكلين:

- Header: `x-api-key: tsk_...`
- أو `Authorization: Bearer tsk_...`

### Scopes

- `tasks:read`
- `tasks:write`
- `tasks:update`

المفاتيح التي تملك `tasks:write` أو `tasks:update` يجب أن تكون مرتبطة بـ:

- `userId` لمفتاح مستخدم
- أو `defaultActingUserId` لمفتاح شركة

### Endpoints

- `GET /api/v1/external/tasks`
- `GET /api/v1/external/tasks/:id`
- `GET /api/v1/external/tasks/projects`
- `GET /api/v1/external/tasks/users`
- `POST /api/v1/external/tasks`
- `PATCH /api/v1/external/tasks/:id`
- `PUT /api/v1/external/tasks/:id`
- `PATCH /api/v1/external/tasks/:id/status`

### Important Behavior

- أي `create` أو `update` أو `status update` يتم عبر `External Tasks API` سيطلق أيضًا `outbound webhook events` إذا كانت الشركة مفعّلة لها Webhooks للأحداث المناسبة (`task.created` أو `task.updated` أو `task.status_changed`).
- أي تعديل على تفاصيل المهمة عبر `PATCH /api/v1/external/tasks/:id` يتطلب سكوب `tasks:update` ويرسل إشعارًا فوريًا للمكلف بالمهمة (المسؤول) والمنشئ والمتابعين، ويسجل في سجل النشاطات (`taskActivity`).
- قواعد الصلاحيات: محاولة تعديل مهمة تابعة لشركة أخرى تُرفض بـ `404 Not Found` لعزل بيانات الشركات، والمستخدم المكلّف فقط (غير المدير وغير المنشئ) يُمنع من تعديل بيانات المهمة بـ `403 Forbidden`.

### Ready Files

- Postman collection: `docs/EXTERNAL_TASKS_API.postman_collection.json`
- Postman environment: `docs/EXTERNAL_TASKS_API.postman_environment.json`
- Node.js example: `backend/examples/external-tasks-api-node.js`
- Laravel example: `backend/examples/external-tasks-api-laravel.php`

### Postman Quick Start

1. Import `EXTERNAL_TASKS_API.postman_collection.json`
2. Import `EXTERNAL_TASKS_API.postman_environment.json`
3. ضع `authToken` من مستخدم مخول لإدارة التكاملات
4. نفذ `List Users` لاختيار `assignedTo`
5. نفذ `Create Credential` وسيتم تعبئة `apiKey` تلقائيًا
6. بعدها استخدم requests الخاصة بـ `External Tasks API`

### Create Task Example

```json
{
  "title": "مراجعة تصميم الصفحة الجديدة",
  "description": "تم إنشاؤها من موقع خارجي",
  "priority": "HIGH",
  "type": "general",
  "projectId": "project-id",
  "assignedTo": "user-id",
  "dueDate": "2026-04-10T12:00:00.000Z",
  "startDate": "2026-04-06T09:00:00.000Z",
  "estimatedHours": 4,
  "tags": ["external", "site-b"]
}
```

### Update Task Example (PATCH /api/v1/external/tasks/:id)

تتيح نقطة التعديل تحديث حقول المهمة دون الحاجة لفتح الواجهة يدويًا:
- `title` (العنوان): نص غير فارغ.
- `description` (الوصف): نص غير فارغ يظهر مباشرة في تفاصيل المهمة بالواجهة.
- `priority` (الأولوية): `LOW` | `MEDIUM` | `HIGH` | `URGENT`.
- `dueDate` (الموعد): تاريخ بصيغة ISO-8601 (أو `null` لإلغاء الموعد).
- `tags` (الوسوم): مصفوفة نصوص مثل `["crm", "priority-client"]`.
- `assignedTo` (المسؤول): معرّف مستخدم نشط في نفس الشركة (إلزامي التحقق من نشاطه ووجوده في نفس الشركة).

```bash
curl -X PATCH "http://localhost:3007/api/v1/external/tasks/TASK_ID" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "title": "مراجعة تصميم الصفحة الجديدة - محدث",
    "description": "تم تحديث وصف المهمة تلقائيًا من التكامل الخارجي",
    "priority": "URGENT",
    "dueDate": "2026-04-15T15:00:00.000Z",
    "tags": ["external", "updated", "crm"],
    "assignedTo": "active-company-user-id"
  }'
```

استجابة نموذجية:
```json
{
  "success": true,
  "data": {
    "id": "task-id",
    "title": "مراجعة تصميم الصفحة الجديدة - محدث",
    "description": "تم تحديث وصف المهمة تلقائيًا من التكامل الخارجي",
    "status": "PENDING",
    "priority": "URGENT",
    "assignedTo": "active-company-user-id",
    "assignedToName": "Hossam Assignee",
    "dueDate": "2026-04-15T15:00:00.000Z",
    "tags": ["external", "updated", "crm"]
  },
  "message": "Task updated successfully"
}
```

### Update Status Example (PATCH /api/v1/external/tasks/:id/status)

```json
{
  "status": "IN_PROGRESS",
  "progress": 35
}
```

## Outbound Webhooks

إدارة الـ webhooks تتم من داخل النظام عبر:

- `GET /api/v1/tasks/integrations/webhooks`
- `POST /api/v1/tasks/integrations/webhooks`
- `PUT /api/v1/tasks/integrations/webhooks/:webhookId`
- `DELETE /api/v1/tasks/integrations/webhooks/:webhookId`
- `GET /api/v1/tasks/integrations/webhooks/:webhookId/deliveries`

### Supported Events

- `task.created`
- `task.updated`
- `task.status_changed`
- `task.deleted`

### Headers Sent

- `Content-Type: application/json`
- `X-Task-Event`
- `X-Task-Company-Id`
- `X-Webhook-Timestamp`
- `X-Task-Signature`

إذا كان الـ webhook يملك `signingSecret` فالتوقيع يتم كالتالي:

```text
HMAC-SHA256(secret, timestamp + "." + rawBody)
```

### Payload Example

```json
{
  "event": "task.status_changed",
  "sentAt": "2026-04-05T14:11:22.000Z",
  "source": "tasks-module",
  "requestId": "optional-request-id",
  "actorUserId": "user-who-made-the-change",
  "task": {
    "id": "task-id",
    "companyId": "company-id",
    "projectId": "project-id",
    "projectName": "Website Revamp",
    "title": "Review landing page",
    "description": "Updated from internal tasks page",
    "status": "IN_PROGRESS",
    "priority": "HIGH",
    "type": "general",
    "assignedTo": "user-id",
    "assignedToName": "Ali Hassan",
    "createdBy": "creator-id",
    "createdByName": "Mona Adel",
    "dueDate": "2026-04-10T12:00:00.000Z",
    "startDate": "2026-04-06T09:00:00.000Z",
    "completedDate": null,
    "estimatedHours": 4,
    "actualHours": 0,
    "progress": 35,
    "tags": ["external", "site-b"],
    "dependencies": [],
    "categoryId": null,
    "isRecurring": false,
    "recurringRule": null,
    "createdAt": "2026-04-05T10:00:00.000Z",
    "updatedAt": "2026-04-05T14:11:20.000Z"
  },
  "previousTask": {
    "id": "task-id",
    "companyId": "company-id",
    "status": "PENDING",
    "progress": 0
  }
}
```

## Internal Management Notes

- إدارة المفاتيح والـ webhooks متاحة فقط لأدوار:
  - `SUPER_ADMIN`
  - `COMPANY_ADMIN`
  - `OWNER`
- المفتاح الحقيقي يظهر مرة واحدة فقط عند الإنشاء أو التدوير.
- المفاتيح يتم تخزينها في قاعدة البيانات كـ `hash` وليس كنص صريح.
- سجلات تسليم الـ webhooks تحفظ آخر الاستجابات للمراجعة والتتبع.
