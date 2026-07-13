# Home Builder Visual Editor Editability - 2026-05-12

## Scope

This pass makes the home builder route and storefront visual editor easier to use for merchant-facing homepage editing.

## What changed

- `/home-builder` now opens the same protected full-width editor as `/settings/storefront/editor`.
- Image picking is handled inside `StorefrontVisualEditor`, so image-like section fields can use the existing gallery/upload modal.
- The hero manifest now exposes side-panel image/copy/metric fields.
- Hero slider content can be edited through slide cards instead of raw textarea-only editing.
- Selected sections now include an advanced JSON settings editor for fields that do not yet have custom controls.
- `HeroBanner` parses the editor's pipe-delimited slide rows before rendering.

## Verification

- `frontend: npx vitest run src/storefront/__tests__/structuredSectionFields.test.ts src/storefront/__tests__/elessiSectionModules.test.ts src/storefront/__tests__/themeResolver.test.ts`
- `frontend: npm run validate:themes`
- `frontend: npm run build`
- Local browser route smoke: `/home-builder?storefrontt=...` is captured by the app and redirects to `/auth/login` when unauthenticated.

## Git status

- `git fetch --prune origin main` succeeded.
- `origin/main` currently has `23` commits not present locally.
- Dry merge detected real conflicts, so pull and push are paused until conflict resolution is approved.
- GitHub SSH still fails with `Permission denied (publickey)`, while the repository remote is HTTPS.
