# Baileys history sync runtime hardening

## Shipped behavior

- History notifications for each WhatsApp session are processed through one in-memory queue, preventing concurrent batches from racing to update contacts, progress, or the durable import state.
- Import counters increase only for newly persisted messages; replayed message ids no longer inflate the imported-message count.
- Progress is normalized to a percentage from 0 to 100 for the API and settings UI.
- When the final history event is received, completion waits for the session queue to drain before the import is marked complete.
- Existing historical media records without a local URL are downloaded after the message import completes. The worker is limited to two concurrent downloads by default and retains failed records for later retry.
- `POST /api/whatsapp/sessions/:id/history-sync` requests a new Baileys history sync through the durable state and reconnect coordinator. Duplicate requests return the current running state rather than creating another socket.

## UI behavior

- WhatsApp settings display visible conversations, excluding hidden history artifacts and unresolved `@lid` records, instead of raw contact rows.
- The conversations menu includes **┘à╪▓╪º┘à┘å╪⌐ ╪º┘ä╪▒╪│╪º╪ª┘ä** for a selected Baileys session.
- The settings session card displays history-import progress while the request is pending or in progress.

## Operational notes

- WhatsApp decides which historical messages and media remain available to a linked device. An expired media URL remains pending and can be retried on a later completed import.
- The media worker limits are configurable with `WHATSAPP_HISTORY_MEDIA_SYNC_LIMIT` and `WHATSAPP_HISTORY_MEDIA_SYNC_CONCURRENCY`.
