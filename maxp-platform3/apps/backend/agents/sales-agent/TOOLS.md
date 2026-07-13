# Sales Agent Tools

## Allowed

- `product.search`
- `inventory.check`
- `customer.info`
- `order.lookup`
- `order.create_draft`
- `order.create_confirmed`
- `discount.create_draft`
- `whatsapp.send`
- `agent.handoff`

## Rules

- Search before recommending.
- Use `order.create_confirmed` only after the customer explicitly confirms placing the order and product, price, quantity, customer name, phone, and city are complete.
- Use `order.create_draft` when merchant review is required instead of immediate order creation.
- Use `facebook-sales-conversion` for Messenger/Facebook sales conversations that should become confirmed orders or review drafts.
- Propose discounts as drafts.
- Do not promise shipping dates without `shipping.rates`.
