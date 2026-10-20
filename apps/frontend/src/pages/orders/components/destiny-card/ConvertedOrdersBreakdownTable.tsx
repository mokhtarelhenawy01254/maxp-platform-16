import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import { useCurrency } from "../../../../hooks/useCurrency";
import { getOrderStatusDisplay } from "../../../../utils/statusRegistry";
import type { ConvertedOrdersDestiny } from "./types";

export interface ConvertedOrdersBreakdownTableProps {
  statusBreakdown?: ConvertedOrdersDestiny["statusBreakdown"];
}

export const ConvertedOrdersBreakdownTable: React.FC<ConvertedOrdersBreakdownTableProps> = React.memo(
  ({ statusBreakdown }) => {
    const { t } = useTranslation();
    const { formatPrice } = useCurrency();
    const [showDetails, setShowDetails] = useState(false);

    if (!statusBreakdown || statusBreakdown.length === 0) {
      return null;
    }

    return (
      <div className="pt-2 border-t border-border/60">
        <button
          type="button"
          onClick={() => setShowDetails((prev) => !prev)}
          className="w-full flex items-center justify-between text-xs font-semibold text-muted-foreground hover:text-foreground py-1 transition-colors cursor-pointer"
        >
          <span className="flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            {t("incompleteStatusBreakdown", "تفصيل الحالات الفعلية")} (
            {statusBreakdown.length})
          </span>
          {showDetails ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </button>

        {showDetails && (
          <div className="mt-2.5 overflow-hidden rounded-lg border border-border/70">
            <table className="w-full text-start text-xs">
              <thead>
                <tr className="bg-muted/40 text-muted-foreground border-b border-border/60">
                  <th className="px-3 py-2 text-start font-semibold">الحالة</th>
                  <th className="px-3 py-2 text-start font-semibold">العدد</th>
                  <th className="px-3 py-2 text-start font-semibold">النسبة</th>
                  <th className="px-3 py-2 text-end font-semibold">القيمة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {statusBreakdown.map((row) => {
                  const statusInfo = getOrderStatusDisplay({
                    status: row.status,
                  });
                  return (
                    <tr key={row.status} className="hover:bg-muted/20">
                      <td className="px-3 py-2">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-medium ${statusInfo.primary.colorClass}`}
                        >
                          {statusInfo.primary.label}
                        </span>
                      </td>
                      <td className="px-3 py-2 font-semibold font-mono tabular-nums text-foreground">
                        {row.count.toLocaleString()}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground font-mono tabular-nums">
                        {row.rate.toFixed(1)}%
                      </td>
                      <td className="px-3 py-2 text-end font-semibold font-mono tabular-nums text-foreground">
                        {formatPrice(row.value)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }
);

ConvertedOrdersBreakdownTable.displayName = "ConvertedOrdersBreakdownTable";
