import { Check as CheckCircleIcon, X as XCircleIcon, Trash2 as TrashIcon, Star as StarIcon, Search as MagnifyingGlassIcon, Circle as StarSolidIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import React, { useState, useEffect, useCallback } from "react";
import { apiClient } from "../../services/apiClient";
import { toast } from "sonner";
import { useAuth } from "../../hooks/useAuthSimple";
import { buildStoreUrl } from "../../utils/storeUrl";
;
;

interface Review {
  id: string;
  productId: string;
  productName?: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  rating: number;
  title?: string;
  comment?: string;
  isApproved: boolean;
  helpfulCount: number;
  createdAt: string;
  media?: Array<{
    id?: string;
    type: "image" | "video";
    url: string;
    poster?: string;
    alt?: string;
  }>;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

const ProductReviewsSimple: React.FC = () => {
  const { t } = useTranslation();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  });
  const [filters, setFilters] = useState({
    isApproved: "all" as "all" | "true" | "false",
    rating: "",
  });
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedReviews, setSelectedReviews] = useState<string[]>([]);

  const fetchReviews = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = {
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

      // استخدام apiClient بدلاً من axios مباشرة
      const response = await apiClient.get("/reviews", { params });

      if (response.data.success) {
        setReviews(response.data.data.reviews || []);
        setPagination((prev) => response.data.data.pagination || prev);
      } else {
        toast.error(t('productReviews.k_1'));
      }
    } catch (error: any) {
      console.error("Error fetching reviews:", error);
      toast.error(error.response?.data?.error || t('productReviews.k_1'));
    } finally {
      setLoading(false);
    }
  }, [
    debouncedSearch,
    filters.isApproved,
    filters.rating,
    pagination.limit,
    pagination.page,
  ]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPagination((prev) => ({ ...prev, page: 1 }));
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch on page/filter/search change
  useEffect(() => {
    void fetchReviews();
  }, [fetchReviews]);

  const handleApprove = async (reviewId: string) => {
    try {
      const response = await apiClient.put(`/reviews/${reviewId}/approve`);
      if (response.data.success) {
        toast.success(t('productReviews.k_2'));
        fetchReviews();
      }
    } catch (error: any) {
      console.error("Error approving review:", error);
      toast.error(
        error.response?.data?.error || t('productReviews.k_3'),
      );
    }
  };

  const handleReject = async (reviewId: string) => {
    try {
      const response = await apiClient.put(`/reviews/${reviewId}/reject`);
      if (response.data.success) {
        toast.success(t('productReviews.k_4'));
        fetchReviews();
      }
    } catch (error: any) {
      console.error("Error rejecting review:", error);
      toast.error(error.response?.data?.error || t('productReviews.k_5'));
    }
  };

  const handleDelete = async (reviewId: string) => {
    if (!window.confirm(t('productReviews.k_6'))) {
      return;
    }

    try {
      const response = await apiClient.delete(`/reviews/${reviewId}`);
      if (response.data.success) {
        toast.success(t('productReviews.k_7'));
        fetchReviews();
      }
    } catch (error: any) {
      console.error("Error deleting review:", error);
      toast.error(error.response?.data?.error || t('productReviews.k_8'));
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) =>
          star <= rating ? (
            <StarSolidIcon key={star} className="h-4 w-4 text-yellow-400" />
          ) : (
            <StarIcon key={star} className="h-4 w-4 text-gray-300" />
          ),
        )}
      </div>
    );
  };

  // Bulk Actions Handlers
  const toggleSelectAll = () => {
    if (selectedReviews.length === reviews.length) {
      setSelectedReviews([]);
    } else {
      setSelectedReviews(reviews.map((r) => r.id));
    }
  };

  const toggleReview = (id: string) => {
    if (selectedReviews.includes(id)) {
      setSelectedReviews((prev) => prev.filter((item) => item !== id));
    } else {
      setSelectedReviews((prev) => [...prev, id]);
    }
  };

  const handleBulkAction = async (action: "approve" | "reject" | "delete") => {
    if (!selectedReviews.length) return;

    if (
      action === "delete" &&
      !window.confirm(t('productReviews.confirm_bulk_delete', { count: selectedReviews.length }))
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
        fetchReviews();
      }
    } catch (error: any) {
      console.error("Error executing bulk action:", error);
      toast.error(error.response?.data?.error || t('productReviews.k_9'));
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ar-EG", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const prepareStorefrontContext = () => {
    const slug = user?.company?.slug;
    if (slug && slug.trim().length > 0) return;

    const companyId =
      user?.companyId ||
      localStorage.getItem("companyId") ||
      new URLSearchParams(window.location.search).get("companyId");

    if (companyId) {
      localStorage.setItem("storefront_companyId", companyId);
    }
  };

  const getProductUrl = (productId: string) => {
    const base = `/shop/products/${productId}`;
    const slug = user?.company?.slug;
    const companyId = user?.companyId || user?.company?.id || null;
    const customDomain = user?.company?.customDomain;

    if (slug && slug.trim().length > 0) {
      return buildStoreUrl(slug, base, customDomain || undefined, companyId);
    }

    return base;
  };

  // Removed client-side filtering: filteredReviews
  // Stats now reflect current page only
  const approvedCount = reviews.filter((r) => r.isApproved).length;
  const pendingCount = reviews.filter((r) => !r.isApproved).length;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {t('productReviews.k_22')}
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            {t('productReviews.k_23')}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
              {t('productReviews.k_24')}
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {pagination.total}
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
              {t('productReviews.k_12')}
            </div>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {approvedCount}
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
              {t('productReviews.k_13')}
            </div>
            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
              {pendingCount}
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="md:col-span-2">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder={t('productReviews.k_10')}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pr-10 pl-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <select
                value={filters.isApproved}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    isApproved: e.target.value as "all" | "true" | "false",
                  })
                }
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              >
                <option value="all">{t('productReviews.k_11')}</option>
                <option value="true">{t('productReviews.k_12')}</option>
                <option value="false">{t('productReviews.k_13')}</option>
              </select>
            </div>

            {/* Rating Filter */}
            <div>
              <select
                value={filters.rating}
                onChange={(e) =>
                  setFilters({ ...filters, rating: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              >
                <option value="">{t('productReviews.k_14')}</option>
                <option value="5">{t('productReviews.k_15')}</option>
                <option value="4">{t('productReviews.k_16')}</option>
                <option value="3">{t('productReviews.k_17')}</option>
                <option value="2">{t('productReviews.k_18')}</option>
                <option value="1">{t('productReviews.k_19')}</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Bulk Actions & Selection Toolbar */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            checked={
              reviews.length > 0 && selectedReviews.length === reviews.length
            }
            onChange={toggleSelectAll}
            disabled={reviews.length === 0}
          />
          <span className="text-gray-700 dark:text-gray-300 font-medium">
            {t('productReviews.k_25')}{selectedReviews.length})
          </span>
        </div>

        {selectedReviews.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleBulkAction("approve")}
              className="flex items-center gap-2 px-3 py-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors text-sm font-medium"
            >
              <CheckCircleIcon className="h-4 w-4" />
              {t('productReviews.k_26')}
            </button>
            <button
              onClick={() => handleBulkAction("reject")}
              className="flex items-center gap-2 px-3 py-1.5 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 transition-colors text-sm font-medium"
            >
              <XCircleIcon className="h-4 w-4" />
              {t('productReviews.k_27')}
            </button>
            <button
              onClick={() => handleBulkAction("delete")}
              className="flex items-center gap-2 px-3 py-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm font-medium"
            >
              <TrashIcon className="h-4 w-4" />
              {t('productReviews.k_28')}
            </button>
          </div>
        )}
      </div>

      {/* Reviews List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            {t('productReviews.k_29')}
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {reviews.map((review) => (
              <div
                key={review.id}
                className={`p-6 transition-colors ${
                  selectedReviews.includes(review.id)
                    ? "bg-indigo-50 dark:bg-indigo-900/20"
                    : "hover:bg-gray-50 dark:hover:bg-gray-700/50"
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="pt-1">
                    <input
                      type="checkbox"
                      className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      checked={selectedReviews.includes(review.id)}
                      onChange={() => toggleReview(review.id)}
                    />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {review.customerName}
                      </h3>
                      {renderStars(review.rating)}
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          review.isApproved
                            ? "bg-green-100 text-green-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {review.isApproved
                          ? t('productReviews.k_12')
                          : t('productReviews.k_13')}
                      </span>
                    </div>

                    {review.productName && (
                      <a
                        href={getProductUrl(review.productId)}
                        onClick={prepareStorefrontContext}
                        className="text-sm text-indigo-600 hover:text-indigo-800 mb-2 block"
                      >
                        {review.productName}
                      </a>
                    )}

                    {review.title && (
                      <h4 className="font-medium text-gray-900 dark:text-white mb-1">
                        {review.title}
                      </h4>
                    )}

                    {review.comment && (
                      <p className="text-gray-700 dark:text-gray-300 text-sm mb-2">
                        {review.comment}
                      </p>
                    )}

                    {Array.isArray(review.media) && review.media.length > 0 && (
                      <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                        {review.media.map((mediaItem, index) => (
                          <div
                            key={mediaItem.id || `${review.id}-media-${index}`}
                            className="overflow-hidden rounded-xl border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900"
                          >
                            {mediaItem.type === "video" ? (
                              <video
                                src={mediaItem.url}
                                poster={mediaItem.poster}
                                controls
                                playsInline
                                className="h-36 w-full bg-black object-cover"
                              />
                            ) : (
                              <img
                                src={mediaItem.url}
                                alt={mediaItem.alt || review.title || review.customerName}
                                className="h-36 w-full object-cover"
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 mt-2">
                      <span>{formatDate(review.createdAt)}</span>
                      {review.customerEmail && (
                        <span>{review.customerEmail}</span>
                      )}
                      {review.customerPhone && (
                        <span>{review.customerPhone}</span>
                      )}
                      <span>{t('productReviews.k_20')}{review.helpfulCount})</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 ml-4">
                    {!review.isApproved && (
                      <button
                        onClick={() => handleApprove(review.id)}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                      >
                        <CheckCircleIcon className="h-4 w-4" />
                        {t('productReviews.k_26')}
                      </button>
                    )}
                    {review.isApproved && (
                      <button
                        onClick={() => handleReject(review.id)}
                        className="flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors text-sm"
                      >
                        <XCircleIcon className="h-4 w-4" />
                        {t('productReviews.k_30')}
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(review.id)}
                      className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                    >
                      <TrashIcon className="h-4 w-4" />
                      {t('productReviews.k_28')}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
            <div className="text-sm text-gray-600">
              {t('productReviews.k_31')} {pagination.page}{t('productReviews.k_21')}{pagination.pages}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() =>
                  setPagination({ ...pagination, page: pagination.page - 1 })
                }
                disabled={pagination.page === 1}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {t('productReviews.k_32')}
              </button>
              <button
                onClick={() =>
                  setPagination({ ...pagination, page: pagination.page + 1 })
                }
                disabled={pagination.page === pagination.pages}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {t('productReviews.k_33')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductReviewsSimple;
