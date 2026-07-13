# Storefront Fashion Mobile Differentiation Review - 2026-04-23

## Scope

Reviewed these 11 themes together:

- `aura-chic`
- `mystic-desert`
- `fakhama-elite`
- `elegant-luxe`
- `elessi-classic`
- `bold-fashion`
- `menswear-prime`
- `atelier-nova`
- `cairo-stride`
- `solea-femme`
- `modern-minimal`

The review used:

- structural comparison of sections, hero variants, grids, navigation, and tokens
- mobile captures at `390x844`
- shared preview data so the visual difference came from the theme, not from changing products

Artifacts:

- [Home mobile gallery](./qa/storefront-theme-review-2026-04-23/mobile-home-gallery.png)
- [Shop mobile gallery](./qa/storefront-theme-review-2026-04-23/mobile-shop-gallery.png)
- [Mobile metrics](./qa/storefront-theme-review-2026-04-23/mobile-metrics.json)

## What Was Already Applied Before This Round

- store-facing copy had already been cleaned across the 11 themes
- catalog descriptions had already been mapped closer to the real store category
- newsletter fallback copy had already been made store-neutral
- hero fallback visuals had already been cleaned so they no longer render literal placeholder text
- earlier fashion-theme ranking and copy refresh docs were already created

## What Was Missing And Fixed In This Round

### 1. Preview identity was still too uniform

Several themes were still showing the same preview store label, which made side-by-side comparison weaker than it should be.

Fixed by adding `header.brandName` to the preview-facing fashion themes:

- `Aura Chic`
- `Mystic Desert`
- `Fakhama Elite`
- `Elegant Luxe`
- `Elessi Classic`
- `Bold Fashion`
- `Menswear Prime`
- `Atelier Nova`
- `Solea Femme`

`Cairo Stride` and `Modern Minimal` already had distinct preview branding.

### 2. `Elessi Classic` was still falling back to English hero copy

The mobile review exposed that `hero-sidebar` was rendering old English fallback content such as seasonal copy and CTA text.

Fixed by:

- localizing `HeroWithSidebar` defaults
- adding configurable `categoryTitle`, `eyebrow`, and `buttonLink`
- reducing the mobile hero height to make the fold lighter
- giving `elessi-classic` explicit Arabic slides and category labels
- reshaping the shop page to feel more like a catalog-first layout

### 3. `Menswear Prime` hero was using an unsupported key

`menswear-prime` was still using `primaryCta`, while the actual hero runtime expects `ctaText` / `ctaLink`.

Fixed by:

- switching to supported hero CTA keys
- adding a second CTA for the lookbook
- tightening the home hero message so the top fold reads more decisively on mobile

## Mobile Review Result

At `390x844`, all 11 themes now passed the basic mobile overflow check on both home and shop:

- no horizontal overflow was detected in the captured home pages
- no horizontal overflow was detected in the captured shop pages

Notes from the visual pass:

- `Mystic Desert`, `Fakhama Elite`, `Bold Fashion`, `Cairo Stride`, and `Modern Minimal` are clearly differentiated on mobile without extra explanation
- `Elessi Classic` is no longer confused with an English fallback template and now reads as a cleaner catalog theme
- `Menswear Prime` now reads as menswear immediately instead of a generic fashion hero
- `Aura Chic`, `Elegant Luxe`, and `Atelier Nova` still belong to the same quiet boutique family, but they are now acceptably separated by image language, CTA tone, and preview branding

## Remaining Soft Risks

- the shared preview/runtime strips at the top of the page still compress the first fold on mobile across multiple themes
- this is a shared storefront/runtime concern more than a theme-only concern, because the same bars appear across several previews
- `Fakhama Elite` shop still opens with a more text-heavy fold than the others, even though it remains visually distinct

## Regression Coverage Added

Updated test coverage now checks that:

- the reviewed fashion previews keep distinct `brandName` values
- `Elessi Classic` keeps localized sidebar hero content
- `Menswear Prime` keeps supported hero CTA keys instead of the legacy `primaryCta`

## Shipping Verification

Before GitHub upload, this review was re-validated from a clean worktree created from `origin/main` because the main local workspace had overlapping upstream changes.

Checks completed:

- `npm.cmd run validate:themes` in `frontend/` passed
- `npx vitest run src/storefront/__tests__/themeCatalog.test.ts src/storefront/__tests__/storefrontPreview.test.tsx` in `frontend/` passed
- `npm.cmd run build` in `frontend/` passed
- `node --check scripts/verify-docs.js` passed
- `C:\Program Files\Git\bin\bash.exe -n deploy.sh backend/deploy.sh backend/deploy-db-update.sh` passed
- `ssh max-p-vps "hostname; uptime; pm2 list; curl -fsS http://127.0.0.1:3007/api/v1/health"` returned a healthy production server (`srv974554`) with both PM2 apps online

Observed build notes:

- Vite still reports existing large-chunk warnings in the wider frontend bundle
- local Geist font asset references remain runtime-resolved during build
- a circular chunk warning still appears between `vendor-ui-framework` and `vendor-mui`
