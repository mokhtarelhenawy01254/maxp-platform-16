# Product Landing AI Copy Generation - 2026-05-09

## Context

Product landing pages were previously composed from a fixed storefront template plus product data. That made new pages usable, but the copy did not change enough between products and did not create a strong ad-to-order sales argument.

## Change

- Added `POST /api/v1/product-landings/:id/ai-content` for authenticated company admins.
- The endpoint builds a product-specific Arabic JSON copy prompt through the shared AI runtime, stores the result inside `formConfig.aiContent`, and refreshes form/SEO copy.
- The parser repairs common model formatting drift such as markdown fences, smart quotes, unquoted object keys, trailing commas, and accidental line breaks inside string values before using the safe fallback.
- Product landing copy requests now allow a larger output budget and explicitly ask for short bounded arrays so full landing JSON is less likely to be truncated.
- If a provider ignores the JSON contract but returns substantive copy, the endpoint extracts headline, subheadline, bullets, and supporting cards from that AI prose instead of falling back to a static deterministic template.
- The default Product Landing AI timeout is now longer than the regular chat path because full-page copy generation on NVIDIA can legitimately take more than 15 seconds.
- Public landing responses expose sanitized `aiContent` only; provider names, model names, prompts, and internal image routing remain hidden.
- Storefront product landings now render AI-generated hero copy, benefit cards, trust cards, decision/objection cards, order steps, reassurance notes, FAQ, urgency copy, and gallery headings.
- The storefront now renders multiple real product/campaign images when they exist instead of limiting the landing experience to a single product image.

## Fallback

If AI is unavailable or returns unusable/empty output, the endpoint saves a safe deterministic version derived from product name, description, price, variants, stock, and company name. It does not fail page creation or publishing.

## Verification

- `node -c backend/routes/productLandingPagesRoutes.js`
- `npm test -- --runTestsByPath tests/routes/productLandingPages.preview.test.js --runInBand`
- `npx vitest run src/storefront/__tests__/ProductImageLandingPage.test.tsx --environment jsdom`
- `npm run build` from `frontend/`
