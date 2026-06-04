# Products Management SKU Visibility

## 2026-05-08

- The main `/products` management table no longer renders the product `SKU` under the product name.
- This keeps long generated SKU strings from crowding the product column in company admin product operations.
- SKU data remains part of the product model and is still available in workflows that need it, including product editing, inventory, imports, product search, and order preparation.
- Regression coverage lives in `frontend/src/pages/products/components/ProductTableRow.test.tsx`.
