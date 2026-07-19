# PC Hub EG Storefront Template Plan

## Brief Snapshot

- Working template ID: `pc-hub-eg`
- Audience: Egyptian shoppers buying laptops, ready desktop builds, monitors, and accessories with strong sensitivity to price clarity, spec clarity, warranty, and shipping trust.
- Main jobs:
  - understand the right device category fast
  - compare configs without reading long PDP copy
  - trust warranty / shipping / installment before committing
  - complete the setup with logical accessories in the same flow
- Tone:
  - direct
  - technical
  - practical
  - current
  - sales-led
- Primary conversion goal: move the visitor toward category entry, best sellers, or a strong PDP with minimal hesitation and stronger comparison cues.

## Objective Strategy

- primary objective:
  - `Sales-led`
- secondary objective:
  - build trust through clarity of specs, logistics, and support rather than through long storytelling
- first-visit outcome:
  - the user should reach a category or product family quickly and feel the store is easy to compare inside
- what must not dominate:
  - cyber/gaming-only styling
  - long brand philosophy
  - oversized decorative hero behavior
- success lens:
  - faster route to `shop / category / product`
  - visible price/spec hierarchy
  - clear warranty and shipping messaging

## Benchmark Scan

- reference scan:
  - `pc-hub-eg-current-benchmark-scan-2026-04-25.md`
- current signals:
  - category routing early
  - spec-first product naming
  - price/discount/delivery cues close to the product
  - accessory cross-sell tied to use-case
  - controlled information density
- stale signals:
  - cyber-only dark visual language
  - fluffy hero copy
  - fake device imagery
  - generic product cards
- no-go patterns:
  - category ambiguity
  - weak spec framing
  - noisy add-ons with no compatibility story

## External Design Skill Reference

- selected external design skill:
  - `TypeUI professional`
- usage mode:
  - `selective adoption`
- what we adopt:
  - denser retail hierarchy
  - stronger CTA ownership
  - spec/comparison-first visual rhythm
  - yellow/graphite retail energy as a signal, not as rigid branding
- what we reject:
  - literal copy of the original visual identity
  - over-aggressive black/yellow everywhere
  - English-first tone
  - any assumption that the skill decides page architecture on its own
- protocol guardrail:
  - the skill acts as a design layer only; page structure, commerce logic, and trust flow remain protocol-driven

## Theme Foundation

- scene sentence:
  - مستخدم يفتح المتجر من موبايله أو لابتوبه لأنه يريد جهازًا أو شاشة أو إكسسوارًا الآن، ويحتاج أن يرى المسار المناسب والسعر والمواصفة والضمان بسرعة بدون فوضى.
- palette:
  - warm light background
  - graphite / ink for structure
  - signal yellow for action and retail emphasis
  - controlled blue accent for tech cues
- type:
  - Arabic sans واضحة وقوية
  - heading heavier وأكثر حضورًا
  - body مختصرة وسريعة القراءة
- layout logic:
  - dense but controlled
  - retail-first
  - comparison-aware
- differentiation:
  - more practical and broader than `tech-cyber`
  - less dark/gaming than `cyber-gear`
  - more current and clearer than the older `electronics-demo`

## Mobile Experience Strategy

- mode:
  - `hybrid`
- search / command behavior:
  - command bar واضحة من أول الـ shop page
  - filters and sorting serve comparison, not visual decoration
- hero behavior on mobile:
  - hero must still route quickly to the right category
  - density stays but spacing remains readable
- PDP behavior on mobile:
  - product gallery, specs, trust, and setup add-ons stay close enough to feel like one decision system
- footer / lower chrome behavior:
  - compact footer
  - no fake app shell
- risks:
  - too much density can make the theme look cheap
  - too much style can make it lose the professional retail utility we want

## Variant Strategy

- families in scope:
  - `hero-banner`
  - `featured-collections`
  - `offer-bento`
  - `product-grid`
  - `product-info`
  - `trust surfaces`
  - `shop-command-bar`
- decision per family:
  - `hero-banner` = `New`
  - `featured-collections` = `Extend`
  - `offer-bento` = `Extend`
  - `product-grid` = `Extend`
  - `product-info` = `Extend`
  - `trust surfaces` = `Extend`
  - `shop-command-bar` = `Extend`
- why:
  - the hero needed a dedicated retail-command layout for computer retail density
  - existing product/shop/PDP systems already fit if tuned with the right variants
- reuse risks:
  - generic tech reuse tends to drift toward dark gaming or bland electronics
- extend notes:
  - reuse engine, change hierarchy and composition
- new variants needed:
  - `HeroBanner / retail-command`

## Capability Matrix

