import React from "react";
import { useTranslation } from "react-i18next";
import { FileSpreadsheet, Loader2 } from "lucide-react";
import type { OrdersFilters } from "../../ordersFilterTypes";
import { useOrdersExport } from "../../hooks/useOrdersExport";

export interface OrdersExportButtonProps {
  filters: OrdersFilters;
}

/**
 * تصدير الطلبات إلى Excel بنفس الفلاتر المطبقة على الشاشة.
 * الزر مستقل عن باقي الأزرار حتى لا يمرّر أي حالة عبر الـcontroller.
 */
export const OrdersExportButton: React.FC<OrdersExportButtonProps> = ({ filters }) => {
  const { t } = useTranslation();
  const { exporting, exportedCount, exportError, exportOrders } = useOrdersExport({ filters });

  const label = exporting
    ? String(t("orders.exportExcelRunning", "جارٍ التصدير…"))
    : String(t("orders.exportExcel", "تصدير Excel"));

  return (
    <div className="relative flex-shrink-0">
      <button
        type="button"
        onClick={() => void exportOrders()}
        disabled={exporting}
        aria-label={label}
        title={exportError || label}
        data-testid="orders-export-button"
        className="inline-flex h-9 sm:h-10 flex-shrink-0 items-center justify-center gap-1.5 rounded-xl border border-border/70 bg-background/80 px-2.5 sm:px-3 text-xs sm:text-sm font-semibold text-foreground transition hover:bg-muted active:scale-[0.97] disabled:cursor-wait disabled:opacity-70 cursor-pointer"
      >
        {exporting ? (
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
        ) : (
          <FileSpreadsheet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
        )}
        <span className="hidden md:inline whitespace-nowrap">
          {exportedCount > 0 && !exporting && !exportError
            ? String(t("orders.exportExcelDone", "تم التصدير ✓"))
            : label}
        </span>
      </button>
      {exportError && (
        <div
          role="status"
          className="absolute end-0 top-full z-20 mt-1 w-max max-w-[280px] rounded-lg border border-amber-300/60 bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-800 shadow-sm dark:border-amber-500/40 dark:bg-amber-950/80 dark:text-amber-200"
        >
          {exportError}
        </div>
      )}
    </div>
  );
};

export default OrdersExportButton;
