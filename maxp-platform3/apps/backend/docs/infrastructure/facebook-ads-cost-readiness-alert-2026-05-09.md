# Facebook Ads Cost Readiness Alert

Date: 2026-05-09

## Change

The Facebook Ads dashboard now surfaces product-linked ads whose decision engine still uses `ESTIMATED_60_PERCENT` as the product cost source. These rows cannot produce a strong profitability-based Scale/Kill decision, so the dashboard shows a compact warning inside the decision center.

## Operator Flow

The warning groups affected ads by product, sorted by affected spend. Each product shortcut opens:

`/products/:productId/edit?tab=ad-profitability`

That tab keeps product cost read-only from the existing product, variant, or inventory data. The operator completes the real cost in the product pricing, variant, or inventory areas instead of duplicating product cost inside the ads settings.

## Notes

Shipping is still resolved by the backend decision engine in this order:

1. Delivered order history.
2. Product-level Facebook Ads profitability override.
3. Company-level profitability settings.
4. Default delivery option or matching shipping zone fallback.

The alert added here is only for missing product cost because that is the blocker that keeps the decision in cautious profitability mode.