- must-have capabilities:
  - fast category entry
  - price-first comparison
  - visible config choices
  - clear warranty / shipping cues
  - logical accessory cross-sell
  - monitors + desktops + laptop routing
  - compact trust messaging
  - marketplace preview realism
- mapped sections / behaviors:
  - hero -> route the user by need
  - featured collections -> laptops / ready builds / monitors / accessories
  - offer bento -> ready purchase lanes
  - product grid -> denser comparison on shop
  - specs grid -> technical clarity on PDP
  - trust surfaces -> delivery / low stock / badges / viewer counter
  - bought together -> setup completion logic
- missing capabilities:
  - none accepted for the core launch path
- tradeoffs:
  - long-form brand storytelling stays intentionally light
  - the theme favors clarity over spectacle

## Sample Data Strategy

- chosen pack:
  - new dedicated dataset `pc-hub-eg`
- why:
  - the theme needs real computer-retail categories, configs, and accessory relationships
- pack direction:
  - laptops
  - ready desktop builds
  - monitors
  - accessories
- realism rules:
  - real-device photos only
  - no fake renders as commerce-critical imagery

## Image Realism Gate

- photo source policy:
  - `Approved real-photo URLs`
- where realism is mandatory:
  - hero device imagery
  - collection visuals
  - product grid
  - PDP gallery
  - bought-together cards
- where stylization is allowed:
  - preview card illustration
  - background gradients and grid textures
- realism risks:
  - mixing too many gaming-only shots with work/study messaging
  - reusing generic desk images that do not feel product-specific enough

## Build

- registration:
  - complete
- metadata:
  - complete
- preview assets:
  - complete
- sections:
  - complete for `home / shop / collections / pdp / cart / checkout / sale / shipping / returns / warranty`
  - homepage refit applied against external benchmark language from `https://professional-henna.vercel.app/#`
- variants:
  - `HeroBanner / retail-command` complete
  - `HeroBanner / soft-showcase` complete
  - `FeaturedCollections / tech-decision-lanes` complete
  - `FeaturedCollections / catalog-pills` complete
  - `OfferBento / bundle-matrix` complete
  - `ShopCommandBar / spec-console` complete
  - `FeaturesBar / system-assurance` complete
  - `ProductInfo / command-specs` complete
  - `ProductGrid / retail-air-grid` complete
- preview dataset:
  - complete with products, variants, recommendations, reviews, cart seed, and order seed

## Integration Reality

- `npx typeui.sh pull professional` was executed again during implementation review
- the command still returned successfully but did not materialize a local `SKILL.md` or any reusable artifact inside the repo
- therefore the final implementation standard for `pc-hub-eg` was:
  - do not pretend the skill was integrated if no artifact exists
  - express the intended `professional` direction through explicit new storefront variants and theme wiring instead
  - keep the protocol as the source of truth

## External Benchmark Adaptation

- homepage visual refit used `https://professional-henna.vercel.app/#` as a benchmark for:
  - light retail shell
  - circular product hero stage
  - soft category pills
  - airy product cards with wishlist + quick add rhythm
  - dark utility footer
- protocol ruling:
  - allowed as `style transfer` / benchmark adaptation
  - not allowed as literal clone of section order, architecture, or conversion flow
- implementation rule followed:
  - keep `pc-hub-eg` copy, categories, pricing logic, PDP flow, and trust framing specific to this theme
  - borrow the visual language, spacing, component feel, and shell polish only

## Verification & Tests

- validation scripts:
  - `npx tsx src/storefront/scripts/validate-themes.ts`
- focused tests:
  - `src/storefront/preview/__tests__/marketplaceSampleData.test.ts`
  - `src/storefront/preview/__tests__/marketplacePreviewOrder.test.ts`
  - `src/storefront/__tests__/themeCatalog.test.ts`
  - `src/storefront/__tests__/variantRegistry.test.ts`
- status:
  - `validate-themes.ts` passed with `pc-hub-eg`
  - focused tests passed
  - repository-wide `tsc --noEmit` still reports many unrelated pre-existing errors outside the new theme scope

## QA

- home:
  - pass
- shop:
  - pass
- pdp:
  - pass
- cart:
  - pass
- checkout:
  - pass
- mobile home:
  - pass
- mobile shop:
  - pass
- mobile pdp:
  - pass
- desktop homepage refit:
  - pass
- mobile homepage refit:
  - pass
- preview dataset:
  - pass
- RTL:
  - pass
- currentness:
  - pass

## Final Gate

- test coverage / validation status:
  - pass
- objective fit:
  - pass
- capability coverage:
  - pass
- external skill use:
  - pass
