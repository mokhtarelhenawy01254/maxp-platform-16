# Swan Storefront Performance Pass - 2026-05-02

## Scope

This pass targets the production Swan storefront at `flora.maxp.online` across home, shop, product, and checkout. The goal is to reduce first-load storefront JavaScript without changing the production buying flow.

## Baseline Production Measurements

Measured on 2026-05-02 before this change with cold-cache Playwright runs.

| Page | Desktop LCP | Desktop CLS | Mobile LCP | Mobile CLS | Transfer |
| --- | ---: | ---: | ---: | ---: | ---: |
| Home | 4.36s | 0.000 | 9.14s | 0.066 | 1.80-1.83 MB |
| Shop | 2.37s | 0.010 | 11.44s | 0.000 | 1.68-1.73 MB |
| Product | 2.30s | 0.004 | 11.33s | 0.020 | 1.53-1.57 MB |
| Checkout | 2.08s | 0.117 | 8.18s | 0.641 | 1.31 MB |

Largest production resources before the change:

- `storefrontApi-*.js`: about 260 KB transfer, 1.49 MB decoded.
- `vendor-core-runtime-*.js`: about 233 KB transfer, 778 KB decoded.
- `vendor-mui-*.js`: about 190 KB transfer, 681 KB decoded.
- `vendor-data-utils-*.js`: about 116 KB transfer, 448 KB decoded.
- `storefront-*.css`: about 109 KB transfer, 1.21 MB decoded.

## Changes

- Moved marketplace preview sample data out of the production storefront startup path.
- Deferred marketplace preview cart seeding, preview product breadcrumbs, preview reviews, preview collections, related products, bundle products, and post-purchase recommendations behind dynamic imports.
- Removed the static admin `apiClient` import from the public `storefrontApi` module; wallet-only calls now import it on demand.
- Replaced the product gallery zoom dialog import from the shared Base UI wrapper with Radix Dialog to avoid pulling Base UI into the product gallery path.
- Lazy-loaded the cart upsell host so the cart drawer does not load upsell recommendation logic before the drawer is opened.
- Added `storefrontRuntimeImports.test.ts` to guard the production startup path from reintroducing static preview-data or admin-client imports.

## Local Build Result

Built with the same minifier settings used by production deploy: `VITE_BUILD_MINIFY=esbuild`, `VITE_DISABLE_COMPRESSION=true`, and `NODE_OPTIONS=--max-old-space-size=8192`.

Notable local chunk result after this pass:

- `StorefrontShell-*.js`: 484 KB, down from about 820 KB after the first split attempt and below the earlier 518 KB local reference.
- `marketplaceSampleData-*.js`: 312 KB minified chunk, now loaded only by preview-specific dynamic paths.
- Remaining biggest storefront constraints are shared CSS (`storefront-*.css` about 1.21 MB decoded) and shared vendor/runtime chunks.

## Second Pass - CSS And Catalog Payload

After the startup JavaScript split reached production, the next bottlenecks were the shared storefront CSS and the public product-list API payload. Production `/api/v1/public/products?limit=12&companyId=flora.maxp.online` was about 787 KB raw for the first 12 products before this pass. The largest avoidable contributors were product embeddings, internal product fields, variant metadata, variant timestamps, and variant cost data.

Changes in this pass:

- Scoped Tailwind's storefront stylesheet scan with `source(none)` plus explicit storefront runtime sources. This keeps admin and unrelated app class names out of the public storefront CSS bundle.
- Added public Prisma selects for products, categories, and variants instead of returning the full database product row.
- Removed public exposure of product embeddings, product cost, deleted/internal sync fields, variant cost, variant metadata, and variant timestamps from product-list and recommendation responses.
- Kept full product detail behavior intact for public storefront features that still need product metadata, while still excluding embeddings/cost/internal fields.
- Truncated product descriptions in summary/list responses to reduce first-page catalog transfer without changing product detail copy.
- Added regression expectations to the storefront public-route integration test so heavy/internal fields do not silently come back in list or detail responses.

Local production-like build after CSS scoping:

- `storefront-*.css`: about 669 KB decoded, down from about 1.21 MB decoded.
- `StorefrontShell-*.js`: about 484 KB, unchanged from the previous JavaScript split.

