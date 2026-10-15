import React from "react";
import { ChevronUp, ChevronDown, Package } from "lucide-react";
import { useCurrency } from "../../../hooks/useCurrency";
import {
  FulfillmentProduct,
  SortKey,
  SortDir,
} from "./fulfillmentAnalyticsTypes";

interface ProductFulfillmentTableProps {
  products: FulfillmentProduct[];
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (key: SortKey) => void;
}

function CompositionBar({
  delivered,
  cancelled,
  returned,
  other,
  total,
}: {
  delivered: number;
  cancelled: number;
  returned: number;
  other: number;
  total: number;
}) {
  if (total <= 0) {
    return <div className="w-full h-1.5 rounded-full bg-muted" />;
  }
  const seg = (v: number) => (total > 0 ? Math.max((v / total) * 100, v > 0 ? 2 : 0) : 0);
  return (
    <div className="w-full h-1.5 rounded-full bg-muted flex overflow-hidden">
      {delivered > 0 && (
        <div
          className="h-full bg-emerald-500"
          style={{ width: `${seg(delivered)}%` }}
          title={`تم التسليم: ${delivered}`}
        />
      )}
      {cancelled > 0 && (
        <div
          className="h-full bg-rose-500"
          style={{ width: `${seg(cancelled)}%` }}
          title={`ملغي: ${cancelled}`}
        />
      )}
      {returned > 0 && (
        <div
          className="h-full bg-amber-500"
          style={{ width: `${seg(returned)}%` }}
          title={`مرتجع: ${returned}`}
        />
      )}
      {other > 0 && (
        <div
          className="h-full bg-slate-400"
          style={{ width: `${seg(other)}%` }}
          title={`أخرى: ${other}`}
        />
      )}
    </div>
  );
}

export const ProductFulfillmentTable: React.FC<ProductFulfillmentTableProps> = ({
  products,
  sortKey,
  sortDir,
  onSort,
}) => {
  const { formatPrice } = useCurrency();

  const SortHeader = ({
    colKey,
    label,
    align = "right",
  }: {
    colKey: SortKey;
    label: string;
    align?: "right" | "left" | "center";
  }) => (
    <th
      onClick={() => onSort(colKey)}
      className={`py-2.5 px-3 text-[11px] font-semibold text-muted-foreground cursor-pointer select-none hover:text-foreground transition-colors ${
        align === "left" ? "text-left" : align === "center" ? "text-center" : "text-right"
      }`}
    >
      <div className={`inline-flex items-center gap-1 ${align === "left" ? "flex-row-reverse" : ""}`}>
        <span>{label}</span>
        {sortKey === colKey ? (
          sortDir === "asc" ? (
            <ChevronUp className="h-3 w-3 text-primary" />
          ) : (
            <ChevronDown className="h-3 w-3 text-primary" />
          )
        ) : (
          <span className="w-3" />
        )}
      </div>
    </th>
  );

  return (
    <div className="rounded-lg border border-border/70 bg-card shadow-none overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border/70 bg-muted/30">
              <SortHeader colKey="productName" label="المنتج" />
              <th className="py-2.5 px-3 text-right text-[11px] font-semibold text-muted-foreground">
                توزيع التسليم
              </th>
              <SortHeader colKey="totalItems" label="إجمالي القطع" />
              <SortHeader colKey="deliveredItems" label="مسلّم" />
              <SortHeader colKey="cancelledItems" label="ملغي" />
              <SortHeader colKey="returnedItems" label="مرتجع" />
              <SortHeader colKey="deliveryRate" label="نسبة التسليم" />
              <SortHeader colKey="totalRevenue" label="إجمالي الإيراد" />
              <th className="py-2.5 px-3 text-right text-[11px] font-semibold text-muted-foreground">
                الإيراد المفقود
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40 font-mono tabular-nums">
            {products.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-12 text-center text-muted-foreground font-sans">
                  لا توجد منتجات مطابقة لمعايير الفلترة الحالية.
                </td>
              </tr>
            ) : (
              products.map((p, idx) => (
                <tr key={p.productId || idx} className="hover:bg-muted/30 transition-colors">
                  <td className="py-2.5 px-3 font-sans">
                    <div className="flex items-center gap-2.5">
                      {p.productImage ? (
                        <img
                          src={p.productImage}
                          alt={p.productName}
                          className="h-8 w-8 rounded object-cover border border-border/60 shrink-0"
                        />
                      ) : (
                        <div className="h-8 w-8 rounded bg-muted flex items-center justify-center shrink-0 border border-border/60">
                          <Package className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-medium text-foreground truncate max-w-[200px]">
                          {p.productName}
                        </p>
                        {p.productSku && (
                          <p className="font-mono text-[10px] text-muted-foreground truncate">
                            SKU: {p.productSku}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 min-w-[120px]">
                    <div className="space-y-1">
                      <CompositionBar
                        delivered={p.deliveredItems}
                        cancelled={p.cancelledItems}
                        returned={p.returnedItems}
                        other={p.otherItems}
                        total={p.totalItems}
                      />
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                        <span>{p.deliveredItems} مسلّم</span>
                        <span>{p.cancelledItems + p.returnedItems} مفقود</span>
                      </div>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 font-bold text-foreground">
                    {p.totalItems.toLocaleString()}
                  </td>
                  <td className="py-2.5 px-3 font-semibold text-emerald-600 dark:text-emerald-400">
                    {p.deliveredItems.toLocaleString()}
                  </td>
                  <td className="py-2.5 px-3 font-semibold text-rose-600 dark:text-rose-400">
                    {p.cancelledItems.toLocaleString()}
                  </td>
                  <td className="py-2.5 px-3 font-semibold text-amber-600 dark:text-amber-400">
                    {p.returnedItems.toLocaleString()}
                  </td>
                  <td className="py-2.5 px-3 font-semibold text-foreground">
                    <span
                      className={`inline-block px-1.5 py-0.5 rounded text-[11px] ${
                        p.deliveryRate >= 70
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : p.deliveryRate >= 50
                          ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                          : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                      }`}
                    >
                      {p.deliveryRate.toFixed(1)}%
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-medium text-foreground">
                    {formatPrice(p.totalRevenue)}
                  </td>
                  <td className="py-2.5 px-3 font-medium text-rose-600 dark:text-rose-400">
                    {formatPrice(p.lostRevenue)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ProductFulfillmentTable;
