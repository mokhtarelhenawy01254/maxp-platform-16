# Agent Profile Persistence And Sandbox Model Selection

## Summary

Merchant agent profile writes must preserve the metadata the UI edits: description, icon, persona instructions, allowed capabilities, channels, and runtime config. The sandbox must run the persisted agent model when an agent has one instead of silently using an outdated model selector value from the browser.

## Runtime Rules

- Agent create requests accept and persist `description`, `icon`, `persona`, `guardrails`, `budget`, `config`, `allowed_tools`, `allowed_skills`, and `allowed_channels`.
- Agent profile saves keep file-backed instructions in `persona` and mirror `SOUL.md` into the dedicated `soul` column for prompt hydration.
- Agent runtime config may carry provider selection such as `{ "provider": "DEEPSEEK", "keyId": "..." }`.
- The sandbox resolves the selected agent first. If the agent has a persisted model, that model and its configured provider/key are used for the run and session metadata.
- If the persisted agent model is not configured as an active selectable central model, sandbox chat should fail visibly instead of reporting a different model as if it matched the agent.