## Post-Deploy Production Result

Deployed commit `2625ef1a9` to `main` through GitHub Actions run `25239025784`.

Production `/api/v1/public/products?limit=12&companyId=flora.maxp.online` after deploy:

- Raw response file: about 404 KB, down from about 787 KB before this pass.
- First 12 products no longer include `embedding`, `cost`, or `metadata` in list responses.
- 381 returned variants no longer include `cost` or `metadata`.

Cold-cache Playwright measurements after deploy:

| Page | Desktop LCP | Desktop CLS | Desktop Transfer | Mobile LCP | Mobile CLS | Mobile Transfer |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Home | 4.28s | 0.043 | 1.61 MB | 8.28s | 0.066 | 1.59 MB |
| Shop | 1.94s | 0.038 | 1.40 MB | 9.05s | 0.000 | 1.35 MB |
| Product | 2.06s | 0.008 | 1.36 MB | 9.93s | 0.020 | 1.32 MB |
| Checkout | 1.34s | 0.111 | 1.14 MB | 6.97s | 0.641 | 1.14 MB |

Production smoke coverage passed on desktop and mobile:

- Shop product click reaches `/product/kotshy-soan` and renders the product without a refresh workaround.
- Scrolling to lower product sections completes with no visible storefront skeleton placeholders.
- `ضيفيه للسلة` opens the cart drawer.
- Header brand link returns to `/`.
- Desktop header shop link and mobile drawer menu shop link navigate to `/shop` and render shop content in-app.
- No page console errors were observed during the smoke pass.

## Third Pass - Story Image Deferral And Proxying

The next production home bottleneck was a large KHEMET story image loaded directly from `lh3.googleusercontent.com` even though the section sits below the first viewport. That image transferred about 359 KB during the initial home load and competed with the first-fold hero and storefront JavaScript.

Changes in this pass:

- Updated `StoryParallax` split-editorial images to render through `StorefrontProductImage`.
- Added responsive WebP proxy descriptors for story images: 360, 520, 720, and 960 pixel variants.
- Marked split-editorial story images as `loading="lazy"` so below-fold editorial media does not join the first home waterfall.
- Routed standard story background images through the optimized `/api/proxy-image` URL builder.
- Added `StoryParallax.images.test.tsx` to guard the split-editorial image proxy/lazy behavior and the standard background proxy URL.

Post-deploy result for commit `a1e0ca20f` through GitHub Actions run `25239814456`:

- Home desktop transfer dropped from about 1.61 MB to about 1.27 MB.
- Home mobile-fast4g transfer dropped from about 1.59 MB to about 1.25 MB.
- The story image is now requested through `/api/proxy-image` at about 16 KB instead of the direct Google image at about 359 KB.
- No direct `lh3.googleusercontent.com` story image request appears in the browser resource list; the original Google URL only appears inside the encoded proxy-image query string.

Cold-cache Playwright measurements after this deploy:

| Page | Desktop LCP | Desktop CLS | Desktop Transfer | Mobile LCP | Mobile CLS | Mobile Transfer |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Home | 1.96s | 0.000 | 1.27 MB | 7.98s | 0.058 | 1.25 MB |
| Shop | 2.01s | 0.000 | 1.40 MB | 8.96s | 0.080 | 1.37 MB |
| Product | 2.57s | 0.000 | 1.36 MB | 9.80s | 0.035 | 1.32 MB |
| Checkout | 1.38s | 0.000 | 1.14 MB | 6.66s | 0.273 | 1.14 MB |

Production smoke coverage after the deploy passed on desktop and mobile:

- Home loads with no console errors.
- Header or mobile menu shop navigation reaches `/shop` in-app.
- Shop product card opens `/product/kotshy-soan`.
- Header brand link returns to `/`.
- `ضيفيه للسلة` opens the cart drawer.
- Checkout loads after the cart flow.

## Fourth Pass - PDP Critical Path And Hero Image Budget

The next diagnosis showed that mobile shop/product LCP was no longer dominated by raw image bytes. The first shop product image was only about 6 KB and the PDP hero image about 86 KB, but both started late because product data and page-section JavaScript were still competing in the first storefront waterfall.

Cold-cache diagnosis before this fourth pass:

