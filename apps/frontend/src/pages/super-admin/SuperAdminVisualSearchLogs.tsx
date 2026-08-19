import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../services/apiClient";
import { Card, CardContent } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "../../components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "../../components/ui/select";
import { Button } from "../../components/ui/button";
import { Alert, AlertDescription } from "../../components/ui/alert";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "../../components/ui/dialog";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import { Check, CheckCircle, ChevronLeft, ChevronRight, Image, Info, RefreshCw, Search, X, XCircle } from 'lucide-react';
import { Input } from "../../components/ui/input";

interface VisualSearchLog {
  id: string; companyId: string; companyName: string;
  query: string; resultsCount: number; wasSuccessful: boolean;
  responseTime: number | null; intent: string;
  metadata: { top_score: number; image_present: boolean; mime_type: string; embedding_provider: string } | null;
  createdAt: string;
}

interface Summary { total: number; success: number; failed: number; successRate: number; }

function fmtTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("ar-EG", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: false,
  });
}

function latencyColor(ms: number) {
  if (ms < 500) return "text-green-600 dark:text-green-400";
  if (ms < 2000) return "text-yellow-600 dark:text-yellow-400";
  return "text-red-600 dark:text-red-400";
}

function SuperAdminVisualSearchLogs() {
  return (
    <div className="p-4 max-w-[1440px] mx-auto">
      <h1 className="text-2xl font-bold mb-4">سجل البحث بالصورة</h1>
      <LogsContent />
    </div>
  );
}

