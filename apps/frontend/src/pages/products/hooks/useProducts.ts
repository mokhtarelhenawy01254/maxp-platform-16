import { useState, useEffect, useCallback } from "react";
import { apiClient } from "../../../services/apiClient";
import {
  Product,
  SortField,
  SortDirection,
  getStockStatus,
  safeJsonParse,
} from "../components/ProductsTypes";
import { FiltersState } from "../components/ProductsFilters";
import { useAuth } from "../../../hooks/useAuthSimple";
import { buildStoreUrl } from "../../../utils/storeUrl";
import {
  canManageProductWorkflowByRole,
  canSubmitProductReviewByRole,
  isPublishedWorkflow,
  matchesWorkflowFilter,
  normalizeProductWorkflow,
} from "../utils/workflow";

type WorkflowAction =
  | "save_draft"
  | "submit_review"
  | "approve"
  | "reject"
  | "publish"
  | "unpublish";

const initialFilters: FiltersState = {
  searchQuery: "",
  categoryFilter: "all",
  statusFilter: "all",
  stockFilter: "all",
  priceMin: "",
  priceMax: "",
  dateFrom: "",
  dateTo: "",
  tagsFilter: "",
};

const parseArray = <T>(value: any, fallback: T[] = []): T[] => {
  if (!value) return fallback;
  if (typeof value === "string") {
    if (value.startsWith("[") || value.startsWith("{")) {
      return safeJsonParse(value, fallback);
    }
    return value.split(",").map((t) => t.trim()).filter((t) => t.length > 0) as T[];
  }
  return Array.isArray(value) ? value : fallback;
};

const resolveStoredCompanyId = (): string | null => {
  if (typeof window === "undefined") return null;

  return (
    localStorage.getItem("storefront_companyId") ||
    localStorage.getItem("companyId") ||
    new URLSearchParams(window.location.search).get("companyId")
  );
};

const buildPreviewPath = (productId: string, companyId?: string | null): string => {
  const params = new URLSearchParams();
  if (companyId) {
    params.set("companyId", companyId);
  }
  params.set("preview", "1");

  const query = params.toString();
  return `/store/shop/products/${encodeURIComponent(productId)}${query ? `?${query}` : ""}`;
};

