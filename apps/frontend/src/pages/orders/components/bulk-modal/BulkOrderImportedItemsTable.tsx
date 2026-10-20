import React from "react";
import { useTranslation } from "react-i18next";
import type { BulkOrderItem } from "./types";

export interface BulkOrderImportedItemsTableProps {
  importedItems: BulkOrderItem[];
}

export const BulkOrderImportedItemsTable: React.FC<BulkOrderImportedItemsTableProps> = React.memo(
  ({ importedItems }) => {
    const { t } = useTranslation();

    if (importedItems.length === 0) return null;

    return (
      <div>
        <h4 className="mb-2 text-xs font-semibold text-foreground font-mono tabular-nums">
          {t("orders.bulkItems")} ({importedItems.length})
        </h4>
        <div className="max-h-48 overflow-y-auto rounded-lg border border-border/70">
          <table className="w-full text-xs">
            <thead className="bg-muted/40">
              <tr>
                <th className="px-2.5 py-2 text-start text-[11px] font-semibold text-muted-foreground">
                  {t("orders.bulkItemCustomer")}
                </th>
                <th className="px-2.5 py-2 text-start text-[11px] font-semibold text-muted-foreground">
                  {t("orders.bulkItemPhone")}
                </th>
                <th className="px-2.5 py-2 text-start text-[11px] font-semibold text-muted-foreground">
                  {t("orders.bulkItemCity")}
                </th>
                <th className="px-2.5 py-2 text-start text-[11px] font-semibold text-muted-foreground">
                  {t("orders.bulkItemArea") || "Area"}
                </th>
                <th className="px-2.5 py-2 text-start text-[11px] font-semibold text-muted-foreground">
                  {t("orders.bulkItemGovernorate")}
                </th>
                <th className="px-2.5 py-2 text-start text-[11px] font-semibold text-muted-foreground">
                  {t("orders.bulkItemProduct")}
                </th>
                <th className="px-2.5 py-2 text-start text-[11px] font-semibold text-muted-foreground">
                  COD
                </th>
                <th className="px-2.5 py-2 text-start text-[11px] font-semibold text-muted-foreground">
                  {t("orders.bulkItemQuantity")}
                </th>
                <th className="px-2.5 py-2 text-start text-[11px] font-semibold text-muted-foreground">
                  {t("orders.bulkItemNotes")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {importedItems.slice(0, 50).map((i, idx) => (
                <tr key={idx} className="hover:bg-muted/20">
                  <td className="px-2.5 py-1.5 text-foreground">
                    {i.customerName || "-"}
                  </td>
                  <td className="px-2.5 py-1.5 text-foreground font-mono tabular-nums">
                    {i.customerPhone || "-"}
                  </td>
                  <td className="px-2.5 py-1.5 text-foreground">
                    {i.city || "-"}
                  </td>
                  <td className="px-2.5 py-1.5 text-foreground">
                    {i.area || "-"}
                  </td>
                  <td className="px-2.5 py-1.5 text-foreground">
                    {i.governorate || "-"}
                  </td>
                  <td className="px-2.5 py-1.5 text-foreground">
                    {i.productName || "-"}
                  </td>
                  <td className="px-2.5 py-1.5 text-foreground font-mono tabular-nums">
                    {Number(i.collectAmount || 0) > 0
                      ? Number(i.collectAmount).toFixed(2)
                      : "-"}
                  </td>
                  <td className="px-2.5 py-1.5 text-foreground font-mono tabular-nums">
                    {i.quantity}
                  </td>
                  <td className="max-w-[80px] truncate px-2.5 py-1.5 text-foreground">
                    {i.notes || "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }
);

BulkOrderImportedItemsTable.displayName = "BulkOrderImportedItemsTable";
