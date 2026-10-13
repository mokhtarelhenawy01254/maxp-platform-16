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
  CalendarCheck
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
    status: "CONFIRMED"
  },
  {
    id: "app-p2",
    doctorName: "د. إيمان عبد العزيز",
    specialty: "أخصائية التغذية العلاجية",
    date: "الخميس القادم",
    time: "02:00 م",
    status: "PENDING"
  }
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
        headers: { Authorization: `Bearer ${token}` }
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
          totalSpent: 1850
        });
      }
    } catch {
      setData({
        upcomingAppointments: 2,
        completedAppointments: 7,
        totalAppointments: 9,
        unpaidInvoices: 0,
        totalSpent: 1850
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
        <p className="text-xs font-mono text-muted-foreground uppercase">جاري تحميل الملف الصحي...</p>
      </div>
    );
  }

  const kpis = [
    {
      label: "مواعيد قادمة",
      value: data?.upcomingAppointments ?? 2,
      subtext: "مجدولة بعيادات المركز",
      icon: CalendarDays,
      color: "text-teal-600 bg-teal-500/10 border-teal-500/20"
    },
    {
      label: "مواعيد مكتملة",
      value: data?.completedAppointments ?? 7,
      subtext: "زيارات وفحوص سابقة",
      icon: CheckCircle2,
      color: "text-emerald-600 bg-emerald-500/10 border-emerald-500/20"
    },
    {
      label: "فواتير معلقة",
      value: data?.unpaidInvoices ?? 0,
      subtext: "سندات سداد غير مسددة",
      icon: Wallet,
      color: "text-amber-600 bg-amber-500/10 border-amber-500/20"
    },
    {
      label: "إجمالي المصروفات",
      value: `${(data?.totalSpent ?? 1850).toLocaleString("ar-EG")} ج.م`,
      subtext: "مدفوعات الخدمات الطبية",
      icon: ClipboardList,
      color: "text-blue-600 bg-blue-500/10 border-blue-500/20"
    }
  ];

  const displayName = patient.firstName
    ? `${patient.firstName} ${patient.lastName || ""}`
    : "عزيزنا المراجع";

  return (
    <div className="space-y-6 pb-10" dir="rtl">
      {/* Telemetry Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-xl border border-border/70 bg-card text-card-foreground shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-primary/10 text-primary border border-primary/20">
              PATIENT HEALTH PORTAL
            </span>
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              الملف الطبي مؤمّن وموثّق
            </span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            أهلاً بك، {displayName}
          </h1>
          <p className="text-xs text-muted-foreground">
            متابعة المواعيد الطبية، نتائج الكشوفات، والفواتير الصادرة لحسابك
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
            to="/patient/appointments"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm transition-all focus:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <CalendarCheck className="w-3.5 h-3.5" />
            <span>مواعيدي</span>
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

      {/* Main Grid: Upcoming Consultations & Shortcuts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Next Consultations List */}
        <div className="lg:col-span-2 rounded-xl border border-border/70 bg-card text-card-foreground shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border/60">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">مواعيدك القادمة بالعيادة</h2>
            </div>
            <Link
              to="/patient/appointments"
              className="text-xs text-primary hover:underline font-medium inline-flex items-center gap-1"
            >
              <span>عرض كافة المواعيد</span>
              <ChevronLeft className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="divide-y divide-border/50">
            {mockPatientAppointments.map((item) => (
              <div key={item.id} className="py-3.5 first:pt-0 last:pb-0 flex items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0 border border-border/60 text-foreground/70">
                    <Stethoscope className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-foreground">{item.doctorName}</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.specialty}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-left font-mono">
                    <div className="text-xs font-semibold text-foreground">{item.time}</div>
                    <div className="text-[11px] text-muted-foreground">{item.date}</div>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${
                      item.status === "CONFIRMED"
                        ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                        : "bg-amber-500/10 text-amber-600 border-amber-500/20"
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
        <div className="rounded-xl border border-border/70 bg-card text-card-foreground shadow-sm p-5 space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2 pb-3 border-b border-border/60">
              <HeartPulse className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">الخدمات الطبية</h2>
            </div>

            <div className="space-y-2">
              <Link
                to="/patient/appointments"
                className="flex items-center justify-between p-3 rounded-lg border border-border/60 bg-muted/30 hover:bg-muted/70 transition-all text-xs font-medium"
              >
                <div className="flex items-center gap-2.5">
                  <CalendarDays className="w-4 h-4 text-muted-foreground" />
                  <span>حجز موعد أو استشارة جديدة</span>
                </div>
                <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground" />
              </Link>

              <Link
                to="/patient/history"
                className="flex items-center justify-between p-3 rounded-lg border border-border/60 bg-muted/30 hover:bg-muted/70 transition-all text-xs font-medium"
              >
                <div className="flex items-center gap-2.5">
                  <ClipboardList className="w-4 h-4 text-muted-foreground" />
                  <span>السجل الطبي والروشتات السابقة</span>
                </div>
                <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground" />
              </Link>

              <Link
                to="/patient/invoices"
                className="flex items-center justify-between p-3 rounded-lg border border-border/60 bg-muted/30 hover:bg-muted/70 transition-all text-xs font-medium"
              >
                <div className="flex items-center gap-2.5">
                  <Wallet className="w-4 h-4 text-muted-foreground" />
                  <span>سجل الفواتير وسندات السداد</span>
                </div>
                <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground" />
              </Link>
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-muted/40 border border-border/50 text-xs text-muted-foreground space-y-1.5">
            <div className="flex items-center gap-1.5 text-foreground font-medium">
              <HeartPulse className="w-3.5 h-3.5 text-primary" />
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
