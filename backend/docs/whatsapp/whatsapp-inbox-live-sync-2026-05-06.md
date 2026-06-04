# WhatsApp Inbox Live Sync Fix - 2026-05-06

## Context

Production inspection of `/whatsapp` found three related issues:

- Messages sent from the linked WhatsApp app could be delivered to customers but not appear live in the web inbox.
- Read receipts could be overwritten by later message replay events, leaving web ticks stuck at sent/delivered.
- The web header preferred placeholder CRM names such as `WhatsApp User` over the real WhatsApp push name.

## Fix

- Process Baileys `messages.upsert` events with type `append` when the message is from the linked account, then emit them as sent-message socket events.
- Preserve higher delivery states when replayed message data arrives, and include `remoteJid` in status socket events so the frontend can patch the open chat.
- Listen for `message-receipt.update` to cover receipt events Baileys emits for groups and status-style receipts.
- Prefer real contact names and push names over placeholder customer names in the WhatsApp UI.
- Make the WhatsApp sidebar filters more compact and replace unsafe dropdown labels that crashed Base UI menus.
- Reapplied the Baileys live-sync fix after a later GitHub deploy overwrote the direct production patch, merging it with the upstream `contactIdentity` normalization helper.
- Updated the shared inbound persistence service so incoming webhook messages default to `DELIVERED`, normalized contact keys are used consistently, and receipt updates cannot downgrade a higher message status.
- Resolve Baileys linked-device `@lid` identifiers back to the real phone JID when a previous inbound message exposed `senderPn`, so messages sent from the mobile WhatsApp app stay in the same conversation instead of creating a duplicate `lid:*` chat.
- Skip CRM customer creation for unresolved `@lid` identifiers; if no phone mapping exists yet, keep the WhatsApp message temporary and merge it once the phone mapping arrives.
- Emit status updates with the persisted message `remoteJid` so read/delivery ticks update the phone conversation even when Baileys receipt payloads still reference the `@lid` key.
- Backfilled production Swan `@lid` duplicates by moving known `@lid` messages into their mapped phone conversations and deleting the duplicate WhatsApp contact rows.

## Verification

- Focused Jest coverage protects the upsert type decision and status monotonicity helpers.
- Added coverage for string Baileys statuses such as `DELIVERY_ACK` and for the shared inbound status monotonicity helper.
- Added coverage for resolving outgoing linked-device messages through previous inbound `senderPn` metadata.
- Frontend build and a production browser smoke check should verify the three-dot menu, compact filters, info drawer name, and read-tick updates.
- Production browser verification after the LID fix confirmed Shrouk appears once under `201270388115`, the duplicate `lid:101524504055946` entry is gone, and no console/network errors occurred.