- image realism:
  - pass
- anti-stale:
  - pass
- final verdict:
  - `approved`

## Homepage Polish Pass

- continued after live in-app browser review on the marketplace preview URL:
  - reduced preview chrome noise for `pc-hub-eg` by replacing the generic preview banner with a compact floating control
  - disabled the `conversion-suite` free-shipping top bar for `pc-hub-eg` marketplace preview so the homepage stays visually closer to the selected benchmark
  - tightened mobile behavior:
    - `retail-air-grid` now renders as a 2-column shelf on small screens
    - `retail-air` product cards use smaller mobile spacing and typography
    - `catalog-pills` now scroll horizontally on mobile instead of breaking the rhythm with stacked wrapping
- rationale:
  - these changes improve benchmark fidelity at the preview layer without cloning the source page architecture or changing `pc-hub-eg` commerce flow
- verification:
  - in-app browser DOM check passed
  - in-app browser mobile screenshots confirmed:
    - compact preview controls
    - no free-shipping strip above the homepage
    - 2-column product shelf on mobile
  - `npx tsx src/storefront/scripts/validate-themes.ts` passed
  - `npx vitest run src/storefront/__tests__/marketplaceApps.test.ts src/storefront/__tests__/variantRegistry.test.ts src/storefront/__tests__/storefrontPreview.test.tsx` passed

## Homepage Tightening Pass

- compared the current `pc-hub-eg` homepage against the selected benchmark again and tightened the biggest remaining gaps without cloning structure:
  - added a visible mobile search lane under the compact `pc-hub-eg` mobile header
  - compacted `HeroBanner / soft-showcase` by reducing vertical padding, glow spread, stage size, and long-form copy weight
  - switched `FeaturedCollections / catalog-pills` into direct-pill mode for `pc-hub-eg` by hiding the heavy section header
  - simplified `ProductGrid / retail-air-grid` heading by removing the long subtitle and result counter for this theme
- outcome:
  - first fold is faster
  - merchandising rhythm is closer to the benchmark
  - the homepage still keeps `pc-hub-eg` identity and protocol-safe section logic
- verification:
  - in-app browser DOM review confirmed:
    - mobile search lane present
    - pills now render directly after the hero
    - recommendation shelf no longer shows the previous subtitle / result counter
  - `npx tsx src/storefront/scripts/validate-themes.ts` passed
  - `npx vitest run src/storefront/__tests__/storefrontPreview.test.tsx src/storefront/__tests__/marketplaceApps.test.ts src/storefront/__tests__/variantRegistry.test.ts` passed

## Studio Image Unification Pass

- unified `pc-hub-eg` preview imagery to close the remaining gap with the benchmark's cleaner product rendering:
  - replaced the old `Unsplash`-based `PC_HUB_GALLERIES` entries with generated `PC HUB` studio-style SVG product renders inside `marketplaceSampleData.ts`
  - added a local hero asset at `/assets/themes/pc-hub-eg/hero-stage.svg` and wired both hero images in `pc-hub-eg.json` to that shared art direction
  - tuned the primary studio shot so the first gallery image reads better inside the compact `retail-air` cards
- important storefront fix discovered during the pass:
  - `data:image/...` candidates were being rewritten by `getImageUrl(...)` as if they were relative paths
  - this caused `retail-air` cards to fall back to text placeholders instead of rendering the new SVG product images
  - fixed `src/utils/imageUrl.ts` so `data:` and `blob:` image URLs are preserved as-is
  - updated `src/utils/__tests__/imageUrl.test.ts` to cover the preserved data URL path and to match the current direct-https behavior
- verification:
  - in-app browser DOM snapshot now shows real product `img` nodes for the `pc-hub-eg` recommendation shelf instead of fallback-only cards
  - in-app browser mobile screenshots confirmed:
    - the new local hero art is active
    - product cards now render the studio illustrations
  - `npx tsx src/storefront/scripts/validate-themes.ts` passed
  - `npx vitest run src/storefront/__tests__/marketplaceSampleData.test.ts src/storefront/__tests__/storefrontPreview.test.tsx` passed
  - `npx jest --config jest.config.cjs src/utils/__tests__/imageUrl.test.ts --runInBand` passed

## Real Photography + Copy Cleanup Pass

- replaced the synthetic `pc-hub-eg` illustration system with local photographic assets under `frontend/public/assets/themes/pc-hub-eg/`:
  - added real photos for the hero, laptops, desktop setup, monitor, keyboard, mouse, and dock
  - rewired `pc-hub-eg.json` hero media to `/assets/themes/pc-hub-eg/hero-photo.jpg` and `/assets/themes/pc-hub-eg/workbook-14-air.jpg`
  - rewired `PC_HUB_GALLERIES` in `marketplaceSampleData.ts` to those local photo assets so the shelf, shop grid, and PDP gallery all use consistent photographic previews
