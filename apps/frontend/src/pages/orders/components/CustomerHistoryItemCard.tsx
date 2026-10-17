import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  ExternalLink,
  ChevronDown,
  ShoppingBag,
  Package,
} from "lucide-react";
import type { CustomerOrderHistoryItem } from "../types";
import { getOrderStatusDisplay } from "../../../utils/statusRegistry";
import { formatRelativeDays } from "../utils/customerHistoryHelpers";

interface CustomerHistoryItemCardProps {
  ord: CustomerOrderHistoryItem;
  formatPrice: (amount: number | null | undefined, currencyCode?: string) => string;
  formatDate: (date: Date | string | number) => string;
}

export const CustomerHistoryItemCard: React.FC<CustomerHistoryItemCardProps> = ({
  ord,
  formatPrice,
  formatDate,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const statusDisplay = getOrderStatusDisplay({ status: ord.status });
  const items = ord.items || [];

  return (
    <div
      className={`rounded-xl border transition ${
        ord.isCurrentOrder
          ? "border-primary/40 bg-primary/5"
          : "border-border/70 bg-card hover:border-border"
      } p-3`}
    >
      {/* Order Top Row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-wrap">
          <Link
            to={`/orders/${encodeURIComponent(ord.orderNumber)}`}
            className="font-mono text-xs font-bold text-primary hover:underline flex items-center gap-1 group tabular-nums"
            title="فتح صفحة هذا الطلب"
          >
            <span>#{ord.orderNumber}</span>
            <ExternalLink className="h-3 w-3 opacity-60 group-hover:opacity-100 shrink-0" />
          </Link>

          {ord.isCurrentOrder && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-primary/10 text-primary">
              الطلب الحالي
            </span>
          )}

          <span
            className={`px-2 py-0.5 rounded text-[11px] font-medium border ${
              statusDisplay.primary.colorClass ||
              "bg-muted text-muted-foreground border-border/70"
            }`}
          >
            {statusDisplay.primary.label}
          </span>
        </div>

        <span className="text-xs font-bold font-mono tabular-nums text-foreground shrink-0">
          {formatPrice(ord.total)}
        </span>
      </div>

      {/* Date & Items Row */}
      <div className="flex items-center justify-between gap-2 mt-2 text-[11px] text-muted-foreground">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="font-mono tabular-nums">
            {ord.createdAt ? formatDate(ord.createdAt) : "—"}
          </span>
          {ord.createdAt && (
            <span className="text-muted-foreground/80 text-[10px]">
              ({formatRelativeDays(ord.createdAt)})
            </span>
          )}
        </div>

        {items.length > 0 && (
          <button
            type="button"
            onClick={() => setIsExpanded((prev) => !prev)}
            className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition active:scale-97 py-0.5 px-1.5 rounded hover:bg-muted"
          >
            <Package className="h-3.5 w-3.5 text-muted-foreground" />
            <span>
              {ord.itemsCount || items.length}{" "}
              {(ord.itemsCount || items.length) === 1 ? "منتج" : "منتجات"}
            </span>
            <ChevronDown
              className={`h-3 w-3 transition-transform ${
                isExpanded ? "rotate-180" : ""
              }`}
            />
          </button>
        )}
      </div>

      {/* Expandable Items Details */}
      {isExpanded && items.length > 0 && (
        <div className="mt-2.5 pt-2.5 border-t border-border/60 space-y-1.5">
          {items.map((it, idx) => (
            <div
              key={it.id || idx}
              className="flex items-center justify-between gap-2 text-xs py-1 px-1.5 rounded bg-muted/40"
            >
              <div className="flex items-center gap-2 min-w-0">
                {it.image ? (
                  <img
                    src={it.image}
                    alt={it.name}
                    className="h-7 w-7 rounded object-cover border border-border/70 shrink-0"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = "none";
                    }}
                  />
                ) : (
                  <div className="h-7 w-7 rounded bg-muted flex items-center justify-center shrink-0 text-muted-foreground">
                    <ShoppingBag className="h-3.5 w-3.5" />
                  </div>
                )}
                <div className="min-w-0 truncate">
                  <span className="font-medium text-foreground block truncate">
                    {it.name}
                  </span>
                  {(it.color || it.size) && (
                    <span className="text-[10px] text-muted-foreground block truncate">
                      {[it.color, it.size].filter(Boolean).join(" / ")}
                    </span>
                  )}
                </div>
              </div>

              <div className="text-right shrink-0 font-mono tabular-nums text-muted-foreground text-[11px]">
                <span>{it.quantity} × </span>
                <span className="font-semibold text-foreground">
                  {formatPrice(it.price)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
