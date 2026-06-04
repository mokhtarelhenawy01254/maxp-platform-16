# OpenRouter AI Provider

## Summary

OpenRouter is now supported as a central AI provider in the super-admin AI providers screen.

## Implementation

- Prisma provider enums include `OPENROUTER`.
- `OpenRouterProvider` uses OpenRouter's OpenAI-compatible chat completions API.
- Default base URL: `https://openrouter.ai/api/v1`.
- Default model: `openrouter/auto`.
- The super-admin provider dropdowns and add-key dialog include OpenRouter.
- The super-admin screen can fetch OpenRouter models from `/api/v1/super-admin/ai/openrouter/models`.
- The active model dropdown merges stored key models with the fetched OpenRouter model list.
- The stored central key is named `OpenRouter Central`; the API key is intentionally not documented here.

## Local Verification

- Prisma schema validation passed.
- Prisma client regenerated after stopping the local backend process that was locking the generated query engine DLL.
- Local enum values were applied directly with `prisma db execute` because this local database has many older unapplied migrations.
- Direct OpenRouter smoke test succeeded with `openrouter/auto`, returning `OK`.
- Stored DB key smoke test succeeded through `OpenRouterProvider`, returning `OK`.
- Browser smoke on `http://localhost:3000/super-admin/ai-providers` confirmed:
  - `OpenRouter Central` appears in the API keys table.
  - OpenRouter appears in the active provider dropdown.
  - The OpenRouter active model dropdown includes `openrouter/auto` plus fetched OpenRouter model ids.

## Notes

Repo-wide frontend `npm run type-check` still fails because of pre-existing TypeScript debt outside this change. The OpenRouter page loaded in Vite and browser verification did not show OpenRouter-specific runtime errors.
