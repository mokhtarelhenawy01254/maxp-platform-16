# POS Image Performance Fix - 2026-05-01

## Summary

The POS product grid was loading original upload images for every product card. On first load, `/pos` requests up to 200 products, so the browser could start many large image downloads at once.

## Change

- Added reusable upload image helpers in `frontend/src/utils/imageUrl.ts`.
- Updated `frontend/src/pages/pos/PosPage.tsx` to render optimized responsive `/uploads` image variants.
- Product grid images now use a 320px fallback with 160/240/320 responsive candidates.
- Cart thumbnails now use a 96px fallback with 64/96/128 responsive candidates.
- First visible product cards are eager/high priority; later products are lazy/low priority.
- Optimized image failures fall back to the original image URL before trying the next candidate.

## Verification

- Focused Jest coverage:
  - `src/utils/__tests__/imageUrl.test.ts`
  - `src/pages/pos/__tests__/PosPage.images.test.tsx`
- Local `/pos` smoke test verified optimized product image URLs, cart thumbnails, and no browser console/page errors.
- Frontend production build passed locally.
