import React from "react";
import { ReviewsHeaderAndStats } from "./components/reviews/ReviewsHeaderAndStats";
import { ReviewsFilterBar } from "./components/reviews/ReviewsFilterBar";
import { ReviewsBulkToolbar } from "./components/reviews/ReviewsBulkToolbar";
import { ReviewsList } from "./components/reviews/ReviewsList";
import { useProductReviewsController } from "./components/reviews/useProductReviewsController";

export const ProductReviewsSimple: React.FC = () => {
  const {
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
    handleApprove,
    handleReject,
    handleDelete,
    toggleSelectAll,
    toggleReview,
    handleBulkAction,
    prepareStorefrontContext,
    getProductUrl,
  } = useProductReviewsController();

  const isAllSelected =
    reviews.length > 0 && selectedReviews.length === reviews.length;

  return (
    <div className="min-h-screen bg-background text-foreground font-sans" dir="rtl">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8 max-w-7xl mx-auto">
        <ReviewsHeaderAndStats
          totalReviews={pagination.total}
          approvedCount={approvedCount}
          pendingCount={pendingCount}
        />

        <ReviewsFilterBar
          search={search}
          setSearch={setSearch}
          filters={filters}
          setFilters={setFilters}
        />

        <ReviewsBulkToolbar
          reviewsCount={reviews.length}
          selectedCount={selectedReviews.length}
          isAllSelected={isAllSelected}
          toggleSelectAll={toggleSelectAll}
          handleBulkAction={handleBulkAction}
        />

        <ReviewsList
          reviews={reviews}
          loading={loading}
          selectedReviews={selectedReviews}
          pagination={pagination}
          setPagination={setPagination}
          toggleReview={toggleReview}
          handleApprove={handleApprove}
          handleReject={handleReject}
          handleDelete={handleDelete}
          getProductUrl={getProductUrl}
          prepareStorefrontContext={prepareStorefrontContext}
        />
      </div>
    </div>
  );
};

export default ProductReviewsSimple;