- removed the old illustration-only asset from the theme flow:
  - deleted `frontend/public/assets/themes/pc-hub-eg/hero-stage.svg`
- cleaned the Arabic copy across the theme and preview dataset:
  - revised the homepage hero copy and shop toolbar copy
  - rewrote `pc-hub-eg` product descriptions so they read like a natural Egyptian Arabic electronics storefront instead of placeholder phrasing
  - corrected remaining PDP wording in `ProductInfo.tsx`, including:
    - `المواصفات أولًا` instead of the old English badge
    - `اسأل عن المنتج` instead of the previous awkward phrasing
- runtime note:
  - after the icon import fix, the in-app preview still held a stale runtime state from the old `CircleHelp` import
  - restarted the `vite` dev server on port `3001` and rechecked the storefront in the in-app browser
- verification:
  - in-app browser review confirmed:
    - homepage hero renders real photographic imagery
    - shop page renders real product photos and Arabic sticky copy `أدوات التصفح`
    - PDP gallery renders the real laptop photography and the new Arabic badge `المواصفات أولًا`
  - `npx tsx src/storefront/scripts/validate-themes.ts` passed
  - `npx vitest run src/storefront/__tests__/marketplaceSampleData.test.ts src/storefront/__tests__/storefrontPreview.test.tsx src/storefront/preview/__tests__/marketplacePreviewOrder.test.ts` passed

## PDP Decision Quality Pass

- continued on the live `workbook-14-air` product page after the user asked to keep going from the open PDP:
  - upgraded `ProductInfo / command-specs` for `pc-hub-eg` so the buy surface feels more like a real decision layer than a generic spec card
  - added a `pc-hub`-specific command header with:
    - cleaner product title presentation
    - `موديل 2024`
    - review count context
    - selected configuration summary when a variant is active
  - added decision chips under the intro copy such as:
    - `مناسب لـ ...`
    - `يناسب أيضًا ...`
  - added a cleaner price support row with approximate installment framing and savings when compare-price exists
- upgraded the preview data itself so the PDP no longer falls back to an empty specs state:
  - added first-party `specs` arrays for the full `pc-hub-eg` catalog
  - added `tags` / use-case cues for the same products so the PDP can frame who the product is best for
  - localized visible variant labels and attribute values where the user actually sees them, especially colors and switch types
  - localized the remaining English review entries in the `pc-hub-eg` review dataset
  - updated preview cart seed attributes to match the new Arabic color labels
- outcome:
  - the `workbook-14-air` PDP now shows real technical specs instead of `لا توجد مواصفات تقنية...`
  - the top buy surface reads more naturally in Arabic
  - visible configuration language is more consistent with the rest of the theme
- verification:
  - in-app browser DOM check confirmed:
    - `المواصفات أولًا`
    - `موديل 2024`
    - use-case chips under the hero copy
    - actual specs such as `Intel Core Ultra 5`, `14 بوصة FHD+ IPS`, `حتى 14 ساعة`
    - Arabic color selection values such as `فضي`
    - localized Arabic review content
  - `npx tsx src/storefront/scripts/validate-themes.ts` passed
  - `npx vitest run src/storefront/__tests__/marketplaceSampleData.test.ts src/storefront/preview/__tests__/marketplacePreviewOrder.test.ts src/storefront/__tests__/storefrontPreview.test.tsx` passed

## Product-Specific PDP Differentiation Pass

- extended the `pc-hub-eg` PDP work so `creator-pro-16` and `battlebox-r7` no longer read like the same page with a different title:
  - added first-party `modelLabel`, `decisionBadge`, `decisionTitle`, `decisionDescription`, and `commandFacts` fields to the `PC_HUB_PRODUCT_ENRICHMENTS` preview dataset
  - wired those fields into `ProductInfo / command-specs` so the hero badge, decision headline, short intro, and quick-facts strip all adapt per product
  - replaced the generic `موديل 2024` chip inside the `pc-hub` PDP header with each product's own label such as:
    - `Creator Series 16`
    - `Gaming Build 2024`
- strengthened the social proof layer for the desktop build path:
  - added dedicated `battlebox-r7` review fixtures in the `pc-hub-eg` preview review dataset
  - kept the existing creator reviews and confirmed they still render alongside the new decision surface
