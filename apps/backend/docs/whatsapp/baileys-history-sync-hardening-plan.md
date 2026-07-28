# Plan: Baileys History Sync Hardening

**Generated**: 2026-07-28  
**Complexity**: High

## Overview

Harden the optional Baileys full-history import so that the database inbox reflects the WhatsApp history reliably, without producing live-message side effects. The plan preserves the current product choice: historical imports must not trigger browser notifications, unread increments, CRM customer creation, AI replies, realtime socket message events, or media downloads.

The work is split into safe, testable increments. No destructive backfill or production history re-import is part of this plan unless explicitly approved after the code path is verified.

## Success Criteria

- Chats supplied by Baileys history are represented locally only when they carry a conversation timestamp (`conversationTimestamp` or `lastMessageRecvTimestamp`); address-book-only records are never stored.
- Every history message is either persisted or recorded as an explicit, observable unsupported/failed item; none are silently dropped.
- A restart or transient database failure cannot silently mark an incomplete import as complete, and completion never relies on the first raw Baileys history notification alone.
- An already-completed import is not needlessly requested on every reconnect.
- Large imports have bounded database work, do not generate a debug event-log row per message, and do not block normal socket processing for an unbounded time.

## Scope and Explicit Non-Goals

- In scope: `messaging-history.set` / optional full-history sync for Baileys sessions.
- In scope: chat/contact metadata needed by the local WhatsApp inbox.
- Out of scope: importing the phone address book wholesale, downloading old media, CRM/AI actions for historical messages, or changing the Meta Cloud provider.
- Out of scope: destructive migration of existing message records. Any repair/backfill is a separately approved operation.

## Sprint 1: Correctness and Message Preservation

**Goal**: Fix the known history-data holes without changing the visible behaviour of live messages.

**Demo / validation**:

- A fixture with chats, contacts, supported messages, an unsupported message type, and `@lid` messages produces a deterministic import result.
- No notification, AI, CRM, unread-count, socket-message, or media-download call is made during the fixture import.

### Task 1.1: Retain the activity filter while importing chat/contact metadata correctly

- **Location**: `apps/backend/services/whatsapp/WhatsAppManager.js`
- **Description**: Preserve the existing protection against empty contacts. Although Baileys 6.7.23 retains the latest message in `chat.messages` at runtime, do not use that field to create zero-message local contacts. Treat a chat as eligible for metadata upsert only when `conversationTimestamp` or `lastMessageRecvTimestamp` is present. Build a chat-JID set from those timestamped chats, then use matching `history.contacts` only for those JIDs. Upsert a local contact with safe display-name fields (`notify`, `name`, `verifiedName`) and `lastMessageAt`, while excluding `status@broadcast`, newsletters, and address-book-only contacts. A message that is actually persisted continues to create/increment its contact through the normal message path.
- **Dependencies**: None.
- **Acceptance criteria**:
  - A chat with no conversation timestamp creates no local contact, even if a Baileys runtime object retains a latest-message reference.
  - A timestamped chat can be represented locally, but remains hidden until it has a persisted message because the existing `totalMessages > 0` API filter remains in force.
  - Contacts not represented by an eligible chat are not imported solely because they are in the address book.
  - Existing newer `lastMessageAt`/preview values are never overwritten by an older history item.
- **Validation**: Unit tests for empty address-book chat, timestamp-only chat, retained-message-without-timestamp chat, matching contact name, group, newsletter, and stale-timestamp cases.

### Task 1.2: Forward WhatsApp’s official LID mappings through the Baileys history pipeline

- **Location**: `apps/backend/patches/@whiskeysockets+baileys+6.7.23.patch` (or a maintained internal Baileys fork), `apps/backend/package.json`, `apps/backend/services/whatsapp/WhatsAppManager.js`
- **Description**: Extend Baileys 6.7.23’s `processHistoryMessage` output to include `HistorySync.phoneNumberToLidMappings`, then expose it on `messaging-history.set`. Prefer a version-pinned `patch-package` patch or a maintained fork over runtime monkey-patching, because the function is consumed internally by Baileys. Apply mappings before importing messages, persist/merge them through the existing LID conversation logic, and pin the supported Baileys version.
- **Dependencies**: Task 1.1.
- **Acceptance criteria**:
  - A history payload’s `pnJid`/`lidJid` mapping resolves old incoming and outgoing LID messages without heuristic metadata searches.
  - Updating Baileys fails CI if the patch no longer applies or the mapping payload changes shape.
  - No global phone-address book is created from mapping records; mappings exist only to resolve a conversation/message identity.
- **Validation**: Patch application test plus fixtures containing direct mapping, missing mapping, and LID-first message ordering.

### Task 1.3: Make unsupported and unresolved historical messages observable and recoverable

