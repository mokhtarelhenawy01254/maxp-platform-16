import { useState, useEffect, useMemo } from "react";
import { buildApiUrl } from "../../utils/urlHelper";
import tokenManager from "../../utils/tokenManager";
import {
  Calendar,
  Clock,
  GraduationCap,
  ChevronRight,
  ChevronLeft,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Users,
  BookOpen,
  Filter,
} from "lucide-react";

const getCompanyId = (): string | null => {
  try {
    return JSON.parse(localStorage.getItem("user") || "{}").companyId || null;
  } catch {
    return null;
  }
};

const getAuthHeaders = () => {
  const headers = tokenManager.createAuthHeaders({ "Content-Type": "application/json" });
  const cid = getCompanyId();
  if (cid) headers["X-Company-Id"] = cid;
  return headers;
};

const api = (path: string) => {
  const base = buildApiUrl(`education/${path}`);
  let url: URL;
  try {
    url = new URL(base);
  } catch {
    url = new URL(base, window.location.origin);
  }
  const cid = getCompanyId();
  if (cid) url.searchParams.set("companyId", cid);
  return url.toString();
};

const DAYS = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

const SESSION_STATUS: Record<string, { label: string; color: string }> = {
  SCHEDULED: { label: "مجدولة", color: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" },
  CONFIRMED: { label: "مؤكدة", color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" },
  CANCELLED: { label: "ملغية", color: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20" },
};

interface Teacher {
  id: string;
  name: string;
  phone?: string;
  subjectRates?: { subject: { name: string } }[];
}

interface Session {
  id: string;
  teacherId: string;
  teacher?: { id: string; name: string };
  student?: { firstName: string; lastName?: string };
  subject?: { name: string };
  scheduledAt: string;
  plannedDuration: number;
  actualDuration?: number;
  status: string;
}

export default function EducationTeacherSchedulePage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedTeacher, setSelectedTeacher] = useState("");
  const [weekOffset, setWeekOffset] = useState(0);
  const [loading, setLoading] = useState(true);

  const weekDays = useMemo(() => {
    const now = new Date();
    const start = new Date(now);
    start.setDate(start.getDate() + weekOffset * 7 - start.getDay());
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [weekOffset]);

  const weekStart = weekDays[0]?.toISOString().split("T")[0];
  const weekEnd = weekDays[6]?.toISOString().split("T")[0];

  useEffect(() => {
    fetchTeachers();
  }, []);

  useEffect(() => {
    if (weekStart && weekEnd) fetchSessions();
  }, [weekStart, weekEnd, selectedTeacher]);

  const fetchTeachers = async () => {
    try {
      const res = await fetch(api("teachers"), { headers: getAuthHeaders() });
      const data = await res.json();
      if (data.success) setTeachers(data.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ from: weekStart!, to: weekEnd! });
      if (selectedTeacher) params.append("teacherId", selectedTeacher);
      const res = await fetch(api(`sessions?${params}`), { headers: getAuthHeaders() });
      const data = await res.json();
      if (data.success) setSessions(data.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const getSessionsForDay = (day: Date) => {
    const dayStr = day.toISOString().split("T")[0];
    return sessions.filter((s) => s.scheduledAt?.startsWith(dayStr));
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });
  };

  const stats = useMemo(() => {
    const total = sessions.length;
    const confirmed = sessions.filter((s) => s.status === "CONFIRMED").length;
    const scheduled = sessions.filter((s) => s.status === "SCHEDULED").length;
    return { total, confirmed, scheduled };
  }, [sessions]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 rtl font-sans" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/80">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
              <Calendar className="w-3.5 h-3.5" />
              الجدول الأكاديمي
            </span>
            <span className="text-xs text-muted-foreground font-mono tabular-nums">
              {stats.total} حصة في الأسبوع المحدد
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            جدول المدرسين والحصص الأسبوعية
          </h1>
          <p className="text-xs text-muted-foreground">
            استعراض المواعيد والحصص المجدولة والمؤكدة على مدار الأسبوع مع التصفية بحسب المدرس
          </p>
        </div>
      </div>

      {/* Telemetry Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-card border border-border/80 rounded-xl p-4 flex items-center justify-between shadow-xs">
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">إجمالي الحصص</div>
            <div className="text-2xl font-bold text-foreground font-mono tabular-nums">
              {stats.total}
            </div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-500/20">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-card border border-border/80 rounded-xl p-4 flex items-center justify-between shadow-xs">
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">حصص مؤكدة</div>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
              {stats.confirmed}
            </div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-card border border-border/80 rounded-xl p-4 flex items-center justify-between shadow-xs">
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">حصص مجدولة بالانتظار</div>
            <div className="text-2xl font-bold text-sky-600 dark:text-sky-400 font-mono tabular-nums">
              {stats.scheduled}
            </div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center border border-sky-500/20">
            <Calendar className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="bg-card border border-border/80 rounded-xl p-3.5 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <select
            className="bg-background border border-input rounded-lg px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary min-w-[200px]"
            value={selectedTeacher}
            onChange={(e) => setSelectedTeacher(e.target.value)}
          >
            <option value="">كل المدرسين ({teachers.length})</option>
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setWeekOffset((w) => w - 1)}
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-muted/60 text-foreground hover:bg-muted text-xs rounded-lg transition-colors border border-border/60"
          >
            <ChevronRight className="w-3.5 h-3.5" />
            الأسبوع السابق
          </button>

          <span className="text-xs font-semibold px-3 py-1.5 bg-muted/30 rounded-lg border border-border/60 font-mono tabular-nums text-foreground">
            {weekDays[0]?.toLocaleDateString("ar-EG")} — {weekDays[6]?.toLocaleDateString("ar-EG")}
          </span>

          <button
            onClick={() => setWeekOffset((w) => w + 1)}
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-muted/60 text-foreground hover:bg-muted text-xs rounded-lg transition-colors border border-border/60"
          >
            الأسبوع التالي
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

          {weekOffset !== 0 && (
            <button
              onClick={() => setWeekOffset(0)}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:bg-primary/90 shadow-xs"
            >
              <RotateCcw className="w-3 h-3" />
              هذا الأسبوع
            </button>
          )}
        </div>
      </div>

      {/* Week Calendar Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[350px] gap-3 text-muted-foreground">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-mono">جاري تحميل جدول الحصص...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-7 gap-2.5 overflow-x-auto">
          {weekDays.map((day, i) => {
            const daySessions = getSessionsForDay(day);
            const isToday = day.toDateString() === new Date().toDateString();
            return (
              <div
                key={i}
                className={`bg-card border rounded-xl overflow-hidden shadow-xs flex flex-col transition-all ${
                  isToday
                    ? "border-primary ring-1 ring-primary/40"
                    : "border-border/80"
                }`}
              >
                {/* Day Header */}
                <div
                  className={`text-center py-2.5 px-2 border-b transition-colors ${
                    isToday
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted/40 text-foreground border-border/60"
                  }`}
                >
                  <div className="text-xs font-bold">{DAYS[i]}</div>
                  <div className="text-sm font-mono font-bold tabular-nums">
                    {day.getDate()}
                  </div>
                </div>

                {/* Day Sessions List */}
                <div className="p-2 space-y-2 flex-1 min-h-[180px] bg-card">
                  {daySessions.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-muted-foreground text-xs py-8">
                      لا توجد حصص
                    </div>
                  ) : (
                    daySessions.map((s) => {
                      const st = SESSION_STATUS[s.status];
                      return (
                        <div
                          key={s.id}
                          className="p-2.5 rounded-lg border border-border/60 bg-muted/20 hover:bg-muted/50 transition-colors text-xs space-y-1.5"
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-mono font-semibold text-foreground tabular-nums text-[11px] flex items-center gap-1">
                              <Clock className="w-3 h-3 text-primary" />
                              {formatTime(s.scheduledAt)}
                            </span>
                            <span
                              className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium border ${
                                st?.color || "bg-muted text-muted-foreground border-border"
                              }`}
                            >
                              {st?.label || s.status}
                            </span>
                          </div>

                          <div className="font-semibold text-foreground text-xs truncate">
                            {s.teacher?.name || "مدرس غير محدد"}
                          </div>

                          <div className="text-muted-foreground text-[11px] truncate">
                            الطالب: {s.student ? `${s.student.firstName} ${s.student.lastName || ""}` : "—"}
                          </div>

                          {s.subject?.name && (
                            <div className="pt-1">
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted/60 text-foreground text-[10px]">
                                <BookOpen className="w-2.5 h-2.5 text-primary" />
                                {s.subject.name}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
