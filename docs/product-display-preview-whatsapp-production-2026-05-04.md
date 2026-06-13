# Product Display, Preview, and WhatsApp Production Fix - 2026-05-04

## Scope

Direct production fix for:

- Product edit display customization on `/products/cmoqxdziw01pkju2i5gvhgc9c/edit`.
- Product preview opened from the admin edit page.
- WhatsApp chat page sizing on `/whatsapp`.

No GitHub push was used for this deployment.

## Fixes

- Restored product preview rendering by removing invalid footer branches from `StorefrontProductPreviewBanner`.
- Updated product preview URLs to use the product slug in the public storefront path while keeping `previewProductId` as the stable admin product id.
- Updated storefront preview loading so `productPreview=1` uses `previewProductId` for the admin product request, and falls back to the public storefront product when admin lookup returns `401`, `403`, or `404`.
- Restored the WhatsApp chat surface to a larger desktop layout with a visible summary header and a tall chat panel.
- Added focused tests for display option persistence, preview URL generation, and preview product loading with admin-token context.

## Production Deployment

- Built `frontend/dist` locally with `npm run build`.
- Uploaded `frontend/tmp/frontend-dist-20260504131459.tar.gz` to `/root/maxp-deploy-backups/`.
- Swapped production frontend to `/var/www/frontend2/dist`.
- Production backup created at `/var/www/frontend2/dist.backup-20260504131459`.

Active production chunks after deploy:

- `ProductNewFinal-B3W5kWYw.js`
- `StorefrontShell-BHjKXd3Z.js`
- `ConversationsImprovedFixed-Df79Okwu.js`

## Verification

Local focused tests:

```text
5 files passed, 28 tests passed
```

Production checks:

- `http://127.0.0.1:3007/api/v1/health` returned OK with database connected.
- `nginx -t` returned successful configuration syntax.
- Product display tab shows both color and size display selectors with all options: `buttons`, `circles`, `dropdown`, `thumbnails`, `radio`.
- Preview button opens `https://maxp.online/store/product/nova-sneakers?...&previewProductId=cmoqxdziw01pkju2i5gvhgc9c`.
- Preview product loads through `GET /api/v1/products/cmoqxdziw01pkju2i5gvhgc9c` with status `200`.
- Preview shows color thumbnail buttons for `برجاندي`, `رمادي`, `أسود` and size buttons `37` through `41`.
- WhatsApp production layout has a large chat panel around `980 x 571` at desktop viewport.

Screenshots:

- `frontend/tmp/prod-product-edit-display-after-third.png`
- `frontend/tmp/prod-preview-popup-after-third.png`
- `frontend/tmp/prod-whatsapp-desktop-after-third.png`

## Follow-up: Production Drift Replaced the Visible Fix

After the user reported that the changes were still not visible on production, direct browser inspection showed that the live `index.html` was loading a different frontend build from the one previously verified:

- Active WhatsApp chunks included `App-BCcZss3d.js`, `index-6Nw9aAPw.js`, and `WhatsAppSettings-CunoB_Y2.js`.
- Active storefront product chunk `ProductInfo-CYk_-Hn4.js` did not contain the `attributeColors` storefront support.
- The older WhatsApp chunk still rendered the large summary header above the chat and left only about `487px` for the chat panel.

Corrective deployment was done directly to production without GitHub:

- Built the current local frontend after tightening the WhatsApp chat/sidebar layout.
- Uploaded `frontend/tmp/frontend-dist-20260504144949.tar.gz`.
- Swapped `/var/www/frontend2/dist`.
- Production backup created at `/var/www/frontend2/dist.backup-20260504144949`.

Active production chunks after the corrective deploy:

- `App-0j4oRoQj.js`
- `ProductNewFinal-gVghrHOM.js`
- `ProductInfo-CtgFVRsb.js`
- `StorefrontShell-ByLWgiIt.js`
- `index-CQIR5oDZ.js`
- `WhatsAppSettings-CjUmgOEW.js`

Final production verification:

- Product storefront loads `ProductInfo-CtgFVRsb.js`, `StorefrontShell-ByLWgiIt.js`, and `VariantSelector-B2zaTXzw.js`.
- `Nova Sneakers` now reflects saved display settings: color as a dropdown and sizes `37` through `41` as buttons.
- Preview button resolves to `https://maxp.online/store/product/nova-sneakers?companyId=cmleybpf70028juo2wwpmp8rt&productPreview=1&previewSource=admin&previewProductId=cmoqxdziw01pkju2i5gvhgc9c` and returns `200`.
- WhatsApp no longer renders the old summary header (`الجلسة متصلة` / `بها رسائل غير مقروءة`).
- WhatsApp desktop chat panel measures about `1069 x 645`; the conversation list area increased to about `389 x 374`.
- Backend health, PM2 status, and `nginx -t` passed after the frontend swap.
