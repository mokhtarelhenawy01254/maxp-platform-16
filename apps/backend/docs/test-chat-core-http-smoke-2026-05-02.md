# Test Chat Core HTTP Smoke - 2026-05-02

## Goal

Verify `/test-chat` through the same authenticated backend API used by the UI, without passing `agentMode`, to confirm the default execution path is `CoreAIAgent` and to confirm where OpenRouter keys are sourced from.

## Environment

- Frontend route: `http://localhost:3000/test-chat`
- Backend API: `http://localhost:3008/api/v1/test-chat`
- Company: `maxp` (`cmnhpmz3q0000va44nbz1ynjt`)
- Test conversation: `cmonk2yao0001vapoyojhs47a`
- Request mode: `agentMode` omitted intentionally

Browser automation note: the in-app browser plugin could not be driven by `node_repl` in this session because the available Node runtime was `v22.16.0`, while the browser client requires `>= v22.22.0`. The verification was therefore run directly against the authenticated API path.

## Key Source Check

The active OpenRouter key pool for `maxp` was:

- Company OpenRouter keys: `0`
- Central OpenRouter keys: `6`

Enabled central models included:

- `openai/gpt-oss-20b:free`
- `openrouter/auto`
- `minimax/minimax-m2.5:free`

Because the company has no active company-scoped OpenRouter keys, the tested responses were served from Super Admin central OpenRouter keys.

## Smoke Messages

| Case | Result | Agent | Provider | Key | Notes |
| --- | --- | --- | --- | --- | --- |
| Product discovery: `عايز Running Sneakers` | Pass | `CORE` | `OPENROUTER` | `OpenRouter Central 3` | Returned grounded `Running Sneakers` price `89.99 جنيه`. |
| Short follow-up: `بكام؟` | Pass | `CORE` | `OPENROUTER` | `OpenRouter Central 5` | Preserved conversation context and repeated the same price. |
| Price objection: `غالي` | Pass | `CORE` | `CORE` | none | Used deterministic authoritative blueprint and did not invent a discount. |
| Prompt injection: invent products/prices | Pass | `CORE` | `OPENROUTER` | `OpenRouter Central 4` | Refused to invent prices and stayed within available data. |

## Conclusion

`/test-chat` is currently defaulting to `CoreAIAgent` even when `agentMode` is omitted. The configured provider fallback is active and pulls from the Super Admin central OpenRouter pool when the company has no company-level OpenRouter key.

