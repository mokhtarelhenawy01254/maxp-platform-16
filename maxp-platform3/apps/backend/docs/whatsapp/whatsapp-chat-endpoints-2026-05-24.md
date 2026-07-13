# WhatsApp Chat Endpoints Alignment
**Date:** 2026-05-24

## Overview
The WhatsApp Chat interface actions (Archive, Delete, Pin, Mute, Mark Unread, Block, Unblock) previously failed silently because the React frontend was dispatching mismatched RESTful routes. This has been resolved by mapping all chat actions to the existing `/api/whatsapp/chats/*` and `/api/whatsapp/contacts/*` endpoints on the backend.

## Endpoint Mappings

| Action | Frontend Call | Backend Target | Body |
| :--- | :--- | :--- | :--- |
| **Delete Chat** | `api.post('/whatsapp/chats/delete')` | `whatsappController.deleteChat` | `{ sessionId, jid }` |
| **Archive Chat** | `api.post('/whatsapp/chats/archive')` | `whatsappController.archiveChat` | `{ sessionId, jid, archive }` |
| **Pin Chat** | `api.post('/whatsapp/chats/pin')` | `whatsappController.pinChat` | `{ sessionId, jid, pin }` |
| **Mute Chat** | `api.post('/whatsapp/chats/mute')` | `whatsappController.muteChat` | `{ sessionId, jid, mute }` |
| **Mark Unread**| `api.post('/whatsapp/chats/unread')` | `whatsappController.markChatUnread`| `{ sessionId, jid, unread }` |
| **Block** | `api.post('/whatsapp/contacts/block')` | `whatsappController.blockContact` | `{ sessionId, jid }` |
| **Unblock** | `api.post('/whatsapp/contacts/unblock')` | `whatsappController.unblockContact`| `{ sessionId, jid }` |

## Local Database Sync (Blocking)
Previously, blocking a contact would invoke the Baileys update to block the contact on WhatsApp, but `whatsappController.js` would not update `whatsAppContact.isBlocked` in the local Prisma database. This caused the UI to revert to the unblocked state immediately upon the next query invalidation.

**Resolution**: `blockContact` and `unblockContact` in `whatsappController.js` now execute `updateMany` on `whatsAppContact` setting `isBlocked: true/false`, guaranteeing immediate UI synchronization.