function LogsContent() {
  const [days, setDays] = useState("7");
  const [companyFilter, setCompanyFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLog, setSelectedLog] = useState<VisualSearchLog | null>(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["super-admin", "visual-search-logs", days, companyFilter, statusFilter, page],
    queryFn: async () => {
      const params: Record<string, string> = { days, page: String(page + 1), pageSize: "25" };
      if (companyFilter) params.companyId = companyFilter;
      if (statusFilter) params.status = statusFilter;
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
    return logs.filter((l) =>
      (l.query || "").toLowerCase().includes(q)
      || (l.companyName || "").toLowerCase().includes(q)
    );
  }, [logs, searchQuery]);

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>فشل تحميل سجل البحث بالصورة. يرجى المحاولة مرة أخرى.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div>
      {/* Filters */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input className="pr-9" placeholder="بحث في الاستعلامات..." value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)} />
        </div>
        <Select value={days} onValueChange={(v) => { setDays(v); setPage(0); }}>
          <SelectTrigger className="w-[130px]"><SelectValue placeholder="الفترة" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="1">آخر 24 ساعة</SelectItem>
            <SelectItem value="7">آخر 7 أيام</SelectItem>
            <SelectItem value="30">آخر 30 يوم</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
          <SelectTrigger className="w-[130px]"><SelectValue placeholder="الكل" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">الكل</SelectItem>
            <SelectItem value="success">نجاح</SelectItem>
            <SelectItem value="failed">فشل</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" onClick={() => refetch()} title="تحديث">
          <RefreshCw className="size-4" />
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center min-h-[400px]"><LoadingSpinner size="lg" /></div>
      ) : (
        <>
          {/* Summary Cards */}
          {summary && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">إجمالي عمليات البحث</p>
                      <p className="text-2xl font-bold">{summary.total}</p>
                    </div>
                    <div className="size-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                      <Image className="size-5 text-blue-600 dark:text-blue-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">ناجح</p>
                      <p className="text-2xl font-bold text-green-600 dark:text-green-400">{summary.success}</p>
                    </div>
                    <div className="size-10 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                      <CheckCircle className="size-5 text-green-600 dark:text-green-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">فاشل</p>
                      <p className="text-2xl font-bold text-red-600 dark:text-red-400">{summary.failed}</p>
                    </div>
                    <div className="size-10 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center">
                      <XCircle className="size-5 text-red-600 dark:text-red-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">نسبة النجاح</p>
                      <p className="text-2xl font-bold" style={{ color: summary.successRate >= 70 ? "#16a34a" : summary.successRate >= 40 ? "#ca8a04" : "#dc2626" }}>
                        {summary.successRate}%
                      </p>
                    </div>
                    <div className="size-10 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                      <Info className="size-5 text-purple-600 dark:text-purple-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Logs Table */}
          <div className="border rounded bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الشركة</TableHead>
                  <TableHead>الاستعلام</TableHead>
                  <TableHead>النتائج</TableHead>
                  <TableHead>أعلى تطابق</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>الوقت</TableHead>
                  <TableHead>التاريخ</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      لا توجد نتائج بحث بالصورة
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((l) => {
                    const meta = l.metadata;
                    const hasImage = meta?.image_present;
                    const embProvider = meta?.embedding_provider;
                    const topScore = meta?.top_score ?? null;
                    return (
                      <TableRow key={l.id}>
                        <TableCell className="text-xs font-medium">{l.companyName}</TableCell>
                        <TableCell className="text-xs max-w-[200px] truncate" title={l.query}>
                          {l.query || "—"}
                        </TableCell>
                        <TableCell className="text-xs font-mono">{l.resultsCount}</TableCell>
                        <TableCell className="text-xs font-mono">
                          {topScore !== null ? `${(topScore * 100).toFixed(0)}%` : "—"}
                        </TableCell>
                        <TableCell>
                          <Badge className={`text-xs ${l.wasSuccessful ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" : "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"}`}>
                            {l.wasSuccessful ? "نجاح" : "فشل"}
                          </Badge>
                          {hasImage && <Badge variant="outline" className="text-xs mr-1">🖼</Badge>}
                          {embProvider === "pseudo" && <Badge variant="outline" className="text-xs mr-1 bg-yellow-100 text-yellow-700">تخميني</Badge>}
                        </TableCell>
                        <TableCell className="text-xs font-mono" dir="ltr">
                          {l.responseTime != null ? (
                            <span className={latencyColor(l.responseTime)}>{l.responseTime}ms</span>
                          ) : "—"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{fmtTime(l.createdAt)}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => setSelectedLog(l)}>
                            <Info className="size-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-4">
              <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>
                <ChevronRight className="size-4 ml-1" /> السابق
              </Button>
              <span className="text-sm text-muted-foreground">
                صفحة {page + 1} من {pagination.totalPages} ({pagination.total} سجل)
              </span>
              <Button variant="outline" size="sm" disabled={page >= pagination.totalPages - 1} onClick={() => setPage(page + 1)}>
                التالي <ChevronLeft className="size-4 mr-1" />
              </Button>
            </div>
          )}
        </>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>تفاصيل البحث بالصورة</DialogTitle>
            <DialogDescription>معلومات كاملة عن عملية البحث</DialogDescription>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">الشركة:</span><span className="font-medium">{selectedLog.companyName}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">الاستعلام:</span><span className="font-medium max-w-[300px] text-left">{selectedLog.query || "—"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">عدد النتائج:</span><span className="font-medium">{selectedLog.resultsCount}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">زمن الاستجابة:</span><span className="font-medium">{selectedLog.responseTime ?? "—"}ms</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">التاريخ:</span><span className="font-medium">{fmtTime(selectedLog.createdAt)}</span></div>
              {selectedLog.metadata && (
                <>
                  <hr />
                  <p className="font-semibold">بيانات إضافية</p>
                  <div className="flex justify-between"><span className="text-muted-foreground">أعلى درجة تطابق:</span><span className="font-medium">{(selectedLog.metadata.top_score * 100).toFixed(0)}%</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">صورة موجودة:</span><span className="font-medium">{selectedLog.metadata.image_present ? "نعم" : "لا"}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">نوع الملف:</span><span className="font-medium font-mono text-xs">{selectedLog.metadata.mime_type || "—"}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">مزود التضمين:</span>
                    <Badge className={selectedLog.metadata.embedding_provider === "pseudo" ? "bg-yellow-100 text-yellow-700" : "bg-green-100 text-green-700"}>
                      {selectedLog.metadata.embedding_provider}
                    </Badge>
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default SuperAdminVisualSearchLogs;
