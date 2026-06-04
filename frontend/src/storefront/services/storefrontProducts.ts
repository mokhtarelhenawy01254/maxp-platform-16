import { getStorefrontScope, storefrontFetch } from '../../utils/storefrontApi';
import {
  getProductImageCandidates,
  normalizeStorefrontImageValue,
} from '../utils/productImages';

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  comparePrice?: number;
  images: string[];
  slug: string;
  categoryId?: string;
  category?: {
    id: string;
    name: string;
  };
  productVariants?: ProductVariant[];
  variants?: ProductVariant[];
  [key: string]: any;
}

export interface ProductVariant {
  id: string;
  name: string;
  price?: number | null;
  comparePrice?: number | null;
  sku?: string;
  attributes?: Record<string, string> | null;
  attributeValues?: Record<string, string> | string | null;
  [key: string]: any;
}

export interface ProductsParams {
  [key: string]: string | number | boolean | undefined;
  page?: number;
  limit?: number;
  category?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  minPrice?: number;
  maxPrice?: number;
}

export interface ProductsResponse {
  data: Product[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

type StorefrontProductPayload = Product & {
  images?: unknown;
  mainImage?: unknown;
  image?: unknown;
};

type StorefrontProductVariantPayload = ProductVariant & {
  price?: unknown;
  comparePrice?: unknown;
  image?: unknown;
};

const toFiniteNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toOptionalFiniteNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

export const normalizeStorefrontProductVariant = (
  variant: StorefrontProductVariantPayload,
): ProductVariant => ({
  ...variant,
  price: toOptionalFiniteNumber(variant.price),
  comparePrice: toOptionalFiniteNumber(variant.comparePrice),
  image: normalizeStorefrontImageValue(variant.image),
});

export const normalizeStorefrontProduct = (
  product: StorefrontProductPayload,
): Product => {
  const normalizedVariants = Array.isArray(product.productVariants)
    ? product.productVariants.map((variant) =>
        normalizeStorefrontProductVariant(variant),
      )
    : undefined;
  const normalizedLegacyVariants = Array.isArray(product.variants)
    ? product.variants.map((variant) =>
        normalizeStorefrontProductVariant(variant),
      )
    : normalizedVariants;

  return {
    ...product,
    price: toFiniteNumber(product.price, 0),
    comparePrice: toOptionalFiniteNumber(product.comparePrice),
    mainImage: normalizeStorefrontImageValue(product.mainImage),
    images: getProductImageCandidates(product),
    productVariants: normalizedVariants,
    variants: normalizedLegacyVariants,
  };
};

export const getStorefrontProductsQueryKey = (
  params: ProductsParams = {},
  storefrontScope = getStorefrontScope(),
  previewKey = '',
) => ['storefront', 'products', storefrontScope, previewKey, params] as const;

export const fetchStorefrontProducts = async (
  params: ProductsParams = {},
  companyIdOverride?: string | null,
): Promise<ProductsResponse> => {
  const response = await storefrontFetch('/products', {
    companyId: companyIdOverride,
    query: params,
  });
  if (response.success) {
    const normalizedData = (response.data || []).map(
      (p: StorefrontProductPayload) => normalizeStorefrontProduct(p),
    );

    return {
      data: normalizedData,
      pagination: response.pagination,
    };
  }
  throw new Error(response.message || 'Failed to fetch products');
};
