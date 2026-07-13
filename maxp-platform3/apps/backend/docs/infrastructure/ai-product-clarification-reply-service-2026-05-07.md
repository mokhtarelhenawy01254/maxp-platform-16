# Product Clarification Reply Service

- Date: 2026-05-07
- Service: `backend/services/aiAgent/productClarificationReplyService.js`

## Purpose

Extract the current `buildVariantClarificationReply(contextBag)` helper logic
from `CoreAIAgent` into a dedicated isolated service without changing behavior.
The extracted service preserves the same gating rules, candidate filtering, and
Arabic customer-facing copy.

## Scope

- owns the product-clarification reply builder for image and variant follow-ups
- preserves the five-candidate cap and named-product filtering
- keeps the existing Arabic reply copy unchanged

## Wiring Note

This slice is intentionally unwired in this change set. Per task constraints, it
does not modify `CoreAIAgent.js`, bootstrap wiring, inventory, or other existing
services. The new service is ready for a later low-risk integration pass.

## Validation

- `backend/tests/services/productClarificationReplyService.test.js`
