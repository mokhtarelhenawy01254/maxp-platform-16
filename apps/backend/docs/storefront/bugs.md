# Storefront & Theme Bugs

> Domain-specific bug tracker for all storefront, theme, template, and PDP/Shop/Cart/Checkout issues.

### [FIX — UX] Post-Purchase Offer Variant Picker Upgraded to Grouped Color+Size UI (2026-10-09)
- **Description**: On `/order-offer` the variant picker rendered 10 flat chips with full repeated names ("أبيض × أسود - 37" … "أبيض × نبيتي - 41") with jagged mobile wrapping, interleaved colors mid-grid, and a default variant (smallest size 37) pre-selected, which risked wrong-size orders/RTO.
- **Root Cause**: The post-purchase offer page lacked two-tier variant decomposition logic and selected the first variant by default. Additionally, `FreeShippingBar` appeared at the top of `/order-offer`, clashing with the offer's own free-shipping messaging.
- **Fix**:
  1. Implemented two-tier variant decomposition (`parseVariantOptions` and `groupedData`) in `PostPurchaseOfferPage.tsx` supporting option metadata with regex fallback (`/^(.*?)\s*-\s*(\d{1,3})$/`).
  2. Removed default selection so the page loads with no variant pre-selected.
  3. Added feminine section headers ("اختاري اللون" with emerald selection badge, "اختاري المقاس" with clean numeric chips).
  4. Fortified CTA: clicking without full selection displays a polite toast (`"اختاري اللون والمقاس الأول 🙏"`), scrolls to the picker, and blocks any API request.
  5. Implemented stock guard disabling out-of-stock sizes with line-through and tooltip, and color switching size preservation/clearing logic.
  6. Provided safe fallback to flat chips if variants cannot be parsed.
  7. Hidden `FreeShippingBar` specifically on the `/order-offer` route in `StorefrontShell.tsx`.
- **Verification & Acceptance**:
  - 7 Vitest unit & integration tests passed in `apps/frontend/src/storefront/__tests__/postPurchaseOfferPicker.test.tsx`.
  - Playwright live browser test passed with 0 console errors on mobile (390px) and desktop (1280px).
  - Evidence captured: `docs/evidence/post-purchase-offer/swan_offer_picker_after_mobile.png`, `swan_offer_picker_after_desktop.png`.
- **Full task doc**: `docs/post-purchase-offer-picker-ux-2026-10-09.md`

### [FIX] Post-Purchase Offer Public API Crashes When a Product Is Selected (2026-10-09)
- **Description**: Enabling the post-purchase offer for the Swan store (`swan.maxp.online`) with a selected product (Swan Aura) made the public offer endpoint return HTTP 500, so the storefront `/order-offer` page could not load the product/variants (size picker missing).
- **Root Cause**: `postPurchaseOfferController.js` selected the non-existent `imageUrl` field on the Product model (schema only has `mainImage` + `images`). It only fired once `offer.productId` was set (enrichment path).
- **Fix**:
  1. Replaced `imageUrl: true` with `mainImage: true` in Prisma `findFirst` selects in `getOffer` and `getPublicOffer`.
  2. Added `resolveProductImage()` helper to safely extract the main image (from `mainImage` or `images` array/JSON string) and populated both `offer.productImage` and `product.imageUrl` for backward compatibility.
  3. Added `mainImage` support to frontend types and `PostPurchaseOfferPage.tsx` / `PostPurchaseOfferBuilderPage.tsx`.
  4. Updated `publicOrdersRoutes.js` accept-offer endpoint to fall back to `dbProduct.mainImage`.
- **Acceptance**: Public and admin offer GET return 200 with product and variants; `/order-offer` renders the variant picker; Swan offer config can now be re-enabled safely (`enabled: true`).
- **Full task doc**: `docs/post-purchase-offer-crash-fix-2026-10-09.md`

### [FIX] KHEMET Homepage Categories And Buybox Flow Were Too Static (2026-05-07)
- **Description**: The KHEMET homepage `gallery-columns` image section used fixed authored collections even when the storefront had real product categories. The PDP needed a cleaner merged quick-order flow after review, and footer legal/service links pointed to missing dynamic pages.
- **Root Cause**:
  1. `FeaturedCollections` only honored runtime categories when `preferRuntimeCategories` was explicitly true.
  2. KHEMET's `elessi-care-buybox` could stack too many persuasion cues around the real inline quick-order form.
  3. The raw KHEMET theme JSON lacked `shipping`, `privacy`, and `terms` pages even though the footer linked to them.
  4. The cart drawer footer was rendered inside the scroll region, so checkout could move away from the stable closing position.
- **Fix**:
  1. Added KHEMET default runtime-category preference for `gallery-columns`, with an explicit `preferRuntimeCategories: false` opt-out.
  2. Kept the merged quick-order form focused and removed the extra KHEMET purchase decision-suite panel after visual review.
  3. Added raw KHEMET legal/service pages and aligned cart/checkout/thank-you section variants with the expected boutique flow.
  4. Moved the cart footer outside the scrollable region and updated the stale preview sale date to a rolling countdown.
- **Impact**: KHEMET now reflects the merchant's actual categories on the visual homepage section, keeps the buybox cleaner for checkout, and no longer links customers to missing trust pages.

### [FIX] Checkout Free Shipping Threshold Was Visual Only (2026-05-03)
- **Description**: Swan checkout showed the free-shipping progress as reached at the configured threshold, but after selecting a governorate it still added the `EGP 75.00` shipping quote to the visible total and to the order payload.
- **Root Cause**:
  1. `OrderSummary` used `conversion-suite.thresholds.freeShippingAmount` only for the progress bar.
  2. `useCheckoutShippingQuote` only zeroed shipping for quantity-offer free shipping, not for the conversion-suite free-shipping threshold.
  3. `backend/routes/publicOrdersRoutes.js` recalculated shipping server-side and only removed it for quantity-offer metadata, so frontend-only fixes could still save the wrong final total.
  4. A compact `PaymentSection` summary path still formatted the raw shipping value instead of the resolved free-shipping discount.
- **Fix**:
  1. Added a shared frontend helper for conversion-suite free-shipping eligibility.
  2. Updated checkout shipping calculation to keep the quoted shipping as a discount and apply `shippingCost = 0` once the cart subtotal reaches the threshold.
  3. Updated `OrderSummary` and both `PaymentSection` summary layouts to show the shipping row as a negative value such as `-EGP 75.00`, while the total stays equal to the product subtotal.
  4. Added backend free-shipping threshold enforcement and metadata so saved storefront orders stay aligned with the checkout display.
- **Impact**: A Swan cart over the configured free-shipping threshold no longer gets shipping added after governorate selection or after order submission.

### [FIX] KHEMET Product Add-To-Cart And Header Category Navigation (2026-04-29)
- **Description**: On the live Flora KHEMET LUXE storefront, the PDP "add to cart" action opened the embedded quick-order flow instead of the cart drawer. Header links such as `/shop?category=sneakers` and `/shop?category=flats` also changed the URL but could leave the shop surface on an empty or stale category state until refresh.
- **Root Cause**:
  1. `ProductInfo` treated KHEMET's inline quick-order fallback as an embedded PDP checkout owner for both buy-now and add-to-cart actions.
  2. `ProductGrid` passed the raw `category` query token directly to the products API, but KHEMET header links used legacy semantic slugs while the public API expects category ids or real category slugs.
  3. Storefront route elements were reused across query transitions, so some browser sessions could keep stale page state after internal header navigation.
  4. Production testing showed KHEMET PDP-to-catalog header links could still update `history.pushState()` without replacing the mounted PDP surface, leaving customers on the product content until a manual refresh.
- **Fix**:
  1. Added explicit add-to-cart routing helpers so KHEMET add-to-cart opens the cart drawer while buy-now/direct-order behavior remains unchanged for embedded checkout themes.
  2. Added catalog category token resolution with safe KHEMET aliases (`sneakers` -> `womens-shoes`, `flats` -> `shoes`) and made `ProductGrid` wait for category resolution before requesting filtered products.
  3. Keyed storefront route page shells by path/search and restored route/hash scroll handling so header navigation remounts the correct page state without requiring refresh.
  4. Lazy-loaded conversion and sticky add-to-cart hosts, and avoided warming categories on PDP routes, reducing non-critical storefront work during first render.
  5. Forced KHEMET header links to use document navigation only while on PDP routes, preserving fast SPA category switching inside `/shop` while guaranteeing product-to-catalog clicks render the new page immediately.
  6. Stabilized lazy section skeleton heights and KHEMET catalog grid minimum height so short category/sale pages no longer pull the footer upward after product data resolves.
  7. Tuned the KHEMET sale-page loading placeholder to mirror the final empty-offers block, and reduced direct category loading skeletons so short result sets like `flats` do not collapse from an oversized eight-card placeholder.
- **Impact**: Flora category header links now load the intended products client-side, KHEMET PDP add-to-cart opens the cart drawer, short catalog/sale pages shift less during load, and the storefront ships less non-critical JavaScript on initial page render.

### [FIX] Theme Marketplace Apply Flow Could Hit The Wrong Company Context And Return 404 (2026-04-27)
- **Description**: Applying or purchasing a storefront theme from `/marketplace/themes` could fail with a `404` even though the catalog itself loaded correctly, especially in admin/super-admin sessions that had stale company context cached in the browser.
- **Root Cause**:
  1. `frontend/src/pages/marketplace/StorefrontThemes.tsx` resolved the active company from auth/query state, but `storefrontThemeCatalogService` still relied on the implicit `apiClient` fallback that reads `X-Company-Id` from `localStorage`.
  2. If that cached `companyId` diverged from the page's actual `currentCompanyId`, the catalog page could still render while `apply`/`purchase` hit the backend with an outdated company id.
  3. On the backend, `applyThemeForCompany()` validates the company record during activation, so stale context surfaced as `COMPANY_NOT_FOUND` (`404`) even though the route itself existed and the theme id was valid.
- **Fix**:
  1. Added explicit company-scoped request support to `frontend/src/services/storefrontThemeCatalogService.ts` for catalog, history, purchase, and apply calls.
  2. Updated `frontend/src/pages/marketplace/StorefrontThemes.tsx` to pass the resolved `currentCompanyId` into marketplace theme requests instead of depending on implicit local storage state.
  3. Added regression coverage in `frontend/src/services/__tests__/storefrontThemeCatalogService.test.ts` and `frontend/src/storefront/__tests__/storefrontThemesMarketplace.test.tsx`.
- **Impact**: Theme activation/purchase now use the same company context the page is showing, which removes the stale-company 404 path without changing the backend routes.

### [FIX] Unknown Storefront Theme Ids No Longer Silently Fall Back To `modern-minimal` (2026-04-27)
- **Description**: Even after alias themes were registered properly, any unknown storefront `themeId` could still resolve through the global fallback path and quietly render `modern-minimal`, which kept registry mistakes hidden and recreated duplication under a different name.
- **Root Cause**:
  1. `frontend/src/storefront/engine/themeResolver.ts` only selected ids that already existed in the preset registry, so unknown ids were discarded before resolution.
  2. `frontend/src/storefront/themes/index.ts` still let `getStorefrontThemePreset()` fall back to `DEFAULT_STOREFRONT_THEME_ID` whenever a preset lookup missed.
  3. This meant typos, stale aliases, and missing preset registrations all converged into the same generic storefront baseline instead of surfacing as configuration failures.
- **Fix**:
  1. Updated `extractStorefrontThemePresetId()` in `frontend/src/storefront/engine/themeResolver.ts` to preserve the first explicit non-empty requested id.
  2. Replaced the global silent fallback in `frontend/src/storefront/themes/index.ts` with a valid diagnostic placeholder theme that keeps the unknown id and renders explicit registry guidance across `home/shop/pdp/cart/checkout`.
  3. Rewrote the old fallback regression in `frontend/src/storefront/__tests__/themeResolver.test.ts` so unknown ids now assert placeholder behavior and pass full storefront validation.
- **Impact**: Unknown theme ids are now visible immediately instead of masquerading as `modern-minimal`, which closes the last major hidden duplication path and makes preset registration errors easier to catch before launch.

### [FIX] Alias Theme Ids Were Silently Falling Back To `modern-minimal`, Recreating Duplication At Runtime (2026-04-27)
- **Description**: Some library themes that appeared in marketplace audits such as `pharmacy-demo`, `cutline-club`, and `style-store-eg` were still resolving through the fallback preset path, which meant they inherited `modern-minimal` identity and page structure before any later overrides tried to separate them.
- **Root Cause**:
  1. `frontend/src/storefront/themes/index.ts` did not register these ids as real storefront presets.
  2. `getStorefrontThemePreset()` therefore returned the default preset for those ids, and the runtime only recovered partially because `resolveStorefrontTheme()` still preserved the alias id externally.
  3. This created a hidden duplication loop: different marketplace theme ids, same core preset baseline, then only partial late-stage page patching.
- **Fix**:
  1. Added real preset registration for `pharmacy-demo`, `cutline-club`, and `style-store-eg` in `frontend/src/storefront/themes/index.ts`, each with its own brand/header/footer/seo shell and preview identity.
  2. Added matching catalog metadata and preview coverage in `frontend/src/storefront/themes/catalog.ts`.
  3. Extended `frontend/src/storefront/utils/pharmacyThemes.ts` so pharmacy-aware runtime logic also recognizes `pharmacy-demo`.
  4. Added explicit page experience passes in `frontend/src/storefront/themes/experienceOverrides.ts` so the three aliases now resolve to distinct `home/shop/pdp/cart/checkout/thank-you` journeys instead of inheriting the same fashion fallback.
  5. Added regression assertions in `frontend/src/storefront/__tests__/themeExperienceOverrides.test.ts` and rechecked marketplace preview coverage plus theme validation.
- **Impact**: These alias themes are now first-class presets instead of hidden fallbacks, so their duplication is reduced at the correct layer and their identity no longer depends on `modern-minimal`.

### [FIX] PDP Family Runtime Reduced Product-Page Repetition Without Cloning Theme Pages (2026-04-27)
- **Description**: After the end-of-funnel pass, many storefront presets were still collapsing into near-identical `pdp` structures, especially around the gallery/info/upsell/reviews rhythm, which kept product pages feeling duplicated even when home or checkout looked more differentiated.
- **Root Cause**:
  1. Several theme clusters still inherited the same generic PDP section variants (`standard`, `accordion`, `balanced`, `compact`) with only token-level differences.
  2. The shared library already contained stronger PDP variants, but there was no runtime family layer assigning them consistently across related presets.
  3. A few presets intentionally omit some PDP modules, so naive override logic would have risked injecting extra sections and damaging handcrafted product-page composition.
- **Fix**:
  1. Extended `frontend/src/storefront/themes/experienceOverrides.ts` with a dedicated PDP-family layer (`market`, `nature`, `command`, `boutique`, and `playful`) alongside the earlier commerce-flow families.
  2. Added safe section builders plus a `pickExistingReplacements()` guard so runtime overrides only patch PDP section types already present on a theme's authored page.
  3. Routed representative theme groups to stronger existing PDP variants across `product-gallery`, `product-info`, `conversion-stack`, `bought-together`, `related-products`, and `reviews`, while also adjusting copy/assurance framing per family.
  4. Expanded `frontend/src/storefront/__tests__/themeExperienceOverrides.test.ts` so representative market, nature, boutique, playful, and command themes now assert the expected PDP variants directly.
  5. Fixed a manifest compatibility mismatch by allowing `journal-strip` on `collections`, which matched existing `atelier-nova` usage and unblocked honest theme validation.
- **Impact**: Product pages now separate by family at runtime instead of converging into the same generic PDP grammar, which reduces perceived duplication without multiplying theme JSON maintenance.

### [FIX] Commerce Flow Families Reduced End-Of-Funnel Theme Duplication (2026-04-27)
- **Description**: A large share of storefront presets still converged into near-identical `cart`, `checkout`, and `thank-you` experiences even when the home/shop/PDP surfaces looked more distinct, which made many themes feel duplicated at the moment of conversion.
- **Root Cause**:
  1. The storefront library was richer in top-of-funnel building blocks (`hero`, `collections`, `product-grid`) than in end-of-funnel archetypes.
  2. Many themes inherited the same `cart-items`, `order-summary`, `checkout-form`, `payment`, and `order-confirmation` variants, so theme differentiation collapsed late in the purchase journey.
  3. `frontend/src/storefront/themes/experienceOverrides.ts` had also outgrown its narrow `TargetThemeExperienceId` typing, which blocked broader runtime family patching once more presets started sharing structured override logic.
- **Fix**:
  1. Added new end-of-funnel variants to `frontend/src/storefront/sections/manifest.ts` and `frontend/src/storefront/variants/registry.ts`: `market-basket`, `nature-cart`, `market-summary`, `nature-summary`, `market-checkout`, `nature-checkout`, `market-payment`, `nature-payment`, `market-aftercare`, `nature-aftercare`, and `command-aftercare`.
  2. Extended `CartItems.tsx`, `OrderSummary.tsx`, `CheckoutForm.tsx`, `PaymentSection.tsx`, and `OrderConfirmation.tsx` so each new family has distinct tone, copy, CTA rhythm, chips, and reassurance states instead of only token-level recoloring.
  3. Added a new commerce-flow-family layer in `frontend/src/storefront/themes/experienceOverrides.ts` that patches `cart`, `checkout`, and `thank-you` sections by family (`market`, `nature`, `command`, `boutique`, `playful`, and `soft aftercare`) while preserving explicit theme-owned overrides.
  4. Broadened the override-table typing so the runtime can safely read the real theme ids already present in the file instead of failing on the first non-target preset key.
  5. Added focused regression coverage in `frontend/src/storefront/__tests__/variantRegistry.test.ts` and `themeExperienceOverrides.test.ts`, then rechecked generated-page behavior and theme validation.
- **Impact**: Storefront presets now have a reusable runtime mechanism for end-of-funnel separation, which reduces cart/checkout/thank-you sameness without cloning full page definitions for every single theme.

### [FIX] Kids Play Preview Was Still Leaking Generic Store Copy, Weak Sample Data, And Silent Hero Fallback (2026-04-27)
- **Description**: `kids-play` marketplace preview was not yet trustworthy enough for approval. The theme still carried generic identity leftovers, weak fallback sample products, and a live hero/collections surface that could leak English CTA or shoe-oriented copy despite the plan claiming a dedicated kids storefront.
- **Root Cause**:
  1. `frontend/src/storefront/themes/kids-play.json` still needed a full toy-store pass across SEO, preview metadata, support/policy text, and first-fold merchandising copy.
  2. Marketplace preview data for `kids-play` was previously too generic and not deep enough for a convincing toy-store review, so the theme needed its own products, galleries, variants, reviews, and order/cart seeds.
  3. `frontend/src/storefront/sections/HeroBanner.tsx` declared `layered-parallax-sky` in the variant registry but did not actually route to an implementation, and the hero prop mapper only read `ctaText/ctaLink` instead of the theme's `primaryCtaText/primaryCtaLink`.
  4. `frontend/src/storefront/sections/FeaturedCollections.tsx` still exposed a shoe-specific fallback subtitle (`نوع الحذاء المناسب`) when the kids collections surface omitted an explicit subtitle.
- **Fix**:
  1. Added `frontend/src/storefront/preview/kidsPlayMarketplaceData.ts` with 8 toy products, 4-photo galleries for featured SKUs, meaningful variants, recommendations, reviews, and real-photo media direction.
  2. Wired `kids-play` into `marketplaceSampleData.ts`, `marketplacePreviewCart.ts`, and `marketplacePreviewOrder.ts` so `home/shop/pdp/checkout/thank-you` all follow the same preview purchase story (`KP-2048`).
  3. Updated `frontend/src/storefront/themes/kids-play.json` to align brand name, SEO, trust/policy copy, hero media, collections copy, and preview image with a toy-store identity.
  4. Added `LayeredParallaxSkyHero` to `HeroBanner.tsx`, wired the variant, and taught the hero props to read `primaryCtaText/primaryCtaLink` before falling back.
  5. Added a kids-specific fallback subtitle for `floating-bubbles` in `FeaturedCollections.tsx` and a regression test in `frontend/src/storefront/__tests__/kidsPlayPreviewProtocol.test.tsx`.
- **Impact**: `kids-play` preview now reads as a consistent toy-store storefront across desktop/mobile and no longer leaks `SHOP NOW`, shoe copy, or generic sample catalog behavior during approval review.

### [FIX] Marketplace Preview Conversion Settings Could Crash On Style-Store Family Themes (2026-04-27)
- **Description**: Some marketplace preview storefronts in the `style-store` family such as `modern-minimal` could crash during render with `ReferenceError: isStyleStorePreview is not defined`, which took down conversion hosts like `GlobalConversionHost`, `StickyAddToCartHost`, and `CartUpsellHost`.
- **Root Cause**:
  1. `frontend/src/storefront/utils/marketplaceApps.ts` had grown several branch-local preview flags while expanding marketplace-specific conversion copy.
  2. The `style-store` branch depended on `isStyleStorePreview` from inside the conversion settings path, which made the runtime more fragile during active preview/HMR flows and recent marketplace preview refactors.
- **Fix**:
  1. Centralized marketplace preview flag resolution in `resolveMarketplacePreviewFlags()` so all preview-specific booleans come from one shared helper instead of ad hoc branch-local declarations.
  2. Rewired both `isStorefrontMarketplaceAppEnabled()` and `getStorefrontMarketplaceAppSettings()` to use the shared helper.
  3. Added regression coverage in `frontend/src/storefront/__tests__/marketplaceApps.test.ts` for `modern-minimal` marketplace preview so the style-store conversion copy branch is executed directly and must stay crash-free.
- **Impact**: Marketplace preview storefronts in the style-store family no longer blank the shell when conversion hosts read preview app settings.

### [FIX] Marketplace Theme Preview Could Fall Back To Live Store Products For Uncovered Themes (2026-04-27)
- **Description**: Several storefront themes inside `/marketplace/themes` were opening preview mode with real company products instead of theme-matched sample products, so the weakest templates felt inconsistent and some previews no longer reflected the theme's own category or merchandising direction.
- **Root Cause**:
  1. Marketplace preview mode only had handcrafted sample datasets for a subset of themes.
  2. When `previewTheme` did not resolve to `themePreviewData` or `marketplaceSampleData`, storefront hooks fell through to the live public products API for the current company.
  3. Cart/order preview seeds were also incomplete, so newly covered themes needed a safe fallback beyond just the product list.
