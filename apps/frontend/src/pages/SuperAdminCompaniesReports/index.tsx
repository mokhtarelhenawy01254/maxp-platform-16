import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Building2, Users, Facebook, AlertTriangle } from "lucide-react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { useCompanies } from "../SuperAdminCompaniesV2/hooks/useCompanies";
import { getPlanMeta, computeQuickStats } from "../SuperAdminCompaniesV2/utils";
import type { Company } from "../SuperAdminCompaniesV2/types";

const COLORS = ["#2563eb", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];
const PLAN_COLORS: Record<string, string> = { BASIC: "#2563eb", PRO: "#10b981", ENTERPRISE: "#8b5cf6" };
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

export default function SuperAdminCompaniesReports() {
  const { companies, isLoading } = useCompanies({ pageSize: 0 });
  const stats = useMemo(() => computeQuickStats(companies, null), [companies]);

  const planData = useMemo(() => {
    const counts: Record<string, number> = {};
    companies.forEach((c) => { const p = c.plan || "BASIC"; counts[p] = (counts[p] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name: getPlanMeta(name).label, value, color: PLAN_COLORS[name] || "#6b7280" }));
  }, [companies]);

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

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard icon={Building2} label="إجمالي الشركات" value={stats.totalCompanies} sub={`${stats.activeCompanies} نشطة`} color="#2563eb" />
        <StatCard icon={Users} label="إجمالي الأعضاء" value={totalMembers} sub={`${stats.totalCompanies} شركة`} color="#10b981" />
        <StatCard icon={Facebook} label="صفحات فيسبوك" value={totalFacebookPages} sub="مرتبطة" color="#1877F2" />
        <StatCard icon={AlertTriangle} label="تصعيدات" value={totalEscalations} sub="بحاجة متابعة" color="#ef4444" />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="rounded-lg border-border/60 bg-white shadow-sm dark:bg-slate-950">
          <CardHeader>
            <CardTitle className="text-base font-black text-right">توزيع الخطط</CardTitle>
          </CardHeader>
          <CardContent>
            {planData.length ? (
              <div className="space-y-4">
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={planData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {planData.map((entry, idx) => <Cell key={idx} fill={entry.color} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap justify-center gap-4">
                  {planData.map((d) => (
                    <div key={d.name} className="flex items-center gap-2">
                      <div className="size-3 rounded-full" style={{ backgroundColor: d.color }} />
                      <span className="text-xs font-bold text-foreground">{d.name}: {d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : <p className="text-sm font-bold text-muted-foreground/60 text-center py-8">لا توجد بيانات</p>}
          </CardContent>
        </Card>

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
                  <span className="text-xs font-bold text-muted-foreground">Enterprise</span>
                  <span className="text-xs font-black text-foreground">{stats.enterpriseCompanies} / {stats.totalCompanies}</span>
                </div>
                <div className="h-3 w-full rounded-full bg-muted/30 overflow-hidden">
                  <div className="h-full rounded-full bg-purple-500 transition-all" style={{ width: `${stats.totalCompanies ? (stats.enterpriseCompanies / stats.totalCompanies) * 100 : 0}%` }} />
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
                { label: "تسجيل بدون بدء", value: stats.registeredNoStart, color: "text-blue-600" },
                { label: "تفعيل قيد التنفيذ", value: stats.activationInProgress, color: "text-emerald-600" },
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
