import React from 'react';

const AppCardSkeleton: React.FC = () => {
  return (
    <div className="p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-200/50 dark:border-gray-700/50 animate-pulse">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-gray-200 dark:bg-gray-700 shrink-0" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
          <div className="h-3 bg-gray-100 dark:bg-gray-700/50 rounded w-5/6" />
        </div>
      </div>
    </div>
  );
};

export default AppCardSkeleton;
