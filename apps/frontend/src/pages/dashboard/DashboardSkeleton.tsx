import { Skeleton } from "../../components/ui/skeleton";

export default function DashboardSkeleton() {
  return (
    <div className="space-y-6" aria-label="Loading dashboard">
      <div className="flex items-end justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-40" />
        </div>
        <Skeleton className="h-9 w-48 rounded-lg" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="col-span-2">
          <div className="p-5 rounded-2xl bg-card border border-border/50">
            <Skeleton className="h-4 w-20 mb-2" />
            <Skeleton className="h-8 w-36 mb-3" />
            <Skeleton className="h-7 w-full" />
          </div>
        </div>
        <div className="p-5 rounded-2xl bg-card border border-border/50">
          <Skeleton className="h-4 w-20 mb-2" />
          <Skeleton className="h-8 w-28" />
        </div>
        <div className="p-5 rounded-2xl bg-card border border-border/50">
          <Skeleton className="h-4 w-20 mb-2" />
          <Skeleton className="h-8 w-24 mb-3" />
          <Skeleton className="h-2 w-full rounded-full" />
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="p-4 rounded-2xl bg-card border border-border/50">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-5 w-20" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <div className="p-6 rounded-2xl bg-card border border-border/50">
            <Skeleton className="h-5 w-32 mb-4" />
            <Skeleton className="h-[280px] w-full rounded-lg" />
          </div>
        </div>
        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-card border border-border/50">
            <Skeleton className="h-4 w-28 mb-3" />
            <div className="space-y-2.5">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
          <div className="p-5 rounded-2xl bg-card border border-border/50">
            <Skeleton className="h-4 w-28 mb-3" />
            <div className="space-y-2.5">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex justify-between">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-3 w-12" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="p-5 rounded-2xl bg-card border border-border/50">
        <Skeleton className="h-4 w-28 mb-4" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
