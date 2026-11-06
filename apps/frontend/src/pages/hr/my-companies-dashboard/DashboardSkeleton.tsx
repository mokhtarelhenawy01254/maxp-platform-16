import React from "react";

export const DashboardSkeleton: React.FC = () => (
  <div className="space-y-5 w-full">
    <div className="h-16 bg-muted rounded-xl animate-pulse" />
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div
          key={i}
          className="h-20 bg-muted rounded-xl animate-pulse"
        />
      ))}
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="h-56 bg-muted rounded-xl animate-pulse"
        />
      ))}
    </div>
  </div>
);
