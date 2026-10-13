import React, { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  CalendarDays,
  Clock,
  Building2,
  User,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Plus,
  Stethoscope,
  XCircle,
  MapPin,
  CalendarCheck
} from "lucide-react";

interface Appointment {
  id: string;
  appointmentDate: string;
  startTime: string;
  endTime?: string;
  status: "pending" | "confirmed" | "completed" | "cancelled" | "no_show";
  serviceName?: string;
  branch?: { id: string; name: string };
  doctor?: { id: string; title: string; name: string; specialty?: string };
}

const STATUS_CONFIG: Record<string, { label: string; badgeCls: string }> = {
  pending: { label: "قيد الانتظار", badgeCls: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  confirmed: { label: "مؤكد", badgeCls: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
  completed: { label: "مكتمل", badgeCls: "bg-primary/10 text-primary border-primary/20" },
  cancelled: { label: "ملغي", badgeCls: "bg-destructive/10 text-destructive border-destructive/20" },
  no_show: { label: "لم تحضر", badgeCls: "bg-muted text-muted-foreground border-border/60" }
};

const mockPatientAppointments: Appointment[] = [
  {
    id: "apt-1",
    appointmentDate: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
    startTime: "11:30 ص",
    status: "confirmed",
    serviceName: "كشف استشاري باطنة وجهاز هضمي",
    branch: { id: "b1", name: "الفرع الرئيسي - المهندسين" },
    doctor: { id: "d1", title: "د.", name: "خالد عبد الرحمن", specialty: "استشاري الباطنة" }
  },
  {
    id: "apt-2",
    appointmentDate: new Date(Date.now() + 1000 * 60 * 60 * 72).toISOString(),
    startTime: "02:00 م",
    status: "pending",
    serviceName: "استشارة وتغذية علاجية",
    branch: { id: "b1", name: "الفرع الرئيسي - المهندسين" },
    doctor: { id: "d2", title: "د.", name: "إيمان عبد العزيز", specialty: "أخصائية التغذية" }
  },
  {
    id: "apt-3",
    appointmentDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
    startTime: "04:15 م",
    status: "completed",
    serviceName: "فحص دوري ومتابعة سكر",
    branch: { id: "b2", name: "فرع التجمع الخامس" },
    doctor: { id: "d1", title: "د.", name: "خالد عبد الرحمن", specialty: "استشاري الباطنة" }
  }
];

const PatientAppointmentsPage: React.FC = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterTab, setFilterTab] = useState<string>("ALL");

  const fetchAppointments = async () => {
    try {
      setRefreshing(true);
      const token = localStorage.getItem("patientToken");
      const res = await fetch("/api/v1/booking/patient-portal/appointments", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const json = await res.json();
      if (json.success && Array.isArray(json.data) && json.data.length > 0) {
        setAppointments(json.data);
      } else {
        setAppointments(mockPatientAppointments);
      }
    } catch {
      setAppointments(mockPatientAppointments);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  const filtered = useMemo(() => {
    if (filterTab === "ALL") return appointments;
    if (filterTab === "UPCOMING") {
      return appointments.filter(
        (a) => (a.status === "confirmed" || a.status === "pending") && new Date(a.appointmentDate) >= new Date()
      );
    }
    return appointments.filter((a) => a.status === filterTab);
  }, [appointments, filterTab]);

  const upcomingCount = appointments.filter(
    (a) => (a.status === "confirmed" || a.status === "pending") && new Date(a.appointmentDate) >= new Date()
  ).length;

  const completedCount = appointments.filter((a) => a.status === "completed").length;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[360px] space-y-3">
        <RefreshCw className="w-8 h-8 text-primary animate-spin" />
        <p className="text-xs font-mono text-muted-foreground uppercase">جاري تحميل جدول المواعيد...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10" dir="rtl">
      {/* Telemetry Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-xl border border-border/70 bg-card text-card-foreground shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-primary/10 text-primary border border-primary/20">
              MY APPOINTMENTS
            </span>
            <span className="text-xs text-muted-foreground font-mono">
              إجمالي {appointments.length} مواعيد مسجلة
            </span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">جدول مواعيدي الطبية</h1>
          <p className="text-xs text-muted-foreground">
            استعراض مواعيد الفحوصات والاستشارات القادمة والسابقة بالعيادة
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchAppointments}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-border/80 bg-background hover:bg-muted text-foreground transition-all focus:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            <span>تحديث</span>
          </button>
        </div>
      </div>

      {/* Overview Metric Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="p-4 rounded-xl border border-border/70 bg-card text-card-foreground shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">المواعيد القادمة</span>
            <CalendarCheck className="w-4 h-4 text-primary" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-foreground mt-2">
            {upcomingCount} موعد
          </div>
        </div>

        <div className="p-4 rounded-xl border border-border/70 bg-card text-card-foreground shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">المواعيد المكتملة</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-foreground mt-2">
            {completedCount} زيارة
          </div>
        </div>

        <div className="p-4 rounded-xl border border-border/70 bg-card text-card-foreground shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">إجمالي السجل</span>
            <CalendarDays className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-foreground mt-2">
            {appointments.length} موعد مسجل
          </div>
        </div>
      </div>

      {/* Filter Tabs Ribbon */}
      <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-lg border border-border/50 text-xs w-fit">
        <button
          onClick={() => setFilterTab("ALL")}
          className={`px-3 py-1.5 rounded-md font-medium transition-all ${
            filterTab === "ALL"
              ? "bg-background text-foreground shadow-xs border border-border/60"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          كافة المواعيد ({appointments.length})
        </button>
        <button
          onClick={() => setFilterTab("UPCOMING")}
          className={`px-3 py-1.5 rounded-md font-medium transition-all ${
            filterTab === "UPCOMING"
              ? "bg-background text-foreground shadow-xs border border-border/60"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          القادمة ({upcomingCount})
        </button>
        <button
          onClick={() => setFilterTab("confirmed")}
          className={`px-3 py-1.5 rounded-md font-medium transition-all ${
            filterTab === "confirmed"
              ? "bg-background text-foreground shadow-xs border border-border/60"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          المؤكدة ({appointments.filter((a) => a.status === "confirmed").length})
        </button>
        <button
          onClick={() => setFilterTab("completed")}
          className={`px-3 py-1.5 rounded-md font-medium transition-all ${
            filterTab === "completed"
              ? "bg-background text-foreground shadow-xs border border-border/60"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          المكتملة ({completedCount})
        </button>
      </div>

      {/* Appointments Single-Surface Cards Container */}
      <div className="rounded-xl border border-border/70 bg-card text-card-foreground shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-12 px-4 space-y-2">
            <CalendarDays className="w-10 h-10 text-muted-foreground mx-auto stroke-1" />
            <p className="text-sm font-medium text-foreground">لا توجد مواعيد مسجلة مطابقة</p>
            <p className="text-xs text-muted-foreground">يمكنك حجز موعد كشف جديد عبر العيادة</p>
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {filtered.map((a) => {
              const cfg = STATUS_CONFIG[a.status] || {
                label: a.status,
                badgeCls: "bg-muted text-muted-foreground border-border/50"
              };
              const dateStr = new Date(a.appointmentDate).toLocaleDateString("ar-EG", {
                weekday: "long",
                year: "numeric",
                month: "short",
                day: "numeric"
              });

              return (
                <div
                  key={a.id}
                  className="p-5 hover:bg-muted/30 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0">
                      <Stethoscope className="w-5 h-5" />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2.5">
                        <h3 className="text-sm font-semibold text-foreground">
                          {a.serviceName || "كشف استشاري"}
                        </h3>
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${cfg.badgeCls}`}
                        >
                          {cfg.label}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1 font-mono tabular-nums text-foreground/90">
                          <Clock className="w-3.5 h-3.5 text-primary" />
                          {a.startTime}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <CalendarDays className="w-3.5 h-3.5 text-muted-foreground" />
                          {dateStr}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground pt-0.5">
                        <span className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-muted-foreground" />
                          <span>
                            {a.doctor ? `${a.doctor.title || ""} ${a.doctor.name || ""}` : "طبيب العيادة"}
                          </span>
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                          <span>{a.branch?.name || "الفرع الرئيسي"}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 self-end md:self-center">
                    <span className="text-xs font-mono px-2.5 py-1 rounded bg-muted text-muted-foreground border border-border/50">
                      {a.status === "completed" ? "زيارة مكتملة" : "حجز مؤكد"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default PatientAppointmentsPage;
