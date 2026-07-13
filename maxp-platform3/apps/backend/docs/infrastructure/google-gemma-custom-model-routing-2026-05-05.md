# Google/Gemma Custom Model Routing

## Context

Super admins can type a custom Google-hosted model id on `/super-admin/ai-providers`, but Gemma model ids such as `gemma-4-31b-it` were not always respected by the Core AI text path.

Google documents Gemma 4 hosted access through the Gemini API with these model ids:

- `gemma-4-31b-it`
- `gemma-4-26b-a4b-it`

Google's Gemini model guide also lists the current Gemini API ids, including `gemini-3-pro-preview`, `gemini-3-flash-preview`, `gemini-2.5-flash`, `gemini-2.5-pro`, `gemini-2.5-flash-lite`, `gemini-2.0-flash`, and `gemini-2.0-flash-lite`.

## Root Cause

`CoreAIAgent.getGeminiTextModelCandidates()` only accepted preferred models that started with `gemini-`.

That meant a configured Google key model of `gemma-4-31b-it` was ignored, then the text path fell back to the default Gemini candidates such as `gemini-2.5-flash`.

## Changes

- Allowed Google-hosted preferred text models that start with either `gemini-` or `gemma-`.
- Added Gemma 4 ids and missing current Gemini ids to the Google model options in `SuperAdminAIProviders`.
- Made the active-model table autocomplete commit typed custom ids on Enter or blur, not only when selecting an existing option.
- Trimmed manually submitted model names before saving.
- Touched `global_ai_configs.updatedAt` after changing a key's active model so other backend processes clear routing/model caches.
- Updated routing selection to prefer the enabled priority-1 model config explicitly.
- Recorded successful Core direct-Google replies into routing telemetry so the UI can show the model that actually worked.

## Verification

- `node --check controller/superAdminAiController.js controller/aiController.js services/aiAgent/modelManager.js services/CoreAIAgent.js`
- `npm test -- --runTestsByPath tests/controller/superAdminAiController.groqKey.test.js tests/services/modelManager.groqProviderDefaults.test.js tests/services/CoreAIAgent.googleHostedModels.test.js --runInBand`
- `npx eslint src/pages/SuperAdminAIProviders.tsx --max-warnings=0`

## References

- https://ai.google.dev/gemma/docs/core/gemma_on_gemini_api
- https://ai.google.dev/gemini-api/docs/models
