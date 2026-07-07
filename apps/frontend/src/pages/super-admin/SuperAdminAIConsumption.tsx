import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../services/apiClient";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Button } from "../../components/ui/button";
import { Alert, AlertDescription } from "../../components/ui/alert";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import { Search, RefreshCw, DollarSign, Activity, Building2, AlertTriangle, ChevronLeft, ChevronRight } from "lucide-react";
import { Input } from "../../components/ui/input";

const PAGE_SIZE = 20;

type CompanyConsumption = {
  id: string; name: string; nameEn: string;
  totalRequests: number; successCount: number; failedCount: number;
  totalTokens: number; totalCost: number; totalLatency: number;
  models: Record<string, number>; providers: Record<string, number>;
  lastActivity: string | null;
};

type Summary = {
  totalCost: number; totalRequests: number; activeCompanies: number;
  failedCount: number; errorRate: number; periodDays: number;
};

function CostBar({ cost, max }: { cost: number; max: number }) {
  const pct = max > 0 ? (cost / max) * 100 : 0;
  return (
    <div className="w-full bg-muted rounded-full h-2 overflow-hidden" dir="ltr">
      <div className="h-full rounded-full bg-gradient-to-l from-emerald-500 to-emerald-400 transition-all" style={{ width: `${Math.min(pct, 100)}%` }} />
    </div>
  );
}

