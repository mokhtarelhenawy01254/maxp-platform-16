import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../services/apiClient";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Button } from "../../components/ui/button";
import { Alert, AlertDescription } from "../../components/ui/alert";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import { Search, RefreshCw, Activity, ChevronLeft, ChevronRight, Building2, Filter } from "lucide-react";
import { Input } from "../../components/ui/input";
import { cn } from "../../lib/utils";

const PAGE_SIZE = 25;

type CompanyActivity = {
  id: string; name: string; email: string; phone: string | null;
  isActive: boolean; createdAt: string; daysSinceCreation: number; status: string;
  metrics: {
    users: number; customers: number; recentOrders: number;
    recentConversations: number; recentAiInteractions: number; hasWhatsApp: boolean;
  };
  today: { actions: number; users: number; apps: string[]; lastBeatAt: string | null };
  login: { lastAt: string | null; lastUserName: string | null; logins30d: number; users30d: number };
  lastLogin: string | null; lastActivity: string | null; daysSinceLastActivity: number;
  subscription: { status: string };
};

type Summary = {
  total: number; active: number; dormant: number; dead: number;
  workedToday?: number; loggedInToday?: number; windowDays?: number;
};

const statusLabels: Record<string, string> = {
  active: "نشطة",
  dormant: "خاملة",
  dead: "غير متفاعلة",
};

const APP_LABELS: Record<string, string> = {
  "dental-lab": "معمل أسنان",
  clinic: "عيادة",
  hr: "موارد بشرية",
  orders: "طلبات",
  catalog: "منتجات/مخزون",
  customers: "عملاء/ولاء",
  conversations: "محادثات",
  finance: "حسابات",
  settings: "إعدادات",
  ai: "ذكاء اصطناعي",
  other: "أخرى",
};

function formatDate(iso: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("ar-EG", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit", hour12: false,
    });
  } catch {
    return iso;
  }
}

function formatRelative(iso: string | null) {
  if (!iso) return "";
  try {
    const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (minutes < 1) return "الآن";
    if (minutes < 60) return `منذ ${minutes} دقيقة`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `منذ ${hours} ساعة`;
    return `منذ ${Math.floor(hours / 24)} يوم`;
  } catch {
    return "";
  }
}

function daysLabel(days: number) {
  if (days === 0) return "اليوم";
  if (days === 1) return "أمس";
  if (days < 30) return `منذ ${days} يوم`;
  if (days < 60) return "منذ شهر";
  return `منذ ${Math.floor(days / 30)} شهر`;
}

