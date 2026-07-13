# Groq AI Provider Key Support - 2026-05-05

## Problem

Super Admin allowed selecting `GROQ` in the AI key dialog, but the backend database enums did not include `GROQ`. Creating a key reached Prisma with an unsupported enum value and returned a generic 500 response from `/api/v1/super-admin/ai/keys`.

The UI also did not prefill Groq's OpenAI-compatible base URL or a default Groq model, so a saved key could be missing the model metadata that `ModelManager` expects for provider-first routing.

## Fix

- Added `GROQ` to the Prisma provider enums and created a migration that updates the PostgreSQL enum types.
- Added backend validation for provider names so unsupported providers return HTTP 400 instead of leaking as a generic 500.
- Added safe defaults for Groq:
  - Base URL: `https://api.groq.com/openai/v1`
  - Model: `llama-3.3-70b-versatile`
- Updated Super Admin AI Providers UI to prefill Groq base URL and model values.
- Updated `ModelManager` fallback defaults so central Groq keys still route correctly if no model config row exists.

## Operations

Deploy the Prisma migration before adding Groq keys in an environment:

```bash
cd backend
npx prisma migrate deploy --schema=prisma/schema
```

If a provider key was pasted into chat, browser logs, screenshots, or tickets, rotate it in the provider dashboard before using the saved key in production.
