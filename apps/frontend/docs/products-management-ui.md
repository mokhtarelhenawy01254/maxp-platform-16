# Products Management UI

## 2026-05-08

- Hid product SKU values from the main `/products` management table row so operators see the product name, image, category, type, price, inventory, status, update date, and actions without the long SKU string crowding the product column.
- SKU remains available in product creation/editing and operational flows that need it, such as inventory, imports, product search, and order preparation.

## 2026-05-14

- Adjusted the product editor so the primary save action publishes non-merchant products, including existing drafts opened for editing. The separate "save as draft" action still creates/keeps a draft, and merchant flows keep their existing workflow state. The product create/update APIs also treat `isActive=true` as an explicit publish request so stale draft workflow metadata cannot override the primary save.
