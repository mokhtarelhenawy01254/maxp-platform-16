import { useEffect } from "react";
import type {
  PreparationOrder,
  PreparationQueuePagination,
  PreparationQueueSummary,
  StageCounts,
} from "./types";

export interface UsePreparationDerivedStateParams {
  summary: PreparationQueueSummary;
  pagination: PreparationQueuePagination;
  preparationOrders: PreparationOrder[];
  clampPage: (totalPages: number) => void;
}

export interface UsePreparationDerivedStateReturn {
  stageCounts: StageCounts;
  totalPages: number;
  enrichedOrders: PreparationOrder[];
  visibleOrdersCount: number;
  currentPageCount: number;
  allOverdueShortageFollowUpCount: number;
  allOverdueProblemFollowUpCount: number;
}

export function usePreparationDerivedState({
  summary,
  pagination,
  preparationOrders,
  clampPage,
}: UsePreparationDerivedStateParams): UsePreparationDerivedStateReturn {
  const stageCounts = summary.stageCounts;
  const totalPages = Math.max(1, pagination.pages);
  // NOTE: server-side pagination already ran; this is just the inventory-enriched
  // version of the current page's orders — not a client-side slice.
  const enrichedOrders = preparationOrders;
  const visibleOrdersCount = summary.filteredTotal;
  const currentPageCount = enrichedOrders.length;
  const allOverdueShortageFollowUpCount = summary.allOverdueShortageFollowUpCount;
  const allOverdueProblemFollowUpCount = summary.allOverdueProblemFollowUpCount;

  useEffect(() => {
    clampPage(totalPages);
  }, [totalPages, clampPage]);

  return {
    stageCounts,
    totalPages,
    enrichedOrders,
    visibleOrdersCount,
    currentPageCount,
    allOverdueShortageFollowUpCount,
    allOverdueProblemFollowUpCount,
  };
}
