export const storefrontVariantAliases = {
  HeroBanner: {
    split: 'split-panel',
    fullscreen: 'full-bleed',
    'centered-overlay': 'centered',
  },
  ProductGrid: {
    grid: 'standard',
  },
  ProductGallery: {
    slider: 'standard',
  },
  Newsletter: {
    colored: 'split-panel',
  },
  RelatedProducts: {
    grid: 'standard',
    carousel: 'standard',
    'minimal-card': 'minimal',
    'overlay-card': 'overlay',
    'luxury-card': 'luxury',
    'editorial-card': 'editorial',
    'glass-card': 'glass',
    'list-card': 'list',
  },
} as const;

export type StorefrontVariantAliasRegistry = typeof storefrontVariantAliases;
