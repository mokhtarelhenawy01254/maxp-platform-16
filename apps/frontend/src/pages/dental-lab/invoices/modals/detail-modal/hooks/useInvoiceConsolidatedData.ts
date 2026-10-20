import { useMemo } from "react";
import type { DentalInvoice } from "../../../../shared";
import type { ConsolidatedData } from "../types";

export function useInvoiceConsolidatedData(invoice: DentalInvoice) {
  const consolidatedData = useMemo<ConsolidatedData | null>(() => {
    if (!invoice.notes) return null;
    try {
      if (invoice.notes.startsWith("{") && invoice.notes.includes('"items"')) {
        const parsed = JSON.parse(invoice.notes);
        if (parsed && (parsed.isConsolidated || Array.isArray(parsed.items))) {
          return parsed as ConsolidatedData;
        }
      }
    } catch {
      return null;
    }
    return null;
  }, [invoice.notes]);

  const items = consolidatedData?.items || [];
  const casesCount = items.length || consolidatedData?.casesCount || 0;
  const totalUnits =
    consolidatedData?.totalUnits ||
    consolidatedData?.summary?.totalUnits ||
    items.reduce((acc, it) => acc + (Number(it.unitsCount) || 1), 0);

  const displayNote = consolidatedData
    ? consolidatedData.title || consolidatedData.note || ""
    : invoice.notes;

  return {
    consolidatedData,
    items,
    casesCount,
    totalUnits,
    displayNote,
  };
}
