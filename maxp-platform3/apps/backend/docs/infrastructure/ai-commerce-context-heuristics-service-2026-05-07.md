## AI Commerce Context Heuristics Service

This slice extracts the pure/contextual product follow-up heuristics from `CoreAIAgent` into a standalone service without wiring it into the live Core path yet.

New service:
- `backend/services/aiAgent/commerceContextHeuristicsService.js`

Covered behaviors:
- image intent detection
- ambiguous product references
- generic post-commerce questions
- recent image conversation context
- context-dependent product follow-up
- selection-only order follow-up
- nearby product category predicates

Why it is not wired yet:
- `CoreAIAgent.js` is under concurrent refactoring
- this extraction is intentionally kept merge-safe: service + focused tests + doc note only

Verification for this slice:
- `node --check services/aiAgent/commerceContextHeuristicsService.js`
- `npx jest tests/services/commerceContextHeuristicsService.test.js --runInBand --testTimeout=30000`
