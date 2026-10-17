import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { authService } from "../../../../services/authService";
import { config } from "../../../../config";
import { tToast } from "../../../../utils/i18n-toast";
import { getPrimaryImageUrl } from "../../../../utils/imageUrl";
import {
  Product,
  ProductVariant,
  extractAttributes,
  parseVariantAttributes,
} from "./productModalTypes";

export function useProductSelectionData(
  isOpen: boolean,
  onProductSelected: (product: Product, variant?: ProductVariant) => void,
) {
  const [searchQuery, setSearchQuery] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedAttributes, setSelectedAttributes] = useState<
    Record<string, string>
  >({});
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const listContainerRef = useRef<HTMLDivElement>(null);
  const skipNextSearchRef = useRef(false);

  const fetchProducts = useCallback(
    async (query: string = "", targetPage: number = 1, append = false) => {
      try {
        if (append) setLoadingMore(true);
        else setLoading(true);
        const token = authService.getAccessToken();
        const headers: HeadersInit = {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        };

        const params = new URLSearchParams({
          page: String(targetPage),
          limit: "30",
        });
        if (query.trim()) {
          params.set("search", query.trim());
        }

        const response = await fetch(
          `${config.apiUrl}/products?${params.toString()}`,
          { headers },
        );
        const data = await response.json();

        if (data.success && data.data) {
          const mappedProducts: Product[] = data.data.map((p: any) => {
            return {
              id: p.id,
              name: p.name,
              price: p.price,
              stock: p.stock,
              sku: p.sku,
              image: getPrimaryImageUrl(p.mainImage, p.image, p.images),
              variants: (p.variants || p.productVariants || []).map((v: any) => ({
                ...v,
                image: getPrimaryImageUrl(v.image, v.images),
              })),
            };
          });

          setProducts((prev) =>
            append ? [...prev, ...mappedProducts] : mappedProducts,
          );

          const total = data.pagination?.total ?? mappedProducts.length;
          const totalPages =
            data.pagination?.totalPages ??
            Math.max(1, Math.ceil(total / 30));
          setHasMore(targetPage < totalPages && mappedProducts.length > 0);
        }
      } catch (error) {
        console.error("Error fetching products:", error);
        tToast.error("SimplifiedProductSelectionModal.failed_fetch_c827");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (isOpen) {
      skipNextSearchRef.current = true;
      setPage(1);
      setHasMore(false);
      setSearchQuery("");
      setSelectedProduct(null);
      setSelectedAttributes({});
      fetchProducts("", 1);
    }
  }, [isOpen, fetchProducts]);

  useEffect(() => {
    if (!isOpen) return;
    if (skipNextSearchRef.current) {
      skipNextSearchRef.current = false;
      return;
    }
    const timeoutId = setTimeout(() => {
      setPage(1);
      setSelectedProduct(null);
      setSelectedAttributes({});
      if (listContainerRef.current) {
        listContainerRef.current.scrollTop = 0;
      }
      fetchProducts(searchQuery, 1);
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery, fetchProducts, isOpen]);

  const loadMore = useCallback(() => {
    if (loading || loadingMore || !hasMore) return;
    const nextPage = page + 1;
    setPage(nextPage);
    fetchProducts(searchQuery, nextPage, true);
  }, [loading, loadingMore, hasMore, page, searchQuery, fetchProducts]);

  const handleScroll = useCallback(() => {
    const el = listContainerRef.current;
    if (!el) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 150) {
      loadMore();
    }
  }, [loadMore]);

  const handleProductClick = (product: Product) => {
    if (product.variants && product.variants.length > 0) {
      setSelectedProduct(product);
      setSelectedAttributes({});
    } else {
      if (product.stock !== undefined && product.stock <= 0) {
        tToast.error("SimplifiedProductSelectionModal.msg_0e6c");
        return;
      }
      onProductSelected(product);
    }
  };

  const handleVariantSelect = (variant: ProductVariant) => {
    if (selectedProduct) {
      if (variant.stock !== undefined && variant.stock <= 0) {
        tToast.error("SimplifiedProductSelectionModal.msg_0e6c");
        return;
      }

      onProductSelected(selectedProduct, variant);
      setSelectedProduct(null);
      setSelectedAttributes({});
    }
  };

  const productAttributes = useMemo(() => {
    if (!selectedProduct) return [];
    return extractAttributes(selectedProduct.variants);
  }, [selectedProduct]);

  const filteredVariants = useMemo(() => {
    if (!selectedProduct) return [];
    return selectedProduct.variants.filter((variant) => {
      const variantAttrs = parseVariantAttributes(variant);
      return Object.entries(selectedAttributes).every(
        ([key, value]) => variantAttrs[key] === value,
      );
    });
  }, [selectedProduct, selectedAttributes]);

  const getAvailableValues = (attrName: string): string[] => {
    if (!selectedProduct) return [];
    const otherSelections = { ...selectedAttributes };
    delete otherSelections[attrName];

    const availableVariants = selectedProduct.variants.filter((variant) => {
      const variantAttrs = parseVariantAttributes(variant);
      return Object.entries(otherSelections).every(
        ([key, value]) => variantAttrs[key] === value,
      );
    });

    const values = new Set<string>();
    availableVariants.forEach((variant) => {
      const variantAttrs = parseVariantAttributes(variant);
      if (variantAttrs[attrName]) values.add(variantAttrs[attrName]);
    });

    return Array.from(values);
  };

  const allAttributesSelected =
    productAttributes.length > 0 &&
    productAttributes.every((attr) => selectedAttributes[attr.name]);

  const matchedVariant = useMemo(() => {
    if (!allAttributesSelected || filteredVariants.length !== 1) return null;
    return filteredVariants[0];
  }, [allAttributesSelected, filteredVariants]);

  return {
    searchQuery,
    setSearchQuery,
    products,
    loading,
    selectedProduct,
    setSelectedProduct,
    selectedAttributes,
    setSelectedAttributes,
    hasMore,
    loadingMore,
    listContainerRef,
    loadMore,
    handleScroll,
    handleProductClick,
    handleVariantSelect,
    productAttributes,
    filteredVariants,
    getAvailableValues,
    allAttributesSelected,
    matchedVariant,
  };
}