- **Fix**:
  1. Added generated marketplace preview datasets for every uncovered storefront preset by deriving products from theme/category metadata and each theme's own asset pool before using broader fallback imagery.
  2. Auto-generated related/bought-together maps and lightweight review payloads so generated previews stay coherent on home/shop/PDP surfaces.
  3. Added cart/order fallback generation so preview checkout and thank-you flows keep working even when a theme does not have handcrafted seeds.
  4. Added regression tests that require preview coverage across all storefront themes and verify generated previews for previously uncovered themes like `modern-minimal` and `nile-bistro`.
- **Impact**: Theme marketplace preview no longer borrows the merchant's live catalog for uncovered presets; every storefront theme now opens with its own dedicated preview catalog and a working sample purchase flow.

### [FIX] Marketplace Theme Cards Were Falling Back To SVG Or Empty Gradient Previews (2026-04-27)
- **Description**: A large slice of storefront theme cards in `/marketplace/themes` could render with vector previews or with no image at all, which made the gallery feel unfinished and made several presets hard to distinguish at a glance.
- **Root Cause**:
  1. `frontend/src/storefront/themes/catalog.ts` depended on a small manual `STOREFRONT_THEME_PREVIEW_IMAGES` map that did not cover the full preset registry.
  2. Many newer or older presets either exposed `preview.svg` only or carried no marketplace preview mapping at all, so fallback cards degraded to abstract gradients even when the theme already had real hero/product imagery elsewhere in its own preset data.
  3. When the API echoed the same default vector preview back, normalization preserved it verbatim instead of upgrading the card to a stronger raster fallback.
- **Fix**:
  1. Added a generalized preview-image resolver in `catalog.ts` that prefers raster assets and scans theme sections (`backgroundImage`, `panelImage`, `slides`, `collections`, `cards`, and nested image fields) to derive a representative marketplace preview from the preset itself.
  2. Taught catalog normalization to replace default vector previews with the richer fallback preview image when the API returns the same stock `svg` preview path.
  3. Filled the remaining legacy gaps with explicit photo fallbacks so every fallback catalog preset now resolves to a non-`svg` marketplace image.
  4. Added regression coverage in `themeCatalog.test.ts` and rechecked the marketplace page test plus theme validation.
- **Impact**: Marketplace theme cards now show a real representative image across the full fallback catalog instead of collapsing into vector placeholders or blank gradient shells.

### [FIX] Marketplace Theme Cards Could Still Show Stale Local SVG/Placeholder Previews Even After Fallback Coverage Improved (2026-04-27)
- **Description**: A second visual pass on `/marketplace/themes` showed that several cards were still rendering local `preview.svg` or placeholder sources in the live UI even though the catalog already had better photo-grade fallbacks available.
- **Root Cause**:
  1. `normalizeStorefrontThemeCatalogItem()` only upgraded API preview images when the returned vector path matched a narrow set of known default vector candidates.
  2. The marketplace API could return older local preview paths from different presets or generic placeholder sources, and those escaped the earlier replacement condition.
  3. A few important theme ids (`atelier-nova`, `elegant-luxe`, `restaurant-demo`, `furniture-demo`, `electronics-demo`, `max-care-go`, `cafe-demo`, `menswear-prime`, `mystic-desert`, `zen-organic`) still needed direct curated preview mappings to guarantee a strong photo source.
- **Fix**:
  1. Expanded `STOREFRONT_THEME_PREVIEW_IMAGES` with explicit photo-grade preview sources for the reviewed theme ids above.
  2. Taught normalization to upgrade stale local `svg` preview assets and local placeholder paths whenever the fallback catalog already resolves to a stronger raster/photo preview.
  3. Added regression coverage proving that stale API preview paths such as `/assets/themes/shop-orbit/preview.svg` and `/placeholders/pharmacy-preview.png` normalize to the curated marketplace image instead of leaking through to the card.
- **Impact**: The live marketplace card grid now upgrades old API preview paths to the intended photo preview, so the visual result matches the stronger fallback catalog instead of showing mixed-quality leftovers.

### [FIX] Preview Buttons Could Open Both A New Tab And The Current Page (2026-04-27)
- **Description**: Storefront preview actions in the theme marketplace and visual editor could open the preview in a new tab while also navigating the current admin page away, which made the preview button feel duplicated and disruptive.
- **Root Cause**:
  1. Preview actions were calling `window.open(previewUrl, "_blank", "noopener,noreferrer")` and treating a `null` return value as a hard popup failure.
  2. Some browsers can still create the new tab while returning `null` when `noopener`-style protections are applied, so the code incorrectly triggered the same-tab fallback too.
- **Fix**:
  1. Added `openUrlInNewTab()` to open a blank tab first, clear `opener`, then redirect that tab to the preview URL.
  2. Rewired `StorefrontThemes.tsx` and `StorefrontVisualEditorPage.tsx` to use the new helper and show a popup-blocked toast instead of forcing same-tab navigation.
  3. Added focused regression coverage for the safe new-tab helper and updated the marketplace preview test to assert the redirected-tab flow.
- **Impact**: Preview buttons now open a single preview destination only, so merchants stay on their admin screen while the preview opens in the intended tab.

### [FIX] Storefront Preview Could Crash On Null Theme Identifiers (2026-04-27)
- **Description**: Some storefront preview sessions crashed during render with `Cannot read properties of null (reading 'startsWith')`, which blanked the shell before the marketplace preview finished mounting.
- **Root Cause**:
  1. `marketplaceApps.ts` assumed `resolveMarketplacePreviewThemeId()` always returned a string, even though preview mode can legally start before `previewTheme` exists and the resolver returns `null`.
  2. `StorefrontShell.tsx`, `ProductInfo.tsx`, and path helpers still called `.startsWith()` on values that were typed as strings but could be `null` during transient preview/setup states.
- **Fix**:
  1. Guarded the Elessi preview detection path so `conversion-suite` no longer calls `.startsWith()` on a null preview theme.
  2. Hardened shell/PDP theme checks with null-safe `theme.id?.startsWith(...)` handling.
  3. Normalized nullish route/path/search inputs in `paths.ts` and added regression coverage in `marketplaceApps.test.ts` and `paths.test.ts`.
- **Impact**: Storefront preview now stays up even when preview identifiers arrive late or partially, instead of crashing the entire shell on first render.

### [FIX] Elessi Pack Themes Were Still Sharing Shell Cues, Borrowed Media, And Slow Mobile PDP Folds (2026-04-27)
- **Description**: Several `Elessi` pack themes still felt too close to each other during real browser review. The weakest surfaces were reusing inherited shell behavior, mixed borrowed media, and mobile-first folds that delayed the real product decision area.
- **Root Cause**:
  1. Some pack themes still inherited older preview/header/footer behavior or shared too much rounded-token language, so they read like light restyles instead of separate storefronts.
  2. Multiple themes still depended on remote or cross-theme media pools, which made `Home`, `Shop`, and `PDP` surfaces look stitched together instead of category-native.
  3. Compact mobile `PDP` flow still wasted first-screen space in several Elessi variants through extra chips, heavier galleries, or late CTA placement.
- **Fix**:
  1. Reworked the affected `Elessi` hero, gallery, buybox, preview-banner, and page-banner families in `StorefrontShell.tsx`, `HeroBanner.tsx`, `ProductGallery.tsx`, `ProductGrid.tsx`, and `ProductInfo.tsx`.
  2. Added dedicated local asset sets for `carry-lane`, `chrono-gallery`, `garage-fit`, `gem-atelier`, `glow-routine`, `harvest-fold`, `pedal-lab`, `sprout-room`, and `tail-supply`, then rewired `elessiPack.ts` and `elessiPackMarketplaceData.ts` to use explicit per-theme media instead of fallback pools.
  3. Added shape/product-card token overrides plus stronger protocol assertions in `elessiProtocolGuards.test.ts` so themes must now differ across both structural and visual axes.
  4. Tightened mobile first folds by moving product stages earlier, hiding low-priority chips on phones, compacting Elessi product breadcrumbs, and making the first visible product cards eager-load instead of waiting on lazy image fetch.
- **Impact**: The reviewed Elessi themes now read as genuinely separate category storefronts, keep their own media and chrome, and reach product-decision surfaces faster on mobile without leaking old-shell behavior.

### [FIX] Vela PDP Still Duplicated The Final Purchase Action (2026-04-27)
- **Description**: `vela-fashion-eg` product pages still showed a hybrid action pattern where the upper `اشتري الآن` entry button was followed by a quick-order form that also exposed an extra add-to-cart CTA, which diluted the direct-order flow.
- **Root Cause**: The theme-level `pdp-checkout` config still left `showAddToCartButton` enabled even after the rest of the `Vela` page had been simplified toward a direct-order rhythm.
- **Fix**: Disabled the extra form-level add-to-cart button in `frontend/src/storefront/themes/vela-fashion-eg.json` and kept the upper `اشتري الآن` control as the entry/scroll action only.
- **Impact**: `Vela` PDP now behaves more like a focused direct-order surface, with one final action owner inside the form instead of two competing closing CTAs.

### [FIX] Store Analytics Dashboard Still Spent Too Much Space On Generated Reading Cards (2026-04-27)
- **Description**: After the earlier data-health redesign, `/analytics/store` still dedicated a full panel to generated "reading" notes, which made the dashboard longer without adding enough decision value during daily review.
- **Root Cause**: `StoreAnalyticsDashboard.tsx` still rendered `buildAnalyticsNotes()` output as a dedicated section, even though the page already surfaced the important guidance inside the hero, funnel, and product warning states.
- **Fix**: Removed the standalone analytics-notes section and its helper card rendering from `frontend/src/pages/Analytics/StoreAnalyticsDashboard.tsx`, leaving the tighter KPI/data-health narrative as the primary briefing path.
- **Impact**: The analytics dashboard is now shorter and easier to scan, while still preserving the essential warning and funnel context where operators actually make decisions.

### [FIX] Store Analytics Funnel Now Reflects Direct-Order Storefronts (2026-04-27)
- **Description**: After visits started tracking correctly, `/analytics/store` could still read as if the funnel were broken because `add to cart` looked smaller than `checkouts` on storefronts that support quick order or direct purchase.
- **Root Cause**:
  1. The dashboard rendered a strict cart-first funnel (`visit -> view -> add to cart -> checkout -> purchase`) even though this storefront supports direct order flows that bypass cart entirely.
  2. Product-view counts can naturally exceed visits, but the old row messaging treated every stage above the visit baseline as suspicious.
- **Fix**:
  1. Rebuilt the store-dashboard funnel around the linear journey that is actually required: `visit -> product view -> started order -> purchase`.
  2. Kept `addToCarts` as a supporting signal and added dashboard notes that explicitly explain when direct order paths are stronger than cart usage.
  3. Updated funnel row copy so repeated product views are treated as normal shopper behavior instead of being framed as a likely tracking error.
  4. Added focused regression coverage in `storeAnalyticsDashboard.utils.test.ts`.
- **Impact**: `/analytics/store` now reads more simply and more honestly for quick-order storefronts, so operators can trust the story of shopper intent without mistaking direct checkout behavior for a broken funnel.

### [FIX] Legacy Funnel Analytics Endpoint Was Still Cart-First And Date-Filter Fragile (2026-04-27)
- **Description**: The older `Analytics > Funnel` page could still show an outdated cart-first story (`إضافة للسلة -> بدء الدفع`) even after the newer store dashboard had been corrected for direct-order storefronts.
- **Root Cause**:
  1. `getFunnelAnalytics()` still modeled checkout as something that must come after cart activity, which made quick-order stores look unhealthy by design.
  2. The same endpoint filtered `productVisit` using the wrong timestamp field when date params were present, so filtered requests could silently degrade into empty or misleading funnel results.
  3. Purchases were counted from regular orders only, while storefront analytics elsewhere already merged mirrored and guest-order snapshots.
- **Fix**:
  1. Rebuilt `getFunnelAnalytics()` around the real storefront journey: `visit -> product view -> started order -> purchase -> delivered`.
  2. Switched product-view filtering to `visitedAt` and reused the shared analytics date-range parser.
  3. Counted purchases and delivered outcomes from the shared order snapshots so guest orders stay visible in the funnel.
  4. Added a supporting `add to carts` signal plus frontend hints that explain direct-order behavior without forcing it into the linear path.
  5. Added integration coverage in `storefrontPublicRoutes.test.js`.
- **Impact**: The legacy funnel page and API now tell the same direct-order story as `/analytics/store`, so operators no longer see the old page contradict the newer dashboard.

### [FIX] Legacy Funnel Analytics Copy Was Lost During i18n Merge On Production (2026-04-27)
- **Description**: After shipping the direct-order copy updates to `Analytics > Funnel`, Swan production rendered the new helper strings as raw keys like `funnelAnalytics.supportingSignalTitle` instead of translated text.
- **Root Cause**:
  1. The frontend build runs `npm run i18n:merge`, which regenerates `frontend/src/locales/*/translation.json` from `frontend/src/locales/*/sections/*.json`.
  2. The new funnel copy had been added directly to `translation.json`, so the CI merge step silently dropped it while building the production bundle.
- **Fix**:
  1. Moved the new `funnelAnalytics` strings into the source section files: `frontend/src/locales/ar/sections/funnelAnalytics.json` and `frontend/src/locales/en/sections/funnelAnalytics.json`.
  2. Re-ran the translation merge so production bundles now keep the direct-order helper copy and supporting-signal labels.
- **Impact**: The legacy funnel page now shows translated supporting copy in production instead of leaking raw i18n keys, and future builds will keep these strings because they live in the actual section source of truth.

### [FIX] `period=1` In Store Analytics Was Still Returning A Rolling 24h Window (2026-04-27)
- **Description**: After restoring storefront visit tracking, Swan analytics could still label the dashboard filter as `اليوم` while the API quietly returned data from the previous 24 hours instead of the current calendar day.
- **Root Cause**:
  1. `parseAnalyticsDateRange()` still treated numeric periods generically, so `period=1` behaved like `now - 24h`.
  2. The storefront-facing `store`, `top products`, and `daily` analytics handlers were still using older duplicated date parsing instead of the shared helper.
- **Fix**:
  1. Updated `parseAnalyticsDateRange()` so `period=1` maps to today's midnight and `period=2` maps to yesterday midnight through now.
  2. Switched the storefront analytics endpoints to the shared helper so summary cards, product tables, and daily charts all resolve the same date window.
  3. Added integration coverage in `storefrontPublicRoutes.test.js` to prove `period=1` now returns the current calendar-day start across all three public analytics endpoints.
- **Impact**: `/analytics/store` now means "today" when it says `اليوم`, instead of mixing in yesterday's late-night data and inflating the briefing.

### [FIX] Storefront Sessions Were Not Emitting `store-visit` Analytics (2026-04-27)
- **Description**: Swan could show product views, add-to-cart events, and even purchases inside `/analytics/store` while `visits` stayed at `0` for the current day, which made the funnel look broken even after the dashboard UI started warning about bad data.
- **Root Cause**:
  1. `analyticsService.trackStoreVisit()` existed and deduped correctly per session, but no shared storefront entrypoint was actually calling it on live page loads.
  2. Product-level tracking continued to fire from `useStorefrontFacebookTracking`, so downstream events accumulated without the top-of-funnel visit baseline.
  3. In storefront contexts that relied on freshly fetched public settings, `storefront_companyId` needed to be persisted before sending the visit request so the analytics client could always resolve company scope.
- **Fix**:
  1. Added `useStorefrontVisitTracking()` as a central storefront hook that runs from `StorefrontShell` on real shopper routes only.
  2. Skipped the visit event in preview and `productPreview=1` modes so theme editing and product preview flows do not pollute merchant analytics.
  3. Persisted `storefront_companyId` before tracking and sent the normalized landing path to `/analytics/track/store-visit`.
  4. Added focused regression coverage in `useStorefrontVisitTracking.test.tsx` to prove live storefront loads track once while preview routes stay silent.
- **Impact**: New storefront sessions now restore the missing top-of-funnel `visit` signal, so `/analytics/store` can show healthier Swan-like daily funnels instead of permanently reporting views and purchases over zero visits.

### [FIX] Store Analytics Dashboard Now Flags Broken Tracking Before Showing Conversion (2026-04-27)
- **Description**: `/analytics/store` could look polished while still pushing misleading decisions. In the current Swan-like dataset it showed revenue and purchases while visits stayed at `0`, yet the page still surfaced `0.0%` conversion, repeated summary cards, and empty insights as if nothing was wrong.
- **Root Cause**:
  1. The dashboard UI treated contradictory analytics as ordinary zeros instead of a data-quality issue.
  2. Product ranking cards assumed a clean `purchases` payload and could misread legacy `sales` responses from older analytics shapes.
  3. The top of the page repeated the same story across too many cards, which made the briefing slower to scan without adding decision value.
  4. The custom date-range controls relied on React state alone, so `تطبيق الفترة` could still read empty dates while the user already saw valid values inside the inputs.
- **Fix**:
  1. Added `buildDataHealthStatus()` plus regression coverage so the page now detects missing visits / missing visitors / revenue-without-baseline anomalies explicitly.
  2. Reworked the hero + summary copy in `StoreAnalyticsDashboard.tsx` to be shorter, less repetitive, and more decision-oriented.
  3. Added in-context warning states for the hero, insights, funnel rows, and product cards so incomplete tracking is called out directly instead of being shown as a fake `0%`.
  4. Added frontend compatibility for legacy top-product payloads that still return `sales` instead of `purchases`.
  5. Switched the custom date inputs to native `<input type="date">` fields and added a ref-based fallback inside `applyCustomRange()` so the applied filter reads the live visible values even if state sync lags.
  6. Changed the dashboard's default opening period from `آخر 30 يوم` to `اليوم` so the first load matches the daily-briefing use case instead of a wider historical view.
- **Impact**: Operators now get a simpler dashboard that warns them to review tracking before trusting conversion math, which makes `/analytics/store` safer and more productive as a daily briefing surface.

### [FIX] Public Shipping Quote POST Was Still Protected by Global Security (2026-04-26)
- **Description**: The storefront shipping quote fix still could not take effect publicly because the new `POST /api/v1/shipping-zones/public/:companyId/calculate` route returned `AUTHENTICATION_REQUIRED` after deployment, even though the matching `GET` route was public.
- **Root Cause**: `backend/middleware/globalSecurity.js` only listed `GET /api/v1/shipping-zones/public/*` in `PUBLIC_ROUTES`, so the public `POST` request was intercepted by auth before reaching `shippingZoneRoutes`.
- **Fix**:
  1. Added `POST /api/v1/shipping-zones/public/*` to `PUBLIC_ROUTES`.
  2. Added focused regression coverage in `backend/tests/auth/globalSecurity.publicShippingQuote.test.js` to prove the route stays public without auth.
- **Impact**: Storefront PDP and checkout can now send quote items to the backend in production, so the shopper sees the correct product shipping charge instead of the governorate-only base fee.

### [FIX] Shipping Quote Used General Fee Instead Of Product Shipping Class (2026-04-26)
- **Description**: Product-page quick order and checkout payment summary could display the governorate's base shipping fee only, while skipping the product's configured shipping-class surcharge. In some cases the final order could also fall back to the generic `standard` class because variant metadata carried the default class automatically.
- **Root Cause**:
  1. The public shipping quote endpoint only matched the governorate zone and did not receive or inspect the current cart/product items.
  2. `resolveShippingClass()` preferred variant metadata first, so variants saved with the default `standard` value overrode a custom product-level class like `وم`.
- **Fix**:
  1. Updated `resolveShippingClass()` so a variant only overrides the product when it carries a non-standard explicit shipping class.
  2. Extended the public shipping quote endpoint to accept storefront items, resolve their effective shipping classes, and add the matching surcharge into the returned quote.
  3. Updated `storefrontApi.calculateShipping()`, `PdpQuickOrderForm.tsx`, and `PaymentSection.tsx` to send the current product/cart items when requesting a shipping quote.
  4. Added regression coverage in `backend/utils/__tests__/shippingClassUtils.test.js`.
- **Impact**: The shipping amount shown to the shopper now matches the configured product shipping class instead of falling back to the general governorate fee.

### [FIX] Marketplace Theme Query-State Refresh (2026-04-25)
- **Description**: The storefront themes marketplace could keep using stale company-derived preview state after query-string changes, so some marketplace transitions depended on a full reload before the correct target company context appeared.
- **Root Cause**: `StorefrontThemes.tsx` memoized `currentCompanyId` from `authCompanyId` alone, while the fallback resolver also reads from the current URL search params. Query updates therefore did not always invalidate the memoized company state.
- **Fix**: Added `searchParams` to the `currentCompanyId` memo dependencies so marketplace query changes immediately refresh the derived company context without waiting for a page reload.
- **Impact**: Theme marketplace flows that switch or preserve company context through URL params now stay in sync during in-app navigation.

### [FIX] Product Editor Shipping Class Company Scope (2026-04-26)
- **Description**: Editing a product could show the wrong shipping-class list, or fall back to the raw saved key instead of the merchant-facing label, when the authenticated user context did not match the product's owning company.
- **Root Cause**: `ProductNewFinal.tsx` loaded `/settings/company` from `user.companyId` before it resolved the edited product's `companyId`, so cross-company product editing pulled the wrong shipping-class settings.
- **Fix**:
  1. Added `resolveShippingClassSettingsCompanyId` so product editing prefers the product's own company context while product creation still uses the authenticated company.
  2. Delayed the shipping-class settings fetch until the product payload is loaded in edit mode, then requested `/settings/company` with the resolved `companyId`.
  3. Added focused regression coverage in `shippingClassCompany.test.ts`.
- **Impact**: Product shipping selectors now load the correct custom class labels for the company that owns the product, including saved classes like `تايم هاند`.

### [FIX] Store Analytics Dashboard Resilience & Executive Redesign (2026-04-25)
- **Description**: `/analytics/store` looked visually weak for decision-making and could collapse completely if any one analytics endpoint failed. It also parsed product images unsafely during render and showed impossible funnel percentages in a misleading way.
- **Root Cause**:
  1. The page used `Promise.all`, so a single failed request forced a full-page error state.
  2. Product thumbnails depended on direct `JSON.parse(product.images)` inside render.
  3. Funnel bars visually clamped at 100% while the labels could show rates above 100%, which weakened trust in the UI.
  4. The layout relied on generic equal-weight cards and a plain table instead of a strong analytics hierarchy.
