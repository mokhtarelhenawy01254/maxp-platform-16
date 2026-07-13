# AI Provider Budget Ledger - 2026-05-20

## Source Idea
This pass adapts the useful FreeLLMAPI routing pattern into MaxP without copying its catalog or provider list. The borrowed idea is proactive provider/key/model budget awareness before sending a request, plus short penalty windows after provider rate-limit errors.

## Implementation Plan
1. Add a small ledger service beside the AI agent runtime.
2. Read optional provider limits from existing `AiKey.usage`, `AiModelConfig.usage`, or `AiKey.maxRequestsPerDay` instead of adding a migration.
3. Filter runtime key candidates before `SimpleKeyRotator` chooses a key.
4. Reserve estimated request/token usage immediately before a provider call.
5. Reconcile successful usage with actual token telemetry.
6. Record temporary budget penalties after 429/503 provider responses.
7. Keep provider priority, central/company key routing, and existing cooldown behavior intact.

## Supported Limit Shape
Limits can be stored under `limits`, `rateLimits`, `routingLimits`, `providerBudget`, `providerBudgetLimits`, `budgetLimits`, or `quota`.

Supported aliases:

- `rpm`: `rpm`, `requestsPerMinute`, `requests_per_minute`, `minuteRequests`
- `rpd`: `rpd`, `requestsPerDay`, `requests_per_day`, `dailyRequests`, `maxRequestsPerDay`
- `tpm`: `tpm`, `tokensPerMinute`, `tokens_per_minute`, `minuteTokens`
- `tpd`: `tpd`, `tokensPerDay`, `tokens_per_day`, `dailyTokens`

Example:

```json
{
  "limits": {
    "rpm": 30,
    "rpd": 1000,
    "tpm": 60000,
    "tpd": 500000
  }
}
```

## Runtime Behavior
`ModelManager.getNextKeySimple()` now accepts `estimatedTokens`. Before round-robin, each key is checked against the provider budget ledger for its `(provider, model, key)` identity. Over-budget keys are skipped and the next eligible key/provider is tried.

`ResponseGenerator.generateAIResponse()` passes its existing token estimate into key selection, records a budget attempt immediately before the provider call, and records actual token usage on success. Provider 429/503 responses still use the existing `SimpleKeyRotator` cooldown and also write a model/key budget penalty when limits are configured.

## Notes
The first implementation is intentionally conservative:

- No schema migration is required.
- No provider catalog is copied from FreeLLMAPI because provider availability changes frequently.
- The ledger uses Redis through the existing AI `stateManager` when available and falls back to process memory in local/test contexts.
- Budget checks are best-effort; strict multi-worker atomic enforcement can be added later if a provider starts receiving high concurrent volume.
