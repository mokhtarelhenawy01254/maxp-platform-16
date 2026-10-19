import { useEffect, useMemo, useRef } from "react";
import type { PreparationOrder } from "./types";

export interface UsePreparationFilterDerivedParams {
  serverShortageOwnerOptions: string[];
  preparationOrders: PreparationOrder[];
  shortageHoldDrafts: Record<string, any>;
  activeStage: string;
  selectedWarehouseId: string;
  stockFilter: string;
  shortageReasonFilter: string;
  shortageFollowUpFilter: string;
  shortageOwnerFilter: string;
  deferredSearch: string;
  notPrintedFilter: string;
  noShippingCodeFilter: string;
  sortBy: string;
  sortOrder: string;
  currentCompanyId?: string;
  clearBulkControls: () => void;
}

export function usePreparationFilterDerived({
  serverShortageOwnerOptions,
  preparationOrders,
  shortageHoldDrafts,
  activeStage,
  selectedWarehouseId,
  stockFilter,
  shortageReasonFilter,
  shortageFollowUpFilter,
  shortageOwnerFilter,
  deferredSearch,
  notPrintedFilter,
  noShippingCodeFilter,
  sortBy,
  sortOrder,
  currentCompanyId,
  clearBulkControls,
}: UsePreparationFilterDerivedParams) {
  // إلغاء تحديد طلبات الشركة السابقة عند تبديل الشركة
  useEffect(() => {
    clearBulkControls();
  }, [currentCompanyId, clearBulkControls]);

  const shortageOwnerOptions = useMemo(() => {
    const uniqueOwners = new Set<string>();

    serverShortageOwnerOptions.forEach((owner) => {
      const normalizedOwner = (owner || "").trim();
      if (normalizedOwner) {
        uniqueOwners.add(normalizedOwner);
      }
    });

    preparationOrders.forEach((order) => {
      const effectiveShortageDetails =
        shortageHoldDrafts[order.orderNumber] || order.shortageHoldDetails;
      const owner = effectiveShortageDetails?.owner?.trim();
      if (owner) {
        uniqueOwners.add(owner);
      }
    });

    return [...uniqueOwners].sort((left, right) =>
      left.localeCompare(right, "ar"),
    );
  }, [preparationOrders, serverShortageOwnerOptions, shortageHoldDrafts]);

  const productSuggestions = useMemo(() => {
    const seen = new Set<string>();
    return preparationOrders
      .flatMap((order) =>
        order.itemInsights.map((item) => {
          const key = `${item.displayName}|${item.color || ""}|${item.size || ""}`;
          if (seen.has(key)) return null;
          seen.add(key);
          return {
            displayName: item.displayName,
            color: item.color || "",
            size: item.size || "",
          };
        }),
      )
      .filter((s): s is NonNullable<typeof s> => s !== null);
  }, [preparationOrders]);

  const selectionResetKey = useMemo(
    () =>
      [
        activeStage,
        selectedWarehouseId,
        stockFilter,
        shortageReasonFilter,
        shortageFollowUpFilter,
        (shortageOwnerFilter || "").trim().toLowerCase(),
        (deferredSearch || "").trim().toLowerCase(),
        notPrintedFilter,
        noShippingCodeFilter,
        sortBy,
        sortOrder,
      ].join("|"),
    [
      activeStage,
      deferredSearch,
      selectedWarehouseId,
      shortageFollowUpFilter,
      shortageOwnerFilter,
      shortageReasonFilter,
      notPrintedFilter,
      noShippingCodeFilter,
      sortBy,
      sortOrder,
      stockFilter,
    ],
  );
  const didInitSelectionReset = useRef(false);

  useEffect(() => {
    if (!didInitSelectionReset.current) {
      didInitSelectionReset.current = true;
      return;
    }

    clearBulkControls();
  }, [selectionResetKey, clearBulkControls]);

  return {
    shortageOwnerOptions,
    productSuggestions,
  };
}
