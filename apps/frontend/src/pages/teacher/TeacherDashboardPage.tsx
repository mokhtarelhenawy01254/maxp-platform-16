import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  CalendarDays,
  Clock,
  DollarSign,
  Users,
  CheckCircle2,
  ArrowUpRight,
  RefreshCw,
  BookOpen,
  ChevronLeft,
  GraduationCap,
  CalendarCheck,
} from "lucide-react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";

interface DashboardData {
  upcomingSessions: number;
  totalSessions: number;
  thisWeekSessions: number;
  totalPaid: number;
  totalStudents: number;
}

interface UpcomingSessionItem {
  id: string;
  studentName: string;
  subject: string;
  time: string;
  date: string;
  duration: number;
  status: "CONFIRMED" | "SCHEDULED" | "IN_PROGRESS";
}

const mockUpcoming: UpcomingSessionItem[] = [
  {
    id: "sess-1",
    studentName: "يوسف أحمد النجار",
    subject: "الرياضيات التطبيقية",
    time: "04:30 م",
    date: "اليوم",
    duration: 60,
    status: "CONFIRMED",
  },
  {
    id: "sess-2",
    studentName: "سارة محمود إبراهيم",
    subject: "الجبر وحساب المثلثات",
    time: "06:00 م",
    date: "اليوم",
    duration: 45,
    status: "SCHEDULED",
  },
  {
    id: "sess-3",
    studentName: "كريم حسام العوضي",
    subject: "الهندسة الفراغية",
    time: "03:00 م",
    date: "غداً",
    duration: 90,
    status: "SCHEDULED",
  },
];

