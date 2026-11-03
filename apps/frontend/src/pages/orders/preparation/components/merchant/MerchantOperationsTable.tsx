import React from "react";
import { useTranslation } from "react-i18next";
import {
  STATUS_CLASSES,
  STATUS_LABEL_KEYS,
  toNumber,
  type MerchantOperationRow,
} from "./merchantTypes";

interface MerchantOperationsTableProps {
  rows: MerchantOperationRow[];
  formatPrice: (value: number | null | undefined) => string;
  formatDate: (value: string | Date | number) => string;
}

export const MerchantOperationsTable: React.FC<MerchantOperationsTableProps> = ({
  rows,
  formatPrice,
  formatDate,
}) => {
  const { t } = useTranslation();

  return (
    <div className="overflow-x-auto rounded-xl border border-border/70">
      {/* Desktop Table View */}
      <table className="min-w-full divide-y divide-border/60 text-sm max-sm:hidden">
        <thead className="bg-muted/40 text-muted-foreground font-mono text-[11px] font-semibold uppercase tracking-wider">
          <tr>
            <th className="px-4 py-3 text-right font-medium">{t("merchant.table.order")}</th>
            <th className="px-4 py-3 text-right font-medium">{t("merchant.table.status")}</th>
            <th className="px-4 py-3 text-right font-medium">{t("merchant.table.shipping")}</th>
            <th className="px-4 py-3 text-right font-medium">{t("merchant.table.pieces")}</th>
            <th className="px-4 py-3 text-right font-medium">{t("merchant.table.expected")}</th>
            <th className="px-4 py-3 text-right font-medium">{t("merchant.table.due")}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/40 bg-card">
          {rows.length === 0 ? (
            <tr>
              <td
                className="px-4 py-8 text-center text-muted-foreground"
                colSpan={6}
              >
                {t("merchant.table.noOrders")}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr
                key={row.id}
                className="align-top hover:bg-muted/40 transition-colors"
              >
                <td className="px-4 py-3">
                  <p className="font-mono text-xs font-semibold text-foreground">
                    {row.orderNumber}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {row.customerName} • {formatDate(row.createdAt)}
                  </p>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_CLASSES[row.operationStatus]}`}
                  >
                    {t(STATUS_LABEL_KEYS[row.operationStatus])}
                  </span>
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    {t("merchant.table.merchantOrderStatus", {
                      status: row.merchantOrderStatus || "---",
                    })}
                  </p>
                </td>
                <td className="px-4 py-3 text-foreground">
                  <p className="text-xs font-medium">
                    {row.shippingCompanyName || t("merchant.table.noShippingCompany")}
                  </p>
                  <p className="mt-1 text-xs font-mono tabular-nums text-muted-foreground/70">
                    {row.trackingNumber || row.shipmentStatus || "---"}
                  </p>
                </td>
                <td className="px-4 py-3 font-mono text-xs font-bold tabular-nums text-foreground">
                  {toNumber(row.pieces)}
                </td>
                <td className="px-4 py-3 font-mono text-xs font-semibold tabular-nums text-foreground">
                  {formatPrice(row.expectedAmount)}
                </td>
                <td className="px-4 py-3 font-mono text-xs font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
                  {formatPrice(row.payableAmount)}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* Mobile card view for merchant operations */}
      <div className="divide-y divide-border/60 sm:hidden">
        {rows.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            {t("merchant.table.noOrders")}
          </div>
        ) : (
          rows.map((row) => (
            <div key={row.id} className="space-y-2 px-4 py-3 bg-card">
              <div className="flex items-center justify-between">
                <p className="font-mono text-xs font-bold text-foreground">
                  {row.orderNumber}
                </p>
                <span
                  className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium ${STATUS_CLASSES[row.operationStatus]}`}
                >
                  {t(STATUS_LABEL_KEYS[row.operationStatus])}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {row.customerName} • {formatDate(row.createdAt)}
              </p>
              <div className="grid grid-cols-3 gap-2 pt-1 text-center text-xs">
                <div className="rounded-lg bg-muted/40 px-2 py-1.5">
                  <p className="text-muted-foreground text-[10px]">
                    {t("merchant.table.pieces")}
                  </p>
                  <p className="font-mono text-xs font-bold text-foreground">
                    {toNumber(row.pieces)}
                  </p>
                </div>
                <div className="rounded-lg bg-muted/40 px-2 py-1.5">
                  <p className="text-muted-foreground text-[10px]">
                    {t("merchant.table.expected")}
                  </p>
                  <p className="font-mono text-xs font-semibold text-foreground">
                    {formatPrice(row.expectedAmount)}
                  </p>
                </div>
                <div className="rounded-lg bg-emerald-50 px-2 py-1.5 dark:bg-emerald-950/40">
                  <p className="text-emerald-700 dark:text-emerald-400 text-[10px]">
                    {t("merchant.table.due")}
                  </p>
                  <p className="font-mono text-xs font-bold text-emerald-700 dark:text-emerald-300">
                    {formatPrice(row.payableAmount)}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default MerchantOperationsTable;
