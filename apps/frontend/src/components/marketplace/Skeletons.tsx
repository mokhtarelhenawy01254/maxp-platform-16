import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

export function AppCardSkeleton({ variant = "default" }: { variant?: "default" | "compact" | "featured" }) {
  if (variant === "featured") {
    return (
      <div className="flex flex-col gap-4 rounded-2xl border border-border/15 bg-card/40 p-5 backdrop-blur-sm animate-pulse">
        <div className="flex items-center gap-4">
          <Skeleton className="size-12 shrink-0 rounded-xl" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4 rounded-md" />
            <Skeleton className="h-3 w-1/2 rounded-md" />
          </div>
        </div>
        <Skeleton className="h-4 w-full rounded-md" />
        <Skeleton className="h-3 w-2/3 rounded-md" />
        <div className="flex gap-2 mt-2">
          <Skeleton className="h-6 w-16 rounded-lg" />
          <Skeleton className="h-6 w-16 rounded-lg" />
          <Skeleton className="h-6 w-16 rounded-lg" />
        </div>
        <div className="flex items-center justify-between mt-auto pt-2">
          <Skeleton className="h-5 w-14 rounded-lg" />
          <Skeleton className="h-7 w-20 rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "flex rounded-2xl border border-border/15 bg-card/40 p-4 backdrop-blur-sm animate-pulse",
      variant === "compact" ? "items-center gap-3" : "flex-col gap-3"
    )}>
      <Skeleton className="size-10 shrink-0 rounded-xl" />
      <div className={cn("min-w-0 flex-1 space-y-2", variant === "compact" && "space-y-1.5")}>
        <Skeleton className="h-4 w-3/4 rounded-md" />
        {variant !== "compact" && <Skeleton className="h-3.5 w-full rounded-md" />}
        <div className="flex items-center justify-between gap-2">
          <Skeleton className="h-3.5 w-12 rounded-md" />
          <Skeleton className="h-7 w-14 shrink-0 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

export function HeroBannerSkeleton() {
  return (
    <div className="mp-hero-banner animate-pulse">
      <div className="flex flex-col lg:flex-row items-center gap-6 lg:gap-10 min-h-[280px] lg:min-h-[300px] p-6 lg:p-10">
        <div className="flex-1 min-w-0 text-center lg:text-right space-y-4">
          <Skeleton className="h-5 w-24 rounded-full mx-auto lg:mr-0" />
          <Skeleton className="h-10 w-3/4 rounded-lg mx-auto lg:mr-0" />
          <Skeleton className="h-5 w-full rounded-lg mx-auto lg:mr-0" />
          <Skeleton className="h-5 w-2/3 rounded-lg mx-auto lg:mr-0" />
          <Skeleton className="h-10 w-32 rounded-xl mx-auto lg:mr-0" />
        </div>
        <Skeleton className="size-28 lg:size-32 rounded-3xl shrink-0" />
      </div>
    </div>
  );
}

export function SectionSkeleton({ count = 5 }: { count?: number }) {
  return (
    <section className="mp-section-row">
      <div className="mp-section-header-v2">
        <Skeleton className="h-5 w-40 rounded-md" />
      </div>
      <div className="flex gap-3 overflow-hidden">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="mp-section-card-wrapper">
            <AppCardSkeleton variant="featured" />
          </div>
        ))}
      </div>
    </section>
  );
}

export function StatCardsSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 mb-6">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-border/15 bg-card/40 p-4 animate-pulse">
          <Skeleton className="h-4 w-10 rounded-md mb-2" />
          <Skeleton className="h-7 w-12 rounded-lg" />
        </div>
      ))}
    </div>
  );
}
