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
  id: string; name: string;
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
    <div className="space-y-4">
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
    return companies.filter(c => c.name.toLowerCase().includes(q));
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
      <Alert variant="destructive" className="rounded-xl border-destructive/30">
        <AlertDescription className="text-xs font-mono">فشل تحميل بيانات الاستهلاك المركزي للذكاء الاصطناعي. يرجى المحاولة لاحقاً.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono uppercase bg-primary/10 text-primary border border-primary/20">
              <Activity className="h-3 w-3" />
              الذكاء الاصطناعي المركزي
            </span>
            <span className="text-xs text-muted-foreground font-mono">/ ai-consumption</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            استهلاك الشركات من الذكاء الاصطناعي
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            متابعة إجمالي الإنفاق، حجم التوكنز، ونسب النجاح عبر نماذج ومزودي الذكاء الاصطناعي
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select value={days} onValueChange={(v) => { setDays(v); setPage(0); }}>
            <SelectTrigger className="w-[130px] h-8 text-xs font-mono">
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
            <SelectTrigger className="w-[130px] h-8 text-xs font-mono">
              <SelectValue placeholder="الترتيب" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cost">حسب التكلفة</SelectItem>
              <SelectItem value="requests">حسب الطلبات</SelectItem>
              <SelectItem value="tokens">حسب التوكنز</SelectItem>
              <SelectItem value="name">حسب الاسم</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" size="sm" onClick={() => refetch()} className="h-8 text-xs font-mono gap-1.5">
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>تحديث</span>
          </Button>
        </div>
      </div>

      {/* Telemetry Ribbon */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        <div className="rounded-xl border border-border/70 bg-card p-3 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-mono text-muted-foreground uppercase">إجمالي الإنفاق</span>
            <div className="text-xl font-bold font-mono tabular-nums text-emerald-500 mt-0.5">
              {summary ? formatMoney(summary.totalCost) : "—"}
            </div>
          </div>
          <div className="h-8 w-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
            <DollarSign className="h-4 w-4" />
          </div>
        </div>

        <div className="rounded-xl border border-border/70 bg-card p-3 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-mono text-muted-foreground uppercase">إجمالي الطلبات</span>
            <div className="text-xl font-bold font-mono tabular-nums text-foreground mt-0.5">
              {summary ? formatNumber(summary.totalRequests) : "—"}
            </div>
          </div>
          <div className="h-8 w-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
            <Activity className="h-4 w-4" />
          </div>
        </div>

        <div className="rounded-xl border border-border/70 bg-card p-3 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-mono text-muted-foreground uppercase">الشركات النشطة</span>
            <div className="text-xl font-bold font-mono tabular-nums text-foreground mt-0.5">
              {summary?.activeCompanies ?? "—"} <span className="text-xs font-normal text-muted-foreground">شركة</span>
            </div>
          </div>
          <div className="h-8 w-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500">
            <Building2 className="h-4 w-4" />
          </div>
        </div>

        <div className="rounded-xl border border-border/70 bg-card p-3 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-mono text-muted-foreground uppercase">نسبة الأخطاء</span>
            <div className="text-xl font-bold font-mono tabular-nums mt-0.5" style={{ color: (summary?.errorRate ?? 0) > 5 ? "var(--destructive)" : "#10b981" }}>
              {summary ? `${summary.errorRate}%` : "—"}
            </div>
          </div>
          <div className="h-8 w-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
            <AlertTriangle className="h-4 w-4" />
          </div>
        </div>
      </div>

      {/* Model Distribution Bento Strip */}
      {modelDistribution.length > 0 && (
        <div className="rounded-xl border border-border/80 bg-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-mono uppercase tracking-wider text-muted-foreground">توزيع الاستهلاك عبر النماذج</h3>
            <span className="text-[11px] font-mono text-muted-foreground">{modelDistribution.length} نماذج مستخدمة</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {modelDistribution.slice(0, 6).map((m) => (
              <div key={m.model} className="rounded-lg border border-border/50 bg-muted/20 p-2.5 space-y-1.5">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="font-semibold text-foreground truncate">{m.model}</span>
                  <span className="text-muted-foreground tabular-nums">{m.pct}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden" dir="ltr">
                  <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${m.pct}%` }} />
                </div>
                <div className="text-[11px] text-muted-foreground font-mono tabular-nums">
                  {formatNumber(m.count)} طلب
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          className="pr-9 h-9 text-xs font-mono bg-card"
          placeholder="تصفية واستعلام الشركات بالاسم..."
          value={searchTerm}
          onChange={(e) => { setSearchTerm(e.target.value); setPage(0); }}
        />
      </div>

      {/* Single Surface Table Chassis */}
      {isLoading ? (
        <div className="flex items-center justify-center min-h-[300px] rounded-xl border border-border/80 bg-card">
          <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
            <LoadingSpinner size="sm" />
            <span>جاري استدعاء سجلات الاستهلاك المركزي...</span>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-border/80 bg-card overflow-hidden shadow-xs">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow className="border-border/60 hover:bg-transparent">
                <TableHead className="font-mono text-xs">الشركة</TableHead>
                <TableHead className="text-left font-mono text-xs" dir="ltr">التكلفة (USD)</TableHead>
                <TableHead className="text-left font-mono text-xs" dir="ltr">الطلبات</TableHead>
                <TableHead className="text-left font-mono text-xs" dir="ltr">التوكنز</TableHead>
                <TableHead className="font-mono text-xs">المزوّد الرئيسي</TableHead>
                <TableHead className="font-mono text-xs">نسبة النجاح</TableHead>
                <TableHead className="font-mono text-xs">آخر نشاط</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paged.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-10 font-mono text-xs">
                    لا توجد بيانات استهلاك مطابقة لخيارات البحث
                  </TableCell>
                </TableRow>
              ) : (
                paged.map((c) => {
                  const successRate = c.totalRequests > 0 ? Math.round(c.successCount / c.totalRequests * 100) : 0;
                  const topProvider = Object.entries(c.providers).sort((a, b) => b[1] - a[1])[0];
                  return (
                    <TableRow key={c.id} className="border-border/60 hover:bg-muted/20 transition-colors">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                            {c.name.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <span className="font-semibold text-xs text-foreground block truncate">{c.name}</span>
                            <span className="text-[11px] font-mono text-muted-foreground">ID: #{c.id.substring(0, 6)}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-left" dir="ltr">
                        <div className="flex flex-col gap-1 min-w-[110px]">
                          <span className="text-xs font-mono font-bold text-foreground tabular-nums">{formatMoney(c.totalCost)}</span>
                          <CostBar cost={c.totalCost} max={maxCost} />
                        </div>
                      </TableCell>
                      <TableCell className="text-left font-mono text-xs tabular-nums text-foreground" dir="ltr">
                        {formatNumber(c.totalRequests)}
                      </TableCell>
                      <TableCell className="text-left font-mono text-xs tabular-nums text-muted-foreground" dir="ltr">
                        {c.totalTokens > 0 ? formatNumber(c.totalTokens) : "—"}
                      </TableCell>
                      <TableCell>
                        {topProvider ? (
                          <Badge variant="outline" className="text-[11px] font-mono">{topProvider[0]}</Badge>
                        ) : "—"}
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono font-medium border ${
                          successRate >= 95
                            ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                            : successRate >= 80
                              ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                              : "bg-destructive/10 text-destructive border-destructive/20"
                        }`}>
                          <span className="h-1.5 w-1.5 rounded-full bg-current" />
                          {successRate}%
                        </span>
                      </TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground tabular-nums">
                        {formatTime(c.lastActivity)}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>

          {sorted.length > PAGE_SIZE && (
            <div className="flex items-center justify-between p-3 border-t border-border/60 bg-muted/10">
              <span className="text-xs font-mono text-muted-foreground">
                صفحة {page + 1} من {totalPages} ({sorted.length} شركة)
              </span>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)} className="h-7 text-xs font-mono">
                  <ChevronRight className="size-3.5 ml-1" /> السابق
                </Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)} className="h-7 text-xs font-mono">
                  التالي <ChevronLeft className="size-3.5 mr-1" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default SuperAdminAIConsumption;
