# WooCommerce Product Import Select All - 2026-05-07

## Summary

The WooCommerce product import screen now supports bulk selection for the currently visible product list while keeping per-product and per-variant selection intact.

## Behavior

- Merchants can use the new "select all" control beside the selected import action.
- The control toggles to clear selection when every visible product is fully selected.
- Simple products are selected directly even when they do not have variations.
- Variable products still select all of their variations through the existing product checkbox behavior.
- Existing per-product and per-variant selection remains available.

## Verification

- Ran ESLint against the touched WooCommerce product import component and hook.
- Bundled the touched component with esbuild as a focused compile check.
