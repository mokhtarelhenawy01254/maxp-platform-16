# Unified Inbox — WhatsApp Backend Bug Fixes (2026-06-16)

## Summary

Fixed 2 backend bugs in `unifiedInboxController.js` affecting WhatsApp conversation display.

## Changes

### 1. WhatsApp `lastMessage` Preview No Longer Empty

**File:** `apps/backend/controller/unifiedInboxController.js`

**Problem:** The `normalizedWhatsApp` mapping always set `lastMessage: ''`, so every WhatsApp conversation showed an empty preview in the inbox sidebar.

**Fix:**
- Added `lastMessagePreview` and `lastMessageIsFromMe` to the `prisma.whatsAppContact.findMany()` select.
- Mapped them correctly in the normalization:
  ```js
  lastMessage: contact.lastMessagePreview || '',
  lastMessageIsFromCustomer: !contact.lastMessageIsFromMe,
  ```

### 2. WhatsApp Count Badge Now Accurate

**Problem:** The `whatsapp` count in the platform badges was queried from `prisma.conversation.count()` with `channel: 'WHATSAPP'`. However, WhatsApp data in the Unified Inbox comes from the `WhatsAppContact` model, not the `Conversation` model — so the badge always showed an incorrect (usually 0) count.

**Fix:** WhatsApp count now queries `prisma.whatsAppContact.count()` filtered by the company's active WhatsApp session IDs and `isArchived: false`.

### 3. WhatsApp `contactId` Now Maps to Linked Customer

**Problem:** `contactId` for WhatsApp contacts was always set to `contact.id` (the WhatsAppContact row ID). If the contact was linked to a `Customer` record, the customer profile could not be loaded by the frontend.

**Fix:** `contactId` is now set to `contact.customer?.id || contact.id`, allowing the frontend to load the customer profile panel when available.

### 4. Added `id` to Customer Select

Added `id: true` to the customer sub-select in the WhatsApp contacts query so the `contactId` mapping works correctly.
