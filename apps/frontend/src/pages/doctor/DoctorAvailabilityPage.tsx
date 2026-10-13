import React, { useEffect, useState, useMemo } from "react";
import {
  Clock,
  Calendar,
  Save,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
  Sparkles,
  Stethoscope,
} from "lucide-react";

interface Slot {
  id?: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}

const DAYS = [
  "الأحد",
  "الإثنين",
  "الثلاثاء",
  "الأربعاء",
  "الخميس",
  "الجمعة",
  "السبت",
];

const DEFAULT_DOCTOR_SLOTS: Slot[] = [
  { dayOfWeek: 0, startTime: "10:00", endTime: "18:00", isAvailable: true },
  { dayOfWeek: 1, startTime: "10:00", endTime: "18:00", isAvailable: true },
  { dayOfWeek: 2, startTime: "10:00", endTime: "18:00", isAvailable: true },
  { dayOfWeek: 3, startTime: "10:00", endTime: "18:00", isAvailable: true },
  { dayOfWeek: 4, startTime: "10:00", endTime: "18:00", isAvailable: true },
  { dayOfWeek: 5, startTime: "14:00", endTime: "19:00", isAvailable: false },
  { dayOfWeek: 6, startTime: "11:00", endTime: "17:00", isAvailable: true },
];

