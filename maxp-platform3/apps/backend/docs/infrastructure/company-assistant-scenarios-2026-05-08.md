# Company Assistant Scenario Runner - 2026-05-08

## Purpose

The Company Assistant now has a repeatable UAT runner for the Telegram/WhatsApp assistant work. The runner turns the manual Swan checks into scenarios that can be re-run after deploys or prompt/skill changes.

## Command

From `backend/`:

```bash
npm run test:company-assistant:scenarios
```

Useful environment variables:

- `COMPANY_ASSISTANT_SCENARIO_COMPANY_SLUG=swan` chooses the company under test.
- `COMPANY_ASSISTANT_SCENARIO_TELEGRAM_CHAT_ID=8707909368` chooses the Telegram userbot dialog to inspect.
- `COMPANY_ASSISTANT_SCENARIO_LIVE_TELEGRAM_SEND=1` enables the live Telegram send-and-recall scenario. Without it, the userbot scenario only verifies dialog metadata such as `inputPeer` and `accessHash`.
- `COMPANY_ASSISTANT_SCENARIO_KEEP_DB_LOGS=1` keeps temporary assistant channels/logs for debugging. The default cleans temporary scenario data after the run.
- `COMPANY_ASSISTANT_AI_TIMEOUT_MS=12000` controls the assistant's internal AI provider timeout. If the provider is slow, the agent falls back to deterministic planning/replies instead of keeping Telegram or WhatsApp waiting for the provider's 30s timeout.

## Coverage

The runner creates temporary Company Assistant channels and tests:

- conversational identity replies
- dashboard summary tool use
- low-stock/inventory answers
- clarification for broad product requests
- task creation denial when `tasks:write` is missing
- task creation denial when `task_manager` is disabled
- confirmation flow when task creation is allowed
- name memory write and recall
- prompt/API-key leak refusal
- WhatsApp identifier normalization through the channel router
- Telegram userbot dialog metadata, including `inputPeer` and `accessHash`

## Runtime Guard Added

The first production scenario run showed that an AI planner response could classify a clear write request, such as creating a task, as a conversational clarification. The runtime now enforces the deterministic write-tool heuristic whenever the detected tool requires confirmation or has non-read risk. That keeps permission checks and confirmation tokens in control even when the model tries to answer conversationally.

The production timeout run also showed two prompts that must not depend on model planning: preferred-name memory and internal secret disclosure. The runtime now handles explicit memory declarations/recall before tool planning, and refuses API key or internal prompt requests before any dashboard fallback can run.

Broad product-list requests are also handled as deterministic clarification. A message like "هات المنتجات" now asks whether the operator wants every product or a specific product/category instead of dumping an arbitrary product list.

Identity replies keep channel context even when the AI writes the conversational phrasing. If the model omits Telegram/WhatsApp or company context, the runtime uses the deterministic identity fallback.

## Artifacts

Every run writes:

- `artifacts/company-assistant-scenarios/company-assistant-scenarios-<run-id>.json`
- `artifacts/company-assistant-scenarios/company-assistant-scenarios-<run-id>.md`

The markdown artifact is intended for quick human review; the JSON artifact is for automation and regression comparison.

The runner also disconnects any GramJS Telegram userbot clients it opened during the metadata/live-send check. This prevents a successful scenario run from staying alive until an external `timeout` kills the Node process.

The assistant also passes `COMPANY_ASSISTANT_AI_TIMEOUT_MS` down to OpenAI-compatible providers such as NVIDIA/OpenRouter and races unsupported providers with the same limit. This keeps scenario failures focused on product behavior instead of intermittent provider stalls.

## Production Notes

On production, PM2 currently runs `maxp-backend` with `PORT=3008`. The old `.env` still contains `PORT=3007`, so scenario runs should prefer PM2/runtime behavior or pass the correct API base when route-level checks are added later.
