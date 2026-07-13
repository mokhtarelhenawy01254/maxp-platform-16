# Read-Only Tool Planning Service - 2026-05-07

## Purpose

Extract the read-only dry-run planning seam from `CoreAIAgent` so Messenger/test
orchestration no longer owns candidate heuristics and planning-summary logging inline.

## What moved

- conversation-memory shaping for tool planning
- safe `ORD-...` lookup extraction
- candidate selection for:
  - `order.lookup`
  - `shipping.quote`
  - `product.search`
  - `faq.retrieve`
- planning-summary shaping
- orchestrator-backed dry-run execution and `tool_planning_summary` trace logging

## Why this cut helps

- keeps planning heuristics independent from live send/delivery flow
- narrows the remaining `processMessage` surface
- gives Core a dedicated planning seam that can evolve without growing the facade again

## Validation

- `npx jest tests/services/readOnlyToolPlanningService.test.js --runInBand --testTimeout=30000`
- `npm run test:ai:tools`
- `npm run test:ai:runtime-inventory`
