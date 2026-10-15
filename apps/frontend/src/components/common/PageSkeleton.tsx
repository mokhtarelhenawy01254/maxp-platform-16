import React from "react";
import { Skeleton } from "./Skeleton";

interface PageSkeletonProps {
  sidebar?: boolean;
  header?: boolean;
}

export const PageSkeleton: React.FC<PageSkeletonProps> = ({
  sidebar = true,
  header = true,
}) => {
  const isRtl = typeof document !== "undefined" && document.documentElement.dir === "rtl";

  return (
    <div className="min-h-screen flex bg-white" dir={isRtl ? "rtl" : "ltr"}>
      {sidebar && (
        <div className="w-64 border-r rtl:border-l rtl:border-r-0 border-gray-200 p-4 space-y-3 shrink-0">
          <Skeleton className="h-8 w-32" />
          <div className="space-y-2 pt-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </div>
      )}
      <div className="flex-1 flex flex-col">
        {header && (
          <div className="h-16 border-b border-gray-200 flex items-center px-6 gap-4">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-4 w-48" />
            <div className="flex-1" />
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-8 w-20 rounded-md" />
          </div>
        )}
        <div className="flex-1 p-6 space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-64 w-full rounded-xl" />
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