function formatMoney(n: number) {
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}k`;
  return `$${n.toFixed(2)}`;
}

function formatNumber(n: number) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return n.toLocaleString();
}

function formatTime(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("ar-EG", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });
}

function SuperAdminAIConsumption() {
  return (
    <div className="p-4 max-w-[1440px] mx-auto">
      <h1 className="text-2xl font-bold mb-4">استهلاك الشركات من الذكاء الاصطناعي</h1>
      <ConsumptionContent />
    </div>
  );
}

function ConsumptionContent() {
  const [days, setDays] = useState("30");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"cost" | "requests" | "tokens" | "name">("cost");
  const [page, setPage] = useState(0);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["super-admin", "ai-consumption", days],
    queryFn: async () => {
      const res = await apiClient.get("/super-admin/ai/company-consumption", { params: { days } });
      return res.data;
    },
    staleTime: 60_000,
  });

  const summary: Summary | null = data?.summary ?? null;
  const modelDistribution: { model: string; count: number; pct: number }[] = data?.modelDistribution ?? [];
  const companies: CompanyConsumption[] = data?.companies ?? [];

  const filtered = useMemo(() => {
    if (!searchTerm) return companies;
    const q = searchTerm.toLowerCase();
    return companies.filter(c => c.name.toLowerCase().includes(q) || c.nameEn.toLowerCase().includes(q));
  }, [companies, searchTerm]);

  const sorted = useMemo(() => {
    const list = [...filtered];
    switch (sortBy) {
      case "cost": list.sort((a, b) => b.totalCost - a.totalCost); break;
      case "requests": list.sort((a, b) => b.totalRequests - a.totalRequests); break;
      case "tokens": list.sort((a, b) => b.totalTokens - a.totalTokens); break;
      case "name": list.sort((a, b) => a.name.localeCompare(b.name)); break;
    }
    return list;
  }, [filtered, sortBy]);

  const paged = useMemo(() => {
    const start = page * PAGE_SIZE;
    return sorted.slice(start, start + PAGE_SIZE);
  }, [sorted, page]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const maxCost = sorted.length > 0 ? Math.max(...sorted.map(c => c.totalCost)) : 0;

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>فشل تحميل بيانات الاستهلاك. يرجى المحاولة مرة أخرى.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input className="pr-9" placeholder="بحث عن شركة..." value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setPage(0); }} />
        </div>
        <Select value={days} onValueChange={(v) => { setDays(v); setPage(0); }}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="الفترة" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">آخر 7 أيام</SelectItem>
            <SelectItem value="30">آخر 30 يوم</SelectItem>
            <SelectItem value="90">آخر 90 يوم</SelectItem>
            <SelectItem value="365">آخر سنة</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="الترتيب" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="cost">حسب التكلفة</SelectItem>
            <SelectItem value="requests">حسب الطلبات</SelectItem>
            <SelectItem value="tokens">حسب التوكنز</SelectItem>
            <SelectItem value="name">حسب الاسم</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" onClick={() => refetch()} title="تحديث">
          <RefreshCw className="size-4" />
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">إجمالي الإنفاق</p>
                    <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                      {summary ? formatMoney(summary.totalCost) : "—"}
                    </p>
                  </div>
                  <div className="size-10 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center">
                    <DollarSign className="size-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">إجمالي الطلبات</p>
                    <p className="text-2xl font-bold">{summary ? formatNumber(summary.totalRequests) : "—"}</p>
                  </div>
                  <div className="size-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                    <Activity className="size-5 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">الشركات النشطة</p>
                    <p className="text-2xl font-bold">{summary?.activeCompanies ?? "—"}</p>
                  </div>
                  <div className="size-10 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                    <Building2 className="size-5 text-purple-600 dark:text-purple-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">نسبة الأخطاء</p>
                    <p className="text-2xl font-bold" style={{ color: (summary?.errorRate ?? 0) > 5 ? "#dc2626" : "#16a34a" }}>
                      {summary ? `${summary.errorRate}%` : "—"}
                    </p>
                  </div>
                  <div className="size-10 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center">
                    <AlertTriangle className="size-5 text-red-600 dark:text-red-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {modelDistribution.length > 0 && (
            <Card className="mb-4">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">توزيع النماذج</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {modelDistribution.slice(0, 8).map((m) => (
                    <div key={m.model} className="flex items-center gap-3">
                      <span className="text-xs font-medium w-36 truncate" title={m.model}>{m.model}</span>
                      <div className="flex-1 bg-muted rounded-full h-2.5 overflow-hidden" dir="ltr">
                        <div className="h-full rounded-full bg-gradient-to-l from-violet-500 to-indigo-400 transition-all" style={{ width: `${m.pct}%` }} />
                      </div>
                      <span className="text-xs text-muted-foreground w-16 text-left" dir="ltr">{m.pct}%</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="border rounded bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الشركة</TableHead>
                  <TableHead className="text-left" dir="ltr">التكلفة</TableHead>
                  <TableHead className="text-left" dir="ltr">الطلبات</TableHead>
                  <TableHead className="text-left" dir="ltr">التوكنز</TableHead>
                  <TableHead>المزود الرئيسي</TableHead>
                  <TableHead>نسبة النجاح</TableHead>
                  <TableHead>آخر نشاط</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      لا توجد بيانات استهلاك
                    </TableCell>
                  </TableRow>
                ) : (
                  paged.map((c) => {
                    const successRate = c.totalRequests > 0 ? Math.round(c.successCount / c.totalRequests * 100) : 0;
                    const topProvider = Object.entries(c.providers).sort((a, b) => b[1] - a[1])[0];
                    return (
                      <TableRow key={c.id}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium text-sm">{c.name}</span>
                            <span className="text-xs text-muted-foreground">{c.nameEn}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-left" dir="ltr">
                          <div className="flex flex-col gap-1 min-w-[120px]">
                            <span className="text-sm font-mono font-semibold">{formatMoney(c.totalCost)}</span>
                            <CostBar cost={c.totalCost} max={maxCost} />
                          </div>
                        </TableCell>
                        <TableCell className="text-left font-mono text-sm" dir="ltr">
                          {formatNumber(c.totalRequests)}
                        </TableCell>
                        <TableCell className="text-left font-mono text-sm text-muted-foreground" dir="ltr">
                          {c.totalTokens > 0 ? formatNumber(c.totalTokens) : "—"}
                        </TableCell>
                        <TableCell>
                          {topProvider ? (
                            <Badge variant="outline" className="text-xs">{topProvider[0]}</Badge>
                          ) : "—"}
                        </TableCell>
                        <TableCell>
                          <Badge className={`text-xs ${successRate >= 95 ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" : successRate >= 80 ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300" : "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"}`}>
                            {successRate}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatTime(c.lastActivity)}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {sorted.length > PAGE_SIZE && (
            <div className="flex items-center justify-center gap-3 mt-4">
              <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>
                <ChevronRight className="size-4 ml-1" /> السابق
              </Button>
              <span className="text-sm text-muted-foreground">
                صفحة {page + 1} من {totalPages} ({sorted.length} شركة)
              </span>
              <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>
                التالي <ChevronLeft className="size-4 mr-1" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default SuperAdminAIConsumption;