- **Fix**:
  1. Rebuilt `StoreAnalyticsDashboard.tsx` around `Promise.allSettled` with in-page partial warnings instead of an all-or-nothing failure.
  2. Added `storeAnalyticsDashboard.utils.ts` for safe image parsing, funnel normalization, and analytics notes.
  3. Added focused regression coverage in `storeAnalyticsDashboard.utils.test.ts`.
  4. Redesigned the page into an executive-style analytics surface with clearer KPI grouping, featured product emphasis, and stronger RTL/mobile rhythm.
- **Impact**: The store analytics page now degrades gracefully when one data source fails, avoids render crashes from malformed image payloads, and presents analytics in a way that is more trustworthy and easier to act on.

### [FIX] Shipping Class Persistence & Product Editor Sync (2026-04-21)
- **Description**: Adding a custom shipping class from `Settings > Store > Shipping` looked successful in the UI but did not persist clearly for merchants, and the same custom class did not appear inside product shipping selectors.
- **Root Cause**:
  1. The shipping classes editor updated local React state first, but did not protect the UX when the save request failed.
  2. Product editor shipping selectors still relied on static hardcoded class options instead of loading the company-configured classes from `/settings/company`.
- **Fix**:
  1. Updated `StoreSettings.tsx` so add/remove actions persist immediately and roll back the optimistic row if the save request fails.
  2. Added regression coverage for immediate save + rollback behavior in `StoreSettingsShippingClasses.test.tsx`.
  3. Updated `ProductNewFinal.tsx`, `ShippingTab.tsx`, `AdvancedTab.tsx`, and `VariantsTab.tsx` to load and render company shipping classes dynamically.
- **Impact**: Merchants can now add custom shipping classes with reliable save feedback, and those classes become available across the product creation and variant editing flows.

### [FIX] Stock Availability Logic — `trackInventory: false` (2026-04-14)
- **Description**: Products and variants marked with "Infinite Stock" (`trackInventory: false`) still appeared as "Out of Stock" (نفذت الكمية) if their numeric stock value happened to be 0.
- **Root Cause**: Components in `QuickOrderModal.tsx` and `ProductSearchColumn.tsx` were missing the logical check for the `trackInventory` flag.
- **Fix**: Replaced direct `stock > 0` checks with a unified `isInStock()` helper that returns true if tracking is disabled OR if stock is positive.
- **Impact**: Restored accurate availability indicators for digital products and services with infinite stock settings.

***

### [PERF] Storefront PDP Bootstrap & Below-the-Fold Deferral (2026-04-14)
- **Description**: Public product pages were loading too much storefront logic and third-party tracking too early, which slowed first paint and delayed the main product image on mobile and desktop.
- **Root Cause**:
  1. Storefront requests still booted through the broader app entry path before specializing for the public storefront.
  2. Facebook Pixel / Clarity initialization and storefront settings resolution created unnecessary early work during the first render.
  3. Below-the-fold sections such as related products and reviews began fetching immediately, even before the shopper approached them.
- **Fix**:
  1. Split storefront bootstrap from the admin app bootstrap in `frontend/src/main.tsx` and `frontend/src/storefront/StorefrontBootstrap.tsx`.
  2. Prefetched critical storefront settings/product data earlier and preloaded the PDP hero image once the product payload becomes available.
  3. Deferred Facebook Pixel and Clarity startup, and removed redundant public-settings fetches from storefront tracking hooks.
  4. Added deferred section activation for related products and reviews, and lowered fetch priority for non-critical gallery thumbnails/secondary images.
- **Impact**: Reduced early request pressure on PDP loads, improved hero image discovery, and cut non-critical storefront work from the initial page load while preserving the current theme output.

### [FIX] Storefront Preview Return Routing Regression (2026-04-22)
- **Description**: Marketplace theme previews started rendering the long preview banner for generic themes again, while pharmacy-style preview docks generated absolute localhost admin links instead of stable return routes.
- **Root Cause**: `StorefrontShell.tsx` always reused the expanded preview banner for non-special themes after the storefront/theme sync merge, and `buildStorefrontPreviewAdminPath` fell back to `window.location.origin`, which forced absolute URLs even when no explicit admin origin was available.
- **Fix**: Added a compact marketplace-return action for previews that carry an explicit `previewAdminOrigin`, and updated `buildStorefrontPreviewAdminPath` to fall back to relative admin paths when the preview is already running on the admin origin.
- **Impact**: Theme previews now return merchants to the correct marketplace/settings pages across local, same-origin, and subdomain preview flows without leaking localhost URLs or reintroducing the full temporary-preview banner.

### [FIX] Marketplace Theme Navigation Route Template String (2026-04-10)
- **Description**: Redirection from the Storefront Themes Marketplace to the Visual Editor failed or incorrectly appended variables due to a malformed template string in `StorefrontThemes.tsx`.
- **Root Cause**: The route used a backtick string but lacked consistent variable interpolation or proper `encodeURIComponent` for the `themeId` parameter, leading to broken navigation for themes with special characters or unexpected ID formats.
- **Fix**: Replaced the malformed string with a robust URI construction: `"/settings/storefront?theme=" + encodeURIComponent(themeItem.themeId)`.
- **Impact**: Restored seamless navigation between the marketplace and the visual editor, ensuring merchants can instantly start customizing their selected themes.

***

### [FIX] Template Marketplace Visibility Sync - Femme Chic (2026-03-20)
- **Description**: Newly created system templates were not automatically visible in the storefront marketplace (`/templates`).
- **Root Cause**: The `syncSystemTemplateMarketplaceApp` helper effectively creates the marketplace record but defaults visibility to `false` in the database, requiring a manual toggle via the Super Admin UI.
- **Fix**: Manually toggled the "الظهور في المتجر" switch in the Super Admin Homepage Templates UI for the "Femme Chic" template.
- **Impact**: Template is now discoverable and installable by all store owners.

### [FIX] PDP Variant Styles & Color Swatches Not Applying (2026-04-09)
- **Description**: PDP widgets ignored the variant display style selected in the dashboard, and color swatches rendered as empty circles when color values were Arabic text without images. PDP/Shop also threw `Unknown argument deletedAt` on environments lacking the soft-delete column.
- **Root Cause**: `variantSettings` was not persisted into product metadata; public product routes filtered by a non-existent `deletedAt` column; swatch rendering depended solely on CSS color names or images.
- **Fix**: Persist `variantSettings` in `productController.js`, remove `deletedAt` filters from `publicProductsRoutes.js`, and add Arabic/English color-name → HEX mapping in `VariantSelector.tsx`.
- **Impact**: PDP now honors dashboard widget styles, shows filled color swatches even without images, and no longer returns 500s tied to `deletedAt`.


### [FIX] Storefront PDP 500 Error - Invalid Prisma Include (2026-03-20)
- **Description**: Navigating to certain PDP pages or the Shop page resulted in a 500 Internal Server Error.
- **Root Cause**: An invalid Prisma `include` statement was added to the public product routes, attempting to include a scalar field as a relation.
- **Fix**: Removed the invalid `include: { images: true }` from `publicProductsRoutes.js`.
- **Impact**: Restored full access to the product catalog and PDPs.


### [FIX] Double Footer Bug - Premium Theme Detection (2026-03-20)
- **Description**: A double footer (global + theme-specific) appeared on Cart and Checkout pages when using premium themes like "Femme Chic".
- **Root Cause**: `StorefrontLayout.tsx` was not reliably detecting the active premium theme when overridden via the `layout` URL parameter, failing to suppress the global footer.
- **Fix**: Updated `StorefrontLayout.tsx` to prioritize the `layout` query parameter using `URLSearchParams` on `location.search` for accurate theme detection and conditional footer rendering.
- **Impact**: Clean, premium brand experience with correctly suppressed platform footers on specialized pages.


### [FIX] Ethereal Glow Theme - Remediation & Performance (2026-03-19)
- **Description**: The "Ethereal Glow" theme suffered from rendering crashes when backend template data was missing, and demonstrated performance lag on iOS devices due to unoptimized blur effects.
- **Fixes**:
    - **Self-Contained Rendering**: Implemented default content logic in `EtherealGlowShop.tsx` and `EtherealGlowPDP.tsx`, eliminating "Blank Page" crashes for newly created stores.
    - **Contract Alignment**: Standardized all Ethereal Glow blocks to the unified `SectionProps` interface, resolving prop destructuring errors.
    - **Performance**: Optimized glassmorphism by applying `will-change: backdrop-filter` and `transform: translateZ(0)` to the main containers.
    - **Typography**: Integrated `Space Grotesk` globally via `index.html` and applied specific CSS overrides in `storefront-shared.css` to achieve the desired high-fidelity visual direction.
- **Impact**: Production-ready stability for Ethereal Glow, regardless of backend configuration state.


### [FIX] Vite Runtime Error - "process is not defined" (2026-03-20)
- **Description**: The storefront application was crashing with a `Uncaught ReferenceError: process is not defined` in the browser.
- **Root Cause**: Vite 6+ does not provide Node.js globals like `process` by default. Several third-party libraries (e.g., `framer-motion`, `redux`) and some source files expected `process.env`.
- **Fix**: Added a `define` block to `vite.config.ts` to shim `process.env` and `global` in the browser.
- **Impact**: Restored application stability across all themes and development environments.


### [FIX] Storefront Build Cleanup - Legacy Route Removal (2026-03-20)
- **Description**: `App.tsx` and `StorefrontRuntime.tsx` contained broken imports and routes for the deleted "Grill House" monolithic pages.
- **Fix**: Surgically removed all stale imports and React Router definitions to restore build integrity.
- **Impact**: Cleaned up technical debt and improved build performance.


### [FEATURE] Ethereal Glow Template - Glassmorphism UI (2026-03-20)
- **Description**: Finalized the complete transition of the storefront to a section-driven architecture.
- **Achievements**:
    - **Full Coverage**: PDP, Cart, Shop, and Checkout are now 100% controlled by universal composable layouts (`ComposablePDPLayout`, `ComposableCartLayout`, `ComposableShopLayout`, `ComposableCheckoutLayout`).
    - **Registry Centralization**: All layout keys now point to universal builders in `LayoutRegistry.tsx`.
    - **Section Library**: Populated `storefrontSectionRegistry.ts` with reusable sections from Luxury and Orbit themes.
    - **Debt Elimination**: Removed all legacy monolithic page components.
- **Impact**: Enables rapid theme development and full admin-side layout control for all existing and future themes.


### [REFACTOR] Storefront Atomic Composable Migration - PDP & Cart (2026-03-09)
- **Description**: Migrated the legacy monolithic PDP and Cart pages to the Atomic Composable architecture.
- **Fixes**:
    - **Universal Layouts**: Implemented shared PDP and Cart layout renderers to handle dynamic section rendering.
    - **Section Extraction**: Decoupled `LuxuryProductGallery`, `LuxuryProductInfo`, `LuxuryCartHeader`, and `LuxuryCartContent` from their monolithic parents.
    - **Linting & Types**: Fixed multiple "unused import" and "property name mismatch" errors (e.g., `themeOptions` -> `themeConfig`).
    - **Registry Sync**: Pointed all relevant routes in `LayoutRegistry.tsx` to the new universal builders.
- **Impact**: Reduced code duplication by 60%+ in the storefront directory and improved architectural consistency across all themes.


### [CLEANUP] Atomic Layout Migration - Monolith Removal (2026-03-09)
- **Description**: Successfully identified and removed all stale legacy monolithic layout files for Cart, PDP, and Checkout.
- **Actions**:
    - **Deletion**: Deleted `LayoutStandard.tsx`, `LayoutUntitled.tsx`, and `LayoutGrill.tsx` from the Cart directory.
    - **Deletion**: Deleted `LayoutStandard.tsx`, `LayoutAdvanced.tsx`, and `LayoutEditorial.tsx` from the PDP directory.
    - **Registry Cleanup**: Cleaned up `LayoutRegistry.tsx` by removing all stale monolithic imports and ensuring all paths default to the modern Atomic Composable components (e.g., Luxury Shoes variants).
- **Impact**: Zero technical debt from legacy monolithic layouts; 100% adherence to the Atomic Composable V4 standard.


### [FIX] Storefront Architectural Hardening & Schema Alignment (2026-03-19)
- **Description**: Standardized remaining legacy layouts (`Elessi`, `Stitch Editorial`) and aligned the `ThemeManifest` settings schema with its interface definition.
- **Fixes**:
    - **Modular Layouts**: Refactored `ShopElessiLayout` and `ShopStitchEditorialLayout` to import utilities and hooks directly, removing 200+ lines of duplicate logic and prop-drilling.
    - **Headless Autonomy**: Updated `ElessiProductGrid` and `ElessiProductCard` to be self-sufficient for link/image resolution.
    - **Schema Accuracy**: Corrected `ThemeManifest.settingsSchema` from a flat object to the required `ThemeSettingsSchema[]` array format (sections and fields).
    - **Type Safety**: Eliminated `any` casts in layout destructuring and fixed 15+ linting errors related to missing imports and property access.
- **Impact**: 100% architectural consistency across all storefront themes; production-ready for dynamic admin control.


### [FIX] Architectural Hardening & Storefront Remediation (2026-03-09)
- **Description**: Identified several weaknesses in the storefront during Phase 3 review: code duplication in product grids, unsafe `any` types in props, and inconsistent `companyId` state management.
- **Fixes**:
    - **Logic Centralization**: Created `storefrontUtils.ts` to unify image parsing and link generation, removing 100+ lines of duplicate logic.
    - **Identity Management**: Updated `useThemeParams` to be the single source of truth for `companyId`, eliminating direct `localStorage` access in UI components.
    - **Type Safety**: Migrated all Product Grid components to strict `StorefrontProduct` types.
    - **Tooling**: Fixed `tsconfig.json` module resolution to repair Storybook type declarations.
    - **Registry Sync**: Linked `LayoutRegistry` to `ThemeRegistry` via `manifestId`.
- **Impact**: Production-grade stability, full type safety, and consolidated storefront logic.


### [FIX] Luxury Shoes - Atomic Composable & Headless Refactor (2026-03-19)
- **Description**: The theme was partially using a page-based monolithic approach and had business logic (coupons, filters) mixed with UI.
- **Fixes**:
    - **Architecture**: Refactored `LuxuryShoesHome.tsx`, `LuxuryShoesCollection.tsx`, and `LuxuryShoesCart.tsx` to follow a pure Atomic Composable pattern.
    - **Logic Separation**: Created the `useCoupon` headless hook to handle discount validation and math, separating it from the Cart UI.
    - **Dynamic Content**: Moved hardcoded hero/banner sections to `template.content.sections` and `settings`, enabling 100% dynamic control from the admin dashboard.
    - **Filters**: Connected the "Craftsmanship" filter in the collection page to the headless shop logic, ensuring premium footwear attributes are searchable.
- **Impact**: Full architectural alignment with V4 standards, improved maintainability, and a 100% headless data flow.


### [FIX] Luxury Shoes - Layout Loading Glitch & Structural Damage (2026-03-19)
- **Description**: Monolithic `StorefrontNav` flashed during layout resolution. Code within `StorefrontTemplatePage` was structurally missing rendering hooks. Header branding was hardcoded.
- **Fixes**: 
    - **Reconstruction**: Restored hook state configurations within `StorefrontTemplatePage.tsx`. 
    - **Header Injection**: Tied dynamic store name `useStorefrontSettings` config into the `LuxuryHeader.tsx` layout components.
    - **Suppression**: Implemented `isLuxuryShoes` boolean switch inside `/pages/storefront/StorefrontTemplatePage.tsx` to conditionally exclude monolithic React wrappers while the Atomic Headless layout resolves.
- **Impact**: Stabilized and cleaned up the initial Premium site render phase layout on all Core paths.


### [FIX] Luxury Shoes - Image Fidelity & Category Naming (2026-03-09)
- **Description**: Product images were showing as DiceBear SVG placeholders, and categories had duplicated "Luxury" suffixes (e.g., "Luxury Luxury Sneakers").
- **Root Cause**: 
    - **Images**: The `images` field in the `Product` model is a JSON string, which wasn't being correctly parsed by the frontend logic.
    - **Categories**: The `fix_luxury_data.js` script had idempotent issues with the "Luxury" prefix.
- **Fixes**:
    - **Data**: Updated `fix_luxury_data.js` to store images as structured JSON arrays of objects and added logic to prevent double-prefixing categories.
    - **Frontend**: Updated `LuxuryShoesCollection.tsx`, `LuxuryShoesPDP.tsx`, and `LuxuryShoesHome.tsx` to handle both JSON-encoded `images` and the `mainImage` fallback.
    - **Cleanup**: Resolved TypeScript linting errors in `LuxuryShoesPDP.tsx`.
- **Impact**: High-fidelity visual experience with authentic footwear imagery and clean category naming.


### [FIX] Luxury Shoes - Routing, Persistence & Data Integrity (2026-03-19)
- **Description**: The storefront had several functional gaps: broken cart/checkout redirects, loss of theme context on navigation, and inconsistent product data for the 'maxp' company.
- **Fixes**:
    - **Routing & Persistence**: Updated `LuxuryHeader` to synchronize the `layout` query parameter across all navigation links and the logo. Added automatic redirects for `/cart` and `/checkout` to append `?layout=luxury-shoes` if the theme is active.
    - **Logic & Types**: Resolved 8+ TypeScript errors in `useShop.ts` related to missing `Category` and `Product` properties. Standardized `trackAddToCart` parameters.
    - **Data Consistency**: Implemented `fix_luxury_data.js` to comprehensively update ALL categories and products for the 'maxp' company to align with the "Luxury Shoes" theme, including unique slug generation and high-fidelity descriptions.
- **Impact**: 100% functional storefront with persistent branding and thematic data consistency.


### [FIX] Public Product Listing API & Frontend Infinite Loop (2026-03-19)
- **Description**: The Shop page was showing 0 products despite them existing in the database.
- **Root Cause**:
    - **Backend**: Invalid Prisma query in `publicProductsRoutes.js` (attempted to `include: { images: true }` on a scalar field).
    - **Frontend**: Infinite re-fetching loop in `useShop.ts` because `fetchProducts` depended on `priceRange` while also updating it.
- **Fixes**:
    - **Backend**: Removed the invalid `images: true` include from the product listing route in `publicProductsRoutes.js`.
    - **Frontend**: Standardized `useShop.ts` by removing `priceRange` from the `fetchProducts` dependency array, stabilizing the component state.
- **Impact**: Restored product visibility on the Shop page (10 products now showing) and fixed the PDP slug retrieval.


### [FIX] Public API 404 Errors - Categories & Related Products (2026-03-19)
- **Description**: The storefront PDP and Shop pages were returning 404 errors for `/api/v1/public/categories` and `/api/v1/public/products/:id/related`.
- **Root Cause**: These endpoints were missing from `publicProductsRoutes.js` or were shadowed by more generic routes.
- **Fixes**:
    - **Routing**: Restored and prioritized `/categories` and `/:id/related` endpoints in `publicProductsRoutes.js`.
    - **Middleware**: Ensured `requireCompany` is applied correctly to resolve company context for public requests.
    - **Refactoring**: Corrected route specificity to prevent ID-based routes from capturing fixed-path endpoints.
- **Impact**: Restored full catalog navigation and product recommendations on the luxury-shoes storefront.


### [FIX] Luxury Shoes Theme Audit Refinement (2026-03-19)
- **StorefrontLayout:** Fixed dual-footer bug by conditionally hiding the platform footer when `layout=luxury-shoes` is present in URL.
- **Cart:** Implemented functional mock coupon logic; fixed subtotal/total math to correctly reflect applied 15% discount.
- **Cart:** Upgraded empty cart UX by adding an 'Aura Signature Recommendations' product grid matching the premium theme.
- **PDP:** Added togglable local state to the Wishlist heart icons for immediate visual feedback.
- **Header:** Fixed phantom interactive icons (Search, User) by binding them to proper navigation paths (`/shop`, `/login`) and fixed TypeScript errors by utilizing native `<button>` wrappers.
- **Home:** Improved text accessibility and contrast over the Brand Story parallax section.


### [FIX] Luxury Shoes - i18n Hook Integration & Error Boundaries (2026-03-19)
- **Description**: Missed components (`LuxuryShoesCollection`, `LuxuryTrustBar`) were still reading language from the legacy DOM state. Also, the theme lacked a centralized crash recovery mechanism.
- **Fixes**:
    - **Refactored i18n**: Integrated `useStorefrontTranslation` hook into all remaining Luxury Shoes components to ensure consistent language state.
    - **Error Boundary**: Created and implemented `ThemeErrorBoundary.tsx` across all main theme pages (`Home`, `PDP`, `Collection`, `Cart`) to catch and display graceful fallback UI for runtime errors.
    - **Persistent Language**: Updated `StorefrontI18nProvider` to correctly initialize and persist the language state from `localStorage` ("AURA-LANG").
- **Impact**: 100% reliable internationalization and enhanced runtime stability for the premium theme.


### [FIX] Dual Footer Rendering - Luxury Shoes Theme (2026-03-19)
- **Description**: The global `StorefrontLayout` footer was rendering alongside the theme-specific `LuxuryFooter`.
- **Fix**: Implemented a conditional check in `StorefrontLayout.tsx` to hide the platform footer when the `luxury-shoes` theme is active.
- **Impact**: Ensures a clean, premium brand experience for the Luxury Shoes theme.


### [FIX] Storefront Data Resolution & Public Route Collision (2026-03-09)
- **Description**: Storefront was returning 400/500/401 errors when using slugs (e.g., `maxp`) as `companyId`.
- **Fixes**:
    - **Middleware**: Modified `companyMiddleware.js` to ensure company identification proceeds even with an `Authorization` header if explicit identifiers (`companyId` in query/params) are present.
    - **Controller**: Made `resolveTargetCompanyId` in `storefrontSettingsController.js` asynchronous and added logic to resolve slugs to internal company IDs via DB queries.
    - **Routing**: Created `publicStorefrontSettingsRoutes.js` and moved public settings routes there to avoid collisions with protected routes in `storefrontSettingsRoutes.js`.
    - **Initialization**: Updated `server.js` to mount the new public router correctly at `/api/v1/public/storefront-settings`.
- **Impact**: Restored live data connectivity for all branded storefronts using custom slugs.


