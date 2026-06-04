# Test Chat CoreAIAgent Default - 2026-05-02

## What changed

- `/test-chat` now starts with `CoreAIAgent` selected in the UI.
- `testChatService.sendMessage` now sends `agentMode: "core"` by default for JSON requests.
- `testChatService.sendMessage` also sends `agentMode: "core"` by default for image/FormData requests.
- `testChatService.runQuickTest` now defaults to `agentMode: "core"`.
- `/test-chat` now treats the non-Core selector as legacy-compatibility metadata only. The controller records `requestedAgentMode` vs `normalizedAgentMode`, but execution still normalizes to Core.

## Central API behavior

Core still checks for a direct Gemini/Google key first. If that key is missing or Gemini fails, Core calls the configured-provider path through `aiAgentService.generateAIResponse`, which uses `modelManager.getNextKeySimple(companyId)`.

In the current local `maxp` database snapshot:

- active company-owned AI keys: `0`
- active central OpenRouter keys: `6`
- active provider selected by DB: `OPENROUTER`

So `/test-chat` in Core mode currently uses the Super Admin central OpenRouter keys as the provider fallback.

## Verification

- `node --check backend/controller/testChatController.js` passed.
- `node --check backend/services/CoreAIAgent.js` passed after the Core scenario fixes.
- `git diff --check` passed for the touched test-chat files.
- Local backend was restarted on `http://localhost:3008`.
- `GET http://localhost:3008/api/v1/health` returned `200`.
- Direct Core smoke test against the `maxp` company:
  - prompt: `What is the price of Running Sneakers?`
  - `agentMode`: `CORE`
  - `provider`: `OPENROUTER`
  - `model`: `CoreAIAgent + openai/gpt-oss-20b:free`
  - `fallbackSource`: `configured_provider`
  - `keyName`: `OpenRouter Central 6`
  - response included the grounded catalog price: `89.99 جنيه`

## Non-blocking notes

- Full frontend `type-check` did not finish within the 120 second tool timeout and printed no TypeScript errors before timing out.
- Targeted frontend ESLint ran, but `AITestChat.tsx` still has pre-existing `@typescript-eslint/no-explicit-any` violations and a few unescaped quote warnings. The Core default changes were still verified statically and by backend smoke test.
- Final Core scenario matrix:
  - report: `artifacts/ai-chat-scenario-run-2026-05-01T23-22-12-011Z.md`
  - JSONL: `artifacts/ai-chat-scenario-run-2026-05-01T23-22-12-011Z.jsonl`
  - result: `14 pass / 0 review / 0 fail`
- Local Redis is still version `3.2.100`, while BullMQ expects Redis `>=5.0.0`; the API health check and Core smoke test still passed.
