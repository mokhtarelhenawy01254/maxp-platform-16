import React from 'react';
import { Card, CardContent, CardHeader } from '../../components/ui/card';

export const EmployeeCardSkeleton: React.FC = () => (
  <div className="flex items-center gap-4 p-4 border border-border/70 bg-card rounded-xl animate-pulse shadow-xs">
    <div className="w-12 h-12 bg-muted/70 rounded-full shrink-0" />
    <div className="flex-1 space-y-2">
      <div className="h-4 bg-muted/70 rounded w-1/4" />
      <div className="h-3 bg-muted/50 rounded w-1/2" />
    </div>
    <div className="h-8 w-20 bg-muted/70 rounded-lg shrink-0" />
  </div>
);

export const EmployeeTableSkeleton: React.FC = () => (
  <div className="space-y-2 border border-border/70 rounded-xl bg-card overflow-hidden p-2 shadow-xs">
    {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
      <div key={i} className="flex items-center gap-4 p-3 border-b border-border/50 last:border-b-0 animate-pulse">
        <div className="w-9 h-9 bg-muted/70 rounded-full shrink-0" />
        <div className="flex-1 grid grid-cols-5 gap-4">
          <div className="h-3.5 bg-muted/70 rounded" />
          <div className="h-3.5 bg-muted/60 rounded" />
          <div className="h-3.5 bg-muted/60 rounded" />
          <div className="h-3.5 bg-muted/50 rounded" />
          <div className="h-3.5 bg-muted/50 rounded" />
        </div>
        <div className="h-7 w-7 bg-muted/60 rounded-lg shrink-0" />
      </div>
    ))}
  </div>
);

export const AttendanceTableSkeleton: React.FC = () => (
  <div className="space-y-2 border border-border/70 rounded-xl bg-card overflow-hidden p-2 shadow-xs">
    {[1, 2, 3, 4, 5, 6].map((i) => (
      <div key={i} className="flex items-center gap-4 p-3 border-b border-border/50 last:border-b-0 animate-pulse">
        <div className="w-9 h-9 bg-muted/70 rounded-full shrink-0" />
        <div className="flex-1 grid grid-cols-6 gap-4">
          <div className="h-3.5 bg-muted/70 rounded" />
          <div className="h-3.5 bg-muted/60 rounded" />
          <div className="h-3.5 bg-muted/60 rounded" />
          <div className="h-3.5 bg-muted/50 rounded" />
          <div className="h-3.5 bg-muted/50 rounded" />
          <div className="h-3.5 bg-muted/50 rounded" />
        </div>
      </div>
    ))}
  </div>
);

export const StatCardSkeleton: React.FC = () => (
  <Card className="border-border/70 bg-card shadow-xs">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <div className="h-3.5 w-24 bg-muted/70 rounded animate-pulse" />
      <div className="h-4 w-4 bg-muted/50 rounded animate-pulse" />
    </CardHeader>
    <CardContent>
      <div className="h-7 w-16 bg-muted/70 rounded animate-pulse mb-2" />
      <div className="h-3 w-32 bg-muted/50 rounded animate-pulse" />
    </CardContent>
  </Card>
);

export const DashboardSkeleton: React.FC = () => (
  <div className="space-y-5">
    {/* Stats Cards */}
    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
      {[1, 2, 3, 4].map((i) => (
        <StatCardSkeleton key={i} />
      ))}
    </div>

    {/* Main Content */}
    <div className="grid gap-4 md:grid-cols-2">
      <Card className="border-border/70 bg-card shadow-xs">
        <CardHeader>
          <div className="h-5 w-32 bg-muted/70 rounded animate-pulse" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className="w-9 h-9 bg-muted/70 rounded-full shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 bg-muted/70 rounded w-3/4" />
                  <div className="h-3 bg-muted/50 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/70 bg-card shadow-xs">
        <CardHeader>
          <div className="h-5 w-32 bg-muted/70 rounded animate-pulse" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className="w-9 h-9 bg-muted/70 rounded-full shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 bg-muted/70 rounded w-3/4" />
                  <div className="h-3 bg-muted/50 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
);

export const FormSkeleton: React.FC = () => (
  <div className="space-y-3.5 border border-border/70 rounded-xl bg-card p-5 shadow-xs">
    {[1, 2, 3, 4, 5, 6].map((i) => (
      <div key={i} className="space-y-1.5 animate-pulse">
        <div className="h-3.5 w-24 bg-muted/70 rounded" />
        <div className="h-9 bg-muted/50 rounded-xl" />
      </div>
    ))}
  </div>
);
