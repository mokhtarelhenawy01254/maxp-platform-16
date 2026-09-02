# WhatsApp Synchronization Hardening & Health Architecture (2026-09-02)

## Overview
This document records the architectural improvements and bug fixes applied to the WhatsApp integration layer (`WhatsAppManager`, `WhatsAppSyncService`, `WhatsAppMediaHandler`, and `conversationCrudController`) using `@whiskeysockets/baileys` v6.7.24.

---

## Key Changes & Fixes

### 1. Health Check False-Stale Disconnect Removal
- **File:** `apps/backend/services/whatsapp/WhatsAppManager.js`
- **Root Cause:** `classifySessionSocketHealth` previously triggered `stale: true` when `(now - lastMsgRecv) > 120000`. If no inbound messages arrived within 2 minutes, `runHealthCheck` (running every 25s) forcibly closed the WebSocket and requested a reconnect.
- **Fix:** Removed the message-inactivity threshold. Connection validity is now determined strictly by `readyState === 1` (OPEN). Baileys natively maintains connection vitality via 30s ping/pong keepalive frames (`keepAliveIntervalMs: 30000`).

### 2. Outgoing Message Deduplication (`emitOwnEvents: true`)
- **File:** `apps/backend/services/whatsapp/WhatsAppManager.js`
- **Root Cause:** When `WhatsAppMessageHandler.sendText` sent an outbound message, it manually persisted the message, synced to CRM, and emitted `whatsapp:message:sent`. Concurrently, Baileys emitted `messages.upsert` with `fromMe: true` (due to `emitOwnEvents: true`), causing `handleIncomingMessages` to run a second database upsert, duplicate CRM sync, and redundant socket emission.
- **Fix:** Added a deduplication guard in `handleIncomingMessages`: if `fromMe && !isNewMessage && !importHistory`, the redundant processing is skipped.

### 3. Isolation of WhatsApp Groups from CRM Customers
- **File:** `apps/backend/services/whatsapp/WhatsAppSyncService.js`
- **Root Cause:** `syncMessage` stripped non-digit characters from `remoteJid` (`120363...@g.us`), generating false `Customer` records in the CRM where group IDs became telephone numbers.
- **Fix:** Explicitly skipped customer sync for group JIDs (`remoteJid.endsWith('@g.us')`). Group messages remain safely tracked in `whatsAppMessage` without polluting 1-on-1 CRM customer data.

### 4. Manual History Sync Safety Timeout & Settling
- **File:** `apps/backend/services/whatsapp/WhatsAppManager.js`
- **Root Cause:** When "مزامنة الرسائل" was requested for an already-linked session, WhatsApp servers rarely re-transmitted history. The session remained stuck in `REQUESTED` for up to 1 hour, triggering heavy full-sync attempts on reconnects. Furthermore, `finalizeHistoryImport` closed on the first partial batch with `isLatest: true`, dropping trailing packets.
- **Fix:**
  - Added `scheduleHistorySyncRequestTimeout` (120s timeout) to auto-complete inactive history requests and prevent stuck states.
  - Added a 2000ms settling buffer before finalizing the import to guarantee multi-part history chunks (e.g. `PUSH_NAME`, `RECENT`) are fully processed.
  - Filtered history contacts to active chats and messages rather than importing the entire address book.

### 5. Baileys Call Event Listener
- **File:** `apps/backend/services/whatsapp/WhatsAppManager.js`
- **Fix:** Corrected event listener from non-existent `call.update` to Baileys standard `'call'` handling `WACallEvent[]`.

### 6. WhatsApp Read Receipts from Unified Inbox
- **File:** `apps/backend/controller/conversation/conversationCrudController.js`
- **Fix:** Wired `WhatsAppMessageHandler.markAsRead(sessionId, remoteJid)` to fire asynchronously when a `WHATSAPP` conversation is opened and marked as read in the Unified Inbox.
