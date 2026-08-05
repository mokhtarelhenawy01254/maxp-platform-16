# WhatsApp Meta Template Resubmit Fix — Update by Template ID

**Date:** 2026-08-05

## Problem

When a user edits the local template content for a status (e.g. "مؤكد / CONFIRMED") and clicks **"إرسال للمراجعة من جديد"** on `/orders/status-templates`, the resubmit always failed with:

```
Invalid parameter — يوجد محتوى بهذه اللغة بالفعل — يوجد بالفعل محتوى باللغة Arabic لهذا القالب.
يمكنك إنشاء قالب جديد وإعادة المحاولة. — (code: 100) — (subcode: 2388024)
```

## Root Cause

`MetaCloudProvider.updateTemplate()` sent the update request to the **create** collection endpoint:

```
POST /{wabaId}/message_templates?name={templateName}
```

Meta interprets a POST to the collection endpoint as creating a **new** template. Because a template with the same name + same language (`ar`) already exists, Meta rejects it with `code 100 / subcode 2388024` ("Content in This Language Already Exists"). Template names must be unique per WABA per language.

## Solution

1. `MetaCloudProvider.updateTemplate()` now updates the existing template via its numeric **template ID**:
   - Accepts an optional `templateId` (4th argument).
   - If not provided, resolves the ID by listing Meta templates and matching `name`.
   - POSTs to the edit endpoint: `POST /{wabaId}/message_templates/{templateId}`.
2. `resubmitMetaTemplate` (`whatsappNotificationController.js`) resolves the Meta template ID before calling `updateTemplate` and persists it.
3. `publishTemplateToMeta` and `bindMetaTemplate` now store `metaTemplateId` on the local `WhatsAppNotificationTemplate` so future resubmits reuse it without an extra list call.
4. Added `metaTemplateId` column to the `WhatsAppNotificationTemplate` model + migration `20260805_add_meta_template_id`.

## Relevant Files

- `apps/backend/services/whatsapp/providers/MetaCloudProvider.js`
- `apps/backend/controller/whatsappNotificationController.js`
- `apps/backend/prisma/schema/marketing.prisma`
- `apps/backend/prisma/migrations/20260805_add_meta_template_id/migration.sql`
- `apps/backend/tests/controller/whatsappNotificationController.resubmitMeta.test.js`

## Verification

- `POST /templates/:id/resubmit-meta` returns `200` with the updated template put back into `PENDING` review on Meta.
- All `resubmitMeta` controller tests pass (8/8), plus `metaTemplatePayload` and `deliveryPreview` suites.
