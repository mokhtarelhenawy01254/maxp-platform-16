# Wofod Agent Message Quality Fixes - 2026-05-05

## Context

Recent Wofod Agent Inbox analysis found several reply-quality gaps after routing Core AI through the central OpenRouter provider:

- Facebook image messages sometimes arrived as a prior `IMAGE` event followed by a text placeholder like `[attachment]`, so Core AI missed the actual image URL.
- Generic price questions from post/ad conversations, such as `ما هي الأسعار؟`, did not reliably ground to the product attached to the source post.
- Largest-size questions could be answered with color options because broad variant intent handling mixed size and color paths.
- Price-comparison questions could drift into shipping/support fallback.
- Ungrounded provider replies could mention `0 جنيه`, which is unsafe when the catalog does not support that price.
- Shipping follow-ups after a complaint context could calculate the quote but still let the older support intent win the final reply.
- Configured provider fallback replies could leak internal prompt/reasoning text such as role, constraints, context data, draft reasoning, or "I must" analysis into the customer-facing Messenger reply.

## Changes

- Recover recent customer image URLs when the current Facebook text message is an attachment placeholder or a deictic follow-up like `بكام ده؟`.
- Pass recovered image URLs through the configured provider fallback so OpenRouter-compatible providers can receive multimodal message parts.
- Prefer source post and post catalog image grounding for generic Arabic plural price questions.
- Keep source-post lookup schema-safe by reading `postId` from conversation metadata instead of a non-existent `Conversation.postId` column.
- Treat `اكبر مقاس` as a size-only path and return the largest available size plus size options instead of colors.
- Add a deterministic price-comparison clarification path before shipping/price fallback.
- Block unsafe customer-facing `0 جنيه` replies when there is no grounded zero-price catalog evidence.
- Let resolved shipping quotes override a stale `support` intent when the current message is a governorate/location follow-up.
- Hardened the Core provider fallback prompt to explicitly forbid analysis, drafts, constraints, and reasoning text in the response.
- Added a customer-facing sanitizer guard that detects internal prompt/reasoning leaks before delivery, extracts the final clean Arabic answer when possible, or falls back to the authoritative Core blueprint.
- Added focused tests for provider reasoning leak extraction, authoritative fallback rejection, and draft-only leak fallback.

## Verification

- `node --check backend/services/CoreAIAgent.js`
- `node --check backend/services/aiAgent/responseGenerator.js`
- `node --check backend/tests/services/CoreAIAgent.catalogVariantContext.test.js`
- `npm test -- --silent --runTestsByPath tests/services/CoreAIAgent.catalogVariantContext.test.js`
- `npm test -- --silent --runTestsByPath tests/services/CoreAIAgent.catalogVariantContext.test.js --testNamePattern "leaked provider|internally leaked|removes Facebook customer names|falls back to authoritative"`

Focused Jest result: targeted leak/sanitizer tests passed.
