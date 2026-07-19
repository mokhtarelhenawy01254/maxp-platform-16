# NVIDIA NIM AI Provider Key Support - 2026-05-06

## Problem

Super Admin AI provider routing did not support NVIDIA NIM even though NVIDIA exposes an OpenAI-compatible chat completions API. The requested NVIDIA model endpoint uses:

- Provider: `NVIDIA`
- Base URL: `https://integrate.api.nvidia.com/v1`
- Chat endpoint: `/chat/completions`
- Default model: `openai/gpt-oss-120b`

## Fix

- Added `NVIDIA` to the supported provider list and default backend provider settings.
- Added `NvidiaProvider`, which calls NVIDIA NIM through the OpenAI-compatible chat completions format and returns the same response shape used by the existing provider factory.
- Added default `ModelManager` routing fallback for NVIDIA keys without saved model rows.
- Added Prisma enum schema entries and a PostgreSQL migration for:
  - `GlobalAiProvider`
  - `global_ai_configs_defaultProvider`
  - `ai_keys_provider`
- Updated `/super-admin/ai-providers` so admins can add NVIDIA keys with the default base URL and `openai/gpt-oss-120b` model.
- Added focused tests for key creation defaults, routing defaults, and the NVIDIA provider request shape.

## Operations

Deploy the Prisma migration before adding NVIDIA keys in an environment:

```bash
cd backend
npx prisma migrate deploy --schema=prisma/schema
npx prisma generate --schema=prisma/schema
```

Do not commit NVIDIA API keys. Add them through the Super Admin AI Providers screen or a secure production secret flow. If an `nvapi-...` key was pasted into chat, logs, screenshots, or tickets, rotate it in NVIDIA before using it in production.

## Local Verification

On 2026-05-06, local schema validation, focused backend Jest tests, and frontend ESLint for the Super Admin AI Providers page passed. The local database migration and Prisma client generation also completed successfully.

A live Super Admin key test was not run because the local database had no saved active `NVIDIA` key. Add the key through the Super Admin AI Providers screen, then use the existing "test key" action to exercise the real NVIDIA endpoint.
