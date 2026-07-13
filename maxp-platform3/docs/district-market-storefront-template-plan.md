# District Market Storefront Template Plan

## Brief Snapshot

- Audience: Arabic-first general retail shoppers who want a one-stop store for home routines, light organization, and everyday add-to-cart purchases.
- Main jobs:
  - find something useful quickly
  - compare a few practical options without overload
  - trust shipping, delivery, and returns before committing
- Tone:
  - organized
  - practical
  - current
  - not luxurious-for-the-sake-of-it
- Primary conversion goal: move the visitor from homepage scanning to category entry and early cart-building with less hesitation.

## Direction

- Arabic-first general storefront for broad retail.
- Feels faster, denser, and more organized than a generic marketplace template.
- Avoids the old pattern of stacking promo strips before the user understands the core offer.
- Keeps trust, shipping, and value cues visible without turning the top of the page into noise.

## Decisions Locked

- `hero-banner` comes before `promo-strip` on the homepage.
- `district-market` now has a dedicated `split-panel` hero treatment in `HeroBanner.tsx`.
- Homepage structure now favors:
  - hero
  - shopping intents
  - featured collections
  - offer clusters
  - promo strip
  - featured products
  - feature clarity rail
  - newsletter
- `featured-collections` uses `fast-nav-grid` for a more structured lane-based browsing feel.
- `offer-bento` uses `campaign-stack` so the page feels like a live retail surface, not a static catalog.
- `features-bar` was pushed lower and switched to `delivery-clarity` styling so reassurance supports the flow instead of blocking it.

## Visual Language

- Warm retail palette with burnt orange as the primary action color.
- Teal accent used as a balancing signal for clarity and trust.
- Cream-first surfaces instead of flat white to avoid sterile marketplace visuals.
- Grid and panel layering in the hero to create an urban, organized, current storefront feel.

## Validation Notes

- Live preview after the update shows the hero immediately after the preview/conversion stack instead of the old promo-first sequence.
- The rest of the homepage sections still resolve in the updated order for the same preview route.

## Protocol Status

- Reference audit: `district-market-protocol-audit-2026-04-24.md`
- Reference benchmark scan: `district-market-current-benchmark-scan-2026-04-24.md`
- Current state:
  - registration: done
  - preview assets: done
  - validation: done
  - live QA: done
  - brief snapshot: done
  - benchmark scan: done
  - anti-stale gate before design: failed historically, now documented
  - sample data strategy: done in code and documented in `storefront-sample-data-packs-ar.md`
  - mobile qa: done
  - rtl qa: done
  - final design gate: approved

## Sample Data Strategy

- `district-market` now uses the `general-store` preview pack documented in `storefront-sample-data-packs-ar.md`.
- The marketplace preview dataset is registered directly inside `frontend/src/storefront/preview/marketplaceSampleData.ts`.
- The current mix is intentional:
  - daily essentials
  - home and kitchen organization
  - travel and out-of-home items
  - seasonal atmosphere products

## Correction Pass

- A later visual review exposed a `box-in-box` problem in the first `district-market` hero pass.
- The hero was simplified to an `open composition`:
  - fewer bordered containers
  - shorter, sharper copy
  - less mixed Arabic/English UI wording
  - lighter mobile hierarchy with the support metrics hidden on small screens
- This correction is now the preferred direction for `district-market`, and future polish should continue reducing card noise in the middle of the page too.

## Benchmark Consequences

- The next pass must shift the middle homepage sections closer to `lane merchandising` than `card stacking`.
- Service confidence should stay near the top flow, inspired by Carrefour and IKEA, but without turning into a second promo strip.
- The page should become denser in useful wayfinding, not denser in decorative containers.

## Benchmark-Driven Pass 1

- `ShoppingIntents.tsx`
  - added a compact service-confidence strip near the top flow
  - reduced chip clutter for `district-market`
  - moved the section toward lane-style routing instead of decorative card stacking
- `FeaturedCollections.tsx`
  - `district-market` now renders its `fast-nav-grid` as clearer aisle-style entries
  - removed the old image-overlay-plus-footer feeling for this theme
  - made the call-to-action closer to merchandising language than gallery language
- `district-market.json`
  - updated the collections copy to stay Arabic-first and stop using `lane` wording

هذا pass لا تعني أن القالب دخل `Final Design Gate` بعد، لكنها أول pass ملتزمة فعليًا بنتائج الـ benchmark scan.

