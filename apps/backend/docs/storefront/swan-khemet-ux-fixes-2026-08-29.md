# Swan / KHEMET LUXE Storefront UX Fixes

Date: 2026-08-29
Scope: `khemet-luxe-eg` theme applied to the Swan storefront (`swan.maxp.online`).

## Summary

A UX pass over the Swan/KHEMET LUXE storefront to remove repeated/placeholder
content, fix social icons, declutter the cart, and tighten the shop grid.

## Changes

### 1. Footer social icons — real brand icons instead of single-letter placeholders
- `apps/frontend/src/storefront/StorefrontShell.tsx`
- Added `renderStorefrontSocialBrandIcon(social)` which maps a social key
  (facebook, instagram, whatsapp, messenger, x/twitter, youtube, tiktok,
  snapchat, linkedin, telegram, pinterest) to its real SVG brand icon.
- Replaced the old `<span>{social[0]?.toUpperCase()}</span>` letter render in
  the signature-panel, fashion-retail and butcher footers, with a real icon and
  a letter fallback only for unknown platforms.

### 2. Footer navigation — real, meaningful links
- `apps/frontend/src/storefront/themes/khemet-luxe-eg.json`
- Reordered footer nav columns to "التسوق" / "الدار" and removed the
  semantically-wrong "قصة الصناعة -> /collections" link.
- Updated `contactRows` to the real Swan number/email and the WhatsApp social
  number (`01123087745`, `swan@h2m.com`).

### 3. Cart page — product-first, less upsell noise
- `apps/frontend/src/storefront/themes/khemet-luxe-eg.json` — cart section now
  sets `"showUpsell": false` so the inline CartUpsellHost rails are not rendered
  on the full cart page.
- `apps/frontend/src/storefront/sections/CartItems.tsx` — wardrobe-cart row now
  uses a cleaner product-forward grid (`minmax(0,1fr) auto auto auto`),
  a larger product image (`h-36 w-36 sm:h-40 sm:w-40`), rounded shadowed image
  tile and a larger product title, so the item is the hero of the cart.

### 4. Shop grid — fill available width, wider cards
- `apps/frontend/src/storefront/sections/ProductGrid.tsx`
- Shop/sale grid now uses `w-full px-0` (instead of a nested Tailwind
  `container` that centered and wasted horizontal whitespace).
- Khemet `boutique-shelf` shop grid now uses `grid-cols-2 ... xl:grid-cols-3
  2xl:grid-cols-4` so cards are wider and more prominent.
- `apps/frontend/src/storefront/engine/PageComposer.tsx`
- The shop `sidebar-left`/`sidebar-right` composer wrapper no longer re-applies
  the Tailwind `container` (max-width + auto-centering) that left large empty
  margins on wide screens. It now uses `w-full` (with the grid cells using
  `minmax(0,1fr)` for the main column) so catalog pages fill the viewport.

### 5. PDP — remove duplicated product description
- `apps/frontend/src/storefront/sections/ProductInfo.tsx`
- Added `isKhemetCareDescriptionDuplicate` for the khemet `elessi-care-buybox`
  variant: when the description is short (<=220 chars, so
  `plainDescription === shortDescription`), it is already shown in the buybox,
  so the "تفاصيل المنتج" tab and its "اقرأ المزيد" button are hidden to avoid
  showing the same text twice.

### 6. Theme rebrand — KHEMET LUXE → Swan
- `apps/frontend/src/storefront/themes/khemet-luxe-eg.json`
- Changed the theme identity (`name`, `header.brandName`) and every visible
  brand string from "KHEMET LUXE" to "Swan": SEO title template, hero eyebrow
  and panel, story-parallax copy, newsletter club name, cart title, sale hero,
  collections title and terms page — so the storefront reads as Swan instead of
  the placeholder template brand. The theme `id` / `formVariant` stay
  `khemet-luxe-eg` (internal identifiers).

## Verification
- `validate-themes.ts` passes for all 62 presets including `khemet-luxe-eg`.
- Khemet cart / featured-collections / theme-validation / ProductCard
  navigation tests pass.
- Manual browser check on `swan.maxp.online` confirmed pre-fix: duplicate PDP
  description, letter social icons, and the footer fake link were live.