| Page | Mobile LCP | CLS | LCP Element |
| --- | ---: | ---: | --- |
| Shop | 9.02s | 0.080 | First product card image, proxied WebP |
| Product | 9.61s | 0.036 | PDP hero image, proxied WebP |
| Checkout | 6.52s | 0.000 | Header brand text |

Changes in this pass:

- Removed the static `framer-motion` import from `ProductInfo`; lightweight React wrappers preserve the final visual states for the existing animated blocks without loading the 350 KB local framer vendor chunk on PDP startup.
- Deferred `GlobalConversionHost` and `StickyAddToCartHost` until after a short idle delay, scroll, key intent, or a completed click, so conversion widgets no longer compete with initial product/gallery rendering without re-rendering between pointer down/up on product cards.
- Tightened PDP hero image descriptors from 640/960/1280/1600 to 520/720/960/1280, lowered hero quality from 80 to 78, and added a mobile `sizes` cap so high-DPR phones choose the 960 px hero candidate instead of 1280 px where appropriate.
- Matched the bootstrap PDP hero preload to the same 520/720/960/1280 descriptors, 960 px fallback, quality 78, and mobile `sizes` cap so cold mobile loads no longer request both the old 1280 px preload and the rendered 960 px hero image.
- Extended the storefront runtime import guard to cover `ProductInfo`, gallery hero descriptors, and deferred conversion hosts.

Local verification before deploy:

- `node .\node_modules\vitest\vitest.mjs run src/storefront/__tests__/storefrontRuntimeImports.test.ts src/storefront/__tests__/productInfoConversionModules.test.ts src/storefront/__tests__/khemetHeaderInteractions.test.tsx src/storefront/__tests__/PdpCheckout.test.tsx` passed: 15 tests.
- `node .\node_modules\vitest\vitest.mjs run src/storefront/__tests__/storefrontRuntimeImports.test.ts src/storefront/__tests__/productInfoConversionModules.test.ts` passed: 10 tests.
- `npm run build` from `frontend/` passed. The local build emitted `ProductInfo-BfkE5hmT.js` without a `vendor-framer-motion` import.

## Fifth Pass - Shop Catalog Warmup

The next production diagnosis still showed `/shop` mobile LCP around 9.1s under the synthetic slow-mobile profile. The LCP element was the first KHEMET product card image, and the image itself was already small; the remaining delay came from the initial product-list query and the catalog section chunk joining the waterfall late.

Changes in this pass:

- Shared the storefront products query key and fetcher between `useProducts` and bootstrap prefetching so warm data uses the exact React Query cache key that `ProductGrid` later reads.
- Kept the live product fetcher in a lightweight storefront service so the bootstrap warmup does not pull marketplace preview data into the public startup chunk.
- Added a `/shop` and `/sale` bootstrap catalog warmup that runs after storefront settings resolve, without blocking the initial React render.
- Matched the KHEMET `/shop` first-page limit to the theme's 48-product grid so the warm request is reused instead of creating a second catalog request.
- Skipped early product prefetch when a category slug is present, because category routes first resolve the category token to the real category id.
- Added a high-priority preload for the first catalog product image using the same 240/320/420/520 WebP descriptors, quality 72, and mobile `sizes` as the KHEMET product cards.
- Extended the storefront runtime import guard to catch regressions in shop catalog warmup and card-image preload descriptors.

Post-deploy production result for commit `eca1a9c40` through GitHub Actions run `25242275920`:

- Shop product-card navigation, PDP lower-section loading, header brand navigation, add-to-cart drawer opening, and checkout loading passed on desktop and mobile.
- PM2 showed `maxp-backend` and `maxp-webhook-worker` online after deploy, and public storefront pages returned HTTP 200.
- Synthetic slow-mobile shop LCP improved slightly from about 9.1s to about 8.8s, but checkout with a real cart still showed CLS around 0.18.

## Sixth Pass - Checkout Mobile CLS Stability

The checkout CLS diagnosis with a real cart showed the order summary moving on mobile. The checkout composer rendered the prioritized sidebar twice: once in a mobile-only wrapper above the grid and again as the desktop sidebar. The mobile-only wrapper could disappear from the measured layout while the grid settled, causing a visible layout shift.

Changes in this pass:

