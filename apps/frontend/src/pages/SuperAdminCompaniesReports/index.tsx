import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { AlertTriangle, Building, Building2, Facebook, MessageSquare, Phone, Search, Smartphone, TrendingUp, Users, X } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { useCompanies } from "../SuperAdminCompaniesV2/hooks/useCompanies";
import { apiClient } from "../../services/apiClient";

const STATUS_COLORS: Record<string, string> = { pending: "#f59e0b", in_progress: "#2563eb", resolved: "#10b981", escalated: "#ef4444" };

function StatCard({ icon: Icon, label, value, sub, color }: { icon: React.ElementType; label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div className="rounded-lg border border-border/60 bg-white p-4 shadow-sm dark:bg-slate-950">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-[13px] font-black uppercase tracking-widest text-muted-foreground/70">{label}</p>
          <p className="text-2xl font-black text-foreground">{value}</p>
          {sub ? <p className="text-xs font-bold text-muted-foreground/60">{sub}</p> : null}
        </div>
        <div className="flex size-12 items-center justify-center rounded-lg" style={{ backgroundColor: `${color}15` }}>
          <Icon className="size-6" style={{ color }} />
        </div>
      </div>
    </div>
  );
}

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
      <div dir="rtl" className="p-4 md:p-6 space-y-6">
        <div className="space-y-2">
          <div className="h-8 w-64 rounded-lg bg-muted/30 animate-pulse" />
          <div className="h-4 w-96 rounded-lg bg-muted/20 animate-pulse" />
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-28 rounded-lg bg-muted/30 animate-pulse" />)}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {[...Array(2)].map((_, i) => <div key={i} className="h-72 rounded-lg bg-muted/30 animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div dir="rtl" className="p-4 md:p-6 space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-black tracking-tight text-foreground">
          تقارير <span className="text-primary">الشركات</span>
        </h1>
        <p className="text-sm font-medium text-muted-foreground/60">تحليلات وإحصائيات شاملة عن الشركات المسجلة.</p>
      </div>

      {/* Filters */}
      <div className="rounded-lg border border-border/60 bg-white p-4 shadow-sm dark:bg-slate-950">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[180px]">
            <label className="mb-1 block text-xs font-bold text-muted-foreground/70">بحث</label>
            <div className="relative">
              <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/50" />
              <Input value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} placeholder="اسم الشركة..."
                className="pr-9 text-sm h-9" onKeyDown={(e) => e.key === "Enter" && applyFilters()} />
            </div>
          </div>
          <div className="w-[140px]">
            <label className="mb-1 block text-xs font-bold text-muted-foreground/70">الحالة</label>
            <Select value={filters.status} onValueChange={(v) => setFilters({ ...filters, status: v })}>
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">الكل</SelectItem>
                <SelectItem value="ACTIVE">نشطة</SelectItem>
                <SelectItem value="INACTIVE">متوقفة</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="w-[160px]">
            <label className="mb-1 block text-xs font-bold text-muted-foreground/70">من تاريخ</label>
            <Input type="date" value={filters.startDate} onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              className="h-9 text-sm" />
          </div>
          <div className="w-[160px]">
            <label className="mb-1 block text-xs font-bold text-muted-foreground/70">إلى تاريخ</label>
            <Input type="date" value={filters.endDate} onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              className="h-9 text-sm" />
          </div>
          <div className="flex gap-2">
            <Button onClick={applyFilters} size="sm" className="h-9">تطبيق</Button>
            {hasActiveFilters && (
              <Button onClick={resetFilters} variant="ghost" size="sm" className="h-9">
                <X className="size-4 ml-1" /> إعادة
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Company Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard icon={Building2} label="إجمالي الشركات" value={stats.totalCompanies} sub={`${stats.activeCompanies} نشطة`} color="#2563eb" />
        <StatCard icon={Users} label="إجمالي الأعضاء" value={totalMembers} sub={`${stats.totalCompanies} شركة`} color="#10b981" />
        <StatCard icon={Facebook} label="صفحات فيسبوك" value={totalFacebookPages} sub="مرتبطة" color="#1877F2" />
        <StatCard icon={AlertTriangle} label="تصعيدات" value={totalEscalations} sub="بحاجة متابعة" color="#ef4444" />
      </div>

      {/* System Overview Cards */}
      {overview && (
        <div>
          <h2 className="mb-3 text-lg font-black text-foreground">نظرة عامة على النظام</h2>
          <div className="grid gap-4 md:grid-cols-4">
            <StatCard icon={Users} label="إجمالي المستخدمين" value={overview.totalUsers} sub="عبر كل الشركات" color="#8b5cf6" />
            <StatCard icon={Smartphone} label="إجمالي العملاء" value={overview.totalCustomers} sub="عبر كل الشركات" color="#06b6d4" />
            <StatCard icon={MessageSquare} label="المحادثات" value={overview.totalConversations} sub={`${overview.totalMessages} رسالة`} color="#f97316" />
            <StatCard icon={TrendingUp} label={`نشاط آخر 30 يوم`} value={recentActivity?.newCompaniesLast30Days ?? 0}
              sub={`${recentActivity?.newUsersLast30Days ?? 0} مستخدم · ${recentActivity?.newCustomersLast30Days ?? 0} عميل`} color="#10b981" />
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="rounded-lg border-border/60 bg-white shadow-sm dark:bg-slate-950">
          <CardHeader>
            <CardTitle className="text-base font-black text-right">مراحل القمع (Funnel Stages)</CardTitle>
          </CardHeader>
          <CardContent>
            {funnelData.length ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={funnelData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#2563eb" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-sm font-bold text-muted-foreground/60 text-center py-8">لا توجد بيانات</p>}
          </CardContent>
        </Card>

        <Card className="rounded-lg border-border/60 bg-white shadow-sm dark:bg-slate-950">
          <CardHeader>
            <CardTitle className="text-base font-black text-right">الشركات المسجلة شهرياً</CardTitle>
          </CardHeader>
          <CardContent>
            {monthlyData.length ? (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" height={60} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : <p className="text-sm font-bold text-muted-foreground/60 text-center py-8">لا توجد بيانات</p>}
          </CardContent>
        </Card>

        <Card className="rounded-lg border-border/60 bg-white shadow-sm dark:bg-slate-950">
          <CardHeader>
            <CardTitle className="text-base font-black text-right">حالة المتابعة</CardTitle>
          </CardHeader>
          <CardContent>
            {followUpData.length ? (
              <div className="space-y-4">
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={followUpData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {followUpData.map((entry, idx) => <Cell key={idx} fill={entry.color || "#6b7280"} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap justify-center gap-4">
                  {followUpData.map((d) => (
                    <div key={d.name} className="flex items-center gap-2">
                      <div className="size-3 rounded-full" style={{ backgroundColor: d.color || "#6b7280" }} />
                      <span className="text-xs font-bold text-foreground">{d.name}: {d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : <p className="text-sm font-bold text-muted-foreground/60 text-center py-8">لا توجد بيانات</p>}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="rounded-lg border-border/60 bg-white shadow-sm dark:bg-slate-950">
          <CardHeader>
            <CardTitle className="text-base font-black text-right">حالة النشاط</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-xs font-bold text-muted-foreground">نشطة</span>
                  <span className="text-xs font-black text-foreground">{stats.activeCompanies} / {stats.totalCompanies}</span>
                </div>
                <div className="h-3 w-full rounded-full bg-muted/30 overflow-hidden">
                  <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${stats.totalCompanies ? (stats.activeCompanies / stats.totalCompanies) * 100 : 0}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-xs font-bold text-muted-foreground">بحاجة متابعة عاجلة</span>
                  <span className="text-xs font-black text-foreground">{stats.urgentEscalationDue}</span>
                </div>
                <div className="h-3 w-full rounded-full bg-muted/30 overflow-hidden">
                  <div className="h-full rounded-full bg-rose-500 transition-all" style={{ width: `${stats.totalCompanies ? (stats.urgentEscalationDue / stats.totalCompanies) * 100 : 0}%` }} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-lg border-border/60 bg-white shadow-sm dark:bg-slate-950">
          <CardHeader>
            <CardTitle className="text-base font-black text-right">ملخص سريع</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: "متوقفة", value: stats.totalCompanies - stats.activeCompanies, color: "text-rose-600" },
                { label: "متابعة الآن", value: stats.followUpNow, color: "text-amber-600" },
                { label: "تصعيد", value: stats.escalationDue, color: "text-orange-600" },
                { label: "راكد 72س", value: stats.stale72h, color: "text-slate-600" },
                { label: "تسجيل بدون بدء", value: serverStats?.registeredNoStart ?? 0, color: "text-blue-600" },
                { label: "تفعيل قيد التنفيذ", value: serverStats?.activationInProgress ?? 0, color: "text-emerald-600" },
              ].map((item) => (
                <div key={item.label} className="rounded-lg border border-border/40 bg-muted/10 p-3 text-center dark:bg-slate-900/30">
                  <p className="text-xs font-bold text-muted-foreground/60">{item.label}</p>
                  <p className={`text-xl font-black ${item.color}`}>{item.value}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
