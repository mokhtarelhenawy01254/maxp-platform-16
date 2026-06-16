# DeepSeek V4 Provider Support

## Summary

Updated the DeepSeek provider configuration across frontend and backend to support the new **DeepSeek V4** model family (`deepseek-v4-flash`, `deepseek-v4-pro`), replacing the deprecated `deepseek-chat` model.

## Changes

### Frontend (`SuperAdminAIProviders.tsx`)
- Added `DEEPSEEK` to `DEFAULT_BASE_URLS`: `https://api.deepseek.com`
- Added `DEEPSEEK` to `DEFAULT_MODELS`: `deepseek-v4-flash`
- Added `DEEPSEEK_MODELS` static list (`deepseek-v4-flash`, `deepseek-v4-pro`) to `STATIC_PROVIDER_MODELS`
- Added model **Select dropdown** in Add Key dialog for DEEPSEEK provider

### Backend (`superAdminAiController.js`)
- Updated default model from `deepseek-chat` → `deepseek-v4-flash`
- Added `DEEPSEEK` to `DEFAULT_PROVIDER_BASE_URLS`

### Backend (`modelCosts.js`)
- Added `deepseek-v4-flash`: $0.14/$0.28 per 1M tokens
- Added `deepseek-v4-pro`: $0.435/$0.87 per 1M tokens

### Backend (`aiSandboxController.js`)
- Added labels for `deepseek-v4-flash` ("DeepSeek V4 Flash") and `deepseek-v4-pro` ("DeepSeek V4 Pro")
- Updated `deepseek-chat` label to indicate deprecation

## Deprecation Notice

`deepseek-chat` and `deepseek-reasoner` will be deprecated on **2026/07/24**. They currently alias to `deepseek-v4-flash` (non-thinking and thinking modes respectively).
