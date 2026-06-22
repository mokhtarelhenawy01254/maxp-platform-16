# Project Context

## General
- **Project**: maxp-platform
- **Type**: Full-stack web application with AI agent capabilities
- **Repo**: https://github.com/mokhtar1983/maxp-platform-1 (نُقل من elhenawym124-ops/maxp-platform)

## Tech Stack
- Backend: Node.js/Express, Prisma ORM, PostgreSQL
- Frontend: React (likely with TypeScript)
- AI: Agent system with admin endpoints, agent profiles

## Key Domains
- Marketplace (سوق) with validator, controller
- Competitor reports, competitor settings
- Admin dashboard (agent profiles, diagnostic chat, app explanations)
- Arabic/English bilingual support
- Authentication with token-based middleware

## Recent Work (from git log)
- Marketplace: validator, controller, Prisma field whitelisting, null-safe schemas
- Competitor: business fields, reports, settings UI
- Admin: /admin/test endpoint, /admin/agent-profiles page, app-explanations routes
- Translations: Arabic/English sidebar labels (gapAnalysis, competitorReports, competitorSettings)
- Fixes: 400 errors, 403 errors, merge conflict resolutions
- Unified Inbox: Redesigned search and filter UI with unread, pending, and platform dropdown controls, and updated backend controller to support multi-platform queries.

## 2026-06-22 WhatsApp AI Agent Routing
- WhatsApp customer auto-replies can use a company-assigned Python ai-service agent from `ai.agents`.
- For agent `agent_rKLv5iSNfkm-ukRfieKUWg`, model routing must preserve `config.provider=DEEPSEEK` and `config.keyId=cmqguj2zc08akjugf77y348pl`.
- DeepSeek structured JSON calls must use `response_format: {"type":"json_object"}`. Sending OpenAI `json_schema` makes the classifier fail over to Gemini before final reply generation.

## 2026-06-23 Meta Cloud WhatsApp Auto-Reply
- AI Hub auto-reply settings live in `ai.ai_settings`; legacy backend Prisma `AiSetting` maps to `public.ai_settings`.
- Customer-channel runtime gates must use `services/aiSettingsResolver.js`, which prefers `ai.ai_settings` and falls back to `public.ai_settings`.
- Meta App callbacks may post WhatsApp Cloud payloads to `/api/v1/webhook`; `webhookController` must forward `object="whatsapp_business_account"` to `whatsappMetaWebhookController`.
- Harf Online WhatsApp Cloud session: company `cmqpayohr2pwqju47cqz9l9li`, active session `cmqppump800c8julajuvawupw`, phone number id `1165821659950962`, display `+20 10 33316739`, WABA `1306119191241535`, agent `agent_k8fD5T6GiIuExPcKKvGlrQ`.
- Active Meta sessions can have `metadata = null`; deleted-session filters must explicitly allow null metadata and only reject `metadata.isDeleted=true`.
- Harf's Meta app is `Harfcrm` (`1688924222334388`). It needs an app-level subscription for `whatsapp_business_account/messages` pointing to `https://maxp.online/api/v1/whatsapp-meta`; WABA subscription alone is not enough for inbound delivery.
