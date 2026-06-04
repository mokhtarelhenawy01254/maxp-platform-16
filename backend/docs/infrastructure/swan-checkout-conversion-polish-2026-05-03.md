# Swan Checkout Conversion Polish - 2026-05-03

## Context

The previous Swan/KHEMET performance pass split the public runtime theme load and verified
that the first load no longer requests the full `storefront-theme-presets` chunk. The remaining
measurable polish issue was direct empty `/checkout` traffic: the checkout page showed large lazy
section skeletons and then collapsed because the cart was empty. That created occasional desktop
CLS around `0.145` and left users on a low-value empty checkout page.

## Change

- Added a stable empty-checkout state in `PageComposer` for KHEMET's flat checkout layout.
- The empty state bypasses lazy checkout/payment/order-summary skeletons when both the live cart
  and persisted cart snapshot are empty.
- Added KHEMET-specific empty checkout copy and links in `khemet-luxe-eg.json`.
- The new state sends customers back to `/shop` or `/sale`, keeps touch targets large, and explains
  that size/color will remain visible before final confirmation.
- Empty-checkout copy now stays theme-owned, so merchants/theme editors can adjust it from the
  preset without hard-coded Arabic copy in the generic composer.

## Guardrails

- Cart checkout is unchanged when products exist.
- Persisted-cart hydration is protected by checking the current cart storage name before showing the
  empty state, including preview-specific storage names.
- The behavior is scoped to `surfaceTone: "flat-checkout"` so generic checkout layouts keep their
  existing section rendering.
- Regression coverage lives in `frontend/src/storefront/__tests__/pageComposer.test.tsx`.

## Verification Plan

1. Run focused PageComposer tests.
2. Validate theme JSON.
3. Build the frontend production bundle.
4. Push to `main`, watch `Deploy to Server`, verify PM2/health over SSH.
5. Re-measure Flora Home, Shop, Product, direct empty Checkout, and cart Checkout on desktop/mobile.
