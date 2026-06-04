# Swan Image And Cache Performance Pass - 2026-05-03

## Context

The Swan/KHEMET storefront had already received the larger startup and image deferral wins, but the latest production baseline still showed the desktop home page spending most of its remaining transfer budget on static KHEMET placeholder PNGs. The same baseline also showed hashed Vite assets and versioned placeholder assets using a 30-day cache policy instead of an immutable long-lived policy.

## Change

- Added WebP versions for the KHEMET luxury shoe placeholder assets under `frontend/public/placeholders/luxury-shoes/`.
- Updated the storefront static asset helper so known KHEMET placeholder `.png` references are served as `.webp` with a new stable cache-busting version.
- Updated Nginx storefront configs so hashed `/assets/` files and versioned `/placeholders/` assets use `Cache-Control: public, max-age=31536000, immutable`.
- Kept HTML and backend storefront shell responses uncached so company SEO metadata and live storefront state remain fresh.

## Expected Impact

- Reduces first-view transfer on KHEMET home pages that still use static placeholder merchandising art, especially desktop layouts where more image cards are visible early.
- Improves repeat-visit and ad-click performance because browser/CDN caches can keep hashed chunks and versioned placeholder images for a year.
- Avoids stale image risk by changing the placeholder version key whenever the preferred asset set changes.

## Verification Plan

- Run focused storefront image helper tests.
- Run storefront theme validation.
- Run docs compliance.
- Build the frontend production bundle.
- Deploy through GitHub Actions and confirm Nginx reload succeeds.
- Verify production headers for `/assets/` and `/placeholders/`.
- Re-run Home / Shop / Product / Checkout production smoke and compare transfer sizes.
