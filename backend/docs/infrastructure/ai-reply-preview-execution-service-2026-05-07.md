# AI Reply Preview Execution Service - 2026-05-07

## Purpose

Extract the shared non-delivery reply pipeline out of `CoreAIAgent` so the
reply-only adapter path and test-chat path stop duplicating the same runtime
orchestration.

## Owns

- reply-preview run scaffolding:
  - idempotency
  - ledger reservation
  - trace start / completion
- enable-check handling for non-delivery entrypoints
- context preparation + company policy + read-only tool planning
- summary persistence before reply generation
- confirmed-order / gratitude / LLM draft selection
- authoritative-blueprint fallback hook
- configurable provider-fallback hook
- optional human-override enforcement
- final reply polish + guardrail handling
- outbound idempotency for non-delivery reply payloads
- production-evaluation recording for preview/test surfaces
- optional telemetry logging for preview surfaces
- final response payload shaping for reply-only/test callers

## Current Core Callers

- `processMessageForReplyOnly(...)`
- `processMessageForTest(...)`

`processMessage(...)` stays outside this seam for now because it still owns
Messenger typing and live delivery side effects.

## Why This Boundary

`processMessageForReplyOnly` and `processMessageForTest` were nearly twins.
Moving their shared pipeline into one service removes a large duplicated block
without forcing Messenger delivery policy into a giant config-driven helper.
