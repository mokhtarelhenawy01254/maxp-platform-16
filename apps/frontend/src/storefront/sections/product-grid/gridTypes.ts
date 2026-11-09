import React from 'react';
import type ProductCard from '../../components/ProductCard';

export interface ProductGridProps {
  section?: {
    variant?: string;
    [key: string]: unknown;
  };
  settings?: {
    title?: string;
    limit?: number;
    saleOnly?: boolean;
    emptyStateTitle?: string;
    emptyStateDescription?: string;
    clearButtonText?: string;
    defaultCategorySlug?: string;
    hideHeader?: boolean;
    ctaText?: string;
    ctaLink?: string;
    [key: string]: unknown;
  };
}

export type ProductCardVariant = React.ComponentProps<typeof ProductCard>['variant'];

export type ProductGridVariant =
  | 'standard'
  | 'minimal-card'
  | 'boutique-shelf'
  | 'boutique-rail'
  | 'retail-air-grid'
  | 'retail-direct-grid'
  | 'quick-view-fashion-grid'
  | 'fastly-offer-wall'
  | 'spec-rack'
  | 'elessi-bag-grid'
  | 'elessi-bag-shop-grid'
  | 'elessi-spotlight-grid'
  | 'elessi-listing-grid'
  | 'elessi-compact-shelf'
  | 'elessi-editorial-stack'
  | 'elessi-organic-market-grid'
  | 'elessi-organic-shop-grid'
  | 'butcher-cut-grid'
  | 'butcher-atelier-grid'
  | 'elessi-digital-launch-grid'
  | 'elessi-digital-catalog-grid'
  | 'elessi-plant-favorites'
  | 'elessi-plant-nursery-grid'
  | 'elessi-bike-grid'
  | 'elessi-bike-shop-grid'
  | 'overlay-card'
  | 'compact'
  | 'curated-rack'
  | 'fit-catalog'
  | 'deal-edit'
  | 'perfume-cabinet'
  | 'perfume-shelf'
  | 'luxury-card'
  | 'editorial-card'
  | 'glass-card'
  | 'list-card'
  | 'legacy-compact-listing'
  | 'carousel'
  | 'marketplace-tabs'
  | 'marketplace-rail'
  | 'playful-toybox';

export type CardImagePriorityMode = 'default' | 'mobile-first';

export const PRODUCT_GRID_SECTION_FAMILY = 'ProductGrid';

export const STUDIO_CARD_VARIANT_TO_GRID_VARIANT: Record<string, ProductGridVariant> = {
  default: 'standard',
  vogue: 'overlay-card',
  minimal: 'minimal-card',
  creative: 'compact',
  brutal: 'luxury-card',
  fashion: 'editorial-card',
  glass: 'glass-card',
  list: 'list-card',
};
