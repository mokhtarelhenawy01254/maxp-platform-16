# Messenger Live Execution Service - 2026-05-07

## Purpose

Extract the live Facebook Messenger orchestration seam from `CoreAIAgent` so
the customer-facing entrypoint becomes a thin wrapper instead of owning the
entire runtime lifecycle inline.

## What moved

- inbound idempotency + runtime-ledger reservation
- AgentRun trace shell for the live Messenger path
- company enabled check + typing indicator orchestration
- context/policy/tool-planning/summary setup
- confirmed-order and gratitude short-circuits
- human-override silent exits
- final reply finalization + guardrail silent exit
- outbound idempotency + delivery + production evaluation + telemetry
- success/error trace completion for the live Messenger flow

## Why this cut helps

- makes `processMessage(...)` match the facade style already used by
  `processMessageForReplyOnly(...)` and `processMessageForTest(...)`
- isolates the Messenger-only live path from shared reply-preview behavior
- gives the live delivery path a dedicated service boundary for future cleanup
  without mixing it back into the Core facade

## Validation

- `npx jest tests/services/messengerLiveExecutionService.test.js --runInBand --testTimeout=30000`
- `npm run test:ai:tools`
- `npm run test:ai:runtime-inventory`