## Mobile / RTL QA Pass

- Live mobile preview on `maxp.localhost:3001` exposed two real blockers:
  - marketplace preview chrome was crowding the first viewport before the hero
  - preview product cards still used visually mismatched imagery that made the theme feel less current than it actually is
- The corrective pass locked three changes:
  - `district-market` marketplace preview now suppresses the extra countdown / popup noise that was hiding the theme's actual top-flow
  - homepage `featured-products` moved from `standard` to `compact` so mobile browsing feels denser and less like a long stack of oversized cards
  - preview product imagery now comes from theme-owned local assets under `public/assets/themes/district-market/products/` instead of unrelated remote photos
- A later realism correction replaced the flat placeholder `SVG` pack with a local photorealistic `WEBP` product pack for:
  - storage set
  - drawer organizer
  - laundry basket
  - desk lamp
  - travel cubes
  - thermal bottle
  - serving tray
  - aroma diffuser
- Result:
  - hero starts earlier inside the mobile preview
  - product cards now read as actual merchandise instead of a mismatched sample-data layer
  - RTL copy is now consistent for the theme name itself: `ديستركت ماركت`

هذا pass رفعت القالب بوضوح، لكنها ما زالت تعامل `Final Design Gate` كحالة `in review` حتى يظل القرار النهائي مبنيًا على مراجعة واعية، لا على زخم التنفيذ فقط.

## Benchmark-Driven Pass 2

- `FeaturedCollections.tsx`
  - `district-market` no longer renders `featured-collections` as repeated oversized card shells
  - the section now behaves like one organized retail surface with lighter dividers and smaller image anchors
  - the mobile reading order feels closer to `aisles / paths` than gallery cards
- `OfferBento.tsx`
  - `district-market` now uses one unified offer surface instead of three independent promo boxes
  - the lead offer reads like a primary retail lane, while the secondary rows support it without repeating the same bordered-card composition
  - signal chips were reduced into simpler lines so the section carries merchandising weight without falling back into `box-in-box`
- `ShoppingIntents.tsx`
  - `district-market` now treats service confidence and route selection as one organized surface instead of a strip plus four separate cards
  - the section now behaves like retail routing with internal dividers and lighter labels instead of repeated floating card shells
  - examples were reduced from noisy chip logic into simpler decision cues closer to practical merchandising copy

هذا pass أقفل جزءًا مهمًا من مشكلة `المربعات داخل المربعات` في منتصف الصفحة، ثم أُغلقت `Final Design Gate` بعد مراجعة حيّة أخيرة ضد `No-Go Patterns`.

## Final Design Gate

- تمت مراجعة القالب حيًا على المعاينة بعد آخر pass، مع التركيز على:
  - hero hierarchy
  - shopping-intents
  - featured-collections
  - offer-bento
- النتيجة:
  - لا `box-in-box` ثقيلة في الوسط
  - لا repeated section cards بنفس الـ composition القديمة
  - المسارات الوسطى تقرأ كتصفح retail واضح، لا gallery أو template grid
  - القالب يحتفظ بهوية عربية عملية وحديثة بدل الإحساس الـ boutique أو الـ marketplace الفوضوي
- القرار: `district-market` أصبحت `approved` كقالب reference ضمن هذا النظام.

## Shop Sales Pass

- الصفحة كانت تقول نفس الرسالة أكثر من مرة:
  - hero
  - shop command bar
  - filters sidebar
  - shopping intents
- تم تحويل صفحة `shop` إلى surface أقرب للبيع المباشر:
  - تقليل hero في `shop` مع copy أقصر وأكثر بيعية
  - إزالة العبارات الهجينة مثل `lane`, `clusters`, `scan`
  - ضغط `shop-command-bar` إلى أدوات شراء مباشرة بدل عنوان + شرح مكرر
  - إخفاء category chips على desktop عندما تكون sidebar موجودة حتى لا تتكرر نفس taxonomy مرتين
  - تحويل `product-grid` إلى `compact` داخل `shop` لرفع كثافة التصفح خاصة على الموبايل
  - حذف `shopping-intents` و`newsletter` من صفحة `shop` لأنهما كانا يسحبان الانتباه بعد الشبكة بدل دعم الإضافة للسلة
  - الإبقاء على `shop-promo-rail` فقط كمساحة ثقة قريبة من المنتجات
  - إيقاف `mobile bottom nav` على `district-market / shop` حتى لا يغطي أول viewport ويزاحم CTA والمنتجات

