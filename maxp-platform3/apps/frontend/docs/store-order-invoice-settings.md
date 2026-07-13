# Store Order Invoice Settings

## Route

- page route: `/settings/order-invoice`

## Current UI model

- the page no longer uses `MUI`
- it now renders with the shared internal UI primitives in `frontend/src/components/ui`
- it also reuses shared settings-page wrappers from `frontend/src/pages/settings/components`
- the surface is now organized as a modern admin workspace with:
  - gradient operational header
  - quick action bar
  - internal tabs for invoice, print, and preparation slip settings

## Behavior preserved

- loads invoice settings from `GET /order-invoice-settings`
- loads company preparation settings from `GET /companies/current`
- saves invoice settings through `PUT /order-invoice-settings`
- saves preparation slip settings through `PUT /companies/:companyId`
- resets only invoice settings through `POST /order-invoice-settings/reset`

## Areas still managed

- invoice auto-generation and status trigger
- invoice numbering, default tax, notes, and terms
- visible invoice sections and print layout choices
- auto-email metadata
- preparation slip identity, layout, visible sections, and footer/instructions

## Notes

- this migration is intentionally UI-only; backend payload shape stayed unchanged
- company `settings.orderPreparation` is preserved and only `slipDocument` is replaced on save