- Removed the duplicate mobile-only checkout sidebar wrapper.
- Kept one sidebar render and ordered it first on mobile with `order-1 lg:order-2`.
- Ordered the main checkout content second on mobile with `order-2 lg:order-1`.
- Reserved the KHEMET order-summary height while the persisted cart hydrates from `localStorage`, preventing the summary from appearing late above the form and pushing the checkout fields down.
- Matched the lazy `order-summary` Suspense skeleton to the same mobile height budget so the real summary chunk does not expand above the checkout fields after load.
- Added a runtime source guard so future checkout composer changes do not reintroduce the duplicate `mb-5 lg:hidden` sidebar pattern.

## Seventh Pass - Storefront Fonts And Preload Budget

The next slow-mobile production diagnosis showed Home/Shop/Product still loading non-critical storefront dependencies before first meaningful paint. The visible LCP elements were already small enough: Home was the KHEMET hero heading, Shop was a product-card WebP image, and PDP was the optimized hero WebP. The remaining pressure was from the storefront modulepreload list and global Google Fonts.

Cold-cache slow-mobile diagnosis before this pass:

| Page | Mobile LCP | CLS | Transfer | LCP Element |
| --- | ---: | ---: | ---: | --- |
| Home | 7.88s | 0.058 | 1.31 MB | Hero heading |
| Shop | 8.40s | 0.106 | 1.49 MB | Product-card image |
| Product | 9.52s | 0.036 | 1.28 MB | PDP hero image |

Changes in this pass:

- Removed the shared Inter + IBM Plex Arabic Google Fonts stylesheet from `index.html` so public storefront routes do not load admin shell fonts before LCP.
- Moved the admin shell Google Fonts link injection into the admin-only bootstrap path in `main.tsx`.
- Switched storefront defaults to fast system font fallbacks, then let active theme fonts load through `ThemeProvider`.
- Reduced storefront theme Google Fonts to weights `400;600` and changed `font-display` to `optional` so late font swaps do not hold the hero heading as the LCP candidate.
- Stopped treating Inter and IBM Plex Arabic as bundled storefront fonts; themes that genuinely use them can still request them through the active-theme loader.
- Made product preview-only admin API helpers import `config/environment` and `tokenManager` on demand instead of putting them in the public PDP startup path.
- Added Vite modulepreload filtering for storefront bootstrap chunks so deferred MUI/Base UI, toast, framer-motion, cart upsell, sticky CTA, global conversion, preview data, and admin-client chunks are not preloaded during the first storefront waterfall.
- Extended that filtering to dependency groups whose `deps` include `StorefrontBootstrap` or `StorefrontShell`, because Vite may call `resolveDependencies` with the main index chunk as `filename` while the storefront bootstrap graph is only visible inside the dependency list.
- Split Base UI into `vendor-base-ui` instead of bundling it with MUI/Emotion, avoiding a circular `vendor-ui-framework -> vendor-mui` dependency that pulled the larger MUI chunk into public storefront startup.
- Deferred the generic UI-framework preload too; it is not a static storefront-shell import, and preloading it was enough to trigger the Base UI chunk before any matching overlay/control was needed.
- Deferred the storefront toast and conversion host idle fallbacks to 8s while waking on explicit user intent (`click`, `pointerdown`, `touchstart`, `wheel`, or `keydown`) instead of generic `scroll`; this avoids programmatic route scroll resets loading the deferred UI chunks before mobile LCP.
- Isolated storefront theme preset modules into a dedicated `storefront-theme-presets` chunk so preset JSON and theme helpers do not share an `index-*` chunk with admin settings modules that import MUI and the admin API client.
- Replaced the storefront runtime's static admin analytics service import with a lightweight public storefront analytics client, so visit and conversion tracking no longer pull `apiClient`, `tokenManager`, toast handling, or MUI into first storefront startup.
- Split `react-datepicker` and `date-fns` out of the shared data-utils chunk, so storefront startup can use TanStack Query, Axios, and Zustand without `vendor-data-utils` importing datepicker floating/MUI helpers.
- Split `clsx` and `tailwind-merge` into a tiny `vendor-class-utils` chunk, so PDP `cn(...)` calls do not pull `vendor-mui` into the critical product-page waterfall.

Local verification before deploy:

