import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  CalendarDays,
  Clock,
  Users,
  Wallet,
  ClipboardList,
  RefreshCw,
  HeartPulse,
  UserCheck,
  ChevronLeft,
  ArrowUpRight,
  Stethoscope,
  Activity,
  AlertCircle,
  Sparkles,
} from "lucide-react";

interface DashboardData {
  todayAppointments: number;
  upcomingAppointments: number;
  totalAppointments: number;
  completedAppointments: number;
  totalPatients: number;
  unpaidInvoices: number;
}

interface TodayAppointmentItem {
  id: string;
  patientName: string;
  type: string;
  time: string;
  status: "WAITING" | "IN_PROGRESS" | "COMPLETED";
  age?: number;
}

const mockTodayAppointments: TodayAppointmentItem[] = [
  {
    id: "app-1",
    patientName: "عبد الرحمن كمال الملاح",
    type: "كشف استشاري باطنة",
    time: "10:30 ص",
    status: "IN_PROGRESS",
    age: 42,
  },
  {
    id: "app-2",
    patientName: "فاطمة الزهراء الشناوي",
    type: "متابعة نتائج التحاليل",
    time: "11:15 ص",
    status: "WAITING",
    age: 36,
  },
  {
    id: "app-3",
    patientName: "محمد هاني القاضي",
    type: "فحص دوري واستشارة",
    time: "12:00 م",
    status: "WAITING",
    age: 51,
  },
  {
    id: "app-4",
    patientName: "نادية عبد المجيد رضوان",
    type: "كشف جديد",
    time: "09:30 ص",
    status: "COMPLETED",
    age: 29,
  },
];