export function SuperAdminCompanyActivity() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(0);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["super-admin", "company-activity", statusFilter],
    queryFn: async () => {
      const params: any = { status: statusFilter };
      const res = await apiClient.get("/super-admin/company-activity", { params });
      return res.data;
    },
    staleTime: 30_000,
  });

  const summary: Summary | null = data?.summary ?? null;
  const companies: CompanyActivity[] = data?.companies ?? [];

  const filtered = useMemo(() => {
    if (!searchTerm) return companies;
    const q = searchTerm.toLowerCase();
    return companies.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      (c.phone && c.phone.includes(q))
    );
  }, [companies, searchTerm]);

  const sorted = useMemo(() => {
    const list = [...filtered];
    list.sort((a, b) => {
      const aTime = a.lastActivity ? new Date(a.lastActivity).getTime() : 0;
      const bTime = b.lastActivity ? new Date(b.lastActivity).getTime() : 0;
      const order: Record<string, number> = { active: 0, dormant: 1, dead: 2 };
      return (order[a.status] ?? 9) - (order[b.status] ?? 9) || bTime - aTime;
    });
    return list;
  }, [filtered]);

  const paged = useMemo(() => {
    const start = page * PAGE_SIZE;
    return sorted.slice(start, start + PAGE_SIZE);
  }, [sorted, page]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));

  if (error) {
    return (
      <div className="w-full max-w-[1440px] mx-auto p-4 sm:p-6" dir="rtl">
        <Alert variant="destructive" className="rounded-xl">
          <AlertDescription className="text-xs">فشل تحميل بيانات نشاط الشركات. يرجى المحاولة مرة أخرى.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1440px] mx-auto p-4 sm:p-6 space-y-4" dir="rtl">
      {/* Linear Taste Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3.5">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-lg border border-border/80 bg-muted/30 flex items-center justify-center shrink-0">
            <Activity className="size-4.5 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-semibold tracking-tight text-foreground">
                متابعة نشاط وتفاعل الشركات
              </h1>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-muted/40 px-2 py-0.5 text-[10px] font-mono tabular-nums text-muted-foreground">
                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {summary?.total ?? companies.length} شركة مسجلة
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              نبضات الاستخدام اللحظي، آخر تسجيل دخول، ومؤشرات التفاعل الحي للعملاء
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="h-8 gap-1.5 text-xs font-mono active:scale-[0.98] transition-transform"
          >
            <RefreshCw className={cn("size-3.5", isLoading && "animate-spin")} />
            <span>تحديث البيانات</span>
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2 rounded-xl border border-border/80 bg-card/40">
        <div className="flex items-center gap-2 flex-wrap flex-1 min-w-[280px]">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute right-2.5 top-2.5 size-3.5 text-muted-foreground pointer-events-none" />
            <Input
              className="h-8 pr-8 text-xs font-mono bg-background/50"
              placeholder="بحث بالاسم أو البريد أو الهاتف..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setPage(0); }}
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
            <SelectTrigger className="h-8 text-xs w-36 bg-background/50">
              <SelectValue placeholder="الحالة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع الحالات</SelectItem>
              <SelectItem value="active">النشطة (أسبوعياً)</SelectItem>
              <SelectItem value="dormant">الخاملة (شهرياً)</SelectItem>
              <SelectItem value="dead">غير متفاعلة</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="text-xs font-mono text-muted-foreground">
          {sorted.length} شركة مطابقة
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <>
          {/* Unified Telemetry Ribbon (6 stats) */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 rounded-xl border border-border/80 bg-card/40 divide-y sm:divide-y-0 sm:divide-x sm:divide-x-reverse divide-border/60 overflow-hidden shadow-xs">
            <div className="p-3 sm:p-3.5 flex flex-col justify-between hover:bg-muted/10 transition-colors">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                <span className="font-medium text-[11px]">إجمالي الشركات</span>
                <span className="size-1.5 rounded-full bg-blue-500" />
              </div>
              <div className="text-2xl font-bold tracking-tight text-foreground font-mono tabular-nums">
                {summary?.total ?? "—"}
              </div>
              <p className="mt-0.5 text-[10px] font-mono text-muted-foreground">كل المسجلين</p>
            </div>

            <div className="p-3 sm:p-3.5 flex flex-col justify-between hover:bg-muted/10 transition-colors">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                <span className="font-medium text-[11px]">نشطة (≤7 أيام)</span>
                <span className="size-1.5 rounded-full bg-emerald-500" />
              </div>
              <div className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
                {summary?.active ?? "—"}
              </div>
              <p className="mt-0.5 text-[10px] font-mono text-muted-foreground">تفاعل منتظم</p>
            </div>

            <div className="p-3 sm:p-3.5 flex flex-col justify-between hover:bg-muted/10 transition-colors">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                <span className="font-medium text-[11px]">خاملة (≤30 يوم)</span>
                <span className="size-1.5 rounded-full bg-amber-500" />
              </div>
              <div className="text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400 font-mono tabular-nums">
                {summary?.dormant ?? "—"}
              </div>
              <p className="mt-0.5 text-[10px] font-mono text-muted-foreground">تحتاج تنشيط</p>
            </div>

            <div className="p-3 sm:p-3.5 flex flex-col justify-between hover:bg-muted/10 transition-colors">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                <span className="font-medium text-[11px]">غير متفاعلة</span>
                <span className="size-1.5 rounded-full bg-slate-500" />
              </div>
              <div className="text-2xl font-bold tracking-tight text-muted-foreground font-mono tabular-nums">
                {summary?.dead ?? "—"}
              </div>
              <p className="mt-0.5 text-[10px] font-mono text-muted-foreground">انقطاع تام (&gt;30 يوم)</p>
            </div>

            <div className="p-3 sm:p-3.5 flex flex-col justify-between hover:bg-muted/10 transition-colors">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                <span className="font-medium text-[11px]">نشاط اليوم</span>
                <span className="size-1.5 rounded-full bg-indigo-500" />
              </div>
              <div className="text-2xl font-bold tracking-tight text-indigo-600 dark:text-indigo-400 font-mono tabular-nums">
                {summary?.workedToday ?? "—"}
              </div>
              <p className="mt-0.5 text-[10px] font-mono text-muted-foreground">نبضات عمل اليوم</p>
            </div>

            <div className="p-3 sm:p-3.5 flex flex-col justify-between hover:bg-muted/10 transition-colors">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                <span className="font-medium text-[11px]">دخول اليوم</span>
                <span className="size-1.5 rounded-full bg-cyan-500" />
              </div>
              <div className="text-2xl font-bold tracking-tight text-cyan-600 dark:text-cyan-400 font-mono tabular-nums">
                {summary?.loggedInToday ?? "—"}
              </div>
              <p className="mt-0.5 text-[10px] font-mono text-muted-foreground">تسجيل دخول مسجل</p>
            </div>
          </div>

          {/* Single Chassis Table */}
          <div className="rounded-xl border border-border/80 bg-card/40 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-border/60 bg-muted/30">
                    <TableHead className="text-right text-[11px] font-mono">الشركة</TableHead>
                    <TableHead className="text-right text-[11px] font-mono">الحالة</TableHead>
                    <TableHead className="text-center text-[11px] font-mono">نشاط اليوم</TableHead>
                    <TableHead className="text-right text-[11px] font-mono">آخر تفاعل</TableHead>
                    <TableHead className="text-right text-[11px] font-mono">آخر دخول</TableHead>
                    <TableHead className="text-center text-[11px] font-mono">مستخدمون / عملاء</TableHead>
                    <TableHead className="text-center text-[11px] font-mono">العمليات (30 يوم)</TableHead>
                    <TableHead className="text-right text-[11px] font-mono">الاشتراك</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paged.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-xs font-mono text-muted-foreground py-10">
                        لا توجد شركات مطابقة للشروط
                      </TableCell>
                    </TableRow>
                  ) : (
                    paged.map((c) => (
                      <TableRow key={c.id} className="border-b border-border/60 hover:bg-muted/20 transition-colors">
                        <TableCell>
                          <div className="flex flex-col gap-0.5">
                            <span className="font-semibold text-xs text-foreground">{c.name}</span>
                            <span className="text-[10px] font-mono text-muted-foreground">{c.email}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-0.5">
                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium border w-fit ${
                              c.status === "active"
                                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20"
                                : c.status === "dormant"
                                ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20"
                                : "bg-slate-500/10 text-slate-500 border-slate-500/20"
                            }`}>
                              <span className={`size-1.5 rounded-full ${
                                c.status === "active" ? "bg-emerald-500" : c.status === "dormant" ? "bg-amber-500" : "bg-slate-400"
                              }`} />
                              {statusLabels[c.status] || c.status}
                            </span>
                            <span className="text-[10px] font-mono text-muted-foreground whitespace-nowrap">
                              {daysLabel(c.daysSinceLastActivity)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          {c.today?.actions ? (
                            <div className="flex flex-col items-center"
                              title={(c.today.apps || []).map(a => APP_LABELS[a] || a).join(" · ")}>
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 text-[10px] font-mono font-medium">
                                {c.today.actions} نبضة
                              </span>
                              <span className="text-[10px] font-mono text-muted-foreground whitespace-nowrap">
                                {c.today.users} مستخدم
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs font-mono text-muted-foreground/60">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs font-mono text-muted-foreground whitespace-nowrap">
                          {c.lastActivity ? (
                            <div className="flex flex-col">
                              <span className="text-foreground">{formatDate(c.lastActivity)}</span>
                              <span className="text-[10px] text-muted-foreground/75">{formatRelative(c.lastActivity)}</span>
                            </div>
                          ) : (
                            <span className="text-xs font-mono text-muted-foreground/60">لا يوجد</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs font-mono whitespace-nowrap">
                          {c.login?.lastAt ? (
                            <div className="flex flex-col"
                              title={`${c.login.logins30d} تسجيل دخول · ${c.login.users30d} مستخدم مختلف (30 يوم)`}>
                              <span className="font-semibold text-foreground text-xs">{c.login.lastUserName || "—"}</span>
                              <span className="text-[10px] text-muted-foreground">{formatDate(c.login.lastAt)}</span>
                            </div>
                          ) : (
                            <span className="text-xs font-mono text-muted-foreground/60">لا يوجد</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center font-mono text-xs tabular-nums text-foreground">
                          {c.metrics.users} / {c.metrics.customers}
                        </TableCell>
                        <TableCell className="text-center font-mono text-xs tabular-nums text-muted-foreground">
                          {c.metrics.recentOrders} · {c.metrics.recentConversations} · {c.metrics.recentAiInteractions}
                        </TableCell>
                        <TableCell>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md border border-border/70 bg-muted/30 text-[10px] font-mono text-foreground">
                            {c.subscription.status === "ACTIVE" ? "فعال" :
                             c.subscription.status === "TRIAL" ? "تجريبي" :
                             c.subscription.status === "CANCELLED" ? "ملغي" :
                             c.subscription.status === "NONE" ? "—" : c.subscription.status}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {sorted.length > PAGE_SIZE && (
              <div className="flex items-center justify-between p-3 border-t border-border/60 bg-muted/10">
                <span className="text-xs font-mono text-muted-foreground">
                  صفحة {page + 1} من {totalPages} ({sorted.length} شركة)
                </span>
                <div className="flex gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === 0}
                    onClick={() => setPage(page - 1)}
                    className="h-7 px-2.5 text-xs font-mono"
                  >
                    <ChevronRight className="size-3.5 ml-1" /> السابق
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages - 1}
                    onClick={() => setPage(page + 1)}
                    className="h-7 px-2.5 text-xs font-mono"
                  >
                    التالي <ChevronLeft className="size-3.5 mr-1" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default SuperAdminCompanyActivity;