- `storefrontRuntimeImports.test.ts` passed with guards for admin/client imports, route-aware fonts, optional theme fonts, deferred toast, and storefront modulepreload filtering.
- `npm run build` passed with `VITE_BUILD_MINIFY=esbuild`, `VITE_DISABLE_COMPRESSION=true`, and `NODE_OPTIONS=--max-old-space-size=8192`.
- Generated `dist/index.html` no longer includes the shared Google Fonts stylesheet.
- The storefront dynamic import preload list no longer includes `vendor-ui-framework`, `vendor-base-ui`, `vendor-mui`, `vendor-framer-motion`, `vendor-toast`, `apiClient`, or `tokenManager`; those chunks remain available for deferred/admin/preview paths.
- Local dist inspection after the class-helper split showed `ProductInfo-*.js` imports `vendor-class-utils-*` but no longer imports `vendor-mui-*` or `vendor-date-utils-*`.

## Verification

- `npm run build` from `frontend/` passed with production-like build env.
- `npx vitest run src/storefront/__tests__/storefrontRuntimeImports.test.ts src/storefront/__tests__/marketplaceApps.test.ts src/storefront/__tests__/CartDrawer.khemet.test.tsx src/storefront/__tests__/PdpCheckout.test.tsx` passed.
- `node --check backend/routes/publicProductsRoutes.js` passed.
- `node F:/max_p_new/max_p_new/backend/node_modules/jest/bin/jest.js tests/integration/storefrontPublicRoutes.test.js --runInBand` passed: 17 tests.
- `node F:/max_p_new/max_p_new/frontend/node_modules/vitest/vitest.mjs run src/storefront/__tests__/storefrontRuntimeImports.test.ts src/storefront/__tests__/khemetHeaderInteractions.test.tsx src/storefront/__tests__/CartDrawer.khemet.test.tsx src/storefront/__tests__/PdpCheckout.test.tsx` passed: 9 tests.
- `node F:/max_p_new/max_p_new/frontend/node_modules/vitest/vitest.mjs run src/storefront/__tests__/StoryParallax.images.test.tsx src/storefront/__tests__/productImages.test.ts` passed: 12 tests.
- Production-like frontend build still passed after the story-image pass.

## Eighth Pass - Swan Placeholder Image Weight

The final production smoke showed the KHEMET/Swan UX path was functional, but the Home route still had a heavy cold transfer budget because fallback shoe placeholders were multi-megabyte image files.

Production measurements before this pass:

| Page | Desktop LCP | Desktop Transfer | Mobile LCP | Mobile Transfer |
| --- | ---: | ---: | ---: | ---: |
| Home | 1.48s | 9.58 MB | 1.51s | 7.54 MB |
| Shop | 1.63s | 1.03 MB | 1.58s | 1.01 MB |
| Product | 1.49s | 0.99 MB | 1.38s | 0.93 MB |
| Checkout | 1.20s | 0.79 MB | 1.09s | 0.79 MB |

The largest Home resources were:

- `/placeholders/luxury-shoes/flats.png` around 2.44 MB.
- `/placeholders/luxury-shoes/sneaker-white.png` around 2.18 MB.
- `/placeholders/luxury-shoes/hero.png` around 2.11 MB.
- `/placeholders/luxury-shoes/pump-black.png` around 2.03 MB.

Changes in this pass:

- Recompressed the Swan/KHEMET fallback shoe placeholders while keeping the same public URLs so existing section manifests, theme JSON, and saved builder content continue to resolve.
- Reduced `flats.png` from 2.51 MB to 347 KB.
- Reduced `hero.png` from 2.16 MB to 190 KB.
- Reduced `pump-black.png` from 2.08 MB to 160 KB.
- Reduced `sneaker-white.png` from 2.24 MB to 220 KB.
- Reduced `sneakers.png` from 2.24 MB to 251 KB.
- The expected effect is a Home transfer reduction of roughly 7.7 MB on cold loads when these placeholders are used.

Follow-up in the same pass:

- Production verification showed Cloudflare was still serving the old bare placeholder URLs from edge cache (`cf-cache-status: HIT`, age around 7.6h).
- Added a stable `?v=20260502-swan-placeholders` query to rendered `/placeholders/luxury-shoes/` image URLs in storefront sections so the compressed files are used immediately without waiting for the edge cache to expire.
- Covered the helper with `productImages.test.ts` and verified the relevant storefront build locally.

