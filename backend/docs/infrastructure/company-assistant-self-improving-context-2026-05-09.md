# Company Assistant Self-Improving Context - 2026-05-09

## Problem

The Company Assistant could remember explicit facts and recent turns, but it still behaved like a short-context bot: old conversation context was only available as recent snippets, operators had no clean "new conversation" boundary, and corrections or rule changes were not tracked as a governed learning workflow.

## Change

- Runtime memory now supports automatic context compaction using `CONVERSATION_SUMMARY` memories after a conversation exceeds the recent-turn threshold.
- Operators can start a fresh context from chat commands like `افتح محادثة جديدة` or from the admin UI. This writes a `SESSION_BOUNDARY` memory instead of deleting durable facts.
- A `self_improving` skill is available in the channel skill registry. It records corrections as `CORRECTION` memories.
- Rule/name/style changes are saved as `RULE_PROPOSAL` memories and require admin approval before changing channel metadata.
- The admin Company Assistant page now has a `التطوير` tab for conversation summaries, corrections, proposal review, and opening a new conversation.
- New admin endpoints expose self-improvement state, reset conversation context, and approve/reject rule proposals.
- Telegram Bot integrations now publish an assistant command menu with `/newchat`, `/summary`, `/lowstock`, `/tasks`, and `/help`.
- Authorized Telegram assistant replies include a persistent quick keyboard with `محادثة جديدة`, `ملخص الموقع`, `المنتجات منخفضة المخزون`, and `مساعدة`.

## Safety

- The assistant does not edit production code, permissions, secrets, or its channel metadata by itself.
- Proposed behavior changes only apply after a manager/admin approves them.
- Conversation reset does not delete durable memories such as names, company rules, or admin-saved facts.
- Secret-like content remains filtered before being stored in durable memory or summarized context.

## Verification

- `npm test -- companyAssistantMemory.test.js companyAssistantAgent.permissions.test.js companyAssistantScenarios.test.js`
- `npm run build` in `frontend`
- `npm run type-check -- --pretty false` was also run; it still reports existing unrelated project-wide TypeScript debt, but no `CompanyAssistant` files are reported after filtering.
- `node -c services/companyAssistant/CompanyAssistantMemory.js`
- `node -c services/companyAssistant/CompanyAssistantAgent.js`
- `node -c services/companyAssistant/CompanyAssistantTelegramMenu.js`
- `node -c controller/companyAssistantController.js`
