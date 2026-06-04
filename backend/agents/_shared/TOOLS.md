# Shared Agent Tool Catalog

This file is the human-readable companion to the tool registry.
Tool metadata is defined in `backend/services/aiAgent/tools/*.js` files — each tool includes `sideEffects`, `requiresApproval`, `companyScoped`, and `inputSchema` fields.

## Execution Rules

- Every tool call must include `companyId` from trusted server context.
- Agents may call only tools listed in their own `agent.json`.
- Write tools never execute directly from an LLM response; they must pass the Tool Gateway and write an audit entry.
- High-risk write tools create approval drafts. Draft-only catalog tools may create unpublished records that still require merchant review before publishing.
- A skill should expose no more than 2-3 tools to the model at once.

## Core Manager Tools

- `agent.spawn`: create a scoped specialist agent from an approved template.
- `agent.assign_task`: assign a task to a specialist agent inbox.
- `agent.list_agents`: list active and paused agents for the current company.
- `agent.read_state`: summarize company state, budget, pending approvals, and active work.
- `agent.handoff`: transfer a task or conversation to another agent or a human.
- `skill.create`: create a reusable shared skill with `skill.json` and `SKILL.md`.

## Commerce Tools

- `product.search`: read product catalog and inventory.
- `product.create`: create an unpublished draft product for merchant review.
- `product.updatePrice`: propose a price change.
- `inventory.check`: read stock levels.
- `inventory.adjust`: propose stock adjustments.
- `discount.apply`: propose a discount.
- `discount.create_draft`: create a discount proposal for human approval.

## Customer And Order Tools

- `order.lookup`: read order state.
- `order.create_draft`: create an approval-required order draft from confirmed customer and product details.
- `order.create_confirmed`: create a real order after explicit customer confirmation and complete order details.
- `order.confirm`: propose confirming a pending order.
- `order.cancel`: propose cancelling an order.
- `order.refund`: propose refunding an order.
- `customer.info`: read customer profile context.
- `shipping.rates`: read shipping options.
- `shipping.update`: propose a shipping update.
- `whatsapp.send`: propose or send an approved customer message depending on policy.

## Marketing Tools

- `facebook_ad.create_draft`: create an ad draft for review.
- `audit.read`: read agent audit trail and telemetry summaries.
- `scheduler.create_job`: create a natural-language scheduled routine proposal.
