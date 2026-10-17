import React from "react";

interface OrdersSkeletonProps {
  variant: "mobile" | "table";
  rowCount?: number;
  columns?: string[];
  showSelect?: boolean;
}

export const OrdersSkeleton: React.FC<OrdersSkeletonProps> = ({
  variant,
  rowCount = variant === "mobile" ? 4 : 5,
  columns = [],
  showSelect = false,
}) => {
  if (variant === "mobile") {
    return (
      <div className="flex flex-col gap-1.5">
        {Array.from({ length: rowCount }).map((_, index) => (
          <div
            key={`mobile-skeleton-${index}`}
            className="flex min-h-[50px] items-center justify-between gap-2 rounded-xl border border-border/70 bg-card/90 px-3 py-2 shadow-xs"
          >
            <div className="flex items-center gap-2">
              {showSelect && <div className="skeleton-shimmer h-4 w-4 rounded" />}
              <div className="skeleton-shimmer h-5 w-24 rounded-lg" />
              <div className="skeleton-shimmer h-3.5 w-16 rounded" />
            </div>
            <div className="flex items-center gap-2">
              <div className="skeleton-shimmer h-4 w-14 rounded" />
              <div className="skeleton-shimmer h-5 w-16 rounded-full" />
              <div className="skeleton-shimmer h-4 w-4 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      {Array.from({ length: rowCount }).map((_, i) => (
        <tr key={`skeleton-${i}`} className="border-b border-border/40">
          {showSelect && (
            <td className="px-3 py-2.5 lg:px-4">
              <div className="skeleton-shimmer h-4 w-4 rounded"></div>
            </td>
          )}
          {columns.map((col) => (
            <td key={col} className="px-3 py-2.5 lg:px-4">
              {col === "orderNumber" && (
                <>
                  <div className="skeleton-shimmer mb-1.5 h-4 w-28 rounded"></div>
                  <div className="skeleton-shimmer h-3 w-20 rounded"></div>
                </>
              )}
              {col === "customer" && (
                <>
                  <div className="skeleton-shimmer mb-1.5 h-4 w-24 rounded"></div>
                  <div className="skeleton-shimmer h-3 w-36 rounded"></div>
                </>
              )}
              {col === "amount" && <div className="skeleton-shimmer h-4 w-16 rounded"></div>}
              {col === "status" && <div className="skeleton-shimmer h-5 w-20 rounded-full"></div>}
              {col === "payment" && <div className="skeleton-shimmer h-5 w-18 rounded-full"></div>}
              {col === "date" && <div className="skeleton-shimmer h-3.5 w-20 rounded"></div>}
              {col === "actions" && <div className="skeleton-shimmer h-7 w-7 rounded-md"></div>}
            </td>
          ))}
        </tr>
      ))}
    </>
  );
};

export default OrdersSkeleton;
