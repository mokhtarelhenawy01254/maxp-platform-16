# Swan KHEMET LUXE Performance Pass - 2026-05-01

## Scope

- Production storefront: `https://swan.maxp.online`
- Theme: `khemet-luxe-eg`
- Change scope: shared storefront theme/runtime code only. No Swan company settings or product data were changed.

## Pre-Fix Production Findings

- Mobile home LCP was about `3.9s`; the largest above-fold hero image was loaded without explicit priority.
- Shop/category page CLS was high (`~0.73` mobile, `~0.32` desktop) because the product grid expanded after the footer had already entered the viewport.
- PDP gallery preloaded an optimized product image, then rendered the original upload for the main hero image, causing unnecessary image transfer.
- KHEMET cart drawer already had cart upsell enabled, but the drawer width left limited space for recommendations on desktop.

## Fixes

- KHEMET cinematic hero image now uses the shared storefront image component with eager/high-priority loading and responsive upload optimization when the source is local.
- PDP hero gallery now renders optimized responsive WebP upload variants instead of forcing the original upload.
- Product gallery image candidates now align with the existing PDP preload dimensions/quality to avoid duplicate hero downloads.
- KHEMET shop/sale product grids now reserve more loading height and use a full skeleton set, reducing layout shift while products load.
- KHEMET shop loading skeletons now mirror hidden shop headers/toolbars on mobile, preventing the product grid from jumping upward when lazy sections finish loading.
- KHEMET shop/sale product card image priority is mobile-first, keeping only the most important first images high priority.
- KHEMET cart drawer max width increased from `34rem` to `40rem` so cart items and upsell modules have more usable desktop space.

## Verification

- `npx vitest run src/storefront/__tests__/productGallery.test.tsx src/storefront/__tests__/productImages.test.ts`
- `npx vitest run src/storefront/__tests__/pageComposer.test.tsx src/storefront/__tests__/productGallery.test.tsx src/storefront/__tests__/productImages.test.ts`
- `npm run build`

## Follow-Up Notes

- The homepage still depends on externally hosted Google/AIDA imagery in Swan content. Code can prioritize it, but replacing it with local optimized uploads in the admin would further reduce transfer size.
- Content/social placeholders should be reviewed in Swan settings by the store owner or admin: Instagram/Facebook/WhatsApp links need real brand URLs if they are still placeholders.