- runtime verification note:
  - the in-app browser was initially stuck on a stale loading/error state from an older `vite` process mix on port `3001`
  - restarted `vite` cleanly as a single direct `node vite.js --host 0.0.0.0 --port 3001` process before final QA
  - found one more preview-state issue after QA: the mini-cart still showed old English color labels from an older persisted preview cart
  - fixed `MarketplacePreviewCartBootstrap` in `StorefrontShell.tsx` to re-seed preview carts once per dataset version instead of only when the cart was empty
- verification:
  - `npx tsx src/storefront/scripts/validate-themes.ts` passed
  - `npx vitest run src/storefront/__tests__/marketplaceSampleData.test.ts src/storefront/preview/__tests__/marketplacePreviewOrder.test.ts src/storefront/__tests__/storefrontPreview.test.tsx` passed
  - in-app browser verification after the clean restart confirmed:
    - `creator-pro-16` shows `محطة عمل للمبدعين`, `جاهز للمشاريع الثقيلة من أول نظرة`, `Creator Series 16`, and its creator-specific reviews
    - `battlebox-r7` shows `تجميعة جاهزة للأداء`, `جاهزة للعب والشغل الثقيل من أول يوم`, `Gaming Build 2024`, and its new battlebox-specific reviews
    - preview cart copy now shows `اللون: فضي` and `اللون: جرافيت` instead of stale `Silver / Graphite`

## Creator / Gaming PDP Enrichment Pass

- pushed the `pc-hub-eg` PDP from basic differentiation into a more product-aware sales surface:
  - added `decisionProofs` arrays to the `PC_HUB_PRODUCT_ENRICHMENTS` dataset for:
    - `workbook-14-air`
    - `creator-pro-16`
    - `battlebox-r7`
  - rendered those proof cards inside `ProductInfo / command-specs` as a dedicated strip between the top decision framing and the main `SpecsGrid`
  - outcome:
    - `creator-pro-16` now highlights why it fits design / montage workflows
    - `battlebox-r7` now highlights why it is easier and safer than piecing together parts manually
- extended the same product-awareness to the sections below the buy surface:
  - `BoughtTogetherSection` now reads product-level `bundleTitle` / `bundleSubtitle` for `pc-hub-eg`
  - `ConversionStack` now reads product-level `trustedBadgeTitle` / `trustedBadgeSubtitle` / `trustedBadgeItems` for `pc-hub-eg`
  - this made sections like:
    - `ابنِ استوديو الشغل`
    - `كمّل محطة اللعب`
    - `لشغل التسليمات بثقة`
    - `لتجميعة تشتغل من أول يوم`
    show up naturally instead of generic bundle / reassurance copy
- verification:
  - `npx tsx src/storefront/scripts/validate-themes.ts` passed
  - `npx vitest run src/storefront/__tests__/BoughtTogetherSection.test.tsx src/storefront/__tests__/ConversionStack.test.tsx src/storefront/__tests__/storefrontPreview.test.tsx src/storefront/__tests__/marketplaceSampleData.test.ts` passed
  - in-app browser verification confirmed:
    - `creator-pro-16` renders the new proof-card copy:
      - `Timeline أوسع للشغل`
      - `جاهز للرندر الطويل`
      - `يكبر مع المشروع`
    - `creator-pro-16` also renders:
      - `ابنِ استوديو الشغل`
      - `لشغل التسليمات بثقة`
    - `battlebox-r7` renders:
      - `لا تحتاج تجميع قطع`
      - `لعب وبث وشغل ثقيل`
      - `يبقى قابل للتوسعة`
      - `كمّل محطة اللعب`
      - `لتجميعة تشتغل من أول يوم`

## Cart + Checkout Assurance Pass

- extended `pc-hub-eg` beyond home and PDP into the closing conversion steps:
  - added `command-cart` to `CartItems`
  - added `command-summary` to `OrderSummary`
  - added `command-checkout` to `CheckoutForm`
  - added `command-payment` to `PaymentSection`
- outcome:
  - cart now reads like a protected electronics review station instead of a generic basket
  - checkout now explains what happens before and after confirmation with clearer reassurance for higher-value hardware orders
  - payment methods now feel framed for device orders rather than generic low-risk ecommerce
- theme wiring:
  - updated `pc-hub-eg.json` cart and checkout pages to use the new variants and electronics-specific copy
  - updated `sections/manifest.ts` and `variants/registry.ts` so the new variants are valid and discoverable in the storefront system
  - adjusted `checkoutForm.test.tsx` to render within router + theme providers and kept the label semantics stable by tying the notes field label to `notesTitle`
