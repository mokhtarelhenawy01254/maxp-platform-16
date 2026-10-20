import React from "react";
import { useTranslation } from "react-i18next";

export interface IncompleteOrderCustomerCellProps {
  name: string | null;
  cartId: string;
  governorate?: string;
}

export const IncompleteOrderCustomerCell: React.FC<IncompleteOrderCustomerCellProps> = ({
  name,
  cartId,
  governorate,
}) => {
  const { t } = useTranslation();

  return (
    <td className="px-3 py-2.5">
      <div className="flex items-center gap-2.5">
        <div className="h-7 w-7 rounded-full bg-muted/80 flex items-center justify-center text-xs font-semibold text-foreground shrink-0 border border-border/50">
          {name ? name.charAt(0).toUpperCase() : "?"}
        </div>
        <div className="min-w-0">
          <div className="text-xs sm:text-sm font-medium text-foreground truncate max-w-[160px]">
            {name || (
              <span className="text-muted-foreground italic">
                {t("orders.notSpecified")}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-0.5">
            <span
              className="font-mono tabular-nums truncate max-w-[120px]"
              title={cartId}
            >
              {cartId.slice(0, 12)}...
            </span>
            {governorate && (
              <>
                <span className="text-border">·</span>
                <span>{governorate}</span>
              </>
            )}
          </div>
        </div>
      </div>
    </td>
  );
};
