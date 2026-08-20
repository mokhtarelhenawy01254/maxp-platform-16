# WhatsApp Meta Template Resubmit Fix ΓÇö Create New Template on Edit

**Date:** 2026-08-05

## Problem

When a user edits the local template content for a status (e.g. "┘à╪ñ┘â╪» / CONFIRMED") and clicks **"╪Ñ╪▒╪│╪º┘ä ┘ä┘ä┘à╪▒╪º╪¼╪╣╪⌐ ┘à┘å ╪¼╪»┘è╪»"** on `/orders/status-templates`, the resubmit always failed with:

```
Invalid parameter ΓÇö ┘è┘ê╪¼╪» ┘à╪¡╪¬┘ê┘ë ╪¿┘ç╪░┘ç ╪º┘ä┘ä╪║╪⌐ ╪¿╪º┘ä┘ü╪╣┘ä ΓÇö ┘è┘ê╪¼╪» ╪¿╪º┘ä┘ü╪╣┘ä ┘à╪¡╪¬┘ê┘ë ╪¿╪º┘ä┘ä╪║╪⌐ Arabic ┘ä┘ç╪░╪º ╪º┘ä┘é╪º┘ä╪¿.
┘è┘à┘â┘å┘â ╪Ñ┘å╪┤╪º╪í ┘é╪º┘ä╪¿ ╪¼╪»┘è╪» ┘ê╪Ñ╪╣╪º╪»╪⌐ ╪º┘ä┘à╪¡╪º┘ê┘ä╪⌐. ΓÇö (code: 100) ΓÇö (subcode: 2388024)
```

## Root Cause

Meta **locks the content (body/header/footer) of approved message templates** once they are `APPROVED`. It is not possible to edit an approved template's content in the same language ΓÇö Meta returns:

- `code 100 / subcode 2388024` ("Content In This Language Already Exists") when POSTing to the collection endpoint (`message_templates?name=X` or a create with the same name), because the name+language pair already exists.
- `code 2500` ("Unknown path components") when trying `POST /message_templates/{templateId}`, because the Cloud API has no such edit sub-path for template content.

The only supported way to change the content of an approved template is to **create a brand-new template** with a unique name and link the local template to it.

## Solution

1. `resubmitMetaTemplate` (`whatsappNotificationController.js`) now **creates a new Meta template** with a unique name containing the edited local content (reusing the same variant-retry logic that `publishTemplateToMeta` already uses), instead of trying to update the existing approved template.
   - Shared helper `createMetaTemplateFromLocal(sessionId, localTemplate)` extracted so both `publishTemplateToMeta` and `resubmitMetaTemplate` use identical creation logic.
   - On success the local template is re-bound to the new Meta template name + ID and set to `PENDING`. When Meta approves it, it automatically becomes the primary template for sending.
2. `publishTemplateToMeta` and `bindMetaTemplate` store `metaTemplateId` on the local `WhatsAppNotificationTemplate` so it can be reused later.
3. Added `metaTemplateId` column to the `WhatsAppNotificationTemplate` model + migration `20260805_add_meta_template_id`.

## Relevant Files

- `apps/backend/controller/whatsappNotificationController.js`
- `apps/backend/services/whatsapp/providers/MetaCloudProvider.js`
- `apps/backend/prisma/schema/marketing.prisma`
- `apps/backend/prisma/migrations/20260805_add_meta_template_id/migration.sql`
- `apps/backend/tests/controller/whatsappNotificationController.resubmitMeta.test.js`
- `apps/backend/scripts/diag-meta-update.js` (server-side diagnostic proving Meta rejects both edit approaches)

## Verification

- Diagnostic on production confirmed: `POST /message_templates/{id}` ΓåÆ `2500 Unknown path components`; `POST /message_templates?name=X` ΓåÆ `100/2388024`. Only **create** is accepted by Meta.
- `POST /templates/:id/resubmit-meta` now returns `200` with a newly created Meta template in `PENDING`, and the local template re-bound to it.
- `resubmitMeta`, `metaTemplatePayload` and `deliveryPreview` test suites pass.
