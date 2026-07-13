# AI Response Delivery Execution Service

Date: 2026-05-07

## Purpose

`backend/services/aiAgent/responseDeliveryExecutionService.js` extracts the
runtime side effects of outbound customer delivery from `CoreAIAgent`.

The service now owns:

- text-message persistence for outbound AI replies;
- conversation patch persistence after delivery preparation;
- Facebook Messenger text/image send orchestration;
- message metadata updates with Facebook outcomes;
- employee socket broadcast orchestration;
- image-delivery loop control and skip rules;
- typing-on / typing-off sender actions plus socket typing events.

## Why It Was Extracted

Before this slice, `CoreAIAgent` still mixed:

- delivery metadata helpers that had already moved out,
- database writes for outbound messages,
- Facebook send side effects,
- socket notification side effects,
- typing-indicator transport.

Moving the execution flow behind a dedicated service keeps
`channelReplyDeliveryService` focused on payload shaping while the new service
owns the operational saga.

## Key Dependencies

The service works through injected collaborators for:

- Prisma access;
- delivery helper builders from `channelReplyDeliveryService`;
- Facebook transport;
- socket transport;
- UUID generation;
- axios sender-action transport.

## Verification

Focused coverage lives in:

- `backend/tests/services/responseDeliveryExecutionService.test.js`

This slice is also covered by the shared AI gates:

- `npm run test:ai:tools`
- `npm run test:ai:runtime-inventory`
- `npm run test:ai:architecture`