export const useProducts = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [duplicatingProductId, setDuplicatingProductId] = useState<string | null>(null);
  const [workflowLoadingId, setWorkflowLoadingId] = useState<string | null>(null);

  const { user } = useAuth();
  const isAdmin = canManageProductWorkflowByRole(user?.role);
  const canSubmitProductReview = canSubmitProductReviewByRole(user?.role);
  const isMerchant = user?.role === "MERCHANT";
  const canCreateProducts = isAdmin || isMerchant || canSubmitProductReview;
  const canSelectProducts = isAdmin && !isMerchant;

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [publishedCount, setPublishedCount] = useState(0);

  // Sorting
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  // Selection (bulk actions)
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);

  // Quick edit
  const [editingProduct, setEditingProduct] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState<string>("");
  const [editStock, setEditStock] = useState<string>("");
  const [editSku, setEditSku] = useState<string>("");

  // Filters
  const [filters, setFilters] = useState<FiltersState>(initialFilters);

  const transformProduct = useCallback(
    (p: any, fallback?: Product): Product => {
      const variants = Array.isArray(p.productVariants)
        ? p.productVariants
        : Array.isArray(p.variants)
          ? p.variants
          : [];
      const resolvedVariantsCount =
        variants.length > 0 ? variants.length : fallback?.variantsCount || 0;
      const inventorySnapshot =
        p.inventorySnapshot ||
        p.merchantContext?.inventorySnapshot ||
        fallback?.inventorySnapshot ||
        null;
      const merchantContext =
        p.merchantContext !== undefined ? p.merchantContext : fallback?.merchantContext;
      const resolvedStock = Number(
        p.stock ??
        inventorySnapshot?.availableForSale ??
        fallback?.stock ??
        0,
      );

      return {
        id: p.id,
        slug: p.slug || fallback?.slug || undefined,
        name: p.name || fallback?.name || "",
        description: p.description || fallback?.description || "",
        price: Number(p.price ?? fallback?.price ?? 0),
        comparePrice:
          p.comparePrice !== undefined && p.comparePrice !== null
            ? Number(p.comparePrice)
            : fallback?.comparePrice,
        cost:
          p.cost !== undefined && p.cost !== null
            ? Number(p.cost)
            : fallback?.cost,
        sku: p.sku || fallback?.sku || "",
        category: p.category?.name || fallback?.category || "غير محدد",
        categoryId: p.categoryId || fallback?.categoryId,
        images:
          p.images !== undefined
            ? parseArray<string>(p.images, [])
            : fallback?.images || [],
        mainImage: p.mainImage || fallback?.mainImage,
        stock: resolvedStock,
        availableStock:
          p.availableStock !== undefined
            ? Number(p.availableStock)
            : inventorySnapshot?.availableForSale !== undefined
              ? Number(inventorySnapshot.availableForSale)
              : fallback?.availableStock,
        fulfillableStock:
          p.fulfillableStock !== undefined
            ? Number(p.fulfillableStock)
            : inventorySnapshot?.availableForSale !== undefined
              ? Number(inventorySnapshot.availableForSale)
              : fallback?.fulfillableStock,
        inventorySnapshot,
        merchantContext,
        lowStockThreshold: Number(p.lowStockThreshold ?? fallback?.lowStockThreshold ?? 5),
        isActive: p.isActive !== undefined ? Boolean(p.isActive) : Boolean(fallback?.isActive),
        isHidden: p.isHidden !== undefined ? Boolean(p.isHidden) : Boolean(fallback?.isHidden),
        createdAt: p.createdAt ? new Date(p.createdAt) : fallback?.createdAt || new Date(),
        updatedAt: p.updatedAt ? new Date(p.updatedAt) : fallback?.updatedAt || new Date(),
        tags:
          p.tags !== undefined
            ? parseArray<string>(p.tags, [])
            : fallback?.tags || [],
        weight:
          p.weight !== undefined && p.weight !== null
            ? Number(p.weight)
            : fallback?.weight,
        dimensions:
          p.dimensions !== undefined && p.dimensions !== null
            ? safeJsonParse(
                typeof p.dimensions === "string"
                  ? p.dimensions
                  : JSON.stringify(p.dimensions),
                undefined,
              )
            : fallback?.dimensions,
        workflow: normalizeProductWorkflow(
          p.workflow,
          p.isActive !== undefined ? Boolean(p.isActive) : fallback?.isActive,
        ),
        productType: resolvedVariantsCount > 0 ? "variable" : "simple",
        variantsCount: resolvedVariantsCount,
      };
    },
    [],
  );

  const companyIdForPreview = user?.companyId || resolveStoredCompanyId();

  const canEditProductStock = (product?: Product | null) =>
    product?.merchantContext?.canEditStock !== false &&
    product?.inventorySnapshot?.canEditStock !== false;

  const handleFilterChange = useCallback((key: keyof FiltersState, value: string) => {
    setCurrentPage(1);
    setFilters((prev) => {
      if (prev[key] === value) {
        return prev;
      }

      return { ...prev, [key]: value };
    });
  }, []);

  const resetFilters = useCallback(() => {
    setCurrentPage(1);
    setFilters(initialFilters);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedProducts(new Set());
    setSelectAll(false);
  }, []);

  const hasActiveFilters = !!(
    filters.searchQuery ||
    filters.categoryFilter !== "all" ||
    filters.statusFilter !== "all" ||
    filters.stockFilter !== "all" ||
    filters.priceMin ||
    filters.priceMax ||
    filters.dateFrom ||
    filters.dateTo ||
    filters.tagsFilter
  );

  const loadProducts = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const limit = hasActiveFilters ? 500 : itemsPerPage;
      const page = hasActiveFilters ? 1 : currentPage;

      const response = await apiClient.get("products", {
        params: { page, limit, sortBy: sortField, sortOrder: sortDirection },
        _skipTransientRetry: true,
      });

      const data = response.data;
      if (data.success && data.data) {
        const transformed = data.data.map((p: any) => transformProduct(p));
        setProducts(transformed);
        setTotalItems(data.pagination?.total || transformed.length);
        setPublishedCount(data.publishedCount ?? 0);
      } else {
        setError("فشل في تحميل المنتجات");
      }
    } catch (err: any) {
      console.error("Error loading products:", err);
      setError("حدث خطأ أثناء تحميل المنتجات");
    } finally {
      setIsLoading(false);
    }
  }, [
    currentPage,
    itemsPerPage,
    sortField,
    sortDirection,
    hasActiveFilters,
    transformProduct,
  ]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const categories = Array.from(new Set(products.map((p) => p.category)));
  const allTags = Array.from(new Set(products.flatMap((p) => p.tags || [])));

  const filteredProducts = hasActiveFilters
    ? products.filter((p) => {
        const matchesSearch =
          (p.name || "").toLowerCase().includes(filters.searchQuery.toLowerCase()) ||
          (p.sku || "").toLowerCase().includes(filters.searchQuery.toLowerCase()) ||
          (p.tags || []).some((t) =>
            (t || "").toLowerCase().includes(filters.searchQuery.toLowerCase()),
          );
        const matchesCategory =
          filters.categoryFilter === "all" || p.category === filters.categoryFilter;
        const matchesStatus = matchesWorkflowFilter(p.workflow, filters.statusFilter);
        const stockStatus = getStockStatus(p);
        const matchesStock = filters.stockFilter === "all" || stockStatus === filters.stockFilter;
        const matchesPriceMin =
          !filters.priceMin || (p.price != null && p.price >= parseFloat(filters.priceMin));
        const matchesPriceMax =
          !filters.priceMax || (p.price != null && p.price <= parseFloat(filters.priceMax));
        const matchesDateFrom =
          !filters.dateFrom || (p.createdAt && new Date(p.createdAt) >= new Date(filters.dateFrom));
        const matchesDateTo =
          !filters.dateTo || (p.createdAt && new Date(p.createdAt) <= new Date(filters.dateTo));
        const matchesTags =
          !filters.tagsFilter ||
          (p.tags || []).some((t) =>
            (t || "").toLowerCase().includes(filters.tagsFilter.toLowerCase()),
          );
        return (
          matchesSearch &&
          matchesCategory &&
          matchesStatus &&
          matchesStock &&
          matchesPriceMin &&
          matchesPriceMax &&
          matchesDateFrom &&
          matchesDateTo &&
          matchesTags
        );
      })
    : products;

  const sortedProducts = hasActiveFilters
    ? [...filteredProducts].sort((a, b) => {
        let cmp = 0;
        switch (sortField) {
          case "name":
            cmp = a.name.localeCompare(b.name, "ar");
            break;
          case "price":
            cmp = a.price - b.price;
            break;
          case "stock":
            cmp = a.stock - b.stock;
            break;
          case "createdAt":
            cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
            break;
          case "updatedAt":
            cmp = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
            break;
        }
        return sortDirection === "asc" ? cmp : -cmp;
      })
    : filteredProducts;

  const totalPages = hasActiveFilters
    ? Math.ceil(sortedProducts.length / itemsPerPage)
    : Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedProducts = hasActiveFilters
    ? sortedProducts.slice(startIndex, startIndex + itemsPerPage)
    : sortedProducts;

  const handleSelectAll = useCallback(() => {
    if (selectAll) {
      clearSelection();
    } else {
      setSelectedProducts(new Set(paginatedProducts.map((p) => p.id)));
      setSelectAll(true);
    }
  }, [clearSelection, selectAll, paginatedProducts]);

  const handleSelectProduct = (productId: string) => {
    const next = new Set(selectedProducts);
    if (next.has(productId)) next.delete(productId);
    else next.add(productId);
    setSelectedProducts(next);
    setSelectAll(paginatedProducts.length > 0 && next.size === paginatedProducts.length);
  };

  const handleBulkVisibility = async (isHidden: boolean) => {
    if (selectedProducts.size === 0) return;
    const actionLabel = isHidden ? 'إخفاء' : 'إظهار';
    if (!confirm(`هل أنت متأكد من ${actionLabel} ${selectedProducts.size} منتج؟`)) return;
    try {
      const r = await apiClient.patch('products/bulk/visibility', {
        productIds: Array.from(selectedProducts),
        isHidden,
      });
      if (r.status === 200 && r.data.success) {
        setProducts((prev) =>
          prev.map((p) =>
            selectedProducts.has(p.id) ? { ...p, isHidden } : p,
          ),
        );
        clearSelection();
        return r.data.data.count;
      }
    } catch (err) {
      console.error('Bulk visibility error:', err);
      throw err;
    }
  };

  const handleBulkDelete = async () => {
    if (selectedProducts.size === 0) return;
    if (!confirm(`هل أنت متأكد من حذف ${selectedProducts.size} منتج؟`)) return;
    try {
      let count = 0;
      for (const id of selectedProducts) {
        const r = await apiClient.delete(`products/${id}`);
        if (r.status === 200 || r.status === 204) count++;
      }
      setProducts((prev) => prev.filter((p) => !selectedProducts.has(p.id)));
      clearSelection();
      return count;
    } catch (err) {
      console.error("Bulk delete error:", err);
      throw err;
    }
  };

  const startQuickEdit = (product: Product) => {
    setEditingProduct(product.id);
    setEditPrice(product.price?.toString() ?? '0');
    setEditStock(product.stock?.toString() ?? '0');
    setEditSku(product.sku ?? '');
  };

  const cancelQuickEdit = () => {
    setEditingProduct(null);
    setEditPrice("");
    setEditStock("");
    setEditSku("");
  };

  const saveQuickEdit = async (productId: string) => {
    try {
      const currentProduct = products.find((product) => product.id === productId);
      const payload: { price: number; stock?: number; sku?: string } = {
        price: parseFloat(editPrice),
      };

      if (canEditProductStock(currentProduct)) {
        payload.stock = parseInt(editStock, 10);
      }

      if (editSku !== (currentProduct?.sku ?? '')) {
        payload.sku = editSku;
      }

      const r = await apiClient.patch(`products/${productId}`, payload);
      if (r.status === 200) {
        const updatedProduct = r.data?.data;
        setProducts((prev) =>
          prev.map((p) =>
            p.id === productId
              ? transformProduct(updatedProduct || { ...p, price: parseFloat(editPrice), stock: parseInt(editStock, 10), sku: editSku }, p)
              : p,
          ),
        );
        cancelQuickEdit();
        return true;
      }
      return false;
    } catch (err) {
      console.error("Quick edit error:", err);
      throw err;
    }
  };

  const handleDuplicate = async (product: Product) => {
    if (duplicatingProductId) return;
    setDuplicatingProductId(product.id);
    try {
      const r = await apiClient.post(`products/${product.id}/duplicate`);
      if (r.status === 200 || r.status === 201) {
        await loadProducts();
        return true;
      }
      return false;
    } catch (err: any) {
      console.error("Duplicate error:", err);
      throw err;
    } finally {
      setDuplicatingProductId(null);
    }
  };

  const handleWorkflowAction = async (
    productId: string,
    action: WorkflowAction,
    rejectionReason?: string | null,
  ) => {
    try {
      setWorkflowLoadingId(productId);
      const response = await apiClient.post(`products/${productId}/workflow`, {
        action,
        rejectionReason: rejectionReason || undefined,
      });
      const updatedProduct = response.data?.data;
      if (response.data?.success && updatedProduct) {
        setProducts((prev) =>
          prev.map((p) =>
            p.id === productId ? transformProduct(updatedProduct, p) : p,
          ),
        );
        return updatedProduct;
      }
      throw new Error(response.data?.message || "فشل في تحديث حالة المنتج");
    } catch (err) {
      console.error("Workflow action error:", err);
      throw err;
    } finally {
      setWorkflowLoadingId(null);
    }
  };

  const handleDelete = async (productId: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا المنتج؟")) return;
    try {
      const r = await apiClient.delete(`products/${productId}`);
      if (r.status === 200 || r.status === 204) {
        setProducts((prev) => prev.filter((p) => p.id !== productId));
        return true;
      }
      return false;
    } catch (err) {
      console.error("Delete error:", err);
      throw err;
    }
  };

  const handleDeleteAll = async () => {
    if (products.length === 0) return;
    const confirmMsg = `هل أنت متأكد من حذف جميع المنتجات؟\n\nسيتم حذف ${products.length} منتج نهائياً.\n\nهذا الإجراء لا يمكن التراجع عنه!`;
    if (!confirm(confirmMsg)) return;
    const secondConfirm = prompt('للتأكيد، اكتب "حذف الكل" في المربع أدناه:');
    if (secondConfirm !== "حذف الكل") return;

    try {
      setIsDeletingAll(true);
      const r = await apiClient.delete("products/bulk/delete");
      if (r.status === 200 && r.data.success) {
        setProducts([]);
        clearSelection();
        return r.data.data;
      }
      throw new Error(r.data.message || "فشل في حذف المنتجات");
    } catch (err) {
      console.error("Delete all error:", err);
      throw err;
    } finally {
      setIsDeletingAll(false);
    }
  };

  const prepareStorefrontContext = useCallback(() => {
    const slug = user?.company?.slug;
    if (slug && slug.trim().length > 0) return;
    const companyId =
      user?.companyId ||
      localStorage.getItem("companyId") ||
      new URLSearchParams(window.location.search).get("companyId");
    if (companyId) localStorage.setItem("storefront_companyId", companyId);
  }, [user?.company?.slug, user?.companyId]);

  const getProductPreviewUrl = useCallback(
    (product: Pick<Product, "id"> | string) => {
      const productId = typeof product === "string" ? product : product.id;
      return buildPreviewPath(productId, companyIdForPreview);
    },
    [companyIdForPreview],
  );

  const getPublicStorefrontUrl = useCallback(
    (product: Pick<Product, "id" | "slug"> | string) => {
      const productKey =
        typeof product === "string" ? product : product.slug || product.id;
      const base = `/product/${encodeURIComponent(productKey)}`;
      const slug = user?.company?.slug;
      const customDomain = user?.company?.customDomain;
      if (slug && slug.trim().length > 0) {
        return buildStoreUrl(
          slug,
          base,
          customDomain || undefined,
          companyIdForPreview,
        );
      }
      const params = new URLSearchParams();
      if (companyIdForPreview) {
        params.set("companyId", companyIdForPreview);
      }
      const query = params.toString();
      return `/store${base}${query ? `?${query}` : ""}`;
    },
    [companyIdForPreview, user?.company?.slug, user?.company?.customDomain],
  );

  const getStorefrontUrl = useCallback(
    (product: Pick<Product, "id" | "slug" | "workflow"> | string) => {
      if (typeof product !== "string" && !isPublishedWorkflow(product.workflow)) {
        return getProductPreviewUrl(product);
      }
      return getPublicStorefrontUrl(product);
    },
    [getProductPreviewUrl, getPublicStorefrontUrl],
  );

  return {
    products,
    isLoading,
    error,
    isDeletingAll,
    duplicatingProductId,
    workflowLoadingId,
    isAdmin,
    isMerchant,
    canSubmitProductReview,
    canCreateProducts,
    canSelectProducts,
    currentPage,
    itemsPerPage,
    totalItems,
    publishedCount,
    sortField,
    sortDirection,
    selectedProducts,
    selectAll,
    editingProduct,
    editPrice,
    editStock,
    editSku,
    filters,
    hasActiveFilters,
    categories,
    allTags,
    sortedProducts,
    totalPages,
    startIndex,
    paginatedProducts,
    setCurrentPage,
    setItemsPerPage,
    handleFilterChange,
    handleSort,
    handleSelectAll,
    handleSelectProduct,
    handleBulkVisibility,
    handleBulkDelete,
    clearSelection,
    resetFilters,
    startQuickEdit,
    cancelQuickEdit,
    setEditPrice,
    setEditStock,
    setEditSku,
    saveQuickEdit,
    handleDuplicate,
    handleWorkflowAction,
    handleDelete,
    handleDeleteAll,
    loadProducts,
    prepareStorefrontContext,
    getStorefrontUrl,
    getProductPreviewUrl,
    getPublicStorefrontUrl,
    setFilters,
  };
};
