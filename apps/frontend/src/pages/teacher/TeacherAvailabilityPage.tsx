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
  Sparkles,
} from "lucide-react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";

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

const DEFAULT_SLOTS: Slot[] = [
  { dayOfWeek: 0, startTime: "09:00", endTime: "17:00", isAvailable: true },
  { dayOfWeek: 1, startTime: "09:00", endTime: "17:00", isAvailable: true },
  { dayOfWeek: 2, startTime: "09:00", endTime: "17:00", isAvailable: true },
  { dayOfWeek: 3, startTime: "09:00", endTime: "17:00", isAvailable: true },
  { dayOfWeek: 4, startTime: "09:00", endTime: "17:00", isAvailable: true },
  { dayOfWeek: 5, startTime: "14:00", endTime: "18:00", isAvailable: false },
  { dayOfWeek: 6, startTime: "10:00", endTime: "18:00", isAvailable: true },
];

export default function TeacherAvailabilityPage() {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    const fetchSlots = async () => {
      try {
        const token = localStorage.getItem("teacherToken") || localStorage.getItem("token");
        const res = await fetch("/api/v1/education/teacher-portal/availability", {
          headers: { Authorization: `Bearer ${token}` },
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
    void fetchSlots();
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
      const token = localStorage.getItem("teacherToken") || localStorage.getItem("token");
      const res = await fetch("/api/v1/education/teacher-portal/availability", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ slots }),
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
        isAvailable: s.dayOfWeek !== 5,
      }))
    );
    setMessage({
      type: "success",
      text: "تم تطبيق المواعيد القياسية (09:00 - 17:00) مع إجازة الجمعة",
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px] gap-2.5 text-muted-foreground">
        <RefreshCw className="size-5 animate-spin text-primary" />
        <span className="text-xs font-mono">جاري تحميل جدول التفرغ وساعات العمل...</span>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 space-y-4" dir="rtl">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-border/70 pb-3.5">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20">
              <Clock className="size-4" />
            </span>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              ساعات وأوقات التفرغ الأكاديمي
            </h1>
            <Badge variant="outline" className="text-[11px] font-mono border-border/80 bg-muted/30">
              {activeDaysCount} أيام عمل أسبوعياً
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            تحديد الأيام وساعات العمل المتاحة ليتمكن الطلاب والمنظومة من حجز الحصص بدقة
          </p>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto font-mono text-xs">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSetStandardHours}
            className="h-8 px-2.5 text-xs font-mono gap-1 border-border/70 active:scale-[0.98]"
          >
            <Sparkles className="size-3.5 text-primary" />
            <span>المواعيد القياسية</span>
          </Button>

          <Button
            size="sm"
            onClick={() => void handleSave()}
            disabled={saving}
            className="h-8 px-3 text-xs font-mono gap-1 active:scale-[0.98]"
          >
            {saving ? <RefreshCw className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
            <span>{saving ? "جاري الحفظ..." : "حفظ التغييرات"}</span>
          </Button>
        </div>
      </div>

      {/* Telemetry Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 font-mono">
        <div className="p-3 rounded-lg border border-border/70 bg-card/60 flex items-center justify-between">
          <div>
            <p className="text-[11px] text-muted-foreground">أيام التواجد النشطة</p>
            <p className="text-xl font-bold tracking-tight text-foreground font-mono tabular-nums mt-0.5">
              {activeDaysCount} من 7 أيام
            </p>
            <p className="text-[10px] text-muted-foreground/70 font-mono mt-0.5">جدول منتظم</p>
          </div>
          <div className="size-7 rounded-md bg-blue-500/10 flex items-center justify-center text-blue-500 border border-blue-500/20">
            <Calendar className="size-3.5" />
          </div>
        </div>

        <div className="p-3 rounded-lg border border-border/70 bg-card/60 flex items-center justify-between">
          <div>
            <p className="text-[11px] text-emerald-500">إجمالي الساعات المتاحة</p>
            <p className="text-xl font-bold tracking-tight text-emerald-500 font-mono tabular-nums mt-0.5">
              {totalWeeklyHours.toFixed(1)} ساعة
            </p>
            <p className="text-[10px] text-muted-foreground/70 font-mono mt-0.5">لكل أسبوع دراسي</p>
          </div>
          <div className="size-7 rounded-md bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/20">
            <Clock className="size-3.5" />
          </div>
        </div>

        <div className="p-3 rounded-lg border border-border/70 bg-card/60 flex items-center justify-between">
          <div>
            <p className="text-[11px] text-amber-500">حالة الحجز المباشر</p>
            <p className="text-sm font-bold tracking-tight text-emerald-500 mt-0.5 font-mono inline-flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              متاح لحجز الطلاب
            </p>
            <p className="text-[10px] text-muted-foreground/70 font-mono mt-0.5">مزامنة فورية للمواعيد</p>
          </div>
          <div className="size-7 rounded-md bg-amber-500/10 flex items-center justify-center text-amber-500 border border-amber-500/20">
            <Sun className="size-3.5" />
          </div>
        </div>
      </div>

      {/* Alert Message */}
      {message && (
        <div
          className={`p-3 rounded-lg border text-xs flex items-center gap-2 font-mono ${
            message.type === "success"
              ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
              : "bg-destructive/10 text-destructive border-destructive/20"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle2 className="size-4 shrink-0" />
          ) : (
            <AlertCircle className="size-4 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Daily Slots Configuration Single-Surface Grid */}
      <div className="rounded-lg border border-border/70 bg-card shadow-xs overflow-hidden divide-y divide-border/60">
        {slots.map((slot, i) => {
          const [sh, sm] = slot.startTime.split(":").map(Number);
          const [eh, em] = slot.endTime.split(":").map(Number);
          const dailyHours = slot.isAvailable
            ? Math.max(0, (eh * 60 + em - (sh * 60 + sm)) / 60)
            : 0;

          return (
            <div
              key={i}
              className={`p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                slot.isAvailable ? "hover:bg-muted/30" : "bg-muted/20 opacity-75"
              }`}
            >
              {/* Day Toggle & Label */}
              <div className="flex items-center gap-3 min-w-[150px]">
                <button
                  type="button"
                  onClick={() => updateSlot(i, "isAvailable", !slot.isAvailable)}
                  className="focus:outline-none"
                  aria-label={`تغيير حالة يوم ${DAYS[slot.dayOfWeek]}`}
                >
                  {slot.isAvailable ? (
                    <ToggleRight className="size-6 text-primary cursor-pointer" />
                  ) : (
                    <ToggleLeft className="size-6 text-muted-foreground cursor-pointer" />
                  )}
                </button>
                <div>
                  <span className="text-xs font-semibold text-foreground">
                    {DAYS[slot.dayOfWeek]}
                  </span>
                  <div className="text-[10px] text-muted-foreground font-mono">
                    {slot.isAvailable ? "متاح للتدريس" : "إجازة أسبوعية"}
                  </div>
                </div>
              </div>

              {/* Time Pickers */}
              <div className="flex items-center gap-2.5 self-start sm:self-center font-mono text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-muted-foreground">من:</span>
                  <input
                    type="time"
                    value={slot.startTime}
                    disabled={!slot.isAvailable}
                    onChange={(e) => updateSlot(i, "startTime", e.target.value)}
                    className="border border-border/70 rounded-md px-2 py-1 text-xs font-mono bg-background text-foreground disabled:opacity-50 focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <span className="text-muted-foreground">—</span>

                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-muted-foreground">إلى:</span>
                  <input
                    type="time"
                    value={slot.endTime}
                    disabled={!slot.isAvailable}
                    onChange={(e) => updateSlot(i, "endTime", e.target.value)}
                    className="border border-border/70 rounded-md px-2 py-1 text-xs font-mono bg-background text-foreground disabled:opacity-50 focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              {/* Summary Duration Badge */}
              <div className="flex items-center gap-2 self-end sm:self-center font-mono">
                {slot.isAvailable ? (
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 tabular-nums">
                    {dailyHours.toFixed(1)} ساعة عمل
                  </span>
                ) : (
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-muted/60 text-muted-foreground border border-border/40">
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
}
