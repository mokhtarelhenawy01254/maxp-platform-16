# Storefront Theme Refresh - 2026-04-29

## Scope

- restored the intended distinct identities for `fastly-eg` and `vela-fashion-eg`
- corrected the accidental over-normalization that made both marketplace themes inherit the same `legacy-default-old` storefront surface
- kept the verification focus on comparing each theme against its own expected storefront behavior instead of forcing unrelated themes into one shared clone

## Fastly

- restored the `Fastly` preset name, brand text, Arabic offer-wall composition, seeded products, cart data, and preview order profile
- restored Fastly runtime-specific storefront behavior that is selected by the `fastly-eg` theme id
- Fastly is intentionally not a `legacy-default-old` clone; it should remain a dense Arabic offer storefront with its own product flow

## Vela Fashion

- restored the `Vela Fashion` preset name, `vela-fashion` header/footer variants, editorial section stack, product data, cart data, and preview order profile
- restored Vela-specific runtime behavior for product cards, collection pages, preview controls, quick-order surfaces, conversion widgets, and soft aftercare
- Vela Fashion is intentionally not a `legacy-default-old` clone; it should remain an LTR fashion storefront with its own visual language

## Validation

- in-app browser comparison passed for `home`, `shop`, `product`, `cart`, `checkout`, and `terms` on both `fastly-eg` and `vela-fashion-eg`
- browser evidence is saved in `tmp/theme-identity-correction-20260430/summary.json`
- `Powered By Easyorders` is removed from both affected footer paths and absent from the final browser DOM pass
- `npm run validate:themes` passed for 60 storefront presets
- `npx vite build --outDir ../tmp/frontend-theme-correction-build-20260430-final --emptyOutDir=false` passed
- `npm run build` reached Vite output cleanup, then failed locally with Windows `EPERM` on `frontend/dist/assets`; this is a local file lock on the output directory, not a storefront compile error

## Follow-Up Guardrail

- `Fastly` and `Vela Fashion` must stay distinct marketplace presets; do not copy both from `legacy-default-old` unless the task explicitly asks for a shared clone.
- Page comparisons should validate each theme against its own reference behavior, not against each other as if they should be identical.
- `RelatedProducts.tsx` should keep a single `buildStorefrontPath` import; the duplicate import blocked Vela PDP rendering in the dev browser.
- Do not reintroduce the storefront `Powered By Easyorders` footer credit on these marketplace footer paths.
