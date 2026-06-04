# Product Display, Preview, WhatsApp, and Turbo Source Sync - 2026-05-04

## Scope

This release moves the direct production fixes for product display customization, product preview, WhatsApp chat sizing, and Turbo shipment recreation into source control so the next GitHub deploy does not revert production.

## Product Display

- Admin display settings now preserve all selector modes, not only colors.
- Color-circle mode stores explicit value-to-color mappings in `metadata.variantSettings.attributeColors`.
- Storefront selectors prefer configured color swatches before falling back to name-based color detection.
- Elessi storefront defaults are still present, but saved admin overrides are applied last for `اللون`/`Color` and `المقاس`/`Size`.

## Product Preview

- Admin preview URLs use the public product slug and carry `previewProductId`.
- Preview mode first tries the admin product endpoint with `previewProductId`.
- If admin preview lookup returns `401`, `403`, or `404`, storefront loading falls back to the public product endpoint.

## WhatsApp

- The `/whatsapp` route no longer renders the large workspace summary header above the chat.
- Chat height uses responsive `100dvh` sizing to keep the panel large on production desktop/mobile shells.
- Sidebar actions are compact icon buttons and the internal metric cards were removed so conversations start higher.

## Turbo

- `POST /api/v1/turbo/orders/:orderId/shipment` accepts an explicit `replaceExisting` flag.
- Existing Turbo shipment data is retained in metadata when a replacement is created.
- Delivered/completed Turbo shipments cannot be replaced.
- The order detail screen exposes the guarded "إرجاع على Turbo تاني" action.

## Production Drift Note

The user reported that production still showed old behavior after direct deploys. Browser inspection confirmed production had drifted to chunks that did not include the visible fixes. The corrective direct deploy replaced `/var/www/frontend2/dist` with active chunks including:

- `ProductInfo-CtgFVRsb.js`
- `ProductNewFinal-gVghrHOM.js`
- `StorefrontShell-ByLWgiIt.js`
- `index-CQIR5oDZ.js`

Backup from the final direct frontend swap:

- `/var/www/frontend2/dist.backup-20260504144949`

## Verification

- Focused product/storefront Vitest suite passed: 21 tests.
- Full frontend production build passed.
- Production storefront check confirmed `Nova Sneakers` shows color as a dropdown and sizes as buttons.
- Production preview button resolved to the slug URL with `previewProductId` and returned `200`.
- Production WhatsApp measurement showed the old summary header absent and the chat panel around `1069 x 645`.
- Production SSH checks passed for backend health, PM2 status, and `nginx -t`.
