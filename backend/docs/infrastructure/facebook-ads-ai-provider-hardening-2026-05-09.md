# Facebook Ads AI Provider Hardening - 2026-05-09

## Context

Production Facebook Ads AI generation now accepts operator instructions, but the generation path still depends on the selected AI provider returning strict JSON. The global default provider can be optimized for chat yet still be unreliable for structured campaign drafts.

Observed production behavior:

- `SYSTEM_DEFAULT` routed Facebook Ads drafts through the global provider.
- NVIDIA sometimes produced usable drafts and sometimes returned malformed JSON.
- OpenRouter free-model routing hit daily limits and is not a safe production default.
- Older Gemini defaults in RAG and multimodal paths produced recurrent 404s.

## Changes

- Facebook Ads draft generation now retries malformed AI JSON through a dedicated repair prompt before falling back to local safe drafts.
- Before spending another AI call on repair, Facebook Ads draft parsing now uses `jsonrepair` to fix common provider JSON syntax issues such as missing commas, unquoted keys, and trailing commas locally.
- The Facebook Ads prompt explicitly requires JSON that is valid for `JSON.parse`.
- RAG, multimodal, image studio, return analysis, and Google provider defaults now use current stable Gemini text defaults (`gemini-2.5-flash`) instead of retired 1.5/pro fallbacks.
- Gemini embedding defaults now use `gemini-embedding-001`.
- Gemini candidate lists filter retired 1.5/pro model names even if they are present in legacy environment variables.
- Direct Gemini callers normalize retired env/DB model names before creating SDK models, so legacy `gemini-pro`, `gemini-1.5-*`, and `text-embedding-004` values do not keep producing provider 404s.
- Stored OpenRouter vision model value `openrouter/free` is normalized to `openrouter/auto` at runtime.
- Repaired AI JSON must still contain the requested number of usable campaigns with meaningful campaign name, primary text, headline, and description; otherwise the path falls back to safe local drafts.

## Operational Guidance

For production Facebook Ads AI generation, prefer a dedicated `facebookAdsGeneration.mode = SPECIFIC_KEY` with a provider/key that is known to return valid JSON consistently. Keep `SYSTEM_DEFAULT` available for normal chat/assistant use, but avoid using broad chat defaults for ad-draft JSON generation when provider behavior is unstable.

If draft generation falls back, check:

- `FacebookAdsAiDraftRun.usedFallback`
- `FacebookAdsAiDraftRun.fallbackReason`
- `FacebookAdsAiDraftRun.routing`
- backend logs tagged `FACEBOOK-ADS-AI`
