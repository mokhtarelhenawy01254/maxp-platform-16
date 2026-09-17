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
            className="flex min-h-[50px] items-center justify-between gap-2 rounded-xl border border-slate-200/70 bg-white/85 px-3 py-2 shadow-sm dark:border-slate-800/70 dark:bg-slate-900/70"
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
        <tr key={`skeleton-${i}`}>
          {showSelect && (
            <td className="px-3 py-2.5 lg:px-4">
              <div className="skeleton-shimmer h-5 w-5 rounded"></div>
            </td>
          )}
          {columns.map((col) => (
            <td key={col} className="px-3 py-2.5 lg:px-4">
              {col === "orderNumber" && (
                <>
                  <div className="skeleton-shimmer mb-2 h-4 w-32 rounded"></div>
                  <div className="skeleton-shimmer h-3 w-24 rounded"></div>
                </>
              )}
              {col === "customer" && (
                <>
                  <div className="skeleton-shimmer mb-2 h-4 w-20 rounded"></div>
                  <div className="skeleton-shimmer h-3 w-40 rounded"></div>
                </>
              )}
              {col === "amount" && <div className="skeleton-shimmer h-5 w-16 rounded"></div>}
              {col === "status" && <div className="skeleton-shimmer h-5 w-24 rounded-full"></div>}
              {col === "payment" && <div className="skeleton-shimmer h-5 w-20 rounded-full"></div>}
              {col === "date" && <div className="skeleton-shimmer h-4 w-24 rounded"></div>}
              {col === "actions" && <div className="skeleton-shimmer h-8 w-8 rounded"></div>}
            </td>
          ))}
        </tr>
      ))}
    </>
  );
};

export default OrdersSkeleton;
