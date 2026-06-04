# WhatsApp Baileys Message Capture Fix - 2026-05-06

## Context

Production investigation found two failure modes in the unofficial WhatsApp (Baileys) inbox:

- `maxp-backend` was restarting under the PM2 `1G` memory limit, which temporarily disconnected Baileys sessions.
- Replayed `messages.upsert` notify events older than 60 seconds were skipped before persistence, so messages received during disconnect/reconnect windows could be lost.
- Some saved messages used non-phone JIDs (`@lid` or groups) without a matching `WhatsAppContact`, leaving them outside the visible conversation list.

## Fix

- Replaced the 60-second age drop with a future-timestamp sanity check. Message idempotency now relies on the existing `messageId` upsert.
- Added normalized timestamp handling for Baileys Long-like timestamp values.
- Ensured contact creation always has a non-null `phoneNumber` value for phone, `@lid`, and group JIDs.
- Changed WhatsApp conversation/message queries to fetch fresh API data first and use IndexedDB only as an offline fallback, with short polling to recover when socket events are missed.

## Verification

- Added focused Jest coverage for replayed old notify messages, future timestamp rejection, Baileys timestamp parsing, and non-phone contact identifiers.

## Follow-Up

- Production still needs deployment and a memory investigation. The PM2 restarts explain live delays because each restart forces WhatsApp session restoration.
