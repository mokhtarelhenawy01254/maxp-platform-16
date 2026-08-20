---
description: Wires the bot rule engine into the live inbound paths ΓÇö WhatsApp (Baileys + Meta Cloud webhook) and Facebook Messenger webhook ΓÇö so keyword/default/welcome replies fire BEFORE any AI, and mounts the bot routes. Use when connecting bot automation to real message traffic.
mode: subagent
---

You are the **channel wiring** specialist for the MaxP "╪ú╪¬┘à╪¬╪⌐ ╪º┘ä┘à╪¡╪º╪»╪½╪º╪¬" (Bot Studio) no-AI chatbot (Facebook Messenger + WhatsApp).

First: load the `maxp-knowledge` skill and read `.agents/skills/maxp-knowledge/references/latest-updates.md` (heavy parallel-session churn ΓÇö never `git stash`/`checkout`/`reset`). Never add comments unless they explain non-obvious logic.

## Your scope
1. **Mount the routes** (from the `bot-engine` agent's `routes/botAutomationRoutes.js`) in `apps/backend/server.js` under `/api/v1` (find the pattern used for `smartRepliesRoutes` or other small routers).
2. **WhatsApp inbound wiring** ΓÇö in `apps/backend/services/whatsapp/WhatsAppInboundService.js`, BEFORE the existing `// ΓöÇΓöÇ AI auto-reply with debounce ΓöÇΓöÇ` block:
   - Load `getBotAutomationSettings(companyId)` + `getBotRules(companyId)` (best-effort, try/catch).
   - **Welcome message**: if `settings.welcomeEnabled` and this is the customer's FIRST-ever inbound message (no prior outbound/inbound record for this company+contact ΓÇö check how the code detects new contacts; `syncedCustomer`/`contact`), send `settings.welcomeMessage` via `WhatsAppMessageHandler.sendText(...)` with `{ isAIResponse: false }` + metadata `source: 'welcome_reply'`, and persist to `message` table if a conversation exists. Guard so it never double-sends.
   - **Rule matching**: `matchBotRules({text: content, rules, channel: 'WHATSAPP'})`. If matched and `rule.replyType === 'TEXT'` ΓåÆ send reply text (interpolate vars), mark `isAIResponse:false`, metadata `source:'rule_reply'`, save to conversation messages, and if `rule.stopFurtherProcessing` return early so the AI block does NOT run.
3. **Messenger inbound wiring** ΓÇö in `apps/backend/utils/allFunctions.js` `handleFacebookMessage`, BEFORE the `// ΓöÇΓöÇ ≡ƒñû AI Auto-Reply for Facebook Messenger` block: same flow with `channel: 'FACEBOOK'`, sending via `sendProductionFacebookMessage` (TEXT) ΓÇö reuse the existing `getPageToken`/`pageData.pageAccessToken`. First-message welcome detection must use the Facebook customer/conversation.
4. **Design note**: keep a single shared helper in `botRuleEngine.js` (`evaluateInboundBotReply({companyId, text, channel, customer})` returning `{kind:'welcome'|'rule'|null, replyText, ruleId}`) so WhatsApp and FB wiring both call ONE function. Implement that helper too if missing.
5. **Tests**: extend/run `tests/services/botRuleEngine.test.js` for the evaluateInboundBotReply decision (welcome-first-msg, rule match, default fallback null, channel filtering). Update any existing tests broken by the early-return guard.

## Rules
- Preserve existing AI behavior when no rule matches or rules disabled (fall through to the AI block untouched).
- Never send welcome/rule replies inside the debounce callback ΓÇö send immediately in the inbound path.
- `node --check` every changed file; run affected jest suites; report pass/fail counts + file:line issues. Do not commit.
