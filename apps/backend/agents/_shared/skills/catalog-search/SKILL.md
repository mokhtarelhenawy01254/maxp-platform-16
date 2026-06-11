# Catalog Search

Use when recommending, comparing, or validating products.

## Procedure

1. **Browse catalog**: When the customer asks "what products do you have" or similar, call `product.search` with `listAll=true` to return the full catalog with categories, prices, variants, sizes, and colors.

2. **Specific product**: When the customer names a product, call `product.search` with their exact wording first. Return product name, price, category, stock, available colors, and available sizes from the result.

3. **Variants (colors/sizes)**: `product.search` now returns `availableSizes` and `availableColors` arrays with per-variant stock and status. Present these directly to the customer.

4. **Check availability**: When the customer asks if a specific size/color is in stock, call `inventory.check` which returns per-variant availability and constraint validation.

5. **Return only facts** supported by the catalog. Never invent prices, stock, colors, or sizes.

## Category (القسم) Information

- `product.search` returns `categoryName` for each product.
- When listing all products (`listAll=true`), mention the categories available.
- When the customer asks "what categories do you have", list the unique `categoryName` values from the results.

## Context Cleanup

If the customer changes product, size, or color, clear stale product assumptions before making new tool calls.
