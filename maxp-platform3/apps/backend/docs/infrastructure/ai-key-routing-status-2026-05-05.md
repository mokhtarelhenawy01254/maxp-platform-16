# AI key routing status - 2026-05-05

## Problem

When a provider has more than one active key, `/super-admin/ai-providers` only showed whether each key was enabled and which model had priority. It did not show which key the runtime actually selected recently, so admins had to inspect PM2 logs for `SIMPLE-KEY Selected` lines.

## Fix

- `ModelManager.getNextKeySimple` now records the selected key, model, provider, pool (`primary` or `failover`), company id, and timestamp in the key's existing `usage.routing` JSON.
- `ResponseGenerator.generateAIResponse` now records `lastSucceeded*` routing fields only after a provider returns a valid response, so admins can distinguish a key that was merely selected from a key that actually worked.
- `GET /api/v1/super-admin/ai/keys` now returns a parsed `routingStatus` object for each key.
- Added `POST /api/v1/super-admin/ai/routing-preview` to preview the current route without calling external AI providers or exposing API keys.
- `/super-admin/ai-providers` now shows a Routing column with `Last worked`, `Worked before`, `Selected before`, or `Not used yet`, plus the relevant model and pool.
- Added a `Check Routing` button that highlights the key that would be selected by the current routing settings.

## Notes

The routing preview is a dry run. It checks the same active provider, key source, failover, and cooldown state, but does not call Google, OpenRouter, Groq, or any other provider. The persisted `Last worked` badge updates only after a valid AI response is produced; `Selected before` can appear when a key was chosen but no successful response has been recorded yet.
