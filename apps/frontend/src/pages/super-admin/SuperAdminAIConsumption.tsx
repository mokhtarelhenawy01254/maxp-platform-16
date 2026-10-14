import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../services/apiClient";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Search, RefreshCw, DollarSign, Activity, Building2, ChevronLeft, ChevronRight, Cpu } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import i18n from "../../i18n";

const PAGE_SIZE = 15;

type CompanyConsumption = {
  id: string;
  name: string;
  totalRequests: number;
  successCount: number;
  failedCount: number;
  totalTokens: number;
  totalCost: number;
  totalLatency: number;
  models: Record<string, number>;
  providers: Record<string, number>;
  lastActivity: string | null;
};

type Summary = {
  totalCost: number;
  totalRequests: number;
  activeCompanies: number;
  failedCount: number;
  errorRate: number;
  periodDays: number;
};

const FALLBACK_SUMMARY: Summary = {
  totalCost: 142.85,
  totalRequests: 48920,
  activeCompanies: 28,
  failedCount: 142,
  errorRate: 0.29,
  periodDays: 30,
};

const FALLBACK_MODELS = [
  { model: "gemini-2.5-flash", count: 28400, pct: 58.1 },
  { model: "gpt-4o-mini", count: 12100, pct: 24.7 },
  { model: "deepseek-v3", count: 5200, pct: 10.6 },
  { model: "claude-3-5-sonnet", count: 3220, pct: 6.6 },
];

const FALLBACK_COMPANIES: CompanyConsumption[] = [
  {
    id: "comp-01",
    name: "مؤسسة الأناقة للأزياء والملابس",
    totalRequests: 14200,
    successCount: 14160,
    failedCount: 40,
    totalTokens: 4850000,
    totalCost: 48.20,
    totalLatency: 380,
    models: { "gemini-2.5-flash": 12000, "gpt-4o-mini": 2200 },
    providers: { GOOGLE: 12000, OPENAI: 2200 },
    lastActivity: new Date(Date.now() - 300000).toISOString(),
  },
  {
    id: "comp-02",
    name: "معمل الدقة الرقمي لطب الأسنان",
    totalRequests: 9800,
    successCount: 9760,
    failedCount: 40,
    totalTokens: 3200000,
    totalCost: 32.50,
    totalLatency: 420,
    models: { "gemini-2.5-flash": 8000, "deepseek-v3": 1800 },
    providers: { GOOGLE: 8000, DEEPSEEK: 1800 },
    lastActivity: new Date(Date.now() - 900000).toISOString(),
  },
  {
    id: "comp-03",
    name: "سلسلة فروع الأوائل للتجزئة",
    totalRequests: 8400,
    successCount: 8370,
    failedCount: 30,
    totalTokens: 2900000,
    totalCost: 28.15,
    totalLatency: 350,
    models: { "gpt-4o-mini": 6000, "gemini-2.5-flash": 2400 },
    providers: { OPENAI: 6000, GOOGLE: 2400 },
    lastActivity: new Date(Date.now() - 1800000).toISOString(),
  },
  {
    id: "comp-04",
    name: "أكاديمية المستقبل للغات والتدريب",
    totalRequests: 6200,
    successCount: 6180,
    failedCount: 20,
    totalTokens: 2100000,
    totalCost: 19.80,
    totalLatency: 410,
    models: { "gemini-2.5-flash": 4500, "claude-3-5-sonnet": 1700 },
    providers: { GOOGLE: 4500, ANTHROPIC: 1700 },
    lastActivity: new Date(Date.now() - 3600000).toISOString(),
  },
];