- browser verification:
  - cart preview now visibly renders:
    - `محطة المراجعة الأخيرة`
    - `سلة التجهيز`
    - `تغليف محمي`
    - `حجز المخزون والمراجعة محفوظ لك لمدة`
    - `تم تفعيل الشحن المحمي`
  - checkout preview now visibly renders:
    - `إتمام آمن`
    - `3 خطوات واضحة من البيانات حتى اعتماد الطلب.`
    - `قبل ما تؤكد`
    - `مراجعة أخيرة`
  - checkout still shows the preview-injected cart review section above the form flow, but the new command-form / command-payment / final-review blocks are present lower on the same page
- verification:
  - `npx tsx src/storefront/scripts/validate-themes.ts` passed
  - `npx vitest run src/storefront/__tests__/checkoutForm.test.tsx src/storefront/__tests__/variantRegistry.test.ts src/storefront/__tests__/storefrontPreview.test.tsx src/storefront/preview/__tests__/marketplacePreviewOrder.test.ts src/storefront/__tests__/marketplaceSampleData.test.ts` passed

## Shop / PLP Command Rack Pass

- upgraded `pc-hub-eg` shop page from a stacked utility list into a true `commerce-3col` layout:
  - added `shop-promo-rail` to the page config so the layout now renders as filter rail + merch grid + support rail on desktop
  - switched `shop-command-bar` to the new `decision-deck` variant
  - switched `product-grid` to the new `spec-rack` variant
- implementation details:
  - `decision-deck` in `ShopCommandBar.tsx` now shows:
    - current category
    - live result count
    - current sort mode
    - decision readiness state
  - `spec-rack` in `ProductGrid.tsx` now uses lighter retail-air cards inside an electronics-specific rack frame with:
    - clearer Arabic shelf framing
    - faster comparison language
    - active browsing state chips above the grid
  - `pc-hub-eg.json` now includes a right-side promo rail with electronics-specific reassurance about:
    - warranty clarity
    - protected shipping
    - installment / payment flexibility
    - completing the setup from the same browsing session
  - refined copy so leftover English labels were removed from the page (`رف المقارنة`, `مكتبك أو منصة اللعب`, `تقييم`)
- verification:
  - `node node_modules/tsx/dist/cli.mjs src/storefront/scripts/validate-themes.ts`
  - `npx vitest run src/storefront/__tests__/variantRegistry.test.ts src/storefront/__tests__/storefrontPreview.test.tsx src/storefront/__tests__/themeCatalog.test.ts`
  - in-app browser verification confirmed live shop-page markers:
    - `غرفة القرار`
    - `جاهزية القرار`
    - `رف المقارنة`
    - `الأقرب لاحتياجك الآن`
    - right-side rail with `معلومات تريحك أثناء التصفح`

## Filters Sidebar Recovery + Polish

- continued the `pc-hub-eg` shop pass by giving `filters-sidebar` its own electronics-specific presentation instead of leaving it as a generic filter rail
- `FiltersSidebar.tsx` now supports optional, theme-driven copy controls used by `pc-hub-eg`:
  - `badge`
  - `title`
  - `subtitle`
  - `showSort`
  - `showCategories`
  - `showPriceFilter`
  - `clearButtonText`
  - `showMobileLabel`
  - `hideMobileLabel`
- `pc-hub-eg.json` now uses those settings to render:
  - `تصفية أدق`
  - `صفِّ النتائج بهدوء`
  - `اختصر الطريق: اختر القسم أو الميزانية هنا، واترك المقارنة السريعة للرف الرئيسي.`
  - `ارجع للوضع الافتراضي`
- recovered and normalized broken preview data/test files that were blocking live verification:
  - repaired `marketplaceSampleData.ts` by re-merging `cutline-club` + `closet-os` data into the newer preview dataset base that already contained `women-fashion-eg` + `pc-hub-eg`
  - repaired `marketplacePreviewOrder.ts`
  - repaired `marketplacePreviewCart.ts`
  - rebuilt `preview/__tests__/marketplacePreviewOrder.test.ts` into a clean merged file
  - corrected `HeroBanner.tsx` helper imports so preview rendering no longer failed during `storefrontPreview`
- verification:
  - `node node_modules/tsx/dist/cli.mjs src/storefront/scripts/validate-themes.ts` passed
  - `npx vitest run src/storefront/preview/__tests__/marketplacePreviewOrder.test.ts src/storefront/__tests__/storefrontPreview.test.tsx src/storefront/__tests__/marketplaceSampleData.test.ts src/storefront/__tests__/marketplaceApps.test.ts src/storefront/__tests__/variantRegistry.test.ts` passed
  - in-app browser verification on `http://localhost:3001/store/shop?companyId=company123&previewTheme=pc-hub-eg&previewSource=marketplace` confirmed:
    - `غرفة القرار`
    - `تصفية أدق`
    - `صفِّ النتائج بهدوء`
    - `اختصر الطريق`
    - `ارجع للوضع الافتراضي`
    - `رف المقارنة`

