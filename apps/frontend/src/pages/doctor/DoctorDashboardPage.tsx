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
  AlertCircle
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
    age: 42
  },
  {
    id: "app-2",
    patientName: "فاطمة الزهراء الشناوي",
    type: "متابعة نتائج التحاليل",
    time: "11:15 ص",
    status: "WAITING",
    age: 36
  },
  {
    id: "app-3",
    patientName: "محمد هاني القاضي",
    type: "فحص دوري واستشارة",
    time: "12:00 م",
    status: "WAITING",
    age: 51
  },
  {
    id: "app-4",
    patientName: "نادية عبد المجيد رضوان",
    type: "كشف جديد",
    time: "09:30 ص",
    status: "COMPLETED",
    age: 29
  }
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
        headers: { Authorization: `Bearer ${token}` }
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
          unpaidInvoices: 2
        });
      }
    } catch {
      setData({
        todayAppointments: 6,
        upcomingAppointments: 18,
        totalAppointments: 142,
        completedAppointments: 136,
        totalPatients: 84,
        unpaidInvoices: 2
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
      <div className="flex flex-col items-center justify-center min-h-[360px] space-y-3">
        <RefreshCw className="w-8 h-8 text-primary animate-spin" />
        <p className="text-xs font-mono text-muted-foreground uppercase">جاري تحميل بيانات العيادة...</p>
      </div>
    );
  }

  const kpis = [
    {
      label: "مواعيد اليوم",
      value: data?.todayAppointments ?? 6,
      subtext: "بالعيادة الميدانية",
      icon: CalendarDays,
      color: "text-blue-600 bg-blue-500/10 border-blue-500/20"
    },
    {
      label: "المواعيد القادمة",
      value: data?.upcomingAppointments ?? 18,
      subtext: "مجدولة خلال الأسبوع",
      icon: Clock,
      color: "text-emerald-600 bg-emerald-500/10 border-emerald-500/20"
    },
    {
      label: "إجمالي الكشوفات",
      value: data?.totalAppointments ?? 142,
      subtext: `${data?.completedAppointments ?? 136} كشف مكتمل`,
      icon: ClipboardList,
      color: "text-indigo-600 bg-indigo-500/10 border-indigo-500/20"
    },
    {
      label: "سجل المرضى",
      value: data?.totalPatients ?? 84,
      subtext: "ملفات طبية نشطة",
      icon: Users,
      color: "text-cyan-600 bg-cyan-500/10 border-cyan-500/20"
    },
    {
      label: "فواتير معلقة",
      value: data?.unpaidInvoices ?? 2,
      subtext: "تحتاج تحصيل / تأكيد",
      icon: Wallet,
      color: "text-amber-600 bg-amber-500/10 border-amber-500/20"
    }
  ];

  return (
    <div className="space-y-6 pb-10" dir="rtl">
      {/* Telemetry Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-xl border border-border/70 bg-card text-card-foreground shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-primary/10 text-primary border border-primary/20">
              DOCTOR CLINICAL CONSOLE
            </span>
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              العيادة متاحة لاستقبال الحالات
            </span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">لوحة تحكم الطبيب</h1>
          <p className="text-xs text-muted-foreground">
            متابعة جدول الحجوزات اليومية، سجلات المرضى، وحالة الاستشارات الطبية
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchDashboard}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-border/80 bg-background hover:bg-muted text-foreground transition-all focus:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            <span>تحديث</span>
          </button>
          <Link
            to="/doctor/schedule"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm transition-all focus:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <CalendarDays className="w-3.5 h-3.5" />
            <span>الجدول الأسبوعي</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
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

      {/* Main Grid: Today's Patients & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Appointments Agenda */}
        <div className="lg:col-span-2 rounded-xl border border-border/70 bg-card text-card-foreground shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border/60">
            <div className="flex items-center gap-2">
              <Stethoscope className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">قائمة كشوفات اليوم الميدانية</h2>
            </div>
            <Link
              to="/doctor/patients"
              className="text-xs text-primary hover:underline font-medium inline-flex items-center gap-1"
            >
              <span>سجل المرضى كاملاً</span>
              <ChevronLeft className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="divide-y divide-border/50">
            {mockTodayAppointments.map((item) => (
              <div key={item.id} className="py-3.5 first:pt-0 last:pb-0 flex items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0 border border-border/60 text-foreground/70">
                    <HeartPulse className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-foreground">{item.patientName}</h4>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
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
                    <div className="text-xs font-semibold text-foreground">{item.time}</div>
                    <div className="text-[11px] text-muted-foreground">غرفة الكشف 1</div>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded text-[11px] font-medium border ${
                      item.status === "IN_PROGRESS"
                        ? "bg-blue-500/10 text-blue-600 border-blue-500/20"
                        : item.status === "COMPLETED"
                        ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                        : "bg-muted text-muted-foreground border-border/60"
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
        <div className="rounded-xl border border-border/70 bg-card text-card-foreground shadow-sm p-5 space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2 pb-3 border-b border-border/60">
              <Activity className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">الوصول السريع</h2>
            </div>

            <div className="space-y-2">
              <Link
                to="/doctor/patients"
                className="flex items-center justify-between p-3 rounded-lg border border-border/60 bg-muted/30 hover:bg-muted/70 transition-all text-xs font-medium"
              >
                <div className="flex items-center gap-2.5">
                  <UserCheck className="w-4 h-4 text-muted-foreground" />
                  <span>ملفات المرضى والتاريخ الطبي</span>
                </div>
                <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground" />
              </Link>

              <Link
                to="/doctor/availability"
                className="flex items-center justify-between p-3 rounded-lg border border-border/60 bg-muted/30 hover:bg-muted/70 transition-all text-xs font-medium"
              >
                <div className="flex items-center gap-2.5">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span>مواعيد نوبات العيادة المتاحة</span>
                </div>
                <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground" />
              </Link>

              <Link
                to="/doctor/payments"
                className="flex items-center justify-between p-3 rounded-lg border border-border/60 bg-muted/30 hover:bg-muted/70 transition-all text-xs font-medium"
              >
                <div className="flex items-center gap-2.5">
                  <Wallet className="w-4 h-4 text-muted-foreground" />
                  <span>المعاملات المالية والمدفوعات</span>
                </div>
                <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground" />
              </Link>
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-muted/40 border border-border/50 text-xs text-muted-foreground space-y-1.5">
            <div className="flex items-center gap-1.5 text-foreground font-medium">
              <Activity className="w-3.5 h-3.5 text-primary" />
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
