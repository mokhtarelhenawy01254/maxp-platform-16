import React from "react";
import { useTranslation } from "react-i18next";
import { useDateFormat } from "../../../../hooks/useDateFormat";
import {
  CheckCircleIcon,
  XCircleIcon,
  TrashIcon,
  StarIcon as StarOutlineIcon,
} from "@heroicons/react/24/outline";
import { StarIcon as StarSolidIcon } from "@heroicons/react/24/solid";
import { ReviewItem } from "./types";

interface ReviewCardItemProps {
  review: ReviewItem;
  isSelected: boolean;
  toggleReview: (id: string) => void;
  handleApprove: (id: string) => void;
  handleReject: (id: string) => void;
  handleDelete: (id: string) => void;
  getProductUrl: (productId: string) => string;
  prepareStorefrontContext: () => void;
}

export const ReviewCardItem: React.FC<ReviewCardItemProps> = ({
  review,
  isSelected,
  toggleReview,
  handleApprove,
  handleReject,
  handleDelete,
  getProductUrl,
  prepareStorefrontContext,
}) => {
  const { t } = useTranslation();
  const { formatDate } = useDateFormat();

  const renderStars = (rating: number) => (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) =>
        star <= rating ? (
          <StarSolidIcon key={star} className="h-3.5 w-3.5 text-amber-400" />
        ) : (
          <StarOutlineIcon key={star} className="h-3.5 w-3.5 text-muted-foreground/40" />
        )
      )}
    </div>
  );

  return (
    <div
      className={`p-4 sm:p-5 transition-colors text-xs ${
        isSelected
          ? "bg-primary/5"
          : "hover:bg-muted/20"
      }`}
    >
      <div className="flex items-start gap-3.5">
        <div className="pt-0.5">
          <input
            type="checkbox"
            className="w-4 h-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
            checked={isSelected}
            onChange={() => toggleReview(review.id)}
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <h3 className="font-semibold text-foreground text-sm">
              {review.customerName}
            </h3>
            {renderStars(review.rating)}
            <span
              className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${
                review.isApproved
                  ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                  : "bg-amber-500/10 text-amber-600 border border-amber-500/20"
              }`}
            >
              {review.isApproved
                ? t("productReviews.k_12")
                : t("productReviews.k_13")}
            </span>
          </div>

          {review.productName && (
            <a
              href={getProductUrl(review.productId)}
              onClick={prepareStorefrontContext}
              className="text-xs text-primary hover:underline mb-1.5 inline-block font-medium"
            >
              {review.productName}
            </a>
          )}

          {review.title && (
            <h4 className="font-semibold text-foreground mb-1">
              {review.title}
            </h4>
          )}

          {review.comment && (
            <p className="text-muted-foreground leading-relaxed mb-2.5">
              {review.comment}
            </p>
          )}

          {Array.isArray(review.media) && review.media.length > 0 && (
            <div className="mb-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3 max-w-lg">
              {review.media.map((mediaItem, index) => (
                <div
                  key={mediaItem.id || `${review.id}-media-${index}`}
                  className="overflow-hidden rounded-lg border border-border/70 bg-muted/30"
                >
                  {mediaItem.type === "video" ? (
                    <video
                      src={mediaItem.url}
                      poster={mediaItem.poster}
                      controls
                      playsInline
                      className="h-28 w-full bg-black object-cover"
                    />
                  ) : (
                    <img
                      src={mediaItem.url}
                      alt={mediaItem.alt || review.title || review.customerName}
                      className="h-28 w-full object-cover"
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground pt-1 border-t border-border/50 font-mono tabular-nums">
            <span className="font-sans">{formatDate(review.createdAt)}</span>
            {review.customerEmail && <span>{review.customerEmail}</span>}
            {review.customerPhone && <span>{review.customerPhone}</span>}
            <span className="font-sans">
              {t("productReviews.k_20")}{review.helpfulCount})
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5 shrink-0">
          {!review.isApproved ? (
            <button
              onClick={() => handleApprove(review.id)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors text-xs font-semibold shadow-xs"
              title={t("productReviews.k_26")}
            >
              <CheckCircleIcon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t("productReviews.k_26")}</span>
            </button>
          ) : (
            <button
              onClick={() => handleReject(review.id)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-amber-600 text-white rounded-md hover:bg-amber-700 transition-colors text-xs font-semibold shadow-xs"
              title={t("productReviews.k_30")}
            >
              <XCircleIcon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t("productReviews.k_30")}</span>
            </button>
          )}

          <button
            onClick={() => handleDelete(review.id)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-xs font-semibold shadow-xs"
            title={t("productReviews.k_28")}
          >
            <TrashIcon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t("productReviews.k_28")}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
