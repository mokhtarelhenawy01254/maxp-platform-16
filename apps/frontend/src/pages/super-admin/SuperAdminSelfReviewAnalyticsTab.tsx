import React from "react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import type { ReviewStats } from "../../services/selfReviewService";

interface AnalyticsTabProps {
  stats: ReviewStats | undefined;
  statsLoading: boolean;
  statsError: unknown;
}

export function SuperAdminSelfReviewAnalyticsTab({ stats, statsLoading, statsError }: AnalyticsTabProps) {
  if (statsLoading) {
    return <div className="p-12 flex justify-center"><LoadingSpinner size="lg" /></div>;
  }

  if (statsError) {
    return <Alert variant="destructive"><AlertDescription>خطأ في تحميل الإحصائيات</AlertDescription></Alert>;
  }

  if (!stats) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Top Violations */}
      <div className="rounded-lg border border-border/70 bg-card p-4 space-y-3">
        <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
          <h3 className="text-xs font-semibold text-foreground">
            أبرز مخالفات وتنبيهات التدقيق
          </h3>
          <Badge variant="outline" className="text-[10px] font-mono border-border/70">
            {stats.violations.length} نوع
          </Badge>
        </div>

        {stats.violations.length > 0 ? (
          <div className="space-y-2">
            {stats.violations.slice(0, 10).map((v, i) => (
              <div key={i} className="flex items-center justify-between text-xs py-1.5 border-b border-border/40 last:border-0">
                <span className="text-muted-foreground truncate max-w-[240px]">{v.violation}</span>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                    {v.count}
                  </span>
                  <Badge variant="outline" className="text-[10px] font-mono border-border/60">
                    {v.agent_slug || v.agent_id?.slice(0, 8)}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs font-mono text-muted-foreground py-6 text-center">
            لا توجد مخالفات مسجلة
          </p>
        )}
      </div>

      {/* Agents Summary Table */}
      <div className="rounded-lg border border-border/70 bg-card p-4 space-y-3">
        <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
          <h3 className="text-xs font-semibold text-foreground">
            أداء الوكلاء ومعدلات التصحيح
          </h3>
          <Badge variant="outline" className="text-[10px] font-mono border-border/70">
            {stats.agents.length} وكيل
          </Badge>
        </div>

        {stats.agents.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow className="border-b border-border/60">
                  <TableHead className="text-[10px] font-mono text-muted-foreground">الوكيل</TableHead>
                  <TableHead className="text-center text-[10px] font-mono text-muted-foreground">الكل</TableHead>
                  <TableHead className="text-center text-[10px] font-mono text-emerald-600">معتمد</TableHead>
                  <TableHead className="text-center text-[10px] font-mono text-amber-600">مصحح</TableHead>
                  <TableHead className="text-center text-[10px] font-mono text-rose-600">مرفوض</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.agents.map((a) => (
                  <TableRow key={a.agent_id} className="border-b border-border/40 hover:bg-muted/20">
                    <TableCell className="font-medium text-xs font-mono text-foreground">{a.agent_slug || a.agent_id.slice(0, 10)}</TableCell>
                    <TableCell className="text-center text-xs font-mono tabular-nums">{a.total}</TableCell>
                    <TableCell className="text-center text-xs font-mono tabular-nums text-emerald-600 font-semibold">{a.approved}</TableCell>
                    <TableCell className="text-center text-xs font-mono tabular-nums text-amber-600 font-semibold">{a.corrected}</TableCell>
                    <TableCell className="text-center text-xs font-mono tabular-nums text-rose-600 font-semibold">{a.rejected}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <p className="text-xs font-mono text-muted-foreground py-6 text-center">
            لا توجد بيانات متاحة
          </p>
        )}
      </div>
    </div>
  );
}
