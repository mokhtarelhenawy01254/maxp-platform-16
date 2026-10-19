import React from "react";
import { ExternalLink, Package, ChevronUp, ChevronDown } from "lucide-react";
import { getOrderStatusDisplay } from "../../../../../utils/statusRegistry";
import { formatRelativeDays } from "../../../utils/customerHistoryHelpers";
import type { CustomerOrderHistoryItem } from "../../../types";

export interface CustomerOrderHistoryCardProps {
  ord: CustomerOrderHistoryItem;
  isCurrent: boolean;
  isExpanded: boolean;
  isArabic: boolean;
  onToggleExpand: () => void;
  onSelectOrder?: (orderId: string) => void;
  formatPrice: (amount: number, currency?: string) => string;
  formatDate: (date: string | Date) => string;
}

export const CustomerOrderHistoryCard: React.FC<CustomerOrderHistoryCardProps> = ({
  ord,
  isCurrent,
  isExpanded,
  isArabic,
  onToggleExpand,
  onSelectOrder,
  formatPrice,
  formatDate,
}) => {
  const statusDisplay = getOrderStatusDisplay({ status: ord.status });
  const items = ord.items || [];

  return (
    <div
      className={`rounded-lg border p-2.5 transition text-[11px] ${
        isCurrent
          ? "border-primary/50 bg-primary/5 ring-1 ring-primary/20"
          : "border-border/60 bg-card hover:border-border"
      }`}
    >
      <div className="flex items-center justify-between gap-1.5">
        <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
          <button
            type="button"
            onClick={() =>
              onSelectOrder
                ? onSelectOrder(ord.orderNumber)
                : window.open(`/orders/${encodeURIComponent(ord.orderNumber)}`, "_blank")
            }
            className="font-mono text-xs font-bold text-primary hover:underline flex items-center gap-0.5"
            title={isArabic ? "عرض تفاصيل هذا الطلب" : "View order details"}
          >
            <span className="font-mono tabular-nums">#{ord.orderNumber}</span>
            <ExternalLink className="h-2.5 w-2.5 opacity-60" />
          </button>

          {isCurrent && (
            <span className="px-1.5 py-0.2 rounded text-[9.5px] font-bold bg-primary/15 text-primary">
              {isArabic ? "الطلب الحالي" : "Current"}
            </span>
          )}

          <span
            className={`px-1.5 py-0.2 rounded text-[10px] font-semibold border ${
              statusDisplay.primary.colorClass ||
              "bg-muted text-muted-foreground border-border/70"
            }`}
          >
            {statusDisplay.primary.label}
          </span>
        </div>

        <span className="font-mono font-bold tabular-nums text-foreground text-xs shrink-0">
          {formatPrice(ord.total, ord.currency || "EGP")}
        </span>
      </div>

      <div className="flex items-center justify-between gap-1.5 mt-1.5 text-[10px] text-muted-foreground">
        <span>
          {ord.createdAt
            ? isArabic
              ? formatRelativeDays(ord.createdAt)
              : formatDate(ord.createdAt)
            : "—"}
        </span>

        {items.length > 0 && (
          <button
            type="button"
            onClick={onToggleExpand}
            className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground py-0.5 px-1 rounded hover:bg-muted/60 transition"
          >
            <Package className="h-3 w-3" />
            <span className="font-mono tabular-nums">
              {ord.itemsCount || items.length} {isArabic ? "منتجات" : "items"}
            </span>
            {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
        )}
      </div>

      {/* Expandable Order Items */}
      {isExpanded && items.length > 0 && (
        <div className="mt-2 pt-2 border-t border-border/40 space-y-1.5">
          {items.map((it, idx) => (
            <div
              key={it.id || idx}
              className="flex items-center gap-2 text-[10px] text-foreground"
            >
              {it.image && (
                <img
                  src={it.image}
                  alt={it.name}
                  className="h-6 w-6 rounded object-cover border border-border/50 shrink-0"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = "none";
                  }}
                />
              )}
              <div className="min-w-0 flex-1 truncate">
                <span className="font-semibold">{it.name}</span>
                {(it.color || it.size) && (
                  <span className="text-muted-foreground text-[9px] ms-1">
                    {[it.color, it.size].filter(Boolean).join(" • ")}
                  </span>
                )}
              </div>
              <span className="font-mono tabular-nums text-muted-foreground shrink-0">
                ×{it.quantity}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
