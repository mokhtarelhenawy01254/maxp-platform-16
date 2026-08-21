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

## Not fixed (known, out of scope)

- `manifest.webmanifest` 401 on tenant subdomains — documented known issue (see
  `vite.config.ts` `globIgnores` comment); cosmetic, does not affect rendering.
- `ws://localhost:8081` WebSocket failure — from a local dev hot-reload browser
  extension, not from the storefront bundle.