- **Location**: `apps/backend/services/whatsapp/WhatsAppManager.js`
- **Description**: Replace silent `continue` paths for unsupported content and unresolved incoming `@lid` identifiers with a controlled fallback record (for example `messageType: 'UNSUPPORTED'`, raw metadata retained, no media download). Preserve a stable correlation key so a later LID-to-phone mapping can move the record into the resolved conversation.
- **Dependencies**: Tasks 1.1 and 1.2.
- **Acceptance criteria**:
  - Every message with a key/id is accounted for as persisted, deliberately excluded by product policy, or recorded in a durable failure record.
  - An unresolved LID does not prevent the rest of the batch from importing.
  - A later phone mapping merges the fallback record without duplicating it.
- **Validation**: Tests for poll/unknown payloads, view-once wrappers, unresolved LID, and later LID resolution.

### Task 1.4: Make historical contact updates monotonic

- **Location**: `apps/backend/services/whatsapp/WhatsAppManager.js`
- **Description**: Update `lastMessageAt` and `lastMessagePreview` only if the incoming history message is at least as recent as the stored contact’s latest message. Keep counters and unread values unchanged for history imports.
- **Dependencies**: Task 1.1.
- **Acceptance criteria**:
  - Importing an older batch never moves an inbox conversation backwards or replaces its latest preview.
  - Replaying a deduplicated history message changes neither counters nor unread state.
- **Validation**: Tests with out-of-order batches and repeated message ids.

## Sprint 2: Durable Import Lifecycle

**Goal**: Make an import resumable and prevent accidental repeat syncing.

**Demo / validation**:

- Interrupting an import after a partial batch leaves a visible `FAILED`/`IN_PROGRESS` state.
- Completion is accepted only from the event-buffer-consolidated history payload, not from the first raw notification where Baileys locally derives `isLatest`.
- Restarting the backend resumes or safely retries that import; a completed import does not start again automatically.

### Task 2.1: Persist history-sync state and batch progress

- **Location**: `apps/backend/prisma/schema.prisma`, generated Prisma migration, `apps/backend/services/whatsapp/WhatsAppManager.js`
- **Description**: Add a session-scoped history-import state (at minimum: requested, in-progress, completed, failed, started/completed timestamps, last error, and counters). Persist state before importing each Baileys history payload. Treat `isLatest` only as a completion signal on the event-buffer-consolidated `messaging-history.set` payload: in Baileys 6.7.23 raw notifications calculate it locally from `creds.processedHistoryMessages`, while `event-buffer.js` retains it across its merged set. Do not mark complete on a raw/individual notification or solely from `progress`.
- **Dependencies**: Sprint 1.
- **Acceptance criteria**:
  - UI/API can distinguish “not requested”, “in progress”, “completed”, and “failed”.
  - A process restart cannot report success based only on an in-memory `historySync` object or a premature raw `isLatest` flag.
  - A failure includes a safe diagnostic message without storing sensitive raw message content in the session metadata.
- **Validation**: Migration test, service tests for raw-like multi-notification fixtures versus one consolidated event, and a forced per-message DB failure.

### Task 2.2: Align Baileys acknowledgement with local durability

- **Location**: `apps/backend/services/whatsapp/WhatsAppManager.js`, `apps/backend/services/whatsapp/DatabaseAuthState.js`
- **Description**: Define an explicit recovery strategy for the gap between Baileys recording a history notification as processed and local persistence finishing. Ensure credentials/history notification state cannot advance silently while the local import is uncheckpointed; if Baileys cannot defer acknowledgement, retain enough durable import state to re-request or repair the missing range safely. The recovery state must retain the consolidated batch identity/counters, not a claim that the first `isLatest` notification completed the import.
- **Dependencies**: Task 2.1.
- **Acceptance criteria**:
  - A crash at any point has a deterministic recovery path documented and tested.
  - Credential saves are awaited or serialized where this recovery guarantee depends on them.
- **Validation**: Controlled crash/restart simulation around history notification and credential persistence.

### Task 2.3: Consume the one-time import request correctly across reconnects

- **Location**: `apps/backend/controller/whatsappController.js`, `apps/backend/services/whatsapp/WhatsAppManager.js`
- **Description**: Replace the permanent boolean `importHistoryOnLink` with lifecycle-aware intent/state. Initial linking or an explicit operator retry should enable the import; automatic reconnects should resume only an incomplete import, and completed imports should not re-enable full history automatically.
- **Dependencies**: Task 2.1.
- **Acceptance criteria**:
  - Restart during an import resumes it from durable state.
  - Restart after a completed import does not request it again.
  - An operator can explicitly request a fresh retry without clearing WhatsApp auth or deleting existing history.
- **Validation**: Tests for fresh link, completed restart, in-progress restart, transient reconnect, and manual retry.

## Sprint 3: Scale, Visibility, and Operations

**Goal**: Make large imports bounded, observable, and safe to operate in production.

**Demo / validation**:

- A fixture with thousands of messages completes in bounded batches and emits meaningful progress.
- Event-log volume remains bounded rather than proportional to message count.

### Task 3.1: Batch persistence and remove per-message debug logging from history imports

