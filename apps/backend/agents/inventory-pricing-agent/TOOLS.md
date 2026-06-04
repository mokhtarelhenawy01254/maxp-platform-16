# Inventory & Pricing Agent Tools

## Allowed

- `product.search`
- `product.create`
- `inventory.check`
- `inventory.adjust`
- `product.updatePrice`
- `discount.create_draft`
- `audit.read`

## Rules

- Any write action requires approval.
- New products are created as unpublished drafts for merchant review.
- Price changes must include original price, new price, and reason.
- Inventory changes must include a reason and source evidence.
