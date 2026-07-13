# AI Conversation State Service

Date: 2026-05-07

## Purpose

`backend/services/aiAgent/conversationStateService.js` extracts the
conversation-state and grounding-persistence seam from `CoreAIAgent`.

The service now owns:

- recent grounding extraction from prior AI messages;
- conversation metadata grounding lookup;
- conversation summary context lookup and repair handoff;
- summary metadata merge/build logic;
- persisted summary write-back;
- last grounded AI-message lookup from stored conversation history.

## Why It Was Extracted

Before this slice, `CoreAIAgent` still mixed:

- read-side metadata lookups for product grounding;
- conversation-summary state persistence;
- recent/history-based grounding lookup for downstream services.

Moving these responsibilities into a dedicated service gives
`productGroundingService` and `contextPreparationService` a direct state-layer
dependency instead of routing back through the Core monolith.

## Key Dependencies

The service works through injected helpers for:

- summary extraction/repair from `conversationSummaryService`;
- patch building and summary-state merging;
- Prisma access for conversations/messages;
- JSON parsing and logging.

## Verification

Focused coverage lives in:

- `backend/tests/services/conversationStateService.test.js`

This slice is also covered by the shared AI gates:

- `npm run test:ai:tools`
- `npm run test:ai:runtime-inventory`
- `npm run test:ai:architecture`