- **Location**: `apps/backend/services/whatsapp/WhatsAppManager.js`
- **Description**: Process history in bounded chunks. Use bulk reads/writes where Prisma semantics permit, and replace `debug_incoming_msg` per-message event rows with aggregate batch telemetry (counts, duration, skipped/fallback/failed counts).
- **Dependencies**: Sprint 2.
- **Acceptance criteria**:
  - No event-log row is generated per historical message in production.
  - The importer yields between chunks so connection events and shutdown can be handled.
  - Duplicate messages remain idempotent under concurrent/replayed payloads.
- **Validation**: Performance test with representative history sizes, DB query-count assertion, and duplicate batch test.

### Task 3.2: Expose progress and failure status safely

- **Location**: `apps/backend/services/whatsapp/WhatsAppManager.js`, `apps/backend/controller/whatsappController.js`, relevant WhatsApp settings/inbox frontend files
- **Description**: Send durable progress status through the existing API/socket path, including imported, skipped, fallback, failed, and completion counts. UI must distinguish incomplete history from no history.
- **Dependencies**: Task 2.1.
- **Acceptance criteria**:
  - Users see progress and can identify an incomplete/failed import.
  - The UI never claims “history synced” merely because a single event was received.
- **Validation**: API/service tests and frontend smoke test against mocked progress states.

### Task 3.3: Serialize health-check and socket-close reconnect decisions

- **Location**: `apps/backend/services/whatsapp/WhatsAppManager.js`
- **Description**: Introduce one per-session reconnect coordinator/state machine shared by the health check and `connection.update` close handler. Acquire the reconnect lock before scheduling a timer, make a pending timer part of the lock state, and let only the coordinator clear/restart sockets. Preserve the existing cooldown/backoff while making the winning reason observable.
- **Dependencies**: Sprint 2, because reconnect must preserve an incomplete history-import state.
- **Acceptance criteria**:
  - A health check and connection-close event arriving together produce one reconnect attempt and one DB/session-state transition.
  - A pending timer cannot be silently replaced by a second caller with different history-sync options.
  - Reconnect telemetry identifies the trigger (`health_check`, `socket_close`, or explicit retry).
- **Validation**: Deterministic fake-timer tests that interleave health-check, stale-socket close, and close-event paths.

## Testing Strategy

- Unit tests for the full `messaging-history.set` handler, not only option parsing helpers.
- Fixtures covering direct chats, groups, LID identities resolved through official `phoneNumberToLidMappings`, contacts, unsupported messages, duplicate ids, out-of-order timestamps, large batches, and database failures.
- Baileys patch-application verification against the pinned `@whiskeysockets/baileys@6.7.23` dependency.
- Restart simulation before, during, and after import completion, including raw multi-notification versus event-buffer-consolidated `isLatest` behaviour.
- Fake-timer interleaving tests for health-check and `connection.update` reconnect triggers.
- Regression checks proving historical imports emit no AI, CRM, notification, unread, realtime-message, or media-download effects.
- Targeted Jest command: `npx jest tests/services/WhatsAppManager.messageCapture.test.js --runInBand`, expanded with the new history lifecycle cases.

## Risks and Mitigations

| Change | Potential weakness introduced | Mitigation |
| --- | --- | --- |
| Creating contacts from chats | Could recreate the previous 700+ empty-contact problem | Keep the activity gate: require `conversationTimestamp` or `lastMessageRecvTimestamp`; keep the `totalMessages > 0` API filter as a second line of defence. |
| Forwarding official LID mappings | A runtime monkey-patch can silently break after a Baileys update | Use a version-pinned `patch-package` patch or maintained fork, plus a patch-application CI check. |
| Fallback persistence for unsupported content | UI may display a confusing blank/unknown message | Use a clear “unsupported historical message” presentation and retain raw metadata only according to retention policy. |
| Durable checkpointing | Adds schema/migration complexity | Make the migration additive and nullable/default-safe; deploy before code that depends on the new fields. |
| Retry/resume | Could duplicate messages or inflate counters | Keep a unique message identity and make all history side effects idempotent/disabled. |
| Batch writes | A partial batch could be harder to diagnose | Wrap each bounded chunk in a transaction and update progress only after commit. |
| Avoiding repeated sync | Could prevent an operator from recovering a failed import | Provide an explicit retry action/state rather than relying on reconnects. |
| Reconnect coordinator | Could delay a legitimate recovery while a stale lock exists | Bind the lock to a timer/socket generation and clear it in `finally`; cover it with fake-timer failure tests. |

## Rollback Plan

1. Feature-flag the new durable importer per session/company during rollout.
2. If a production issue appears, disable the new importer and preserve existing stored messages and import-state records; do not delete history.
3. Revert the application release independently of the additive migration. The new schema fields can remain harmlessly unused.
4. For a failed import, expose manual retry after inspecting batch telemetry; never clear auth or mass-delete messages as a recovery action.

## Confirmed Product Decisions

- Unsupported historical messages appear as a clear “رسالة غير مدعومة” placeholder instead of a silent drop.
- Retention accepts all history WhatsApp offers through Baileys; no application-side time or count cutoff is added.
- Historical group participants are not imported as contacts. The group conversation itself is imported; a participant becomes a contact only after a direct message.
