# Storefront Theme Audit - 2026-04-27

## Scope

- audit source: live preset registry, not folder counting
- audited count: **65 themes**
- correction: the live registry resolves to **65** themes, so the earlier manual count of **62** was incomplete

## Method

This is a **structure-first audit**, not a pixel-perfect screenshot diff.

I scored each theme from the live registry using:

- category and subcategory metadata
- header/footer variants
- color tokens and typography pairs
- page layout hints and page goals
- section composition across `home`, `shop`, `pdp`, `cart`, and `checkout`
- presence of sales surfaces like hero, promo, offer, filters, conversion stack, cart summary, checkout, and thank-you upsell

### Reading the numbers

- **Similarity %**: closest structural neighbor in the current library
- **Sell**: how strongly the template is built to convert
- **Usability**: how easy the core browse-to-checkout flow looks structurally
- **Style**: how distinct and polished the theme language appears from tokens, variants, and composition

### Important caveat

- similarity here means **design-system and page-structure similarity**, not image-by-image visual diff
- a high sell score means the template is wired for conversion mechanics, not that every copy/image choice is already perfect

## Execution Update - Commerce Flow Separation (2026-04-27)

- the first implementation pass focused on the highest-duplication surfaces instead of adding more marketplace themes
- the new runtime layer now separates `cart`, `checkout`, and `thank-you` by **commerce flow family** while preserving theme-owned page definitions and explicit handcrafted overrides

### New flow families

- `market`: warmer, retail-oriented cart/checkout/aftercare rhythm for general-store and food-style themes
- `nature`: softer, calmer flow for organic, botanical, and craft-adjacent themes
- `command`: sharper operational flow for electronics, tools, auto, sport, and digital-product themes
- `boutique`: softer premium flow for fashion/luxury themes that still need stronger end-of-funnel separation
- `playful`: more energetic cart/checkout rhythm for `kids-play`
- `soft aftercare`: thank-you-only softer follow-up for the women/fashion trust pass themes

### New section variants added

- `cart-items`: `market-basket`, `nature-cart`
- `order-summary`: `market-summary`, `nature-summary`
- `checkout-form`: `market-checkout`, `nature-checkout`
- `payment`: `market-payment`, `nature-payment`
- `order-confirmation`: `market-aftercare`, `nature-aftercare`, `command-aftercare`

### Why this matters

- the library was already relatively rich on top-of-funnel surfaces like `hero` and `product-grid`
- the most repetitive layer was the end of the commerce journey, where many themes were still converging into the same cart/checkout/thank-you grammar
- this pass moves the system toward **family-level page separation** instead of theme-count inflation

### Verification snapshot

- `frontend: npx vitest run src/storefront/__tests__/variantRegistry.test.ts src/storefront/__tests__/themeExperienceOverrides.test.ts src/storefront/__tests__/themeGeneratedPages.test.ts`
- `frontend: npm run validate:themes`

### Practical next step

- before shipping more marketplace presets, keep expanding the end-of-funnel library with more `cart`, `checkout`, `payment`, and `aftercare` archetypes
- after that, run a second separation pass on the highest-risk pairs from this audit, especially the pharmacy, boutique, and fashion-adjacent clusters

## Execution Update - PDP Family Separation (2026-04-27)

- the second implementation pass focused on `pdp`, because that was the next highest-duplication surface after `cart`, `checkout`, and `thank-you`
- the runtime now also separates product pages by **PDP family**, again without cloning full page JSON for every preset and without overriding handcrafted theme pages blindly

### New PDP families in use

- `market`: denser retail decision flow for general store, grocery, furniture, and food-adjacent themes
- `nature`: calmer gallery/info rhythm for organic, botanical, pet, and handmade-adjacent themes
- `command`: more technical product storytelling for electronics, tools, parts, fitness, and digital catalog themes
- `boutique`: more editorial product framing for fashion and premium apparel themes
- `playful`: lighter product-page adjustments for `kids-play`

### What the runtime changes on PDP

