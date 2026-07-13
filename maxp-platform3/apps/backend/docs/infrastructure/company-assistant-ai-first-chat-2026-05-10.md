# Company Assistant AI-first chat - 2026-05-10

## What changed

- Normal read-tool replies now fetch site data with the tool layer, then pass the result to the AI for the final user-facing wording.
- Safe heuristic routing still chooses obvious tools quickly, but the final reply source becomes `AI_TOOL` when the provider responds.
- If every AI provider fails or returns an invalid tool-style response, the assistant returns the deterministic fallback as `FALLBACK` with `providerIssue=true` and `usedTool=true`.
- AI response metadata now includes `providerName`, `model`, `route`, `configuredRoute`, `usedProviderFallback`, and sanitized failed-route summaries.
- Confirmed write actions also run their final tool result through the AI wording layer; deterministic text is only retained as fallback.
- Pending write confirmations keep their exact execution token and a complete preview. If the AI returns only the token or an incomplete confirmation line, the assistant falls back to the full safe preview and labels the source as `FALLBACK`.
- Tool-result AI wording is rejected when it becomes a generic greeting/help line with no grounding from the tool fallback. The user then gets the truthful fallback instead of a misleading `AI_TOOL` label.
- Production scenarios accept natural empty-state wording from the AI, such as "لا توجد مخازن مسجلة"، when the underlying tool returns no records.
- Provider fallback for Company Assistant defaults to NVIDIA, then OpenRouter, after the configured primary route. Google/Gemini is no longer a default assistant fallback because the free-tier limits are too low for chat scenarios; it can still be enabled explicitly with `COMPANY_ASSISTANT_AI_FALLBACK_PROVIDERS` or a specific provider/key setting.
- Telegram/WhatsApp `/newchat` session-boundary memories now appear in the web chat admin page as separate virtual conversations without changing the channel uniqueness model.
- `/company-assistant/chat` now separates website, Telegram, and WhatsApp conversations, shows AI/provider/tool truth chips, and renders system events as timeline markers instead of chat replies.

## Conversation split model

The database still stores one `CompanyAssistantChannel` row per external channel identity. A `/newchat` command writes a `SESSION_BOUNDARY` memory with the triggering command log id. The admin web-chat API converts those boundaries into virtual session ids:

```text
{channelId}__conversation__{boundaryId}
```

Message listing for a virtual session filters command logs between the selected boundary and the next newer boundary. The legacy pre-boundary segment remains available under the original channel id.

## Verification

- `npx jest tests/services/companyAssistantAgent.permissions.test.js tests/routes/companyAssistantRoutes.webChat.test.js tests/services/companyAssistantResponseSourceFormatter.test.js --runInBand --testTimeout=30000 --forceExit`
- `npx jest tests/scripts/companyAssistantScenarios.test.js --runInBand --testTimeout=30000 --forceExit`
- `npx jest tests/services/companyAssistantAgent.permissions.test.js tests/routes/companyAssistantRoutes.webChat.test.js tests/services/companyAssistantResponseSourceFormatter.test.js tests/scripts/companyAssistantScenarios.test.js --runInBand --testTimeout=30000 --forceExit`
- `npm run check:syntax`
- `npm run build` from `frontend/`

`npm run type-check` still fails on existing unrelated strict TypeScript issues across the frontend, mostly generic API response typing and old utility files. The Vite production build passes.
