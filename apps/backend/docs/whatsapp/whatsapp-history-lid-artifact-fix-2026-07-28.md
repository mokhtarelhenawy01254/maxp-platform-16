# WhatsApp History LID and Artifact Fix

## Problem

Historical Baileys sync could leave an `@lid` identity as a visible standalone conversation when its phone mapping arrived in another batch or after a restart. Protocol and stub artifacts from history sync could also be presented as user-facing unsupported-message placeholders.

## Fix

- Persist official Baileys phone-to-LID mappings per WhatsApp session and merge existing LID messages and contacts as soon as a mapping is received.
- Resolve later LID messages from the persisted mapping before heuristic lookup.
- Store history protocol and stub artifacts as hidden audit records rather than visible messages.
- Exclude unresolved raw LID contacts from WhatsApp and unified inbox lists while retaining the underlying records for later reconciliation.
- Add a dry-run repair command for existing historical artifacts:

```powershell
node apps/backend/scripts/repairWhatsAppHistoryArtifacts.js
node apps/backend/scripts/repairWhatsAppHistoryArtifacts.js --apply
```

## Deployment

Apply the Prisma migration before using the repair command. The repair command is idempotent and does not delete records.
