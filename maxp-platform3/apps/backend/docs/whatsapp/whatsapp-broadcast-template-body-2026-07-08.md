# Broadcast Meta Template — Body Content in Chat

**Date:** 2026-07-08

## Problem

Broadcast messages sent via `broadcastMetaTemplate` only showed the template name in `/whatsapp` chat history — the body content was missing.

## Root Cause

`sendTemplateMessage()` in `WhatsAppMessageHandler.js` saves the display content as:

- `{templateName}\n{bodyText}` when `templateBody` option is provided
- `Template: {templateName}` otherwise

The `broadcastMetaTemplate` controller was not passing `templateBody`, so all broadcast template messages fell to the fallback format.

## Fix (`whatsappMetaTemplateController.js`)

1. Before the recipient loop, fetch all templates from Meta API via `MetaCloudProvider.listTemplates()`
2. Find the target template by name and extract the `BODY` component's `text`
3. For each recipient, resolve `{{1}}`, `{{2}}` variables using the recipient's body parameters (if any)
4. Pass the resolved body as `templateBody` to `sendTemplateMessage`

## Relevant Files
- `apps/backend/controller/whatsappMetaTemplateController.js` — broadcast logic
- `apps/backend/services/whatsapp/WhatsAppMessageHandler.js` — `sendTemplateMessage()`
- `apps/frontend/src/pages/whatsapp/components/MessageBubble.tsx` — template rendering in chat
