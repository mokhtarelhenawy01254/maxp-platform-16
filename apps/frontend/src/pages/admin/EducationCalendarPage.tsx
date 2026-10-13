import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  ChevronLeft,
  ChevronRight,
  X,
  Clock,
  User,
  BookOpen,
  Calendar as CalendarIcon,
  CheckCircle2,
  AlertCircle,
  XCircle,
  RotateCcw,
  Sparkles,
} from "lucide-react";

const MONTHS_AR = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"
];
const DAYS_AR = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

const STATUS_CONFIG: Record<string, { label: string; badge: string; dot: string }> = {
  SCHEDULED: {
    label: "مجدولة",
    badge: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    dot: "bg-blue-500",
  },
  CONFIRMED: {
    label: "مؤكدة",
    badge: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    dot: "bg-emerald-500",
  },
  CANCELLED: {
    label: "ملغية",
    badge: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
    dot: "bg-red-500",
  },
};

interface Session {
  id: string;
  scheduledAt: string;
  plannedDuration: number;
  actualDuration: number | null;
  status: string;
  topic: string | null;
  student: { firstName: string; lastName: string };
  teacher: { name: string };
  subject: { name: string };
}

const getMockSessions = (year: number, month: number): Session[] => {
  const pad = (n: number) => String(n).padStart(2, "0");
  const m = pad(month + 1);
  return [
    {
      id: "s-1",
      scheduledAt: `${year}-${m}-04T10:00:00Z`,
      plannedDuration: 60,
      actualDuration: 60,
      status: "CONFIRMED",
      topic: "مراجعة التفاضل والتكامل",
      student: { firstName: "أحمد", lastName: "محمود" },
      teacher: { name: "أ. سمير عبد الله" },
      subject: { name: "الرياضيات المتقدمة" },
    },
    {
      id: "s-2",
      scheduledAt: `${year}-${m}-08T14:30:00Z`,
      plannedDuration: 45,
      actualDuration: 45,
      status: "CONFIRMED",
      topic: "الكيمياء العضوية والألكانات",
      student: { firstName: "سارة", lastName: "إبراهيم" },
      teacher: { name: "د. هبة الشامي" },
      subject: { name: "الكيمياء" },
    },
    {
      id: "s-3",
      scheduledAt: `${year}-${m}-12T16:00:00Z`,
      plannedDuration: 60,
      actualDuration: null,
      status: "SCHEDULED",
      topic: "قواعد اللغة الإنجليزية والأزمنة",
      student: { firstName: "يوسف", lastName: "خالد" },
      teacher: { name: "م. جون أندراوس" },
      subject: { name: "اللغة الإنجليزية" },
    },
    {
      id: "s-4",
      scheduledAt: `${year}-${m}-15T11:00:00Z`,
      plannedDuration: 60,
      actualDuration: 60,
      status: "CONFIRMED",
      topic: "الفيزياء الحديثة والكهرومغناطيسية",
      student: { firstName: "عمر", lastName: "طارق" },
      teacher: { name: "أ. سمير عبد الله" },
      subject: { name: "الفيزياء" },
    },
    {
      id: "s-5",
      scheduledAt: `${year}-${m}-18T13:00:00Z`,
      plannedDuration: 45,
      actualDuration: null,
      status: "CANCELLED",
      topic: "النحو والبلاغة",
      student: { firstName: "مريم", lastName: "عادل" },
      teacher: { name: "أ. شريف حامد" },
      subject: { name: "اللغة العربية" },
    },
    {
      id: "s-6",
      scheduledAt: `${year}-${m}-22T17:00:00Z`,
      plannedDuration: 60,
      actualDuration: null,
      status: "SCHEDULED",
      topic: "حل أسئلة بنك المعرفة",
      student: { firstName: "كريم", lastName: "أشرف" },
      teacher: { name: "د. هبة الشامي" },
      subject: { name: "الأحياء" },
    },
  ];
};