- `product-gallery`
- `product-info`
- `conversion-stack`
- `bought-together`
- `related-products`
- `reviews`

### Safety rule used in the PDP pass

- the override layer only patches section types that already exist on the theme's authored `pdp`
- this keeps the pass focused on separation and avoids silently inserting new PDP modules into presets that intentionally omit them

### Verification snapshot

- `frontend: npx vitest run src/storefront/__tests__/variantRegistry.test.ts src/storefront/__tests__/themeExperienceOverrides.test.ts src/storefront/__tests__/themeGeneratedPages.test.ts`
- result: **33 tests passed**
- `frontend: npm run validate:themes`
- validation also required a manifest compatibility correction so `journal-strip` is allowed on `collections`, matching the existing `atelier-nova` preset usage

### Practical next step

- now that late-funnel and PDP separation both exist, the next pass should target the highest-risk near-duplicate pairs that still share the same broader fashion or pharmacy grammar
- best candidates remain `max-care-go` vs `pharmacy-demo`, `closet-os` vs `cutline-club`, and `style-store-eg` vs `vela-fashion-eg`

## Execution Update - Alias Theme Separation (2026-04-27)

- the third pass uncovered a more structural duplication issue: some marketplace theme ids were not real presets at runtime and silently fell back to `modern-minimal`
- this especially affected `pharmacy-demo`, `cutline-club`, and `style-store-eg`, which meant their pages could only look different if we patched them manually after the fallback already happened

### What changed

- the three aliases are now registered as real storefront presets with their own brand/header/footer/seo identity
- `pharmacy-demo` now resolves as a pharmacy-care experience instead of inheriting a fashion storefront baseline
- `cutline-club` now resolves as a sharper streetwear/storefront experience instead of a generic boutique fallback
- `style-store-eg` now resolves as an accessory-led catalog with its own shop and PDP language instead of repeating the same boutique grammar

### Runtime effect

- `pharmacy-demo`: calmer care-led `home/shop/pdp/checkout/thank-you`
- `cutline-club`: streetwear-oriented `home/shop/pdp/checkout/thank-you`
- `style-store-eg`: accessory/stylist-led `home/shop/pdp/checkout/thank-you`

### Verification snapshot

- `frontend: npm run validate:themes`
- result: **58 storefront presets validated**
- `frontend: npx vitest run src/storefront/__tests__/themeExperienceOverrides.test.ts`
- `frontend: npx vitest run src/storefront/preview/__tests__/marketplaceSampleData.test.ts`
- `frontend: npx vitest run src/storefront/__tests__/variantRegistry.test.ts src/storefront/__tests__/themeGeneratedPages.test.ts src/storefront/__tests__/themeCatalog.test.ts src/storefront/__tests__/themeExperienceOverrides.test.ts`

## Execution Update - Unknown Theme Placeholder (2026-04-27)

- the last hidden duplication leak was the global silent fallback path itself: any unknown storefront `themeId` still resolved to `modern-minimal`
- that made registry mistakes hard to spot because the storefront kept rendering a plausible but incorrect baseline instead of exposing the configuration problem

### What changed

- `extractStorefrontThemePresetId()` now preserves the first explicit non-empty requested id instead of skipping unknown ids and auto-selecting the default preset
- `getStorefrontThemePreset()` now returns a valid diagnostic placeholder theme when the id is missing from the preset registry
- the placeholder keeps the requested id, carries an explicit warning shell/copy, and still validates as a full storefront theme across `home`, `shop`, `pdp`, `cart`, and `checkout`

### Runtime effect

- no more silent runtime conversion of unknown ids into `modern-minimal`
- alias and typo mistakes are now visible immediately during preview/testing
- storefront rendering stays alive, but the UI now tells us to register the preset or fix the id instead of hiding the issue

### Verification snapshot

- `frontend: npx vitest run src/storefront/__tests__/themeResolver.test.ts`
- result: **15 tests passed**
- `frontend: npx vitest run src/storefront/__tests__/variantRegistry.test.ts src/storefront/__tests__/themeGeneratedPages.test.ts src/storefront/__tests__/themeCatalog.test.ts src/storefront/__tests__/themeExperienceOverrides.test.ts`
- result: **64 tests passed**
- `frontend: npm run validate:themes`
- result: **58 storefront presets validated**

