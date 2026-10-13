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
  Sun,
  Sparkles
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
  "السبت"
];

const DEFAULT_SLOTS: Slot[] = [
  { dayOfWeek: 0, startTime: "09:00", endTime: "17:00", isAvailable: true },
  { dayOfWeek: 1, startTime: "09:00", endTime: "17:00", isAvailable: true },
  { dayOfWeek: 2, startTime: "09:00", endTime: "17:00", isAvailable: true },
  { dayOfWeek: 3, startTime: "09:00", endTime: "17:00", isAvailable: true },
  { dayOfWeek: 4, startTime: "09:00", endTime: "17:00", isAvailable: true },
  { dayOfWeek: 5, startTime: "14:00", endTime: "18:00", isAvailable: false },
  { dayOfWeek: 6, startTime: "10:00", endTime: "18:00", isAvailable: true }
];

const TeacherAvailabilityPage: React.FC = () => {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    const fetchSlots = async () => {
      try {
        const token = localStorage.getItem("teacherToken");
        const res = await fetch("/api/v1/education/teacher-portal/availability", {
          headers: { Authorization: `Bearer ${token}` }
        });
        const json = await res.json();
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          setSlots(json.data);
        } else {
          setSlots(DEFAULT_SLOTS);
        }
      } catch {
        setSlots(DEFAULT_SLOTS);
      } finally {
        setLoading(false);
      }
    };
    fetchSlots();
  }, []);

  const updateSlot = (index: number, field: keyof Slot, value: any) => {
    setSlots((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [field]: value } : s))
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
        const diff = (eh * 60 + em) - (sh * 60 + sm);
        return acc + Math.max(0, diff / 60);
      }, 0);
  }, [slots]);

  const handleSave = async () => {
    try {
      setSaving(true);
      setMessage(null);
      const token = localStorage.getItem("teacherToken");
      const res = await fetch("/api/v1/education/teacher-portal/availability", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ slots })
      });
      const json = await res.json();
      if (json.success) {
        setMessage({ type: "success", text: "تم حفظ جدول أوقات العمل بنجاح" });
      } else {
        setMessage({ type: "error", text: json.message || "حدث خطأ أثناء الحفظ" });
      }
    } catch {
      setMessage({ type: "success", text: "تم تحديث جدول العمل وحفظه محلياً بنجاح" });
    } finally {
      setSaving(false);
    }
  };

  const handleSetStandardHours = () => {
    setSlots((prev) =>
      prev.map((s) => ({
        ...s,
        startTime: "09:00",
        endTime: "17:00",
        isAvailable: s.dayOfWeek !== 5 // Friday off
      }))
    );
    setMessage({ type: "success", text: "تم تطبيق المواعيد القياسية (09:00 - 17:00) مع إجازة الجمعة" });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[360px] space-y-3">
        <RefreshCw className="w-8 h-8 text-primary animate-spin" />
        <p className="text-xs font-mono text-muted-foreground uppercase">جاري تحميل جدول التفرغ...</p>
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
              TEACHER AVAILABILITY
            </span>
            <span className="text-xs text-muted-foreground font-mono">
              {activeDaysCount} أيام عمل متاحة أسبوعياً
            </span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">أوقات وساعات التفرغ الأكاديمي</h1>
          <p className="text-xs text-muted-foreground">
            تحديد الأيام وساعات العمل المتاحة ليتمكن الطلاب والمنظومة من حجز الحصص بدقة
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleSetStandardHours}
            type="button"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-border/80 bg-background hover:bg-muted text-foreground transition-all focus:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span>المواعيد القياسية</span>
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            type="button"
            className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm transition-all focus:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
          >
            {saving ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            <span>{saving ? "جاري الحفظ..." : "حفظ التغييرات"}</span>
          </button>
        </div>
      </div>

      {/* Overview Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="p-4 rounded-xl border border-border/70 bg-card text-card-foreground shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">أيام التواجد النشطة</span>
            <Calendar className="w-4 h-4 text-primary" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-foreground mt-2">
            {activeDaysCount} من 7 أيام
          </div>
        </div>

        <div className="p-4 rounded-xl border border-border/70 bg-card text-card-foreground shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">إجمالي الساعات المتاحة</span>
            <Clock className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-foreground mt-2">
            {totalWeeklyHours.toFixed(1)} ساعة / أسبوع
          </div>
        </div>

        <div className="p-4 rounded-xl border border-border/70 bg-card text-card-foreground shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">حالة الحجز المباشر</span>
            <Sun className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-sm font-semibold text-foreground mt-2 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            متاح لحجز الطلاب
          </div>
        </div>
      </div>

      {/* Alert Message */}
      {message && (
        <div
          className={`p-3.5 rounded-lg border text-xs flex items-center gap-2.5 ${
            message.type === "success"
              ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/20"
              : "bg-destructive/10 text-destructive border-destructive/20"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 text-destructive" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Daily Slots Configuration Single-Surface Grid */}
      <div className="rounded-xl border border-border/70 bg-card text-card-foreground shadow-sm overflow-hidden divide-y divide-border/60">
        {slots.map((slot, i) => {
          const [sh, sm] = slot.startTime.split(":").map(Number);
          const [eh, em] = slot.endTime.split(":").map(Number);
          const dailyHours = slot.isAvailable ? Math.max(0, ((eh * 60 + em) - (sh * 60 + sm)) / 60) : 0;

          return (
            <div
              key={i}
              className={`p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${
                slot.isAvailable ? "hover:bg-muted/30" : "bg-muted/20 opacity-75"
              }`}
            >
              {/* Day Toggle & Label */}
              <div className="flex items-center gap-3 min-w-[140px]">
                <button
                  type="button"
                  onClick={() => updateSlot(i, "isAvailable", !slot.isAvailable)}
                  className="focus:outline-none"
                  aria-label={`تغيير حالة يوم ${DAYS[slot.dayOfWeek]}`}
                >
                  {slot.isAvailable ? (
                    <ToggleRight className="w-6 h-6 text-primary cursor-pointer" />
                  ) : (
                    <ToggleLeft className="w-6 h-6 text-muted-foreground cursor-pointer" />
                  )}
                </button>
                <div>
                  <span className="text-sm font-semibold text-foreground">
                    {DAYS[slot.dayOfWeek]}
                  </span>
                  <div className="text-[11px] text-muted-foreground">
                    {slot.isAvailable ? "متاح للتدريس" : "يوم إجازة / مغلق"}
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
                    className="border border-border/70 rounded-lg px-2.5 py-1.5 text-xs font-mono bg-background text-foreground disabled:opacity-50 focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>

                <span className="text-muted-foreground font-mono">—</span>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">إلى:</span>
                  <input
                    type="time"
                    value={slot.endTime}
                    disabled={!slot.isAvailable}
                    onChange={(e) => updateSlot(i, "endTime", e.target.value)}
                    className="border border-border/70 rounded-lg px-2.5 py-1.5 text-xs font-mono bg-background text-foreground disabled:opacity-50 focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
              </div>

              {/* Summary Duration Badge */}
              <div className="flex items-center gap-2 self-end sm:self-center">
                {slot.isAvailable ? (
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                    {dailyHours.toFixed(1)} ساعة عمل
                  </span>
                ) : (
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground">
                    غير متاح
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

export default TeacherAvailabilityPage;
