import { Skeleton } from "../../components/ui/skeleton";
import DashboardSurfaceCard from "./DashboardSurfaceCard";

export default function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-72" />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <DashboardSurfaceCard key={i}>
            <Skeleton className="mb-2 h-4 w-20" />
            <Skeleton className="h-8 w-28" />
          </DashboardSurfaceCard>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <DashboardSurfaceCard>
          <Skeleton className="mb-4 h-4 w-32" />
          <Skeleton className="h-40 w-full" />
        </DashboardSurfaceCard>
        <DashboardSurfaceCard>
          <Skeleton className="mb-4 h-4 w-32" />
          <Skeleton className="h-40 w-full" />
        </DashboardSurfaceCard>
      </div>
    </div>
  );
}
