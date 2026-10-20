import React from "react";

export const PreparationOrdersLoadingState: React.FC = React.memo(() => {
  return (
    <div className="space-y-0">
      {[1, 2, 3, 4, 5].map((row) => (
        <div
          key={row}
          className="flex animate-pulse items-center gap-3 border-b border-gray-100 px-4 py-3 dark:border-gray-700"
        >
          <div className="h-4 w-4 rounded bg-gray-200 dark:bg-gray-700" />
          <div className="h-4 w-16 rounded bg-gray-200 dark:bg-gray-700" />
          <div className="h-4 w-24 rounded bg-gray-200 dark:bg-gray-700" />
          <div className="mr-auto h-4 w-20 rounded bg-gray-200 dark:bg-gray-700" />
        </div>
      ))}
    </div>
  );
});

PreparationOrdersLoadingState.displayName = "PreparationOrdersLoadingState";
