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
    <div className="min-h-screen flex bg-background text-foreground" dir={isRtl ? "rtl" : "ltr"}>
      {sidebar && (
        <div className="hidden md:flex w-60 border-r rtl:border-l rtl:border-r-0 border-border/60 p-4 flex-col gap-3 shrink-0 bg-card/50">
          <Skeleton className="h-7 w-28 rounded-lg" />
          <div className="space-y-2 pt-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full rounded-lg" />
            ))}
          </div>
        </div>
      )}
      <div className="flex-1 flex flex-col min-w-0">
        {header && (
          <div className="h-14 border-b border-border/60 flex items-center px-4 sm:px-6 gap-3 bg-card/30">
            <Skeleton className="size-8 rounded-lg" />
            <Skeleton className="h-4 w-40 rounded-md" />
            <div className="flex-1" />
            <Skeleton className="size-8 rounded-lg" />
            <Skeleton className="h-8 w-20 rounded-lg" />
          </div>
        )}
        <div className="flex-1 p-4 sm:p-6 space-y-5">
          <div className="space-y-2">
            <Skeleton className="h-7 w-52 rounded-lg" />
            <Skeleton className="h-4 w-80 rounded-md" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-border/60 p-4 space-y-3 bg-card/40">
                <Skeleton className="h-4 w-24 rounded-md" />
                <Skeleton className="h-8 w-32 rounded-lg" />
                <Skeleton className="h-3 w-40 rounded-md" />
              </div>
            ))}
          </div>
          <div className="rounded-xl border border-border/60 p-4 bg-card/40">
            <Skeleton className="h-56 w-full rounded-lg" />
          </div>
          <div className="space-y-2.5">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-11 w-full rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PageSkeleton;
