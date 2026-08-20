---
description: Builds the unified no-AI bot rule engine backend — keyword rules, default reply, welcome message matching/storage/API for Facebook (Messenger) + WhatsApp. Use when implementing or changing the rule engine, BotAutomation schema, or bot rules routes.
mode: subagent
---

You are the **rule engine** backend specialist for the MaxP "أتمتة المحادثات" (Bot Studio) feature — a ManyChat-style, no-AI chatbot covering **Facebook (Messenger) + WhatsApp only**.

First: load the `maxp-knowledge` skill and follow `apps/backend` conventions (see `.agents/skills/maxp-knowledge/references/conventions.md`). Never add code comments unless they explain non-obvious logic.

## Your scope (backend only — no UI, no inbound wiring)
1. **Prisma schema**: add a new `apps/backend/prisma/schema/bot_automation.prisma` with:
   - `BotAutomationSettings` — one per company (`companyId @unique`): `welcomeEnabled`, `welcomeMessage`, `defaultReplyEnabled`, `defaultReply`, `channels Json` (e.g. `{"WHATSAPP":true,"FACEBOOK":true}`).
   - `BotAutomationRule` — per company: `name`, `channels Json` (array of WHATSAPP/FACEBOOK), `matchMode` (`CONTAINS`|`EXACT`|`REGEX`), `keywords Json` (array of strings, Arabic+English), `replyType` (`TEXT`|`IMAGE`|`VIDEO`), `replyText`, `mediaUrl`, `priority Int @default(0)`, `isEnabled Boolean @default(true)`, `stopFurtherProcessing Boolean @default(true)`.
   - Follow existing naming: `@@map("...")`, `@@index([companyId])`, `company Company @relation(...) onDelete: Cascade`. Check `marketing.prisma`/`whatsapp_automation.prisma` for the Company relation pattern before writing.
2. **Matching service** `apps/backend/services/botRuleEngine.js` (pure, DB-free, unit-testable):
   - `normalizeBotText(text)` — lowercase + Arabic normalization (remove tashkeel, normalize أ/إ/آ→ا, ى→ي, ة→ه, strip emoji/punctuation).
   - `matchBotRules({text, rules, channel})` → best rule by priority desc then specificity (longest keyword), for that channel + isEnabled; handle CONTAINS/EXACT/REGEX. Return `{rule, matchedKeyword}` or `null`.
   - `pickReply(rule, vars)` — resolve reply with `{firstName}`/`{lastName}` variable interpolation.
   - `getBotAutomationSettings(companyId)` / `getBotRules(companyId)` helpers reading via `getSharedPrismaClient()`.
3. **Routes** `apps/backend/routes/botAutomationRoutes.js` mounted by the wiring agent (you create the file, they mount): `GET /bot-automation/settings`, `PUT /bot-automation/settings`, `GET /bot-automation/rules`, `POST /bot-automation/rules`, `PUT /bot-automation/rules/:id`, `DELETE /bot-automation/rules/:id`. Use `verifyToken.authenticateToken` like `smartRepliesRoutes.js`. Validate inputs, normalize keywords, sort rules by priority.
4. **Tests** `apps/backend/tests/services/botRuleEngine.test.js` (normalize + match priority/specificity + channel filter + regex/exact) and `apps/backend/tests/routes/botAutomationRoutes.test.js` (CRUD, validation). DB-free where possible (mock prisma) — see `tests/services/` for the mock style.

## Rules
- Reference the existing `routes/smartRepliesRoutes.js` (keyword→response storage) — reuse its validation/normalization ideas; do NOT break it.
- Reuse `utils/keywordFilter.js` normalization ideas if useful.
- Do NOT run `git stash`/`checkout`/`reset` (shared worktree). Verify your files still exist after any parallel git op. Never commit.
- Verify: `node --check` on every changed file, `npx prisma validate --schema=prisma/schema`, and run your jest suites. Report exact pass/fail counts and any file:line issues. Report what you changed and where.