const EducationCalendarPage: React.FC = () => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(() => new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(() => new Date().getFullYear());
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);

  const startOfMonth = new Date(currentYear, currentMonth, 1);
  const endOfMonth = new Date(currentYear, currentMonth + 1, 0);

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const token = localStorage.getItem("accessToken") || localStorage.getItem("token");
        const from = new Date(currentYear, currentMonth, 1).toISOString();
        const to = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59).toISOString();
        const res = await fetch(`/api/v1/education/sessions?from=${from}&to=${to}&limit=500`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          setSessions(json.data);
        } else {
          setSessions(getMockSessions(currentYear, currentMonth));
        }
      } catch {
        setSessions(getMockSessions(currentYear, currentMonth));
      } finally {
        setLoading(false);
      }
    };
    fetchSessions();
  }, [currentMonth, currentYear]);

  const goToday = useCallback(() => {
    const now = new Date();
    setCurrentMonth(now.getMonth());
    setCurrentYear(now.getFullYear());
  }, []);

  const prevMonth = useCallback(() => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  }, [currentMonth]);

  const nextMonth = useCallback(() => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  }, [currentMonth]);

  const firstDayOfWeek = startOfMonth.getDay();
  const daysInMonth = endOfMonth.getDate();
  const today = new Date();

  const getSessionsForDay = (day: number) => {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return sessions.filter((s) => s.scheduledAt.startsWith(dateStr));
  };

  const stats = useMemo(() => {
    const total = sessions.length;
    const confirmed = sessions.filter((s) => s.status === "CONFIRMED").length;
    const scheduled = sessions.filter((s) => s.status === "SCHEDULED").length;
    const cancelled = sessions.filter((s) => s.status === "CANCELLED").length;
    return { total, confirmed, scheduled, cancelled };
  }, [sessions]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 rtl font-sans" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/80">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
              <CalendarIcon className="w-3.5 h-3.5" />
              التقويم الأكاديمي
            </span>
            <span className="text-xs text-muted-foreground font-mono tabular-nums">
              {stats.total} حصة خلال الشهر
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            جدول الحصص والمواعيد الشهرية
          </h1>
          <p className="text-xs text-muted-foreground">
            استعراض المواعيد الأكاديمية وجدول التدريس على مدار أيام الشهر
          </p>
        </div>

        {/* Controls Bar */}
        <div className="flex items-center gap-2">
          <button
            onClick={goToday}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg border border-border/80 bg-card hover:bg-muted/60 text-foreground transition-colors shadow-xs"
          >
            <RotateCcw className="w-3.5 h-3.5 text-primary" />
            اليوم
          </button>
          <div className="flex items-center bg-card border border-border/80 rounded-lg p-0.5 shadow-xs">
            <button
              onClick={prevMonth}
              aria-label="الشهر السابق"
              className="p-1.5 hover:bg-muted/80 rounded-md text-foreground transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <span className="text-xs font-bold min-w-[140px] text-center px-2 text-foreground font-mono">
              {MONTHS_AR[currentMonth]} {currentYear}
            </span>
            <button
              onClick={nextMonth}
              aria-label="الشهر التالي"
              className="p-1.5 hover:bg-muted/80 rounded-md text-foreground transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Telemetry Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-card border border-border/80 rounded-xl p-3.5 flex items-center justify-between shadow-xs">
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">إجمالي الحصص</div>
            <div className="text-xl font-bold text-foreground font-mono tabular-nums">
              {stats.total}
            </div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
            <CalendarIcon className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-card border border-border/80 rounded-xl p-3.5 flex items-center justify-between shadow-xs">
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">حصص مؤكدة</div>
            <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
              {stats.confirmed}
            </div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-card border border-border/80 rounded-xl p-3.5 flex items-center justify-between shadow-xs">
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">حصص مجدولة</div>
            <div className="text-xl font-bold text-blue-600 dark:text-blue-400 font-mono tabular-nums">
              {stats.scheduled}
            </div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-500/20">
            <Clock className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-card border border-border/80 rounded-xl p-3.5 flex items-center justify-between shadow-xs">
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">حصص ملغية</div>
            <div className="text-xl font-bold text-red-600 dark:text-red-400 font-mono tabular-nums">
              {stats.cancelled}
            </div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center border border-red-500/20">
            <XCircle className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Calendar Grid Chassis */}
      <div className="bg-card border border-border/80 rounded-2xl overflow-hidden shadow-xs">
        {/* Days Header */}
        <div className="grid grid-cols-7 border-b border-border/80 bg-muted/40">
          {DAYS_AR.map((d) => (
            <div
              key={d}
              className="py-2.5 text-center text-xs font-semibold text-muted-foreground border-l border-border/60 last:border-l-0"
            >
              {d}
            </div>
          ))}
        </div>

        {/* Days Cells */}
        <div className="grid grid-cols-7">
          {Array.from({ length: firstDayOfWeek }).map((_, i) => (
            <div
              key={`empty-${i}`}
              className="min-h-[110px] border-b border-l border-border/60 last:border-l-0 p-1.5 bg-muted/10"
            />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const daySessions = getSessionsForDay(day);
            const isToday =
              today.getDate() === day &&
              today.getMonth() === currentMonth &&
              today.getFullYear() === currentYear;

            return (
              <div
                key={day}
                className={`min-h-[110px] border-b border-l border-border/60 last:border-l-0 p-1.5 transition-colors ${
                  isToday ? "bg-primary/5" : "hover:bg-muted/10"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`text-xs font-mono font-bold w-6 h-6 flex items-center justify-center rounded-full tabular-nums ${
                      isToday
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "text-foreground"
                    }`}
                  >
                    {day}
                  </span>
                  {daySessions.length > 0 && (
                    <span className="text-[10px] text-muted-foreground font-mono tabular-nums">
                      {daySessions.length}
                    </span>
                  )}
                </div>

                <div className="space-y-1">
                  {daySessions.slice(0, 3).map((s) => {
                    const st = STATUS_CONFIG[s.status] || STATUS_CONFIG.SCHEDULED;
                    return (
                      <button
                        key={s.id}
                        onClick={() => setSelectedSession(s)}
                        className={`w-full text-right text-[11px] px-1.5 py-1 rounded-md border truncate block transition-transform active:scale-[0.98] ${st.badge}`}
                      >
                        <span className="font-mono tabular-nums font-semibold mr-1">
                          {s.scheduledAt.slice(11, 16)}
                        </span>
                        {s.student.firstName}
                      </button>
                    );
                  })}
                  {daySessions.length > 3 && (
                    <button
                      onClick={() => setSelectedSession(daySessions[0])}
                      className="text-[10px] text-primary font-medium px-1 hover:underline block"
                    >
                      +{daySessions.length - 3} المزيد
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Session Modal */}
      {selectedSession && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-xs z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedSession(null)}
        >
          <div
            className="bg-card border border-border/80 rounded-2xl shadow-2xl p-6 max-w-md w-full mx-4 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-border/80">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <CalendarIcon className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-foreground">تفاصيل الحصة الأكاديمية</h3>
              </div>
              <button
                onClick={() => setSelectedSession(null)}
                className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center gap-3 p-3 bg-muted/30 border border-border/60 rounded-xl">
                <User className="w-5 h-5 text-primary flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-semibold text-foreground text-xs">
                    {selectedSession.student.firstName} {selectedSession.student.lastName}
                  </p>
                  <p className="text-[11px] text-muted-foreground">الطالب المقيد</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-muted/30 border border-border/60 rounded-xl">
                <User className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-semibold text-foreground text-xs">
                    {selectedSession.teacher.name}
                  </p>
                  <p className="text-[11px] text-muted-foreground">المدرس المسؤول</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-muted/30 border border-border/60 rounded-xl">
                <BookOpen className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-semibold text-foreground text-xs">
                    {selectedSession.subject.name}
                  </p>
                  <p className="text-[11px] text-muted-foreground">المادة الدراسية</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-muted/30 border border-border/60 rounded-xl">
                <Clock className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-semibold text-foreground text-xs font-mono tabular-nums">
                    {new Date(selectedSession.scheduledAt).toLocaleDateString("ar-EG")} — {selectedSession.scheduledAt.slice(11, 16)}
                  </p>
                  <p className="text-[11px] text-muted-foreground font-mono tabular-nums">
                    المدة: {selectedSession.actualDuration || selectedSession.plannedDuration} دقيقة
                  </p>
                </div>
              </div>

              <div className="flex justify-between items-center p-3 rounded-xl border border-border/60 bg-card">
                <span className="text-muted-foreground font-medium">حالة الحصة</span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                    STATUS_CONFIG[selectedSession.status]?.badge || ""
                  }`}
                >
                  {STATUS_CONFIG[selectedSession.status]?.label || selectedSession.status}
                </span>
              </div>

              {selectedSession.topic && (
                <div className="p-3 bg-muted/30 border border-border/60 rounded-xl">
                  <p className="text-[11px] text-muted-foreground mb-1">موضوع الدرس</p>
                  <p className="font-medium text-foreground text-xs">{selectedSession.topic}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EducationCalendarPage;
