# Swan KHEMET Luxe Checkout Follow-Up - 2026-05-01

## Production Scenario Covered

- Store: `https://flora.maxp.online`
- Product tested: `/product/kotshy-soan`
- Flow tested on mobile viewport:
  - Product page
  - Add to cart
  - Cart drawer checkout CTA
  - Checkout form
  - Production order creation
  - Thank-you page
  - Order tracking from thank-you

## Test Order

- Order number: `ORD-473813-435`
- Customer name: `TEST SWAN QA DO NOT FULFILL 1777622463492`
- Phone: `01000000000`
- Final state after verification: `CANCELLED`
- Server note added: `QA TEST ORDER - CANCELLED AFTER CHECKOUT/THANK-YOU VERIFICATION ON 2026-05-01. DO NOT FULFILL.`

## Fixes

- Post-purchase upsell cards now strip HTML tags/entities from product descriptions before rendering short text snippets.
- Product cards reuse the same product-copy sanitizer so storefront cards do not expose raw HTML entities.
- Thank-you order tracking now formats JSON-encoded shipping addresses as readable address text.
- Public storefront order mutation routes now reject status/payment updates with `403`; guest order status changes must use authenticated staff or trusted integration endpoints.

## Verification

- Targeted Vitest:
  - `productCopy.test.ts`
  - `orderConfirmationUtils.test.ts`
  - `CartDrawer.khemet.test.tsx`
  - `RelatedProducts.elessiCompleteSet.test.tsx`
- Frontend production build completed successfully.
- Backend integration coverage now verifies public guest order status/payment mutation attempts are forbidden and do not change stored orders.