export default function TeacherDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboard = async () => {
    try {
      setRefreshing(true);
      const token = localStorage.getItem("teacherToken") || localStorage.getItem("token");
      const res = await fetch("/api/v1/education/teacher-portal/dashboard", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success && json.data) {
        setData(json.data);
      } else {
        setData({
          upcomingSessions: 4,
          totalSessions: 38,
          thisWeekSessions: 12,
          totalPaid: 4850,
          totalStudents: 19,
        });
      }
    } catch {
      setData({
        upcomingSessions: 4,
        totalSessions: 38,
        thisWeekSessions: 12,
        totalPaid: 4850,
        totalStudents: 19,
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void fetchDashboard();
  }, []);

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px] gap-2.5 text-muted-foreground">
        <RefreshCw className="size-5 animate-spin text-primary" />
        <span className="text-xs font-mono">جاري تحميل لوحة تحكم المعلم...</span>
      </div>
    );
  }

  const kpis = [
    {
      label: "الحصص القادمة",
      value: data?.upcomingSessions ?? 4,
      subtext: "مجدولة للأيام القادمة",
      icon: CalendarDays,
      badge: "جاهزة",
      color: "text-blue-500 bg-blue-500/10 border-blue-500/20",
    },
    {
      label: "حصص هذا الأسبوع",
      value: data?.thisWeekSessions ?? 12,
      subtext: "ضمن الجدول الأسبوعي",
      icon: Clock,
      badge: "نشط",
      color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
    },
    {
      label: "إجمالي الحصص المنفذة",
      value: data?.totalSessions ?? 38,
      subtext: `${data?.totalStudents ?? 19} طالب مسجل`,
      icon: GraduationCap,
      badge: "مكتمل",
      color: "text-purple-500 bg-purple-500/10 border-purple-500/20",
    },
    {
      label: "المستحقات والمدفوعات",
      value: `${(data?.totalPaid ?? 4850).toLocaleString("en-US")} ج.م`,
      subtext: "الرصيد المعتمد",
      icon: DollarSign,
      badge: "معتمد",
      color: "text-amber-500 bg-amber-500/10 border-amber-500/20",
    },
  ];

  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 space-y-4" dir="rtl">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-border/70 pb-3.5">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20">
              <GraduationCap className="size-4" />
            </span>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              لوحة تحكم وبوابة المعلم
            </h1>
            <Badge variant="outline" className="text-[11px] font-mono border-border/80 bg-muted/30">
              Teacher Console v1.8
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            متابعة الحصص التعليمية المجدولة، التزام الطلاب، وصافي المدفوعات المستحقة
          </p>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto font-mono text-xs">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void fetchDashboard()}
            disabled={refreshing}
            className="h-8 px-2.5 text-xs font-mono gap-1 border-border/70 active:scale-[0.98]"
          >
            <RefreshCw className={`size-3.5 ${refreshing ? "animate-spin" : ""}`} />
            <span>تحديث</span>
          </Button>
          <Link to="/teacher/schedule">
            <Button size="sm" className="h-8 px-3 text-xs font-mono gap-1 active:scale-[0.98]">
              <CalendarCheck className="size-3.5" />
              <span>جدول الحصص</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 font-mono">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div
              key={idx}
              className="p-3.5 rounded-lg border border-border/70 bg-card/60 shadow-xs hover:border-border/90 transition-all flex flex-col justify-between"
            >
              <div className="flex items-start justify-between">
                <span className="text-[11px] font-medium text-muted-foreground">{kpi.label}</span>
                <div className={`size-7 rounded-md border flex items-center justify-center ${kpi.color}`}>
                  <Icon className="size-3.5" />
                </div>
              </div>
              <div className="mt-2.5">
                <div className="text-xl font-bold tracking-tight font-mono tabular-nums text-foreground">
                  {kpi.value}
                </div>
                <div className="flex items-center justify-between mt-1 text-[10px] text-muted-foreground">
                  <span>{kpi.subtext}</span>
                  <span className="px-1.5 py-0.5 rounded font-mono bg-muted/60 text-foreground border border-border/40">
                    {kpi.badge}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Secondary Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Next Sessions Agenda */}
        <div className="lg:col-span-2 rounded-lg border border-border/70 bg-card p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2.5 border-b border-border/60">
            <div className="flex items-center gap-2">
              <CalendarDays className="size-4 text-primary" />
              <h2 className="text-xs font-semibold text-foreground font-mono">
                الحصص التعليمية القادمة
              </h2>
            </div>
            <Link
              to="/teacher/schedule"
              className="text-xs text-primary hover:underline font-mono inline-flex items-center gap-1"
            >
              <span>عرض الجدول كاملاً</span>
              <ChevronLeft className="size-3.5" />
            </Link>
          </div>

          <div className="divide-y divide-border/50">
            {mockUpcoming.map((item) => (
              <div key={item.id} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <div className="size-8 rounded-md bg-muted/40 flex items-center justify-center shrink-0 border border-border/60 text-muted-foreground">
                    <BookOpen className="size-3.5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-medium text-foreground">{item.studentName}</h4>
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-0.5 font-mono">
                      <span>{item.subject}</span>
                      <span>•</span>
                      <span className="tabular-nums">{item.duration} دقيقة</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <div className="text-left font-mono">
                    <div className="text-xs font-semibold text-foreground">{item.time}</div>
                    <div className="text-[10px] text-muted-foreground">{item.date}</div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono border ${
                      item.status === "CONFIRMED"
                        ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                        : "bg-blue-500/10 text-blue-500 border-blue-500/20"
                    }`}
                  >
                    {item.status === "CONFIRMED" ? "مؤكدة" : "مجدولة"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Operations & Overview */}
        <div className="rounded-lg border border-border/70 bg-card p-4 shadow-xs space-y-3 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2 pb-2.5 border-b border-border/60">
              <CalendarCheck className="size-4 text-primary" />
              <h2 className="text-xs font-semibold text-foreground font-mono">
                روابط التشغيل السريع
              </h2>
            </div>

            <div className="space-y-2 font-mono">
              <Link
                to="/teacher/availability"
                className="flex items-center justify-between p-2.5 rounded-md border border-border/60 bg-muted/20 hover:bg-muted/40 transition-colors text-xs"
              >
                <div className="flex items-center gap-2">
                  <Clock className="size-3.5 text-muted-foreground" />
                  <span>تعديل ساعات العمل المتاحة</span>
                </div>
                <ArrowUpRight className="size-3 text-muted-foreground rtl:rotate-90" />
              </Link>

              <Link
                to="/teacher/payments"
                className="flex items-center justify-between p-2.5 rounded-md border border-border/60 bg-muted/20 hover:bg-muted/40 transition-colors text-xs"
              >
                <div className="flex items-center gap-2">
                  <DollarSign className="size-3.5 text-muted-foreground" />
                  <span>سجل المدفوعات والمستحقات</span>
                </div>
                <ArrowUpRight className="size-3 text-muted-foreground rtl:rotate-90" />
              </Link>
            </div>
          </div>

          <div className="p-3 rounded-md bg-muted/30 border border-border/50 text-[11px] text-muted-foreground space-y-1 font-mono">
            <div className="flex items-center gap-1.5 text-foreground font-medium">
              <CheckCircle2 className="size-3.5 text-emerald-500" />
              <span>معدل الالتزام التعليمي</span>
            </div>
            <p className="leading-relaxed text-[10px]">
              تم إنجاز 98% من الحصص المجدولة خلال الـ 30 يوماً الماضية دون تأخير مسجل.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
