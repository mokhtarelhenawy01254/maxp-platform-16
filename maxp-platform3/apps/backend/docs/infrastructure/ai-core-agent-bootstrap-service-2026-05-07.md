# Core AI Agent Bootstrap Service - 2026-05-07

## Purpose

Extract constructor-time service graph assembly out of
`backend/services/CoreAIAgent.js` without changing the public Core entrypoints.

## What moved

- per-instance Prisma accessor setup
- per-instance image-analysis and Gemini-model caches
- ordered creation of extracted AI runtime services
- constructor-only dependency injection for:
  - search/summary/state/catalog/image/product grounding
  - reply shaping/hardening/finalization
  - provider fallback/generation
  - context preparation/enrichment
  - intent/support/arbitration/blueprint helpers
  - delivery/override/preview execution
  - order collection / confirmed-order execution

## Why this cut helps

- `CoreAIAgent` keeps the same public facade but carries less DI noise.
- Constructor ordering remains explicit in one helper instead of being mixed with
  runtime methods.
- Inventory/docs can now point at one bootstrap seam for service ownership.

## Validation

- `node --check backend/services/aiAgent/coreAIAgentBootstrapService.js`
- `node --check backend/services/CoreAIAgent.js`
- existing AI architecture and tool gates after integration
