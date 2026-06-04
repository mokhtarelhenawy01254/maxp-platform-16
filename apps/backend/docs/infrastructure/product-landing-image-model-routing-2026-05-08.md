# Product Landing Image Model Routing - 2026-05-08

## Summary

Super Admin AI Providers now includes a Product Landing image generation routing setting. The setting keeps the existing system default behavior unless a Super Admin explicitly selects a specific image model for Product Landing Pages.

## Runtime Behavior

- `productLandingImageGeneration.mode = SYSTEM_DEFAULT` preserves the existing Image Studio provider routing.
- `productLandingImageGeneration.mode = SPECIFIC_MODEL` currently supports active NVIDIA keys only.
- The first supported image model is `black-forest-labs/flux.1-dev`.
- Product Landing slice image requests send `generationContext: PRODUCT_LANDING`, so the override applies only to Product Landing Pages and does not change regular Image Studio requests.
- NVIDIA image generation must return a real artifact or URL. The backend fails the request clearly instead of saving placeholder slices as successful output.
- `black-forest-labs/flux.1-dev` uses NVIDIA's currently supported `1024x1024` output size even when the Product Landing UI requests a vertical slice.
- Product Landing prompts now ask image models for square product campaign assets without text/UI instead of full landing-page screenshots. The storefront renderer composes the customer page from product data, pricing, variants, the real product image, and generated campaign assets, so image-model variance no longer owns the entire first viewport.
- Storefront rendering now sanitizes rich-text product descriptions before placing them into the hero, benefits, and form copy so merchant HTML does not leak into the customer-facing landing page.
- AI brief generation also sanitizes rich-text product descriptions before they are inserted into NVIDIA image prompts, reducing malformed prompt text such as raw `<p>` tags.
- Storefront rendering now suppresses visually blank campaign slices (for example, all-black artifacts) instead of showing them as broken gallery blocks, while still keeping the product-first landing usable with the real product image and order form.
- Published Product Landing Pages may use active products that are hidden from the main catalog. `isHidden` keeps campaign-only products out of normal browsing, but it no longer blocks a deliberately published landing page or its public subdomain URL.

## Operational Notes

- Super Admins must keep an active NVIDIA AI key configured before saving the specific-model option.
- If no Google/Gemini text key is available while NVIDIA image routing is selected, the image prompt still runs with the original prompt, but translation/magic-prompt enrichment is skipped.
- Removing the selected NVIDIA key resets Product Landing image routing back to system default.
- Visual QA should check that the first viewport communicates the product, price, and order CTA even if a generated campaign asset is imperfect or square.
