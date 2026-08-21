# PDP crash (React #310) + product reviews 404 — 2026-08-21

User report (AR): صفحات المتجر فيها مشاكل في التحميل والمحتوى بيتختفي على
`https://swan.maxp.online/product/Şık Sole`. Console showed `Minified React error #310`
thrown from `ProductInfo` plus a 404 on `/api/v1/public/products/:id/reviews`.

## Fix 1 — ProductInfo conditional hooks (React #310)

**Symptom**: product page renders, then the whole tree crashes and content disappears.
`Minified React error #310` = "Rendered fewer hooks than expected" — an early return
skipped hooks that a previous render had executed.

**Root cause**: commit `b37b498d` (2026-08-20 restoration sweep) introduced the
cashback-preview feature in
`apps/frontend/src/storefront/sections/ProductInfo.tsx` with `useState(cashbackPreview)`
+ its `useEffect` placed **after** the component's `if (isLoading)` / `if (error || !product)`
early returns. First render exits during loading (hooks skipped), next render with data
runs them → hook-count mismatch → crash. This is the third conditional-hooks bug in this
file (see `7ac12ca2`, `c4ea45a0`, `1217f0f3`).

**Fix**: moved both hooks above the early returns. The effect now computes
`effectivePrice` internally (from `selectedVariant` / narrowed `product`) and its deps use
`selectedVariant` (the same `useMemo` that drives `activePrice`, so re-fetch behavior is
unchanged). The `activePrice`/`displayPrice`/`discount` derivations stay where they were
(they are not hooks) and keep their original types — tsc verified zero new errors vs the
pre-fix baseline.

**Rule for this file**: ALL hooks must run before the loading/error early returns in
`ProductInfo`. When adding a new `useState`/`useEffect`, place it above
`if (isLoading)` (~line 1882).

## Fix 2 — reviews 404 (route shadowing)

**Symptom**: `GET /api/v1/public/products/:id/reviews` (and `/back-in-stock`) returned
404 `{"error":"العرض التقديمي غير موجود"}` for **every** product (slug or numeric id).
The storefront `ReviewsSection` swallows the failure and always renders "no reviews".

**Root cause**: in `server.js`, `publicProductReviewRoutes` (mounted at `/api/v1/public`,
routes `/products/:productId/reviews`) was mounted AFTER `publicProductsSimpleRoutes`
(mounted at `/api/v1/public/products`) whose catch-all
`router.get('/:id/:presentationSlug')` matches `products/<id>/reviews` first and answers
404 before the reviews router ever sees the request. Unit/integration tests mount the
routers individually, so the production mount order was never covered.

**Fix**: `app.use("/api/v1/public", publicProductReviewRoutes)` now mounts immediately
before `publicProductsSimpleRoutes` in `server.js`. No path conflicts: the reviews router
only matches literal `products/<x>/reviews`, `products/<x>/back-in-stock`, and
`reviews/<id>/helpful`.

**Verification**: live curl after deploy — reviews endpoint returns
`{"success":true,...}` for both slug (`Şık Sole`) and numeric id.

## Fix 3 — manifest.webmanifest 401 on tenant subdomains (follow-up, same day)

**Symptom**: browser console shows `manifest.webmanifest 401` +
`Manifest fetch ... failed, code 401` twice on every tenant storefront page load.

**Root cause**: the tenant wildcard nginx block (`*.maxp.online`) serves known static
extensions (`css|js|json|svg|...`) directly from `/var/www/frontend2/dist`, but
`webmanifest` was not in that list — so `/manifest.webmanifest` fell into
`location /` which proxies to the backend (needed for per-company SEO shells), and the
backend's `globalAuthentication` middleware rejects it (`isPublicStorefrontShellRequest`
returns false for any path with an extension → 401 `AUTHENTICATION_REQUIRED`). The
main domain served it fine only because its `location /` does `try_files $uri` from dist.

**Fix**: added `webmanifest` to the static-extension regex in BOTH server blocks of
`nginx_configs/maxp.online.conf`. The deploy pipeline syncs + reloads nginx configs
automatically (deploy-remote.sh "Syncing Nginx configs" step).

## Fix 4 — bad-precaching-response on index.html (follow-up, same day)

**Symptom**: console shows `sw-v4.js Uncaught (in promise) bad-precaching-response ::
[{"url":"https://swan.maxp.online/index.html","status":401}]` after the fixes above.

**Root cause (two layers)**:
1. An OLD sw-v4.js (built 2026-08-19, BEFORE the `globIgnores` that removes index.html
   from the precache manifest) was still being served — by **Cloudflare's edge cache**
   (`Age: ~25h`, `Cache-Control: max-age=2592000` from nginx's static-assets block).
   The origin file was already correct (159 entries, no index.html). `/index.html` on
   tenant subdomains 401s at the backend (extension paths are never "public storefront
   shells"), so the stale SW's install aborted with bad-precaching-response.
2. nginx served sw-v4.js with the same 30-day immutable-ish cache as hashed assets —
   but the SW file is NOT content-hashed; it must always be revalidated.

**Fix**: `location = /sw-v4.js` (exact match beats the extension regex) with
`Cache-Control: public, max-age=0, must-revalidate` in both server blocks of
`nginx_configs/maxp.online.conf`. After ONE manual Cloudflare purge the edge stops
caching the SW entirely; SW updates then work on every deploy.

**Manual step still required (no CF API token configured anywhere)**: purge the
Cloudflare cache once (dashboard → Caching → Purge Everything, or at least
`https://swan.maxp.online/sw-v4.js` + `https://maxp.online/sw-v4.js`). This also
clears the older stale-HTML issue (index-DRFVyxfT).

## Not fixed (known, out of scope)

- `ws://localhost:8081` WebSocket failure — from a local dev hot-reload browser
  extension (`refresh.js` + `index.iife.js` content script), not from the storefront
  bundle; invisible to real customers.
