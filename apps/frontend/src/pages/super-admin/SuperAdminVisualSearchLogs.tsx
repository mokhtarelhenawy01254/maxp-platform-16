import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../services/apiClient";
import { Badge } from "../../components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { Button } from "../../components/ui/button";
import { Alert, AlertDescription } from "../../components/ui/alert";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import {
  Search,
  RefreshCw,
  Image as ImageIcon,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Info,
  Layers,
  Zap,
} from "lucide-react";
import { Input } from "../../components/ui/input";
import { cn } from "../../lib/utils";
import {
  VisualSearchDetailDialog,
  type VisualSearchLog,
} from "./SuperAdminVisualSearchDetailDialog";

interface Summary {
  total: number;
  success: number;
  failed: number;
  successRate: number;
}

function fmtTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("ar-EG", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function latencyColor(ms: number) {
  if (ms < 500) return "text-emerald-600 dark:text-emerald-400";
  if (ms < 2000) return "text-amber-600 dark:text-amber-400";
  return "text-destructive";
}

export default function SuperAdminVisualSearchLogs() {
  const [days, setDays] = useState("7");
  const [statusFilter, setStatusFilter] = useState("ALL_STATUSES");
  const [page, setPage] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLog, setSelectedLog] = useState<VisualSearchLog | null>(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["super-admin", "visual-search-logs", days, statusFilter, page],
    queryFn: async () => {
      const params: Record<string, string> = {
        days,
        page: String(page + 1),
        pageSize: "25",
      };
      if (statusFilter && statusFilter !== "ALL_STATUSES") params.status = statusFilter;
      const res = await apiClient.get("/super-admin/ai/visual-search-logs", { params });
      return res.data;
    },
    staleTime: 15_000,
  });

  const logs: VisualSearchLog[] = data?.data?.logs ?? [];
  const summary: Summary | null = data?.data?.summary ?? null;
  const pagination = data?.data?.pagination ?? null;

  const filtered = useMemo(() => {
    if (!searchQuery) return logs;
    const q = searchQuery.toLowerCase();
    return logs.filter(
      (l) =>
        (l.query || "").toLowerCase().includes(q) ||
        (l.companyName || "").toLowerCase().includes(q),
    );
  }, [logs, searchQuery]);

  return (
    <div dir="rtl" className="w-full max-w-7xl mx-auto p-4 sm:p-6 space-y-4">
      {/* Control bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-border/70">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20">
              <ImageIcon className="size-4" />
            </span>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              سجل استعلامات البحث بالصورة
            </h1>
            <Badge variant="outline" className="text-[11px] font-mono border-border/80 bg-muted/30">
              CLIP Visual AI
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            مراقبة عمليات البحث البصري ومعدلات دقة التضمينات وزمن الاستجابة عبر المتاجر
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Select value={days} onValueChange={(v) => { setDays(v); setPage(0); }}>
            <SelectTrigger className="w-[120px] h-8 text-xs border-border/70 bg-card">
              <SelectValue placeholder="الفترة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1" className="text-xs">آخر 24 ساعة</SelectItem>
              <SelectItem value="7" className="text-xs">آخر 7 أيام</SelectItem>
              <SelectItem value="30" className="text-xs">آخر 30 يوم</SelectItem>
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
            <SelectTrigger className="w-[120px] h-8 text-xs border-border/70 bg-card">
              <SelectValue placeholder="الحالة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL_STATUSES" className="text-xs">كل الحالات</SelectItem>
              <SelectItem value="success" className="text-xs">عمليات ناجحة</SelectItem>
              <SelectItem value="failed" className="text-xs">عمليات فاشلة</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="h-8 px-2.5 text-xs gap-1.5 border-border/70 active:scale-[0.98]"
          >
            <RefreshCw className={cn("size-3.5", isLoading && "animate-spin")} />
            <span>تحديث</span>
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="border-destructive/30">
          <AlertDescription className="text-xs">فشل تحميل سجل البحث بالصورة. يرجى إعادة المحاولة.</AlertDescription>
        </Alert>
      )}

      {/* Telemetry Summary Ribbon */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
          <div className="p-3 rounded-lg border border-border/70 bg-card/60 flex items-center justify-between">
            <div>
              <p className="text-[11px] text-muted-foreground">إجمالي عمليات البحث</p>
              <p className="text-xl font-bold tracking-tight text-foreground font-mono tabular-nums mt-0.5">{summary.total}</p>
            </div>
            <div className="size-7 rounded-md bg-muted/40 flex items-center justify-center text-muted-foreground">
              <Layers className="size-3.5" />
            </div>
          </div>

          <div className="p-3 rounded-lg border border-border/70 bg-card/60 flex items-center justify-between">
            <div>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400">عمليات ناجحة</p>
              <p className="text-xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 font-mono tabular-nums mt-0.5">{summary.success}</p>
            </div>
            <div className="size-7 rounded-md bg-emerald-500/10 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="size-3.5" />
            </div>
          </div>

          <div className="p-3 rounded-lg border border-border/70 bg-card/60 flex items-center justify-between">
            <div>
              <p className="text-[11px] text-destructive">عمليات فاشلة</p>
              <p className="text-xl font-bold tracking-tight text-destructive font-mono tabular-nums mt-0.5">{summary.failed}</p>
            </div>
            <div className="size-7 rounded-md bg-destructive/10 flex items-center justify-center text-destructive">
              <XCircle className="size-3.5" />
            </div>
          </div>

          <div className="p-3 rounded-lg border border-border/70 bg-card/60 flex items-center justify-between">
            <div>
              <p className="text-[11px] text-primary">نسبة النجاح والدقة</p>
              <p className="text-xl font-bold tracking-tight text-primary font-mono tabular-nums mt-0.5">{summary.successRate}%</p>
            </div>
            <div className="size-7 rounded-md bg-primary/10 flex items-center justify-center text-primary">
              <Zap className="size-3.5" />
            </div>
          </div>
        </div>
      )}

      {/* Main Single-Surface Table Chassis */}
      <div className="rounded-lg border border-border/70 bg-card overflow-hidden">
        {/* Search Toolbar */}
        <div className="p-2.5 border-b border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-muted/20">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              className="pr-8 h-8 text-xs font-mono bg-background border-border/60"
              placeholder="البحث في الاستعلامات والشركات..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <span className="text-[11px] font-mono tabular-nums text-muted-foreground self-end sm:self-auto">
            {filtered.length} استعلام مسجل
          </span>
        </div>

        {isLoading ? (
          <div className="flex h-56 items-center justify-center gap-3 text-muted-foreground">
            <LoadingSpinner size="lg" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground space-y-2">
            <ImageIcon className="size-8 text-muted-foreground/30" />
            <p className="text-xs">لا توجد سجلات بحث بالصورة مطابقة للمحددات</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow className="border-b border-border/70 hover:bg-transparent">
                  <TableHead className="text-right text-[11px] font-mono text-muted-foreground">الشركة</TableHead>
                  <TableHead className="text-right text-[11px] font-mono text-muted-foreground">الاستعلام</TableHead>
                  <TableHead className="text-center text-[11px] font-mono text-muted-foreground">النتائج</TableHead>
                  <TableHead className="text-center text-[11px] font-mono text-muted-foreground">أعلى تطابق</TableHead>
                  <TableHead className="text-center text-[11px] font-mono text-muted-foreground">الحالة</TableHead>
                  <TableHead className="text-center text-[11px] font-mono text-muted-foreground">زمن الاستجابة</TableHead>
                  <TableHead className="text-right text-[11px] font-mono text-muted-foreground">التاريخ</TableHead>
                  <TableHead className="text-center text-[11px] font-mono w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((l) => {
                  const meta = l.metadata;
                  const hasImage = meta?.image_present;
                  const topScore = meta?.top_score ?? null;

                  return (
                    <TableRow key={l.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors text-xs">
                      <TableCell className="font-medium text-foreground">{l.companyName}</TableCell>
                      <TableCell className="max-w-[200px] truncate text-muted-foreground" title={l.query}>
                        {l.query || "—"}
                      </TableCell>
                      <TableCell className="font-mono text-center tabular-nums">{l.resultsCount}</TableCell>
                      <TableCell className="font-mono text-center tabular-nums font-semibold">
                        {topScore !== null ? `${(topScore * 100).toFixed(0)}%` : "—"}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="inline-flex items-center gap-1">
                          <span
                            className={cn(
                              "px-1.5 py-0.5 rounded text-[10px] font-medium border",
                              l.wasSuccessful
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                                : "bg-destructive/10 text-destructive border-destructive/20",
                            )}
                          >
                            {l.wasSuccessful ? "ناجح" : "فاشل"}
                          </span>
                          {hasImage && (
                            <span className="p-1 rounded bg-muted/60 text-muted-foreground" title="صورة مرفقة">
                              <ImageIcon className="size-3" />
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-center tabular-nums" dir="ltr">
                        {l.responseTime != null ? (
                          <span className={cn("font-medium", latencyColor(l.responseTime))}>
                            {l.responseTime}ms
                          </span>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-[11px] text-muted-foreground tabular-nums">
                        {fmtTime(l.createdAt)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setSelectedLog(l)}
                          className="size-7 rounded hover:bg-muted"
                          title="عرض التفاصيل"
                        >
                          <Info className="size-3.5 text-muted-foreground" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Pagination Bar */}
        {pagination && pagination.totalPages > 1 && (
          <div className="p-2.5 border-t border-border/70 flex items-center justify-between text-xs font-mono bg-muted/20">
            <span className="text-muted-foreground tabular-nums">
              صفحة {page + 1} من {pagination.totalPages} ({pagination.total} سجل)
            </span>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 0}
                onClick={() => setPage(page - 1)}
                className="h-7 text-xs font-mono border-border/70"
              >
                <ChevronRight className="size-3.5 ml-1" /> السابق
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= pagination.totalPages - 1}
                onClick={() => setPage(page + 1)}
                className="h-7 text-xs font-mono border-border/70"
              >
                التالي <ChevronLeft className="size-3.5 mr-1" />
              </Button>
            </div>
          </div>
        )}
      </div>

      <VisualSearchDetailDialog
        log={selectedLog}
        onClose={() => setSelectedLog(null)}
        fmtTime={fmtTime}
        latencyColor={latencyColor}
      />
    </div>
  );
}
