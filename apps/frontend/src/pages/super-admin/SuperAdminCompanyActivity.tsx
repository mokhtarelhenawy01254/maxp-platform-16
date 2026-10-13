import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../services/apiClient";
import { Card, CardContent } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Button } from "../../components/ui/button";
import { Alert, AlertDescription } from "../../components/ui/alert";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import { Search, RefreshCw, Building2, Activity, Zap, Skull, ChevronLeft, ChevronRight, UserCheck, Hammer } from "lucide-react";
import { Input } from "../../components/ui/input";

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

const statusColors: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
  dormant: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  dead: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
};

const statusLabels: Record<string, string> = {
  active: "نشط",
  dormant: "خامل",
  dead: "ميتة",
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
  return new Date(iso).toLocaleString("ar-EG", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: false,
  });
}

function formatRelative(iso: string | null) {
  if (!iso) return "";
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return "الآن";
  if (minutes < 60) return `منذ ${minutes} دقيقة`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `منذ ${hours} ساعة`;
  return `منذ ${Math.floor(hours / 24)} يوم`;
}

function daysLabel(days: number) {
  if (days === 0) return "اليوم";
  if (days === 1) return "أمس";
  if (days < 30) return `منذ ${days} يوم`;
  if (days < 60) return "منذ شهر";
  return `منذ ${Math.floor(days / 30)} شهر`;
}

function SuperAdminCompanyActivity() {
  return (
    <div dir="rtl" className="w-full space-y-4">
      <Content />
    </div>
  );
}

