# POS Image Performance Fix - 2026-05-01

## Problem

`/pos` loaded the first image for every product card as the original upload URL. With up to 200 products requested on first load, the browser could start many full-size product image downloads at once.

## Fix

- Added generic upload image helpers in `src/utils/imageUrl.ts` for optimized `/uploads/*` URLs.
- Updated `src/pages/pos/PosPage.tsx` to render product cards with responsive thumbnail URLs:
  - product grid: `w=320&q=70`
  - cart thumbnails: `w=96&q=68`
- Added `srcSet`, `sizes`, `decoding="async"`, eager loading only for the first visible products, and lazy loading for later products.
- Kept fallback behavior: if an optimized variant fails, the original image URL is attempted before moving to the next candidate.

## Verification

- `npm test -- --runTestsByPath src/utils/__tests__/imageUrl.test.ts src/pages/pos/__tests__/PosPage.images.test.tsx`
- `node tmp\pos-ui-smoke.mjs` against local Vite + POS mock API
  - rendered `/pos` with 18 product images
  - verified product image `src`, `srcSet`, `sizes`, `loading`, `decoding`, and `fetchpriority`
  - verified cart thumbnail URLs after adding a product
  - captured `artifacts/pos-ui-test-2026-05-01.png`
- `npm run build`

`npm run type-check` still fails on pre-existing repository-wide TypeScript issues outside the POS/image helper changes.
