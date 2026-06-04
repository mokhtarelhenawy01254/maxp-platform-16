# Facebook Ads Profitability Settings

Date: 2026-05-09

## What changed

- Added product-level ad profitability settings under `metadata.facebookAdsDecision`.
- The product edit page now has a compact "ربحية الإعلانات" tab.
- The tab stores only ad decision assumptions:
  - `expectedShipping`
  - `paymentFee`
  - `paymentFeeRate`
  - `returnRate`
  - `requiredNetProfit`
  - `configuredMaxCpa`
- Product cost remains a source-of-truth field on `Product.cost`.
- Variant costs remain source-of-truth fields on `ProductVariant.cost`.
- Inventory cost can now be used by the decision engine as a fallback source through weighted inventory average cost.

## Source order for unit cost

The ad decision engine resolves unit cost in this order:

1. Product metadata override, for legacy compatibility only.
2. `Product.cost`.
3. Average of `ProductVariant.cost`.
4. Weighted average of `Inventory.cost`.
5. Delivered order item costs, but only when the order carries a real cost
   field such as `merchantPrice` or product/variant cost.
6. Estimated 60% of product price.

Scale/kill decisions are not treated as fully ready when the cost source is only the 60% estimate.

## Important fix

`Product.cost = null` is no longer treated as numeric zero. Missing cost now stays missing and falls through to variant, inventory, order, or estimated cost sources.

## 2026-05-09 follow-up

Catalog costs saved as `0` on `Product.cost`, `ProductVariant.cost`, `Inventory.cost`, or delivered order item cost fields are now treated as missing profitability data for ad decisions. This prevents products that have not had their real cost entered yet from receiving an inflated Max CPA or an unsafe `SCALE` recommendation. If a zero unit cost is genuinely intentional, it can still be supplied explicitly through the product ad profitability metadata override.

## 2026-05-09 order-cost hardening

`OrderItem.basePrice` is not treated as product cost in the ad decision engine.
For Swan storefront orders this field is the selling/base price, so using it as
COGS would incorrectly mark missing-cost products as profitability-ready. Order
history now contributes an `ORDER_ITEMS` cost source only when a reliable cost is
available from `merchantPrice`, `Product.cost`, or `ProductVariant.cost`.

## Shipping source fallback

The decision engine now falls back to active `ShippingZone` records when no delivered order history, product shipping override, company shipping override, or default `DeliveryOption` exists. If the ad set stores concrete location targeting, the engine uses matching shipping zones and marks the source as `SHIPPING_ZONE_TARGET_MATCH`. For broad targeting, it uses the average active shipping-zone price and marks the source as `SHIPPING_ZONE_AVERAGE`.

## UI behavior

The product page profitability tab shows:

- Cost source and value.
- Break-even CPA.
- Target CPA.
- Break-even ROAS.
- A compact preview of shipping, payment fees, return reserve, and profit before ad spend.

If cost is missing, the tab warns the user and links them to pricing or variants to set the real source-of-truth cost.
