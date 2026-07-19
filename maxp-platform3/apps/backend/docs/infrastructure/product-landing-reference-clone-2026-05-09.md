# Product Landing Reference Clone - 2026-05-09

## Context

The Product Landing AI flow previously accepted a reference URL, but it only used a small text snapshot as inspiration. Merchants need an explicit mode that can imitate the structure of a proven COD landing page, such as an EasyOrders product page, while keeping merchant-facing provider details private and using only MaxP product data/images.

## Change

- Added `REFERENCE_CLONE` as a product landing layout and reference style.
- Expanded safe reference-page analysis to include section order, product images, price snippets, form fields, FAQ topics, trust signals, CTA labels, and optional `__NEXT_DATA__` hints.
- Strengthened the AI copy prompt so reference-clone mode treats the extracted page as a structural blueprint without copying third-party brand assets, exact text, or unrelated products.
- Added an AI-owned `blueprint` contract inside landing `aiContent` so the model now chooses section order, hero layout, image presentation, CTA style/label, and form pacing instead of only writing copy into a mostly fixed template.
- Updated storefront rendering to follow `blueprint.sectionOrder`, allowing the same product landing sections to be re-arranged by the AI per product/reference rather than always appearing in one hard-coded order.
- Added merchant admin controls for creating a page from a reference URL and selecting the reference-clone mode from the editor.
- Added a lightweight admin blueprint preview so merchants can inspect the generated AI structure when reviewing a landing draft.
- Fixed draft preview link generation so company subdomain previews now add `?preview=1` correctly instead of producing malformed `&preview=1` URLs.
- Added signed `previewToken` support for draft landing previews so subdomain preview links can open directly without depending on dashboard localStorage/auth state on the same browser origin.
- Added a reference-clone storefront presentation with stacked product imagery, centered Arabic product-story copy, repeated buy links, and an always-visible fixed buy CTA similar to the EasyOrders sales rhythm.
- Removed sneaker-specific wording from image brief prompts so non-shoe products can generate relevant campaign assets.

## Verification

- `npm test -- --runTestsByPath tests/routes/productLandingPages.preview.test.js --runInBand`
- `npx vitest run --environment jsdom src/storefront/__tests__/ProductImageLandingPage.test.tsx`
- Focused esbuild checks for `ProductLandingPages.tsx` and `ProductImageLandingPage.tsx`