function Content() {
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
      const order = { active: 0, dormant: 1, dead: 2 };
      return (order[a.status] ?? 9) - (order[b.status] ?? 9) ||
        bTime - aTime;
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
      <Alert variant="destructive" className="rounded-xl">
        <AlertDescription className="text-xs">فشل تحميل بيانات نشاط الشركات. يرجى المحاولة مرة أخرى.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      {/* Linear Taste Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3.5">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-lg border border-border/80 bg-muted/30 flex items-center justify-center shrink-0">
            <Activity className="size-4 text-foreground/80" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-foreground">
                متابعة نشاط وتفاعل الشركات
              </h1>
              <span className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-muted/40 px-2 py-0.5 text-[11px] font-mono tabular-nums text-muted-foreground">
                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {summary?.total ?? companies.length} شركة مراقبة
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              نبضات الاستخدام اللحظي، آخر تسجيل دخول، وحالات النشاط عبر التطبيقات
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full sm:w-48">
            <Search className="absolute right-2.5 top-2.5 size-3.5 text-muted-foreground pointer-events-none" />
            <Input
              className="h-8 pr-8 text-xs font-mono bg-background/50"
              placeholder="بحث بالاسم أو البريد..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setPage(0); }}
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
            <SelectTrigger className="h-8 text-xs w-32 bg-background/50">
              <SelectValue placeholder="الحالة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع الشركات</SelectItem>
              <SelectItem value="active">النشطة</SelectItem>
              <SelectItem value="dormant">الخاملة</SelectItem>
              <SelectItem value="dead">الميتة</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="h-8 gap-1.5 text-xs font-mono active:scale-[0.98] transition-transform"
          >
            <RefreshCw className="size-3.5" />
            <span>تحديث</span>
          </Button>
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
            <div className="p-3 sm:p-3.5 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-muted-foreground">إجمالي الشركات</span>
                <span className="size-1.5 rounded-full bg-blue-500" />
              </div>
              <div className="mt-2">
                <span className="text-xl sm:text-2xl font-bold font-mono tabular-nums tracking-tight text-foreground">
                  {summary?.total ?? "—"}
                </span>
              </div>
              <p className="mt-0.5 text-[10px] font-mono text-muted-foreground">كل المسجلين</p>
            </div>

            <div className="p-3 sm:p-3.5 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-muted-foreground">نشطة (≤7 أيام)</span>
                <span className="size-1.5 rounded-full bg-emerald-500" />
              </div>
              <div className="mt-2">
                <span className="text-xl sm:text-2xl font-bold font-mono tabular-nums tracking-tight text-emerald-600 dark:text-emerald-400">
                  {summary?.active ?? "—"}
                </span>
              </div>
              <p className="mt-0.5 text-[10px] font-mono text-muted-foreground">تفاعل منتظم</p>
            </div>

            <div className="p-3 sm:p-3.5 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-muted-foreground">خاملة (≤30 يوم)</span>
                <span className="size-1.5 rounded-full bg-amber-500" />
              </div>
              <div className="mt-2">
                <span className="text-xl sm:text-2xl font-bold font-mono tabular-nums tracking-tight text-amber-600 dark:text-amber-400">
                  {summary?.dormant ?? "—"}
                </span>
              </div>
              <p className="mt-0.5 text-[10px] font-mono text-muted-foreground">تحتاج تنشيط</p>
            </div>

            <div className="p-3 sm:p-3.5 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-muted-foreground">ميتة (&gt;30 يوم)</span>
                <span className="size-1.5 rounded-full bg-slate-500" />
              </div>
              <div className="mt-2">
                <span className="text-xl sm:text-2xl font-bold font-mono tabular-nums tracking-tight text-muted-foreground">
                  {summary?.dead ?? "—"}
                </span>
              </div>
              <p className="mt-0.5 text-[10px] font-mono text-muted-foreground">انقطاع تام</p>
            </div>

            <div className="p-3 sm:p-3.5 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-muted-foreground">نشاط اليوم</span>
                <span className="size-1.5 rounded-full bg-indigo-500" />
              </div>
              <div className="mt-2">
                <span className="text-xl sm:text-2xl font-bold font-mono tabular-nums tracking-tight text-indigo-600 dark:text-indigo-400">
                  {summary?.workedToday ?? "—"}
                </span>
              </div>
              <p className="mt-0.5 text-[10px] font-mono text-muted-foreground">نبضات عمل اليوم</p>
            </div>

            <div className="p-3 sm:p-3.5 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-muted-foreground">دخول اليوم</span>
                <span className="size-1.5 rounded-full bg-cyan-500" />
              </div>
              <div className="mt-2">
                <span className="text-xl sm:text-2xl font-bold font-mono tabular-nums tracking-tight text-cyan-600 dark:text-cyan-400">
                  {summary?.loggedInToday ?? "—"}
                </span>
              </div>
              <p className="mt-0.5 text-[10px] font-mono text-muted-foreground">تسجيل دخول مسجل</p>
            </div>
          </div>

          {/* Single Chassis Table */}
          <div className="rounded-xl border border-border/80 bg-card/40 shadow-xs overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-border/60 bg-muted/30">
                  <TableHead className="text-right text-[11px] font-mono">الشركة</TableHead>
                  <TableHead className="text-right text-[11px] font-mono">الحالة</TableHead>
                  <TableHead className="text-center text-[11px] font-mono">شغل النهاردة</TableHead>
                  <TableHead className="text-right text-[11px] font-mono">آخر حركة</TableHead>
                  <TableHead className="text-right text-[11px] font-mono">آخر دخول</TableHead>
                  <TableHead className="text-center text-[11px] font-mono">مستخدمون / عملاء</TableHead>
                  <TableHead className="text-center text-[11px] font-mono">العمليات (30 يوم)</TableHead>
                  <TableHead className="text-right text-[11px] font-mono">الاشتراك</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-xs font-mono text-muted-foreground py-8">
                      لا توجد شركات مطابقة
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
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium border ${
                            c.status === "active"
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                              : c.status === "dormant"
                              ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
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
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-mono font-medium">
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
                            <span>{formatDate(c.lastActivity)}</span>
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
            <div className="flex items-center justify-center gap-3 mt-4">
              <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)} className="h-8 text-xs font-mono">
                <ChevronRight className="size-3.5 ml-1" /> السابق
              </Button>
              <span className="text-xs font-mono text-muted-foreground">
                صفحة {page + 1} من {totalPages} ({sorted.length} شركة)
              </span>
              <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)} className="h-8 text-xs font-mono">
                التالي <ChevronLeft className="size-3.5 mr-1" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default SuperAdminCompanyActivity;
