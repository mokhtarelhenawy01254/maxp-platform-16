# Store Conversion Control Pages

## What changed

- `/settings/store/product-conversion` is now a real auto-save control page, not a scope/status explainer.
- related tools were split into grouped control pages with lightweight in-page navigation:
  - `/settings/store/product-conversion`
  - `/settings/store/offers-bundles`
  - `/settings/store/growth-widgets`
  - `/settings/store/selling-modes`
  - `/settings/store/reviews-social-proof`
- each page now writes directly to the owning marketplace app settings instead of sending the user back to app settings first.
- `Store Settings > Checkout` still stays focused on checkout and keeps only a shortcut to the product page route.

## Navigation

- sidebar group entry:
  - `أدوات التحويل`
- sibling sidebar pages:
  - `العروض والباقات`
  - `ودجات الموقع`
  - `أوضاع البيع`
  - `المراجعات والثقة`
- checkout shortcut:
  - `فتح أدوات التحويل`

## Page behavior

- changes save automatically; there is no explicit save button.
- the page surface is linear:
  - page title
  - one-line description
  - auto-save / source-app status line
  - simple section dividers
  - inline toggle rows
- boxed summary cards, marketing copy, scope essays, and duplicated action buttons were removed.

## Grouping model

- `تحويلات صفحة المنتج`
  - `Sale Countdown Timer`
  - `Low Stock Notice`
  - `Sold Counter`
  - `Purchase Count & FOMO`
  - `Estimated Delivery`
  - `Trusted Badge`
  - `Sticky Add to Cart bar`
  - `Back in Stock`
- `العروض والباقات`
  - `Cross Sell`
  - `Bought Together`
  - `Bulk Savings`
  - `Buy More Save More`
- `ودجات الموقع`
  - `Free Shipping Bar`
  - `Inactive Tab`
  - `Exit Intent Popup`
  - `Fake Visitor`
  - `Fake Sale Popup`
- `أوضاع البيع`
  - `Pre Order`
  - `External / Affiliate Product`
- `المراجعات والثقة`
  - `Photo Review`
  - `Video Review`
  - `Verified Badge`

## App ownership

- `conversion-suite`
  - product conversion
  - offers and bundles
  - growth widgets
- `quantity-offers-pro`
  - buy more save more
- `commerce-advanced`
  - selling modes
- `ugc-reviews-pro`
  - review media and review trust

## What should stay visible

- clear page name
- one-line purpose
- current source-app readiness
- the tools that belong to that page only

## What should not be visible

- generic sales slogans like “boost sales” on every row
- explanations about where unrelated tools should live
- duplicate back/manage buttons
- card-based wrappers around every block

## Theme Sync & Sticky Add to Cart
- Theme-specific mobile sticky action bars (such as Khemet / Elessi two-button bar) are bound to `conversion-suite`'s `stickyAddToCart` setting via `isStickyAddToCartEnabled`.
- Disabling `Sticky Add to Cart` in `/settings/store/tools/stickyAddToCart` cleanly disables both the global host and theme-level mobile sticky action bars.
