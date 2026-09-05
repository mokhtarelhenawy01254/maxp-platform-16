# Storefront Khemet Luxe Swan Home Redesign (2026-09-05)

## Issue Summary
For stores using the khemet-luxe-eg theme (specifically Swan https://swan.maxp.online/), the homepage structure had critical design and conversion issues:
1. Products buried at the bottom: Products were placed at the 5th section (~5000px down the page).
2. Duplicate collection images: featured-collections had preferRuntimeCategories: true with identical shoe images and irrelevant clothes category.
3. Dead space on mobile: story-parallax rendered as an 876px empty block.
4. Bento section unstyled: offer-bento was rendered as dry text lists.
5. Template copy leaks: Unlocalized strings like نادي Luxe and Runway.

## Solutions Applied
- apps/frontend/src/storefront/themes/khemet-luxe-eg.json:
  - Added promo-strip.
  - Refreshed hero-banner with clear CTAs.
  - Promoted featured-products directly below hero banner.
  - Rebuilt offer-bento with 3 formatted value cards.
  - Fixed featured-collections with distinct categories and images.
  - Removed dead story-parallax section.
  - Updated newsletter to عائلة Swan.
