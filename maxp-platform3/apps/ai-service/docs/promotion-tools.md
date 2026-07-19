# Promotion Tools for AI Agents

Two new tools added for the SALES_REP agent to view offers and validate coupons.

## `offers_list_active`

Lists all active store promotions in one call:

- Active coupons from `GET /api/v1/coupons`
- Store-wide promotions (tiered discounts) from `GET /api/v1/store-promotions`
- Free/flat shipping settings from `GET /api/v1/promotion-settings`

**Files:**
- `src/tools/promotion_tools.py` — business logic using BackendClient
- `src/tools/definitions/promotions.py` — tool definition (input model + FunctionTool)

## `coupon_validate`

Validates a coupon code: checks expiry, usage limits, min order amount, and returns the calculated discount.

- Calls `POST /api/v1/coupons/validate`

## Registration

- `role_tools.yaml` — added to SALES_REP role
- `registry.py` — added to READ_TOOL_NAMES + backward-compat re-exports
