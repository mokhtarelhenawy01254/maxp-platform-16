# Facebook Messenger Attachment Auto-Reply - 2026-05-25

## Context

Live Swan-store Messenger tests showed that customer image messages and other Messenger attachments were saved, but did not trigger the Facebook AI auto-reply path. The webhook handler only called `aiMessageProcessor.processMessage` when `messageType === 'TEXT'`.

## Change

- `backend/utils/allFunctions.js` now builds an AI-safe customer content payload from Messenger text plus attachment summaries.
- Facebook AI auto-reply now triggers when a customer sends valid text or Messenger attachments.
- Attachment-only messages are passed to the Facebook sales/support agent with instructions to ask for a short description or hand off safely if image understanding is unavailable.
- Text-only webhook events that clearly reference a customer image wait for the attachment event, avoiding duplicate AI replies when Messenger delivers a caption and image as separate events.
- `backend/services/aiAgent/agentReplyNormalizer.js` now replaces leaked customer-facing tool-permission questions such as "هل يمكنني استخدام أداة..." with a safe natural reply.
- The normalizer also strips leaked internal tool execution statements such as "سأستخدم أداة إنشاء مسودة الطلب..." while preserving the useful customer-facing order context when possible.
- `backend/services/aiAgent/CEOAgent.js` now lets deterministic write repair parse a richer execution message, so Messenger order drafts can use grounded product price context from prior/RAG turns while still gating intent on the current customer message.
- When a Messenger order has product/customer details but no price in context, the runtime now performs a deterministic `product.search` price lookup before creating an approval-required `order.create_draft`.
- The price lookup/order-draft repair path now clears the temporary `productPrice` missing-slot block for its internal lookup, so `product.search` can fill the missing price instead of being rejected by the intent gateway.
- Successful order draft repair now returns a deterministic customer-facing reply from the `order.create_draft` result, so Messenger does not go silent if the post-tool model call is unavailable.
- `backend/services/aiAgent/agentIntentPlannerService.js` now recognizes conversational Messenger order slots such as "اسمي", "رقمي", "مقاس", and contextual price phrases before allowing `order.create_draft`.
- `backend/tests/services/facebookAiAutoReply.test.js` now protects this behavior.
- `backend/tests/services/agentReplyNormalizer.test.js` protects reply normalization against internal tool wording leaks.
- `backend/tests/services/agentNativeTooling.test.js` protects the Facebook order draft path from conversational customer details, grounded price context, price lookup repair, and deterministic missing-price replies.

## Verification

- `node --check utils/allFunctions.js`
- `node --check services/aiAgent/agentReplyNormalizer.js`
- `node --check services/aiAgent/CEOAgent.js`
- `node --check services/aiAgent/agentIntentPlannerService.js`
- `npx jest tests/services/facebookAiAutoReply.test.js --runInBand --testTimeout=30000`
- `npx jest tests/services/agentReplyNormalizer.test.js --runInBand --testTimeout=30000`
- `npx jest tests/services/agentNativeTooling.test.js --runInBand --testTimeout=30000`
