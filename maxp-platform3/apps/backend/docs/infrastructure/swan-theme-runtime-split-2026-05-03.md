# Swan Storefront Runtime Theme Split - 2026-05-03

## Context

The Flora/Swan production storefront runs the `khemet-luxe-eg` theme. Earlier performance passes split the public `StorefrontBootstrap` and `StorefrontShell`, but the public storefront waterfall could still include the full `storefront-theme-presets` chunk. That chunk contains the complete admin/marketplace theme registry and is much larger than the one active production theme needed for Swan.

## Change

- Added a runtime-only theme resolver that loads optimized public storefront themes as hashed JSON assets.
- Added runtime asset loaders for `khemet-luxe-eg` and `modern-minimal`.
- Moved the default theme id into a tiny runtime chunk so public storefront code does not import the full registry just to read that constant.
- Kept the full `themes/index.ts` registry for admin, marketplace, and fallback paths.
- Split resolver core logic so public runtime resolution can merge settings, content overrides, and page overrides without importing the full theme registry.
- Blocked public `StorefrontThemeProvider` render until the small runtime theme JSON resolves, so users do not see a fallback theme flash.
- Deferred the full `storefront-theme-presets` preload from `StorefrontBootstrap` and `StorefrontShell` public waterfalls.
- Kept marketplace local preview fallback out of production builds while preserving it for development.

## Files

- `frontend/src/storefront/engine/runtimeThemeResolver.ts`
- `frontend/src/storefront/engine/themeDefaults.ts`
- `frontend/src/storefront/engine/themeResolverCore.ts`
- `frontend/src/storefront/engine/themeResolver.ts`
- `frontend/src/storefront/engine/ThemeProvider.tsx`
- `frontend/src/storefront/StorefrontShell.tsx`
- `frontend/src/storefront/hooks/useStorefrontSettings.ts`
- `frontend/src/storefront/themes/index.ts`
- `frontend/src/storefront/themes/khemet-luxe-eg.json`
- `frontend/src/storefront/utils/marketplaceApps.ts`
- `frontend/vite.config.ts`
- `frontend/src/storefront/__tests__/storefrontRuntimeImports.test.ts`

## Expected Production Behavior

On public Swan pages (`/`, `/shop`, `/product/kotshy-soan`, `/checkout`):

- The browser should request the active `khemet-luxe-eg-*.json` theme asset.
- The browser should not request `storefront-theme-presets-*.js` during the first public page load.
- Admin theme management can still load the full registry when the admin UI needs it.
- Unknown or non-optimized runtime theme ids still fall back to the full registry through the deferred resolver path.

## Validation

- `npx vitest run src/storefront/__tests__/storefrontRuntimeImports.test.ts`
- `npm run validate:themes`
- `npm run build` with production-like Vite settings and local compression disabled for disk pressure
- `node scripts/verify-docs.js`
- Post-deploy production checks should include Playwright network inspection for the four Swan public pages and a UX smoke for shop navigation, product lower-page loading, logo/home navigation, cart drawer, and checkout load.
