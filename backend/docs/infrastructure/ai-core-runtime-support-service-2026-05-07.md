# Core Runtime Support Service

- Date: 2026-05-07
- Service: `backend/services/aiAgent/coreRuntimeSupportService.js`

## Purpose

Extract the remaining cross-cutting Core runtime helpers that were still shared by
the live Messenger and reply-preview/test execution seams:

- inbound/outbound idempotency summaries
- runtime-ledger reservation summaries
- ledger completion payload shaping
- company-policy resolution trace step
- run-diagnostics metadata merge
- company-level AI enablement check
- shadow production-evaluation recording

## Why this seam

`messengerLiveExecutionService` and `replyPreviewExecutionService` had already
pulled the heavy orchestration out of `CoreAIAgent`, but they were still calling
runtime support helpers through `core`. Moving that support cluster behind a
dedicated service reduces the remaining execution-time coupling to the Core
facade without changing public method names.

## Wiring

- Constructed in `backend/services/aiAgent/coreAIAgentBootstrapService.js`
- Exposed on the Core instance as `coreRuntimeSupportService`
- `CoreAIAgent` keeps compatibility wrappers for the original method names
- `messengerLiveExecutionService` and `replyPreviewExecutionService` now consume
  the new service directly when bootstrap provides it, while still falling back
  to `core` in focused tests

## Validation

- `backend/tests/services/coreRuntimeSupportService.test.js`
- `backend/tests/services/messengerLiveExecutionService.test.js`
- `backend/tests/services/replyPreviewExecutionService.test.js`
