# Fitting Room Studio Storefront Template

## Positioning Brief

- Target segment: fashion merchants selling denim, cotton basics, light layers, and ready outfit sets.
- Primary buyer: mobile-first shopper who wants to confirm image, color, size, quantity, coupon, and total without feeling moved between heavy pages.
- Price posture: approachable boutique, not luxury editorial and not mass-market discount.
- Buying anxieties: fit, color accuracy, shipping cost, and whether the bag still looks correct before checkout.
- Visual direction: warm porcelain background, compact white app cards, soft fashion photography, dark checkout action, small rounded product thumbnails.
- Trust strategy: repeat item image, quantity, and price inside the bag; keep shipping and returns pages reachable; keep checkout fields short.
- Mobile posture: designed around a native shopping-bag card first, then scales to desktop without losing the app-like frame.

## Nearest Theme Audit

- `women-fashion-eg`: home starts hero/promo/categories; cart and checkout use `wardrobe-cart` plus `boutique-summary`.
- `rose-boutique-eg`: home starts boutique hero/product shelf/offer bento; cart and checkout also use `wardrobe-cart` plus `boutique-summary`.
- `vela-fashion-eg`: LTR fashion reference, but cart uses `cart-items:compact` plus `order-summary:highlighted`; checkout uses compact cart, split form, minimal payment.
- `closet-os`: planner/capsule angle, but cart and checkout stay compact sidebar flows.
- `layali-edit-eg`: event-led commerce with promo-first pages, not mobile shopping-bag first.

## Page Signatures

- Home: `featured-collections:pastel-category-lane`, `hero-banner:fashion-billboard`, `product-grid:quick-view-fashion-grid`.
- Shop: `shop-command-bar:soft-sort-bar`, `featured-collections:pastel-category-lane`, `product-grid:quick-view-fashion-grid`.
- PDP: `product-gallery:mirror-carousel`, `product-info:accordion`, `quantity-offers:selection-rail`.
- Cart: `order-summary:fitting-room-summary` as the primary shopping-bag card.
- Checkout: `order-summary:fitting-room-summary`, `checkout-form:fitting-room-checkout`, `payment:minimal`.

## New Variants

- `OrderSummary.fitting-room-summary`: app-like Shopping Bag card with compact line items, promo code row, totals, and a single dark CTA.
- `CheckoutForm.fitting-room-checkout`: compact rounded checkout form that continues the same app-card visual system.

## Differentiation

The closest existing fashion themes still treat cart and checkout as traditional storefront sections. This template makes the shopping bag itself the central experience, matching the reference image with a mobile app-style white card, compact image rows, promo input, totals, and dark primary action.

## Implementation Notes

- Registered theme id: `fitting-room-studio`.
- Catalog category: `mobile-fashion`.
- Checkout sets `settings.injectCartItems: false` because `order-summary:fitting-room-summary` owns the line-item review.
- Marketplace preview data includes six fashion products and seeds the cart with `Fitting dress`, `Cotton T-shirt`, and `Jean jacket`.
- Local preview links:
  - `/store?previewTheme=fitting-room-studio&previewSource=marketplace`
  - `/store/checkout?previewTheme=fitting-room-studio&previewSource=marketplace`

## Verification

- `npm run validate:themes` passed.
- `npm run validate:blueprints` passed.
- `npm run build` passed in `frontend/`.
- `node scripts/check-arabic-strings.js --staged ...` passed after updating the guard to scan added diff lines for deploy runs.
- Preview data smoke script confirmed the theme has marketplace products and seeded cart items.
- Browser QA confirmed the checkout preview shows the custom Shopping Bag card, `Promo Code`, `Apply`, totals, checkout fields, and no duplicated legacy cart block.
