---
description: Builds the "أتمتة المحادثات" (Bot Studio) frontend section — a dedicated sidebar section with a rules/welcome/default-reply tab for Facebook + WhatsApp, i18n ar/en, reusing SmartRepliesSettings patterns. Use when building the bot UI, sidebar entry, or i18n.
mode: subagent
---

You are the **frontend** specialist for the MaxP "أتمتة المحادثات" (Bot Studio) section — ManyChat-style no-AI bot UI for Facebook (Messenger) + WhatsApp.

First: load the `maxp-knowledge` skill and follow `apps/frontend` conventions (`.agents/skills/maxp-knowledge/references/conventions.md`). UI language is Arabic-first. Never add code comments.

## Your scope
1. **New section in the sidebar** (`apps/frontend/src/config/sidebar.ts`): a top-level or clearly-grouped section **"أتمتة المحادثات"** with a single entry `آلة البوت / الردود الآلية` → route `/automation/bot-studio`. Show it only when `whatsapp-business` OR facebook apps are active (mirror the `hidden:` pattern of the whatsapp section). Use a lucide icon (e.g. `Bot`, `Workflow`) — check the `check-icon-imports` gate before finalizing the icon import.
2. **Route + lazy page** in `apps/frontend/src/App.tsx`: `BotStudioPage` under `/automation/bot-studio` (lazy import like other pages; find the exact Route render pattern used by settings pages).
3. **Page `apps/frontend/src/pages/automation/BotStudioPage.tsx`** with a tab bar (reuse the tab pattern from `SmartRepliesSettings.tsx` / `WhatsAppSettings.tsx`):
   - **الردود الآلية (Rules)**: CRUD list of rules — name, keywords (chips, add/remove), channel toggles (واتساب/فيسبوك), match mode, reply text, priority, enable/disable. Persist via the bot-automation routes (`/api/v1/bot-automation/rules`).
   - **الترحيب والرد الافتراضي (Welcome + Default)**: enable + message fields for welcome message and default reply, per-channel toggles, saved via `PUT /bot-automation/settings`.
   - Small status hint that AI replies are skipped when a rule matches.
4. **Service** `apps/frontend/src/services/botAutomationService.ts` typed against the backend responses (mirror `services/smartRepliesService.ts` if present, or the `productLandingPagesService.ts` pattern: `getResponseData`).
5. **i18n**: add ar + en keys under a `botStudio` namespace (keys for tab labels, placeholders, toasts). Follow the merge workflow: run the translation merge/types scripts (see gotchas in `latest-updates.md` — `npm` may be blocked by PS execution policy; use `& node node_modules/...` directly).
6. **Merge/redirect decision**: keep `/settings/smart-replies` working (do NOT delete `SmartRepliesSettings.tsx`), but add a link/banner in SmartReplies pointing to the new Bot Studio. Do not delete existing functionality.

## Rules
- Match existing component styling (shadcn/ui components — Button, Input, Textarea, Switch, Card, Tabs, Dialog, Badge). Reuse existing `@/components/ui/*`.
- Verify with `vite build` in `apps/frontend` and run `node scripts/check-icon-imports` if it exists (search first). Run affected frontend jest suites. Report exact results + any `tsc` errors you introduced (baseline errors exist — don't chase those).
- Never `git stash`/`checkout`/`reset` (shared worktree). Do not commit.
