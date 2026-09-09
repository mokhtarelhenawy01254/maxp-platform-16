# Smart Replies Inbound Runtime Execution & Instant Sync Fix (2026-09-09)

## Overview
Users reported that auto-reply templates configured on `/settings/smart-replies` were not replying to incoming customer messages, specifically for company `ahmedfares61994@gmail.com` (`Ameerelle`).

## Root Causes Identified
1. **Missing Runtime Execution Link**:
   - Templates configured on `/settings/smart-replies` were saved into `AiSetting.modelSettings.ruleResponses`.
   - However, inbound message handlers (`handleFacebookMessage`, `WhatsAppInboundService`, and `handleInstagramMessage`) exclusively called `botRuleEngine.evaluateInboundBotReply`.
   - `botRuleEngine.evaluateInboundBotReply` only inspected `BotAutomationSettings` and `BotAutomationRule`. If no bot automation settings existed (or no rules matched), it returned `{ kind: null }` without ever checking `AiSetting.modelSettings.ruleResponses`.
   - The subsequent AI auto-reply check saw `AiSetting.autoReplyEnabled: false` (since smart replies are keyword templates, not LLM replies), resulting in zero reply to the customer.

2. **Accidental Reversion of Validation in Prior Commit**:
   - In commit `b7648ecf6`, `validateSmartReplyTemplates` and the returned `data: parseRuleResponseSettings(updatedSetting)` in `apps/backend/routes/smartRepliesRoutes.js` were inadvertently dropped, causing PUT validation tests to fail.

3. **Missing Real-Time Socket Event & Conversation Update for Bot Replies**:
   - When a Facebook bot or smart reply was dispatched, the message record was created, but no `new_message` socket event was emitted and `conversation.lastMessagePreview` was not refreshed, leaving the web dashboard inbox un-updated in real-time until manual refresh.

## Changes Implemented
1. **Rule Engine (`apps/backend/services/botRuleEngine.js`)**:
   - Implemented `getSmartReplies(companyId)` to load templates from `AiSetting.modelSettings.ruleResponses` when `enableRuleResponses === true`.
   - Implemented `matchSmartReplyTemplates({ text, templates })` to match normalized customer text against template keywords with full Arabic language normalization (diacritics removal, alef/yaa/ta-marbuta unification).
   - Updated `matchesKeyword` to normalize both incoming text and keywords for exact and contains matching.
   - Updated `evaluateInboundBotReply` to evaluate smart reply templates if bot automation rules do not match or are not configured.
   - Tagged matching results with `kind: 'smart_reply'`, `ruleId`, `templateName`, and `matchedKeyword`.

2. **Facebook & Instagram Message Handlers (`apps/backend/utils/allFunctions.js`)**:
   - In `handleFacebookMessage`: Upon successful bot/smart reply delivery, saved message with `source: 'smart_reply'` (or `rule_reply`), emitted real-time Socket.IO `new_message` to `company_${companyId}`, and updated `conversation.lastMessagePreview`.
   - In `handleInstagramMessage`: Added step 5.5 to evaluate `evaluateInboundBotReply` and dispatch smart replies via `sendInstagramMessage` before AI auto-reply fallback.

3. **WhatsApp Handler (`apps/backend/services/whatsapp/WhatsAppInboundService.js`)**:
   - Added metadata tracking for `source: 'smart_reply'` alongside `templateName` and `matchedKeyword`.

4. **Routes (`apps/backend/routes/smartRepliesRoutes.js`)**:
   - Restored `validateSmartReplyTemplates` and normalized `data` return in `PUT /api/v1/smart-replies/rule-responses`.

5. **Regression Tests**:
   - Added unit tests in `apps/backend/tests/services/botRuleEngine.test.js` covering `matchSmartReplyTemplates`, Arabic keyword tolerance, preference for longer/specific keywords, and evaluation via `evaluateInboundBotReply`.
   - Verified that `apps/backend/tests/routes/smartRepliesRoutes.test.js` (6 tests) and `botRuleEngine.test.js` (24 tests) all pass.