## Mobile Filter Drawer + Rail Tightening

- continued the `pc-hub-eg` shop pass with a mobile-first polish round instead of stopping at the recovered desktop sidebar
- `FiltersSidebar.tsx` now gives `pc-hub-eg` a more intentional mobile filter drawer:
  - command-style toggle card on mobile with current category / budget / sort summary
  - dedicated drawer title and subtitle
  - summary chips for category / price / sort inside the drawer header
  - sticky bottom action row with:
    - `ابدأ من جديد`
    - `اعرض المنتجات`
- moved these mobile strings into `pc-hub-eg.json`, so the mobile experience is now part of the theme definition itself
- extended the `filters-sidebar` manifest fields to support:
  - `mobileTitle`
  - `mobileSubtitle`
  - `mobileApplyText`
  - `mobileResetText`
- tightened `ShopPromoRail.tsx` for `pc-hub-eg` so the right rail now shares the same ink / warm-metal / soft-card language as the filter rail
- verification:
  - `npx vitest run src/storefront/__tests__/storefrontPreview.test.tsx src/storefront/__tests__/marketplaceApps.test.ts src/storefront/__tests__/variantRegistry.test.ts` passed
  - `node node_modules/tsx/dist/cli.mjs src/storefront/scripts/validate-themes.ts` passed
  - `npx vitest run src/storefront/__tests__/variantRegistry.test.ts` passed after the manifest update
  - live browser verification confirmed desktop shop markers still render:
    - `صفِّ النتائج بهدوء`
    - `القسم الحالي`
    - `حالة الفرز`
    - `معلومات تريحك أثناء التصفح`
    - `باقة الأسبوع`

## PDP Gallery Command Stage

- continued the `pc-hub-eg` pass by replacing the generic PDP gallery with a product-aware gallery variant instead of leaving the visual decision work only to `ProductInfo`
- added a new `ProductGallery` variant: `command-stage`
  - large image stage with `decisionBadge` + `modelLabel`
  - overlay title/description pulled from the current product (`decisionTitle`, `decisionDescription`)
  - side proof cards fed from `decisionProofs`
  - fact rail below the stage fed from `commandFacts`
  - richer thumbnail rail with image-state copy instead of plain squares
  - shared zoom dialog support
- wired `pc-hub-eg.json` PDP to use `command-stage`
- updated:
  - `ProductGallery.tsx`
  - `manifest.ts`
  - `variants/registry.ts`
- refreshed `variantRegistry.test.ts` to match the already-implemented `gift-pairings` registry entry in `BoughtTogetherSection`
- verification:
  - `npx tsx src/storefront/scripts/validate-themes.ts` from `frontend/`
  - `node ./node_modules/vitest/vitest.mjs run src/storefront/__tests__/variantRegistry.test.ts src/storefront/__tests__/storefrontPreview.test.tsx src/storefront/__tests__/themeCatalog.test.ts` from `frontend/`
  - headless visual verification on:
    - `http://localhost:3001/store/product/creator-pro-16?companyId=company123&previewTheme=pc-hub-eg&previewSource=marketplace`
  - confirmed live copy markers inside the rendered PDP:
    - `جاهز للمشاريع الثقيلة من أول نظرة`
    - `Creator Series 16`
    - `Timeline أوسع للشغل`
    - `RTX 4050 أو 4060`

## PDP Related + Reviews Proof Pass

- continued the `pc-hub-eg` PDP pass by upgrading the lower half of the product page instead of leaving `related-products` and `reviews` on generic compact variants
- added `RelatedProducts / command-alternatives`
  - uses `bundleTitle` and `bundleSubtitle` from the active product when available
  - surfaces quick `commandFacts` chips in the section header
  - adds per-card micro badges (`decisionBadge`, `modelLabel`, quick facts) before the actual product card
  - maps to `ProductCard / retail-air` so the alternatives shelf stays aligned with the electronics card language
- added `ReviewsSection / command-proof`
  - frames ratings beside trust copy from the active product (`trustedBadgeTitle`, `trustedBadgeSubtitle`, `trustedBadgeItems`)
  - upgrades review cards into proof-style tiles with a stronger top accent and clearer "real usage" framing
  - keeps the rating breakdown visible while adding post-purchase reassurance instead of a plain review wall
- updated `pc-hub-eg.json` to use:
  - `related-products: command-alternatives`
  - `reviews: command-proof`
