# KHEMET Mobile PDP UX Improvements - 2026-05-02

## Scope

Focused mobile product-page and cart-drawer refinements for the KHEMET LUXE theme, based on the Swan product page audit.

## Changes

- Enabled compact mobile product-detail spacing for the KHEMET PDP theme settings.
- Reduced the mobile top gap in the shared `product-detail` page composer when `compactMobileLayout` is enabled.
- Added a compact trust strip near the KHEMET buybox price so shipping, exchange, and material cues appear earlier.
- Refined the trust strip from bordered pills into a lighter icon-and-text row with subtle dividers.
- Expanded gallery arrow tap targets and dot indicator tap areas on mobile.
- Restored the mobile gallery image counter for the KHEMET showroom gallery.
- Moved KHEMET mobile gallery dots onto the image surface and removed the extra mobile padding below the gallery.
- Removed the visible dot-container pill so KHEMET mobile gallery indicators float directly over the photo.
- Added product context to the mobile sticky add-to-cart bar.
- Hid the KHEMET sticky add-to-cart bar while the inline quick-order form is visible, preventing CTA overlap.
- Removed the duplicated KHEMET quick-order header, shortened the form lead-in to a single title, and gave name and phone their own full-width mobile rows.
- Compacted the empty reviews state for KHEMET and added short trust chips to reduce dead space.
- Moved the KHEMET cart upsell block inside the cart's scrollable item area so the added item remains visible before recommendations.
- Reworked KHEMET cart upsells into a compact horizontal rail with smaller image cards, short copy, and two-line LTR product names.
- Compacted the KHEMET cart footer service notes into inline text instead of stacked bordered pills.
- Simplified the KHEMET mobile sticky product CTA to a full-bleed two-button bar, removing the repeated product name, price, selected options, and shipping badge.
- When the KHEMET inline quick-order form is present, suppressed only the repeated add-to-cart/buy-now buttons directly above the form.
- Moved the KHEMET quantity selector into the inline quick-order form and added an `Add to cart` action beside the order confirmation button.
- Removed the KHEMET quantity selector from the mobile inline form while keeping the form action pair visible.
- Unframed the KHEMET mobile inline quick-order form so fields align with the mobile content edge instead of sitting inside a rounded card.
- Fixed KHEMET Arabic review rows so avatars, stars, reviewer names, and copy start from the right in the story-grid review layout.
- Fixed the KHEMET product-page header brand link so tapping `KHEMET LUXE` performs a document navigation back to the storefront home instead of leaving the PDP mounted after the URL changes.
- Centralized storefront header brand-home links behind `StorefrontHomeLink`, so current and future header variants share the same home URL and document-navigation guard.

## Verification

- `node -e "JSON.parse(...khemet-luxe-eg.json...)"` passed.
- `npm run validate:themes` passed for all 60 storefront themes.
- `npx vitest run --environment jsdom src/storefront/__tests__/pageComposer.test.tsx src/storefront/__tests__/productGallery.test.tsx src/storefront/__tests__/PdpCheckout.test.tsx src/storefront/__tests__/khemetHeaderInteractions.test.tsx` passed: 4 files, 18 tests.
- After moving the dots overlay, `npm run validate:themes` passed again and `npx vitest run --environment jsdom src/storefront/__tests__/productGallery.test.tsx src/storefront/__tests__/pageComposer.test.tsx src/storefront/__tests__/PdpCheckout.test.tsx` passed: 3 files, 16 tests.
- After removing the dot container, `npx vitest run --environment jsdom src/storefront/__tests__/productGallery.test.tsx` passed: 1 file, 3 tests.
- After refining the trust strip, `npx vitest run --environment jsdom src/storefront/__tests__/PdpCheckout.test.tsx src/storefront/__tests__/productInfoConversionModules.test.ts` passed: 2 files, 8 tests.
- After cleaning the quick-order form intro, `npm run validate:themes` passed for all 60 storefront themes and `npx vitest run --environment jsdom src/storefront/__tests__/PdpCheckout.test.tsx src/storefront/__tests__/productInfoConversionModules.test.ts` passed: 2 files, 8 tests.
- Mobile checkout screenshot: `artifacts/khemet-mobile-ux-2026-05-02/local-khemet-checkout-clean-form.png`.
- After compacting the cart drawer upsell rail, `npm run validate:themes` passed for all 60 storefront themes and `npx vitest run --environment jsdom src/storefront/__tests__/checkoutPageCart.test.tsx src/storefront/__tests__/productInfoConversionModules.test.ts` passed: 2 files, 7 tests.
- Mobile cart screenshot: `artifacts/khemet-mobile-ux-2026-05-02/local-khemet-cart-compact-upsell.png`.
- After simplifying the sticky mobile CTA, `npm run validate:themes` passed for all 60 storefront themes and `npx vitest run --environment jsdom src/storefront/__tests__/PdpCheckout.test.tsx src/storefront/__tests__/productInfoConversionModules.test.ts` passed: 2 files, 8 tests.
- Mobile sticky CTA screenshot: `artifacts/khemet-mobile-ux-2026-05-02/local-khemet-sticky-cta-full-bleed.png`.
- After restoring the mobile sticky actions and adding the second form action, `npm run validate:themes` passed for all 60 storefront themes and `npx vitest run --environment jsdom src/storefront/__tests__/PdpCheckout.test.tsx src/storefront/__tests__/productInfoConversionModules.test.ts` passed: 2 files, 8 tests.
- Mobile dual-action form screenshot: `artifacts/khemet-mobile-ux-2026-05-02/local-khemet-form-dual-actions.png`.
- Mobile restored sticky CTA screenshot: `artifacts/khemet-mobile-ux-2026-05-02/local-khemet-sticky-actions-restored.png`.
- After unframing the mobile form and correcting RTL reviews, `npm run validate:themes` passed for all 60 storefront themes and `npx vitest run --environment jsdom src/storefront/__tests__/PdpCheckout.test.tsx src/storefront/__tests__/productInfoConversionModules.test.ts` passed: 2 files, 8 tests.
- Mobile unframed form screenshot: `artifacts/khemet-mobile-ux-2026-05-02/local-khemet-form-unframed-mobile.png`.
- Mobile RTL reviews screenshot: `artifacts/khemet-mobile-ux-2026-05-02/local-khemet-reviews-rtl-mobile.png`.
- After fixing the header brand link, `npm run validate:themes` passed for all 60 storefront themes and `npx vitest run --environment jsdom src/storefront/__tests__/khemetHeaderInteractions.test.tsx src/storefront/__tests__/paths.test.ts` passed: 2 files, 16 tests.
- After centralizing the brand link, `npm run validate:themes` passed again and the focused `khemetHeaderInteractions`/`paths` Vitest suite passed again: 2 files, 16 tests.
- Mobile logo-to-home navigation screenshot: `artifacts/khemet-mobile-ux-2026-05-02/local-khemet-logo-home-navigation-mobile.png`.
- `npm run type-check -- --pretty false` still fails on existing project-wide TypeScript issues outside this change set, mostly `unknown` API response typing and older utility imports.
