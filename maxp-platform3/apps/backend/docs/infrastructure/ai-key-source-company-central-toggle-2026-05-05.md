# AI Key Source Toggle: Company vs Central

Date: 2026-05-05

## Summary

Companies can now choose whether automated AI replies use their own active AI keys first or use the platform central keys only.

## User Surface

- Location: `/ai-management`
- Tab: `مفاتيح Gemini`
- Control: `مصدر مفاتيح الرد الآلي`
- Options:
  - `مفتاح الشركة ثم المركزي`
  - `المركزي فقط`

## Backend Behavior

- The selection is stored on `Company.useCentralKeys`.
- `false` keeps the existing behavior: active company keys are preferred, with central keys used only when no active company key exists.
- `true` makes the runtime choose central keys only and skip company keys, even if company keys are active.
- `/api/v1/settings/ai` now returns `useCentralKeys` and `aiKeySource`.
- `/api/v1/settings/ai` accepts `useCentralKeys` as a boolean update.

## Runtime Path

`backend/services/aiAgent/modelManager.js` now checks the company key source before the simple reactive key rotation path. This protects Facebook, WhatsApp, comment replies, and any other flow using `CoreAIAgent` key selection.

## Follow-Up: Active Provider Priority

The central key pool can contain keys for multiple providers. When global Smart Failover is enabled, the runtime now tries keys for the active provider first and uses other central providers only as failover after the active provider has no available key. This keeps a central OpenRouter configuration on OpenRouter free models before falling back to Google, OpenAI, or other configured providers.

## Follow-Up: Central Key Readiness in Company AI Settings

- `/api/v1/settings/ai` now also returns `centralAiStatus`.
- `centralAiStatus` exposes:
  - whether any active central AI key exists
  - the active provider selected by the super admin global config
  - whether that active provider currently has a matching central key
  - whether Smart Failover is enabled
  - the count of active central keys
- `/ai-management` now shows this readiness state directly under `مصدر مفاتيح الرد الآلي`.
- When a company selects `المركزي فقط`, the UI now explains that replies, order creation, and AI command approvals will use the super admin central key path.
- Super admins also now see clearer wording in `/super-admin/ai-providers` that this page is the source of the central AI API keys, not only a provider switch.

## Verification

Focused regression coverage was added in:

- `backend/tests/services/modelManagerKeySource.test.js`
