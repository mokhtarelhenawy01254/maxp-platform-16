import { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { apiClient } from "../../../../services/apiClient";
import { useAuth } from "../../../../hooks/useAuthSimple";
import { buildStoreUrl } from "../../../../utils/storeUrl";
import { ReviewItem, ReviewsPagination, ReviewFiltersState } from "./types";

export function useProductReviewsController() {
  const { t } = useTranslation();
  const { user } = useAuth();

  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<ReviewsPagination>({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  });
  const [filters, setFilters] = useState<ReviewFiltersState>({
    isApproved: "all",
    rating: "",
  });
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedReviews, setSelectedReviews] = useState<string[]>([]);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPagination((prev) => ({ ...prev, page: 1 }));
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchReviews = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, string | number> = {
        page: pagination.page,
        limit: pagination.limit,
        search: debouncedSearch,
      };

      if (filters.isApproved !== "all") {
        params.isApproved = filters.isApproved;
      }

      if (filters.rating) {
        params.rating = filters.rating;
      }

      const response = await apiClient.get("/reviews", { params });

      if (response.data.success) {
        setReviews(response.data.data.reviews || []);
        setPagination((prev) => response.data.data.pagination || prev);
      } else {
        toast.error(t("productReviews.k_1"));
      }
    } catch (error: any) {
      console.error("Error fetching reviews:", error);
      toast.error(error.response?.data?.error || t("productReviews.k_1"));
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, filters.isApproved, filters.rating, pagination.limit, pagination.page, t]);

  useEffect(() => {
    void fetchReviews();
  }, [fetchReviews]);

  const handleApprove = useCallback(
    async (reviewId: string) => {
      try {
        const response = await apiClient.put(`/reviews/${reviewId}/approve`);
        if (response.data.success) {
          toast.success(t("productReviews.k_2"));
          void fetchReviews();
        }
      } catch (error: any) {
        console.error("Error approving review:", error);
        toast.error(error.response?.data?.error || t("productReviews.k_3"));
      }
    },
    [fetchReviews, t]
  );

  const handleReject = useCallback(
    async (reviewId: string) => {
      try {
        const response = await apiClient.put(`/reviews/${reviewId}/reject`);
        if (response.data.success) {
          toast.success(t("productReviews.k_4"));
          void fetchReviews();
        }
      } catch (error: any) {
        console.error("Error rejecting review:", error);
        toast.error(error.response?.data?.error || t("productReviews.k_5"));
      }
    },
    [fetchReviews, t]
  );

  const handleDelete = useCallback(
    async (reviewId: string) => {
      if (!window.confirm(t("productReviews.k_6"))) {
        return;
      }

      try {
        const response = await apiClient.delete(`/reviews/${reviewId}`);
        if (response.data.success) {
          toast.success(t("productReviews.k_7"));
          void fetchReviews();
        }
      } catch (error: any) {
        console.error("Error deleting review:", error);
        toast.error(error.response?.data?.error || t("productReviews.k_8"));
      }
    },
    [fetchReviews, t]
  );

  const toggleSelectAll = useCallback(() => {
    if (selectedReviews.length === reviews.length) {
      setSelectedReviews([]);
    } else {
      setSelectedReviews(reviews.map((r) => r.id));
    }
  }, [reviews, selectedReviews.length]);

  const toggleReview = useCallback((id: string) => {
    setSelectedReviews((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }, []);

  const handleBulkAction = useCallback(
    async (action: "approve" | "reject" | "delete") => {
      if (!selectedReviews.length) return;

      if (
        action === "delete" &&
        !window.confirm(
          t("productReviews.confirm_bulk_delete", { count: selectedReviews.length })
        )
      ) {
        return;
      }

      try {
        const response = await apiClient.post("/reviews/bulk-action", {
          action,
          ids: selectedReviews,
        });

        if (response.data.success) {
          toast.success(response.data.message);
          setSelectedReviews([]);
          void fetchReviews();
        }
      } catch (error: any) {
        console.error("Error executing bulk action:", error);
        toast.error(error.response?.data?.error || t("productReviews.k_9"));
      }
    },
    [fetchReviews, selectedReviews, t]
  );

  const prepareStorefrontContext = useCallback(() => {
    const slug = user?.company?.slug;
    if (slug && slug.trim().length > 0) return;

    const companyId =
      user?.companyId ||
      localStorage.getItem("companyId") ||
      new URLSearchParams(window.location.search).get("companyId");

    if (companyId) {
      localStorage.setItem("storefront_companyId", companyId);
    }
  }, [user]);

  const getProductUrl = useCallback(
    (productId: string) => {
      const base = `/shop/products/${productId}`;
      const slug = user?.company?.slug;
      const companyId = user?.companyId || user?.company?.id || null;
      const customDomain = user?.company?.customDomain;

      if (slug && slug.trim().length > 0) {
        return buildStoreUrl(slug, base, customDomain || undefined, companyId);
      }

      return base;
    },
    [user]
  );

  const approvedCount = useMemo(
    () => reviews.filter((r) => r.isApproved).length,
    [reviews]
  );
  const pendingCount = useMemo(
    () => reviews.filter((r) => !r.isApproved).length,
    [reviews]
  );

  return {
    reviews,
    loading,
    pagination,
    setPagination,
    filters,
    setFilters,
    search,
    setSearch,
    selectedReviews,
    approvedCount,
    pendingCount,
    fetchReviews,
    handleApprove,
    handleReject,
    handleDelete,
    toggleSelectAll,
    toggleReview,
    handleBulkAction,
    prepareStorefrontContext,
    getProductUrl,
  };
}
