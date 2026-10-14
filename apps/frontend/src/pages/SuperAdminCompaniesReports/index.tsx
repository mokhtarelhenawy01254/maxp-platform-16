import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Building2, Search, X } from "lucide-react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { useCompanies } from "../SuperAdminCompaniesV2/hooks/useCompanies";
import { apiClient } from "../../services/apiClient";

const STATUS_COLORS: Record<string, string> = { pending: "#f59e0b", in_progress: "#2563eb", resolved: "#10b981", escalated: "#ef4444" };

interface Filters {
  status: string;
  search: string;
  startDate: string;
  endDate: string;
}

export default function SuperAdminCompaniesReports() {
  const [filters, setFilters] = useState<Filters>({ status: "ALL", search: "", startDate: "", endDate: "" });
  const [appliedFilters, setAppliedFilters] = useState<Filters>({ status: "ALL", search: "", startDate: "", endDate: "" });

  const companyParams = useMemo(() => ({
    pageSize: 0 as const,
    ...(appliedFilters.status !== "ALL" ? { status: appliedFilters.status } : {}),
    ...(appliedFilters.search ? { search: appliedFilters.search } : {}),
    ...(appliedFilters.startDate ? { startDate: appliedFilters.startDate } : {}),
    ...(appliedFilters.endDate ? { endDate: appliedFilters.endDate } : {}),
  }), [appliedFilters]);

  const { companies, isLoading, serverStats } = useCompanies(companyParams);

  const { data: systemStats } = useQuery({
    queryKey: ["super-admin", "statistics"],
    queryFn: async () => {
      const res = await apiClient.get("/admin/companies/statistics");
      if (!res.data?.success) throw new Error("فشل في تحميل الإحصائيات");
      return res.data.data;
    },
    staleTime: 60_000,
  });

  const stats = useMemo(() => ({
    totalCompanies: serverStats?.totalCompanies ?? companies.length,
    activeCompanies: serverStats?.activeCompanies ?? companies.filter((c) => c.isActive).length,
    followUpNow: serverStats?.followUpNow ?? 0,
    escalationDue: serverStats?.escalationDue ?? 0,
    urgentEscalationDue: serverStats?.urgentEscalationDue ?? 0,
    stale72h: serverStats?.stale72h ?? 0,
  }), [serverStats, companies]);

  const funnelData = useMemo(() => {
    const stages: Record<string, number> = {};
    companies.forEach((c) => {
      const key = c.funnelSummary?.stageKey || "unknown";
      stages[key] = (stages[key] || 0) + 1;
    });
    const labels: Record<string, string> = { registered: "مسجل", started: "بدأ", active: "نشط", onboarding: "إعداد", unknown: "غير معروف" };
    return Object.entries(stages).map(([k, v]) => ({ name: labels[k] || k, value: v }));
  }, [companies]);

  const monthlyData = useMemo(() => {
    const months: Record<string, number> = {};
    companies.forEach((c) => {
      if (!c.createdAt) return;
      const m = new Date(c.createdAt).toLocaleDateString("ar-EG", { month: "short", year: "numeric" });
      months[m] = (months[m] || 0) + 1;
    });
    return Object.entries(months).slice(-12).map(([name, value]) => ({ name, value }));
  }, [companies]);

  const followUpData = useMemo(() => {
    const counts: Record<string, number> = { pending: 0, in_progress: 0, resolved: 0, escalated: 0, unassigned: 0 };
    companies.forEach((c) => {
      const s = c.followUp?.status || "unassigned";
      counts[s] = (counts[s] || 0) + 1;
    });
    const labels: Record<string, string> = { pending: "معلق", in_progress: "قيد المتابعة", resolved: "تم", escalated: "مصعد", unassigned: "بدون مسؤول" };
    return Object.entries(counts).filter(([, v]) => v > 0).map(([k, v]) => ({ name: labels[k] || k, value: v, color: STATUS_COLORS[k] || "#6b7280" }));
  }, [companies]);

  const totalMembers = useMemo(() => companies.reduce((s, c) => s + (c._count?.users || 0), 0), [companies]);
  const totalFacebookPages = useMemo(() => companies.reduce((s, c) => s + (c._count?.facebookPages || 0), 0), [companies]);
  const totalEscalations = useMemo(() => companies.filter((c) => c.followUpAutomation?.needsEscalation || c.followUpAutomation?.needsUrgentEscalation).length, [companies]);

  const applyFilters = () => setAppliedFilters({ ...filters });
  const resetFilters = () => {
    setFilters({ status: "ALL", search: "", startDate: "", endDate: "" });
    setAppliedFilters({ status: "ALL", search: "", startDate: "", endDate: "" });
  };
  const hasActiveFilters = appliedFilters.status !== "ALL" || appliedFilters.search || appliedFilters.startDate || appliedFilters.endDate;

  const overview = systemStats?.overview;
  const recentActivity = systemStats?.recentActivity;

  if (isLoading) {
    return (
      <div dir="rtl" className="w-full space-y-4 p-1">
        <div className="h-10 w-72 rounded-lg bg-muted/20 animate-pulse border border-border/40" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => <div key={i} className="h-24 rounded-xl bg-muted/20 border border-border/40 animate-pulse" />}
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {[...Array(2)].map((_, i) => <div key={i} className="h-64 rounded-xl bg-muted/20 border border-border/40 animate-pulse" />}
        </div>
      </div>
    );
  }

  return (
    <div dir="rtl" className="w-full space-y-3.5">
      {/* Linear Single Chassis Control Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="size-8 rounded-lg border border-border/80 bg-muted/20 flex items-center justify-center shrink-0">
            <Building2 className="size-4 text-foreground/80" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-bold tracking-tight text-foreground">
                تقارير وتحليلات الشركات
              </h1>
              <span className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-muted/30 px-2 py-0.5 text-[10px] font-mono tabular-nums text-muted-foreground">
                <span className="size-1.5 rounded-full bg-blue-500" />
                {stats.totalCompanies} شركة
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              تحليلات نمو الحسابات، تفاعل الفرق، ومعدلات النشاط والتصعيد
            </p>
          </div>
        </div>

        {/* Inline Filter Controls */}
        <div className="flex flex-wrap items-center gap-1.5">
          <div className="relative w-full sm:w-44">
            <Search className="absolute right-2.5 top-2 size-3 text-muted-foreground pointer-events-none" />
            <Input
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              placeholder="بحث بالاسم..."
              className="pr-7 text-xs h-7 font-mono bg-background/50 border-border/70"
              onKeyDown={(e) => e.key === "Enter" && applyFilters()}
            />
          </div>
          <Select value={filters.status} onValueChange={(v) => setFilters({ ...filters, status: v })}>
            <SelectTrigger className="h-7 text-xs w-28 bg-background/50 border-border/70"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">كل الحالات</SelectItem>
              <SelectItem value="ACTIVE">نشطة</SelectItem>
              <SelectItem value="INACTIVE">متوقفة</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={applyFilters} size="sm" className="h-7 px-3 text-xs font-mono active:scale-[0.98] transition-transform">تطبيق</Button>
          {hasActiveFilters && (
            <Button onClick={resetFilters} variant="ghost" size="sm" className="h-7 px-2 text-xs font-mono">
              <X className="size-3 ml-1" /> مسح
            </Button>
          )}
        </div>
      </div>

      {/* Unified Telemetry Ribbon */}
      <div className="grid grid-cols-2 lg:grid-cols-4 rounded-xl border border-border/80 bg-card/40 divide-y sm:divide-y-0 sm:divide-x sm:divide-x-reverse divide-border/60 overflow-hidden shadow-xs">
        <div className="p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-muted-foreground">إجمالي الشركات</span>
            <span className="size-1.5 rounded-full bg-blue-500" />
          </div>
          <div className="mt-1.5">
            <span className="text-xl font-bold font-mono tabular-nums tracking-tight text-foreground">
              {stats.totalCompanies}
            </span>
          </div>
          <p className="mt-0.5 text-[10px] font-mono text-muted-foreground">{stats.activeCompanies} شركة نشطة</p>
        </div>

        <div className="p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-muted-foreground">أعضاء الفرق</span>
            <span className="size-1.5 rounded-full bg-emerald-500" />
          </div>
          <div className="mt-1.5">
            <span className="text-xl font-bold font-mono tabular-nums tracking-tight text-emerald-600 dark:text-emerald-400">
              {totalMembers}
            </span>
          </div>
          <p className="mt-0.5 text-[10px] font-mono text-muted-foreground">عبر {stats.totalCompanies} شركة</p>
        </div>

        <div className="p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-muted-foreground">صفحات فيسبوك</span>
            <span className="size-1.5 rounded-full bg-indigo-500" />
          </div>
          <div className="mt-1.5">
            <span className="text-xl font-bold font-mono tabular-nums tracking-tight text-indigo-600 dark:text-indigo-400">
              {totalFacebookPages}
            </span>
          </div>
          <p className="mt-0.5 text-[10px] font-mono text-muted-foreground">صفحة مرتبطة بالمنصة</p>
        </div>

        <div className="p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-muted-foreground">حالات التصعيد</span>
            <span className="size-1.5 rounded-full bg-rose-500" />
          </div>
          <div className="mt-1.5">
            <span className="text-xl font-bold font-mono tabular-nums tracking-tight text-rose-600 dark:text-rose-400">
              {totalEscalations}
            </span>
          </div>
          <p className="mt-0.5 text-[10px] font-mono text-muted-foreground">بحاجة متابعة إدارية</p>
        </div>
      </div>

      {/* System Overview Telemetry */}
      {overview && (
        <div className="grid grid-cols-2 lg:grid-cols-4 rounded-xl border border-border/80 bg-card/40 divide-y sm:divide-y-0 sm:divide-x sm:divide-x-reverse divide-border/60 overflow-hidden shadow-xs">
          <div className="p-3 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-muted-foreground">مستخدمو المنصة</span>
              <span className="size-1.5 rounded-full bg-purple-500" />
            </div>
            <div className="mt-1.5">
              <span className="text-xl font-bold font-mono tabular-nums tracking-tight text-foreground">
                {overview.totalUsers}
              </span>
            </div>
            <p className="mt-0.5 text-[10px] font-mono text-muted-foreground">عبر كل الشركات</p>
          </div>

          <div className="p-3 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-muted-foreground">إجمالي العملاء</span>
              <span className="size-1.5 rounded-full bg-cyan-500" />
            </div>
            <div className="mt-1.5">
              <span className="text-xl font-bold font-mono tabular-nums tracking-tight text-foreground">
                {overview.totalCustomers}
              </span>
            </div>
            <p className="mt-0.5 text-[10px] font-mono text-muted-foreground">قاعدة عملاء المتاجر</p>
          </div>

          <div className="p-3 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-muted-foreground">المحادثات المدارة</span>
              <span className="size-1.5 rounded-full bg-amber-500" />
            </div>
            <div className="mt-1.5">
              <span className="text-xl font-bold font-mono tabular-nums tracking-tight text-foreground">
                {overview.totalConversations}
              </span>
            </div>
            <p className="mt-0.5 text-[10px] font-mono text-muted-foreground">{overview.totalMessages} رسالة مسجلة</p>
          </div>

          <div className="p-3 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-muted-foreground">نمو 30 يوماً</span>
              <span className="size-1.5 rounded-full bg-emerald-500" />
            </div>
            <div className="mt-1.5">
              <span className="text-xl font-bold font-mono tabular-nums tracking-tight text-emerald-600 dark:text-emerald-400">
                {recentActivity?.newCompaniesLast30Days ?? 0}
              </span>
            </div>
            <p className="mt-0.5 text-[10px] font-mono text-muted-foreground">شركة جديدة مسجلة</p>
          </div>
        </div>
      )}

      {/* Analytics Single Surface Grid */}
      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-border/80 bg-card/40 shadow-xs overflow-hidden p-3.5">
          <div className="flex items-center justify-between mb-2.5">
            <h3 className="text-xs font-semibold text-foreground">مراحل القمع (Funnel Stages)</h3>
            <span className="text-[10px] font-mono text-muted-foreground">{funnelData.length} مراحل</span>
          </div>
          {funnelData.length ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={funnelData}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="opacity-10" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 11, backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }} />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-xs font-mono text-muted-foreground text-center py-10">لا توجد بيانات كافية</p>}
        </div>

        <div className="rounded-xl border border-border/80 bg-card/40 shadow-xs overflow-hidden p-3.5">
          <div className="flex items-center justify-between mb-2.5">
            <h3 className="text-xs font-semibold text-foreground">الشركات المسجلة شهرياً</h3>
            <span className="text-[10px] font-mono text-muted-foreground">آخر 12 شهراً</span>
          </div>
          {monthlyData.length ? (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="opacity-10" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-25} textAnchor="end" height={45} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 11, backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }} />
                <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : <p className="text-xs font-mono text-muted-foreground text-center py-10">لا توجد بيانات كافية</p>}
        </div>

        <div className="rounded-xl border border-border/80 bg-card/40 shadow-xs overflow-hidden p-3.5">
          <div className="flex items-center justify-between mb-2.5">
            <h3 className="text-xs font-semibold text-foreground">توزيع حالات المتابعة</h3>
            <span className="text-[10px] font-mono text-muted-foreground">حسب الحالة الحالية</span>
          </div>
          {followUpData.length ? (
            <div className="space-y-3">
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={followUpData} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {followUpData.map((entry, idx) => <Cell key={idx} fill={entry.color || "#6b7280"} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 8, fontSize: 11, backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap justify-center gap-2.5 pt-1 border-t border-border/50">
                {followUpData.map((d) => (
                  <div key={d.name} className="flex items-center gap-1.5 text-[11px] font-mono">
                    <div className="size-2 rounded-full" style={{ backgroundColor: d.color || "#6b7280" }} />
                    <span className="text-foreground">{d.name}:</span>
                    <span className="tabular-nums font-semibold">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : <p className="text-xs font-mono text-muted-foreground text-center py-10">لا توجد بيانات كافية</p>}
        </div>

        <div className="rounded-xl border border-border/80 bg-card/40 shadow-xs overflow-hidden p-3.5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <h3 className="text-xs font-semibold text-foreground">ملخص دورة النشاط والمتابعة</h3>
              <span className="text-[10px] font-mono text-muted-foreground">مؤشرات حيوية</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "متوقفة", value: stats.totalCompanies - stats.activeCompanies, color: "text-rose-600 dark:text-rose-400" },
                { label: "متابعة الآن", value: stats.followUpNow, color: "text-amber-600 dark:text-amber-400" },
                { label: "تصعيد", value: stats.escalationDue, color: "text-orange-600 dark:text-orange-400" },
                { label: "راكد 72س", value: stats.stale72h, color: "text-slate-600 dark:text-slate-400" },
                { label: "تسجيل بدون بدء", value: serverStats?.registeredNoStart ?? 0, color: "text-blue-600 dark:text-blue-400" },
                { label: "تفعيل قيد التنفيذ", value: serverStats?.activationInProgress ?? 0, color: "text-emerald-600 dark:text-emerald-400" },
              ].map((item) => (
                <div key={item.label} className="rounded-lg border border-border/60 bg-muted/20 p-2 text-center">
                  <p className="text-[10px] font-mono text-muted-foreground">{item.label}</p>
                  <p className={`text-base font-bold font-mono tabular-nums ${item.color}`}>{item.value}</p>
                </div>
              ))}
            </div>
          </div>
          <p className="text-[10px] font-mono text-muted-foreground text-center mt-3 pt-2 border-t border-border/40">
            تحديث البيانات لحظي بناءً على آخر مزامنة
          </p>
        </div>
      </div>
    </div>
  );
}
