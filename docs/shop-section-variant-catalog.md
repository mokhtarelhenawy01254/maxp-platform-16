# Shop Section Variant Catalog

This document defines structural variants for the following storefront sections:

- `shop-hero`
- `shop-product-grid`
- `shop-featured-carousel`
- `shop-newsletter`

The goal is real variation in layout, browsing model, and user flow. Color swaps alone do not count as variants.

## Current Gap

From the current implementation:

- `shop-hero` supports only `default`, `editorial`, `minimal`, and `full-bleed`
- `shop-product-grid` changes card treatment more than browsing behavior
- `shop-featured-carousel` is currently a single horizontal rail
- `shop-newsletter` is currently close to a single signup block with light style changes

The variants below define a stronger target model for future implementation.

## shop-hero

| Variant ID | Name | Personality | Use Case | When to Use | Layout Change | UX Change |
|---|---|---|---|---|---|---|
| `editorial-lookbook` | Editorial Lookbook | luxury, fashion-forward, cultured | fashion, beauty, jewelry | When the brand sells aspiration and visual taste before utility | Large art-led media block with offset copy, supporting caption, and 2-3 curated collection links | Users enter through storytelling first, then jump into curated edits instead of a generic "shop all" path |
| `split-conversion` | Split Conversion Hero | confident, modern, commercial | electronics, home decor, DTC launches | When the store needs a clear campaign message plus a strong primary CTA | 50/50 split with headline and CTA on one side, featured product/category stack on the other | Users understand the value proposition immediately and get a direct route to the promoted collection |
| `minimal-index` | Minimal Index Hero | minimal, calm, premium | furniture, wellness, design objects | When the catalog is already strong and the hero should not dominate the page | Reduced-height text-first intro with category pills, breadcrumbs, or collection index below the heading | Users move faster into browsing because the hero behaves like a navigation threshold, not a billboard |
| `banner-stack` | Banner Stack Hero | energetic, merchandised, campaign-heavy | marketplace, department store, seasonal retail | When multiple campaigns or categories need equal visibility at the top of shop | Main headline plus stacked promo cards, each card linking to a different category, offer, or drop | Users self-select their path quickly instead of being forced through one featured story |
| `immersive-story` | Immersive Story Hero | cinematic, luxurious, emotional | luxury fashion, fragrance, premium accessories | When brand mood is more important than immediate density | Full-bleed media, sparse overlay copy, optional scroll cue, and ambient support text beneath fold | UX becomes slower and more atmospheric, encouraging emotional buy-in before product evaluation |
| `guided-discovery` | Guided Discovery Hero | smart, helpful, performance-oriented | electronics, sports gear, skincare | When shoppers often arrive undecided and need help narrowing options fast | Hero combines headline with quick-filter chips, featured intents, and shortcut cards like "Best for travel" or "Under $100" | Users start refining immediately from the hero instead of scrolling to the toolbar or sidebar first |

## shop-product-grid

| Variant ID | Name | Personality | Use Case | When to Use | Layout Change | UX Change |
|---|---|---|---|---|---|---|
| `classic-catalog` | Classic Catalog Grid | reliable, balanced, mainstream | general retail, home goods, lifestyle | When discoverability and predictability matter more than spectacle | Uniform cards in a stable multi-column grid with normal filter and pagination behavior | Users scan quickly, compare products evenly, and feel at home with standard ecommerce patterns |
| `editorial-masonry` | Editorial Masonry Grid | expressive, fashion, curated | fashion, beauty, art prints | When the page should feel like a magazine spread, not a shelf | Mixed card heights, occasional wide feature tiles, and product cards with breathing room and narrative blocks | Browsing becomes exploratory and visually led, favoring inspiration over strict comparability |
| `comparison-matrix` | Comparison Matrix | technical, rational, information-dense | electronics, appliances, tools | When buyers need to compare specs before committing | Grid shifts toward structured cards or mini-matrix rows with sticky attributes, badges, and key differences surfaced early | Users evaluate products analytically with less back-and-forth between PDPs |
| `quick-shop-dense` | Quick Shop Dense Grid | efficient, practical, high-volume | grocery, pharmacy, office supplies | When repeat purchasing and speed matter more than brand theater | Smaller cards, tighter spacing, inline quantity controls, and direct add-to-cart actions | Users can complete basket-building from the listing page with minimal friction |
| `shop-the-look` | Shop the Look Grid | styled, inspirational, lifestyle-led | fashion, furniture, decor | When products sell better in coordinated sets than as isolated SKUs | Products are grouped into look rows or room scenes with one anchor visual and several linked items | UX shifts from product-by-product browsing to bundle thinking and higher average order value behavior |
| `discovery-feed` | Discovery Feed | playful, content-led, trend-aware | beauty, youth fashion, creator brands | When the store wants to mix commerce with content and keep shoppers exploring | Alternating product clusters, editorial cards, creator quotes, and infinite-scroll style discovery modules | Users consume the page like a feed, staying longer and finding items through narrative context |

## shop-featured-carousel

