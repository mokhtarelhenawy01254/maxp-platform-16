# Merchant Portal UAT - 2026-05-02

## Result

- Status: `UAT_COMPLETE`
- Passed: `36/36`
- Environment: local development
- Raw report: `backend/tmp/codex-affiliate-full-uat-20260501225251.json`

## Fresh Company

- Company: `Codex Affiliate UAT 20260501225251`
- Company id: `cmonidiv00000vpes5aogo9j2`
- Company slug: `owner-codex-affiliate-full-uat-20260501225251`

## Test Credentials

- Owner: `owner+codex-affiliate-full-uat-20260501225251@codex-uat.local`
- Affiliate: `affiliate+codex-affiliate-full-uat-20260501225251@codex-uat.local`
- Auto merchant: `merchant-auto+codex-affiliate-full-uat-20260501225251@codex-uat.local`
- Manual merchant: `merchant-manual+codex-affiliate-full-uat-20260501225251@codex-uat.local`
- Password: `CodexUat#20260501225251`

## Verified Scenarios

- Company owner creates a fresh company, opens affiliate settings, saves commission, platform margin, cookie duration, and custom terms.
- Public affiliate signup is linked to a specific company slug and rejected when the company/program is invalid or inactive.
- Public merchant signup is linked to a specific company slug and now creates a `MERCHANT` login user.
- Company admin can create a merchant with an optional portal password, producing a `MERCHANT` login user.
- Merchant portal `/api/v1/merchant-portal/me` resolves the current merchant only.
- Merchant portal products list returns only the current merchant products.
- Merchant can update its own supplier price, stock, SKU, and sync flag from the portal.
- Merchant cannot update another merchant product.
- Merchant cannot use company admin merchant APIs or affiliate settings APIs.
- Affiliate cannot use merchant portal APIs.
- Dropshipping routes an affiliate order to the correct merchants and skips a cheaper supplier when stock is insufficient.
- Auto-fulfill merchant order is fulfilled automatically.
- Manual merchant order is visible to that merchant and can be fulfilled from the merchant portal with tracking number.
- Affiliate sees orders, customers, commissions, stats, and payout flow.
- Company owner sees affiliate, merchant, and platform commissions.
- A second company owner cannot read or mutate first-company merchant, affiliate, or commission resources.

## Build Notes

- Backend syntax checks passed for changed Prisma import/runtime files.
- Latest local backend startup succeeds on port `3007`; unauthenticated `/api/v1/merchant-portal/me` returns `401` instead of `404` or crashing.
- Direct Vite build with safe Windows env returned `LASTEXITCODE=0`.
- Vite vendor chunk cycle between `vendor-ui-framework` and `vendor-mui` was resolved by keeping `clsx` in `vendor-mui`.
- Full frontend `type-check` still times out on the whole repo and was stopped to avoid exhausting local memory.

## Merchant UI Permission Follow-up

- Added a frontend merchant route guard so authenticated `MERCHANT` users can only stay in `/merchant-portal` and `/profile`; private company/admin paths redirect to `/merchant-portal`.
- Limited the merchant sidebar to portal tools only: overview, products/stock, dropshipping orders, commissions, and profile.
- Hid company switching and account settings from merchant users in the shell.
- Split `/profile` behavior by role: merchants now see a merchant account profile and tools summary, while internal users keep the existing employee HR profile.
- Browser verification passed for merchant sidebar visibility, `/profile` merchant-only content, and redirect from `/company-dashboard` to `/merchant-portal`.

## Affiliate UI Permission Follow-up

- Browser testing confirmed an affiliate weakness before the fix: login landed on `/company-dashboard`, the sidebar exposed unrelated company/account sections, and direct private paths like `/orders`, `/settings`, `/customers`, and `/merchant-portal` were reachable in the frontend.
- Added an affiliate frontend route guard so authenticated `AFFILIATE` users can only stay in affiliate-owned paths and `/profile`; private company/admin/merchant paths redirect to `/affiliates/dashboard`.
- Updated post-login routing so affiliates land directly on `/affiliates/dashboard`.
- Limited the affiliate sidebar to role tools only: dashboard, marketplace, products, affiliate orders, affiliate manual order creation, affiliate customers, commissions, and profile.
- Split `/profile` behavior by role for affiliates too: affiliates now see a lightweight affiliate account profile instead of the employee HR profile.
- Browser verification passed for affiliate login destination, sidebar visibility, profile content, and forbidden-route redirects.
- Read-only backend verification with the affiliate token: `/affiliates/me` and `/affiliates/orders` returned `200`; `/orders`, `/affiliate-settings`, `/merchants`, and `/merchant-portal/me` returned `403`.

## Latest Verification

- `npx eslint src\App.tsx src\components\layout\Layout.tsx src\config\sidebar.ts src\pages\merchant-portal\MerchantPortalDashboard.tsx src\pages\profile\Profile.tsx src\utils\merchantAccess.ts src\utils\__tests__\merchantAccess.test.ts src\config\__tests__\sidebar.affiliateMerchant.test.ts src\__tests__\affiliateMerchantRoutes.test.ts --ext .ts,.tsx`
- `npm test -- --runTestsByPath src\utils\__tests__\merchantAccess.test.ts src\config\__tests__\sidebar.affiliateMerchant.test.ts src\__tests__\affiliateMerchantRoutes.test.ts`
- Result: `3/3` suites passed, `12/12` tests passed.
- `npm run build` completed successfully. Remaining output is non-blocking Vite warnings for large chunks and Geist font runtime resolution.

## Complete Scenario Rerun - 2026-05-02

- Created a new UAT company: `Codex Affiliate UAT 20260502005705`.
- Raw API report: `backend/tmp/codex-affiliate-full-uat-20260502005705.json`.
- API UAT result: `36/36 PASS`.
- Browser verified owner, affiliate, merchant, public affiliate signup, and public merchant signup flows.
- Mobile smoke verified affiliate and merchant at `390x844` with no page-level horizontal overflow and no console errors.
- UX fix discovered during browser review: owner sidebar now shows `إدارة المسوقين` and `إدارة التجار` instead of untranslated labels.