### [FIX] RTL Logical Properties & Internationalization (2026-03-09)
- **Description**: The "Luxury Shoes" storefront initially used physical CSS properties (`left`, `right`, `pr-*`, `pl-*`), which broke layouts when switching to Arabic (RTL).
- **Fixes**: Systematically replaced all physical properties with logical ones (`inset-inline-start`, `inset-inline-end`, `pe-*`, `ps-*`) across `LuxuryShoesHome`, `LuxuryShoesCollection`, `LuxuryShoesPDP`, and `LuxuryShoesCart`.
- **Note**: Tailwind 4 native logical properties were utilized. Ensure `document.documentElement.dir` is correctly toggled by the `LuxuryHeader` language switcher to trigger these properties.
- **Impact**: Provides perfect bi-directional support (LTR/RTL) with a single codebase.


### [FIX] Luxury Shoes - Bilingual Support & Asset Localization (2026-03-09)
- **Description**: The storefront had hardcoded English strings and external image dependencies.
- **Fixes**:
    - Centralized all UI strings into a `translations.ts` dictionary for En/Ar.
    - Replaced all Unsplash placeholders with high-fidelity local assets in `public/placeholders/luxury-shoes/`.
    - Implemented dynamic randomization for PDP social proof (stock/viewers).
    - Added professional form validation for newsletter and a functional coupon entry field.
- **Impact**: Production-ready localized experience for global luxury retail.


### [NOTE] Architecture Audit V4 - Theme CSS Scoping Tricks (2026-03-19)
- **Description**: During the implementation of the "Luxury Shoes" storefront theme, noticed that `StorefrontLayout.tsx` aggressively forces the `<html>` element to light mode and strips root dashboard variables to prevent CSS bleeding.
- **Fixes**: To properly style the new theme without conflicting with the admin dashboard or other themes, CSS variables (`tokens.css`) must be scoped strictly to `:root[data-template-slug="luxury-shoes"]` rather than a raw `:root`.
- **Impact**: Ensures perfect style isolation for all future storefront templates within the V4 architecture.


### [FIX] Architecture Audit V4 - Cart Token Passthrough & Type Safety (2026-03-19)
- **Description**: Addressed critical issues where `UniversalCart.tsx` bypassed the new Theme Tokens ecosystem, and eliminated frontend `any` casting debt by fixing the API type contracts for Product Variants.
- **Fixes**:
    - **Cart Token Fix**: Stripped legacy `variantStyles` computation directly from `UniversalCart.tsx`. It now natively imports `getThemeTokens(variant)` from the `LayoutRegistry` and passes the tokens down securely via standard `CartLayoutProps`.
    - **Type Integrity & Cast Removal**: Added `images?: string | string[] | ProductImage[]` to `ProductVariant` in `StorefrontTypes.ts` to match real API responses. Purged `(selectedVariant as any)` brute force access from all 3 PDP layouts (`Standard`, `Advanced`, `Editorial`).
    - **i18n Hardcoding Cleanup**: Purged static Arabic loading text ("جاري الإضافة") from Headless business logic (`HeadlessBuyBox.tsx`) and hooks (`usePDPLogic.ts`), returning them to generic English keys to assist future localization pipelines.


### [REFACTOR] Centralized PDP Logic & Enhanced Design Tokens (2026-03-09)
- **Description**: Centralized redundant Product Detail Page (PDP) logic into a new `usePDPLogic` hook and fully decoupled gallery/buybox styling through an expanded Design Tokens system.
- **Fixes**:
    - **Logic Centralization**: Eliminated 200+ lines of duplicated state management (quantity, variants, additions) across `LayoutStandard.tsx`, `LayoutEditorial.tsx`, and `LayoutAdvanced.tsx` by introducing `usePDPLogic.ts`.
    - **Functional Purity**: Refactored `HeadlessBuyBox.tsx` to use explicit boolean flags (`showCartIcon`) and string tokens (`buttonText`) instead of inspecting CSS class names.
    - **Legacy Styling Bypasses**: Fixed `HeadlessProductInfo.tsx` and layouts to ensure `themeTokens.description` is always applied, even when custom renderers are used.
    - **Corrupted Gallery**: Rebuilt `HeadlessProductGallery.tsx` from scratch to properly support design tokens for containers, images, and thumbnails.
- **Impact**: Significant reduction in technical debt, 100% architectural consistency across all PDP themes, and improved type safety for gallery and buybox configurations.


### [FIX] Decoupled Headless Styling (2026-03-19)
- **Description**: Replaced hardcoded conditional styling (e.g. `isEditorial ? ... : ...`) in Headless widgets with a centralized **Design Tokens System**.
- **Impact**: All Headless widgets are now 100% presentationally pure. They receive their CSS classes from the theme via `themeTokens`.
- **Files**: `ThemeContract.ts`, `LayoutRegistry.tsx`, `HeadlessBuyBox.tsx`, `HeadlessProductInfo.tsx`.


### [FIX] Storefront Stability & Type Safety (2026-03-19)
- **Description**: Resolved remaining critical lint errors and type mismatches in `useElessiProductDetails.ts` and `LayoutEditorial.tsx`.
- **Fixes**:
    - **Safe Access**: Added optional chaining and defensive checks for variant and category access in the product hook.
    - **Type Integrity**: Corrected `StickyAddToCart` prop signature to handle both `ProductImage` objects and strings.
    - **Linting**: Fixed 5+ "possibly undefined" errors and exported missing helper functions for child layouts.
- **Impact**: Provides 100% build-time safety for the Elessi theme and prevents runtime crashes in the PDP gallery and checkout.


### [FIX] Headless Type Safety & Hook Refactoring (2026-03-09)
- **Description**: Resolved critical technical debt in `useElessiProductDetails.ts` and standardized PDP/Checkout layout contracts.
- **Fixes**:
    - **Hook Type Safety**: Eliminated ~40 `as any` casts by defining `ElessiProductVariant` and `ElessiProductPayload` interfaces.
    - **Contract Alignment**: Standardized `PDPLayoutProps` and `CheckoutLayoutProps` to use global `StorefrontTypes`.
    - **Property Mismatches**: Fixed `category` vs `categories` and `stock` optionality in `LayoutAdvanced.tsx` and `LayoutEditorial.tsx`.
- **Impact**: Provides 100% type safety for the Elessi theme and prevents runtime crashes due to missing stock or misaligned metadata.


### [FIX] Shop Architecture & High-Fidelity Type Safety (2026-03-19)
- **Description**: Finalized the complete refactor of the Shop component system across all storefront themes.
- **Fixes**: 
    - **Contract Enforcement**: Standardized all layouts to implement `ShopLayoutProps`, ensuring consistent `shop` object delivery.
    - **Type Integrity**: Eliminated every `as any` type cast in the Shop layouts by correctly mapping `StorefrontProduct` properties.
    - **Property Alignment**: Fixed standard naming mismatches: `comparePrice` was renamed to `compareAtPrice` and `category` access was updated to `categories[0]`.
    - **Error Resilience**: Added defensive nullish checks for `product.stock` across all layouts to prevent scale-rendering crashes.
- **Impact**: Removes significant technical debt and provides a robust, type-safe foundation for future Shop theme development.


### [FIX] Grill House Theme Logic & Syntax Errors (2026-03-19)
- **Description**: Resolved multiple implementation bugs, linting errors, and type mismatches in the "Grill House" theme layouts.
- **Fixes**: 
    - **Syntax Integrity**: Fixed a double default export in `CategoriesSection.tsx` that caused build-time errors.
    - **Type Safety**: Corrected `CartLayoutProps` mismatch in `LayoutGrill` (Cart) by switching from `total` to `subtotal`.
    - **Linting Cleanup**: Removed unused variables (`HomeIcon`, `ClockIcon`) and addressed `_variant` prefix requirements to satisfy ESLint.
    - **Registry Sync**: Corrected `LayoutRegistry.tsx` mappings to ensure the new Grill layouts are correctly resolved by the universal routers.


### [REFACTOR] Unified Storefront Headless Architecture (Tier 2) (2026-03-19)
- **Description**: Completed the Tier 2 migration for Shop, Homepage, and Cart systems, moving from monolithic/prop-drilling patterns to a unified, registry-driven headless architecture.
- **Fixes**: 
    - **Prop-Drilling & Casting**: Eliminated widespread `as any` casts and prop-drilling by standardizing on `ShopLayoutProps`, `HomepageLayoutProps`, and `CartLayoutProps` from `ThemeContract.ts`.
    - **Logic Fragmentation**: Centralized layout selection into `LayoutRegistry.tsx`, decoupling main page entry points (`Shop.tsx`, `UniversalHomepage.tsx`, `UniversalCart.tsx`) from theme-specific implementation details.
    - **Data Fetching**: Cleaned up `useShop.ts` (fixed SEO types and pagination naming) and refactored Cart layouts to receive data purely via props, removing internal hook dependencies.
- **Impact**: Establishes a professional, scalable architecture for all major storefront pages, enabling theme developers to create new layouts by simply registering them in the `LayoutRegistry`.


### [FIX] Missing ProductDetailsInventorySource & Global Layout Imports (2026-03-09)
- **Description**: Resolved critical build errors in `ThemeProductDetails.tsx` and 15+ other layout files caused by directory restructuring and missing components.
- **Fixes**: Re-implemented `ProductDetailsInventorySource.tsx` and corrected relative import paths for `StorefrontNav`, `QuickViewModal`, and headless components.
- **Impact**: Restored full storefront rendering and checkout functionality.


### [FIX] Storefront Layout Import Failures & Missing Type Check
- **Date**: 2026-03-09
- **Description**: The newly refactored `WalletDefaultLayout.tsx` and `StorePageDefaultLayout.tsx` were failing to render due to incorrect relative import paths for `LoadingSpinner`. Additionally, the `npm run type-check` command was missing from `package.json`.
- **Fixes**:
    - **Imports**: Corrected `LoadingSpinner` import paths from `../../LoadingSpinner` to `../../../LoadingSpinner`.
    - **Scripts**: Added `"type-check": "tsc --noEmit"` to `frontend/package.json` to enable CI/CD validation.
    - **Cleanup**: Removed unused `WalletIcon`, `ClockIcon`, and `user` prop from `WalletUntitledLayout.tsx` to resolve linting warnings.
- **Files Modified**: `frontend/src/components/storefront/layouts/wallet/WalletDefaultLayout.tsx`, `frontend/src/components/storefront/layouts/store_page/StorePageDefaultLayout.tsx`, `frontend/src/components/storefront/layouts/wallet/WalletUntitledLayout.tsx`, `frontend/package.json`


### [FEATURE] Headless Refactoring: Wallet & Dynamic Store Pages
- **Date**: 2026-03-09
- **Description**: Completed the headless migration for the Wallet and dynamic StorePage components.
- **Fixes**:
    - **Architecture**: Separated logic into `useWallet` and `useStorePage` hooks.
    - **Theming**: Implemented `Default` and `Untitled` layouts for both pages to support multi-theme consistency.
- **Files Modified**: `frontend/src/pages/wallet/WalletPage.tsx`, `frontend/src/pages/storefront/StorePage.tsx`, `frontend/src/hooks/useWallet.ts`, `frontend/src/hooks/useStorePage.ts`, `frontend/src/components/storefront/layouts/wallet/*`, `frontend/src/components/storefront/layouts/store_page/*`


### [FIX] Product Fetching 500 Error (Missing deletedAt Column)
- **Date**: 2026-03-18
- **Description**: Public products API (`/api/v1/public/products`) was returning a 500 Internal Server Error for all requests.
- **Root Cause**: The Prisma schema defined a `deletedAt` field for the `Product` model (Soft Delete feature), but the corresponding column was missing from the `products` table in the PostgreSQL database. This caused Prisma's `findMany` to fail when attempting to fetch the full model. Additionally, a `TypeError` was occurring due to a stale Prisma Client generated for a different platform.
- **Fixes**:
    - **Database Schema**: Manually added the `"deletedAt" TIMESTAMP(3)` column to the `products` table using raw SQL.
    - **Prisma Client**: Regenerated the Prisma Client on the local Windows environment (`npx prisma generate`) to fix platform-mismatch `TypeErrors`.
    - **Route Logic**: Refactored `publicProductsRoutes.js` with enhanced safety guards and explicit company checks to prevent `TypeError` when `company` context is missing.
    - **Security**: Verified and re-enabled Row-Level Security (RLS) extensions in `sharedDatabase.js` after the schema fix.
- **Files Modified**: `backend/routes/publicProductsRoutes.js`, `backend/services/sharedDatabase.js`, Database Schema (Manually patched).


### [FIX] Headless Shop Refactor & Prop Integration
- **Date**: 2026-03-18
- **Description**: The monolithic `Shop.tsx` was refactored into a headless architecture. During this process, several integration and type issues were resolved.
- **Fixes**:
    - **Type Safety**: Resolved `Type 'string | boolean' is not assignable to type 'string'` in `useShop.ts` by explicitly casting `seoMetaDescription` and numeric filter values to `String`.
    - **Syntax Stability**: Repaired `ShopStitchLegacyLayout.tsx` after a cleanup of unused variables caused a syntax error (dangling variable assignments).
    - **Prop Mapping**: Fixed inconsistent prop types between the `useShop` hook and multiple layout components (`Orbit`, `Editorial`, `Elessi`, `Phoenix`) by standardizing the data mapping layer in `Shop.tsx`.
    - **Dead Code**: Identified and removed legacy `FlatsomeProductPage.tsx` and its associated routes to clean up the storefront catalog.
- **Files Modified**: `frontend/src/pages/storefront/Shop.tsx`, `frontend/src/hooks/useShop.ts`, `frontend/src/components/storefront/ShopStitchLegacyLayout.tsx`, `frontend/src/App.tsx`


### [FIX] Headless Checkout Refactor & Coupon Validation
- **Date**: 2026-03-09
- **Description**: The monolithic `Checkout.tsx` (~1200 lines) was a major technical debt item, combining form state, shipping logic, payment processing, and coupon management in a single untestable block.
- **Fixes**:
    - **Architecture**: Refactored to a fully headless architecture using the `useCheckout` hook and modular components (`HeadlessCheckoutForm`, `HeadlessShippingSelector`, etc.).
    - **API**: Added missing `validateCoupon` method to `storefrontApi.ts` to support real-time coupon verification.
    - **Type Safety**: Resolved dozens of `Object is possibly undefined` and index signature errors in the checkout flow.
    - **Results**: Reduced `Checkout.tsx` to ~150 lines of pure layout code, making the business logic reusable across multiple theme variants.
- **Files Modified**: `frontend/src/pages/storefront/Checkout.tsx`, `frontend/src/hooks/useCheckout.ts`, `frontend/src/utils/storefrontApi.ts`, `frontend/src/components/storefront/checkout/Headless*.tsx`


### [FIX] Storefront Monolith Cleanup (Dead Code Elimination)
- **Date**: 2026-03-09
- **Description**: The `/src/pages/storefront/` system suffered from severe code duplication due to 7+ legacy Page-Based Monolithic implementations of Product Details (e.g., `ProductDetailsElessi`, `ProductDetailsStitch`, etc.).
- **Fixes**: Permanently deleted 7 legacy hardcoded monolithic product pages and surgically removed their corresponding lazy loading imports and routes from `App.tsx`. Reduced overall bundle payload by purging dead routes. 
- **Files Modified**: Deleted `frontend/src/pages/storefront/ProductDetails*.tsx`, modified `frontend/src/App.tsx`.


### [FIX] Extracted Headless Widgets for Storefront
- **Date**: 2026-03-09
- **Description**: Monolithic logic inside PDP Layouts (`LayoutAdvanced`, `LayoutStandard`, `LayoutEditorial`) caused massive code duplication and tight coupling.
- **Fixes**: Extracted `HeadlessBuyBox.tsx`, `HeadlessProductInfo.tsx`, and `HeadlessProductGallery.tsx`. Wired them into all PDP layouts, ensuring they adhere to the headless `ThemeContract.ts`. Validated the extraction by testing the TypeScript compilation matrix over the modified components.
- **Files Modified**: `frontend/src/components/storefront/Headless*.tsx`, `frontend/src/pages/storefront/layouts/pdp/Layout*.tsx`


### [FIX] Headless Storefront Conversion & Dead "Add to Cart" Buttons
- **Date**: 2026-03-18
- **Description**: Resolved issues where PDP layouts (`LayoutEditorial`, `LayoutAdvanced`, `LayoutStandard`) had stubbed or non-functional "Add to Cart" buttons and lacked proper variant tracking.
- **Fixes**:
    - **Variants**: Created `useProductVariants.ts` to manage complex option grouping and price resolution. Wired this into all layouts so the correct variant and price are always available.
    - **Cart**: Connected `useCart.ts` directly to the layouts, replacing `toast.success` stubs with actual database mutations.
    - **Types**: Fixed dozens of TypeScript errors related to `noPropertyAccessFromIndexSignature` by defining a centralized `StorefrontTypes.ts` contract.
- **Files Modified**: `frontend/src/pages/storefront/layouts/pdp/*`, `frontend/src/hooks/useProductVariants.ts`, `frontend/src/types/StorefrontTypes.ts`

## Current Focus (2026-03-17)
- **Asset Management Suite (FEATURE/FIX)**: [2026-03-17] Launched the **Asset Cloning** functionality. Resolved 404/500 backend errors by fixing route priorities in `server.js` and correcting `ReferenceError` in the controller. On the frontend, implemented a robust list refresh mechanism that eliminates "Duplicate Key" warnings by using a Map-based de-duplication strategy in `AssetList.tsx`.
- **Enterprise Task Management Scalability (FIX/UPGRADE)**: [2026-03-17] Finalized scalability upgrades for the Tasks module.
    1. **Backend**: Implemented server-side pagination and advanced filtering in `taskController.js` to support enterprise-scale task lists without UI lag.
    2. **Frontend**: Modularized the monolithic `Tasks.tsx` by extracting detail views and filters into standalone components (`FilterSidebar`, `ProjectDetailsModal`).
    3. **Bug Fix**: Patched a critical API error in `updateTask` where the frontend was inadvertently sending un-writeable Prisma relations (e.g. `projectName`) back to the server.
- **Deployment & Synchronization (DEVOPS)**: [2026-03-17] Resolved Git merge conflicts in `backend/server.js` while preserving the new Agent Workspace background cron and optimized notification logic. Addressed CI/CD documentation compliance block by properly documenting locale updates and server resolutions.
- **Order Confirmation Queue & Performance (UPGRADE)**: [2026-03-17] Fully synchronized the new Order Confirmation Queue system. Includes virtualized frontend rendering for high-volume items, SQL-optimized `UNION ALL` fetching for performance, and strict DoS protection (100-item limit) on bulk routes.
- **RAG Analytics & WhatsApp Security (SECURITY)**: [2026-03-17] Deployed `ragAnalyticsController.js` and hardened `WhatsAppMediaHandler.js` against unauthorized data access. Added database indexes for order confirmation queries.


### [FIX] Product Details Display & Shipping Cost Calculation Failure
- **Date**: 2026-03-17
- **Description**: Product descriptions (fallback) and pricing details were missing on the storefront. Additionally, shipping costs were not displaying because the governorate text matching was failing on the backend, and the frontend was bypassing the utility layer.
- **Root Cause**:
    1. **Frontend**: `ProductDetails.tsx` was incorrectly accessing `response.data.data` instead of the root-level response format returned by `storefrontApi.getProduct`, causing missing data.
    2. **Frontend**: The component was creating a raw `apiClient.get` call for shipping calculations instead of using `storefrontApi.calculateShipping`, resulting in broken company ID header propagation and missing fallback matching logic.
    3. **Backend**: The `normalizeText` function in `publicCartRoutes.js` failed to properly normalize Arabic text variations (Alif placement, Taa Marbuta/Haa endings) and diacritic marks, causing strict string comparisons for Governorates (e.g., Cairo, Giza) to fail.
- **Resolution**:
    1. **Frontend**: Corrected object dot-notation access in `ProductDetails.tsx` to safely extract `response.data?.product || response.data || response.product`.
    2. **Frontend**: Refactored `fetchShippingCost` in `ProductDetails.tsx` to utilize `storefrontApi.calculateShipping()`, improving error resilience, correct endpoint targeting, and 404 fallback handling.
    3. **Backend**: Dramatically relaxed Arabic text normalization in `publicCartRoutes.js`, implementing advanced RegEx clearing for diacritics, comprehensive Alif unification, and Taa Marbuta/Haa substitution, resulting in robust string matching for shipping zone calculation.
- **Files Modified**: `frontend/src/pages/storefront/ProductDetails.tsx`, `backend/routes/publicCartRoutes.js`


### [FIX] React Crash (NotFoundError) on Product Page - Image DOM Mutation
- **Date**: 2026-03-16
- **Root Cause**: An `onError` handler in `ProductDetails.tsx` was directly replacing the DOM element via `.outerHTML = ...`, which is incompatible with React's virtual DOM reconciliation and causes a `NotFoundError: Failed to execute 'removeChild' on 'Node'`.
- **Resolution**: Introduced `imageErrors` state (`Record<number, boolean>`) to track broken image indexes. The `onError` handler now calls `setImageErrors(...)` to trigger a re-render with a fallback `<div>` containing a 📦 icon, instead of mutating the DOM directly.
- **Secondary Issue**: A prior edit (multi_replace_file_content) accidentally deleted ~880 lines from `ProductDetails.tsx`, removing the `addToCart`, `handleDirectCheckout`, and `handleFormInputChange` functions along with the entire render tree. This was caught via `git diff` and fully reverted using `git restore`.
- **Files Modified**: `frontend/src/pages/storefront/ProductDetails.tsx`




### [FIX] Dark Mode Color Leakage & Scroll/Zoom Issues
- **Date**: 2026-03-16
- **Description**: Several dashboard elements were leaking theme colors incorrectly, and mobile users were experiencing unwanted page zooming/scrolling when focusing on input fields.
- **Resolution**:
    1. **Style Isolation**: Hardened `.hr-theme` scoped styles in `hr-theme.css` to prevent global leakage.
    2. **Mobile UX**: Implemented `font-size: 16px !important` and `touch-action: manipulation` in `index.css` to prevent automatic zooming on iOS/Android.
    3. **Background Persistence**: Optimized background gradients for Midnight and Amethyst themes to ensure consistency during transitions.
- **Files Modified**: `frontend/src/styles/index.css`, `frontend/src/styles/hr-theme.css`, `frontend/src/pages/categories/Categories.css`


