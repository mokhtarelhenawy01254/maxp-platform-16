# Platform Site Homepage Variants

## What Changed

- the public root route `/` no longer hardcodes a single landing page
- the platform now supports multiple homepage variants for the main public site
- the storefront on `/store` remains fully separate and is not affected by this selection

## Available Variants

- `enterprise-os`
  - the existing premium dark executive landing
- `sales-flow`
  - a brighter, faster conversion-focused version for clearer first-touch messaging
- `executive-atlas`
  - a boardroom-style variant focused on governance, metrics, and strategic confidence
- `business-os`
  - a dark operating-system landing focused on unified command, automation, and total business visibility

## Super Admin Control

- route: `/super-admin/homepage-templates`
- purpose:
  - review each variant inside an admin control surface instead of a card grid
  - preview each variant before publishing
  - activate the variant that should appear on `/`
- preview routes:
  - `/preview/platform-home/enterprise-os`
  - `/preview/platform-home/sales-flow`
  - `/preview/platform-home/executive-atlas`
  - `/preview/platform-home/business-os`

## Interface Direction

- the page is intentionally built around one operational goal:
  - identify the currently published landing
  - review another variant quickly
  - decide whether to preview or publish it
- the layout is split into three clear surfaces:
  - an available-variants list that never publishes by itself
  - a review surface for the selected variant
  - a separate publish decision surface
- the page now behaves more like release control than a dashboard or a marketing showcase

## Persistence

- the active public homepage variant is stored in `SystemSettings`
- key:
  - `platform_public_landing`

## Notes

- this is a platform-level setting, not a per-company storefront setting
- if the public settings endpoint fails, the frontend falls back safely to `enterprise-os`
- if the admin API returns an older `availableLandingIds` list, the super-admin page still keeps shipped registry variants visible so newly added templates like `business-os` do not disappear from `/super-admin/homepage-templates`
