# AI Catalog Image Grounding Helper API - 2026-05-07

## Summary

Exposed a small set of already-existing helper functions from `services/aiAgent/catalogImageGroundingService.js` so future Core AI refactors can reuse and test the image-analysis support layer without touching `CoreAIAgent.js`.

## Newly Exposed Helper Methods

- `buildCatalogImageAnalysisPrompt()`
- `normalizeImageAnalysisPayload(parsed)`
- `buildLowCostImageHintAttempts(sourceAttempts)`

These join the helper methods that were already exposed on the service, including:

- `parseJsonObjectFromText(text)`
- `normalizeImageAnalysisTerms(values)`
- `compareImageAnalyses(referenceAnalysis, candidateAnalysis)`
- `buildImageAnalysisSearchPhrases(imageAnalysis)`
- `scoreCatalogProductForImageAnalysis(product, imageAnalysis)`

## Why This Matters

- Keeps the image-analysis prompt, payload normalization, and low-cost Gemini hint-attempt construction testable from one isolated support surface.
- Lets the runtime-hardening work continue by moving helper validation into `catalogImageGroundingService` tests before any later Core extraction/integration step.
- Preserves the current runtime behavior because no `CoreAIAgent.js` code path was edited in this pass.

## Verification

- Ran focused helper Jest coverage for the newly exposed API.
- Re-ran the existing `catalogImageGroundingService` focused suite to make sure the expanded helper surface did not change current matching behavior.
