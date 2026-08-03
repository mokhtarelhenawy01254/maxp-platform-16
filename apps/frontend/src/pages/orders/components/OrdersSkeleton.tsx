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
      <>
        {Array.from({ length: rowCount }).map((_, index) => (
          <div
            key={`mobile-skeleton-${index}`}
            className="mb-4 rounded-[26px] border border-slate-200/70 bg-white/85 p-4 shadow-sm dark:border-slate-700/70 dark:bg-slate-900/70"
          >
            <div className="mb-4 flex items-start justify-between">
              <div className="space-y-2">
                <div className="skeleton-shimmer h-4 w-28 rounded-full" />
                <div className="skeleton-shimmer h-5 w-40 rounded-full" />
              </div>
              <div className="skeleton-shimmer h-6 w-6 rounded-md" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="skeleton-shimmer h-16 rounded-2xl" />
              <div className="skeleton-shimmer h-16 rounded-2xl" />
            </div>
          </div>
        ))}
      </>
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
