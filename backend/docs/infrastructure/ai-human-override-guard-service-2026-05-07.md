# AI Human Override Guard Service

Date: 2026-05-07

## Purpose

`backend/services/aiAgent/humanOverrideGuardService.js` extracts the
human-intervention guard seam from `CoreAIAgent`.

The service now owns:

- latest outbound human-message lookup for a conversation;
- trigger-time comparison against the inbound customer event;
- fallback lookup for earlier human intervention before the trigger;
- fail-open error handling when Prisma is unavailable or throws.

## Why It Was Extracted

Before this slice, `CoreAIAgent` still mixed:

- pre-delivery race/handoff protection;
- outbound delivery orchestration;
- reply/runtime coordination.

Moving the human-override check behind a dedicated guard keeps the intent clear:
this service decides whether AI should back off because a person has already
intervened.

## Key Dependencies

The service works through injected collaborators for:

- Prisma access;
- logging.

## Verification

Focused coverage lives in:

- `backend/tests/services/humanOverrideGuardService.test.js`

This slice is also covered by the shared AI gates:

- `npm run test:ai:tools`
- `npm run test:ai:runtime-inventory`
- `npm run test:ai:architecture`