## Follow-up Candidates

- Keep monitoring checkout CLS on empty-cart redirects and mobile viewport transitions.
- Continue chipping away at shared `vendor-core-runtime`, `StorefrontShell`, and storefront image/CSS startup weight.
- Investigate why mobile product and shop LCP remain near 9-10s under the synthetic fast4g throttle despite lower transfer size.

## Ninth Pass - Below-Fold Decorative Image Deferral

Follow-up production measurements on 2026-05-03 showed that the previous image compression and cache-busting worked, but Home still spent first-load transfer on KHEMET placeholder images that sit far below the first viewport. Native `loading="lazy"` was not strict enough on desktop: Chrome still requested the offer/fit placeholder images around 2,900-4,500 px down the page during the initial waterfall.

Production measurement before this pass:

| Page | Desktop LCP | Desktop Transfer | Mobile LCP | Mobile Transfer |
| --- | ---: | ---: | ---: | ---: |
| Home | 3.98s synthetic run, 1.28s focused LCP trace | 1.62 MB | 1.41s | 1.63 MB |
| Shop | 1.60s | 1.08 MB | 1.31s | 1.23 MB |
| Product | 1.52s | 1.05 MB | 1.42s | 1.04 MB |
| Checkout | 1.02s | 0.79 MB | 1.04s | 0.79 MB |

The Home LCP candidate in the focused trace was the KHEMET hero heading, not the below-fold shoe images. The avoidable cost was bandwidth contention: below-fold decorative placeholders such as `/placeholders/luxury-shoes/flats.png?v=20260502-swan-placeholders`, `sneaker-white.png`, and `hero.png` were already loaded before the user reached those sections.

Changes in this pass:

- Added an opt-in `deferUntilVisible` mode to `StorefrontProductImage`.
- In deferred mode, the image element keeps its layout and accessibility attributes but omits `src`, `srcset`, and `sizes` until an `IntersectionObserver` sees it approaching the viewport.
- Added a safe fallback that loads immediately when `IntersectionObserver` is unavailable.
- Applied the deferred mode only to below-fold KHEMET offer campaign images and the shoe-fit finder images, leaving product cards, hero media, cart thumbnails, and PDP images unchanged.
- Added `StorefrontProductImage.deferred.test.tsx` to guard the no-src-until-visible behavior and the no-IntersectionObserver fallback.

Expected result:

- Home first-load transfer should drop by roughly the bytes of the deferred below-fold placeholder images when the visitor does not immediately scroll.
- The visible first viewport should stay unchanged because this pass does not defer hero, product-grid, or checkout media.

## Tenth Pass - Storefront Shell Startup Split

Follow-up measurements after the ninth pass showed the large decorative placeholder requests were removed from the first Home waterfall, but storefront startup still had a heavy JavaScript dependency chain:

- `StorefrontBootstrap` imported `StorefrontShell` directly.
- That meant the shell, theme registry, and shell-level dependencies had to be downloaded before the bootstrap module could render the stable loading shell.
- Checkout CLS was not consistently reproducible, but one synthetic desktop run reported `0.125`, so the next pass focused on making the startup/loading states share the same reserved layout.

Changes in this pass:

- Added `StorefrontStartupFallback` as the single storefront loading skeleton used by both the bootstrap Suspense boundary and the settings-loading state inside `StorefrontShell`.
- Converted `StorefrontShell` inside `StorefrontBootstrap` to `React.lazy(() => import("./StorefrontShell"))`.
- This keeps the initial storefront bootstrap chunk small and allows settings/catalog/product prefetch work to start without a static dependency on the full shell module.
- Updated `storefrontRuntimeImports.test.ts` to protect this split and the shared fallback.

Local verification before deploy:

- Focused storefront runtime import test passed: `7/7`.
- Production-like frontend build passed with `VITE_BUILD_MINIFY=esbuild` and `VITE_DISABLE_COMPRESSION=true`.
- The production build now emits a dedicated `StorefrontBootstrap` chunk around 15 KB, with `StorefrontShell` staying in its own deferred chunk.
