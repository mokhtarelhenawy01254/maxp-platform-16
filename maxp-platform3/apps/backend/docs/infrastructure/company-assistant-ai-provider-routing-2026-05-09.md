# Company Assistant AI Provider Routing - 2026-05-09

## Problem

Telegram Company Assistant conversations could show a safe fallback reply when the global AI provider was slow or unavailable. In production, the global default provider was NVIDIA, which is useful for some workloads but timed out for short assistant chat turns.

One observed Swan message, `انت اسمك ايه ؟`, also fell through to AI planning and then to the default dashboard heuristic after the provider timeout, so the assistant returned a site summary instead of an identity reply.

## Change

- Company Assistant now recognizes assistant-name questions such as `انت اسمك ايه؟` as identity conversations before tool planning.
- Deterministic identity fallbacks now use the configured channel assistant name, so a channel named `عباس` says `أنا عباس` instead of only `مساعد Swan`.
- Unknown messages no longer default to `get_dashboard_summary` when AI planning is unavailable. They return a short clarification fallback instead.
- `AIProviderFactory.getActiveProvider()` accepts routing options:
  - `preferredKeyId`
  - `preferredProvider`
  - `companyId`
- Company Assistant AI generation reads a dedicated global settings block exposed in `/super-admin/ai-providers`:

```json
{
  "companyAssistantGeneration": {
    "mode": "SPECIFIC_KEY",
    "aiKeyId": "..."
  }
}
```

Supported modes:

- `SYSTEM_DEFAULT`: use the active global provider/key rotation that is currently healthy.
- `SPECIFIC_PROVIDER`: force the assistant to start with one provider, such as `GROQ`, then use the fallback chain if that provider fails.
- `SPECIFIC_KEY`: force the assistant to start with one active key, then use the fallback chain if that key fails.

When the setting is reset to `SYSTEM_DEFAULT`, stale provider/key values are ignored. This prevents the assistant from accidentally sticking to an older provider after the operator chooses "use the working default".

Environment overrides are also supported for emergency routing:

- `COMPANY_ASSISTANT_AI_PROVIDER`
- `COMPANY_ASSISTANT_AI_KEY_ID`
- `COMPANY_ASSISTANT_AI_FALLBACK_PROVIDERS` (comma-separated, defaults to `GOOGLE,OPENROUTER`)

If the primary assistant provider returns a rate limit, timeout, or other provider error, the assistant now tries the fallback provider chain before returning the safe deterministic response.

NVIDIA is intentionally not in the default interactive assistant fallback chain because `openai/gpt-oss-120b` has shown intermittent production timeouts for short chat turns. Use NVIDIA for the assistant only by explicitly selecting it in `/super-admin/ai-providers` or by setting `COMPANY_ASSISTANT_AI_FALLBACK_PROVIDERS` to include it.

## Production Note

For Swan production testing, route Company Assistant text generation to the active GROQ key (`llama-3.3-70b-versatile`) instead of relying on the global NVIDIA default.
