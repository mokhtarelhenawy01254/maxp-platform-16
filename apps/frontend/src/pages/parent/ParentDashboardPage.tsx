import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  CalendarDays,
  Users,
  GraduationCap,
  Clock,
  RefreshCw,
  Wallet,
  ShoppingCart,
  ChevronLeft,
  ArrowUpRight,
  BookOpen,
  CheckCircle2,
  Sparkles
} from "lucide-react";

interface DashboardData {
  children: number;
  totalEnrollments: number;
  activeEnrollments: number;
  upcomingSessions: number;
  totalSessions: number;
}

interface Child {
  id: string;
  firstName: string;
  lastName: string;
  grade?: string;
  enrollments: Array<{
    id: string;
    remainingHours: number;
    package: { name: string; hoursCount: number } | null;
    teacher: { name: string } | null;
  }>;
}

const ParentDashboardPage: React.FC = () => {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboardData = async () => {
    try {
      setRefreshing(true);
      const token = localStorage.getItem("parentToken");
      const [dashRes, childRes] = await Promise.all([
        fetch("/api/v1/education/parent-portal/dashboard", {
          headers: { Authorization: `Bearer ${token}` }
        }).then((r) => r.json()).catch(() => ({ success: false })),
        fetch("/api/v1/education/parent-portal/children", {
          headers: { Authorization: `Bearer ${token}` }
        }).then((r) => r.json()).catch(() => ({ success: false }))
      ]);

      if (dashRes.success && dashRes.data) {
        setDashboard(dashRes.data);
      } else {
        setDashboard(null);
      }

      if (childRes.success && Array.isArray(childRes.data) && childRes.data.length > 0) {
        setChildren(childRes.data);
      } else {
        setChildren([]);
      }
    } catch {
      setDashboard(null);
      setChildren([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[360px] space-y-3">
        <RefreshCw className="w-8 h-8 text-primary animate-spin" />
        <p className="text-xs font-mono text-muted-foreground uppercase">جاري تحميل بوابة ولي الأمر...</p>
      </div>
    );
  }

  const kpis = [
    {
      label: "الأبناء المسجلين",
      value: dashboard?.children ?? 0,
      subtext: "ملفات دراسية نشطة",
      icon: Users,
      color: "text-blue-600 bg-blue-500/10 border-blue-500/20"
    },
    {
      label: "الباقات النشطة",
      value: dashboard?.activeEnrollments ?? 0,
      subtext: "اشتراكات جارية",
      icon: GraduationCap,
      color: "text-emerald-600 bg-emerald-500/10 border-emerald-500/20"
    },
    {
      label: "الحصص القادمة",
      value: dashboard?.upcomingSessions ?? 0,
      subtext: "مجدولة هذا الأسبوع",
      icon: CalendarDays,
      color: "text-amber-600 bg-amber-500/10 border-amber-500/20"
    },
    {
      label: "إجمالي الحصص المنفذة",
      value: dashboard?.totalSessions ?? 0,
      subtext: "سجل الحضور الأكاديمي",
      icon: Clock,
      color: "text-purple-600 bg-purple-500/10 border-purple-500/20"
    }
  ];

  return (
    <div className="space-y-6 pb-10" dir="rtl">
      {/* Telemetry Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-xl border border-border/70 bg-card text-card-foreground shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-primary/10 text-primary border border-primary/20">
              PARENT PORTAL
            </span>
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              متابعة مباشرة للتحصيل الدراسي
            </span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">لوحة تحكم ولي الأمر</h1>
          <p className="text-xs text-muted-foreground">
            متابعة الساعات المتبقية للأبناء، جدول الحصص القادمة، وسجل الباقات التعليمية
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchDashboardData}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-border/80 bg-background hover:bg-muted text-foreground transition-all focus:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            <span>تحديث</span>
          </button>
          <Link
            to="/parent/buy-package"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm transition-all focus:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>شراء باقة جديدة</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div
              key={idx}
              className="p-4 rounded-xl border border-border/70 bg-card text-card-foreground shadow-sm hover:border-border transition-all flex flex-col justify-between"
            >
              <div className="flex items-start justify-between">
                <span className="text-xs font-medium text-muted-foreground">{kpi.label}</span>
                <div className={`p-2 rounded-lg border ${kpi.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-bold tracking-tight font-mono tabular-nums text-foreground">
                  {kpi.value}
                </div>
                <div className="text-[11px] text-muted-foreground mt-1">
                  {kpi.subtext}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Grid: Children Cards & Quick Operations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Children Roster */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">أبنائي المسجلون</h2>
            </div>
            <Link
              to="/parent/children"
              className="text-xs text-primary hover:underline font-medium inline-flex items-center gap-1"
            >
              <span>عرض تفاصيل الجميع</span>
              <ChevronLeft className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {children.map((child) => (
              <Link
                key={child.id}
                to={`/parent/children/${child.id}`}
                className="rounded-xl border border-border/70 bg-card text-card-foreground shadow-sm p-5 hover:border-border transition-all space-y-4 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-base text-foreground">
                        {child.firstName} {child.lastName}
                      </h3>
                      {child.grade && (
                        <p className="text-xs text-muted-foreground mt-0.5">{child.grade}</p>
                      )}
                    </div>
                    <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                      {child.firstName[0]}
                    </div>
                  </div>

                  <div className="mt-4 space-y-3">
                    {child.enrollments.length === 0 ? (
                      <p className="text-xs text-muted-foreground">لا توجد اشتراكات نشطة حالياً</p>
                    ) : (
                      child.enrollments.slice(0, 2).map((e) => {
                        const total = e.package?.hoursCount ?? 0;
                        const pct = total > 0 ? Math.min(100, Math.round((e.remainingHours / total) * 100)) : 0;
                        return (
                          <div key={e.id} className="p-2.5 rounded-lg border border-border/60 bg-muted/20 space-y-2">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-semibold text-foreground truncate max-w-[150px]">
                                {e.package?.name || "باقة تدريس"}
                              </span>
                              <span className="font-mono tabular-nums text-primary font-bold">
                                {total > 0 ? `${e.remainingHours} / ${total} س` : `${e.remainingHours} س`}
                              </span>
                            </div>
                            {total > 0 && (
                              <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-primary rounded-full transition-all"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            )}
                            {e.teacher?.name && (
                              <p className="text-[11px] text-muted-foreground">
                                المعلم: {e.teacher.name}
                              </p>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-border/50 flex items-center justify-between text-xs text-primary font-medium">
                  <span>فتح الملف والمتابعة</span>
                  <ChevronLeft className="w-3.5 h-3.5" />
                </div>
              </Link>
            ))}

            {children.length === 0 && (
              <div className="md:col-span-2 rounded-xl border border-border/70 bg-card p-10 text-center space-y-2">
                <Users className="w-9 h-9 text-muted-foreground mx-auto stroke-1" />
                <p className="text-sm font-medium text-foreground">لا يوجد أطفال مسجلون</p>
                <p className="text-xs text-muted-foreground">
                  لم يتم العثور على ملفات أبناء مرتبطة بحسابك حتى الآن
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Operations Sidebar */}
        <div className="rounded-xl border border-border/70 bg-card text-card-foreground shadow-sm p-5 space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2 pb-3 border-b border-border/60">
              <Sparkles className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">الخدمات السريعة</h2>
            </div>

            <div className="space-y-2">
              <Link
                to="/parent/sessions"
                className="flex items-center justify-between p-3 rounded-lg border border-border/60 bg-muted/30 hover:bg-muted/70 transition-all text-xs font-medium"
              >
                <div className="flex items-center gap-2.5">
                  <CalendarDays className="w-4 h-4 text-muted-foreground" />
                  <span>جدول الحصص الأكاديمية</span>
                </div>
                <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground" />
              </Link>

              <Link
                to="/parent/wallet"
                className="flex items-center justify-between p-3 rounded-lg border border-border/60 bg-muted/30 hover:bg-muted/70 transition-all text-xs font-medium"
              >
                <div className="flex items-center gap-2.5">
                  <Wallet className="w-4 h-4 text-muted-foreground" />
                  <span>رصيد المحفظة والمدفوعات</span>
                </div>
                <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground" />
              </Link>

              <Link
                to="/parent/enrollments"
                className="flex items-center justify-between p-3 rounded-lg border border-border/60 bg-muted/30 hover:bg-muted/70 transition-all text-xs font-medium"
              >
                <div className="flex items-center gap-2.5">
                  <GraduationCap className="w-4 h-4 text-muted-foreground" />
                  <span>سجل الاشتراكات والتسجيلات</span>
                </div>
                <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground" />
              </Link>
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-muted/40 border border-border/50 text-xs text-muted-foreground space-y-1.5">
            <div className="flex items-center gap-1.5 text-foreground font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>متابعة الحضور المباشر</span>
            </div>
            <p className="leading-relaxed">
              يتم إرسال إشعار فوري لولي الأمر فور بدء كل حصة أو تسجيل غياب الطالب.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ParentDashboardPage;
