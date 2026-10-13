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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../../components/ui/dialog";
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
  Sparkles,
} from "lucide-react";
import { Input } from "../../components/ui/input";
import { cn } from "../../lib/utils";

interface VisualSearchLog {
  id: string;
  companyId: string;
  companyName: string;
  query: string;
  resultsCount: number;
  wasSuccessful: boolean;
  responseTime: number | null;
  intent: string;
  metadata: {
    top_score: number;
    image_present: boolean;
    mime_type: string;
    embedding_provider: string;
  } | null;
  createdAt: string;
}

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
  return "text-rose-600 dark:text-rose-400";
}

const SuperAdminVisualSearchLogs: React.FC = () => {
  const [days, setDays] = useState("7");
  const [companyFilter, setCompanyFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLog, setSelectedLog] = useState<VisualSearchLog | null>(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: [
      "super-admin",
      "visual-search-logs",
      days,
      companyFilter,
      statusFilter,
      page,
    ],
    queryFn: async () => {
      const params: Record<string, string> = {
        days,
        page: String(page + 1),
        pageSize: "25",
      };
      if (companyFilter) params.companyId = companyFilter;
      if (statusFilter) params.status = statusFilter;
      const res = await apiClient.get("/super-admin/ai/visual-search-logs", {
        params,
      });
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
    <div
      dir="rtl"
      className="w-full space-y-4 p-4 md:p-6 max-w-7xl mx-auto"
    >
      {/* Top Header Control Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-border/60 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary border border-primary/20">
              <ImageIcon className="size-5" />
            </div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
              سجل استعلامات البحث بالصورة
            </h1>
            <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground font-mono">
              Visual AI Telemetry
            </span>
          </div>
          <p className="text-xs md:text-sm text-muted-foreground mt-1">
            مراقبة عمليات البحث البصري وتضمينات CLIP ومعدلات دقة المطابقة وزمن الاستجابة عبر المتاجر
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={days}
            onValueChange={(v) => {
              setDays(v);
              setPage(0);
            }}
          >
            <SelectTrigger className="w-[120px] h-8 text-xs bg-background">
              <SelectValue placeholder="الفترة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">آخر 24 ساعة</SelectItem>
              <SelectItem value="7">آخر 7 أيام</SelectItem>
              <SelectItem value="30">آخر 30 يوم</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={statusFilter}
            onValueChange={(v) => {
              setStatusFilter(v);
              setPage(0);
            }}
          >
            <SelectTrigger className="w-[110px] h-8 text-xs bg-background">
              <SelectValue placeholder="الحالة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">كل الحالات</SelectItem>
              <SelectItem value="success">عمليات ناجحة</SelectItem>
              <SelectItem value="failed">عمليات فاشلة</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="h-8 gap-1.5 text-xs font-mono active:scale-[0.98] transition-transform"
          >
            <RefreshCw className={cn("size-3.5", isLoading && "animate-spin")} />
            <span>تحديث</span>
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription className="text-xs">
            فشل تحميل سجل البحث بالصورة. يرجى إعادة المحاولة.
          </AlertDescription>
        </Alert>
      )}

      {/* Telemetry Summary Ribbon */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 rounded-xl border border-border bg-card overflow-hidden divide-y md:divide-y-0 divide-x md:divide-x-reverse divide-border shadow-xs">
          <div className="p-4 space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>إجمالي عمليات البحث</span>
              <Layers className="size-3.5" />
            </div>
            <p className="text-xl md:text-2xl font-bold font-mono tabular-nums text-foreground">
              {summary.total}
            </p>
          </div>

          <div className="p-4 space-y-1">
            <div className="flex items-center justify-between text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              <span>عمليات ناجحة</span>
              <CheckCircle2 className="size-3.5" />
            </div>
            <p className="text-xl md:text-2xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
              {summary.success}
            </p>
          </div>

          <div className="p-4 space-y-1">
            <div className="flex items-center justify-between text-xs text-rose-600 dark:text-rose-400 font-medium">
              <span>عمليات فاشلة</span>
              <XCircle className="size-3.5" />
            </div>
            <p className="text-xl md:text-2xl font-bold font-mono tabular-nums text-rose-600 dark:text-rose-400">
              {summary.failed}
            </p>
          </div>

          <div className="p-4 space-y-1">
            <div className="flex items-center justify-between text-xs text-primary font-medium">
              <span>نسبة الدقة والنجاح</span>
              <Zap className="size-3.5" />
            </div>
            <p className="text-xl md:text-2xl font-bold font-mono tabular-nums text-primary">
              {summary.successRate}%
            </p>
          </div>
        </div>
      )}

      {/* Main Single-Surface Table Chassis */}
      <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
        {/* Search Toolbar */}
        <div className="p-3 md:p-4 border-b border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/20">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              className="pr-8 h-8 text-xs font-mono bg-background"
              placeholder="البحث في الاستعلامات والشركات..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <span className="text-xs font-mono text-muted-foreground self-end sm:self-auto">
            {filtered.length} استعلام مسجل
          </span>
        </div>

        {isLoading ? (
          <div className="flex h-56 items-center justify-center gap-3 text-muted-foreground">
            <LoadingSpinner size="lg" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground space-y-2">
            <ImageIcon className="size-8 text-muted-foreground/40" />
            <p className="text-xs font-medium">لا توجد سجلات بحث بالصورة مطابقة للمحددات</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-border/70 bg-muted/30">
                  <TableHead className="text-right text-[11px] font-mono">الشركة</TableHead>
                  <TableHead className="text-right text-[11px] font-mono">الاستعلام</TableHead>
                  <TableHead className="text-center text-[11px] font-mono">النتائج</TableHead>
                  <TableHead className="text-center text-[11px] font-mono">أعلى تطابق</TableHead>
                  <TableHead className="text-center text-[11px] font-mono">الحالة</TableHead>
                  <TableHead className="text-center text-[11px] font-mono">زمن الاستجابة</TableHead>
                  <TableHead className="text-right text-[11px] font-mono">التاريخ</TableHead>
                  <TableHead className="text-center text-[11px] font-mono w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-border/60">
                {filtered.map((l) => {
                  const meta = l.metadata;
                  const hasImage = meta?.image_present;
                  const embProvider = meta?.embedding_provider;
                  const topScore = meta?.top_score ?? null;

                  return (
                    <TableRow key={l.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="text-xs font-semibold text-foreground">
                        {l.companyName}
                      </TableCell>
                      <TableCell className="text-xs max-w-[220px] truncate text-foreground/90" title={l.query}>
                        {l.query || "—"}
                      </TableCell>
                      <TableCell className="text-xs font-mono text-center tabular-nums">
                        {l.resultsCount}
                      </TableCell>
                      <TableCell className="text-xs font-mono text-center tabular-nums font-semibold">
                        {topScore !== null ? `${(topScore * 100).toFixed(0)}%` : "—"}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="inline-flex items-center gap-1.5">
                          <span
                            className={cn(
                              "px-2 py-0.5 rounded text-[11px] font-semibold border",
                              l.wasSuccessful
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                                : "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800",
                            )}
                          >
                            {l.wasSuccessful ? "ناجح" : "فاشل"}
                          </span>
                          {hasImage && (
                            <span className="p-1 rounded bg-muted text-muted-foreground border border-border/50" title="يحتوي على صورة">
                              <ImageIcon className="size-3" />
                            </span>
                          )}
                          {embProvider === "pseudo" && (
                            <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200">
                              تخميني
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs font-mono text-center tabular-nums" dir="ltr">
                        {l.responseTime != null ? (
                          <span className={cn("font-semibold", latencyColor(l.responseTime))}>
                            {l.responseTime}ms
                          </span>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground tabular-nums">
                        {fmtTime(l.createdAt)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setSelectedLog(l)}
                          className="size-7 rounded-md hover:bg-muted"
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
          <div className="p-3 border-t border-border/70 flex items-center justify-between text-xs font-mono bg-muted/20">
            <span className="text-muted-foreground">
              صفحة {page + 1} من {pagination.totalPages} ({pagination.total} سجل)
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 0}
                onClick={() => setPage(page - 1)}
                className="h-7 text-xs font-mono"
              >
                <ChevronRight className="size-3.5 ml-1" /> السابق
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= pagination.totalPages - 1}
                onClick={() => setPage(page + 1)}
                className="h-7 text-xs font-mono"
              >
                التالي <ChevronLeft className="size-3.5 mr-1" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-lg bg-card text-foreground border-border">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <ImageIcon className="size-4 text-primary" />
              تفاصيل عملية البحث البصري
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              معلومات الاستعلام والبيانات الوصفية ونموذج التضمين
            </DialogDescription>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-3 text-xs pt-2">
              <div className="flex justify-between py-1 border-b border-border/60">
                <span className="text-muted-foreground">الشركة:</span>
                <span className="font-semibold text-foreground">{selectedLog.companyName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/60">
                <span className="text-muted-foreground">الاستعلام:</span>
                <span className="font-semibold text-foreground max-w-[280px] text-left">
                  {selectedLog.query || "—"}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/60 font-mono">
                <span className="text-muted-foreground">عدد النتائج:</span>
                <span className="font-semibold text-foreground tabular-nums">
                  {selectedLog.resultsCount}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/60 font-mono">
                <span className="text-muted-foreground">زمن الاستجابة:</span>
                <span className={cn("font-semibold tabular-nums", selectedLog.responseTime ? latencyColor(selectedLog.responseTime) : "")}>
                  {selectedLog.responseTime ?? "—"}ms
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/60 font-mono">
                <span className="text-muted-foreground">التاريخ:</span>
                <span className="text-foreground">{fmtTime(selectedLog.createdAt)}</span>
              </div>

              {selectedLog.metadata && (
                <div className="pt-2 space-y-2">
                  <p className="font-bold text-foreground">بيانات التضمين والـ AI</p>
                  <div className="flex justify-between py-1 border-b border-border/60 font-mono">
                    <span className="text-muted-foreground">أعلى درجة تطابق:</span>
                    <span className="font-semibold text-foreground tabular-nums">
                      {(selectedLog.metadata.top_score * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border/60">
                    <span className="text-muted-foreground">صورة مرفقة:</span>
                    <span className="font-semibold text-foreground">
                      {selectedLog.metadata.image_present ? "نعم" : "لا"}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border/60 font-mono">
                    <span className="text-muted-foreground">نوع الملف:</span>
                    <span className="text-foreground">{selectedLog.metadata.mime_type || "—"}</span>
                  </div>
                  <div className="flex justify-between py-1 font-mono">
                    <span className="text-muted-foreground">مزود التضمين:</span>
                    <Badge variant="outline" className="font-mono text-xs">
                      {selectedLog.metadata.embedding_provider}
                    </Badge>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SuperAdminVisualSearchLogs;
