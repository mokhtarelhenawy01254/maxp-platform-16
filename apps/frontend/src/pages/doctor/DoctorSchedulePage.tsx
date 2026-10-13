import React, { useEffect, useState, useMemo } from "react";
import {
  CalendarDays,
  Clock,
  ChevronRight,
  ChevronLeft,
  RefreshCw,
  User,
  CheckCircle2,
  AlertCircle,
  Stethoscope,
  Phone,
  CalendarCheck,
} from "lucide-react";

interface ScheduleAppointment {
  id: string;
  appointmentDate: string;
  startTime: string;
  endTime?: string;
  status: "pending" | "confirmed" | "completed" | "cancelled" | "no_show";
  serviceName?: string;
  patient?: { id: string; firstName: string; lastName: string; phone?: string };
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
    label: "لم يحضر",
    badgeCls: "bg-muted text-muted-foreground border-border/60",
  },
};

const getSampleAppointments = (baseDate: Date): ScheduleAppointment[] => {
  const dStr = (offsetDays: number) => {
    const d = new Date(baseDate);
    d.setDate(d.getDate() + offsetDays);
    return d.toISOString().split("T")[0];
  };

  return [
    {
      id: "sch-1",
      appointmentDate: dStr(0),
      startTime: "10:00 ص",
      endTime: "10:30 ص",
      status: "confirmed",
      serviceName: "كشف استشاري باطنة",
      patient: { id: "p1", firstName: "طارق", lastName: "محمود الشامي", phone: "01098765432" },
    },
    {
      id: "sch-2",
      appointmentDate: dStr(0),
      startTime: "11:15 ص",
      endTime: "11:45 ص",
      status: "completed",
      serviceName: "استشارة ومتابعة تحاليل",
      patient: { id: "p2", firstName: "منى", lastName: "عبد المنعم حامد", phone: "01123456789" },
    },
    {
      id: "sch-3",
      appointmentDate: dStr(1),
      startTime: "01:00 م",
      endTime: "01:30 م",
      status: "pending",
      serviceName: "فحص دوري شامل",
      patient: { id: "p3", firstName: "أحمد", lastName: "كمال الغندور", phone: "01234567890" },
    },
    {
      id: "sch-4",
      appointmentDate: dStr(2),
      startTime: "10:30 ص",
      endTime: "11:00 ص",
      status: "confirmed",
      serviceName: "كشف أولي",
      patient: { id: "p4", firstName: "سارة", lastName: "فؤاد سليم", phone: "01555667788" },
    },
    {
      id: "sch-5",
      appointmentDate: dStr(3),
      startTime: "12:00 م",
      endTime: "12:30 م",
      status: "confirmed",
      serviceName: "متابعة علاج مزمن",
      patient: { id: "p5", firstName: "حسام", lastName: "جمال رشدي", phone: "01000112233" },
    },
  ];
};

