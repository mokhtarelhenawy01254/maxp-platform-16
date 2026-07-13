# Learning Prompt Support Service

- Date: 2026-05-07
- Service: `backend/services/aiAgent/learningPromptSupportService.js`

## Purpose

Extract the remaining prompt-time learning helpers from `CoreAIAgent`:

- normalize stored approved learning corrections
- load applied corrections from `AiSetting.responseRules`
- build the applied-learning system prompt appendix
- build the few-shot prompt block from `fewShotService`

## Why this seam

`contextPreparationService`, `configuredProviderFallbackService`, and
`providerGenerationService` all depended on these helpers through `CoreAIAgent`.
Moving them behind a dedicated service keeps prompt augmentation logic together
and reduces Core-to-service coupling without touching delivery or runtime
orchestration.

## Wiring

- Constructed in `backend/services/aiAgent/coreAIAgentBootstrapService.js`
- Exposed on the Core instance as `learningPromptSupportService`
- `CoreAIAgent` keeps compatibility wrappers for the original helper names
- Bootstrap now injects the new service directly into context-preparation and
  provider-fallback/generation services

## Validation

- `backend/tests/services/learningPromptSupportService.test.js`
