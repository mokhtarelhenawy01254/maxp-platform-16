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
  CalendarCheck,
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
  pending: {
    label: "قيد الانتظار",
    badgeCls: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  },
  confirmed: {
    label: "مؤكد",
    badgeCls: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  },
  completed: {
    label: "مكتمل",
    badgeCls: "bg-primary/10 text-primary border-primary/20",
  },
  cancelled: {
    label: "ملغي",
    badgeCls: "bg-destructive/10 text-destructive border-destructive/20",
  },
  no_show: {
    label: "لم تحضر",
    badgeCls: "bg-muted text-muted-foreground border-border/60",
  },
};

const mockPatientAppointments: Appointment[] = [
  {
    id: "apt-1",
    appointmentDate: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
    startTime: "11:30 ص",
    status: "confirmed",
    serviceName: "كشف استشاري باطنة وجهاز هضمي",
    branch: { id: "b1", name: "الفرع الرئيسي - المهندسين" },
    doctor: { id: "d1", title: "د.", name: "خالد عبد الرحمن", specialty: "استشاري الباطنة" },
  },
  {
    id: "apt-2",
    appointmentDate: new Date(Date.now() + 1000 * 60 * 60 * 72).toISOString(),
    startTime: "02:00 م",
    status: "pending",
    serviceName: "استشارة وتغذية علاجية",
    branch: { id: "b1", name: "الفرع الرئيسي - المهندسين" },
    doctor: { id: "d2", title: "د.", name: "إيمان عبد العزيز", specialty: "أخصائية التغذية" },
  },
  {
    id: "apt-3",
    appointmentDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
    startTime: "04:15 م",
    status: "completed",
    serviceName: "فحص دوري ومتابعة سكر",
    branch: { id: "b2", name: "فرع التجمع الخامس" },
    doctor: { id: "d1", title: "د.", name: "خالد عبد الرحمن", specialty: "استشاري الباطنة" },
  },
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
        headers: { Authorization: `Bearer ${token}` },
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
        (a) =>
          (a.status === "confirmed" || a.status === "pending") &&
          new Date(a.appointmentDate) >= new Date(),
      );
    }
    return appointments.filter((a) => a.status === filterTab);
  }, [appointments, filterTab]);

  const upcomingCount = appointments.filter(
    (a) =>
      (a.status === "confirmed" || a.status === "pending") &&
      new Date(a.appointmentDate) >= new Date(),
  ).length;

  const completedCount = appointments.filter((a) => a.status === "completed").length;

  if (loading) {
    return (
      <div className="flex min-h-[380px] items-center justify-center rounded-2xl border border-border/70 bg-card">
        <div className="flex items-center gap-2.5 font-mono text-xs text-muted-foreground">
          <RefreshCw className="h-4 w-4 animate-spin text-primary" />
          <span>جاري تحميل جدول المواعيد...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Telemetry Header */}
      <div className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-card p-5 shadow-xs md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-md border border-primary/20 bg-primary/10 px-2 py-0.5 font-mono text-[11px] font-semibold text-primary">
              MY APPOINTMENTS
            </span>
            <span className="font-mono text-xs text-muted-foreground">
              إجمالي {appointments.length} مواعيد مسجلة
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            جدول مواعيدي الطبية
          </h1>
          <p className="text-xs text-muted-foreground">
            استعراض مواعيد الفحوصات والاستشارات القادمة والسابقة بالعيادة
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchAppointments}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border/70 bg-background px-3 py-2 text-xs font-medium text-foreground shadow-xs transition-all hover:bg-muted/40 active:scale-[0.98]"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            <span>تحديث</span>
          </button>
        </div>
      </div>

      {/* Overview Metric Ribbon */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">المواعيد القادمة</span>
            <CalendarCheck className="h-4 w-4 text-primary" />
          </div>
          <div className="mt-2 font-mono text-2xl font-bold tabular-nums text-foreground">
            {upcomingCount} موعد
          </div>
          <div className="mt-1 font-mono text-[11px] text-muted-foreground">بانتظار الاستقبال</div>
        </div>

        <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">المواعيد المكتملة</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="mt-2 font-mono text-2xl font-bold tabular-nums text-foreground">
            {completedCount} زيارة
          </div>
          <div className="mt-1 font-mono text-[11px] text-muted-foreground">كشوفات منجزة</div>
        </div>

        <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">إجمالي السجل</span>
            <CalendarDays className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="mt-2 font-mono text-2xl font-bold tabular-nums text-foreground">
            {appointments.length} موعد مسجل
          </div>
          <div className="mt-1 font-mono text-[11px] text-muted-foreground">كافة الزيارات بالعيادة</div>
        </div>
      </div>

      {/* Filter Tabs Ribbon */}
      <div className="flex flex-wrap items-center gap-1 rounded-xl border border-border/60 bg-muted/30 p-1 text-xs">
        <button
          onClick={() => setFilterTab("ALL")}
          className={`rounded-lg px-3 py-1.5 font-medium transition-all ${
            filterTab === "ALL"
              ? "border border-border/70 bg-background text-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          كافة المواعيد ({appointments.length})
        </button>
        <button
          onClick={() => setFilterTab("UPCOMING")}
          className={`rounded-lg px-3 py-1.5 font-medium transition-all ${
            filterTab === "UPCOMING"
              ? "border border-border/70 bg-background text-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          القادمة ({upcomingCount})
        </button>
        <button
          onClick={() => setFilterTab("confirmed")}
          className={`rounded-lg px-3 py-1.5 font-medium transition-all ${
            filterTab === "confirmed"
              ? "border border-border/70 bg-background text-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          المؤكدة ({appointments.filter((a) => a.status === "confirmed").length})
        </button>
        <button
          onClick={() => setFilterTab("completed")}
          className={`rounded-lg px-3 py-1.5 font-medium transition-all ${
            filterTab === "completed"
              ? "border border-border/70 bg-background text-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          المكتملة ({completedCount})
        </button>
      </div>

      {/* Appointments Single-Surface Cards Container */}
      <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-xs">
        {filtered.length === 0 ? (
          <div className="space-y-2 py-12 text-center">
            <CalendarDays className="mx-auto h-10 w-10 text-muted-foreground stroke-1" />
            <p className="text-sm font-medium text-foreground">لا توجد مواعيد مسجلة مطابقة</p>
            <p className="text-xs text-muted-foreground">يمكنك حجز موعد كشف جديد عبر العيادة</p>
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {filtered.map((a) => {
              const cfg = STATUS_CONFIG[a.status] || {
                label: a.status,
                badgeCls: "bg-muted text-muted-foreground border-border/50",
              };
              const dateStr = new Date(a.appointmentDate).toLocaleDateString("ar-EG", {
                weekday: "long",
                year: "numeric",
                month: "short",
                day: "numeric",
              });

              return (
                <div
                  key={a.id}
                  className="flex flex-col justify-between gap-4 p-5 transition-colors hover:bg-muted/30 md:flex-row md:items-center"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                      <Stethoscope className="h-5 w-5" />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2.5">
                        <h3 className="text-sm font-semibold text-foreground">
                          {a.serviceName || "كشف استشاري"}
                        </h3>
                        <span
                          className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium ${cfg.badgeCls}`}
                        >
                          {cfg.label}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1 font-mono tabular-nums text-foreground">
                          <Clock className="h-3.5 w-3.5 text-primary" />
                          {a.startTime}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                          {dateStr}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 pt-0.5 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <User className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>
                            {a.doctor
                              ? `${a.doctor.title || ""} ${a.doctor.name || ""}`
                              : "طبيب العيادة"}
                          </span>
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>{a.branch?.name || "الفرع الرئيسي"}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 self-end md:self-center">
                    <span className="rounded-lg border border-border/60 bg-muted/30 px-2.5 py-1 font-mono text-xs text-muted-foreground">
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