## Headline Findings

### Highest duplication risk

1. `pharmacy-demo` + `max-care-go` = **91.8%**
2. `cutline-club` + `closet-os` = **86.3%**
3. `style-store-eg` + `vela-fashion-eg` = **83.9%**
4. `modern-minimal` + `closet-os` = **80.1%**
5. `women-fashion-eg` + `rose-boutique-eg` = **79.8%**
6. `modern-minimal` + `cutline-club` = **79.6%**
7. `modern-minimal` + `cairo-stride` = **79%**
8. `elegant-luxe` + `atelier-nova` = **76.2%**

### Strongest templates for selling

1. `kids-play` — 95/100 بيع، 93/100 استخدام، 82/100 ستايل
2. `shop-orbit` — 95/100 بيع، 93/100 استخدام، 82/100 ستايل
3. `nile-bistro` — 95/100 بيع، 93/100 استخدام، 80/100 ستايل
4. `cairo-stride` — 95/100 بيع، 93/100 استخدام، 77/100 ستايل
5. `nova-mobile` — 95/100 بيع، 93/100 استخدام، 73/100 ستايل
6. `modern-minimal` — 95/100 بيع، 93/100 استخدام، 70/100 ستايل
7. `closet-os` — 95/100 بيع، 93/100 استخدام، 69/100 ستايل
8. `cutline-club` — 95/100 بيع، 93/100 استخدام، 68/100 ستايل

### Weakest templates for selling

1. `intruder-nft` — 53/100 بيع، 59/100 استخدام، 79/100 ستايل
2. `tech-cyber` — 54/100 بيع، 67/100 استخدام، 74/100 ستايل
3. `green-haven` — 56/100 بيع، 65/100 استخدام، 68/100 ستايل
4. `baby-cloud` — 56/100 بيع، 65/100 استخدام، 73/100 ستايل
5. `spice-route` — 56/100 بيع، 65/100 استخدام، 73/100 ستايل
6. `elessi-classic` — 56/100 بيع، 67/100 استخدام، 63/100 ستايل
7. `cyber-gear` — 56/100 بيع، 67/100 استخدام، 70/100 ستايل
8. `aura-chic` — 64/100 بيع، 67/100 استخدام، 65/100 ستايل

### Strongest templates for style

1. `men-shoes-eg` — 90/100 ستايل، أقرب شبه 63.5% مع `women-fashion-eg`
2. `airlume-ai` — 89/100 ستايل، أقرب شبه 58.6% مع `solea-femme`
3. `perfume-eg` — 89/100 ستايل، أقرب شبه 62.2% مع `elessi-glow-routine`
4. `elessi-signal-deck` — 87/100 ستايل، أقرب شبه 64.5% مع `elessi-pedal-lab`
5. `hayah-modest-eg` — 86/100 ستايل، أقرب شبه 73.7% مع `layali-edit-eg`
6. `layali-edit-eg` — 86/100 ستايل، أقرب شبه 73.7% مع `hayah-modest-eg`
7. `rihla-resort-eg` — 86/100 ستايل، أقرب شبه 73.2% مع `layali-edit-eg`
8. `legacy-default-old` — 86/100 ستايل، أقرب شبه 57.3% مع `style-store-eg`

### Weakest templates for style separation

1. `elessi-classic` — 63/100 ستايل، أقرب شبه 70.4% مع `aura-chic`
2. `max-care-go` — 63/100 ستايل، أقرب شبه 91.8% مع `pharmacy-demo`
3. `pharmacy-demo` — 63/100 ستايل، أقرب شبه 91.8% مع `max-care-go`
4. `aura-chic` — 65/100 ستايل، أقرب شبه 75.4% مع `mystic-desert`
5. `mystic-desert` — 65/100 ستايل، أقرب شبه 75.4% مع `aura-chic`
6. `green-haven` — 68/100 ستايل، أقرب شبه 70.7% مع `baby-cloud`
7. `atelier-nova` — 68/100 ستايل، أقرب شبه 76.2% مع `elegant-luxe`
8. `cutline-club` — 68/100 ستايل، أقرب شبه 86.3% مع `closet-os`

