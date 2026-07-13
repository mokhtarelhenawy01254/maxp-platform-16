# Product Landing Generation Flow

## Context

The product landing admin route could create a landing page draft, but operators could still open the customer URL before the page had generated image slices or a published status. The customer runtime correctly rejected that draft as unpublished, which made the page look broken even though the Image Studio provider configuration was available.

## Changes

- Added an authenticated draft preview endpoint at `GET /api/v1/product-landings/preview/:slug`.
- Draft previews are admin-scoped and may render from the stored product snapshot when the linked product is hidden or old, while the public customer endpoint still rejects hidden products.
- The storefront landing runtime now uses the preview endpoint when the URL includes `preview=1`, attaching the stored admin token.
- The admin page now opens draft previews with `preview=1` and only copies the customer URL after publishing.
- Added a one-click "توليد الصفحة كاملة" action that builds the six landing prompts, generates each slice through Image Studio, and saves the generated slices back to the landing page.
- Added a readiness note for drafts with no saved image slices, because public publishing requires at least one slice.
- Fixed Image Studio's Gemini key lookup to use the same super-admin provider routing as the rest of the AI runtime, with a direct `aiKey` fallback for Google keys.
- Added a direct Gemini image-model fallback when the legacy external Supabase image endpoint is unavailable.
- Disabled production placeholder success responses unless `IMAGE_STUDIO_ALLOW_PLACEHOLDER=true`, so provider failures do not create fake landing-page slices.

## Verification

- `npx vitest run src/utils/__tests__/storefrontApi.productLanding.test.ts --environment jsdom`
- `npx jest tests/routes/productLandingPages.preview.test.js --runInBand`
- `npx jest tests/services/imageStudioService.googleKeyRouting.test.js --runInBand`
- Production smoke should verify:
  - Swan can access `/api/v1/image-studio/access`.
  - Swan can trigger `/api/v1/image-studio/generate` without "no active Gemini key" errors.
  - If the external image endpoint cannot resolve, Image Studio attempts `gemini-*-image` generation and rotates quota-limited Google keys before returning a clear provider failure.
  - Draft preview URL uses `/api/v1/product-landings/preview/:slug`.
  - Published customer URL uses `/api/v1/product-landings/public/:slug`.
