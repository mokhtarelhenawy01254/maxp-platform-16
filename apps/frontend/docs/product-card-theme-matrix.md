# Product Card Theme Matrix

## Goal
Map each storefront theme to a primary product-card personality so template differences stay obvious, intentional, and marketable.

## Active card archetypes
- `standard` — balanced default commerce card
- `minimal` — quiet, clean, reduced-noise display
- `overlay` — image-led hover/emphasis card
- `compact` — dense catalog card for tighter grids
- `luxury` — premium framed merchandising card
- `editorial` — story-led asymmetric/fashion card
- `glass` — translucent, modern, high-contrast card
- `list` — horizontal comparison-friendly catalog card

## Theme mapping
| Theme | Primary shop card | Supporting card direction | Why |
|---|---|---|---|
| modern-minimal | `compact` | `compact` / `standard` | Fast clean catalog browsing with minimal noise |
| bold-fashion | `editorial` | `minimal` | Trend-led layout with stronger campaign storytelling |
| elegant-luxe | `luxury` | `overlay` | Premium framed browsing with elevated product focus |
| vanguard-premium | `luxury` | `luxury` | Sharp premium catalog with structured authority |
| atelier-nova | `carousel` | `list` candidate later | Showroom-like shelf browsing, slower discovery |
| aura-chic | `editorial` | `glass` | Soft fashion identity with polished hero merchandising |
| solea-femme | `editorial` | `overlay` / `compact` | Feminine fashion storefront with stronger narrative cards |
| elessi-classic | `list` | `standard` | Catalog-first browsing and faster comparison |
| tech-cyber | `glass` candidate | `glass` | Strong future-facing visual language if product-grid sections expand |
| mystic-desert | `compact` | `list` | Warmer catalog with clearer scanability in supporting sections |
| fakhama-elite | `luxury` | `luxury` | High-end Arabic luxury merchandising |
| zen-organic | `standard` | `minimal` | Calm organic rhythm; can stay lighter and quieter |
| smart-bazaar | `standard` | `list` / `compact` | General-store browsing with faster comparison, visible offers, and stronger trust cues |

## Current implementation notes
- Aura Chic uses `glass-card` in featured products and `editorial-card` in shop.
- Elessi Classic uses `list-card` in featured/catalog presentation.
- Fakhama Elite and Vanguard Premium use `luxury-card` as a dominant direction.
- Solea Femme and Bold Fashion lean toward `editorial-card` in shop.
- Modern Minimal keeps `compact` as the dominant catalog rhythm.
- Mystic Desert uses `compact` in shop and `list-card` for featured browsing.
- Smart Bazaar keeps `standard` cards in shop and uses `list-card` on merchandised shelves for easier comparison.

## Suggested next steps
1. Add theme-level recommendations to studio UX so card defaults feel intentional.
2. Add token-level overrides per card archetype for finer visual separation.
3. Extend carousel-specific tuning so `luxury`, `editorial`, and `list` feel better in horizontal shelves.
4. Add visual snapshots/regression coverage for each archetype.
