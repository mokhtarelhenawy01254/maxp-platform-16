import React from "react";
import { useTranslation } from "react-i18next";
import { getStatusDisplay } from "../../../../utils/statusRegistry";

interface BulkOrderItem {
  id: string;
  orderNumber?: string;
  customerName?: string;
  customerPhone?: string;
  city?: string;
  area?: string;
  governorate?: string;
  address?: string;
  productName?: string;
  sku?: string;
  size?: string;
  color?: string;
  quantity: number;
  price: number;
  total: number;
  collectAmount?: number;
  deliverAmount?: number;
  returnContent?: string;
  status: string;
  notes?: string;
}

interface BulkOrderItemsTableProps {
  items: BulkOrderItem[];
}

const getColorHex = (color: string): string | null => {
  const map: Record<string, string> = {
    black: "#000",
    white: "#fff",
    red: "#ef4444",
    blue: "#3b82f6",
    green: "#22c55e",
    yellow: "#eab308",
    orange: "#f97316",
    purple: "#a855f7",
    pink: "#ec4899",
    gray: "#6b7280",
    grey: "#6b7280",
    brown: "#92400e",
    navy: "#1e3a5f",
    beige: "#f5f0e1",
    gold: "#f59e0b",
    silver: "#cbd5e1",
    أحمر: "#ef4444",
    أزرق: "#3b82f6",
    أخضر: "#22c55e",
    أصفر: "#eab308",
    برتقالي: "#f97316",
    بنفسجي: "#a855f7",
    وردي: "#ec4899",
    أسود: "#000",
    أبيض: "#fff",
    رمادي: "#6b7280",
    بني: "#92400e",
    كحلي: "#1e3a5f",
    ذهبي: "#f59e0b",
    فضي: "#cbd5e1",
  };
  return map[color?.toLowerCase()] || null;
};

export const BulkOrderItemsTable: React.FC<BulkOrderItemsTableProps> = ({ items }) => {
  const { t } = useTranslation();

  const totalQty = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = items.reduce((sum, item) => sum + Number(item.total || 0), 0);
  const totalCOD = items.reduce((sum, item) => sum + Number(item.collectAmount || 0), 0);

  return (
    <div className="bg-card rounded-2xl border border-border/70 shadow-xs overflow-hidden">
      <div className="px-4 py-3 border-b border-border/70 bg-muted/20 flex items-center justify-between">
        <h3 className="text-xs font-bold text-foreground">
          {t("orders.bulkItems")} ({items.length})
        </h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs text-right">
          <thead className="bg-muted/30 border-b border-border/70 text-muted-foreground font-semibold">
            <tr>
              <th className="px-3 py-2.5 whitespace-nowrap">الكود</th>
              <th className="px-3 py-2.5 whitespace-nowrap">{t("orders.bulkItemCustomer")}</th>
              <th className="px-3 py-2.5 whitespace-nowrap">{t("orders.bulkItemCity")}</th>
              <th className="px-3 py-2.5 whitespace-nowrap">{t("orders.bulkItemArea") || "المنطقة"}</th>
              <th className="px-3 py-2.5 whitespace-nowrap">{t("orders.bulkItemGovernorate")}</th>
              <th className="px-3 py-2.5 min-w-[120px] max-w-[180px]">{t("orders.bulkItemAddress") || "العنوان"}</th>
              <th className="px-3 py-2.5 whitespace-nowrap">{t("orders.bulkItemProduct")}</th>
              <th className="px-3 py-2.5 text-center whitespace-nowrap">COD</th>
              <th className="px-3 py-2.5 text-center whitespace-nowrap">{t("orders.bulkItemQuantity")}</th>
              <th className="px-3 py-2.5 text-center whitespace-nowrap">{t("orders.bulkItemPrice")}</th>
              <th className="px-3 py-2.5 text-center whitespace-nowrap">{t("orders.bulkItemTotal")}</th>
              <th className="px-3 py-2.5 whitespace-nowrap">{t("orders.bulkItemSKU")}</th>
              <th className="px-3 py-2.5 whitespace-nowrap">{t("orders.bulkItemSize")}</th>
              <th className="px-3 py-2.5 whitespace-nowrap">{t("orders.bulkItemColor")}</th>
              <th className="px-3 py-2.5 text-center whitespace-nowrap">{t("orders.bulkItemStatus")}</th>
              <th className="px-3 py-2.5 min-w-[80px]">{t("orders.bulkItemNotes")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {items.length === 0 ? (
              <tr>
                <td colSpan={16} className="px-4 py-8 text-center text-xs text-muted-foreground">
                  {t("orders.bulkNoItems")}
                </td>
              </tr>
            ) : (
              items.map((item) => {
                const info = getStatusDisplay(item.status);
                return (
                  <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-3 py-2.5 font-mono text-primary font-bold whitespace-nowrap" dir="ltr">
                      {item.orderNumber || "—"}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <div className="font-semibold text-foreground">{item.customerName || "—"}</div>
                      {item.customerPhone && (
                        <span className="text-[10px] text-muted-foreground font-mono" dir="ltr">
                          {item.customerPhone}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">{item.city || "—"}</td>
                    <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">{item.area || "—"}</td>
                    <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">{item.governorate || "—"}</td>
                    <td className="px-3 py-2.5 text-muted-foreground max-w-[180px] truncate" title={item.address || ""}>
                      {item.address || "—"}
                    </td>
                    <td className="px-3 py-2.5 font-medium text-foreground whitespace-nowrap">{item.productName || "—"}</td>
                    <td className="px-3 py-2.5 text-center font-mono font-bold tabular-nums text-foreground">
                      {Number(item.collectAmount || 0).toFixed(2)}
                    </td>
                    <td className="px-3 py-2.5 text-center font-mono tabular-nums text-foreground">{item.quantity}</td>
                    <td className="px-3 py-2.5 text-center font-mono tabular-nums text-muted-foreground">
                      {Number(item.price).toFixed(2)}
                    </td>
                    <td className="px-3 py-2.5 text-center font-mono font-bold tabular-nums text-foreground">
                      {Number(item.total).toFixed(2)}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-muted-foreground whitespace-nowrap">{item.sku || "—"}</td>
                    <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">{item.size || "—"}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      {item.color ? (
                        <span className="inline-flex items-center gap-1.5">
                          <span
                            className="inline-block w-3 h-3 rounded-full border border-border/70 shrink-0"
                            style={{ backgroundColor: getColorHex(item.color) || "#d1d5db" }}
                          />
                          <span className="text-muted-foreground">{item.color}</span>
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${info.colorClass}`}>
                        {t(info.labelKey) || info.label}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground max-w-[120px] truncate" title={item.notes || ""}>
                      {item.notes || "—"}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {items.length > 0 && (
        <div className="px-4 py-3 border-t border-border/70 bg-muted/20 flex flex-wrap items-center justify-between text-xs font-semibold gap-3">
          <span className="text-muted-foreground">
            {t("orders.bulkItems")}: <span className="font-mono tabular-nums font-bold text-foreground">{items.length}</span>
          </span>
          <div className="flex items-center gap-4 sm:gap-6 font-mono tabular-nums">
            <span className="text-muted-foreground">
              {t("orders.bulkItemQuantity")}: <span className="text-primary font-bold">{totalQty}</span>
            </span>
            <span className="text-muted-foreground">
              {t("orders.bulkItemTotal")}: <span className="text-primary font-bold">{Number(totalPrice).toFixed(2)}</span>
            </span>
            <span className="text-muted-foreground">
              COD: <span className="text-emerald-600 dark:text-emerald-400 font-bold">{Number(totalCOD).toFixed(2)}</span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
