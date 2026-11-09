import { Category } from '../../hooks/useCategories';
import {
  getDefaultRegisteredVariantId,
  hasRegisteredVariant,
} from '../../variants';

export interface FeaturedCollectionsProps {
  section?: {
    variant?: string;
    [key: string]: unknown;
  };
  settings?: {
    title?: string;
    subtitle?: string;
    limit?: number;
    ctaText?: string;
    ctaLink?: string;
    preferRuntimeCategories?: boolean;
    [key: string]: unknown;
  };
}

export type CollectionFallback = Category & {
  description: string;
};

export type ManualCollectionInput = {
  id?: string;
  title?: string;
  name?: string;
  slug?: string;
  subtitle?: string;
  description?: string;
  image?: string;
  link?: string;
};

export type CollectionCard = {
  id: string;
  name: string;
  slug?: string;
  description: string;
  image: string;
  href: string;
};

export type CollectionCardSeed = Omit<CollectionCard, 'image'> & {
  image?: string;
};

export type PreviewProductImageSource = {
  id?: string;
  slug?: string;
  name?: string;
  description?: string;
  categoryId?: string;
  category?: {
    id?: string;
    slug?: string;
    name?: string;
  };
  mainImage?: string;
  images?: string[];
};

export type TechDecisionLaneMeta = {
  eyebrow: string;
  routeLabel: string;
  bullets: string[];
  footer: string;
};

export type TravelPostcardMeta = {
  stamp: string;
  routeLabel: string;
  packingNote: string;
  bullets: string[];
  footer: string;
};

export type FeaturedCollectionsVariant =
  | 'standard-showcase'
  | 'editorial-categories'
  | 'gallery-columns'
  | 'fast-nav-grid'
  | 'tech-decision-lanes'
  | 'catalog-pills'
  | 'retail-category-tiles'
  | 'marketplace-tiles'
  | 'pastel-category-lane'
  | 'fragrance-ledger'
  | 'butcher-cut-map'
  | 'elessi-bag-categories'
  | 'elessi-merch-panels'
  | 'elessi-pill-shelf'
  | 'elessi-story-cards'
  | 'elessi-utility-cards'
  | 'elessi-organic-routes'
  | 'elessi-digital-departments'
  | 'elessi-plant-categories'
  | 'elessi-bike-panels'
  | 'menu-categories'
  | 'floating-bubbles'
  | 'occasion-ribbon'
  | 'travel-postcards'
  | 'easyorders-circles'
  | 'legacy-circle-categories';

export const FEATURED_COLLECTIONS_FAMILY = 'FeaturedCollections';
export const FEATURED_COLLECTIONS_DEFAULT =
  (getDefaultRegisteredVariantId(FEATURED_COLLECTIONS_FAMILY) as
    | FeaturedCollectionsVariant
    | undefined) || 'standard-showcase';

export const normalizeFeaturedCollectionsVariant = (
  rawVariant: unknown,
): FeaturedCollectionsVariant => {
  const value = String(rawVariant || '')
    .trim()
    .toLowerCase();
  if (
    (value === 'standard-showcase' ||
      value === 'editorial-categories' ||
      value === 'gallery-columns' ||
      value === 'fast-nav-grid' ||
      value === 'tech-decision-lanes' ||
      value === 'catalog-pills' ||
      value === 'retail-category-tiles' ||
      value === 'marketplace-tiles' ||
      value === 'pastel-category-lane' ||
      value === 'fragrance-ledger' ||
      value === 'butcher-cut-map' ||
      value === 'elessi-bag-categories' ||
      value === 'elessi-merch-panels' ||
      value === 'elessi-pill-shelf' ||
      value === 'elessi-story-cards' ||
      value === 'elessi-plant-categories' ||
      value === 'elessi-utility-cards' ||
      value === 'elessi-organic-routes' ||
      value === 'elessi-digital-departments' ||
      value === 'elessi-bike-panels' ||
      value === 'menu-categories' ||
      value === 'floating-bubbles' ||
      value === 'occasion-ribbon' ||
      value === 'travel-postcards' ||
      value === 'easyorders-circles' ||
      value === 'legacy-circle-categories') &&
    hasRegisteredVariant(FEATURED_COLLECTIONS_FAMILY, value)
  ) {
    return value as FeaturedCollectionsVariant;
  }
  return FEATURED_COLLECTIONS_DEFAULT;
};
