# AI Heuristic Intent Routing Service - 2026-05-07

## Scope

This note documents the extraction of the higher-level heuristic intent routing
seam out of `CoreAIAgent.js` into:

- `backend/services/aiAgent/heuristicIntentRoutingService.js`

Focused contract coverage for this seam lives in:

- `backend/tests/services/heuristicIntentRoutingService.test.js`

## Service Surface

The extracted service currently exposes four public helpers:

- `buildLegacyConversationMemory(messages)`
- `getLegacyContextManager()`
- `inferHeuristicIntent(message)`
- `analyzeMessageIntentWithLegacySystem(message, recentMessages, companyId)`

`CoreAIAgent` keeps the same outward methods, but now delegates those behaviors
through the dedicated service boundary.

## What The Service Owns

The new service now owns the intent-routing seam that used to sit inline inside
`CoreAIAgent`, including:

- safe legacy conversation-memory shaping from persisted message rows
- fail-safe legacy context-manager lookup through `aiRuntimeService`
- quick-intent short-circuiting when the legacy context manager can answer fast
- local deterministic heuristics for greeting, gratitude, privacy/out-of-scope,
  support, shipping, price, order, and browse/product inquiries
- enhanced-context fallback handoff when no quick or heuristic answer exists

## Boundary With Neighboring Services

- `intentReplyHeuristicsService` still owns the lower-level predicate helpers
  such as greeting/support/privacy detection.
- `heuristicIntentRoutingService` now owns the arbitration order that decides
  when to trust quick legacy intent, local heuristics, or enhanced-context
  analysis.
- `contextPreparationService` and `providerGenerationService` stay downstream;
  they consume the chosen intent instead of deciding it.

## Covered Decision Paths

The focused Jest slice pins a few high-value invariants:

- simple greeting/privacy/product phrases still resolve to deterministic local
  heuristic intents
- persisted message rows still become safe legacy memory objects without empty
  entries
- the routing order remains `legacy quick -> local heuristic -> legacy enhanced`
  so the Core path does not silently drift