### [IMPROVEMENT] Login Page Accessibility & UI Clarity
- **Date**: 2026-03-09
- **Description**: Addressed accessibility gaps (missing ARIA labels) and UI feedback regarding the "Entry to System" button clarity.
- **Resolution**: Added `aria-label` to inputs and enhanced button `padding`, `font-size`, and `box-shadow` to improve visibility in dark mode.
- **Files Modified**: `frontend/src/pages/auth/ModernLogin.tsx`


### [FIX] Storefront Products Display Issue (swan.maxp.online)
- **Date**: 2026-03-15
- **Description**: Products were not displaying on the `swan.maxp.online` storefront ("SHOWING 0 OF 0 STYLES") despite being active in the database.
- **Root Cause**:
    1. **Missing Environment Variable**: `MAIN_DOMAIN` was missing from the production server's `.env`, causing the `getCompanyFromSubdomain` middleware to fail its heuristic slug extraction.
    2. **Weak Middleware Fallback**: The older middleware on the server did not prioritize `x-company-id` or explicit identifiers and had fragile hostname parsing that failed when `MAIN_DOMAIN` was undefined.
- **Resolution**:
    1. **Server Setup**: Added `MAIN_DOMAIN=maxp.online` to the remote server's `.env`.
    2. **Middleware Upgrade**: Uploaded a robust version of `companyMiddleware.js` that prioritizes `x-company-subdomain`/`x-company-id` headers and has improved fallback logic for custom domains and subdomains.
    3. **Operations**: Restarted the backend server with `pm2 restart maxp-backend --update-env` to refresh the environment variables.
- **Files Modified**: `backend/middleware/companyMiddleware.js`, `backend/.env` (on server)


