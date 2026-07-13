# Gemini provider model visibility fix - 2026-05-05

## Problem

On `/super-admin/ai-providers`, adding a `GOOGLE` / Gemini key did not expose a model selector in the add-key dialog. The table also only combined saved `aiModelConfigs` with fetched OpenRouter models, so older Google keys without a model config could render an empty active-model cell even though the runtime would fall back to a Gemini default.

## Root cause

- The frontend only rendered provider-specific model controls for Ollama, OpenRouter, and Groq.
- Google keys depended on the backend fallback model instead of a visible, editable `defaultModel` value in the UI.
- The frontend table did not include static Gemini model options for Google provider rows.
- The backend fallback still used `gemini-2.0-flash`, while Google now documents newer stable Gemini 2.5 text models and marks older 2.0 models as previous/deprecated on the model index.

References checked on 2026-05-05:

- https://ai.google.dev/gemini-api/docs/models
- https://ai.google.dev/gemini-api/docs/models/gemini-2.5-flash

## Fix

- Added a Gemini model autocomplete for `GOOGLE` provider keys in `SuperAdminAIProviders`.
- Defaulted new Google keys to `gemini-2.5-flash`.
- Added static Gemini options to the active-model table selector while keeping free-form typing for newer Google model ids.
- Displayed the provider fallback model for older keys that do not have `aiModelConfigs` yet.
- Aligned backend super-admin key creation and `ModelManager.getNextKeySimple` fallback to `gemini-2.5-flash`.
- Added focused regression coverage for Google provider keys without model configs.

## Expected behavior

When a super admin adds a Google Gemini key, the dialog now shows `Gemini Model` with `gemini-2.5-flash` selected by default. After saving, the table should show the active model and allow switching to another saved/static/manual Gemini model.
