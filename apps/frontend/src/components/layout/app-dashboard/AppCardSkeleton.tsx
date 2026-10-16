import React from 'react';
import { Skeleton } from '../../common/Skeleton';

export const AppCardSkeleton: React.FC = () => {
  return (
    <div className="p-3.5 rounded-xl bg-card border border-border/70 shadow-2xs">
      <div className="flex items-start gap-3">
        <Skeleton className="size-9 rounded-lg shrink-0" />
        <div className="min-w-0 flex-1 space-y-2 pt-0.5">
          <Skeleton className="h-4 rounded-md w-2/3" />
          <Skeleton className="h-3 rounded-md w-5/6" />
        </div>
      </div>
    </div>
  );
};

export default AppCardSkeleton;
