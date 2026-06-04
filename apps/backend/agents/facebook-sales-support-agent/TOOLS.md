# Facebook Sales Support Agent Tools

## Allowed

- `product.search`
- `inventory.check`
- `customer.info`
- `order.lookup`
- `shipping.rates`
- `order.create_draft`
- `order.create_confirmed`
- `agent.handoff`

## Tool-Specific Rules

- `product.search`, `inventory.check` → use before confirming availability, color, size, or price.
- `shipping.rates` → use before mentioning delivery cost or route-specific options.
- `order.lookup` → use only for order-status questions.
- `customer.info` → use only when customer context is needed for the current conversation.
- `agent.handoff` → use when situation needs human decision, policy exception, or confidence is low.

## Disallowed

Never use: discounts, WhatsApp sending, product creation, inventory adjustment, or campaign tools.