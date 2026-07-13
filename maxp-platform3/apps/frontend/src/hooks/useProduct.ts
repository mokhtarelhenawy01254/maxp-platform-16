import { useQuery } from "@tanstack/react-query";

import { storefrontApi } from "../utils/storefrontApi";
import type {
  ProductFilter,
  SortOption,
  StorefrontProduct,
} from "../types/StorefrontTypes";
import { normalizeProductImages } from "../types/StorefrontTypes";

type RawStorefrontProductResponse = Record<string, unknown>;
type ProductsListResponse = {
  data?: {
    products?: RawStorefrontProductResponse[];
    data?: RawStorefrontProductResponse[];
    total?: number;
    pagination?: {
      total?: number;
    };
  } | RawStorefrontProductResponse[];
  products?: RawStorefrontProductResponse[];
  total?: number;
};

const normalizeStorefrontProduct = (
  raw: RawStorefrontProductResponse,
): StorefrontProduct => ({
  ...raw,
  id: String(raw["id"] || ""),
  name: String(raw["name"] || ""),
  price: Number(raw["price"]) || 0,
  images: normalizeProductImages(raw["images"]),
  rawImages: raw["images"],
  variants: Array.isArray(raw["variants"])
    ? (raw["variants"] as StorefrontProduct["variants"])
    : [],
  productVariants: Array.isArray(raw["productVariants"])
    ? (raw["productVariants"] as StorefrontProduct["productVariants"])
    : Array.isArray(raw["variants"])
      ? (raw["variants"] as StorefrontProduct["productVariants"])
      : [],
});

/**
 * ðŸ›ï¸ Hook to fetch and cache a single product using React Query.
 *
 * Returns a typed StorefrontProduct with normalized images.
 * This is the headless data layer â€” any PDP layout can consume it.
 */
export const useProduct = (productId: string | undefined) => {
  return useQuery<StorefrontProduct>({
    queryKey: ["product", productId],
    queryFn: async () => {
      if (!productId) {
        throw new Error("Product ID is required");
      }

      const response = await storefrontApi.getProduct(productId);
      if (!response?.success || !response.data) {
        throw new Error(response?.message || "Failed to fetch product");
      }

      return normalizeStorefrontProduct(
        response.data as RawStorefrontProductResponse,
      );
    },
    enabled: Boolean(productId),
    staleTime: 1000 * 60 * 5,
  });
};

/**
 * ðŸ“‹ Hook to fetch and cache product listings with filtering and sorting.
 *
 * Usage:
 * const { products, total, isLoading } = useProducts({ categoryId: "123" }, "newest", 1, 20);
 */
export const useProducts = (
  filters: ProductFilter = {},
  sort: SortOption = "newest",
  page = 1,
  limit = 20,
) => {
  const queryKey = ["products", filters, sort, page, limit];

  const query = useQuery<{ products: StorefrontProduct[]; total: number }>({
    queryKey,
    queryFn: async () => {
      const params: Record<string, string> = {
        page: String(page),
        limit: String(limit),
        sort,
      };

      if (filters.categoryId) params["categoryId"] = filters.categoryId;
      if (filters.searchQuery) params["search"] = filters.searchQuery;
      if (filters.minPrice != null) params["minPrice"] = String(filters.minPrice);
      if (filters.maxPrice != null) params["maxPrice"] = String(filters.maxPrice);
      if (filters.inStock != null) params["inStock"] = String(filters.inStock);
      if (filters.tags?.length) params["tags"] = filters.tags.join(",");

      const response = (await storefrontApi.getProducts(
        params,
      )) as ProductsListResponse;
      const responseData = response?.data;
      const responseDataRecord =
        responseData && !Array.isArray(responseData) && typeof responseData === "object"
          ? responseData
          : undefined;

      const rawProducts = (() => {
        if (Array.isArray(responseData)) return responseData;
        const recordProducts = responseDataRecord?.products;
        if (Array.isArray(recordProducts)) return recordProducts;
        const recordData = responseDataRecord?.data;
        if (Array.isArray(recordData)) return recordData;
        if (Array.isArray(response?.products)) return response.products;
        return [];
      })();

      const products = rawProducts.map(normalizeStorefrontProduct);
      const total =
        responseDataRecord
          ? responseDataRecord.total ?? responseDataRecord.pagination?.total ?? products.length
          : response?.total ?? products.length;

      return {
        products,
        total: Number(total) || products.length,
      };
    },
    staleTime: 1000 * 60 * 2,
  });

  return {
    products: query.data?.products || [],
    total: query.data?.total || 0,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
  };
};
