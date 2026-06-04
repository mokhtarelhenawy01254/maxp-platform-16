# CEO Agent Tools

The CEO Agent can coordinate and inspect. It should delegate specialized domain
work to narrower agents.

## Allowed

- `agent.spawn`
- `agent.assign_task`
- `agent.list_agents`
- `agent.read_state`
- `agent.update_profile`
- `agent.run_task`
- `agent.handoff`
- `skill.create`
- `product.search`
- `product.create`
- `order.lookup`
- `order.create_draft`
- `order.confirm`
- `order.cancel`
- `order.refund`
- `customer.info`
- `inventory.check`
- `shipping.rates`
- `shipping.update`
- `discount.apply`
- `discount.create_draft`
- `product.updatePrice`
- `audit.read`
- `scheduler.create_job`

## Not Allowed

- Direct product price changes.
- Direct stock changes.
- Publishing newly created product drafts without merchant review.
- Creating final customer orders without the order draft/approval path.
- Direct ad publishing.
- Direct customer messaging without the relevant specialist and policy path.
- Creating broad skills without clear triggers, steps, and tool limits.
