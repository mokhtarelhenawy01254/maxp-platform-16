# Swan storefront speed pass - 2026-05-01

## Scope

- Optimize Swan/KHEMET Luxe product imagery that comes from WooCommerce `/wp-content/uploads/` URLs.
- Preserve existing `/uploads` storefront image transforms.
- Keep public storefront markup unchanged while reducing transferred image bytes across product, shop, cart, and post-purchase upsell surfaces.

## Implementation

- Storefront image helpers now route external WooCommerce product images through `/api/proxy-image`.
- The image proxy accepts bounded transform params: `w`, `q`, and `format=webp`.
- The proxy resizes raster images with `sharp`, converts to WebP, and caches transformed results for a week.
- Direct URL proxy requests no longer initialize Prisma unless `messageId` or `customerId` lookup is needed.
- Product image components now infer a smaller default requested width from the rendered image width when a page does not pass an explicit transform size.
- Order confirmation lazy-load skeletons reserve the expected thank-you content height so the footer does not jump while the section hydrates.
- Swan/KHEMET Luxe home imagery now also treats known storefront media CDNs (`images.unsplash.com` collection imagery and `lh3.googleusercontent.com/aida-public` hero imagery) as proxyable, so those assets can be resized and served as WebP instead of loading raw remote originals.
- KHEMET product cards, related-product rails, cart item thumbnails, and cart upsell thumbnails now pass explicit responsive image widths and lower quality settings for thumbnail-sized surfaces.
- The KHEMET cart drawer has a wider desktop panel, larger item media, and a taller checkout CTA so the cart feels more like a conversion surface and less like a narrow utility drawer.
- The Swan/KHEMET cinematic-plinth hero lazy-load fallback now reserves the same mobile and desktop height as the real hero and uses a visual shell instead of short placeholder bars, reducing home-page layout shift during hydration.
- KHEMET header/menu links now force document navigation across the storefront, preventing mobile menu taps from changing the URL while leaving the previous page content visible until a manual refresh.
- KHEMET footer navigation now uses the same document-navigation guard, preventing footer taps from changing the URL while leaving stale product content on mobile.
- KHEMET product cards and quick-view detail buttons now use document navigation for product-detail entry, so opening a product from home/shop does not leave lazy PDP sections stuck until refresh.
- KHEMET mobile sticky add-to-cart now adds directly when the current color/size selection is ready, instead of reopening the variant sheet and leaving the cart unchanged.
- KHEMET checkout now surfaces the order summary before the form on mobile while preserving the desktop sticky sidebar, so shoppers see the chosen item, shipping note, and total context before entering details and confirming.
- Product-detail review, related-product, and bought-together lazy-load fallbacks now reserve enough height to stop those below-the-fold modules from jumping into the desktop viewport while they hydrate.
- KHEMET product-detail gallery/info placeholders now reserve the real Swan buybox height, and merged checkout placeholders collapse to zero so reviews and related sections do not jump while PDP chunks hydrate.
- Merged KHEMET checkout sections now skip Suspense placeholder markup entirely when the buybox already owns the checkout surface, avoiding a temporary 296px spacer above reviews.
- The expanded KHEMET/Elessi buybox grid now keeps a desktop minimum height while product data hydrates, preventing review and related placeholders from jumping into the viewport during a brief data-loading race.
- The KHEMET/Elessi complete-set related-products rail now prewarms earlier on PDP scroll and reserves its desktop rail height, preventing the upsell section from shrinking and pulling the footer into the viewport after recommendations hydrate.
- The KHEMET/Elessi story-grid reviews section now prewarms before entering the viewport and reserves the empty-review desktop height, so the upsell rail no longer jumps upward when the review API returns zero reviews.

## Verification targets

- Product page should keep the main image responsive while avoiding the original multi-megapixel file on mobile.
- Shop cards should request 240-640px WebP variants instead of 900-1600px originals.
- Thank-you upsell images inherit the same optimization path.
- Thank-you pages should keep cumulative layout shift low while the order confirmation module loads.
- Home collection imagery should request 320-800px proxied WebP variants instead of raw 1200px+ remote images.
- The cart drawer should remain scroll-safe while the checkout CTA stays outside the upsell scroll area, with the KHEMET panel using the larger desktop footprint.
- Home hero loading should stay visually stable on mobile and desktop while the lazy section chunk hydrates.
- Mobile menu taps from home/product should land on `/shop` with the shop content rendered immediately, not only after a manual refresh.
- Footer navigation taps from product pages should land on `/shop` with shop content rendered immediately, matching the header behavior.
- Product card taps from home/shop should open a hydrated PDP where reviews and related products load on scroll without requiring a manual refresh.
- Mobile sticky `ضيفيه للسلة` should add the selected variant and open the cart drawer when color/size are already selected.
- Mobile checkout should present the order summary before the customer data form for KHEMET, without duplicating the desktop sidebar into the mobile reading flow.
- Product desktop CLS should remain stable when recommendation and review modules finish lazy-loading.
- Product desktop CLS should remain stable while the gallery, buybox, merged checkout, reviews, and related sections hydrate.
- Product desktop CLS should remain stable even when the product-info chunk resolves before its product data is ready.
- Product desktop CLS should remain below the good threshold when shoppers scroll into the complete-set upsell rail near the footer.
- Product desktop CLS should remain below the good threshold when the review rail resolves to an empty state immediately above related products.
