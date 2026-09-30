# Store Promotion Settings

## Route

- primary route: `/settings/promotion`
- embedded surface: `Store Settings > tab=promotion`

## Current UI model

- the page no longer uses `MUI`
- it now renders with the shared internal UI primitives in `frontend/src/components/ui`
- it also shares common settings-page wrappers from `frontend/src/pages/settings/components`
- visual direction now matches the newer store admin surfaces:
  - gradient header
  - lightweight route tabs
  - linear operational sections
  - shared switches, inputs, textarea, alerts, and buttons

## Behavior preserved

- loads data from `GET /promotion-settings`
- saves data to `POST /promotion-settings`
- resets data through `POST /promotion-settings/reset`
- still controls:
  - `freeShippingEnabled`
  - `freeShippingThreshold`
  - `freeShippingMessage`
  - `flatShippingEnabled`
  - `flatShippingFee`

## Tab routing

- `الشحن المجاني` stays on `/settings/promotion`
- `خصومات الكميات` navigates to `/settings/store-promotion` (aliased from `/settings/volume-discounts`)
- `خيارات التوصيل` navigates to `/settings/delivery-options`
- `المنتجات المقترحة` navigates to `/settings/recommendations`

## Notes

- this migration is intentionally UI-only; backend payload shape was kept unchanged
- route-linked sibling pages like `DeliveryOptions.tsx` now follow the same modern settings pattern