النتيجة المقصودة من هذا pass:

- وصول أسرع إلى الشبكة
- قرار أسهل داخل الكروت
- تقليل الضوضاء والتكرار
- رفع أولوية `search -> filter -> product -> add to cart`

### Shop Follow-Up Simplification

- تم تبسيط صفحة `shop` أكثر بعد مراجعة مباشرة للهدف البيعي:
  - حذف `hero` من صفحة `shop` بالكامل
  - حذف `shop-promo-rail` والعمود المقابل له حتى لا يبقى أي بلوك ثقة منفصل يقطع مسار الشراء
  - نقل البحث من `shop-command-bar` إلى `filters-sidebar` نفسها
  - تحويل الصفحة إلى layout من عمودين فقط: `product grid + right filters`
- الهدف من هذا follow-up:
  - أن يبدأ العميل من المنتجات فورًا
  - أن تصبح كل أدوات التصفية والبحث في مكان واحد
  - أن تختفي أي مقدمة أو side content لا يرفع احتمالية الإضافة للسلة مباشرة

## Preview Commerce Data Pass

- Browser QA across the main `district-market` marketplace routes exposed one remaining PDP-only preview bug:
  - `VolumeDiscountBadge` was still requesting `/api/v1/public/products/:slug/volume-discounts`
  - the route returned `404` in marketplace preview because the page was already backed by local preview products, not the live catalog API
- The fix is now locked in two parts:
  - `VolumeDiscountBadge.tsx` first resolves marketplace preview products locally before attempting any public API fetch
  - `district-market` preview products now include seeded `volumeDiscounts` tiers for core retail items so the PDP keeps its conversion block without fake network errors
- Result:
  - the product page no longer throws a preview-only `404`
  - `checkout` and `thank-you` continued to pass when re-verified in isolated browser runs
  - the preview pack now covers product imagery, reviews, cart, order, and bulk-pricing signals as one coherent commerce dataset

## Homepage Image Upgrade Pass

- After the product-card realism pass, the homepage still had weaker supporting imagery:
  - the `hero` visual
  - the four `featured-collections` lane images
  - the `features-bar` side image
- The issue was no longer product photography itself, but the surrounding homepage scaffolding still relying on flat illustrative `SVG` assets that made the page feel more like a preview than a live storefront.
- This pass replaced those homepage assets with a coherent local `WEBP` pack:
  - `hero-scene.webp`
  - `lane-essentials.webp`
  - `lane-home.webp`
  - `lane-deals.webp`
  - `lane-new.webp`
  - `feature-clarity.webp`
- Wiring changes:
  - `district-market.json` now points homepage and collections imagery to the new `WEBP` assets
  - `features-bar` now uses a tighter cropped lifestyle product image instead of reusing the old flat lane illustration
- Result:
  - the first viewport feels more premium and believable
  - collection lanes now read like real retail entry points instead of placeholder art
  - the closing trust section now lands with a real image instead of lowering the perceived quality of the page

## Homepage Image Presentation Pass

- A second visual pass focused on how the new images are framed inside the homepage, not only on which files are used.
- The real remaining issue was presentation:
  - `featured-collections` thumbnails were still too small relative to the text block
  - compact product cards still made some product photos feel flatter than they should
  - the bottom `features-bar` image was too dark and too close to the same visual family as the hero
- Code adjustments:
  - `FeaturedCollections.tsx`
    - widened the image column for `district-market`
    - gave lane images a stronger framed surface so they read as retail tiles, not tiny side thumbnails
  - `ProductCard.tsx`
    - added a warmer staged image well for the `district-market` compact cards
    - lifted the visual contrast between product photography and card chrome
  - `FeaturesBar.tsx`
    - added a lighter `district-market` image treatment with clearer image visibility
    - tuned the support cards around the image to match the upgraded photo quality
  - `district-market.json`
    - switched the bottom reassurance image to `lane-home.webp` to avoid repeating the hero feel
- Result:
  - images now carry more of the page's perceived quality instead of sitting behind the layout
  - the homepage reads more like a finished storefront and less like a theme preview with pasted assets

## Shop + Collections Continuity Pass

