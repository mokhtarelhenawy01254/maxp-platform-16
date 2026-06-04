# Rose Boutique EG Benchmark Scan

## Reference

- visual reference supplied directly by the user:
  - `C:/Users/mokhtar/Downloads/bab4cd6b72568e4bde8d3f973ee80048.jpg`
- reference DNA:
  - airy classic fashion boutique
  - serif-led hero copy
  - soft blush circular portrait stage
  - quiet product shelves with low chrome
  - dual horizontal promo banners
  - lightweight blog/news row
  - minimal newsletter and footer

## Protocol Read

- this implementation uses `style transfer`, not literal architecture cloning
- allowed from the reference:
  - visual rhythm
  - typography direction
  - whitespace and shelf behavior
  - promo/banner mood
- not copied 1:1:
  - brand identity
  - copy
  - store flow
  - conversion logic
  - page ordering outside what fit the storefront system

## Library Gaps Found

The current storefront library was missing reusable pieces for this kind of boutique homepage:

1. a calm `classic boutique hero` for fashion
2. a lighter `boutique shelf` product treatment
3. a twin `editorial promo banner` layout with imagery
4. a dedicated `journal/blog strip`
5. a quieter `newsletter strip`

## Resulting Additions

- `HeroBanner / boutique-muse`
- `ProductGrid / boutique-shelf`
- `ProductCard / boutique-air`
- `OfferBento / boutique-duo`
- `JournalStrip / editorial-cards`
- `Newsletter / editorial-strip`

## Theme Direction

- new theme id: `rose-boutique-eg`
- market: Egypt
- category: women’s boutique fashion
- mode: Arabic-first storefront with a classic light-boutique mood inspired by the provided image
