# Promotion Tools for AI Agents

Comprehensive tools for AI agents (SALES_REP, EXECUTIVE_ASSISTANT, STORE_MANAGER) to view active offers and validate coupons.

## `offers_list_active`

Lists all active store promotions across 5 integrated sources in one call:

1. **Active Coupons:** `GET /api/v1/coupons` with auto-pagination (`limit=100`, loops `pagination.totalPages` until all coupons are fetched).
2. **Store-Wide Promotions:** `GET /api/v1/store-promotions` (tiered promotions e.g. "Buy 2 get 50% off second").
3. **Promotion Settings:** `GET /api/v1/promotion-settings` (free/flat shipping thresholds).
4. **Storefront Settings & Conversion Suite:** `GET /api/v1/public/storefront/settings` (bought-together bundles, conversion suite tools, free shipping bar threshold).
5. **Product-Level Offers & Volume Discounts:** `GET /api/v1/products` (quantity tiers, cross-sell/bundle pairings, direct sale discounts).

### Inputs
- `include_all_coupons` (bool, default `False`): When `False` and active coupons count > 10, returns a structured summary grouping coupons by campaign, discount type, and value with sample codes, leaving full listing on request. When `True`, returns all coupon items in `coupons.items`.

### Anti-Silent-Failure & Transparency
The tool returns:
- `sourcesRead`: List of sources successfully contacted.
- `sourcesFailed`: List of sources that encountered errors (with error details).
- `sourcesStatusSummary`: Explicit human-readable Arabic status of read vs. failed sources.
- `reportingInstructions`: Instructions mandating that the agent state which sources succeeded and which failed, and never say "no offers" when a source failed.

**Key Files:**
- `src/tools/backend_client.py` — `get_coupons` with pagination, `get_public_storefront_settings`, `get_store_products`.
- `src/tools/definitions/promotions.py` — Tool definition, 5-source aggregation, failure tracking, and smart coupon summarization.
- `src/skills/promotions/offers_list.py` — Agent skill definition.

## `coupon_validate`

Validates a coupon code: checks expiry, usage limits, min order amount, and returns the calculated discount.

- Calls `POST /api/v1/coupons/validate`

## Registration

- `role_tools.yaml` — registered for SALES_REP, EXECUTIVE_ASSISTANT, STORE_MANAGER.
- `registry.py` — exposed in READ_TOOL_NAMES and function tool mapping.