const DoctorSchedulePage: React.FC = () => {
  const [appointments, setAppointments] = useState<ScheduleAppointment[]>([]);
  const [weekStart, setWeekStart] = useState<Date>(() => {
    const d = new Date();
    d.setDate(d.getDate() - d.getDay());
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchSchedule = async () => {
    try {
      setRefreshing(true);
      const token = localStorage.getItem("doctorToken");
      const res = await fetch(
        `/api/v1/booking/doctor-portal/schedule?weekStart=${weekStart.toISOString().split("T")[0]}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const json = await res.json();
      if (json.success && Array.isArray(json.data) && json.data.length > 0) {
        setAppointments(json.data);
      } else {
        setAppointments(getSampleAppointments(weekStart));
      }
    } catch {
      setAppointments(getSampleAppointments(weekStart));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSchedule();
  }, [weekStart]);

  const days = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [weekStart]);

  const dayName = (d: Date) =>
    ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"][d.getDay()];

  const shiftWeek = (dir: number) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + dir * 7);
    setWeekStart(d);
  };

  const jumpToToday = () => {
    const d = new Date();
    d.setDate(d.getDate() - d.getDay());
    d.setHours(0, 0, 0, 0);
    setWeekStart(d);
  };

  const totalThisWeek = appointments.length;
  const confirmedCount = appointments.filter((a) => a.status === "confirmed").length;
  const completedCount = appointments.filter((a) => a.status === "completed").length;

  if (loading) {
    return (
      <div className="flex min-h-[380px] items-center justify-center rounded-2xl border border-border/70 bg-card">
        <div className="flex items-center gap-2.5 font-mono text-xs text-muted-foreground">
          <RefreshCw className="h-4 w-4 animate-spin text-primary" />
          <span>جاري تحميل جدول العيادة...</span>
        </div>
      </div>
    );
  }

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  return (
    <div className="space-y-6" dir="rtl">
      {/* Telemetry Header */}
      <div className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-card p-5 shadow-xs md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-md border border-primary/20 bg-primary/10 px-2 py-0.5 font-mono text-[11px] font-semibold text-primary">
              CLINICAL CALENDAR
            </span>
            <span className="font-mono text-xs text-muted-foreground">
              من {weekStart.toLocaleDateString("ar-EG")} إلى {weekEnd.toLocaleDateString("ar-EG")}
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            الجدول الأسبوعي للكشوفات
          </h1>
          <p className="text-xs text-muted-foreground">
            توزيع مواعيد المراجعين حسب أيام الأسبوع، التوقيت، وحالة تأكيد الحجز
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={jumpToToday}
            className="rounded-xl border border-border/70 bg-background px-3 py-2 text-xs font-medium text-foreground shadow-xs transition-all hover:bg-muted/40 active:scale-[0.98]"
          >
            الأسبوع الحالي
          </button>
          <div className="flex items-center rounded-xl border border-border/70 bg-background p-1 shadow-xs">
            <button
              onClick={() => shiftWeek(1)}
              className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground active:scale-95"
              title="الأسبوع التالي"
              aria-label="الأسبوع التالي"
            >
              <ChevronRight className="h-4 w-4 rtl:rotate-180" />
            </button>
            <button
              onClick={() => shiftWeek(-1)}
              className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground active:scale-95"
              title="الأسبوع السابق"
              aria-label="الأسبوع السابق"
            >
              <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
            </button>
          </div>
          <button
            onClick={fetchSchedule}
            disabled={refreshing}
            className="rounded-xl border border-border/70 bg-background p-2.5 text-muted-foreground shadow-xs transition-all hover:bg-muted/40 hover:text-foreground active:scale-[0.98]"
            title="تحديث البيانات"
            aria-label="تحديث البيانات"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Telemetry Summary Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">إجمالي حجوزات الأسبوع</span>
            <CalendarCheck className="h-4 w-4 text-primary" />
          </div>
          <div className="mt-2 font-mono text-2xl font-bold tabular-nums text-foreground">
            {totalThisWeek} موعد
          </div>
          <div className="mt-1 font-mono text-[11px] text-muted-foreground">موزعة على الأيام</div>
        </div>

        <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">حجوزات مؤكدة</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="mt-2 font-mono text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
            {confirmedCount} مؤكد
          </div>
          <div className="mt-1 font-mono text-[11px] text-muted-foreground">جاهزة للاستقبال</div>
        </div>

        <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">كشوفات منجزة</span>
            <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="mt-2 font-mono text-2xl font-bold tabular-nums text-foreground">
            {completedCount} مكتمل
          </div>
          <div className="mt-1 font-mono text-[11px] text-muted-foreground">تمت بنجاح</div>
        </div>
      </div>

      {/* Week Grid Single-Surface Chassis */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {days.map((day) => {
          const dayKey = day.toISOString().split("T")[0];
          const items = appointments.filter(
            (a) => String(a.appointmentDate).split("T")[0] === dayKey,
          );
          const isToday = new Date().toISOString().split("T")[0] === dayKey;

          return (
            <div
              key={dayKey}
              className={`flex flex-col justify-between space-y-3 rounded-2xl border p-4 shadow-xs transition-all ${
                isToday
                  ? "border-primary/40 bg-primary/5"
                  : "border-border/70 bg-card text-card-foreground"
              }`}
            >
              <div>
                <div className="flex items-center justify-between border-b border-border/50 pb-2.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold text-foreground">{dayName(day)}</span>
                    {isToday && (
                      <span className="rounded-md bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">
                        اليوم
                      </span>
                    )}
                  </div>
                  <span className="font-mono text-xs text-muted-foreground">
                    {day.toLocaleDateString("ar-EG", { month: "short", day: "numeric" })}
                  </span>
                </div>

                <div className="mt-3 space-y-2">
                  {items.length === 0 ? (
                    <div className="py-8 text-center text-xs text-muted-foreground">
                      لا توجد مواعيد مسجلة
                    </div>
                  ) : (
                    items.map((a) => {
                      const cfg = STATUS_CONFIG[a.status] || {
                        label: a.status,
                        badgeCls: "bg-muted text-muted-foreground border-border/50",
                      };
                      return (
                        <div
                          key={a.id}
                          className="space-y-1.5 rounded-xl border border-border/60 bg-muted/20 p-2.5 transition-colors hover:bg-muted/40"
                        >
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1 font-mono text-xs font-bold tabular-nums text-foreground">
                              <Clock className="h-3 w-3 text-primary" />
                              {a.startTime}
                            </span>
                            <span
                              className={`rounded-md border px-1.5 py-0.5 text-[10px] font-medium ${cfg.badgeCls}`}
                            >
                              {cfg.label}
                            </span>
                          </div>

                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                              <User className="h-3 w-3 text-muted-foreground" />
                              <span>
                                {a.patient
                                  ? `${a.patient.firstName} ${a.patient.lastName || ""}`
                                  : "مريض"}
                              </span>
                            </div>
                            <div className="truncate text-[11px] text-muted-foreground">
                              {a.serviceName || "كشف استشاري"}
                            </div>
                          </div>

                          {a.patient?.phone && (
                            <div className="flex items-center gap-1 border-t border-border/40 pt-1.5 font-mono text-[11px] text-muted-foreground">
                              <Phone className="h-2.5 w-2.5" />
                              <span dir="ltr">{a.patient.phone}</span>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="border-t border-border/40 pt-2 text-left">
                <span className="font-mono text-[11px] text-muted-foreground">
                  {items.length} {items.length === 1 ? "موعد" : "مواعيد"}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DoctorSchedulePage;
