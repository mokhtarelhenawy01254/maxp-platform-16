# Affiliate Order Details - 2026-05-03

## Summary

Fixed the marketer order-view flow for `/affiliates/orders`.

## What changed

- The affiliate orders table now opens `/affiliates/orders/:orderId` instead of the company admin order route.
- Added an affiliate-scoped backend endpoint: `GET /api/v1/affiliates/orders/:id`.
- The endpoint only returns an order when `order.affiliateId` matches the authenticated marketer's affiliate record.
- The detail page shows order status, source, payment summary, customer data when allowed, products, commissions, shipping, and merchant fulfillment references.

## Safety

- Affiliate users still cannot open the company/admin `/orders/:id` surface.
- If the affiliate policy disables customer visibility, the affiliate order APIs redact customer/contact/address fields.
- Unrelated orders return `404` from the affiliate detail endpoint.