- After the homepage upgrade, the first-click pages still dropped in quality:
  - `shop` felt like a generic catalog with a thin sidebar and too much dead white space around the grid
  - `collections` still relied on a wrapped card layout that looked more like leftover blocks than clear retail lanes
- This pass tightened the continuity between homepage and catalog surfaces:
  - `FiltersSidebar.tsx`
    - added a warmer, more merchandised `district-market` filter shell
    - grouped search, sort, category, and price controls into clearer filter cards
    - made the desktop filter rail feel more deliberate instead of a bare form column
  - `ProductGrid.tsx`
    - added a `district-market` header treatment for `shop` and `collections`
    - tuned the `shop` compact grid to use fewer columns inside the sidebar layout so product images stay readable
    - wrapped the product area in a softer framed surface so the catalog feels composed, not dropped onto a blank page
  - `district-market.json`
    - switched the `collections` page category rail to the dedicated `fast-nav-grid` variant
    - moved the `collections` product section from `list-card` to `compact`
    - added explicit subtitles so the catalog headers explain the browsing model more clearly
- Result:
  - `shop` now reads like a merchandised shelf with a real filter rail, not just a product dump
  - `collections` now feels like a category-entry page first, then a visual product shelf second
  - the quality level after the first click now stays much closer to the homepage

## Homepage Order Optimization Pass

- A dedicated review of the homepage order showed that the issue was not image quality anymore, but mid-page sequencing:
  - `shopping-intents` and `featured-collections` were both explaining the browsing model before the page had shown enough actual products
  - `promo-strip` repeated the same "offers + trust" message already covered by `offer-bento`
  - the first real product shelf appeared too late relative to the amount of explanation above it
- Implemented order changes in `district-market.json`:
  - kept `hero-banner` first
  - kept `shopping-intents` second
  - moved `featured-products` up so products appear immediately after the first intent layer
  - moved `featured-collections` below the shelf so category expansion happens after a concrete product impression
  - kept `offer-bento` after those core browsing blocks
  - removed homepage `promo-strip` entirely because it was adding repetition more than conversion value
- Copy adjustments were also made so the new sequence reads intentionally:
  - `featured-products` now explicitly frames itself as the first clear shelf
  - `featured-collections` now reads as the expansion layer after the initial product view
  - `offer-bento` now positions itself as a later trust-and-offer layer instead of a competing early message
- Result:
  - the homepage reaches products faster
  - the middle of the page feels less repetitive
  - the persuasion flow now reads more like `orient -> choose path -> see products -> expand -> reassure`

## Offer Bento Upgrade Pass

- After the homepage reorder, the `offer-bento` block still felt weaker than the surrounding sections:
  - the copy was more generic than the rest of the page
  - the layout depended too heavily on text, leaving visible empty space
  - the section said "offers + trust" but did not visually distinguish those arguments well enough
- This pass upgraded both structure and copy:
  - `OfferBento.tsx`
    - added dedicated `district-market` imagery mapping for offer, demand, and trust cards
    - turned the lead card into a split content + image composition
    - gave the supporting cards thumbnail visuals and clearer signal chips
    - added short caption overlays so each card lands with a single memorable promise, not only a paragraph
  - `district-market.json`
    - rewrote the section into a clearer three-part persuasion model:
      - price clarity
      - demand proof
      - trust before checkout
    - updated the section title and card labels so the block reads more like a conversion layer than a generic promo stack
- Result:
  - the section now feels visually complete relative to the rest of the homepage
  - the customer can scan the three decision triggers faster
  - the block supports action more convincingly instead of reading like an explanatory detour

## Featured Products Visibility Fix

- A final homepage review showed that two cards inside the `featured-products` shelf were not technically broken, but visually too faint at card scale:
  - `drawer-organizer`
  - `travel-cubes`
- The issue was simple:
  - both source images were valid and loaded correctly
  - but their composition was too loose for the homepage card crop, making them read as "missing" at a glance
- Fix implemented:
  - created tighter cropped derivatives:
    - `drawer-organizer-card.webp`
    - `travel-cubes-card.webp`
  - rewired the corresponding `district-market` preview products in `marketplaceSampleData.ts` to use those clearer card-focused versions
- Result:
  - the featured shelf now reads as visually complete
  - the two weak cards no longer collapse into pale empty-looking slots
  - the homepage product row keeps its realism without needing to remove those products from the assortment