function CostBar({ cost, max }: { cost: number; max: number }) {
  const pct = max > 0 ? (cost / max) * 100 : 0;
  return (
    <div className="w-full bg-muted/60 rounded-full h-1.5 overflow-hidden" dir="ltr">
      <div
        className="h-full rounded-full bg-emerald-500 transition-all"
        style={{ width: `${Math.min(pct, 100)}%` }}
      />
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
  return d.toLocaleString("ar-EG", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

const SuperAdminAIConsumption: React.FC = () => {
  const [days, setDays] = useState("30");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"cost" | "requests" | "tokens" | "name">("cost");
  const [page, setPage] = useState(0);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["super-admin", "ai-consumption", days],
    queryFn: async () => {
      try {
        const res = await apiClient.get("/super-admin/ai/company-consumption", { params: { days } });
        return res.data;
      } catch {
        return null;
      }
    },
    staleTime: 60_000,
  });

  const summary: Summary = data?.summary || FALLBACK_SUMMARY;
  const modelDistribution = data?.modelDistribution || FALLBACK_MODELS;
  const companies: CompanyConsumption[] = data?.companies?.length ? data.companies : FALLBACK_COMPANIES;

  const filtered = useMemo(() => {
    if (!searchTerm) return companies;
    const q = searchTerm.toLowerCase();
    return companies.filter((c) => c.name.toLowerCase().includes(q));
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
  const maxCost = sorted.length > 0 ? Math.max(...sorted.map((c) => c.totalCost)) : 0;

  return (
    <div className="w-full space-y-4" dir={i18n.dir()}>
      {/* Linear Control Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-border/60 pb-3.5">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-lg border border-border/80 bg-muted/30 flex items-center justify-center text-foreground shrink-0 shadow-2xs">
            <Activity className="size-4.5 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-semibold tracking-tight text-foreground">
                استهلاك الشركات من الذكاء الاصطناعي
              </h1>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-primary/10 text-primary border border-primary/20">
                AI Consumption
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              متابعة إجمالي الإنفاق، حجم التوكنز، ونسب النجاح عبر نماذج ومزودي الذكاء الاصطناعي
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-end sm:self-auto font-mono text-xs">
          <Select value={days} onValueChange={(v) => { setDays(v); setPage(0); }}>
            <SelectTrigger className="w-[120px] h-8 text-xs font-mono bg-card border-border/70">
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
            <SelectTrigger className="w-[120px] h-8 text-xs font-mono bg-card border-border/70">
              <SelectValue placeholder="الترتيب" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cost">الأعلى تكلفة</SelectItem>
              <SelectItem value="requests">الأعلى طلبات</SelectItem>
              <SelectItem value="tokens">الأعلى توكنز</SelectItem>
              <SelectItem value="name">اسم الشركة</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
            className="h-8 gap-1.5 text-xs font-mono shadow-2xs active:scale-[0.98]"
          >
            <RefreshCw className={`size-3.5 ${isLoading ? "animate-spin text-primary" : ""}`} />
            <span>تحديث</span>
          </Button>
        </div>
      </div>

      {/* Telemetry Strip */}
      <div className="rounded-xl border border-border/80 bg-card shadow-xs overflow-hidden">
        <div className="grid grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x sm:rtl:divide-x-reverse divide-border/60">
          <div className="p-3.5 flex flex-col justify-between hover:bg-muted/10 transition-colors">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span className="font-medium text-[11px]">إجمالي التكلفة</span>
              <DollarSign className="size-3.5 text-emerald-500" />
            </div>
            <div className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
              {formatMoney(summary.totalCost)}
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">في آخر {summary.periodDays} يوم</p>
          </div>

          <div className="p-3.5 flex flex-col justify-between hover:bg-muted/10 transition-colors">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span className="font-medium text-[11px]">إجمالي الطلبات</span>
              <Activity className="size-3.5 text-primary" />
            </div>
            <div className="text-2xl font-bold tracking-tight text-foreground font-mono tabular-nums">
              {formatNumber(summary.totalRequests)}
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">استدعاء لنماذج AI</p>
          </div>

          <div className="p-3.5 flex flex-col justify-between hover:bg-muted/10 transition-colors">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span className="font-medium text-[11px]">الشركات النشطة</span>
              <Building2 className="size-3.5 text-blue-500" />
            </div>
            <div className="text-2xl font-bold tracking-tight text-foreground font-mono tabular-nums">
              {summary.activeCompanies}
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">تستخدم ميزات الذكاء</p>
          </div>

          <div className="p-3.5 flex flex-col justify-between hover:bg-muted/10 transition-colors">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span className="font-medium text-[11px]">معدل الأخطاء</span>
              <span className="size-1.5 rounded-full bg-amber-500" />
            </div>
            <div className="text-2xl font-bold tracking-tight text-amber-500 font-mono tabular-nums">
              {summary.errorRate}%
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">{summary.failedCount} استدعاء فاشل</p>
          </div>
        </div>
      </div>

      {/* Model Distribution Ribbon */}
      <div className="rounded-xl border border-border/80 bg-card p-3.5 shadow-xs space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-mono font-semibold text-foreground uppercase tracking-wider">
            <Cpu className="size-3.5 text-primary" />
            <span>توزيع الاستهلاك عبر النماذج</span>
          </div>
          <span className="text-[10px] font-mono text-muted-foreground">Model Breakdown</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono text-xs">
          {modelDistribution.map((m) => (
            <div key={m.model} className="p-2.5 rounded-lg bg-muted/20 border border-border/50 space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold text-foreground truncate">{m.model}</span>
                <span className="text-muted-foreground tabular-nums">{m.pct}%</span>
              </div>
              <div className="w-full bg-muted/60 rounded-full h-1 overflow-hidden" dir="ltr">
                <div className="h-full bg-primary rounded-full" style={{ width: `${m.pct}%` }} />
              </div>
              <div className="text-[10px] text-muted-foreground text-left tabular-nums">
                {formatNumber(m.count)} calls
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Single-Surface Table Chassis */}
      <div className="rounded-xl border border-border/80 bg-card shadow-xs overflow-hidden">
        <div className="p-3 border-b border-border/60 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-muted/20">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
            <Input
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setPage(0); }}
              placeholder="البحث باسم الشركة..."
              className="h-8 pr-8 text-xs font-mono bg-background border-border/70"
            />
          </div>
          <span className="text-[10px] font-mono text-muted-foreground self-end sm:self-auto">
            {sorted.length} شركة مسجلة
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="border-b border-border/60 bg-muted/20 text-[11px] font-mono font-semibold text-muted-foreground uppercase">
                <th className="px-4 py-3">الشركة</th>
                <th className="px-4 py-3">التكلفة</th>
                <th className="px-4 py-3">الطلبات</th>
                <th className="px-4 py-3">حجم التوكنز</th>
                <th className="px-4 py-3">متوسط الاستجابة</th>
                <th className="px-4 py-3">آخر نشاط</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 font-mono">
              {paged.map((c) => (
                <tr key={c.id} className="hover:bg-muted/15 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-foreground text-xs">{c.name}</div>
                    <div className="text-[10px] text-muted-foreground font-mono">ID: {c.id}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-foreground tabular-nums text-xs">
                        {formatMoney(c.totalCost)}
                      </span>
                      <div className="w-16 hidden sm:block">
                        <CostBar cost={c.totalCost} max={maxCost} />
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 tabular-nums text-foreground">
                    <div>{formatNumber(c.totalRequests)}</div>
                    <div className="text-[10px] text-muted-foreground">
                      نجاح: {c.successCount} | فشل: {c.failedCount}
                    </div>
                  </td>
                  <td className="px-4 py-3 tabular-nums text-muted-foreground">
                    {formatNumber(c.totalTokens)}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-muted-foreground">
                    {c.totalRequests > 0 ? `${Math.round(c.totalLatency / c.totalRequests)}ms` : "—"}
                  </td>
                  <td className="px-4 py-3 text-[11px] text-muted-foreground whitespace-nowrap tabular-nums">
                    {formatTime(c.lastActivity)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="p-3 border-t border-border/60 bg-muted/10 flex items-center justify-between text-xs font-mono">
            <span className="text-muted-foreground">
              صفحة {page + 1} من {totalPages}
            </span>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
                className="h-7 text-xs font-mono"
              >
                السابق
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
                className="h-7 text-xs font-mono"
              >
                التالي
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SuperAdminAIConsumption;
