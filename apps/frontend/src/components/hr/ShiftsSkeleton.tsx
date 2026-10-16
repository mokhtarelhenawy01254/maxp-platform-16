import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "../common/Skeleton";

interface ShiftsSkeletonProps {
  viewMode?: "grid" | "table";
}

export const ShiftsSkeleton: React.FC<ShiftsSkeletonProps> = ({ viewMode = "grid" }) => {
  if (viewMode === "table") {
    return (
      <Card className="rounded-xl border border-border/70 bg-card shadow-2xs overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-start">
              <thead>
                <tr className="bg-muted/40 border-b border-border/60">
                  <th className="px-4 py-3 text-start"><Skeleton className="h-3 w-16 rounded-md" /></th>
                  <th className="px-4 py-3 text-start"><Skeleton className="h-3 w-24 rounded-md" /></th>
                  <th className="px-4 py-3 text-start"><Skeleton className="h-3 w-16 rounded-md" /></th>
                  <th className="px-4 py-3 text-start"><Skeleton className="h-3 w-16 rounded-md" /></th>
                  <th className="px-4 py-3 text-start"><Skeleton className="h-3 w-12 rounded-md" /></th>
                  <th className="px-4 py-3 text-start"><Skeleton className="h-3 w-16 rounded-md" /></th>
                  <th className="px-4 py-3 text-start"><Skeleton className="h-3 w-12 rounded-md" /></th>
                  <th className="px-4 py-3 text-start"><Skeleton className="h-3 w-20 rounded-md" /></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="hover:bg-muted/20">
                    <td className="px-4 py-3.5"><Skeleton className="h-4 w-20 rounded-md" /></td>
                    <td className="px-4 py-3.5"><Skeleton className="h-4 w-32 rounded-md" /></td>
                    <td className="px-4 py-3.5"><Skeleton className="h-4 w-16 rounded-md" /></td>
                    <td className="px-4 py-3.5"><Skeleton className="h-4 w-16 rounded-md" /></td>
                    <td className="px-4 py-3.5"><Skeleton className="h-4 w-12 rounded-md" /></td>
                    <td className="px-4 py-3.5"><Skeleton className="h-5 w-16 rounded-full" /></td>
                    <td className="px-4 py-3.5"><Skeleton className="h-5 w-12 rounded-full" /></td>
                    <td className="px-4 py-3.5"><Skeleton className="h-7 w-20 rounded-lg" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Grid view skeleton
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i} className="rounded-xl border border-border/70 bg-card p-4 space-y-3 shadow-2xs">
          <div className="flex items-center justify-between gap-2 pb-1">
            <Skeleton className="h-5 w-32 rounded-lg" />
            <Skeleton className="h-5 w-14 rounded-full" />
          </div>

          <div className="space-y-2.5 pt-1">
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-14 rounded-md" />
              <Skeleton className="h-4 w-24 rounded-md" />
            </div>
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-16 rounded-md" />
              <Skeleton className="h-4 w-16 rounded-md" />
            </div>
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-12 rounded-md" />
              <Skeleton className="h-4 w-12 rounded-md" />
            </div>
          </div>

          <div className="pt-3 border-t border-border/60 flex items-center justify-between gap-2">
            <Skeleton className="h-8 w-24 rounded-lg" />
            <Skeleton className="h-8 w-8 rounded-lg" />
          </div>
        </Card>
      ))}
    </div>
  );
};

export default ShiftsSkeleton;
