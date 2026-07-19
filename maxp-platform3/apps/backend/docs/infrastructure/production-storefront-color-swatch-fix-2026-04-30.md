# Production Storefront Color Swatch Fix - 2026-04-30

## Issue

- Product color display customization did not render many Arabic color names correctly on the storefront.
- Common names such as `زيتي`, `جملي`, `كشمير`, `نبيتي`, `بينك`, and similar values could appear blank or incomplete when a color-style selector was used.

## Root Cause

- `frontend/src/storefront/components/VariantSelector.tsx` only recognized a limited color preset map.
- When a color name did not resolve, the circle swatch fell back to the raw Arabic label as a CSS color value, which is invalid and resulted in empty swatches.
- Production also sat behind long-lived Cloudflare asset caching, so patching an existing hashed asset in place was not enough for a reliable public rollout.

## Fix

- Expanded the storefront color preset map with common Arabic aliases used in live catalog data, including:
  - `زيتي`
  - `جملي`
  - `هافان`
  - `كشمير`
  - `كاشمير`
  - `نبيتي`
  - `برجاندي`
  - `بينك`
  - `فوشيا`
  - `مينت جرين`
  - `بيبي بلو`
  - `جنزاري`
  - `بترولي`
  - `اورانج`
  - `دهبي`
  - and other high-frequency aliases found in production data
- Added tone handling for labels that include light/dark modifiers such as `فاتح` and `غامق`.
- Added a readable two-letter fallback inside color circles when a color name is still unknown, instead of rendering an empty swatch.
- Rebuilt the storefront frontend from a temporary clean workspace because the main local tree had an unrelated committed conflict marker in `frontend/src/storefront/themes/experienceOverrides.ts`.
- Deployed a fresh `dist` bundle to `/var/www/frontend2/dist` so the storefront serves new hashed asset filenames and naturally bypasses cached old assets.

## Verification

- Temporary clean storefront build passed:
  - `vite build`
- Targeted storefront selector test passed from the temporary clean workspace:
  - `vitest run src/storefront/__tests__/variantSelector.test.tsx`
  - result: `10 passed`
- Production frontend deploy succeeded:
  - old dist backed up to `/var/www/frontend2/dist.backup-20260430-colorfix`
  - new dist swapped into `/var/www/frontend2/dist`
- Public asset verification passed:
  - new storefront asset available at `https://maxp.online/assets/VariantSelector-B-MKUrai.js`
  - public response contained the new alias markers such as `زيتي`

## Notes

- The existing local workspace still contains an unrelated merge-conflict marker in `frontend/src/storefront/themes/experienceOverrides.ts`. That file blocks a direct local production build until it is cleaned separately.
- A temporary patch was also applied to the previously cached live `VariantSelector-CCquUnuP.js`, but the final reliable rollout came from publishing a fresh `dist` with new hashed asset names.
