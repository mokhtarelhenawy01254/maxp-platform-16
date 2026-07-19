# Product Landing COD Brief Flow - 2026-05-09

## Context

The first AI product landing iteration proved that model-generated copy could be saved and rendered, but the output still felt like a generic template compared with strong COD ecommerce pages such as EasyOrders-style product pages.

## Changes

- Added a saved `landingLayout` to product landing `formConfig`, defaulting to `COD_SALES`.
- Added a private `productBrief` object to admin landing pages:
  - campaign angle / ad promise
  - product summary
  - target audience
  - main benefits
  - real proof points
  - offer details
  - shipping details
  - guarantee/exchange policy
  - customer objections
  - ad media notes
  - tone
  - reference style
  - optional reference URL
  - extra notes
- The public product landing API strips `productBrief` so merchant-only notes do not leak to customers.
- The AI copy prompt now receives:
  - product data, price, stock, colors, and sizes
  - merchant brief
  - selected landing layout
  - reference playbook, including `EASY_ORDERS_COD`
  - a bounded text snapshot of the merchant-provided reference URL when it can be safely fetched
- AI output now supports sales-page fields for:
  - sticky checkout bar copy
  - guarantee badges
  - objection cards
  - image story captions
  - shipping/size notes
  - quality score and missing info
- The storefront product landing now has a COD sales layout:
  - cleaner product-first hero
  - quick purchase strip
  - quantity selector
  - stronger sticky checkout bar
  - early product image story for COD pages
  - visible social proof copy when supplied by AI
  - objection-handling section
  - gallery captions generated from AI copy

## Verification

- `node -c backend/routes/productLandingPagesRoutes.js`
- `npx jest backend/tests/routes/productLandingPages.preview.test.js --runInBand`
- `npx vitest run --environment jsdom src/storefront/__tests__/ProductImageLandingPage.test.tsx`
- `npx vite build --mode production`

The full frontend `type-check` command was attempted, but it exceeded the local timeout. The production Vite build completed successfully.