## Audit Matrix

| Theme | المجال | التصنيف | أقرب شبه | Sell | Usability | Style | تقييم البيع | تقييم الاستخدام | تقييم الاستايل | حكم التشابه |
|---|---|---|---|---:|---:|---:|---|---|---|---|
| `modern-minimal` | أزياء | أحذية حريمي | 80.1% مع `closet-os` | 95 | 93 | 70 | قوي جدًا للبيع | سهل جدًا | مقبول وجيد | قريب بوضوح |
| `solea-femme` | أزياء | أحذية حريمي | 69.4% مع `mystic-desert` | 92 | 71 | 75 | قوي جدًا للبيع | جيد لكن يحتاج ضبط | مقبول وجيد | تشابه متوسط |
| `men-shoes-eg` | أزياء | أحذية رجالي | 63.5% مع `women-fashion-eg` | 95 | 91 | 90 | قوي جدًا للبيع | سهل جدًا | مميز جدًا | متميز نسبيًا |
| `cairo-stride` | أزياء | أحذية رجالي | 79% مع `modern-minimal` | 95 | 93 | 77 | قوي جدًا للبيع | سهل جدًا | مقبول وجيد | قريب بوضوح |
| `mystic-desert` | أزياء | أزياء تراثية | 75.4% مع `aura-chic` | 88 | 71 | 65 | قوي للبيع | جيد لكن يحتاج ضبط | عادي | قريب بوضوح |
| `elegant-luxe` | أزياء | أزياء فاخرة | 76.2% مع `atelier-nova` | 64 | 67 | 73 | متوسط | متوسط | مقبول وجيد | قريب بوضوح |
| `fakhama-elite` | أزياء | أزياء فاخرة | 69.3% مع `elegant-luxe` | 91 | 79 | 75 | قوي جدًا للبيع | سهل | مقبول وجيد | تشابه متوسط |
| `hayah-modest-eg` | أزياء | أزياء محتشمة | 73.7% مع `layali-edit-eg` | 95 | 91 | 86 | قوي جدًا للبيع | سهل جدًا | مميز | تشابه متوسط |
| `aura-chic` | أزياء | إكسسوارات | 75.4% مع `mystic-desert` | 64 | 67 | 65 | متوسط | متوسط | عادي | قريب بوضوح |
| `rose-boutique-eg` | أزياء | بوتيك حريمي | 79.8% مع `women-fashion-eg` | 93 | 93 | 84 | قوي جدًا للبيع | سهل جدًا | مميز | قريب بوضوح |
| `elessi-carry-lane` | أزياء | حقائب وإكسسوارات | 73.3% مع `elessi-harvest-fold` | 74 | 73 | 78 | متوسط جيد للبيع | جيد لكن يحتاج ضبط | مميز | تشابه متوسط |
| `closet-os` | أزياء | خزانة أسبوعية | 86.3% مع `cutline-club` | 95 | 93 | 69 | قوي جدًا للبيع | سهل جدًا | مقبول وجيد | نسخة قريبة جدًا |
| `legacy-default-old` | أزياء | ساعات وإكسسوارات | 57.3% مع `style-store-eg` | 78 | 85 | 86 | متوسط جيد للبيع | سهل | مميز | متميز نسبيًا |
| `layali-edit-eg` | أزياء | سهرة ومناسبات | 73.7% مع `hayah-modest-eg` | 95 | 91 | 86 | قوي جدًا للبيع | سهل جدًا | مميز | تشابه متوسط |
| `bold-fashion` | أزياء | متجر أزياء | 67% مع `elegant-luxe` | 74 | 79 | 72 | متوسط جيد للبيع | سهل | مقبول وجيد | تشابه متوسط |
| `elessi-classic` | أزياء | متجر أزياء | 70.4% مع `aura-chic` | 56 | 67 | 63 | أضعف من المطلوب | متوسط | عادي | تشابه متوسط |
| `vela-fashion-eg` | أزياء | متجر أزياء ناعم | 83.9% مع `style-store-eg` | 78 | 89 | 82 | متوسط جيد للبيع | سهل جدًا | مميز | قريب بوضوح |
| `cutline-club` | أزياء | ملابس جاهزة | 86.3% مع `closet-os` | 95 | 93 | 68 | قوي جدًا للبيع | سهل جدًا | مقبول وجيد | نسخة قريبة جدًا |
| `menswear-prime` | أزياء | ملابس رجالي | 66.3% مع `solea-femme` | 95 | 83 | 73 | قوي جدًا للبيع | سهل | مقبول وجيد | تشابه متوسط |
| `rihla-resort-eg` | أزياء | ملابس سفر ومصايف | 73.2% مع `layali-edit-eg` | 95 | 91 | 86 | قوي جدًا للبيع | سهل جدًا | مميز | تشابه متوسط |
| `atelier-nova` | أزياء | ملابس نسائية | 76.2% مع `elegant-luxe` | 64 | 67 | 68 | متوسط | متوسط | مقبول وجيد | قريب بوضوح |
| `women-fashion-eg` | أزياء | ملابس وأحذية حريمي | 79.8% مع `rose-boutique-eg` | 95 | 91 | 84 | قوي جدًا للبيع | سهل جدًا | مميز | قريب بوضوح |
| `style-store-eg` | أزياء | ملابس وأحذية وإكسسوارات | 83.9% مع `vela-fashion-eg` | 78 | 91 | 78 | متوسط جيد للبيع | سهل جدًا | مميز | قريب بوضوح |
| `kids-play` | أطفال | ألعاب أطفال | 66.7% مع `nova-mobile` | 95 | 93 | 82 | قوي جدًا للبيع | سهل جدًا | مميز | تشابه متوسط |
| `baby-cloud` | أطفال ورقائق | أطفال وألعاب | 70.7% مع `green-haven` | 56 | 65 | 73 | أضعف من المطلوب | متوسط | مقبول وجيد | تشابه متوسط |
| `elessi-signal-deck` | إلكترونيات | أجهزة وملحقات عمل | 64.5% مع `elessi-pedal-lab` | 74 | 73 | 87 | متوسط جيد للبيع | جيد لكن يحتاج ضبط | مميز | متميز نسبيًا |
| `pc-hub-eg` | إلكترونيات | كمبيوتر ولابتوب | 55.1% مع `cairo-stride` | 95 | 85 | 82 | قوي جدًا للبيع | سهل | مميز | متميز نسبيًا |
| `nova-mobile` | إلكترونيات | موبايلات | 66.7% مع `kids-play` | 95 | 93 | 73 | قوي جدًا للبيع | سهل جدًا | مقبول وجيد | تشابه متوسط |
| `electronics-demo` | إلكترونيات | متجر تقني فاخر | 65.1% مع `cafe-demo` | 81 | 77 | 72 | قوي للبيع | جيد لكن يحتاج ضبط | مقبول وجيد | تشابه متوسط |
| `tech-cyber` | إلكترونيات | متجر تقني | 62.2% مع `electronics-demo` | 54 | 67 | 74 | أضعف من المطلوب | متوسط | مقبول وجيد | متميز نسبيًا |
| `vanguard-premium` | عام | براند فاخر | 72.2% مع `aura-chic` | 64 | 67 | 69 | متوسط | متوسط | مقبول وجيد | تشابه متوسط |
| `max-care-go` | عام | صيدلية سريعة | 91.8% مع `pharmacy-demo` | 79 | 81 | 63 | متوسط جيد للبيع | سهل | عادي | نسخة قريبة جدًا |
| `pharmacy-demo` | عام | صيدلية وعناية | 91.8% مع `max-care-go` | 79 | 81 | 63 | متوسط جيد للبيع | سهل | عادي | نسخة قريبة جدًا |
| `district-market` | عام | متجر عام | 68.8% مع `smart-bazaar` | 95 | 83 | 81 | قوي جدًا للبيع | سهل | مميز | تشابه متوسط |
| `shop-orbit` | عام | متجر متعدد الأقسام | 67.8% مع `smart-bazaar` | 95 | 93 | 82 | قوي جدًا للبيع | سهل جدًا | مميز | تشابه متوسط |
| `smart-bazaar` | عام | متجر متعدد الأقسام | 68.8% مع `district-market` | 95 | 91 | 74 | قوي جدًا للبيع | سهل جدًا | مقبول وجيد | تشابه متوسط |
| `furniture-demo` | عام | مفروشات وديكور | 67.9% مع `cafe-demo` | 74 | 81 | 74 | متوسط جيد للبيع | سهل | مقبول وجيد | تشابه متوسط |
| `zen-organic` | عام | منتجات طبيعية | 68.5% مع `smart-bazaar` | 95 | 91 | 74 | قوي جدًا للبيع | سهل جدًا | مقبول وجيد | تشابه متوسط |
| `opulence` | فخامة | مجوهرات وساعات | 65.3% مع `crafted` | 85 | 79 | 79 | قوي للبيع | سهل | مميز | تشابه متوسط |
| `elessi-chrono-gallery` | فخامة | ساعات وإكسسوارات | 76.2% مع `elessi-gem-atelier` | 74 | 73 | 77 | متوسط جيد للبيع | جيد لكن يحتاج ضبط | مقبول وجيد | قريب بوضوح |
| `elessi-gem-atelier` | فخامة | مجوهرات وهدايا | 76.2% مع `elessi-chrono-gallery` | 74 | 73 | 76 | متوسط جيد للبيع | جيد لكن يحتاج ضبط | مقبول وجيد | قريب بوضوح |
| `ink-paper` | كتب وقرطاسية | مكتبة | 61.8% مع `crafted` | 86 | 79 | 78 | قوي للبيع | سهل | مميز | متميز نسبيًا |
| `nile-bistro` | مطاعم وأغذية | مطاعم | 71.7% مع `restaurant-demo` | 95 | 93 | 80 | قوي جدًا للبيع | سهل جدًا | مميز | تشابه متوسط |
| `cafe-demo` | مطاعم وأغذية | مطاعم وقهوة | 67.9% مع `furniture-demo` | 74 | 77 | 70 | متوسط جيد للبيع | جيد لكن يحتاج ضبط | مقبول وجيد | تشابه متوسط |
| `restaurant-demo` | مطاعم وأغذية | وجبات سريعة | 71.7% مع `nile-bistro` | 95 | 79 | 80 | قوي جدًا للبيع | سهل | مميز | تشابه متوسط |
| `green-haven` | نباتات وزراعة | المنزل والحديقة | 70.7% مع `baby-cloud` | 56 | 65 | 68 | أضعف من المطلوب | متوسط | مقبول وجيد | تشابه متوسط |
| `elessi-sprout-room` | نباتات وزراعة | نباتات وديكور | 76% مع `elessi-gem-atelier` | 74 | 73 | 77 | متوسط جيد للبيع | جيد لكن يحتاج ضبط | مقبول وجيد | قريب بوضوح |
| `airlume-ai` | خدمات | سفر وحجوزات | 58.6% مع `solea-femme` | 95 | 91 | 89 | قوي جدًا للبيع | سهل جدًا | مميز جدًا | متميز نسبيًا |
| `crafted` | حرف يدوية | صناعات يدوية | 65.3% مع `opulence` | 78 | 77 | 78 | متوسط جيد للبيع | جيد لكن يحتاج ضبط | مميز | تشابه متوسط |
| `pawsome` | حيوانات أليفة | مستلزمات حيوانات | 65.8% مع `smart-bazaar` | 91 | 77 | 74 | قوي جدًا للبيع | جيد لكن يحتاج ضبط | مقبول وجيد | تشابه متوسط |
| `elessi-tail-supply` | حيوانات أليفة | مستلزمات حيوانات | 74.1% مع `elessi-sprout-room` | 74 | 73 | 77 | متوسط جيد للبيع | جيد لكن يحتاج ضبط | مقبول وجيد | تشابه متوسط |
| `intruder-nft` | رقمي وإبداعي | ويب 3 وNFT | 50% مع `electronics-demo` | 53 | 59 | 79 | أضعف من المطلوب | متوسط | مميز | متميز نسبيًا |
| `skill-lab` | رقمي وإبداعي | كورسات ومنتجات رقمية | 65.3% مع `iron-forge` | 91 | 79 | 82 | قوي جدًا للبيع | سهل | مميز | تشابه متوسط |
| `iron-forge` | رياضة وفيتنس | معدات رياضية | 66.3% مع `turbo-parts` | 91 | 79 | 79 | قوي جدًا للبيع | سهل | مميز | تشابه متوسط |
| `elessi-pedal-lab` | رياضة وفيتنس | دراجات وملحقات | 74.3% مع `elessi-harvest-fold` | 74 | 73 | 77 | متوسط جيد للبيع | جيد لكن يحتاج ضبط | مقبول وجيد | تشابه متوسط |
| `turbo-parts` | سيارات | قطع غيار | 66.3% مع `iron-forge` | 86 | 79 | 81 | قوي للبيع | سهل | مميز | تشابه متوسط |
| `elessi-garage-fit` | سيارات | قطع غيار وسيارات | 75% مع `elessi-glow-routine` | 74 | 73 | 77 | متوسط جيد للبيع | جيد لكن يحتاج ضبط | مقبول وجيد | قريب بوضوح |
| `fresh-cart` | بقالة | سوبرماركت أونلاين | 60.7% مع `smart-bazaar` | 86 | 79 | 74 | قوي للبيع | سهل | مقبول وجيد | متميز نسبيًا |
| `elessi-harvest-fold` | بقالة | منتجات عضوية | 74.3% مع `elessi-pedal-lab` | 74 | 73 | 77 | متوسط جيد للبيع | جيد لكن يحتاج ضبط | مقبول وجيد | تشابه متوسط |
| `spice-route` | توابل وبقالة | جمعيات وسوبرماركت | 70.7% مع `green-haven` | 56 | 65 | 73 | أضعف من المطلوب | متوسط | مقبول وجيد | تشابه متوسط |
| `elessi-glow-routine` | جمال وعناية | عناية وبشرة | 75% مع `elessi-garage-fit` | 74 | 73 | 78 | متوسط جيد للبيع | جيد لكن يحتاج ضبط | مميز | قريب بوضوح |
| `perfume-eg` | جمال وعناية | متجر برفنات | 62.2% مع `elessi-glow-routine` | 95 | 85 | 89 | قوي جدًا للبيع | سهل | مميز جدًا | متميز نسبيًا |
| `velvet-glow` | جمال وعناية | مستحضرات تجميل | 64.1% مع `pawsome` | 91 | 77 | 78 | قوي جدًا للبيع | جيد لكن يحتاج ضبط | مميز | متميز نسبيًا |
| `cyber-gear` | جيمنج وتكنولوجيا | إلكترونيات | 70.4% مع `spice-route` | 56 | 67 | 70 | أضعف من المطلوب | متوسط | مقبول وجيد | تشابه متوسط |
| `bloom-studio` | ورد وهدايا | ورد وتغليف | 63.7% مع `crafted` | 85 | 79 | 79 | قوي للبيع | سهل | مميز | متميز نسبيًا |

## Reading the matrix

- anything above **85% similarity** deserves a separation pass if both themes are meant to coexist in the marketplace as distinct options
- a **Sell** score under **60** usually means the theme is more aesthetic or demo-oriented than conversion-ready
- a **Usability** score under **65** usually means the browse, PDP, or checkout flow is under-supported
- a **Style** score under **65** usually means the theme feels too close to another family, too generic, or under-differentiated