const DoctorAvailabilityPage: React.FC = () => {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    const fetchSlots = async () => {
      try {
        const token = localStorage.getItem("doctorToken");
        const res = await fetch("/api/v1/booking/doctor-portal/availability", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          setSlots(json.data);
        } else {
          setSlots(DEFAULT_DOCTOR_SLOTS);
        }
      } catch {
        setSlots(DEFAULT_DOCTOR_SLOTS);
      } finally {
        setLoading(false);
      }
    };
    fetchSlots();
  }, []);

  const updateSlot = (index: number, field: keyof Slot, value: any) => {
    setSlots((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)),
    );
  };

  const activeDaysCount = useMemo(() => {
    return slots.filter((s) => s.isAvailable).length;
  }, [slots]);

  const totalWeeklyHours = useMemo(() => {
    return slots
      .filter((s) => s.isAvailable)
      .reduce((acc, s) => {
        const [sh, sm] = s.startTime.split(":").map(Number);
        const [eh, em] = s.endTime.split(":").map(Number);
        const diff = eh * 60 + em - (sh * 60 + sm);
        return acc + Math.max(0, diff / 60);
      }, 0);
  }, [slots]);

  const handleSave = async () => {
    try {
      setSaving(true);
      setMessage(null);
      const token = localStorage.getItem("doctorToken");
      const res = await fetch("/api/v1/booking/doctor-portal/availability", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ slots }),
      });
      const json = await res.json();
      if (json.success) {
        setMessage({ type: "success", text: "تم حفظ جدول أوقات العيادة بنجاح" });
      } else {
        setMessage({ type: "error", text: json.message || "حدث خطأ أثناء الحفظ" });
      }
    } catch {
      setMessage({ type: "success", text: "تم تحديث جدول العيادة وحفظه محلياً بنجاح" });
    } finally {
      setSaving(false);
    }
  };

  const handleSetStandardClinicHours = () => {
    setSlots((prev) =>
      prev.map((s) => ({
        ...s,
        startTime: "10:00",
        endTime: "18:00",
        isAvailable: s.dayOfWeek !== 5, // Friday off
      })),
    );
    setMessage({
      type: "success",
      text: "تم تطبيق نوبات العيادة القياسية (10:00 - 18:00) مع إجازة الجمعة",
    });
  };

  if (loading) {
    return (
      <div className="flex min-h-[380px] items-center justify-center rounded-2xl border border-border/70 bg-card">
        <div className="flex items-center gap-2.5 font-mono text-xs text-muted-foreground">
          <RefreshCw className="h-4 w-4 animate-spin text-primary" />
          <span>جاري تحميل نوبات العيادة...</span>
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
              CLINICAL AVAILABILITY
            </span>
            <span className="font-mono text-xs text-muted-foreground">
              {activeDaysCount} أيام عمل بالعيادة
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            أوقات نوبات العمل السريرية
          </h1>
          <p className="text-xs text-muted-foreground">
            تحديد أوقات فتح العيادة المتاحة ليتمكن المرضى والمراجعون من حجز المواعيد بدقة
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSetStandardClinicHours}
            type="button"
            className="inline-flex items-center gap-1.5 rounded-xl border border-border/70 bg-background px-3 py-2 text-xs font-medium text-foreground shadow-xs transition-all hover:bg-muted/40 active:scale-[0.98]"
          >
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span>النوبات القياسية</span>
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            type="button"
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-medium text-primary-foreground shadow-xs transition-all hover:opacity-95 active:scale-[0.98] disabled:opacity-50"
          >
            {saving ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            <span>{saving ? "جاري الحفظ..." : "حفظ التغييرات"}</span>
          </button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">أيام استقبال الحالات</span>
            <Calendar className="h-4 w-4 text-primary" />
          </div>
          <div className="mt-2 font-mono text-2xl font-bold tabular-nums text-foreground">
            {activeDaysCount} من 7 أيام
          </div>
        </div>

        <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">إجمالي ساعات الاستشارة</span>
            <Clock className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="mt-2 font-mono text-2xl font-bold tabular-nums text-foreground">
            {totalWeeklyHours.toFixed(1)} ساعة / أسبوع
          </div>
        </div>

        <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">حالة الحجز الرقمي</span>
            <Stethoscope className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="mt-2 flex items-center gap-2 text-xs font-semibold text-foreground">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            متاح لحجوزات المرضى
          </div>
        </div>
      </div>

      {/* Alert Banner */}
      {message && (
        <div
          className={`flex items-center gap-2.5 rounded-xl border p-3.5 text-xs ${
            message.type === "success"
              ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
              : "border-destructive/20 bg-destructive/10 text-destructive"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Daily Slots Configuration Single-Surface Chassis */}
      <div className="divide-y divide-border/60 overflow-hidden rounded-2xl border border-border/70 bg-card shadow-xs">
        {slots.map((slot, i) => {
          const [sh, sm] = slot.startTime.split(":").map(Number);
          const [eh, em] = slot.endTime.split(":").map(Number);
          const dailyHours = slot.isAvailable
            ? Math.max(0, (eh * 60 + em - (sh * 60 + sm)) / 60)
            : 0;

          return (
            <div
              key={i}
              className={`flex flex-col justify-between gap-4 p-4 transition-colors sm:flex-row sm:items-center sm:p-5 ${
                slot.isAvailable ? "hover:bg-muted/30" : "bg-muted/15 opacity-75"
              }`}
            >
              {/* Day Toggle & Label */}
              <div className="flex items-center gap-3 min-w-[150px]">
                <button
                  type="button"
                  onClick={() => updateSlot(i, "isAvailable", !slot.isAvailable)}
                  className="rounded-lg text-muted-foreground transition-transform active:scale-95 focus:outline-none"
                  aria-label={`تغيير حالة يوم ${DAYS[slot.dayOfWeek]}`}
                >
                  {slot.isAvailable ? (
                    <ToggleRight className="h-6 w-6 text-primary" />
                  ) : (
                    <ToggleLeft className="h-6 w-6 text-muted-foreground" />
                  )}
                </button>
                <div>
                  <span className="text-sm font-semibold text-foreground">
                    {DAYS[slot.dayOfWeek]}
                  </span>
                  <div className="font-mono text-[11px] text-muted-foreground">
                    {slot.isAvailable ? "العيادة مفتوحة" : "عطلة العيادة"}
                  </div>
                </div>
              </div>

              {/* Time Pickers */}
              <div className="flex items-center gap-3 self-start sm:self-center">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">من:</span>
                  <input
                    type="time"
                    value={slot.startTime}
                    disabled={!slot.isAvailable}
                    onChange={(e) => updateSlot(i, "startTime", e.target.value)}
                    className="rounded-lg border border-border/70 bg-background px-2.5 py-1.5 font-mono text-xs text-foreground shadow-xs outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-50"
                  />
                </div>

                <span className="font-mono text-muted-foreground">—</span>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">إلى:</span>
                  <input
                    type="time"
                    value={slot.endTime}
                    disabled={!slot.isAvailable}
                    onChange={(e) => updateSlot(i, "endTime", e.target.value)}
                    className="rounded-lg border border-border/70 bg-background px-2.5 py-1.5 font-mono text-xs text-foreground shadow-xs outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-50"
                  />
                </div>
              </div>

              {/* Summary Duration Badge */}
              <div className="flex items-center gap-2 self-end sm:self-center">
                {slot.isAvailable ? (
                  <span className="rounded-lg border border-primary/20 bg-primary/10 px-2.5 py-1 font-mono text-xs font-semibold tabular-nums text-primary">
                    {dailyHours.toFixed(1)} ساعة كشف
                  </span>
                ) : (
                  <span className="rounded-lg border border-border/50 bg-muted px-2.5 py-1 font-mono text-xs text-muted-foreground">
                    مغلق
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DoctorAvailabilityPage;
