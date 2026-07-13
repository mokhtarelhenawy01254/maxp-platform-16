# WhatsApp live read/send cache refresh - 2026-05-07

## Issue

Unread badges could remain visible after opening a chat, especially while viewing "all sessions". Sending a message could also appear delayed until a manual refresh.

## Cause

The UI updated only the session-specific conversations cache (`whatsapp/conversations/<sessionId>`). The active list is often the aggregate `all` cache, so read/send mutations could succeed on the server while the visible list kept stale unread counts or old last-message state.

The chat view also skipped repeated mark-as-read calls for the same chat after one successful call. If new unread messages arrived in an already-open chat, the client could suppress the next server read update.

## Fix

- Read/send/media mutations now update every cached `whatsapp/conversations` query, including the aggregate `all` list.
- Conversation cache matching now normalizes WhatsApp JIDs with device suffixes before comparing contacts.
- Mark-as-read debouncing no longer blocks future read updates for the same open chat.
- Socket-driven conversation refreshes now refetch active conversation queries instead of only marking them stale.
- The backend read path now updates only messages whose status is not already `READ`, and skips the message update entirely when a chat has no unread message left.

## Regression coverage

Added `frontend/src/hooks/__tests__/useWhatsAppMutations.cache.test.ts` for JID normalization and multi-page conversation cache updates, plus a backend mark-as-read regression test for avoiding unnecessary message-wide updates.