### [FIX] Dashboard Theme Leakage into Public Storefront
- **Date**: 2026-03-15
- **Description**: Dashboard theme settings were leaking into the public storefront. Root cause was adding `.storefront-theme-root` class to `<html>`, which triggered CSS rules in `storefront-theme-overrides.css` that set `--color-primary: var(--storefront-ink)` (#0b0f1a) and `--color-accent: var(--storefront-gold)` (#c8a151).
- **Resolution**:
    1. **Root Cause Fix**: Removed `.storefront-theme-root` class from `<html>` element – it already exists on the `<div>` wrapper in JSX which has correct inline overrides from `buildHomepageCssVariables()`.
    2. **Comprehensive Variable Cleanup**: Added `--color-accent`, `--color-foreground`, `--sidebar-bg`, `--sidebar-active-bg` to cleanup lists in both `VisualThemeContext.tsx` and `StorefrontLayout.tsx`.
    3. **Provider De-duplication**: Removed redundant `VisualThemeProvider` from `StorefrontProviders.tsx`.
    4. **CSS Scoping**: Scoped dashboard transitions in `index.css` using `:not(.storefront-theme-root *)`.
    5. **Button Style Alignment**: Refactored `storefront-theme-overrides.css` to link internal `--storefront-*` variables to theme variables, fixing dark button backgrounds.
    6. **Neutral Defaults**: Updated `homepageTheme.ts` defaults to storefront-authentic colors (#3b82f6 primary) to prevent "dashboard look" on new stores.
- **Key Lesson**: `storefront-theme-overrides.css` applies CSS variables via `.storefront-theme-root` selector. Adding this class to `<html>` causes CSS cascade conflicts with inline styles on child elements.
- **Files Modified**: `frontend/src/contexts/VisualThemeContext.tsx`, `frontend/src/components/layout/StorefrontLayout.tsx`, `frontend/src/providers/StorefrontProviders.tsx`, `frontend/src/styles/index.css`


### [FIX] Product Details & Homepage Build Errors
- **Date**: 2026-03-09
- **Description**: Critical build errors prevented the storefront from loading due to missing components and broken imports.
- **Root Cause**: 
    1. **`ThemeProductDetails.tsx`**: Referenced `ProductDetailsInventorySource.tsx` which was missing from the filesystem.
    2. **`UniversalHomepage.tsx`**: Imported non-existent `FlatsomeStyleCampaign` component.
    3. **Import Misalignment**: Relative paths for `StorefrontNav` and several `shop/checkout` widgets were misaligned across multiple theme layout files after the recent directory restructuring.
- **Resolution**: 
    1. **Re-implemented `ProductDetailsInventorySource.tsx`**: Restored logic for handling standalone promotional content within the PDP (standalone/prepend/append modes).
    2. **Repaired `UniversalHomepage.tsx`**: Removed the broken import and implemented a fallback to `LayoutStandard` for campaign layouts.
    3. **Global Import Audit**: Corrected imports in 15+ layout files to ensure standard resolution (`../../../` for Nav, `../../` for widgets).
- **Files Modified**: 
    - `frontend/src/pages/storefront/ThemeProductDetails.tsx`
    - `frontend/src/pages/storefront/layouts/pdp/ProductDetailsInventorySource.tsx`
    - `frontend/src/pages/storefront/layouts/homepage/UniversalHomepage.tsx`
    - Multiple files in `frontend/src/pages/storefront/layouts/`
- **Status**: ✅ Resolved and verified.


### [FIX] WhatsApp Templates Tab UI & Missing Dialog Functionality
- **Date**: 2026-03-14
- **Description**: The WhatsApp Templates tab was visually basic and lacked the ability to create or edit templates.
- **Resolution**:
    1. **UI Redesign**: Implemented a modern card-based layout with color-coded categories, WhatsApp-style message previews, and real-time metrics (sent, delivered, read).
    2. **Search & Filter**: Added a search bar and category filter to manage large sets of templates effectively.
    3. **Creation/Edit Dialog**: Implemented a comprehensive dialog for creating and editing templates, including event type selection, category management, and content editing with variable support.
    4. **API Integration**: Wired the frontend to `POST /whatsapp/notifications/templates` and `PUT /whatsapp/notifications/templates/:id` with proper error handling and success feedback.
- **Files Modified**: `frontend/src/pages/whatsapp/WhatsAppNotifications.tsx`



### [FIX] Layout.tsx Code Duplication & Syntax Errors
- **Date**: 2026-03-14
- **Description**: `Layout.tsx` was corrupted with duplicated imports and component definitions, leading to build failures and broken UI.
- **Root Cause**: Incautious `replace_file_content` calls that inserted code blocks inside existing structures.
- **Resolution**: Fully reconstructed `Layout.tsx` with a clean, unified structure, restoring correct imports and layouts.
- **Files Modified**: `frontend/src/components/layout/Layout.tsx`


### [FIX] Storefront Settings Prisma Retry Wrapper
- **Date**: 2026-03-13
- **Description**: Storefront settings still returned 500s when Prisma reported `"Engine is not yet connected"` or `"Response from the Engine was empty"` mid-request.
- **Root Cause**: `getStorefrontSettings` used direct Prisma calls that bypassed shared retry/queue logic.
- **Resolution**: Wrapped the settings lookup/create operations in `safeQuery` with a reconnect + retry fallback.
- **Files Modified**: `backend/controller/storefrontSettingsController.js`


### [FIX] Final Product Page Refinements & Linting Cleanup
- **Date**: 2026-03-13
- **Description**: The product page had several lingering issues including missing Description and SEO tabs, inconsistent linting for `TFunction` return types, and unused logic/state variables that increased bundle size and noise.
- **Resolution**:
    1. **Frontend**: Restored and refined the `Description` and `SEO` tabs with metadata fields, tags management, and a Google Search preview.
    2. **Structural Fix**: Corrected critical JSX tag imbalance within the `Basic` and `Pricing` tabs that caused rendering issues.
    3. **Cleanup**: Fixed `TFunction` return type mismatches by explicitly casting `t()` calls to `string`. Removed unused state variables (`images`, `relatedInput`, etc.) and functions (`updateAttributeValues`, `toggleVariantSelection`, `selectAllVariants`).
- **Files Modified**: `frontend/src/pages/products/ProductNewFinal.tsx`


### [FIX] Hidden Products Not Accessible via Direct Link
- **Date**: 2026-03-13
- **Description**: Products marked as `isHidden: true` were returning 404 even when accessed via a direct link. The correct behavior is that hidden products should not appear in the storefront listings, but should still be accessible via their direct URL (like a soft-launch or VIP-only link).
- **Root Cause**: The single-product GET routes in `publicProductsRoutes.js` included `isHidden: false` in the Prisma query filter, which was only appropriate for the listing endpoint.
- **Resolution**: Removed `isHidden: false` from three single-product endpoints: `GET /:id`, `GET /:id/quick`, and `GET /:id/online-visitors`. The listing endpoint (`GET /`) still retains the `isHidden: false` filter.
- **Files Modified**: `backend/routes/publicProductsRoutes.js`


### [FEATURE] Premium Project Landing Page Implementation
- **Date**: 2026-03-12
- **Description**: Replaced the basic placeholder landing page with a premium, multi-style landing page featuring Luxury, Minimal, and Creative variants.
- **Resolution**:
    1. **Frontend**: Created `LandingPage.tsx` with high-end CSS, glassmorphism, and dynamic animations.
    2. **Content**: Abstracted content into `marketingLandingData.ts` for easy maintenance.
    3. **Routing**: Integrated into `App.tsx` as the default root route.
- **Files Added**: `frontend/src/pages/LandingPage.tsx`, `frontend/src/pages/landing/marketingLandingData.ts`
- **Files Modified**: `frontend/src/App.tsx`


### [FEATURE] Enhanced Product Page & SEO Suite (Phase 1 & 2)
- **Date**: 2026-03-11
- **Description**: Added advanced product management fields, premium SEO editing, and interactive storefront integration.
- **Resolution**:
    - **Product Enhancements (Phase 1, 2, 3 & Final Polish)**: Implemented `shortDescription`, `description`, `seoTitle`, `seoDescription`, `tags`, `allowBackorders`, `isHidden`, `barcode`, `merchantProductId`, `isDropshipped`, `isPreOrder`, `preOrderDate`, and `preOrderMessage`.
    2. **SEO Tab**: Implemented a dedicated "SEO" tab in `ProductNewFinal.tsx` with a live Google Search Preview.
    3. **UX Enhancements**:
        - Added **Short Description** field in the Basic tab.
        - Added **Allow Backorders** toggle in the Inventory tab to support stock management policies.
        - Implemented **Auto-save / Drafts** system using `localStorage` to prevent data loss.
        - Added a **Sticky Action Bar** with a "Save" button in the header.
    4. **Phase 2 - Advanced PDP Features**:
        - **Searchable Related Products**: Replaced manual ID inputs with `react-select` searchable dropdowns for Related, Upsell, and Cross-sell products.
        - **Product Preview**: Integrated a "Preview" button in the header that opens the current product on the customer storefront.
        - **Hidden Status**: Implemented `isHidden` logic with a visual indicator in the admin header.
        - **Mandatory Stock**: Refined validation to ensure stock is required and non-negative when inventory tracking is enabled.
- **Files Modified**: `backend/prisma/schema/products.prisma`, `backend/controller/productController.js`, `frontend/src/pages/products/ProductNewFinal.tsx`


### [FEATURE] Custom Checkout Form Settings
- **Date**: 2026-03-11
- **Description**: Added ability for merchants to customize the checkout form, selecting which guest fields (Phone, Email, City) are visible or required.
- **Resolution**:
    1. Implemented `CheckoutFormSettings` model in Prisma.
    2. Created `checkoutFormSettingsController.js` with full CRUD and public access endpoints.
    3. Integrated settings into the `Checkout.tsx` frontend to dynamically render form fields.
- **Files Modified**: `backend/prisma/schema/storefront.prisma`, `backend/controller/checkoutFormSettingsController.js`, `frontend/src/pages/storefront/Checkout.tsx`


### [FIX] Microsoft Clarity Not Initializing on Storefront Pages


### [FIX] Microsoft Clarity Not Initializing on Storefront Pages
- **Date**: 2026-03-11
- **Description**: Microsoft Clarity tracking was not loading on storefront pages despite being correctly configured in the dashboard.
- **Root Cause**: `useStorefrontSettings` was being invoked inside `StorefrontLayout.tsx`, which is the component that rendered `StorefrontSettingsProvider`. Since contexts cannot be consumed by the component that provides them in the exact same render, the returned settings was always `null`, causing the analytics hook to silently abort.
- **Resolution**: Extracted the inner logic of `StorefrontLayout` into a new `StorefrontLayoutInner` component. The provider now wraps the inner component, allowing the layout hooks to properly access the fetched storefront settings and inject the Clarity script tag.
- **Files Modified**: `frontend/src/components/layout/StorefrontLayout.tsx`, `frontend/src/hooks/useClarityAnalytics.ts`


### [FIX] Microsoft Clarity Project ID Not Saving
- **Date**: 2026-03-11
- **Description**: The Clarity Project ID was not being saved correctly in the storefront settings, causing it to disappear after a page refresh.
- **Root Cause**:
    1. **Backend**: `clarityProjectId` was missing from the `allowedFields` and `stringFields` arrays in `updateStorefrontSettings`, and missing from the explicit serialization in `getStorefrontSettings` and `getPublicStorefrontSettings` getters.
    2. **Frontend**: `StorefrontClaritySettings.tsx` was not unwrapping the `data.data` from the API response, causing it to send `undefined` back to the server during updates.
    3. **Execution**: The backend server was running via `node server.js` and did not automatically pick up the controller changes.
- **Resolution**: Balanced the backend serialization, fixed the frontend data unwrapping logic, and restarted the backend server to activate all changes.
- **Files Modified**: `backend/controller/storefrontSettingsController.js`, `frontend/src/pages/settings/StorefrontClaritySettings.tsx`



### [FEATURE] Template Pages Manager — Super Admin Homepage Templates
- **Date**: 2026-03-10
- **Description**: Added an interactive pages management slide-over panel to the Super Admin homepage templates page. For each system template, a new "الصفحات" button opens a panel listing which pages (shop, product-details, cart, checkout, etc.) are embedded in the template's `content.pages[]` and which standard pages are missing. Admins can add missing pages with empty content or delete existing pages, all instantly persisted via the existing `updateSystemTemplate` API.
- **Files Modified**: `frontend/src/pages/SuperAdminHomepageTemplates.tsx`
- **Notes**: No new backend endpoints required. The feature reads/writes `content.pages[]` on the template object and calls `PUT /homepage/templates/system/:id` for persistence.


### [FIX] Checkout.tsx Corruption & Geolocation Centralization
- **Date**: 2026-03-10
- **Description**: `Checkout.tsx` became corrupted during previous edits, leading to a blank file or mangled code. Additionally, geolocation logic was scattered across templates.
- **Root Cause**: Encoding issues during file writes and lack of a centralized location context.
- **Resolution**:
  1. Reconstructed `Checkout.tsx` from scratch with all necessary logic and features.
  2. Created `GeolocationContext.tsx` and `useAutoGeolocation.ts` to centralize governorate detection.
  3. Integrated `GeolocationProvider` into `StorefrontProviders.tsx`.
  4. Refactored `Checkout.tsx` and `FlatsomeProductPage.tsx` to use the new `useAutoGeolocation` hook.
  5. Added missing `onlineVisitorsWindowMinutes` to `StorefrontSettings` interface to fix linting errors.
- **Files Added**: `frontend/src/contexts/GeolocationContext.tsx`, `frontend/src/hooks/useAutoGeolocation.ts`
- **Files Modified**: `frontend/src/pages/storefront/Checkout.tsx`, `frontend/src/pages/storefront/FlatsomeProductPage.tsx`, `frontend/src/providers/StorefrontProviders.tsx`, `frontend/src/services/storefrontSettingsService.ts`


### [FIX] Storefront Build Failure Due to Missing HTML Utilities
- **Date**: 2026-03-10
- **Description**: Frontend build failed because `FlatsomeProductPage.tsx` referenced `../../utils/html` which did not exist.
- **Root Cause**: HTML decoding/plain-text helpers were referenced for SEO content sanitization but never implemented in the utilities directory.
- **Resolution**: Added `frontend/src/utils/html.ts` with `decodeHtmlEntities` and `toPlainText` helpers used by storefront SEO.
- **Files Added**:
    - `frontend/src/utils/html.ts`: HTML entity decoding and plain-text extraction utilities used in storefront SEO.
    - **Storefront Connectivity**: (FIXED 2026-03-09) Backend service unified on port **3007** for development, with Vite proxy correctly configured in `vite.config.ts`.

## Repository Maintenance & Best Practices

### [FIX] Flatsome Variant Selector Was Flattened Instead of Grouped by Attribute
- **Date**: 2026-03-10
- **Description**: Variant options were rendered as one flat list (e.g., "أسود - 34") instead of separate attribute groups (Color, Size), ignoring per-product variant display settings.
- **Root Cause**: `FlatsomeProductPage.tsx` directly mapped `productVariants` into buttons without grouping logic or metadata-driven variant settings.
- **Resolution**: Switched to `CompositeVariantSelector` with parsed variants, and wired `variantSettings` from product metadata plus `productPageShowVariants` display toggle.
- **Files Modified**: `frontend/src/pages/storefront/FlatsomeProductPage.tsx`

### [FIX] Public Analytics 404 When Using App Domain With `x-company-id`
- **Date**: 2026-03-10
- **Description**: Public analytics calls from the dashboard domain (`app.*`) returned `404` even when `x-company-id` was provided.
- **Root Cause**: `getCompanyFromSubdomain` attempted host/subdomain resolution only, and returned `404` before controllers could use the header-based company context.
- **Resolution**: Added a header fallback in `getCompanyFromSubdomain` to resolve company by `x-company-id` when no subdomain match exists.
- **Files Modified**: `backend/controller/companyMiddleware.js`


### [FIX] Headless Cart Expansion & State Synchronization
- **Date**: 2026-03-10
- **Description**: The Flatsome product page had inconsistent SEO metadata and lacked proper variant grouping, leading to poor UX and search visibility.
- **Resolution**:
  1. Synchronized `document.title` and `updateSEO` calls with current product data.
  2. Integrated `CompositeVariantSelector` to handle attribute-based grouping (Color, Size).
  3. Added `decodeHtmlEntities` to prevent double-encoding in product descriptions.
- **Files Modified**: `frontend/src/pages/storefront/FlatsomeProductPage.tsx`

### [FEATURE] Nile Checkout Template integration
- **Date**: 2026-03-09
- **Description**: Added a new premium RTL Checkout template (`CheckoutNile.tsx`) to match the "Nile" design system. It uses a two-column layout with shipping information and a sticky order summary, supporting existing API logic and tracking.
- **Resolution**:
    1. Created `CheckoutNile.tsx` mirroring API logic from `Checkout.tsx`.
    2. Registered `"nile"` inside `ShopRuntimeLayout` type and `normalizeShopRuntimeLayout()`.
    3. Edited `ThemeCheckout.tsx` to mount `<CheckoutNile />` when layout is `"nile"`.
- **Files Added**: `frontend/src/pages/storefront/CheckoutNile.tsx`
- **Files Modified**: `frontend/src/pages/storefront/ThemeCheckout.tsx`, `frontend/src/utils/storefrontPageAssignments.ts`



### [FIX] Facebook Pixel AddToCart Price Reported as 0
- **Date**: 2026-03-09
- **Description**: The Facebook Pixel `AddToCart` event was reporting a price of 0 (or missing price) for many storefront products.
- **Root Cause**:
    1. The `storefrontApi.addToCart` utility function required `unitPrice` and `productName` for Pixel tracking, but many theme-specific templates (`ProductDetails*.tsx`) were only passing `productId` and `quantity`.
    2. Centralized tracking in `StorefrontLayout` relied on these optional fields being present in the API call metadata.
- **Resolution**:
    1. Systematically updated all 14 `ProductDetails` variants, `Shop.tsx`, `QuickViewModal.tsx`, `FlatsomeProductPage.tsx`, `FlatsomeStyleCampaign.tsx`, `WishlistPage.tsx`, `StickyAddToCart.tsx`, `PreOrderButton.tsx`, and `ProductComparison.tsx` to pass `unitPrice` and `productName` to the API.
    2. Consolidated all `AddToCart` tracking into `storefrontApi.addToCart`, removing manual duplicate calls and ensuring consistent metadata across the entire storefront ecosystem.
    3. Resolved numerous TypeScript lint errors in `useStorefrontFacebookTracking.ts` related to index signature property access and type predicate compatibility, improving code stability and build reliability.
- **Verification**: Verified metadata propagation across all identified templates and cleared all IDE lint errors in the tracking hook. Tested `QuickViewModal` and verified variant consistency.
- **Files Modified**: `ProductDetails.tsx`, `ProductDetailsBuilderLab.tsx`, `ProductDetailsElessi.tsx`, `ProductDetailsEliteV3.tsx`, `ProductDetailsInventorySource.tsx`, `ProductDetailsMinimal.tsx`, `ProductDetailsParallelDemo.tsx`, `ProductDetailsStitchDarkMineral.tsx`, `ProductDetailsStitchElite.tsx`, `ProductDetailsStitchLuxe.tsx`, `ProductDetailsStitchModern.tsx`, `ProductDetailsStitchMonochrome.tsx`, `ProductDetailsStitchParity.tsx`, `ProductDetailsUntitled.tsx`, `Shop.tsx`, `QuickViewModal.tsx`, `FlatsomeProductPage.tsx`, `FlatsomeStyleCampaign.tsx`, `WishlistPage.tsx`, `StickyAddToCart.tsx`, `PreOrderButton.tsx`, `ProductComparison.tsx`, `useStorefrontFacebookTracking.ts`


### [FIX] Storefront Guest Orders Could Become Zero-Total When Variant Price Was Null
- **Date**: 2026-03-09
- **Description**: Real Swan checkout testing produced successful orders with `finalTotal=0` despite non-zero product prices.
- **Root Cause**:
  1. `backend/routes/publicOrdersRoutes.js` converted `selectedVariant.price` using `Number(selectedVariant.price)`.
  2. When variant price was `null`, JavaScript coerced it to `0`, and the backend trusted that value over product base price.
- **Resolution**:
  1. Added explicit null/undefined/empty checks for both variant and product prices before numeric conversion.
  2. Fallback now correctly uses product price when variant price is not explicitly set.
- **Verification**:
  - Local backend syntax checks passed after patch.
  - Frontend production build passed after integration.
- **Files Modified**:
  - `backend/routes/publicOrdersRoutes.js`


### [FIX] Public Analytics Endpoints Could Misread Company Context and Break on `period=today`
- **Date**: 2026-03-09
- **Description**: Public analytics requests were fragile in storefront context and could throw invalid date errors when period used textual values such as `today`.
- **Root Cause**:
  1. Date parsing relied on `parseInt(period)` without guarding non-numeric values.
  2. Public route handlers in `analyticsRoutes.js` pointed to generic controller methods not specialized for public storefront context.
  3. Generic store/top handlers did not consistently include `req.companyId` in company resolution.
- **Resolution**:
  1. Added `resolveAnalyticsDateRange` helper to normalize `today`, `yesterday`, numeric periods, and explicit date ranges safely.
  2. Updated public analytics routes to use public-specific controller handlers.
  3. Hardened generic store/top handlers to also accept `req.companyId`.
- **Verification**:
  - Backend syntax checks passed for analytics controller and routes.
  - Frontend production build passed.
- **Files Modified**:
  - `backend/controller/analyticsController.js`
  - `backend/routes/analyticsRoutes.js`


### [FIX] Public Analytics/Tracking Now Resolve Company From Host When Header Context Is Missing
- **Date**: 2026-03-09
- **Description**: Live Swan checks still showed public analytics endpoints returning `400` ("company id required") whenever `x-company-id` was not sent, even on subdomain URLs.
- **Root Cause**:
  1. Public analytics and tracking controller paths relied primarily on `req.companyId`/`x-company-id`.
  2. In some runtime paths, middleware context was absent or not propagated, so subdomain host alone was not enough.
  3. Existing date fixes handled `period=today`, but company-resolution fallback remained weak in controller-level logic.
- **Resolution**:
  1. Added `resolveCompanyIdFromRequest` in `backend/controller/analyticsController.js`.
  2. Resolver now supports `req.companyId`, `req.company.id`, auth context, `x-company-id`, and host/subdomain inference (`x-company-subdomain`, `x-subdomain`, `Host`, `MAIN_DOMAIN`, custom domains).
  3. Applied resolver to public analytics endpoints and public tracking endpoints (`store/product/conversion`) plus shared store/top/daily analytics handlers.
- **Verification**:
  - Backend syntax checks passed (`node --check backend/controller/analyticsController.js`).
  - Live production probe before fix was reproducible:
    - `GET /api/v1/analytics/public/store?period=today` -> `400` without explicit company header.
    - `GET /api/v1/analytics/public/store?period=today` with company header still showed old invalid-date behavior on deployed build, confirming production lag vs local patched logic.
- **Files Modified**:
  - `backend/controller/analyticsController.js`


### [FIX] Pixel Easy Connect Now Keeps CAPI as a Separate Optional Step
- **Date**: 2026-03-09
- **Description**: Pixel Easy Connect flow still behaved as if CAPI should be auto-enabled immediately, which caused confusion when token generation failed or permissions were incomplete.
- **Root Cause**:
  1. `handleSelectPixel` in `FacebookPixelSettings.tsx` was enabling `facebookConvApiEnabled` automatically as soon as any token was available.
  2. UI copy in the Easy Connect card implied full Pixel + CAPI setup by default.
  3. `POST /facebook-oauth/generate-pixel-token` could fallback to Page tokens, mixing Pixel OAuth and Page flows.
- **Resolution**:
  1. Updated Easy Connect selection flow so choosing a Pixel always saves Pixel independently and does **not** force-enable CAPI.
  2. If token generation succeeds, token is prepared for CAPI but activation stays manual in the CAPI section.
  3. Updated UI text to explicitly state that CAPI is optional and separate.
  4. Removed Page-token fallback from `generate-pixel-token`; endpoint now depends on Pixel OAuth token only and returns `needsAuth` when missing.
- **Verification**:
  - Local code-path verification confirms Pixel linking no longer toggles CAPI on implicitly.
  - Token generation failure now results in Pixel-only success plus guidance message instead of false full-setup state.
- **Files Modified**:
  - `frontend/src/pages/advertising/FacebookPixelSettings.tsx`
  - `backend/routes/facebookOAuthRoutes.js`


### [FIX] Public Storefront Settings Leaked CAPI Token & Easy Connect Could Report False Success
- **Date**: 2026-03-09
- **Description**: Storefront public settings exposed `facebookConvApiToken` to any storefront visitor, while the Facebook Pixel easy-connect flow could report a successful connection even when automatic CAPI setup had silently failed.
- **Root Cause**:
  - `backend/controller/storefrontSettingsController.js` returned `facebookConvApiToken` from the public storefront settings payload, and `frontend/src/services/storefrontSettingsService.ts` cached the full public payload in `localStorage`.
  - `frontend/src/pages/advertising/FacebookPixelSettings.tsx` swallowed token-generation failures and still saved Pixel settings with a success toast, which left stores like Swan thinking CAPI was configured when it was not.
  - `backend/routes/facebookOAuthRoutes.js` generated the automatic token from a connected Facebook page only, even though the Pixel OAuth flow already stores a dedicated `facebookPixelAccessToken` on the company.
- **Resolution**:
  - Replaced the public `facebookConvApiToken` exposure with a safe boolean readiness flag `facebookConvApiReady`, and sanitized cached public storefront settings before reuse.
  - Updated storefront purchase fallback checks to rely on `facebookConvApiReady` instead of reading the token client-side.
  - Hardened Facebook OAuth state handling with signed state payloads.
  - Updated easy-connect token generation to use the company-level Pixel OAuth token first, then fall back to connected page tokens only when necessary.
  - Changed the Pixel selector flow so it reports partial setup explicitly instead of announcing full success without a usable Access Token.
- **Files Modified**:
  - `backend/controller/storefrontSettingsController.js`
  - `backend/routes/facebookOAuthRoutes.js`
  - `frontend/src/services/storefrontSettingsService.ts`
  - `frontend/src/hooks/useFacebookPixel.ts`
  - `frontend/src/hooks/useStorefrontFacebookTracking.ts`
  - `frontend/src/pages/storefront/Checkout.tsx`
  - `frontend/src/pages/storefront/ProductDetails.tsx`
  - `frontend/src/pages/advertising/FacebookPixelSettings.tsx`


### [FIX] Meta Browser Purchase Rejected EGP Currency on Swan
- **Date**: 2026-03-09
- **Description**: A real production test order on Swan successfully triggered `Purchase`, but Meta Browser Pixel emitted the warning `Parameter 'currency' is invalid for event 'Purchase'`.
- **Root Cause**:
  - `frontend/src/utils/facebookPixel.ts` hardcoded browser-side `Purchase.currency` to `EGP`.
  - Live browser verification on Swan showed Meta accepts `USD` in the browser runtime but rejects `EGP` for `Purchase`, even though the storefront itself operates in EGP and Conversions API remains available server-side.
- **Resolution**:
  - Added a browser-side purchase currency guard in `frontend/src/utils/facebookPixel.ts`.
  - When the runtime currency is one Meta rejects in the browser (currently reproduced with `EGP`) and Conversions API purchase tracking is enabled, the frontend now skips browser `Purchase` and relies on server-side CAPI using the same deduplication event ID.
  - Updated `frontend/src/pages/storefront/Checkout.tsx`, `frontend/src/pages/storefront/ProductDetails.tsx`, and `frontend/src/hooks/useStorefrontFacebookTracking.ts` to enable that fallback only when CAPI is configured for the store.
- **Verification**:
  - Created a real Swan order `ORD-637137-545` on 2026-03-09 and reproduced the Meta warning before the fix.
  - Direct browser experiments on Swan confirmed `Purchase` with `EGP` triggers the warning while `USD` does not.
  - Post-fix local verification confirms the storefront can skip browser `Purchase` and preserve the shared event ID for server-side CAPI.
- **Files Modified**:
  - `frontend/src/utils/facebookPixel.ts`
  - `frontend/src/pages/storefront/Checkout.tsx`
  - `frontend/src/pages/storefront/ProductDetails.tsx`
  - `frontend/src/hooks/useStorefrontFacebookTracking.ts`


### [FIX] Profile Page Theme Consistency (Dark Mode)
- **Date**: 2026-03-08
- **Description**: Fixed UI inconsistencies on the Profile page where certain elements had hardcoded dark backgrounds even in light mode.
- **Resolution**:
  - Replaced hardcoded `bg-slate-900` with theme-aware `derivedTheme` classes.
  - Fixed backgrounds for loading skeletons, anniversary cards, and birthday cards.
  - Improved visibility of editable inputs and selects by adding borders and correct background colors based on the active theme.
- **Files Modified**: `frontend/src/pages/profile/Profile.tsx`.


### [FIX] Profile Page Crash (ReferenceError: useTheme)
- **Date**: 2026-03-08
- **Description**: Fixed a critical crash where the Profile page wouldn't load due to a missing `useTheme` import.
- **Resolution**: Added missing `useTheme` import and hook call to `Profile.tsx`.
- **Files Modified**: `frontend/src/pages/profile/Profile.tsx`.


### [FIX] Material Symbols Layout Inconsistency (Elite V3)
- **Date**: 2026-03-08
- **Description**: Product detail icons on the Elite V3 page were flickering or failing to render due to Material Symbols loading delays and CSS conflicts.
- **Resolution**: Migrated all UI icons to Heroicons (SVG-based) for instant rendering and improved reliability.
- **Files Modified**: `frontend/src/pages/storefront/ProductDetailsEliteV3.tsx`.


### [FIX] Footer Studio Preview Loading Failure
- **Date**: 2026-03-08
- **Description**: The visual preview in the Storefront Footer Studio was showing a blank screen or a loading spinner indefinitely.
- **Root Cause**: Component hydration issues and missing tenant context during preview rendering.
- **Resolution**: Optimized the preview shell and ensured correct company context propagation to the footer component.
- **Files Modified**: `frontend/src/pages/settings/storefront/StorefrontFooterStudioPage.tsx`, `frontend/src/components/common/Footer.tsx`.


### [FIX] Shop Variant Override Inconsistency
- **Date**: 2026-03-08
- **Description**: The shop page variant (e.g., Neo-Brutalism) was not reflecting the Studio configuration correctly for all users.
- **Resolution**: Implemented `effectiveVariant` logic in `Shop.tsx` to prioritize Shop Studio overrides over hardcoded defaults.
- **Files Modified**: `frontend/src/pages/storefront/Shop.tsx`.


### [FIX] Shop Variant Override Inconsistency
- **Date**: 2026-03-08
- **Description**: The shop page variant (e.g., Neo-Brutalism) was not reflecting the Studio configuration correctly for all users.
- **Resolution**: Implemented `effectiveVariant` logic in `Shop.tsx` to prioritize Shop Studio overrides over hardcoded defaults.
- **Files Modified**: `frontend/src/pages/storefront/Shop.tsx`.


### [FIX] Shop Variant Override Inconsistency
- **Date**: 2026-03-08
- **Description**: The shop page variant (e.g., Neo-Brutalism) was not reflecting the Studio configuration correctly for all users.
- **Resolution**: Implemented `effectiveVariant` logic in `Shop.tsx` to prioritize Shop Studio overrides over hardcoded defaults.
- **Files Modified**: `frontend/src/pages/storefront/Shop.tsx`.

### [FIX] Modern Premium Template Not Applied in Production
- **Date**: 2026-03-06
- **Description**: The "Modern Premium (stitch-modern)" template was saving correctly (in `designTokens.pdpStudio`) but was not being applied on the storefront in production. The template worked when accessed via direct URL (`/shop/products/:id/stitch-modern`) but not when set through `/settings/storefront/studio/templates`.
- **Root Cause**: `ThemeProductDetails.tsx` had two missing handlers for the `stitch-modern` variant:
  1. `useStitchModernPdp` variable was missing — so the URL param `?pdpLayout=stitch-modern` was not recognized.
  2. The `renderStudioVariant()` function had no case for `variantId === "stitch-modern"`, causing it to fall through to `return fallback` (the default layout) instead of rendering `ProductDetailsStitchModern`.
- **Resolution**: Added `const ProductDetailsStitchModern` lazy import, `useStitchModernPdp` detection, and the `stitch-modern` case in `renderStudioVariant()`.
- **Files Modified**: `frontend/src/pages/storefront/ThemeProductDetails.tsx`



### [FIX] Storefront Studio — Missing Sidebar & Initialization
- **Date**: 2026-03-06
- **Description**: Resolved critical UI and runtime issues in the new Storefront Studio.
  - **Fix 1 (Sidebar)**: Fixed the sidebar not appearing on the `/settings/storefront/studio/templates` page by ensuring correct layout nesting and visibility flags.
  - **Fix 2 (Initialization)**: Resolved `ReferenceError: Cannot access 'isMobileViewport' before initialization` in `StorefrontCanvasShell.tsx` by reordering hook declarations.
- **Files Modified**: `frontend/src/pages/settings/storefront/studio/templates/StorefrontStudioTemplatesPage.tsx`, legacy storefront preview shell modules.


### [FEATURE] Storefront Page Builder Upgrades & Performance
- **Date**: 2026-03-06
- **Description**: Comprehensive upgrade to the Storefront Page Builder, introducing advanced widgets, layout studios, and performance optimizations.
- **Resolution**:
  1. **Widgets**: Added advanced product widgets (`ProductBuyBoxWidget`, `ProductQuantityWidget`, `ProductImageGalleryWidget`, `ProductPriceWidget`, `ProductVariantsWidget`, etc.).
  2. **Page Builder Editor**: Enhanced `StorefrontBuilderPanel`, `StorefrontCanvasShell`, `SettingsPanel`, and `Toolbox` to support the new storefront layout studios.
  3. **Layout Studios**: Introduced complete management studios (`StorefrontFooterStudioPage`, `StorefrontLayoutStudioPage`, `StorefrontProductStudioPage`) for merchants to visually customize their stores.
  4. **Performance**: Added `PerformanceOptimizer.tsx` and `OptimizedImage.tsx` to dramatically improve frontend loading speeds and Web Vitals.
  5. **Backend Scripts**: Added diagnostic scripts (`get_id_direct.js`, `get_product_clean.js`, `get_product_info.js`) for easier product database debugging.
- **Files Modified**: Extensive modifications across legacy storefront editor modules, `frontend/src/pages/settings/storefront/`, `frontend/src/components/storefront/`, and `backend/`.


### [FEATURE] Creative & Stitch Modern Themes Integration
- **Date**: 2026-03-06
- **Description**: Implemented and integrated the new "Creative" storefront homepage and "Stitch Modern" product details template to expand the premium theme offerings.
- **Resolution**: Added `HomepageCreative.tsx` for dynamic, visually appealing homepage experiences and `ProductDetailsStitchModern.tsx` for high-conversion product pages. Wired them through `StorefrontLayout.tsx`, `App.tsx`, and `StorefrontSettingsProvider.tsx`.
- **Files Modified**:
  - `frontend/src/App.tsx`
  - `frontend/src/components/layout/StorefrontLayout.tsx`
  - `frontend/src/pages/storefront/HomepageCreative.tsx`
  - `frontend/src/pages/storefront/ProductDetailsStitchModern.tsx`
  - `frontend/src/providers/StorefrontSettingsProvider.tsx`


### [FIX] Product Page Syntax Error & WhatsApp Campaign Trigger
- **Date**: 2026-03-05
- **Description**: Resolved a critical syntax error in `ProductNewFinal.tsx` that broke the frontend build and integrated smart WhatsApp campaign triggers.
  - **Fix 1 (Syntax Error)**: Corrected a brace mismatch in the `handleSubmit` function that caused a build failure.
  - **Fix 2 (WhatsApp Integration)**: Added logic to trigger automated WhatsApp campaigns (`smart-send`) when a product is created or updated, allowing immediate customer outreach for new stock.
- **Files Modified**:
  - `frontend/src/pages/products/ProductNewFinal.tsx`


### [FEATURE] Storefront Page Builder Premium Layouts & Widgets
- **Date**: 2026-03-05
- **Description**: Implemented a comprehensive suite of premium UI widgets for the visual Page Builder, empowering admins to craft high-end storefront layouts and specialized product detail pages.
- **Resolution**:
  1. **Premium Widgets**: Added `PremiumHero`, `PremiumProductCard`, `PremiumNewsletter`, `PremiumQuote`, and `PremiumSplitContent` components with dedicated settings panels.
  2. **Product Core Widgets**: Added granular product widgets (`Breadcrumbs`, `Description`, `Reviews`, `SocialShare`, `StockProgressBar`, `TrustBadges`, `Variants`) for custom product page assembly.
  3. **Product Designs Catalog**: Introduced a Super Admin management catalog for product page DNA and preset templates (`SuperAdminProductDesignsCatalog.tsx`).
  4. **Sample Templates**: Implemented high-end demo templates like `ProductDetailsStitchElite` and `ProductDetailsParallelDemo`.
  5. **HTML-to-JSON Pipeline**: Added `htmlToBuilderJson.ts` to convert external HTML layouts into fully structured Page Builder JSON nodes.
- **Files Modified**:
  - Legacy storefront editor widget modules
  - Legacy storefront product widget modules
  - Shared legacy storefront editor components
  - `frontend/src/pages/super-admin/SuperAdminProductDesignsCatalog.tsx`
  - `frontend/src/utils/htmlToBuilderJson.ts`
  - `frontend/src/pages/storefront/ThemeProductDetails.tsx`


### [FIX] Footer System — Multi-Layer Security & Performance Overhaul
- **Date**: 2026-03-04
- **Description**: Comprehensive audit of the storefront footer identified 10 distinct weaknesses spanning security, performance, and UX.
- **Resolution**:
  1. **Mass Assignment (Security)**: Added `FOOTER_SETTINGS_WHITELIST` in `footerSettingsController.js` — `updateFooterSettings` now only accepts the 11 known fields, preventing arbitrary Prisma model field injection.
  2. **Error Leakage (Security)**: Removed `error.message` from all 4 API error responses (`getFooterSettings`, `updateFooterSettings`, `resetFooterSettings`, `getPublicFooterSettings`) to prevent internal DB details from reaching clients.
  3. **Slug Detection Bug (Security/Performance)**: Replaced the flawed `companyId.includes('-') || length < 20` heuristic with a proper CUID regex `^c[a-z0-9]{24}$`. Also switched to `findFirst` with `OR: [slug, id]` to handle both formats in a single query.
  4. **Newsletter Non-Functional (UX)**: Replaced the decorative newsletter input with a real `<form>` element backed by React state (`newsletterEmail`, `newsletterStatus`), a submit handler calling the API, and a success confirmation message.
  5. **Duplicate Policy Links (UX)**: Removed the hardcoded `privacy-policy` and `terms` links from the footer bottom bar — they were already rendered in the Legal column above.
  6. **3x API Calls on Every Load (Performance)**: Added a `settingsCacheRef` (`useRef`) to short-circuit repeat fetches for the same `companyId`. Studio tokens merge now only runs when `resolvedSettings` is non-null.
  7. **`resolveCompanyId` Called Twice (Performance)**: Stored result in `resolvedCompanyIdState` (state) during `loadFooterSettings`; render phase reads from state instead of re-calling the function.
  8. **`null` Loading State (UX)**: Replaced `return null` with a 4-column animated `animate-pulse` skeleton that prevents layout shift.
  9. **`localStorage` Side-Effect in UI Component (Architecture)**: Removed `localStorage.setItem` calls from `loadStorePages` — Footer is a pure display component and must not own storage mutation.
- **Files Modified**:
  - `backend/controller/footerSettingsController.js`
  - `frontend/src/components/common/Footer.tsx`


### [FIX] Facebook Pixel Encoding & Character Corruption
- **Date**: 2026-03-04
- **Description**: Fixed character corruption (encoding issues) in `facebookPixel.ts` that caused unreadable Arabic comments and potential parsing errors.
- **Resolution**: Restored readable UTF-8 comments and simplified event tracking payload logic to ensure robust data submission to Facebook.
- **Files Modified**: `frontend/src/utils/facebookPixel.ts`.
- [x] **Telegram & Prisma Stability**: Regenerated Prisma client and updated `telegram.prisma` to resolve missing model errors.
- [x] **Conflict Resolution**: Successfully resolved `Dashboard.tsx` conflict and merged GitHub updates.
- [x] **Facebook Pixel Refactor**: Fixed encoding and payload logic in `facebookPixel.ts`.
- [x] **Growth Marketing Cleanup**: Removed redundant routes and services from the frontend.
- [x] **Easy Orders Integration**: Successfully pulled and synchronized the new "Easy Orders" module (Schema + UI + Backend).


### [CLEANUP] Growth Marketing Section Removal
- **Date**: 2026-03-04
- **Description**: Removed the redundant "/growth-marketing" section to streamline the UI and codebase, as it conflicted with existing customer-centric marketing flows.
- **Files Deleted**: `frontend/src/services/growthMarketingService.ts`, `frontend/src/pages/growth-marketing/*`.
- **Files Modified**: `frontend/src/App.tsx`, `frontend/src/config/sidebar.ts`.




### [FIX] Theme Factory Dashboard Engine Crash
- **Date**: 2026-03-03
- **Description**: The dashboard crashed when previewing a DNA profile because the service was returning the full API response envelope instead of the inner data object.
- **Resolution**:
    - Updated `ThemeFactoryService` to correctly return `response.data.data`.
    - Added defensive programming (optional chaining and default fallbacks) in the `DnaPreview` component.
- **Files Modified**: `frontend/src/services/theme-factory/theme-factory.service.ts`, `frontend/src/pages/super-admin/theme-factory/ThemeFactoryDashboard.tsx`.


### [INFO] Nile Walk Elite V2 Kit - 100% Coverage
- **Date**: 2026-03-02
- **Description**: Expanded the Nile Walk Elite V2 kit to 100% coverage.
- **Resolution**: Added all 16 required storefront pages to `content.json`, updated `manifest.json`, and enhanced the seed script.
- **Files Modified**: `backend/src/templates/system/nile-walk-elite-v2/content.json`, `backend/src/templates/system/nile-walk-elite-v2/manifest.json`, `backend/seed_experimental_shop.js`.


### [FEATURE] Product Page Template Optimization
- **Date**: 2026-03-02
- **Description**: Developed a professional product page template for the "Sdfsdfds" brand.
- **Resolution**: Implemented a responsive 2-column layout with dynamic widgets for Title, Price, Gallery, and Add to Cart functionality.
- **Files Modified**: `frontend/src/pages/storefront/ProductDetails.tsx`, related storefront purchase widgets.


### [FIX] Vite Build Resolution: Untracked Theme-Options Files
- **Date**: 2026-03-01
- **Description**: Production build (`npm run build`) failed because `ThemeOptionsPage.tsx` and its related components/hooks were untracked locally and not pushed to GitHub.
- **Resolution**: Identified all untracked source files and performed a full sync to `main`.
- **Files Modified**: `frontend/src/App.tsx`, `frontend/src/pages/settings/ThemeOptionsPage.tsx`, and various components under `frontend/src/components/theme-options/`.


### [FIX] WhatsApp Notification Template Creation (Error 500)
- **Date**: 2026-02-28
- **Description**: Creating or modifying a notification template for custom dynamically-added order statuses resulted in HTTP 500.
- **Root Cause**: Database schema used a strictly typed Enum `WhatsAppNotificationTemplatesEventType` for the `eventType` field, rejecting dynamic or numeric status IDs (e.g. `266`).
- **Resolution**: Migrated the `eventType` column to be a `String` field to accept any dynamic status key. Cleaned up conflicting template records.
- **Files Modified**: `backend/prisma/schema/marketing.prisma`, `backend/controller/whatsappNotificationController.js`


### [REFACTOR] Large Shop Layouts Modularization (Stitch & Phoenix)
- **Date**: 2026-03-09
- **Description**: `ShopStitchEditorialLayout.tsx` (37KB) and `ShopPhoenixCategoryLayout.tsx` (32KB) were too massive causing readability and maintainability issues.
- **Resolution**: Both layouts were broken down into smaller components. Stitch was split into `EditorialFilterPanel` and `EditorialProductGrid`. Phoenix was split into `PhoenixHeader`, `PhoenixToolbar`, `PhoenixProductGrid`, and `PhoenixFooter`. Fixed duplicate imports and unused variable lint errors.
- **Files Created**: `EditorialFilterPanel.tsx`, `EditorialProductGrid.tsx`, `PhoenixHeader.tsx`, `PhoenixToolbar.tsx`, `PhoenixProductGrid.tsx`, `PhoenixFooter.tsx`


### [FIX] Homepage Template Visibility & Seeding
- **Date**: 2026-02-26
- **Description**: Homepage templates were partially missing from the Super Admin marketplace and company settings.
- **Root Cause**: Incomplete seeding and missing default categories for some archived templates.
- **Resolution**: Verified and re-ran seeding logic; ensured templates are correctly categorized and flagged for marketplace visibility.
- **Files Modified**: `backend/controller/homepageController.js`, `backend/seed_starter_themes.js`


### [FIX] Vite Import Error (Marketplace Pages)
- **Date**: 2026-02-26
- **Description**: Marketplace pages (`TemplatesMarketplace.tsx`, `Marketplace.tsx`, `AppDetails.tsx`) failed to load with `[plugin:vite:import-analysis] Failed to resolve import "../../services/homepageService"`.
- **Root Cause**: The import path pointed to a non-existent `homepageService` file; the service is actually an alias exported by `storeTemplateService.ts`.
- **Resolution**: Updated imports to use `storeTemplateService` and aliased it locally to `homepageService`.
- **Files Modified**:
  - `frontend/src/pages/marketplace/TemplatesMarketplace.tsx`
  - `frontend/src/pages/marketplace/Marketplace.tsx`
  - `frontend/src/pages/marketplace/AppDetails.tsx`


### [FIX] Clarity Settings Persistence
- **Date**: 2026-02-26
- **Description**: Fully resolved the persistence issue. Identified and fixed a frontend "unwrapping" bug in `StorefrontClaritySettings.tsx` and ensured the backend controller changes were active by restarting the server. All data flows (Update/Get) are now verified.
- **Files Modified**: `frontend/src/pages/storefront/StorefrontClaritySettings.tsx`, `backend/controller/storefrontController.js` (implicit restart)


### [FIX] Custom Themes Mobile Responsiveness
-   **Date**: 2026-02-24
-   **Description**: Custom homepage templates (like Aura or Expert themes) were not rendering correctly on mobile devices and overriding global styles.
-   **Root Cause**: Lack of dynamic CSS injection for sections and non-specific class targeting for price texts rendering layout inconsistently.
-   **Resolution**:
    1.  Updated `TemplateRenderer.tsx` to safely inject `customCss` passed in theme settings.
    2.  Added specific classes like `.product-price` to target theme styles without polluting global CSS.
    3.  Created `expert-responsive.css` for media-query fallbacks and specific mobile rules.
-   **Files Modified**:
    -   `frontend/src/components/homepage/TemplateRenderer.tsx`
    -   `frontend/src/components/homepage/ProductsSection.tsx`
    -   `frontend/src/components/homepage/CategoriesSection.tsx`
    -   `frontend/src/styles/index.css`


### [FIX] Storefront Shop Rendering (Missing Icon)
- **Date**: 2026-02-24
- **Description**: The Shop page was failing to render some components due to a missing icon import.
- **Root Cause**: `PhotoIcon` was used in the product grid fallback but was not imported from `@heroicons/react/24/outline`.
- **Resolution**: Added `PhotoIcon` to the imports in `Shop.tsx`.
- **Files Modified**: `frontend/src/pages/storefront/Shop.tsx`


### [FIX] Homepage Template Rendering (JSON Parsing)
- **Date**: 2026-02-24
- **Description**: Imported or system-seeded templates failed to render on the storefront or preview, showing empty sections.
- **Root Cause**: The `content` and `publishedContent` fields were being stored as JSON strings in some cases (e.g., seeding via script), but the API was returning them as strings instead of parsed objects. The frontend renderer expects a structured object.
- **Resolution**: Updated `getPublicActiveHomepage`, `getActiveHomepage`, and `getSystemTemplateById` in `homepageController.js` to explicitly check if `content` is a string and parse it using `JSON.parse()` before sending the response.
- **Files Modified**: `backend/controller/homepageController.js`


### [FIX] Seeding Script Prisma Reference (`seed_starter_themes.js`)
- **Date**: 2026-02-24
- **Description**: Running `node seed_starter_themes.js` failed with `MODULE_NOT_FOUND` for `./prisma/generated/postgresql`.
- **Root Cause**: Standalone scripts cannot easily assume relative paths to generated Prisma clients across different environments (local vs server).
- **Resolution**: Refactored the script to use the project's `sharedDatabase` service (`getSharedPrismaClient`), which centrally manages client initialization and RLS application.
- **Files Modified**: `backend/seed_starter_themes.js`

### [FIX] Storefront Checkout Shipping Persistence & Governorate Matching
- **Date**: 2026-03-31
- **Description**: The public checkout page could correctly show a live shipping quote, but the submitted guest order was still saved with `shippingCost = 0` and `finalTotal = subtotal`. This caused new storefront orders to appear in admin with zero shipping even when the customer had selected a governorate with a valid shipping zone.
- **Root Cause**:
    1. `PaymentSection.tsx` calculated shipping for display only, while the storefront checkout payload still posted the raw subtotal without the resolved shipping amount.
    2. `publicOrdersRoutes.js` used a simpler governorate-matching path than the public shipping calculator, so English governorate values such as `Giza` or `Cairo` could miss zones stored with Arabic aliases.
- **Resolution**:
    1. Extended storefront checkout payload building to send `subtotal`, `shippingCost`, and the resolved `total`.
    2. Extracted a reusable `resolveShippingQuoteForGovernorate()` helper from `shippingZoneController.js` and reused it inside `publicOrdersRoutes.js` so storefront order creation matches the exact same zone-lookup logic used by `/api/v1/shipping-zones/public/:companyId/calculate`.
    3. Added regression coverage for storefront checkout payload composition and public order creation with mixed-language governorate matching.
- **Files Modified**:
    - `frontend/src/storefront/hooks/useCheckout.ts`
    - `frontend/src/storefront/sections/PaymentSection.tsx`
    - `backend/controller/shippingZoneController.js`
    - `backend/routes/publicOrdersRoutes.js`
    - `frontend/src/storefront/__tests__/checkout.test.ts`
    - `frontend/src/storefront/__tests__/useCheckout.test.ts`
    - `frontend/src/storefront/__tests__/storefrontFlow.test.tsx`
    - `backend/tests/integration/storefrontPublicRoutes.test.js`


### [FIX] Early Checkout Deduction & Salary-Based Calculation
- **Date**: 2026-03-03
- **Description**: Early checkout deductions were not being calculated or were showing as zero when an employee didn't have a manual `lateDeductionRate` set.
- **Root Cause**:
    1. `latenessCalculationService.js` only looked for explicit per-minute deduction rates for early checkouts, unlike the check-in logic which has a salary-based fallback.
    2. `earlyLeaveMinutes` detection was overly restrictive, skipping any departure within the grace period instead of letting the deduction service decide the penalty.
- **Resolution**:
    - Implemented a salary-based fallback in `calculateEarlyCheckoutDeduction` (Salary ÷ Days ÷ Hours ÷ 60).
    - Updated `attendanceService.js` to always calculate and record `earlyLeaveMinutes` if departure is before shift end, allowing the calculation service to apply thresholds/rules more reliably.
    - Added comprehensive logging to trace deduction skip reasons (e.g. `BELOW_THRESHOLD`, `EMPLOYEE_EXCLUDED`).
- **Files Modified**: `backend/services/hr/latenessCalculationService.js`, `backend/services/hr/attendanceService.js`

## Reported Bugs (2026-03-01)
- **Issue**: Backend Crash Loop & Connection Pool Exhaustion (`P2028: Unable to start a transaction in the given time.`)
- **Symptoms**: Intermittent login failures (500/503 errors), server restarts multiple times per minute, slow query logs.
- **Root Cause**:
    1. Unhandled rejections in `WhatsAppManager.js` event listeners (Baileys) causing process crashes.
    2. Over-zealous RLS (Row Level Security) implementation in `sharedDatabase.js` wrapping every query in a transaction, exhausting the connection pool.
- **Resolution**:
    1. Added `try/catch` guards to WhatsApp `connection.update` and `messages.upsert` listeners.
    2. Optimized `sharedDatabase.js` to skip transaction wrapping for system-level queries where `companyId` is absent.
    3. Increased `pool_timeout` and `connect_timeout` to 30s.
- **Files Modified**: `backend/services/sharedDatabase.js`, `backend/services/whatsapp/WhatsAppManager.js`.
- **Status**: ✅ Resolved and verified on production.


### [REFACTOR] Product Page UI Modularization & Type Safety
- **Date**: 2026-03-13
- **Description**: Finalized the refactoring of `ProductNewFinal.tsx` into a modular architecture.
- **Key Improvements**:
    1. **Architecture**: Moved monolithic code into separate tab components (`BasicTab`, `InventoryTab`, `ShippingTab`, `SEOTab`, `AdvancedTab`, `WhatsAppTab`, `VariantsTab`).
    2. **Custom Hooks**: Standardized data fetching and state management via `useProductForm`, `useProductApi`, `useProductVariants`, and `useProductMedia`.
    3. **Bug Fixes**: 
        - Fixed a crash in `ProductSelect.tsx` during length checks on undefined arrays.
        - Resolved type mismatches in `useProductMedia` when handling `File` vs `string` URLs.
        - Fixed sticky action bar layout for mobile and desktop consistency.
        - Corrected various JSX structural imbalances that caused rendering errors.
    4. **Type Safety**: Achieved passing TypeScript compilation for the product-related codebase by standardizing the `frontend` build environment and fixing type-level bugs.
- **Files Modified**: 
    - `frontend/src/pages/products/ProductNewFinal.tsx`
    - `frontend/src/pages/products/components/tabs/*.tsx`
    - `frontend/src/pages/products/hooks/*.ts`
    - `frontend/src/components/common/ProductSelect.tsx`
- **Status**: ✅ Fully refactored, verified, and modularized.

### [FIX] Storefront Theme Leakage & Customization Persistence
- **Date**: 2026-03-15
- **Description**: Public storefront buttons and UI elements were defaulting to dark navy colors (Midnight style), and company-level color customizations from the dashboard were ignored.
- **Root Cause**: 
    1. **Circular CSS Dependency**: `storefront-theme-overrides.css` had a circular reference between `--storefront-ink` and `--color-primary`, causing browsers to invalidate the variables and fallback to hardcoded dark navy defaults.
    2. **Missing Token Merge**: `StorefrontLayout.tsx` was loading template settings but failing to merge company-specific `designTokens` from the `storefrontSettings` API.
- **Resolution**: 
    1. Refactored `storefront-theme-overrides.css` to make `--color-primary` the single source of truth and removed circularity.
    2. Updated `StorefrontLayout.tsx` to merge `storefrontSettings.designTokens` into the active theme settings, ensuring company brand colors take precedence over template defaults.
- **Files Modified**: `frontend/src/styles/storefront-theme-overrides.css`, `frontend/src/components/layout/StorefrontLayout.tsx`

### [FIX] Solea Femme Shop Filter Duplication & Storefront Preview Text Selection
- **Date**: 2026-03-27
- **Description**: Two storefront UX issues were reported together:
  1. Admins could not select/copy text inside the visual storefront preview because the selection overlay consumed the whole section surface.
  2. `solea-femme` rendered two filter areas on `/shop`: a top command bar and a sidebar rail, creating duplicated controls.
  3. Shop price filters were still hardcoded in USD and looked visually broken in RTL when the store currency was `EGP`.
- **Root Cause**:
  1. `StorefrontVisualEditor.tsx` used an absolute interactive overlay button above each rendered section, which blocked browser text selection inside the preview frame.
  2. `frontend/src/storefront/themes/solea-femme.json` explicitly included both `shop-command-bar` and `filters-sidebar` in the same shop composition.
  3. `catalogFilters.ts` shipped static `$25/$50/$100` labels and consuming components displayed currency strings in RTL without isolating numeric direction.
- **Resolution**:
  1. Replaced the blocking preview overlay with a non-intercepting visual frame while moving section selection to the wrapper container itself.
  2. Removed the top `shop-command-bar` from the `solea-femme` shop page so filtering is handled from the sidebar only.
  3. Added dynamic currency-aware price-range label generation and applied `dir="ltr"` to storefront price rows in search results, product cards, quick view, and filter labels.
  4. Standardized storefront currency fallback to use `storefront.settings.currency`, then `company.currency`, then `EGP`.
- **Files Modified**:
  - `frontend/src/components/store/StorefrontVisualEditor.tsx`
  - `frontend/src/storefront/themes/solea-femme.json`
  - `frontend/src/storefront/utils/catalogFilters.ts`
  - `frontend/src/storefront/sections/FiltersSidebar.tsx`
  - `frontend/src/storefront/components/ProductCard.tsx`
  - `frontend/src/storefront/components/QuickViewModal.tsx`
  - `frontend/src/storefront/StorefrontShell.tsx`

### [FIX] Swan Storefront Analytics Tracking Blocked By Auth Middleware
- **Date**: 2026-04-22
- **Description**: Swan admin analytics at `/analytics/store` kept showing purchases while visits and product views stayed empty or near-zero, even though the storefront had live traffic.
- **Root Cause**:
  1. `globalSecurity` ran before `/api/v1/analytics` routes and still treated `POST /api/v1/analytics/track/*` as protected endpoints.
  2. Storefront tracking requests hit the backend without an auth token, then failed with `401` before `trackStoreVisit` / `trackProductView` could write analytics rows.
  3. The existing query-string sanitizers were duplicated in multiple middleware files, which made the analytics regression harder to verify alongside UTM payload preservation.
- **Resolution**:
  1. Whitelisted `POST /api/v1/analytics/track/*` inside `backend/middleware/globalSecurity.js`.
  2. Added an integration regression test that mounts `globalSecurity`, `sanitizeRequest`, `sanitizeInput`, and `analyticsRoutes`, then verifies storefront tracking endpoints return `200` without auth.
  3. Centralized string sanitization in `backend/utils/requestSanitizer.js` and reused it across auth/security/input middleware so `utm_content` and similar analytics params stay intact while unsafe payloads are stripped.
  4. Hardened `frontend/src/services/apiClient.ts` and `frontend/src/services/analyticsService.ts` so public storefront analytics requests can skip auth header injection and token refresh behavior.
- **Files Modified**:
  - `backend/middleware/globalSecurity.js`
  - `backend/middleware/authEnhanced.js`
  - `backend/middleware/inputValidation.js`
  - `backend/middleware/securityEnhancements.js`
  - `backend/utils/requestSanitizer.js`
  - `backend/tests/utils/requestSanitizer.test.js`
  - `backend/tests/integration/storefrontPublicRoutes.test.js`
  - `frontend/src/services/apiClient.ts`
  - `frontend/src/services/analyticsService.ts`

### [FIX] Storefront Analytics Slug Resolution & False Success Responses
- **Date**: 2026-04-22
- **Description**: Some storefront analytics requests still failed or silently dropped events in production when the public store used a company slug like `swan` instead of the internal company ID.
- **Root Cause**:
  1. Analytics reporting and tracking endpoints did not share one canonical company resolver.
  2. `trackProductView` validated products against the raw `x-company-id` / `companyId` value, so slug-based requests returned `404 المنتج غير موجود`.
  3. `trackStoreVisit` and `trackConversion` could still return `200 success` even when the analytics service skipped the write because the company lookup by raw ID failed.
  4. `globalSecurity` may recover `req.companyId` from a raw header/query fallback, so trusting that field as a resolved tenant ID kept the slug bug alive on production tracking routes.
  5. The same middleware can also create a minimal `req.user` object that contains only the raw fallback company value, which looks authenticated unless the resolver checks for a real user identity.
- **Resolution**:
  1. Added a shared analytics company resolver in `analyticsController.js` that accepts authenticated company IDs, resolved `req.companyId`, header values, and slug query values, then normalizes all of them to the canonical company ID.
  2. Updated the resolver to trust `req.user.companyId` only when `req.user.id` exists; every non-auth storefront company signal (`req.company`, `req.companyId`, header, query, or fallback-only `req.user`) is now treated as a raw reference and re-resolved safely.
  3. Reused that resolver across storefront reporting endpoints and all `/api/v1/analytics/track/*` endpoints.
  4. Stopped returning false-positive success responses when a storefront tracking write cannot be persisted.
  5. Added an integration regression test that tracks storefront events with `x-company-id: <company.slug>` and verifies public analytics reports still load through `companyId=<slug>`.
- **Files Modified**:
  - `backend/controller/analyticsController.js`
  - `backend/tests/integration/storefrontPublicRoutes.test.js`

### [FIX] Mobile PDP Blank Screen When Bought-Together Hydrates Before Product
- **Date**: 2026-04-27
- **Description**: The Swan product page `https://swan.maxp.online/product/boot-swan` could render as a blank screen on mobile even though the desktop page still appeared healthy.
- **Root Cause**:
  1. `frontend/src/storefront/sections/BoughtTogetherSection.tsx` computed bundle totals before the main product had finished hydrating.
  2. The component compared `currentPdpSelection?.productId === product?.id`, which becomes `true` when both sides are still `undefined` during the early mobile render path.
  3. That false-positive match immediately dereferenced `currentPdpSelection.unitPrice`, throwing `TypeError: Cannot read properties of null (reading 'unitPrice')` and collapsing the React tree.
- **Resolution**:
  1. Added a guarded `hasCurrentPdpSelection` check that only becomes true when a real product id exists and the PDP selection belongs to that exact product.
  2. Reused that guard for bundle-total math, readiness checks, and cart-item construction so null PDP state can no longer trip the section during hydration.
  3. Added a regression test that renders the section before the main product is available and verifies it safely returns `null` instead of crashing.
- **Files Modified**:
  - `frontend/src/storefront/sections/BoughtTogetherSection.tsx`
  - `frontend/src/storefront/__tests__/BoughtTogetherSection.test.tsx`

### [FIX] Featured Collections Preview Cards Reused Weak Or Repeated Images
- **Date**: 2026-04-27
- **Description**: template preview collection cards could show placeholder art, repeated section images, or manually configured images that did not reflect the preview products actually sold by the template.
- **Root Cause**:
  1. `FeaturedCollections.tsx` accepted manual section-image values directly without checking whether the same source was being reused inside the same block.
  2. When manual images were missing, the component dropped to generic placeholder assets instead of mining the active preview catalog for product photography.
  3. The same remote photo could bypass naive duplicate checks by varying only URL query params.
- **Resolution**:
  1. Added preview-aware collection-card resolution in `frontend/src/storefront/sections/FeaturedCollections.tsx`.
  2. Canonicalized image identity so equivalent URLs collapse to one candidate key before selection.
  3. Preferred active preview product/category images before generic fallbacks, which keeps section cards closer to real products and reduces repetition.
  4. Cleared the remaining weak source pools across the library:
     - generated shoes/kids imagery in `frontend/src/storefront/preview/marketplaceSampleData.ts`
     - café/pharmacy placeholder product images in `frontend/src/storefront/preview/marketplaceSampleData.ts`
     - perfume gift-set imagery in `frontend/src/storefront/preview/perfumeEgMarketplaceData.ts`
     - direct placeholder category/hero imagery in `modern-minimal.json`, `solea-femme.json`, `cafe-demo.json`, and `perfume-eg.json`
  5. Added regression coverage in `frontend/src/storefront/__tests__/featuredCollectionsImageResolver.test.ts` and full-preset audit coverage in `frontend/src/storefront/__tests__/storefrontThemeImageAudit.test.ts`.
- **Files Modified**:
  - `frontend/src/storefront/sections/FeaturedCollections.tsx`
  - `frontend/src/storefront/__tests__/featuredCollectionsImageResolver.test.ts`
  - `frontend/src/storefront/__tests__/storefrontThemeImageAudit.test.ts`

### [FIX] Generated Marketplace Preview Products Reused The Same Cover Photo Across One Theme
- **Date**: 2026-04-27
- **Description**: some generated storefront previews such as `modern-minimal` and `solea-femme` still looked repetitive even after section-card cleanup because multiple product cards inside the same template opened with the same lead photo.
- **Root Cause**:
  1. `buildGeneratedPreviewProductGallery` in `frontend/src/storefront/preview/marketplaceSampleData.ts` pinned every generated product to the first image in its resolved pool.
  2. Different product pools for the same theme still overlapped heavily, so repeated first-image picks leaked into the visible product grid and then into section-card sampling.
- **Resolution**:
  1. Rotated generated galleries from their own `startIndex` instead of always hard-coding the first pool image as the cover.
  2. Added a second pass that avoids reusing an already-consumed generated cover inside the same theme when another image from that gallery is available.
  3. Added regression coverage in `frontend/src/storefront/preview/__tests__/marketplaceSampleData.test.ts` to assert that the first generated `modern-minimal` products no longer ship with repeated cover images.
- **Files Modified**:
  - `frontend/src/storefront/preview/marketplaceSampleData.ts`
  - `frontend/src/storefront/preview/__tests__/marketplaceSampleData.test.ts`

### [FIX] Women-Shoe Preview Pools Drifted Into Fashion Or Decor Photos
- **Date**: 2026-04-27
- **Description**: several shoe-focused previews still rendered semantically wrong photography even after duplicate cleanup, including outfit shots in flats cards, couch/interior photos in sandal slots, and sneaker photos inside heel-specific galleries.
- **Root Cause**:
  1. Older women-shoe galleries in `frontend/src/storefront/preview/marketplaceSampleData.ts` mixed generic fashion/lifestyle IDs with actual shoe photography.
  2. Manual editorial mappings in `frontend/src/storefront/themes/solea-femme.json` and `frontend/src/storefront/themes/modern-minimal.json` inherited some of the same weak IDs, so category cards looked “real” but not product-correct.
  3. `frontend/src/storefront/preview/elegantLuxeMarketplaceData.ts` still pointed its luxury heel preview at sneaker-oriented images.
- **Resolution**:
  1. Replaced the affected women-shoe preview galleries and generated shoe-family pools with curated footwear-only image IDs for sneakers, flats, heels, sandals, and boots.
  2. Re-mapped the manual home/shop/lookbook section imagery in `solea-femme` and `modern-minimal` to category-correct shoe photos while avoiding the generated preview cover set.
  3. Updated `luxury-heels` plus `elegant-luxe-crystal-line-heel` to actual heel photography.
  4. Added tighter regression coverage so shoe-family sections and preview galleries stay aligned with the intended product family.
- **Files Modified**:
  - `frontend/src/storefront/preview/marketplaceSampleData.ts`
  - `frontend/src/storefront/preview/elegantLuxeMarketplaceData.ts`
  - `frontend/src/storefront/themes/solea-femme.json`
  - `frontend/src/storefront/themes/modern-minimal.json`
  - `frontend/src/storefront/preview/__tests__/marketplaceSampleData.test.ts`
  - `frontend/src/storefront/__tests__/storefrontThemeImageAudit.test.ts`

### [FIX] Men-Shoe Manual Collection Cards Were Being Overridden By Preview/Hero Imagery
- **Date**: 2026-04-28
- **Description**: `men-shoes-eg` and especially `cairo-stride` could still render wrong featured-collection images in the live browser even after manual theme JSON remapping, because the runtime resolver was replacing valid manual section images with unrelated preview or hero-derived candidates.
- **Root Cause**:
  1. `resolveFeaturedCollectionCards(...)` in `frontend/src/storefront/sections/FeaturedCollections.tsx` always put preview-product candidates ahead of the manual image whenever preview products existed.
  2. That made sense for weak templates, but it broke hand-curated men-shoe themes where the manual image was already the correct real category image.
  3. As a result, the browser could show `preview.svg`, hero sneakers, or generic generated fashion photos inside `cairo-stride` section cards instead of the intended category-specific shoe photos.
- **Resolution**:
  1. Added `hasStrongManualCollectionImage(...)` to detect real manual section imagery versus placeholder/preview assets.
  2. Changed the resolver order so a strong manual image is kept first, while preview-product/category images remain fallback candidates for missing, weak, or repeated manual inputs.
  3. Re-mapped the men-shoe manual card seeds in `frontend/src/storefront/themes/men-shoes-eg.json` and `frontend/src/storefront/themes/cairo-stride.json`.
  4. Added regression coverage for both:
     - resolver contract changes in `frontend/src/storefront/__tests__/featuredCollectionsImageResolver.test.ts`
     - final resolved men-shoe card families in `frontend/src/storefront/__tests__/storefrontThemeImageAudit.test.ts`
- **Files Modified**:
  - `frontend/src/storefront/sections/FeaturedCollections.tsx`
  - `frontend/src/storefront/themes/men-shoes-eg.json`
  - `frontend/src/storefront/themes/cairo-stride.json`
  - `frontend/src/storefront/__tests__/featuredCollectionsImageResolver.test.ts`
  - `frontend/src/storefront/__tests__/storefrontThemeImageAudit.test.ts`

### [FIX] Generated Preview Catalogs Could Still Leak Theme Chrome Or Empty Manual Section Cards Into Real Storefront Collections
- **Date**: 2026-04-28
- **Description**: after the earlier shoe/image pass, a smaller set of presets (`cairo-stride`, `menswear-prime`, `hayah-modest-eg`, `rihla-resort-eg`, `layali-edit-eg`, `nile-bistro`, `turbo-parts`, `crafted`, `fresh-cart`) could still show weak collection imagery because generated preview families were incomplete, weak preview assets were still harvestable, or the template's own category cards had no explicit images.
- **Root Cause**:
  1. `marketplaceSampleData.ts` had no dedicated generated family for `mens-shoes`, so `cairo-stride` preview products/categories were being built from the generic fashion-mixed blueprint instead of men-shoe products.
  2. Generated preview pool assembly still allowed `preview.svg`/theme preview assets to be treated as usable product/category photos.
  3. For non-shoe families without keyword hints, collected theme images were still prioritized ahead of the preferred/category pools, which meant category-specific first-image fixes were ignored.
  4. Some general templates (`turbo-parts`, `crafted`, `fresh-cart`) still shipped featured-collections cards with titles/subtitles only and no explicit images, so runtime eventually fell back to placeholder art.
- **Resolution**:
  1. Added a dedicated `menShoes` generated preview family plus `mens-shoes -> menShoes` mapping.
  2. Rejected weak generated image candidates such as `preview.svg` and `/placeholders/*`.
  3. Reordered generated pool resolution so preferred/category image pools always lead.
  4. Added category-first image seeds for the remaining menswear/modest/resort/occasion/restaurant categories that were still colliding.
  5. Filled the remaining image-empty manual category-card sets in:
     - `frontend/src/storefront/themes/turbo-parts.json`
     - `frontend/src/storefront/themes/crafted.json`
     - `frontend/src/storefront/themes/fresh-cart.json`
  6. Re-separated `cairo-stride` home editorial imagery from the generated men-shoe product covers so the landing cards stay real-photo and non-repetitive without sharing the exact same cover set as the product grid.
- **Files Modified**:
  - `frontend/src/storefront/preview/marketplaceSampleData.ts`
  - `frontend/src/storefront/themes/cairo-stride.json`
  - `frontend/src/storefront/themes/turbo-parts.json`
  - `frontend/src/storefront/themes/crafted.json`
  - `frontend/src/storefront/themes/fresh-cart.json`
  - `frontend/src/storefront/__tests__/storefrontThemeImageAudit.test.ts`
  - verification rerun in:
    - `frontend/src/storefront/__tests__/featuredCollectionsImageResolver.test.ts`
    - `frontend/src/storefront/preview/__tests__/marketplaceSampleData.test.ts`
    - `frontend/src/storefront/__tests__/themeCatalog.test.ts`

### [FIX] Applied KHEMET LUXE Theme Could Be Masked By A Stale Homepage Template
- **Date**: 2026-04-29
- **Description**: applying the `khemet-luxe-eg` marketplace theme could update `storefrontSettings.designTokens.themeId` while the live public storefront still inherited header, footer, SEO, content, page, or layout overrides from an active homepage template that belonged to another theme.
- **Root Cause**:
  1. `buildStorefrontConfig(...)` always merged `HomepageTemplate.settings` into the public storefront payload.
  2. That meant a previously active `elegant-luxe` or other template could keep overriding KHEMET's preset chrome even after the marketplace apply action saved the new theme id.
  3. The frontend theme resolver correctly loaded KHEMET by `themeId`, but then received stale runtime overrides from the backend and applied them on top.
- **Resolution**:
  1. Added template/theme compatibility checks in the public storefront controller.
  2. Template design tokens and runtime overrides are now applied only when the active template has no theme id or matches the resolved storefront theme id.
  3. Added an integration regression test for a KHEMET-applied store with a stale `elegant-luxe` homepage template.
- **Files Modified**:
  - `backend/controller/publicStorefrontController.js`
  - `backend/tests/integration/storefrontPublicRoutes.test.js`

### [FIX] Flora KHEMET PDP Broke Variant Images From WooCommerce Paths
- **Date**: 2026-04-29
- **Description**: the live Flora product page `https://flora.maxp.online/product/hody-7rymy-toyl` could replace the main gallery with a "preview unavailable" state after selecting a variant.
- **Root Cause**:
  1. Some product variants arrived with `images` stored as a JSON-encoded string such as `["/wp-content/uploads/2025/03/IMG_4227.jpg"]`.
  2. Storefront image normalization treated that JSON string as one literal URL candidate, producing requests such as `/[%22/wp-content/uploads/...%22]` on the Flora storefront host.
  3. WooCommerce-relative `/wp-content/...` variant paths did not keep the external origin that the product gallery already had in its absolute image list.
  4. Applied themes could also keep a literal theme SEO title template such as `%s | KHEMET LUXE`, which leaked the template brand into the browser title for real stores.
  5. Theme footer contact rows and copyright text could expose demo KHEMET phone/email/copyright values when the preset was applied to a real company without runtime contact settings.
  6. Homepage section copy and cart page settings still carried literal preset brand strings such as `KHEMET LUXE` and `سلة KHEMET LUXE` after the theme was applied to Flora.
- **Resolution**:
  1. Storefront image candidates now parse JSON-encoded image strings and nested image object fields before normalization.
  2. WooCommerce-relative variant image paths are rebased onto the absolute WooCommerce product-image origin when that origin is present in the same candidate set.
  3. Unresolved `/wp-content/...` candidates are dropped instead of being pointed at the storefront domain.
  4. Storefront head title templates now replace literal theme brand names with `{{store}}` when no runtime SEO template is configured.
  5. Storefront footer text now replaces literal theme brand names with the runtime store name and suppresses demo contact rows for applied real stores unless runtime contact settings exist.
  6. Page composer and cart drawer copy now sanitize literal theme brand names to the runtime store name for applied storefronts while preserving marketplace preview copy.
  7. Added regression coverage for JSON-encoded variant images, WooCommerce-relative image rebasing, and runtime brand text replacement.
- **Files Modified**:
  - `frontend/src/storefront/utils/productImages.ts`
  - `frontend/src/storefront/utils/runtimeBrandText.ts`
  - `frontend/src/storefront/engine/StorefrontHead.tsx`
  - `frontend/src/storefront/engine/PageComposer.tsx`
  - `frontend/src/storefront/components/CartDrawer.tsx`
  - `frontend/src/storefront/StorefrontShell.tsx`
  - `frontend/src/storefront/__tests__/productImages.test.ts`
  - `frontend/src/storefront/__tests__/runtimeBrandText.test.ts`

### [FIX] KHEMET Product Header Controls Did Not Open On Mobile
- **Date**: 2026-04-29
- **Description**: the applied Flora KHEMET product page exposed search and cart icon buttons on mobile, but search had no rendered overlay in the KHEMET unified header branch, the header had no real mobile menu button, and the cart drawer closed immediately when the cart was empty. This made the header controls look broken before a shopper added anything.
- **Root Cause**:
  1. `StorefrontHeader` returned early for the `khemet-luxe-eg` unified header and skipped the shared search overlay JSX used by other header variants.
  2. The KHEMET unified header kept desktop-style horizontal navigation visible on narrow screens instead of switching to a drawer menu.
  3. `CartDrawer` treated an empty cart the same as the `/cart` route and forced `isOpen` back to `false`.
- **Resolution**:
  1. Added a KHEMET-specific search dialog to the unified header branch.
  2. Added a mobile menu trigger and drawer for KHEMET while keeping desktop navigation intact on larger screens.
  3. Allowed the cart drawer to open with an empty cart, only auto-closing it on the dedicated cart route.
  4. Added regression coverage for KHEMET product-page menu, search, and empty-cart interactions.
- **Files Modified**:
  - `frontend/src/storefront/StorefrontShell.tsx`
  - `frontend/src/storefront/components/CartDrawer.tsx`
  - `frontend/src/storefront/__tests__/khemetHeaderInteractions.test.tsx`

### [FIX] KHEMET Sale Page Promo Skeleton Caused Layout Shift
- **Date**: 2026-04-29
- **Description**: the live Flora KHEMET `/sale` page could report intermittent CLS spikes while lazy sections loaded, even though the final page was visually compact.
- **Root Cause**:
  1. `promo-strip` reused the generic lazy section fallback.
  2. That fallback reserved a large content block before the real promo strip loaded.
  3. When the compact promo strip replaced the oversized placeholder, the hero and product sections jumped upward.
- **Resolution**:
  1. Added a compact promo-strip skeleton matching the real ribbon height and structure.
  2. Kept the existing larger skeletons for hero, product grid, and newsletter sections.
  3. Added regression coverage for the promo-strip skeleton height.
- **Files Modified**:
  - `frontend/src/storefront/engine/PageComposer.tsx`
  - `frontend/src/storefront/__tests__/pageComposer.test.tsx`

### [FIX] KHEMET Sale Empty State Still Shifted After Products Loaded
- **Date**: 2026-04-29
- **Description**: after the promo skeleton was fixed, Flora's KHEMET `/sale` page still had a smaller CLS event when the sale product query returned zero products and the empty-state block replaced the loading skeleton.
- **Root Cause**:
  1. The KHEMET sale loading state did not reserve the final heading and empty-state text positions.
  2. When the zero-product response arrived, the heading, empty icon, message, and CTA appeared in visible viewport space.
- **Resolution**:
  1. The KHEMET sale loading branch now renders the final empty-state layout invisibly to reserve exact space.
  2. A non-layout skeleton overlay indicates loading while the reserved layout remains stable.
  3. The final empty-state card and CTA classes are shared with the loading branch.
- **Files Modified**:
  - `frontend/src/storefront/sections/ProductGrid.tsx`

### [FIX] KHEMET PDP Reviews Lazy Fallback Could Disappear In Viewport
- **Date**: 2026-04-29
- **Description**: Flora's KHEMET product page could produce an intermittent CLS spike when the lazy `reviews` section fallback appeared near the bottom of the viewport and then disappeared because the current product had no rendered reviews block.
- **Root Cause**:
  1. The shared lazy section fallback used a visible generic block for `reviews`.
  2. On PDPs without a rendered review section, the fallback itself became the only visible content and then collapsed.
- **Resolution**:
  1. Reviews now use a non-visible lazy fallback instead of reserving a large temporary block.
  2. The skeleton class helper records reviews as `min-h-0`.
  3. Added regression coverage for the reviews fallback class.
- **Files Modified**:
  - `frontend/src/storefront/engine/PageComposer.tsx`
  - `frontend/src/storefront/__tests__/pageComposer.test.tsx`

### [FIX] KHEMET Mobile Category Filter Skeleton Shifted Product Grid
- **Date**: 2026-04-29
- **Description**: Flora's KHEMET mobile category pages could show high CLS while the shop sidebar filter loaded, especially on `/shop?category=sneakers`.
- **Root Cause**:
  1. The mobile `filters-sidebar` fallback reused a tall generic section skeleton.
  2. The real mobile filter bar is only a compact one-line control.
  3. When the real filter replaced the tall placeholder, the product grid jumped upward.
- **Resolution**:
  1. `filters-sidebar` now uses a compact mobile skeleton that matches the real filter bar height.
  2. Desktop still reserves a taller sidebar placeholder.
  3. Added regression coverage for the compact filter skeleton class.
- **Files Modified**:
  - `frontend/src/storefront/engine/PageComposer.tsx`
  - `frontend/src/storefront/__tests__/pageComposer.test.tsx`

### [FIX] Storefront Color Display Option Missed Plural/Imported Color Attributes
- **Date**: 2026-05-03
- **Description**: selecting the product display option for color circles could still fail to show all storefront colors as real color swatches when the product attribute was named with plural Arabic labels such as `الألوان` / `الالوان`, English `colors`, or when imported variant metadata stored attributes as arrays like `{ name: "ألوان", option: "بيج" }`.
- **Root Cause**:
  1. Admin display settings, public product normalization, and the storefront `VariantSelector` only canonicalized narrow color names such as `color` and `اللون`.
  2. Public product routes did not parse array-shaped variant attribute metadata, so some imported color values were missing before the PDP rendered.
  3. A follow-up visual review on the real public storefront path found the active PDP theme could crash in `gear-loadout` because `fallbackPdpQuickOrderInBuyFlow` was referenced without being defined, preventing the page from reaching the color swatches at all.
- **Resolution**:
  1. Expanded canonical color/size aliases across product display settings, public product routes, product normalization helpers, storefront variant parsing, and bought-together color detection.
  2. Added support for array-shaped imported variant metadata in backend and frontend variant attribute normalization.
  3. Added regression coverage proving plural Arabic color attributes render all options as color swatches.
  4. Restored the missing fallback quick-order slot for `gear-loadout` PDP layouts.
  5. Guarded the personalization reset effect from returning new empty state on every render, removing the repeat render warning seen during manual review.
- **Files Modified**:
  - `backend/routes/publicProductsRoutes.js`
  - `backend/utils/productNormalizationUtils.js`
  - `backend/tests/utils/productNormalizationUtils.test.js`
  - `frontend/src/pages/products/utils/variantSettings.ts`
  - `frontend/src/pages/products/utils/variantSettings.test.ts`
  - `frontend/src/storefront/components/VariantSelector.tsx`
  - `frontend/src/storefront/utils/variants.ts`
  - `frontend/src/storefront/__tests__/variantSelector.test.tsx`
  - `frontend/src/storefront/sections/ProductInfo.tsx`
  - `frontend/src/storefront/__tests__/productInfoGearLoadout.test.tsx`
### [FIX] Storefront Product Cards Were Missing Images Because Upload Files Were Not on Disk (2026-06-28)
- **Description**: The Swan public storefront (`swan.maxp.online/shop`) showed product cards without images. Only 8 of ~210 local `/uploads/products/...` URLs referenced by active products existed on the server disk.
- **Root Cause**:
  1. The production deploy workflow excludes `backend/uploads` from the packaged artifact to avoid overwriting user uploads, but the source uploads were never restored to `/var/www/backend2/uploads/` for Swan/Wofod/Alpha/Sola companies.
  2. `sanitizePublicAssetUrl()` in `routes/publicProductsRoutes.js` filtered out any local upload URL whose file was missing, so the public products API returned `mainImage: null` and `images: []`.
  3. The storefront `StorefrontProductImage` component has no fallback UI when no image candidates are returned, so cards rendered with no media.
- **Fix**:
  1. Restored all available local upload files from the dev workspace (`apps/backend/uploads`) to `/var/www/backend2/uploads/` using `rsync --ignore-existing`.
  2. Updated `sanitizePublicAssetUrl()` to fall back to `/placeholders/product-image.svg` for missing local uploads instead of returning `null`, preserving the product card layout until the original files are restored.
- **Impact**: Swan and other storefronts now display product placeholder images for missing uploads instead of blank cards. Original missing files (202 URLs across multiple companies) still need to be sourced from a backup or re-uploaded.
- **Files Modified**:
  - `apps/backend/routes/publicProductsRoutes.js`

### [FIX] Storefront ReferenceError: resolveStorefrontPageLayout is not defined (2026-09-02)
- **Description**: Public storefront crashed with `ReferenceError: resolveStorefrontPageLayout is not defined` at `StorefrontLayout` during route rendering.
- **Root Cause**: `StorefrontShell.tsx` was re-exporting `resolveStorefrontPageLayout` and `StorefrontSectionFrame` using direct export syntax `export { resolveStorefrontPageLayout, StorefrontSectionFrame } from './layout/StorefrontSectionFrame'`, which did not create a local lexical binding in `StorefrontShell.tsx` scope.
- **Resolution**: Explicitly imported `resolveStorefrontPageLayout` and `StorefrontSectionFrame` in `StorefrontShell.tsx` before exporting, and updated unit test assertions in `storefrontRuntimeImports.test.ts`.
- **Files Modified**:
  - `apps/frontend/src/storefront/StorefrontShell.tsx`
  - `apps/frontend/src/storefront/__tests__/storefrontRuntimeImports.test.ts`

### [FIX] Storefront PDP Quick-Order Form Ignored After-Description Placement (2026-09-03)
- **Description**: In Store Settings -> Checkout tab (`/settings/store?tab=checkout`), selecting form placement "بعد الوصف" (after-description) and mode "كتلة مستقلة" (standalone) failed to render the checkout form after the product description on PDP pages like `https://swan.maxp.online/product/kotshy-soan-eskotsh`.
- **Root Cause**:
  1. In `apps/frontend/src/storefront/sections/ProductInfo.tsx`, `pdpQuickOrderSurfaceMode` evaluated `embeddedPdpCheckoutSettings?.surfaceMode === 'merged-buybox'` before checking `hasStoredPdpQuickOrderSettings`, permanently locking the surface mode into `merged-buybox` whenever theme defaults or stale page overrides contained merged-buybox.
  2. Because `pdpQuickOrderSurfaceMode` was forced to `merged-buybox`, `shouldMergeInlinePdpQuickOrderIntoBuyBox` remained `true`, causing `inlinePdpQuickOrderAfterDescription` to evaluate to `null` and rendering the form above the description inside the top BuyBox.
  3. In `apps/frontend/src/pages/settings/StoreSettings.tsx`, saving quick order settings updated `designTokens.pdpQuickOrder` without syncing matching `pdp-checkout` sections inside `designTokens.pageOverrides.pdp.sections`.
- **Resolution**:
  1. Updated `pdpQuickOrderSurfaceMode` in `ProductInfo.tsx` to prioritize user-configured `hasStoredPdpQuickOrderSettings` first before falling back to theme defaults.
  2. Added a placement guard to `shouldMergeInlinePdpQuickOrderIntoBuyBox` so that `after-description` placement never merges into the top BuyBox.
  3. Included `inlinePdpQuickOrderAfterDescription` in `hasElessiLowerDetails` to guarantee the lower details section renders when an after-description form exists.
  4. Updated `applyPdpQuickOrderSettingsToStorefrontSettings` in `StoreSettings.tsx` to synchronize `pdp-checkout` sections inside `pageOverrides.pdp.sections`.
- **Files Modified**:
  - `apps/frontend/src/storefront/sections/ProductInfo.tsx`
  - `apps/frontend/src/pages/settings/StoreSettings.tsx`
  - `apps/backend/docs/storefront/bugs.md`



