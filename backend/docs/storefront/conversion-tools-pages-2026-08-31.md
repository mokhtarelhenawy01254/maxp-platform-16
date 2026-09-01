# Conversion Tools: Standalone Pages + Live Previews (2026-08-31)

## What shipped

Every conversion tool (22 tools across 4 marketplace apps) now has its own
admin page with a live preview, replacing the "flip a blind toggle" flow.

## Routing

- `/settings/store/tools` — grid index of all 22 tools, grouped by the 5
  existing sections, with live mini-previews and status badges
  (enabled / disabled / app-not-subscribed).
- `/settings/store/tools/:toolId` — single tool page: settings rail (right,
  sticky, RTL) + preview stage (browser-chrome canvas with mobile/desktop
  switcher, live-preview badge, inline save indicator).
- Unknown `toolId` redirects to the index.
- The 5 legacy tab routes (`/settings/store/product-conversion`, etc.) remain
  fully functional as fallback; the sidebar entry and the StoreSettings button
  now open the new index. Legacy routes will be converted to redirects after
  a verification window.

## Architecture

- `apps/frontend/src/pages/settings/conversionToolMeta.ts` — per-tool meta
  (lucide icon, previewKind: block|component|mock|note, displayKind:
  pdp|global) + `findToolById` + `ALL_CONVERSION_TOOLS` derived from the
  single source of truth `storeConversionSettingsConfig.ts`.
- `apps/frontend/src/pages/settings/useConversionTools.tsx` — shared hook for
  `/my-apps` load + auto-save (`setDeepValue`, `writePathsOn/Off`, app-status
  gating). The legacy `StoreConversionSettingsPage` was refactored onto the
  same hook; no logic duplication.
- `apps/frontend/src/pages/settings/conversionToolPreviews.tsx` — preview
  registry, 22/22 coverage:
  - 7 existing storefront `ConversionBlocks` (countdown ticks live, visitor
    counter jitters),
  - 2 existing panels (`TrustedBadgePanel`, `BackInStockSignupCard`),
  - 12 lightweight mock replicas,
  - 1 interactive note demo (inactiveTab actually swaps `document.title`
    when the merchant leaves and returns to the tab).
- Leaf-only imports from the storefront tree (no `ConversionStack`) to keep
  the admin chunk clean, per the store-bundle-bloat convention.

## Live preview semantics

Previews read from the same local (unsaved) state the auto-save writes, so
edits appear instantly — e.g. changing the free-shipping threshold moves the
mocked free-shipping bar before any network write.

## i18n

- Full ar + en `label` and `benefit` copy for all 22 tools under
  `storeConversionSettings.tool.<key>.*`, plus field-level keys
  (`field.freeShippingAmount.*`). Admin surface no longer shows English tool
  names; `t(...)` uses `defaultValue` fallback to config strings.

## Persistence

No backend changes. Saves still go through `PUT /my-apps/:id/settings` with
the existing `normalizeMarketplaceAppSettings` path. `general.enabled`
side-effect preserved (enabling any tool enables its whole app; the UI now
discloses this).

## Tests

`apps/frontend/src/pages/settings/__tests__/conversionTools.test.ts`
(vitest): catalog completeness (22), `findToolById`, preview registry
coverage 22/22, zero-threshold preview safety, ar/en translation
completeness.

## Rollout notes

- Billing unit stays the 4 marketplace apps (no 22-SKU unbundling). The
  per-tool pages are the presentation unit; freemium gating
  (module-level entitlement) is a separate later milestone.
- Open items: canvas currently uses generic theme vars (not the merchant's
  real theme); legacy tab redirects deferred until the new pages are
  verified in production.

## Hotfix (2026-09-01): theme context + i18n sections + test alignment

Production verification found the tool/index pages crashing with
`useStorefrontTheme must be used within a StorefrontThemeProvider` — the
imported storefront blocks (ConversionBlocks, TrustedBadgePanel,
BackInStockSignupCard) consume the storefront theme context that does not
exist inside the admin tree.

Fixes:

- `ConversionToolPreviewProvider` (wraps `StorefrontThemeProvider`, scoped)
  now wraps every preview: once around the tool-page canvas and once around
  the whole index grid. Theme resolution is registry-based with a fallback,
  so no auth/API dependency is added to the admin.
- The tool translations were initially added directly to
  `locales/{ar,en}/translation.json`, which is a build artifact regenerated
  by `scripts/merge-translations.js` from `locales/*/sections/**` — a local
  merge silently wiped them. The canonical source is now
  `locales/{ar,en}/sections/settings/storeConversionSettings.json`
  (shared keys + `tool.<key>.label/benefit` + `field.freeShippingAmount.*`
  for all 22 tools), and `translation.json` was regenerated via
  `npm run i18n:merge`.
- Test alignment: previews now have a render regression suite
  (`conversionToolPreviews.render.test.tsx`, renders all 22 previews inside
  the provider — this is the test that would have caught the crash).
  StoreSettings checkout-tab expectation updated to the new
  `/settings/store/tools` entry point, and the legacy grouped-pages tests
  were updated to the Arabic tool/app labels that the admin surface has
  rendered since the Arabicization commit (those expectations referenced
  English names that no code path renders).

## Consolidation (2026-09-01): legacy tab routes now redirect to the tools index

After live verification of the standalone tool pages, the 5 legacy tab routes
(`/settings/store/{product-conversion,offers-bundles,growth-widgets,selling-modes,reviews-social-proof}`)
now `<Navigate replace>` to `/settings/store/tools` — the same 22 tools were
duplicated across both surfaces, editing the same `/my-apps` settings. The
sidebar sub-entries and the marketplace feature-map routes were collapsed to
the single tools index. The legacy page components remain in the tree (still
covered by component-level tests) but are no longer routed.
