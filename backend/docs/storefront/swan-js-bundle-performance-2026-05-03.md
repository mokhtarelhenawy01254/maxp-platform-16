# Swan JS Bundle Performance Pass - 2026-05-03

## Scope

- Target storefront: Swan / KHEMET LUXE production flow.
- Goal: reduce storefront startup JavaScript without changing product, cart, or checkout behavior.

## Changes

- Deferred `CartDrawer` out of `StorefrontShell`.
  - The drawer now loads outside the storefront shell and mounts after a short idle window, persisted cart state, or first user intent.
  - This keeps cart UI, quantity controls, and upsell drawer code out of the first storefront shell execution path while keeping first cart interaction ready.
- Deferred the legacy collection `ProductGrid` direct import.
  - The normal page composer path was already lazy-loaded.
  - The remaining direct fallback now loads via `React.lazy`.
- Added `CartDrawer-` to storefront deferred preload filtering.
  - The cart drawer chunk is not emitted as an initial modulepreload dependency from the storefront bootstrap.
- Added runtime import guard coverage so future changes do not accidentally pull the cart drawer or legacy grid back into the shell.

## Local Build Result

Production build passed on Windows with the repo's existing Vite minify fallback.

Selected generated chunks:

- `StorefrontShell-OIgCBMrZ.js`: 486,763 bytes raw / 67,714 gzip / 48,637 brotli.
- `CartDrawer-Bb3VLdam.js`: 44,037 bytes raw / 9,217 gzip / 7,971 brotli.
- `ProductGrid-C3UUveQ5.js`: 86,981 bytes raw / 14,470 gzip / 11,973 brotli.
- `dist/index.html` initial modulepreloads remained limited to `vendor-react` and `vendor-core-runtime`; `CartDrawer` was not preloaded.

Previous local reference from the last pass had `StorefrontShell` around 512 KB raw, so this pass removes roughly 25 KB raw from the storefront shell and delays the cart drawer work until user intent.

## Verification

- `npx vitest run src/storefront/__tests__/storefrontRuntimeImports.test.ts`
- `npx vitest run src/storefront/__tests__/khemetHeaderInteractions.test.tsx`
- `npx vitest run src/storefront/__tests__/CartDrawer.khemet.test.tsx`
- `npm run build`

## Production Checks Needed After Deploy

- Confirm Home, Shop, Product, Cart, Checkout, and Thank-you still load.
- Confirm header brand/menu/search/cart interactions on product pages.
- Confirm add-to-cart still opens or prepares the cart drawer on first click after variant selection.
- Capture post-deploy transfer and request counts for mobile and desktop.
