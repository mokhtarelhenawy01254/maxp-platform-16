# Affiliate Merchant Portal Controls - 2026-05-03

## Context

The merchant role is part of the affiliate/dropshipping lifecycle, but it must not behave like a
company admin account. The company owns merchant approval, commission policy, fulfillment routing,
warehouse selection, and default shipping provider assignment. Merchants only operate on their
assigned products, stock, orders, fulfillment references, and estimated payouts.

## Runtime Changes

- Public merchant registration now creates a pending merchant (`isActive=false`) and an inactive
  linked `MERCHANT` user until the company approves the account.
- Updating a merchant through company management now syncs `isActive` to the linked merchant login
  user in the same transaction.
- Company merchant management exposes company-owned fulfillment controls:
  `fulfillmentMode`, `defaultWarehouseId`, `defaultShippingCompanyId`, and activation status.
- The merchant portal now renders route-focused sections instead of one mixed screen:
  overview, products/stock, dropshipping orders, and estimated commissions.
- Merchant commissions in the portal are explicitly estimated from visible merchant orders; the
  company remains the authority for final payout approval and exports.

## Verification

- Frontend targeted Jest:
  `npm test -- --runTestsByPath src/pages/merchants/__tests__/MerchantManagementPages.test.tsx --runInBand`
- Backend syntax:
  `npm run check:syntax`
- Full affiliate/dropshipping UAT:
  `node backend/scripts/uat/run-affiliate-dropshipping-uat.js`
- Frontend production build:
  `VITE_DISABLE_COMPRESSION=true VITE_BUILD_MINIFY=esbuild npm run build`
- Browser verification covered company merchant settings, merchant portal route sections, restricted
  merchant sidebar tools, and clean console output.

## Remaining Product Decisions

- Failed/cancelled fulfillment should get a formal stock-reservation release policy.
- External merchant inventory sync remains a later integration layer; the current portal supports
  manual stock updates and company-owned defaults.
