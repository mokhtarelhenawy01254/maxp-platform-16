# WhatsApp Agent Model Routing

## 2026-06-22

WhatsApp auto-replies can run through an agent whose stored `model` is outside
the default provider priority list. Older agents may also be missing
`config.provider` or `config.keyId`.

The AI service now falls through to every supported provider when resolving a
model-only route, so a stored model such as `deepseek-v4-flash` can still select
the active DeepSeek key instead of falling back to the default Google runtime.
The agent registry also restores `keyId`/`key_id` from persisted agent config
when present, preserving explicitly selected keys after service restarts.

The intent classifier uses structured JSON output before the final customer
reply is generated. DeepSeek's OpenAI-compatible API accepts JSON mode as
`response_format: {"type": "json_object"}` rather than OpenAI's
`json_schema` response format. The OpenAI-compatible provider adapter now keeps
`json_schema` for normal compatible providers and switches only DeepSeek
structured calls to `json_object`, preventing the classifier from failing over
to Gemini before the DeepSeek final reply.
