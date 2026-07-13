# AI Context Preparation Service - 2026-05-07

## Scope

This note documents the extraction of the top-level `prepareContextBag(...)`
orchestration seam out of `CoreAIAgent.js` into:

- `backend/services/aiAgent/contextPreparationService.js`

Focused contract coverage for this seam lives in:

- `backend/tests/services/contextPreparationService.test.js`

## Service Surface

The extracted service currently exposes one main contract:

- `prepareContextBag({ conversationId, companyId, pageId, content, messageType, attachments, customerName })`

`CoreAIAgent.prepareContextBag(...)` now delegates to that service and keeps the
same outward API for all current callers.

## What The Service Owns

The new service now owns the high-level context-building flow that used to sit
inline inside `CoreAIAgent`, including:

- recent-message bootstrap and Gemini-compatible `memory` shaping
- prior-assistant detection and summary lookup
- top-level persona/intent prompt shaping
- recovered customer-image context for text follow-ups
- product/catalog/post/vector grounding orchestration
- variant/image recommendation shaping
- shipping/policy enrichment handoff through `prepareContextEnrichmentService`
- applied-learning / few-shot prompt augmentation
- final context-bag assembly

## Boundary With Neighboring Services

- `prepareContextEnrichmentService` still owns the shipping/policy enrichment
  sub-pass for grounded text runs.
- `catalogRetrievalService`, `productGroundingService`,
  `catalogImageGroundingService`, and `catalogVariantService` still own their
  respective lower-level catalog/grounding helpers.
- `contextPreparationService` now owns the top-level orchestration that chooses
  when those helpers run and how their outputs are merged into one bag.

## Covered Decision Paths

The focused Jest slice pins a few high-value invariants:

- first-greeting requests still produce the “opening greeting” persona without
  requiring database state
- recent messages still bootstrap `memory` while stripping any leading model
  entry before Gemini history is used
- enrichment results, applied-learning corrections, few-shot prompt text, and
  recovered image context still flow through to the final bag envelope
