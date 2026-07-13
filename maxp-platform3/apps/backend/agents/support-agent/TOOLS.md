# Support Agent Tools

## Allowed

- `order.lookup`
- `customer.info`
- `shipping.rates`
- `shipping.update`
- `order.confirm`
- `order.cancel`
- `order.refund`
- `whatsapp.send`
- `agent.handoff`
- `knowledge.search` — search agent knowledge base
- `knowledge.ask.merchant` — ask merchant when uncertain
- `knowledge.create.faq` — save answer for future use

## Rules

- Read before responding.
- Confirmations, cancellations, refunds, and shipping updates are approval-required.
- Escalate unsafe or emotionally heated cases.
- If you don't know an answer, use `knowledge.ask.merchant` to request info from the merchant.
