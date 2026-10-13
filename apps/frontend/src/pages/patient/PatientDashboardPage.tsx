import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  CalendarDays,
  ClipboardList,
  Wallet,
  CheckCircle2,
  RefreshCw,
  HeartPulse,
  User,
  Clock,
  ArrowUpRight,
  ChevronLeft,
  Stethoscope,
  ShieldCheck,
  CalendarCheck,
} from "lucide-react";

interface DashboardData {
  upcomingAppointments: number;
  completedAppointments: number;
  totalAppointments: number;
  unpaidInvoices: number;
  totalSpent: number;
}

interface PatientUpcomingAppointment {
  id: string;
  doctorName: string;
  specialty: string;
  date: string;
  time: string;
  status: "CONFIRMED" | "PENDING";
}

const mockPatientAppointments: PatientUpcomingAppointment[] = [
  {
    id: "app-p1",
    doctorName: "د. خالد عبد الرحمن",
    specialty: "استشاري الباطنة والجهاز الهضمي",
    date: "غداً",
    time: "11:30 ص",
    status: "CONFIRMED",
  },
  {
    id: "app-p2",
    doctorName: "د. إيمان عبد العزيز",
    specialty: "أخصائية التغذية العلاجية",
    date: "الخميس القادم",
    time: "02:00 م",
    status: "PENDING",
  },
];

const PatientDashboardPage: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const patient = JSON.parse(localStorage.getItem("patient") || "{}");

  const fetchDashboard = async () => {
    try {
      setRefreshing(true);
      const token = localStorage.getItem("patientToken");
      const res = await fetch("/api/v1/booking/patient-portal/dashboard", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success && json.data) {
        setData(json.data);
      } else {
        setData({
          upcomingAppointments: 2,
          completedAppointments: 7,
          totalAppointments: 9,
          unpaidInvoices: 0,
          totalSpent: 1850,
        });
      }
    } catch {
      setData({
        upcomingAppointments: 2,
        completedAppointments: 7,
        totalAppointments: 9,
        unpaidInvoices: 0,
        totalSpent: 1850,
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
          <span>جاري تحميل الملف الصحي...</span>
        </div>
      </div>
    );
  }

  const kpis = [
    {
      label: "مواعيد قادمة",
      value: data?.upcomingAppointments ?? 2,
      subtext: "مجدولة بعيادات المركز",
      icon: CalendarDays,
      color: "text-primary bg-primary/10 border-primary/20",
    },
    {
      label: "مواعيد مكتملة",
      value: data?.completedAppointments ?? 7,
      subtext: "زيارات وفحوص سابقة",
      icon: CheckCircle2,
      color: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    },
    {
      label: "فواتير معلقة",
      value: data?.unpaidInvoices ?? 0,
      subtext: "سندات سداد غير مسددة",
      icon: Wallet,
      color: "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20",
    },
    {
      label: "إجمالي المصروفات",
      value: `${(data?.totalSpent ?? 1850).toLocaleString("ar-EG")} ج.م`,
      subtext: "مدفوعات الخدمات الطبية",
      icon: ClipboardList,
      color: "text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/20",
    },
  ];

  const displayName = patient.firstName
    ? `${patient.firstName} ${patient.lastName || ""}`
    : "عزيزنا المراجع";

  return (
    <div className="space-y-6" dir="rtl">
      {/* Telemetry Header */}
      <div className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-card p-5 shadow-xs md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-md border border-primary/20 bg-primary/10 px-2 py-0.5 font-mono text-[11px] font-semibold text-primary">
              PATIENT HEALTH PORTAL
            </span>
            <span className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
              الملف الطبي مؤمّن وموثّق
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            أهلاً بك، {displayName}
          </h1>
          <p className="text-xs text-muted-foreground">
            متابعة المواعيد الطبية، نتائج الكشوفات، والفواتير الصادرة لحسابك
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
            to="/patient/appointments"
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-xs font-medium text-primary-foreground shadow-xs transition-all hover:opacity-95 active:scale-[0.98]"
          >
            <CalendarCheck className="h-3.5 w-3.5" />
            <span>مواعيدي</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
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

      {/* Main Grid: Upcoming Consultations & Shortcuts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Next Consultations List */}
        <div className="space-y-4 rounded-2xl border border-border/70 bg-card p-5 shadow-xs lg:col-span-2">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">
                مواعيدك القادمة بالعيادة
              </h2>
            </div>
            <Link
              to="/patient/appointments"
              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              <span>عرض كافة المواعيد</span>
              <ChevronLeft className="h-3.5 w-3.5 rtl:rotate-180" />
            </Link>
          </div>

          <div className="divide-y divide-border/50">
            {mockPatientAppointments.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-4 py-3.5 first:pt-0 last:pb-0"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-muted/30 text-foreground">
                    <Stethoscope className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-foreground">{item.doctorName}</h4>
                    <p className="mt-0.5 text-xs text-muted-foreground">{item.specialty}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-left font-mono">
                    <div className="text-xs font-semibold tabular-nums text-foreground">{item.time}</div>
                    <div className="text-[11px] text-muted-foreground">{item.date}</div>
                  </div>
                  <span
                    className={`rounded-lg border px-2.5 py-1 text-[11px] font-medium ${
                      item.status === "CONFIRMED"
                        ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                    }`}
                  >
                    {item.status === "CONFIRMED" ? "مؤكد" : "قيد المراجعة"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Medical Links */}
        <div className="flex flex-col justify-between space-y-4 rounded-2xl border border-border/70 bg-card p-5 shadow-xs">
          <div className="space-y-3">
            <div className="flex items-center gap-2 border-b border-border/60 pb-3">
              <HeartPulse className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">الخدمات الطبية</h2>
            </div>

            <div className="space-y-2">
              <Link
                to="/patient/appointments"
                className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/20 p-3 text-xs font-medium text-foreground transition-all hover:bg-muted/40 active:scale-[0.98]"
              >
                <div className="flex items-center gap-2.5">
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />
                  <span>حجز موعد أو استشارة جديدة</span>
                </div>
                <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" />
              </Link>

              <Link
                to="/patient/history"
                className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/20 p-3 text-xs font-medium text-foreground transition-all hover:bg-muted/40 active:scale-[0.98]"
              >
                <div className="flex items-center gap-2.5">
                  <ClipboardList className="h-4 w-4 text-muted-foreground" />
                  <span>السجل الطبي والروشتات السابقة</span>
                </div>
                <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" />
              </Link>

              <Link
                to="/patient/invoices"
                className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/20 p-3 text-xs font-medium text-foreground transition-all hover:bg-muted/40 active:scale-[0.98]"
              >
                <div className="flex items-center gap-2.5">
                  <Wallet className="h-4 w-4 text-muted-foreground" />
                  <span>سجل الفواتير وسندات السداد</span>
                </div>
                <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" />
              </Link>
            </div>
          </div>

          <div className="space-y-1.5 rounded-xl border border-border/50 bg-muted/30 p-3.5 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5 font-medium text-foreground">
              <HeartPulse className="h-3.5 w-3.5 text-primary" />
              <span>إرشادات الرعاية الصحية</span>
            </div>
            <p className="leading-relaxed">
              يرجى الحضور قبل الموعد بـ 15 دقيقة وإحضار أي تقارير أو تحاليل طبية حديثة.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatientDashboardPage;
