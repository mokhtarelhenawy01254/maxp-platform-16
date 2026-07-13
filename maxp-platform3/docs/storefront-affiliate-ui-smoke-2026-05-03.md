# Storefront and Affiliate UI Smoke - 2026-05-03

## Context

Local `localhost:3000` showed a Vite React overlay in `frontend/src/storefront/StorefrontShell.tsx`:

- `Expected corresponding JSX closing tag for <>`
- Later checks revealed unresolved conflict markers across multiple storefront files.

The user also requested a real browser check for the affiliate marketer pages on mobile-like screens.

## Recovery

- Removed the JSX mismatch in `StorefrontShell.tsx`.
- Resolved remaining conflict-marker blocks under `frontend/src/storefront` by keeping the current `HEAD` side.
- Verified the touched storefront TSX files with the Babel parser.
- Routed featured collection theme images through storefront image preparation, then replaced a dead Unsplash collection image in `modern-minimal.json` with the local boots placeholder.

## Final Browser Verification

Real Playwright smoke against `localhost:3000` passed on:

- Mobile viewport: `390x844`
- Desktop viewport: `1366x900`

Covered pages:

- `/store?companyId=cmoplvlwd0000van09jkw092r`
- `/store/product/aroma-diffuser-home-bundle?companyId=cmoplvlwd0000van09jkw092r`
- `/affiliates/orders`
- `/affiliates/orders/:id`
- `/affiliates/orders/create`

Ticket flow:

- Opened an order-linked affiliate support ticket from the order details page.
- Final API responses returned `201` for ticket creation on both mobile and desktop runs.

Final result:

- No Vite overlay.
- No page errors.
- No console errors.
- No HTTP 4xx/5xx responses.
- No real failed requests.
- No horizontal overflow on the tested viewports.
- Socket.IO connected.

Report and screenshots:

- `frontend/tmp/ui-real-smoke-after-storefront-fix/full-smoke-report.json`
- `frontend/tmp/ui-real-smoke-after-storefront-fix/`

## Local Tooling Note

The Browser Use in-app browser plugin could not initialize because the local `node_repl` runtime is Node `22.16.0`, while the plugin requires `>=22.22.0`. Verification used Playwright directly from the frontend workspace instead.

## Follow-up Frontend Interaction Smoke

After the first pass, a stricter marketer-facing interaction smoke was run against the real local UI on:

- Mobile viewport: `390x844`
- Desktop viewport: `1366x900`

Covered interactions:

- Opened `/affiliates/orders` as the seeded affiliate marketer.
- Clicked the visible `عرض` action to open the seeded order details page.
- Filled the order-ticket form and created an order-linked ticket.
- Clicked `إنشاء طلب جديد` and verified the manual order page shows the company product.
- Opened the storefront product page and clicked `أضف إلى السلة`.
- Scrolled the product page before screenshots so lazy/visual assets finished loading.

Result:

- Ticket creation returned `201` on both mobile and desktop.
- No Vite overlay.
- No page errors.
- No console errors.
- No HTTP 4xx/5xx responses.
- No failed requests.
- No horizontal overflow.
- No visible unloaded images or skeleton placeholders after visual settling.
- Socket.IO connected.

One desktop `GET /api/v1/health` request was aborted during route transition; it was tracked separately as a benign navigation abort and did not block the smoke.

Follow-up report and screenshots:

- `frontend/tmp/affiliate-frontend-interaction-smoke/report.json`
- `frontend/tmp/affiliate-frontend-interaction-smoke/`

During this follow-up, the affiliate sidebar raw key `sidebar.referrals` was found again in the local branch and fixed in Arabic and English sidebar translations.
