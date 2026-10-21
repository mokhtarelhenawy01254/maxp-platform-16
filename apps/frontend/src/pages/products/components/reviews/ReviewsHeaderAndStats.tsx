import React from "react";
import { useTranslation } from "react-i18next";

interface ReviewsHeaderAndStatsProps {
  totalReviews: number;
  approvedCount: number;
  pendingCount: number;
}

export const ReviewsHeaderAndStats: React.FC<ReviewsHeaderAndStatsProps> = ({
  totalReviews,
  approvedCount,
  pendingCount,
}) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-5 mb-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-1 tracking-tight">
          {t("productReviews.k_22")}
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground">
          {t("productReviews.k_23")}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="bg-card rounded-xl border border-border/70 shadow-xs p-4">
          <div className="text-xs text-muted-foreground mb-1 font-medium">
            {t("productReviews.k_24")}
          </div>
          <div className="text-2xl font-bold text-foreground font-mono tabular-nums">
            {totalReviews}
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border/70 shadow-xs p-4">
          <div className="text-xs text-muted-foreground mb-1 font-medium">
            {t("productReviews.k_12")}
          </div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
            {approvedCount}
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border/70 shadow-xs p-4">
          <div className="text-xs text-muted-foreground mb-1 font-medium">
            {t("productReviews.k_13")}
          </div>
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 font-mono tabular-nums">
            {pendingCount}
          </div>
        </div>
      </div>
    </div>
  );
};
