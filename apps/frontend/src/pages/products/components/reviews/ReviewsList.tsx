import React from "react";
import { useTranslation } from "react-i18next";
import { ReviewItem, ReviewsPagination } from "./types";
import { ReviewCardItem } from "./ReviewCardItem";

interface ReviewsListProps {
  reviews: ReviewItem[];
  loading: boolean;
  selectedReviews: string[];
  pagination: ReviewsPagination;
  setPagination: React.Dispatch<React.SetStateAction<ReviewsPagination>>;
  toggleReview: (id: string) => void;
  handleApprove: (id: string) => void;
  handleReject: (id: string) => void;
  handleDelete: (id: string) => void;
  getProductUrl: (productId: string) => string;
  prepareStorefrontContext: () => void;
}

export const ReviewsList: React.FC<ReviewsListProps> = ({
  reviews,
  loading,
  selectedReviews,
  pagination,
  setPagination,
  toggleReview,
  handleApprove,
  handleReject,
  handleDelete,
  getProductUrl,
  prepareStorefrontContext,
}) => {
  const { t } = useTranslation();

  return (
    <div className="bg-card rounded-xl border border-border/70 shadow-xs overflow-hidden">
      {loading ? (
        <div className="flex justify-center items-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
        </div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-xs">
          {t("productReviews.k_29")}
        </div>
      ) : (
        <div className="divide-y divide-border/60">
          {reviews.map((review) => (
            <ReviewCardItem
              key={review.id}
              review={review}
              isSelected={selectedReviews.includes(review.id)}
              toggleReview={toggleReview}
              handleApprove={handleApprove}
              handleReject={handleReject}
              handleDelete={handleDelete}
              getProductUrl={getProductUrl}
              prepareStorefrontContext={prepareStorefrontContext}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-t border-border/60 bg-muted/20 text-xs font-mono tabular-nums">
          <div className="text-muted-foreground font-sans">
            {t("productReviews.k_31")} {pagination.page} {t("productReviews.k_21")} {pagination.pages}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() =>
                setPagination((prev) => ({ ...prev, page: prev.page - 1 }))
              }
              disabled={pagination.page === 1}
              className="px-3 py-1.5 border border-border/70 rounded-md bg-background text-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-sans"
            >
              {t("productReviews.k_32")}
            </button>
            <button
              onClick={() =>
                setPagination((prev) => ({ ...prev, page: prev.page + 1 }))
              }
              disabled={pagination.page === pagination.pages}
              className="px-3 py-1.5 border border-border/70 rounded-md bg-background text-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-sans"
            >
              {t("productReviews.k_33")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