- also fixed a pre-existing preview blocker in `PostPurchaseUpsellBlock.tsx` where `prefersArabicCopy` was referenced without being defined
- verification:
  - `npx tsx src/storefront/scripts/validate-themes.ts` from `frontend/`
  - `node ./node_modules/vitest/vitest.mjs run src/storefront/__tests__/storefrontPreview.test.tsx src/storefront/__tests__/variantRegistry.test.ts src/storefront/__tests__/themeCatalog.test.ts src/storefront/__tests__/marketplaceSampleData.test.ts`
  - headless PDP verification on:
    - `http://localhost:3001/store/product/creator-pro-16?companyId=company123&previewTheme=pc-hub-eg&previewSource=marketplace`
  - visual confirmation of:
    - `ابنِ استوديو الشغل`
    - `ثقة ما بعد الشراء`
    - `لشغل التسليمات بثقة`

## Thank-You Command Pass

- completed the post-purchase journey for `pc-hub-eg` instead of leaving the thank-you page on generic storefront defaults
- added a dedicated `thank-you` page config to `pc-hub-eg.json` with electronics-specific copy:
  - `تم تسجيل طلبك وجارٍ مراجعته`
  - `تابع حالة التجهيز`
  - `أعد نفس التجهيزة بسرعة`
  - `إضافات تكمل الطلب`
- upgraded `OrderConfirmation.tsx` with a `pc-hub-eg` theme-aware visual branch:
  - warm-metal / ink background treatment
  - stronger confirmation crest and darker status pill
  - richer summary, recap, tracking, and reorder cards
  - tailored button treatments for `تابع تصفح الأجهزة` and WhatsApp support
- upgraded `PostPurchaseUpsellBlock.tsx` for `pc-hub-eg`:
  - warmer merchandising shell
  - decision-led chips from product metadata (`decisionBadge`, `modelLabel`, `commandFacts`)
  - more electronics-appropriate CTA language such as `راجع الخيارات`
  - image stage shifted to `object-contain` to suit devices and accessories better
- verification:
  - `node node_modules/tsx/dist/cli.mjs src/storefront/scripts/validate-themes.ts`
  - `node ./node_modules/vitest/vitest.mjs run src/storefront/__tests__/storefrontPreview.test.tsx src/storefront/__tests__/themeCatalog.test.ts src/storefront/__tests__/marketplaceSampleData.test.ts src/storefront/preview/__tests__/marketplacePreviewOrder.test.ts`
  - headless desktop verification on:
    - `http://localhost:3001/store/thank-you?companyId=company123&orderId=PCH-2048&previewTheme=pc-hub-eg&previewSource=marketplace`
  - confirmed visible copy markers:
    - `تم تسجيل طلبك وجارٍ مراجعته`
    - `تابع حالة التجهيز`
    - `إضافات تكمل الطلب`
    - `أعد نفس التجهيزة بسرعة`

## Thank-You Status States Pass

- extended `pc-hub-eg` thank-you from a single static success state into a status-aware flow
- `OrderConfirmation.tsx` now resolves order state dynamically for:
  - `PENDING`
  - `CONFIRMED`
  - `PROCESSING`
  - `SHIPPED`
  - `DELIVERED`
  - `CANCELLED`
- for `pc-hub-eg`, the page now changes:
  - hero title and supporting description
  - status pill color and wording
  - `OrderStepTimeline` current step and labels
  - a new spotlight panel that explains what is happening now and what the next expected move is
  - the tracked-order block summary when preview or tracked data exists
- `OrderStepTimeline.tsx` was tightened visually for `pc-hub-eg` to make the progress rail feel more intentional and compatible with the ink/gold system
- `marketplacePreviewOrder.ts` now supports `previewOrderStatus` in the query string so the preview can simulate shipped / delivered / cancelled states without changing stored preview orders
- tests added/updated:
  - preview utility test confirms `previewOrderStatus=SHIPPED` for `pc-hub-eg`
  - storefront preview test confirms shipped-state copy appears in the rendered thank-you page
- verification:
  - `node node_modules/tsx/dist/cli.mjs src/storefront/scripts/validate-themes.ts`
  - `node ./node_modules/vitest/vitest.mjs run src/storefront/__tests__/storefrontPreview.test.tsx src/storefront/preview/__tests__/marketplacePreviewOrder.test.ts src/storefront/__tests__/themeCatalog.test.ts src/storefront/__tests__/marketplaceSampleData.test.ts`
  - headless desktop verification passed on:
    - `...previewOrderStatus=SHIPPED`
    - `...previewOrderStatus=DELIVERED`
  - headless mobile verification passed on:
    - `...previewOrderStatus=DELIVERED`
