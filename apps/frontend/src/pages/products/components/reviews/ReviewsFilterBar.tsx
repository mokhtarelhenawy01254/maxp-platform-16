import React from "react";
import { useTranslation } from "react-i18next";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { ReviewFiltersState } from "./types";

interface ReviewsFilterBarProps {
  search: string;
  setSearch: (value: string) => void;
  filters: ReviewFiltersState;
  setFilters: React.Dispatch<React.SetStateAction<ReviewFiltersState>>;
}

export const ReviewsFilterBar: React.FC<ReviewsFilterBarProps> = ({
  search,
  setSearch,
  filters,
  setFilters,
}) => {
  const { t } = useTranslation();

  return (
    <div className="bg-card rounded-xl border border-border/70 shadow-xs p-3.5 sm:p-4 mb-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Search */}
        <div className="md:col-span-1">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder={t("productReviews.k_10")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pr-9 pl-3.5 py-2 text-xs border border-border/70 bg-background text-foreground rounded-lg focus:ring-1 focus:ring-primary focus:outline-none placeholder:text-muted-foreground"
            />
          </div>
        </div>

        {/* Status Filter */}
        <div>
          <select
            value={filters.isApproved}
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                isApproved: e.target.value as "all" | "true" | "false",
              }))
            }
            className="w-full px-3 py-2 text-xs border border-border/70 bg-background text-foreground rounded-lg focus:ring-1 focus:ring-primary focus:outline-none"
          >
            <option value="all">{t("productReviews.k_11")}</option>
            <option value="true">{t("productReviews.k_12")}</option>
            <option value="false">{t("productReviews.k_13")}</option>
          </select>
        </div>

        {/* Rating Filter */}
        <div>
          <select
            value={filters.rating}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, rating: e.target.value }))
            }
            className="w-full px-3 py-2 text-xs border border-border/70 bg-background text-foreground rounded-lg focus:ring-1 focus:ring-primary focus:outline-none"
          >
            <option value="">{t("productReviews.k_14")}</option>
            <option value="5">{t("productReviews.k_15")}</option>
            <option value="4">{t("productReviews.k_16")}</option>
            <option value="3">{t("productReviews.k_17")}</option>
            <option value="2">{t("productReviews.k_18")}</option>
            <option value="1">{t("productReviews.k_19")}</option>
          </select>
        </div>
      </div>
    </div>
  );
};
