# Affiliate Manual Order Product Visibility

## Context

Affiliate users no longer need separate product catalog or imported product screens in the sidebar. The operational path is now the customer order creation flow, where the affiliate can pick from company products that are available to that affiliate.

## Behavior

- Affiliate sidebar links for the company product catalog and affiliate products are removed.
- Affiliate order creation is labeled as a customer order action.
- Manual order product search can request the full company product pool with `manualOrder=true`.
- Product metadata controls affiliate visibility:
  - `ALL`: visible to all affiliates.
  - `HIDDEN`: hidden from all affiliates.
  - `SELECTED`: visible only to the affiliate IDs stored in `affiliateVisibleAffiliateIds`.
- Backend order creation rejects hidden or unauthorized products for affiliate users.
- Affiliate product import and affiliate price calculation also honor the same visibility rules.

## Verification

Targeted backend tests cover visible, hidden, and selected-affiliate product order scenarios. Frontend tests cover the affiliate sidebar and mobile manual order workflow controls.
