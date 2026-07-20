# Product Edit Tab Routing

## Changes
- Product edit button (`ProductTableRow`) now opens edit page in a new tab (`target="_blank"`)
- Each tab section in `ProductNewFinal` has its own URL via `?tab=` query parameter
- Sidebar tab navigation uses `<a>` tags with proper `href`, enabling right-click → "Open in new tab"

## URLs
- `/products/:id/edit?tab=basic` — Basic info
- `/products/:id/edit?tab=pricing` — Pricing
- `/products/:id/edit?tab=inventory` — Inventory
- `/products/:id/edit?tab=media` — Media/images
- `/products/:id/edit?tab=attributes` — Attributes
- `/products/:id/edit?tab=variants` — Variants
- `/products/:id/edit?tab=display` — Display settings
- `/products/:id/edit?tab=commission` — Commission
- `/products/:id/edit?tab=whatsapp` — WhatsApp notifications
- `/products/:id/edit?tab=shipping` — Shipping
- `/products/:id/edit?tab=seo` — SEO
- `/products/:id/edit?tab=advanced` — Advanced settings
- `/products/:id/edit?tab=quantity-offers` — Quantity offers

## Files Changed
- `apps/frontend/src/pages/products/ProductNewFinal.tsx` — Added `useSearchParams`, `changeTab` function, `<a>` sidebar tabs
- `apps/frontend/src/pages/products/components/ProductTableRow.tsx` — Edit button changed to `<a target="_blank">`
