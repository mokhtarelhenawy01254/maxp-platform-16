# Product Description Alignment and Size Guide Support

## Summary
Fixed two storefront and product display issues:
1. **Product Description Alignment & Rich Text**:
   - Added complete CSS rules for Quill text alignments (`.ql-align-center`, `.ql-align-right`, `.ql-align-left`, `.ql-align-justify`), text direction, font sizes, indents, and video embeds across `storefront.css`, `index.css`, and `storefront-layout.css`.
   - Updated `sanitizeStorefrontHtml` in `html.ts` to preserve `style`, `class`, `dir`, `align`, `target`, and `iframe` tags.
   - Removed `max-w-lg` limitation in `ProductDescription.tsx` to allow full width and proper centering on desktop and mobile.

2. **Custom Size Guide (`product.sizeGuide`)**:
   - Added `formatCustomSizeGuide` in `dynamicSectionContent.ts` to parse Markdown, plain text, lists, tables, or HTML into structured, safe HTML markup.
   - Updated `ProductInfoModals.tsx` to accept and render `customSizeGuide` in `ProductInfoSizeGuideDialog`.
   - Updated `ProductInfo.tsx` so `showSizeGuide` and `canOpenSizeGuide` are enabled when `product.sizeGuide` is present.
   - Updated `SizeGuide.tsx` to render product-specific size guides.
