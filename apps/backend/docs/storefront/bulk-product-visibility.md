# Bulk Product Visibility

## Endpoint
`PATCH /api/v1/products/bulk/visibility`

## Description
Bulk hide or unhide products from the storefront. Hidden products are not shown in the store but remain accessible via direct link.

## Request
```json
{
  "productIds": ["id1", "id2"],
  "isHidden": true
}
```

## Response
```json
{
  "success": true,
  "data": { "count": 2 }
}
```

## Frontend
- Bulk bar at `ProductsBulkBar.tsx` has "إخفاء" and "إظهار" buttons
- Hook `useProducts.ts` exposes `handleBulkVisibility(isHidden)`
- Only admins can select products (controlled by `canSelectProducts`)
