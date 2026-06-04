# Affiliate Demo Company Preset - 2026-05-03

## Summary

Added an English-first production demo path for affiliate and dropshipping trials.

## What changed

- Added the `affiliate-demo` sidebar layout preset for company owner/admin users.
- The preset keeps the dashboard focused on storefront, affiliate management, merchants, products, inventory, procurement, orders, shipping companies, customers, apps, and company settings.
- Merchant and affiliate roles still use their dedicated restricted portals.
- Added URL language handling for `?lang=en` and `?lng=en` so demo login links can open the app in English and persist the choice locally.
- Localized the company dashboard activation and quick-start cards so the English demo account does not show Arabic onboarding copy on first login.
- Added a non-destructive production seed script: `backend/scripts/seed_affiliate_demo_company_prod.js`.

## Product decision

- The affiliate demo company owns the public customer storefront.
- Affiliates do not get a separate customer storefront by default. They get operating tools and tracked links that open the company's storefront with their `ref` code.
- `/affiliates/marketplace` is treated as a company product catalog for marketers, not as a customer-facing marketplace.
- Merchants do not manage the company's apps, store, commission rules, warehouses, or shipping-company configuration. They only manage their scoped products, stock/price fields allowed by the company, fulfillment references, dropshipping orders, and commission visibility.

## App bundle for an affiliate product

The production demo seed now attempts to activate the affiliate-ready app bundle:

- `ecommerce-basic`
- `order-core`
- `order-shipping-turbo`
- `order-invoicing`
- `conversion-suite`
- `inventory-pro`
- `affiliate-pro`
- `procurement-pro`
- `crm-basic`
- `crm-loyalty`
- `analytics-advanced`
- `wallet-system`

## Safety

- The production seed script only creates new rows and does not delete or reset existing data.
- If the preferred demo slug or email already exists, the script creates a unique suffixed value.
- Demo data includes one owner, one approved affiliate, one merchant, products, warehouses, demo carriers, one sample order, shipment, and commissions.
- The seed script uses a direct, short-lived Prisma client so one-off production runs disconnect cleanly after printing the generated credentials.