| Variant ID | Name | Personality | Use Case | When to Use | Layout Change | UX Change |
|---|---|---|---|---|---|---|
| `new-arrivals-strip` | New Arrivals Strip | clean, familiar, flexible | most storefronts | When the goal is simply to surface a short list of fresh or featured SKUs | Horizontal product rail with equal cards and lightweight controls | Users skim quickly and dip into a few highlighted items without disrupting the main flow |
| `spotlight-slides` | Spotlight Slides | premium, campaign-led, focused | luxury, hero drops, limited collections | When each featured product deserves its own stage | One dominant slide at a time with large image, message, CTA, and secondary thumbnails or progress markers | UX becomes sequential and attention-directed instead of broad scanning |
| `shop-the-look-rail` | Shop the Look Rail | aspirational, styled, visual | fashion, interior styling, outdoor setups | When products sell better as part of a scene or outfit | Each slide centers on a full look or room image with attached related products beneath or beside it | Users enter through a context image first, then pick individual products from the scene |
| `comparison-rail` | Comparison Rail | expert, factual, confidence-building | electronics, fitness equipment, cookware | When a "featured" slot should help users decide, not just admire | Cards include key specs, differentiators, and a compact compare CTA in a horizontally browsable structure | Users can shortlist products from the carousel instead of treating it as decorative content |
| `drop-countdown` | Drop Countdown Rail | hype, exclusive, urgent | sneaker drops, collectibles, limited editions | When scarcity and timing are the conversion engine | Carousel cards include timer, stock cues, release label, and waitlist or notify actions | UX adds urgency and event behavior, making the carousel feel like a live release strip |
| `chaptered-carousel` | Chaptered Carousel | editorial, guided, thematic | beauty routines, gifting, seasonal curation | When featured content should be organized as themed chapters, not random items | Tabs or chapter labels control the carousel so each swipe belongs to a theme like "Weekend", "Travel", or "Best Sellers" | Users browse by intent or story chapter, which makes curation easier to understand and remember |

## shop-newsletter

| Variant ID | Name | Personality | Use Case | When to Use | Layout Change | UX Change |
|---|---|---|---|---|---|---|
| `inline-capture` | Inline Capture | minimal, frictionless, quiet | premium minimal brands, content-light shops | When email capture should exist without interrupting the shopping rhythm | Compact horizontal signup row embedded between sections with short copy and one field | UX feels lightweight and non-invasive, good for brands that want low-pressure capture |
| `benefit-club` | Benefit Club | persuasive, membership-led, commercial | fashion, beauty, home decor | When signups need a clear reward such as early access, discounts, or free shipping | Larger block with 3-4 member benefits, trust cues, and signup form side by side | Users understand why to subscribe before giving email, improving intent quality |
| `early-access-waitlist` | Early Access Waitlist | exclusive, premium, high-demand | limited drops, luxury capsules, launches | When the brand runs releases, drops, or small-batch collections | Waitlist-focused layout with exclusivity message, social proof, and optional SMS toggle | UX frames signup as access control rather than generic newsletter subscription |
| `preference-quiz` | Preference Quiz Capture | helpful, personalized, intelligent | skincare, supplements, apparel sizing | When personalization matters and zero-party data is more valuable than raw list growth | Multi-step capture with interest selection before email entry | Users receive a tailored promise and feel the brand is learning their preferences, not just collecting contacts |
| `editorial-digest` | Editorial Digest | cultured, content-first, soft-sell | fashion journals, design brands, boutique lifestyle | When the brand publishes stories, guides, or style edits alongside products | Newsletter block resembles a mini editorial panel with sample headlines, then signup | UX appeals to readers first, which is stronger for brands selling taste and guidance |
| `loyalty-concierge` | Loyalty Concierge | service-led, premium, relationship-focused | luxury retail, high AOV stores, repeat buyers | When the goal is retention and VIP nurturing, not just acquisition | Dual-column block with concierge benefits, account perks, and a richer signup or join CTA | UX shifts from newsletter thinking to membership thinking, supporting repeat purchase behavior |

## Suggested Schema Direction

To implement these variants cleanly, the settings model should expand beyond the current narrow `style` fields.

```ts
type ShopHeroVariant =
  | "editorial-lookbook"
  | "split-conversion"
  | "minimal-index"
  | "banner-stack"
  | "immersive-story"
  | "guided-discovery";

type ShopProductGridVariant =
  | "classic-catalog"
  | "editorial-masonry"
  | "comparison-matrix"
  | "quick-shop-dense"
  | "shop-the-look"
  | "discovery-feed";

type ShopFeaturedCarouselVariant =
  | "new-arrivals-strip"
  | "spotlight-slides"
  | "shop-the-look-rail"
  | "comparison-rail"
  | "drop-countdown"
  | "chaptered-carousel";

type ShopNewsletterVariant =
  | "inline-capture"
  | "benefit-club"
  | "early-access-waitlist"
  | "preference-quiz"
  | "editorial-digest"
  | "loyalty-concierge";
```

Recommended future settings:

- `shop-hero`: `variant`, `mediaMode`, `ctaLayout`, `entryPoints`
- `shop-product-grid`: `variant`, `groupBy`, `density`, `interactionModel`
- `shop-featured-carousel`: `variant`, `contentMode`, `navigationMode`, `peekStrategy`
- `shop-newsletter`: `variant`, `captureFields`, `incentiveType`, `confirmationMode`