const DoctorDashboardPage: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboard = async () => {
    try {
      setRefreshing(true);
      const token = localStorage.getItem("doctorToken");
      const res = await fetch("/api/v1/booking/doctor-portal/dashboard", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success && json.data) {
        setData(json.data);
      } else {
        setData({
          todayAppointments: 6,
          upcomingAppointments: 18,
          totalAppointments: 142,
          completedAppointments: 136,
          totalPatients: 84,
          unpaidInvoices: 2,
        });
      }
    } catch {
      setData({
        todayAppointments: 6,
        upcomingAppointments: 18,
        totalAppointments: 142,
        completedAppointments: 136,
        totalPatients: 84,
        unpaidInvoices: 2,
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[380px] items-center justify-center rounded-2xl border border-border/70 bg-card">
        <div className="flex items-center gap-2.5 font-mono text-xs text-muted-foreground">
          <RefreshCw className="h-4 w-4 animate-spin text-primary" />
          <span>جاري تحميل لوحة تحكم الطبيب...</span>
        </div>
      </div>
    );
  }

  const kpis = [
    {
      label: "مواعيد اليوم",
      value: data?.todayAppointments ?? 6,
      subtext: "بالعيادة الميدانية",
      icon: CalendarDays,
      color: "text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/20",
    },
    {
      label: "المواعيد القادمة",
      value: data?.upcomingAppointments ?? 18,
      subtext: "مجدولة خلال الأسبوع",
      icon: Clock,
      color: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    },
    {
      label: "إجمالي الكشوفات",
      value: data?.totalAppointments ?? 142,
      subtext: `${data?.completedAppointments ?? 136} كشف مكتمل`,
      icon: ClipboardList,
      color: "text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
    },
    {
      label: "سجل المرضى",
      value: data?.totalPatients ?? 84,
      subtext: "ملفات طبية نشطة",
      icon: Users,
      color: "text-cyan-600 dark:text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
    },
    {
      label: "فواتير معلقة",
      value: data?.unpaidInvoices ?? 2,
      subtext: "تحتاج تحصيل / تأكيد",
      icon: Wallet,
      color: "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20",
    },
  ];

  return (
    <div className="space-y-6" dir="rtl">
      {/* Telemetry Header */}
      <div className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-card p-5 shadow-xs md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-md border border-primary/20 bg-primary/10 px-2 py-0.5 font-mono text-[11px] font-semibold text-primary">
              DOCTOR CLINICAL CONSOLE
            </span>
            <span className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              العيادة جاهزة لاستقبال الكشوفات
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            لوحة تحكم الطبيب
          </h1>
          <p className="text-xs text-muted-foreground">
            متابعة جدول الحجوزات اليومية، سجلات المرضى، وحالة الاستشارات السريرية
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchDashboard}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border/70 bg-background px-3 py-2 text-xs font-medium text-foreground shadow-xs transition-all hover:bg-muted/40 active:scale-[0.98]"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            <span>تحديث</span>
          </button>
          <Link
            to="/doctor/schedule"
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-xs font-medium text-primary-foreground shadow-xs transition-all hover:opacity-95 active:scale-[0.98]"
          >
            <CalendarDays className="h-3.5 w-3.5" />
            <span>الجدول الأسبوعي</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div
              key={idx}
              className="flex flex-col justify-between rounded-2xl border border-border/70 bg-card p-4 shadow-xs transition-all hover:border-border"
            >
              <div className="flex items-start justify-between">
                <span className="text-xs font-medium text-muted-foreground">{kpi.label}</span>
                <div className={`rounded-xl border p-2 ${kpi.color}`}>
                  <Icon className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="font-mono text-2xl font-bold tabular-nums tracking-tight text-foreground">
                  {kpi.value}
                </div>
                <div className="mt-1 font-mono text-[11px] text-muted-foreground">
                  {kpi.subtext}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Grid: Today's Patients & Quick Actions */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Today's Appointments Agenda */}
        <div className="space-y-4 rounded-2xl border border-border/70 bg-card p-5 shadow-xs lg:col-span-2">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div className="flex items-center gap-2">
              <Stethoscope className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">
                قائمة كشوفات اليوم الميدانية
              </h2>
            </div>
            <Link
              to="/doctor/patients"
              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              <span>سجل المرضى كاملاً</span>
              <ChevronLeft className="h-3.5 w-3.5 rtl:rotate-180" />
            </Link>
          </div>

          <div className="divide-y divide-border/50">
            {mockTodayAppointments.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-4 py-3.5 first:pt-0 last:pb-0"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-muted/30 text-foreground">
                    <HeartPulse className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-foreground">{item.patientName}</h4>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{item.type}</span>
                      {item.age && (
                        <>
                          <span>•</span>
                          <span className="font-mono tabular-nums">{item.age} سنة</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-left font-mono">
                    <div className="text-xs font-semibold tabular-nums text-foreground">{item.time}</div>
                    <div className="text-[11px] text-muted-foreground">غرفة الكشف 1</div>
                  </div>

                  <span
                    className={`rounded-lg border px-2.5 py-1 text-[11px] font-medium ${
                      item.status === "IN_PROGRESS"
                        ? "border-blue-500/20 bg-blue-500/10 text-blue-600 dark:text-blue-400"
                        : item.status === "COMPLETED"
                        ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : "border-border/60 bg-muted text-muted-foreground"
                    }`}
                  >
                    {item.status === "IN_PROGRESS"
                      ? "قيد الكشف"
                      : item.status === "COMPLETED"
                      ? "مكتمل"
                      : "في الانتظار"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Clinical Operations */}
        <div className="flex flex-col justify-between space-y-4 rounded-2xl border border-border/70 bg-card p-5 shadow-xs">
          <div className="space-y-3">
            <div className="flex items-center gap-2 border-b border-border/60 pb-3">
              <Activity className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">الوصول السريع</h2>
            </div>

            <div className="space-y-2">
              <Link
                to="/doctor/patients"
                className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/20 p-3 text-xs font-medium text-foreground transition-all hover:bg-muted/40 active:scale-[0.98]"
              >
                <div className="flex items-center gap-2.5">
                  <UserCheck className="h-4 w-4 text-muted-foreground" />
                  <span>ملفات المرضى والتاريخ الطبي</span>
                </div>
                <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" />
              </Link>

              <Link
                to="/doctor/availability"
                className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/20 p-3 text-xs font-medium text-foreground transition-all hover:bg-muted/40 active:scale-[0.98]"
              >
                <div className="flex items-center gap-2.5">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>مواعيد نوبات العيادة المتاحة</span>
                </div>
                <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" />
              </Link>

              <Link
                to="/doctor/payments"
                className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/20 p-3 text-xs font-medium text-foreground transition-all hover:bg-muted/40 active:scale-[0.98]"
              >
                <div className="flex items-center gap-2.5">
                  <Wallet className="h-4 w-4 text-muted-foreground" />
                  <span>المعاملات المالية والمدفوعات</span>
                </div>
                <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" />
              </Link>
            </div>
          </div>

          <div className="space-y-1.5 rounded-xl border border-border/50 bg-muted/30 p-3.5 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5 font-medium text-foreground">
              <Activity className="h-3.5 w-3.5 text-primary" />
              <span>معدل إنجاز العيادة</span>
            </div>
            <p className="leading-relaxed">
              متوسط وقت الاستشارة 18 دقيقة مع نسبة رضا 99.2% وفقاً لتقييمات المراجعين.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DoctorDashboardPage;
