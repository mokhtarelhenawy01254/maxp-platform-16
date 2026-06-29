# Facebook Catalog Product Feed

Public XML feed endpoint for Facebook Catalog product import.

## What changed

- Added `GET /api/v1/public/products/feed/:catalogId.xml` — generates Google Merchant XML feed from active products
- Added feed URL display in CatalogDetails.tsx with copy button
- No auth required (Facebook fetches the URL)

## How to use

1. Go to Facebook Ads → Catalogs → Catalog Details
2. Copy the Product Feed URL
3. Paste in Facebook Catalog Manager → Data Sources → Product Feeds

## Format

Google Merchant XML (RSS 2.0 with `g:` namespace). Compatible with Facebook Catalog, Instagram Shop, Google Shopping.
