# Affiliate Dropshipping Fulfillment - 2026-05-02

## Scope

This note documents the fulfillment layer added for the affiliate/dropshipping flow.
The change is non-destructive and keeps fulfillment decisions company-owned.

## Fulfillment Ownership

- Public merchant signup collects identity and contact/login data only.
- The company configures merchant commission, auto fulfillment, webhook, fulfillment mode, default warehouse, and default shipping company.
- Merchants use the portal to view their products/orders and update order status, tracking number, and external reference.

## Modes

- `MERCHANT`: availability and reservation use `MerchantProduct.stock`; the merchant is expected to ship.
- `COMPANY_WAREHOUSE`: availability uses `Inventory.available` in the selected company warehouse; the company warehouse is the fulfillment source.

## Shipment Records

- Each `MerchantOrder` can have a `Shipment`.
- The shipment stores company, merchant order, source order, warehouse, shipping company, status, tracking number, external shipment id, destination, and timestamps.
- Carrier assignment is now persisted and visible in the merchant portal.
- Carrier API label generation remains a future integration layer; this pass does not call third-party carrier APIs.

## Inventory Flow

- Routing a `COMPANY_WAREHOUSE` merchant order decrements `Inventory.available` and increments `Inventory.reserved`.
- Fulfilling that merchant order decrements physical `Inventory.quantity`, decrements `Inventory.reserved`, and writes a `StockMovement` with `type = OUT` and `reason = SALE`.
- Purchase-order receiving can now increase inventory in a selected warehouse and writes a `StockMovement` with `type = IN` and `reason = PURCHASE`.

## Verification

- Local Prisma migration deployed with `npx prisma migrate deploy --schema=prisma/schema` from `backend`.
- Fresh-company UAT: `Codex Affiliate UAT 20260502031429`.
- API result: `38/38 PASS`.
- Raw report: `backend/tmp/codex-affiliate-full-uat-20260502031429.json`.
- Targeted backend Jest: `4` suites, `20` tests passed.
- Browser verification confirmed a company-warehouse merchant sees the selected warehouse and shipping company in `/merchant-portal`, with only merchant portal/account tools in the sidebar.
