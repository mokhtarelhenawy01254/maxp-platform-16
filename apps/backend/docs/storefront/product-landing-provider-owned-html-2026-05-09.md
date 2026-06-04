# Product Landing Provider-Owned HTML

## Context

The previous AI landing flow still depended on the local storefront renderer to compose the final page. The provider mostly generated copy and a blueprint, while our code decided the layout and kept a strong fallback path. That made the final landing feel code-authored even when the merchant requested an AI-built page.

## Changes

- Added `generatedHtml` storage to `ProductLandingPage` so the provider can return the landing fragment itself.
- Added `HTML_GENERATED` readiness rules that now require valid provider HTML before review or publish.
- Added a provider-owned HTML generation prompt that asks the configured AI provider to return:
  - normalized landing copy fields
  - blueprint metadata
  - a real `generatedHtml` fragment
- Enforced strict HTML validation:
  - no `script`, `iframe`, `form`, `input`, `textarea`, `select`, or `button`
  - at least one CTA linking to `#order-form`
  - exactly one provider slot for the live order form:
    `<section id="order-form" data-maxp-order-slot="true"></section>`
- Removed the silent fallback for HTML mode. If the provider returns invalid HTML, the landing now stays failed instead of being auto-composed locally.
- Added signed preview tokens for draft landings so subdomain preview no longer depends on dashboard auth state.
- Updated the admin landing page flow so clone/story/COD AI modes default to `HTML_GENERATED`, show provider HTML readiness, and open draft previews with the signed token.
- Updated the storefront runtime so HTML-generated landings render the provider fragment as-is, then mount the live order form into the provider slot via a portal.
- Tightened the storefront preview behavior so `HTML_GENERATED` drafts with missing or failed provider HTML no longer fall back to a locally composed landing. They now show an explicit provider-failure/not-ready state instead.

## Verification

- `npm run check:syntax`
- `npm run schema:generate`
- `npx jest tests/routes/productLandingPages.preview.test.js --runInBand`
- `npm run templates:validate -- --fail-on-critical-warnings`
- `npx vitest run src/storefront/__tests__/ProductImageLandingPage.test.tsx src/pages/advertising/__tests__/productLandingPageUrls.test.ts`
- `npm run build`

## Notes

- `npm run type-check` still fails because of broad pre-existing TypeScript issues outside the landing-page area. The landing-specific tests and production build passed.
- Provider-owned HTML mode is intentionally strict. Weak or malformed provider output should fail loudly so merchants can see the provider quality instead of a local renderer masking it.
