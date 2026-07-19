# KHEMET LUXE — Editorial Premium Theme

`khemet-luxe-v2` هو preset محدّث من `khemet-luxe-eg`، مبني على نفس الهوية البصرية (أخضر زمردي داكن + ذهبي دافئ + عاجي فاتح، `Noto Serif` للعناوين و`Manrope` للنصوص، `floating-dark` header، `signature-panel` footer) لكن مع إصلاحات تحويل بيعي + ترقيات 2026 بريميم.

## ليه v2؟

`khemet-luxe-eg` (v1) كان أنيق بصريًا لكن ضعيف تجاريًا:
- `pageGoal: "trust"` كان بيخفي أي عنصر إلحاح/إثارة من المحرك — مناسب لبناء ثقة صامتة لكن مش بيع.
- صفر social proof حي — المحرك فيه `sold-counter`, `delivery-proof`, `back-in-stock`, `pre-order` لكن v1 ما استخدم أي واحد.
- بحث المتجر مخفي + category chips مخفية = اكتشاف أقل = بيع أقل.
- هيدر ضعيف: بحث + سلة فقط. لا wishlist، لا تتبع طلب، لا حساب.
- hero بيعتمد على صورة من Google public CDN (هشّة في الإنتاج).
- مقاسات 36-41 فقط (السوق المصري بيحتاج 35-42).
- promo-strip مزدحم بـ 6 عناصر = ضجيج.
- ما فيش video / motion / scroll-driven animation.

## التغييرات عن v1

### Phase 1 — إصلاحات التحويل

| المنطقة | v1 | v2 |
|--------|----|----|
| `pageGoal` (home/shop/pdp) | `trust` | `conversion` |
| `enforceTrustSignals` | true | false |
| `promo-strip` | 6 عناصر | رسالة + CTA واحدة، variant `sale-signal` |
| Shop search | `hideSearch: true` | `false` |
| Shop category chips | `hideDesktopCategoryChips: true` | `false` |
| Shop grid limit | 48 | 24 (شعور ندرة) |
| Header | search + cart | + wishlist + account + order tracking |
| PDP social proof | لا شيء | `sold-counter` (editorial/spotlight) + `delivery-proof` (timeline) |
| PDP cross-sell | لا شيء | `bought-together` (complete-look) |
| PDP scarcity | لا شيء | `back-in-stock` + `pre-order` (pulse) |
| المقاسات | 36-41 | 35-42 (product-info + size-guide) |
| Checkout order-summary | — | `showFreeShippingProgress: true` |

### Phase 2 — ترقيات 2026

| القسم | الوصف |
|------|------|
| `shoe-fit-finder` (home + pdp) | أداة اكتشاف: "وظبطي حذائك على مقاس يومك" — اختاري يومك (شغل/مشاوير/رياضة/مناسبة) ونرشحلك |
| `lookbook-showcase` (home) | variant `boutique-storyboard` — "إطلالات من ضوء القاهرة" |
| `tech-grid` (home) | 4 عناصر: جلد طبيعي / حياكة يدوية / تهوية نشطة / وزن خفيف |
| `shopping-intents` (home + shop) | "تسوقي بنية" — تصفية حسب النية |
| `journal-strip` (home) | variant `editorial-cards` — 3 مقالات: العناية بالجلد، دليل المقاسات، قصة الحرفة (SEO + authority) |
| `hero-banner` | استبدال صورة Google CDN بـ Unsplash + `backgroundVideo` field (coverr.co) |
| `quantity-offers` | `selection-rail` → `look-builder` ("كمّلي الإطلالة") |
| `reviews` reviewLimit | 4 → 6 |
| `related-products` limit | 4 → 6 |
| `formVariant` | `khemet-luxe-eg` → `khemet-luxe-v2` |

###_sections المضافة على PDP (الترتيب)
1. product-gallery (elessi-showroom)
2. product-info (elessi-care-buybox)
3. **sold-counter** ← جديد
4. **delivery-proof** ← جديد
5. quantity-offers (look-builder)
6. **bought-together** ← جديد
7. **back-in-stock** ← جديد
8. **pre-order** ← جديد
9. pdp-checkout (merged buybox, formVariant khemet-luxe-v2)
10. reviews (elessi-story-grid, limit 6)
11. related-products (elessi-complete-set, limit 6)
12. **shoe-fit-finder** ← جديد (أداة اكتشاف على الـ PDP)

###_Sections المضافة على HOME (الترتيب)
1. promo-strip (sale-signal — مُبسّط)
2. hero-banner (cinematic-plinth + backgroundVideo)
3. featured-collections (gallery-columns, preferRuntimeCategories)
4. story-parallax (split-editorial)
5. offer-bento (editorial-columns)
6. **shoe-fit-finder** ← جديد
7. **lookbook-showcase** ← جديد
8. **tech-grid** ← جديد
9. **shopping-intents** ← جديد
10. featured-products (boutique-rail, limit 6)
11. features-bar (trust-strip)
12. **journal-strip** ← جديد
13. newsletter (editorial-strip)

## تعديل المنصة

`sections/manifest.ts` تم تعديله: `shoe-fit-finder` pages من `["home"]` إلى `["home", "pdp"]` عشان يسمح باستخدامه على صفحة المنتج كأداة اكتشاف إضافية.

## Tokens (مطابقة لـ v1)

- colors: primary `151 34% 16%` (dark emerald), accent `41 45% 63%` (warm gold), background `24 31% 97%` (warm cream)
- typography: headingFont `"Noto Serif", serif`, bodyFont `"Manrope", "IBM Plex Sans Arabic", sans-serif`
- shape: borderRadius `0.9rem`, buttonRadius `999px` (pill)
- seo.titleTemplate: `%s | KHEMET LUXE`

## التسجيل

| الملف | التغيير |
|------|--------|
| `themes/khemet-luxe-v2.json` | ملف جديد |
| `themes/index.ts` | import + entry في STOREFRONT_THEME_PRESETS |
| `themes/catalog.ts` | category meta + description + preview image |
| `vite.config.ts` | whitelist regex |
| `sections/manifest.ts` | `shoe-fit-finder` pages += `pdp` |

## TODO (Phase 3 — محتاج backend hooks)

- AI recommendations widget (منصة عندها AI system لكن الـ theme ما بيوصلش hook)
- Instagram/TikTok UGC feed
- AR try-on CTA
- Voice commerce
- توطين الأصول: استبدال روابط Unsplash/coverr بصور محلية في `/assets/themes/khemet-luxe-v2/`