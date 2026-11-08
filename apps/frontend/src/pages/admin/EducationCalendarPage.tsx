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
  XCircle,
  RotateCcw,
  Plus,
  Search,
  Pencil,
  Check,
  CalendarDays,
  LayoutGrid,
  List,
  GraduationCap,
  Loader2,
} from "lucide-react";
import { SessionModal } from "./education-management/SessionModal";
import { api, getAuthHeaders, fetchJson } from "./education-management/api";
import type {
  EducationSession,
  EducationTeacher,
  EducationSubject,
  EducationEnrollment,
  EducationStudent,
} from "./education-management/types";

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
  COMPLETED: {
    label: "مكتملة",
    badge: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
    dot: "bg-purple-500",
  },
  CANCELLED: {
    label: "ملغية",
    badge: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
    dot: "bg-red-500",
  },
};

type ViewMode = "month" | "week" | "agenda";

// Helper to convert any Date or ISO string to local YYYY-MM-DD
const toLocalDateStr = (d: Date | string): string => {
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

// Helper to format local time HH:mm
const toLocalTimeStr = (d: Date | string): string => {
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return "--:--";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const EducationCalendarPage: React.FC = () => {
  const [sessions, setSessions] = useState<EducationSession[]>([]);
  const [teachers, setTeachers] = useState<EducationTeacher[]>([]);
  const [subjects, setSubjects] = useState<EducationSubject[]>([]);
  const [enrollments, setEnrollments] = useState<EducationEnrollment[]>([]);
  const [students, setStudents] = useState<EducationStudent[]>([]);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // View & Date State
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [currentMonth, setCurrentMonth] = useState(() => new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(() => new Date().getFullYear());
  const [currentWeekAnchor, setCurrentWeekAnchor] = useState<Date>(() => new Date());

  // Modals
  const [selectedSession, setSelectedSession] = useState<EducationSession | null>(null);
  const [dayOverviewDate, setDayOverviewDate] = useState<{
    dateStr: string;
    dayName: string;
    dayNumber: number;
  } | null>(null);
  const [sessionModal, setSessionModal] = useState<Partial<EducationSession> | null | undefined>(undefined);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [teacherFilter, setTeacherFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("");

  // Fetch supporting metadata once (teachers, subjects, enrollments, students)
  useEffect(() => {
    let isMounted = true;
    const fetchMetadata = async () => {
      try {
        const [tData, sData, eData, stData] = await Promise.allSettled([
          fetchJson(api("teachers")),
          fetchJson(api("subjects")),
          fetchJson(api("enrollments")),
          fetchJson(api("students")),
        ]);

        if (!isMounted) return;
        if (tData.status === "fulfilled" && Array.isArray(tData.value)) setTeachers(tData.value);
        if (sData.status === "fulfilled" && Array.isArray(sData.value)) setSubjects(sData.value);
        if (eData.status === "fulfilled" && Array.isArray(eData.value)) setEnrollments(eData.value);
        if (stData.status === "fulfilled" && Array.isArray(stData.value)) setStudents(stData.value);
      } catch (e) {
        console.error("Failed to fetch calendar metadata", e);
      }
    };
    fetchMetadata();
    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch sessions bounded by the selected month / range
  const fetchSessionsData = useCallback(async () => {
    setLoading(true);
    try {
      // Calculate date range: include prev and next week buffers so week & agenda transitions are smooth
      const start = new Date(currentYear, currentMonth, 1);
      start.setDate(start.getDate() - 7);
      const end = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59);
      end.setDate(end.getDate() + 7);

      const from = start.toISOString();
      const to = end.toISOString();

      const url = api(`sessions?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&limit=1000`);
      const res = await fetch(url, { headers: getAuthHeaders() });
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setSessions(json.data);
      } else {
        setSessions([]);
      }
    } catch (e) {
      console.error("Failed to fetch sessions", e);
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }, [currentMonth, currentYear]);

  useEffect(() => {
    fetchSessionsData();
  }, [fetchSessionsData]);

  // Date Navigation Handlers
  const goToday = useCallback(() => {
    const now = new Date();
    setCurrentMonth(now.getMonth());
    setCurrentYear(now.getFullYear());
    setCurrentWeekAnchor(now);
  }, []);

  const prevMonth = useCallback(() => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y: number) => y - 1);
    } else {
      setCurrentMonth((m: number) => m - 1);
    }
  }, [currentMonth]);

  const nextMonth = useCallback(() => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y: number) => y + 1);
    } else {
      setCurrentMonth((m: number) => m + 1);
    }
  }, [currentMonth]);

  const prevWeek = useCallback(() => {
    setCurrentWeekAnchor((prev: Date) => {
      const next = new Date(prev);
      next.setDate(next.getDate() - 7);
      setCurrentMonth(next.getMonth());
      setCurrentYear(next.getFullYear());
      return next;
    });
  }, []);

  const nextWeek = useCallback(() => {
    setCurrentWeekAnchor((prev: Date) => {
      const next = new Date(prev);
      next.setDate(next.getDate() + 7);
      setCurrentMonth(next.getMonth());
      setCurrentYear(next.getFullYear());
      return next;
    });
  }, []);

  // Filtered Sessions
  const filteredSessions = useMemo(() => {
    return sessions.filter((s: EducationSession) => {
      if (statusFilter && s.status !== statusFilter) return false;
      if (teacherFilter && s.teacherId !== teacherFilter && (s.teacher as any)?.id !== teacherFilter) return false;
      if (subjectFilter && s.subjectId !== subjectFilter && (s.subject as any)?.id !== subjectFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const studentName = `${s.student?.firstName || ""} ${s.student?.lastName || ""}`.toLowerCase();
        const teacherName = (s.teacher?.name || "").toLowerCase();
        const subjectName = (s.subject?.name || "").toLowerCase();
        const topic = (s.topic || "").toLowerCase();
        if (
          !studentName.includes(q) &&
          !teacherName.includes(q) &&
          !subjectName.includes(q) &&
          !topic.includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [sessions, statusFilter, teacherFilter, subjectFilter, searchQuery]);

  // Operational Actions (Confirm, Cancel, Save)
  const handleConfirmSession = async (id: string, actualDuration?: number) => {
    setActionLoading(id);
    try {
      const res = await fetch(api(`sessions/${id}/confirm`), {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({ actualDuration }),
      });
      const data = await res.json();
      if (!data.success) {
        alert(data.error || data.message || "فشل تأكيد الحصة");
        return;
      }
      await fetchSessionsData();
      if (selectedSession?.id === id) {
        setSelectedSession((prev: EducationSession | null) => (prev ? { ...prev, status: "CONFIRMED" } : null));
      }
    } catch (e: any) {
      alert(e.message || "حدث خطأ أثناء التأكيد");
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancelSession = async (id: string) => {
    if (!window.confirm("هل أنت متأكد من رغبتك في إلغاء هذه الحصة الأكاديمية؟")) return;
    setActionLoading(id);
    try {
      const res = await fetch(api(`sessions/${id}/cancel`), {
        method: "PUT",
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (!data.success) {
        alert(data.error || data.message || "فشل إلغاء الحصة");
        return;
      }
      await fetchSessionsData();
      if (selectedSession?.id === id) {
        setSelectedSession((prev: EducationSession | null) => (prev ? { ...prev, status: "CANCELLED" } : null));
      }
    } catch (e: any) {
      alert(e.message || "حدث خطأ أثناء الإلغاء");
    } finally {
      setActionLoading(null);
    }
  };

  const handleSaveSession = async (d: Partial<EducationSession>) => {
    const isEdit = !!d.id;
    const url = isEdit ? api(`sessions/${d.id}`) : api("sessions");
    const res = await fetch(url, {
      method: isEdit ? "PUT" : "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(d),
    });
    const result = await res.json();
    if (!result.success) {
      throw new Error(result.error || result.message || "تعذر حفظ الحصة، يرجى مراجعة البيانات");
    }
    setSessionModal(undefined);
    setSelectedSession(null);
    setDayOverviewDate(null);
    await fetchSessionsData();
  };

  // Month Grid Calculations
  const startOfMonth = new Date(currentYear, currentMonth, 1);
  const endOfMonth = new Date(currentYear, currentMonth + 1, 0);
  const firstDayOfWeek = startOfMonth.getDay();
  const daysInMonth = endOfMonth.getDate();
  const today = new Date();
  const todayStr = toLocalDateStr(today);

  const getSessionsForDay = useCallback(
    (day: number) => {
      const pad = (n: number) => String(n).padStart(2, "0");
      const dateStr = `${currentYear}-${pad(currentMonth + 1)}-${pad(day)}`;
      return filteredSessions.filter((s: EducationSession) => toLocalDateStr(s.scheduledAt) === dateStr);
    },
    [filteredSessions, currentYear, currentMonth]
  );

  // Week View Days Calculation (Sunday - Saturday)
  const weekDays = useMemo(() => {
    const start = new Date(currentWeekAnchor);
    start.setDate(currentWeekAnchor.getDate() - currentWeekAnchor.getDay());
    start.setHours(0, 0, 0, 0);

    return Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const dateStr = toLocalDateStr(d);
      return {
        date: d,
        dateStr,
        dayName: DAYS_AR[d.getDay()],
        dayNumber: d.getDate(),
        isToday: dateStr === todayStr,
        sessions: filteredSessions.filter((s: EducationSession) => toLocalDateStr(s.scheduledAt) === dateStr),
      };
    });
  }, [currentWeekAnchor, filteredSessions, todayStr]);

  // Agenda Groups Calculation
  const agendaGroups = useMemo(() => {
    const map = new Map<string, EducationSession[]>();
    // Sort chronologically
    const sorted = [...filteredSessions].sort(
      (a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
    );

    sorted.forEach((s: EducationSession) => {
      const dateStr = toLocalDateStr(s.scheduledAt);
      if (!map.has(dateStr)) {
        map.set(dateStr, []);
      }
      map.get(dateStr)!.push(s);
    });

    return Array.from(map.entries()).map(([dateStr, daySessions]) => {
      const dateObj = new Date(dateStr + "T00:00:00");
      const dayName = isNaN(dateObj.getTime()) ? "" : DAYS_AR[dateObj.getDay()];
      return {
        dateStr,
        dayName,
        dateObj,
        isToday: dateStr === todayStr,
        sessions: daySessions,
      };
    });
  }, [filteredSessions, todayStr]);

  // Statistics
  const stats = useMemo(() => {
    const total = filteredSessions.length;
    const confirmed = filteredSessions.filter((s: EducationSession) => s.status === "CONFIRMED").length;
    const scheduled = filteredSessions.filter((s: EducationSession) => s.status === "SCHEDULED").length;
    const cancelled = filteredSessions.filter((s: EducationSession) => s.status === "CANCELLED").length;
    return { total, confirmed, scheduled, cancelled };
  }, [filteredSessions]);

  const hasActiveFilters = Boolean(searchQuery || teacherFilter || statusFilter || subjectFilter);

  const resetFilters = () => {
    setSearchQuery("");
    setTeacherFilter("");
    setStatusFilter("");
    setSubjectFilter("");
  };

  // Open Quick Add Modal for a specific date
  const openAddSessionForDate = (dateStr: string) => {
    setSessionModal({
      scheduledAt: `${dateStr}T10:00`,
    });
  };

  return (
    <div className="w-full max-w-[1600px] mx-auto p-3 sm:p-5 lg:p-6 space-y-4 rtl font-sans" dir="rtl">
      {/* Header & Main Navigation */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-border/80">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
              <CalendarIcon className="w-3.5 h-3.5" />
              التقويم الأكاديمي الشامل
            </span>
            <span className="text-xs text-muted-foreground font-mono tabular-nums">
              {stats.total} حصة مسجلة
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            جدول ومواعيد الحصص الأكاديمية
          </h1>
          <p className="text-xs text-muted-foreground">
            إدارة المواعيد، تأكيد الجلسات، واستعراض جداول المهندسين والطلاب
          </p>
        </div>

        {/* Action Controls & View Switcher */}
        <div className="flex flex-wrap items-center gap-2 justify-between lg:justify-end">
          {/* View Mode Buttons */}
          <div className="inline-flex items-center bg-card border border-border/80 rounded-xl p-1 shadow-xs">
            <button
              onClick={() => setViewMode("month")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === "month"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              شهري
            </button>
            <button
              onClick={() => setViewMode("week")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === "week"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              أسبوعي
            </button>
            <button
              onClick={() => setViewMode("agenda")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === "agenda"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              <List className="w-3.5 h-3.5" />
              أجندة
            </button>
          </div>

          {/* Quick Schedule Button */}
          <button
            onClick={() => setSessionModal({})}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-xl hover:bg-primary/90 transition-all shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            حجز حصة جديدة
          </button>
        </div>
      </div>

      {/* Date Navigation & Month/Year Pickers */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card border border-border/80 rounded-2xl p-3 shadow-xs">
        <div className="flex items-center gap-2">
          <button
            onClick={goToday}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg border border-border/80 bg-background hover:bg-muted text-foreground transition-colors shadow-xs"
          >
            <RotateCcw className="w-3.5 h-3.5 text-primary" />
            اليوم
          </button>

          {/* Direct Month & Year Pickers */}
          <div className="flex items-center gap-1">
            <select
              value={currentMonth}
              onChange={(e) => setCurrentMonth(Number(e.target.value))}
              className="bg-background border border-border/80 text-foreground text-xs font-semibold rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary shadow-xs"
            >
              {MONTHS_AR.map((m, idx) => (
                <option key={m} value={idx}>
                  {m}
                </option>
              ))}
            </select>

            <select
              value={currentYear}
              onChange={(e) => setCurrentYear(Number(e.target.value))}
              className="bg-background border border-border/80 text-foreground text-xs font-semibold rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary shadow-xs font-mono"
            >
              {[currentYear - 2, currentYear - 1, currentYear, currentYear + 1, currentYear + 2].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Stepper Navigation */}
        <div className="flex items-center justify-between sm:justify-end gap-2">
          <button
            onClick={viewMode === "week" ? prevWeek : prevMonth}
            aria-label="السابق"
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-border/80 bg-background hover:bg-muted text-foreground transition-colors shadow-xs"
          >
            <ChevronRight className="w-4 h-4" />
            {viewMode === "week" ? "الأسبوع السابق" : "الشهر السابق"}
          </button>

          <span className="text-xs font-bold text-foreground px-2 font-mono text-center">
            {viewMode === "week"
              ? `${weekDays[0].dayNumber} ${MONTHS_AR[weekDays[0].date.getMonth()]} - ${weekDays[6].dayNumber} ${MONTHS_AR[weekDays[6].date.getMonth()]} ${currentYear}`
              : `${MONTHS_AR[currentMonth]} ${currentYear}`}
          </span>

          <button
            onClick={viewMode === "week" ? nextWeek : nextMonth}
            aria-label="التالي"
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-border/80 bg-background hover:bg-muted text-foreground transition-colors shadow-xs"
          >
            {viewMode === "week" ? "الأسبوع التالي" : "الشهر التالي"}
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-card border border-border/80 rounded-2xl p-3 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {/* Text Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="بحث بالطالب، المهندس، المادة، الموضوع..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-background border border-border/80 rounded-xl pr-9 pl-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-xs"
            />
          </div>

          {/* Teacher Filter */}
          <select
            value={teacherFilter}
            onChange={(e) => setTeacherFilter(e.target.value)}
            className="w-full bg-background border border-border/80 rounded-xl px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-xs"
          >
            <option value="">جميع المهندسين والمعلمين</option>
            {teachers
              .filter((t) => t.isActive !== false)
              .map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
          </select>

          {/* Subject Filter */}
          <select
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
            className="w-full bg-background border border-border/80 rounded-xl px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-xs"
          >
            <option value="">جميع المواد والمسارات</option>
            {subjects
              .filter((s) => s.isActive !== false)
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
          </select>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="flex-1 bg-background border border-border/80 rounded-xl px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-xs"
            >
              <option value="">جميع الحالات</option>
              {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                <option key={key} value={key}>
                  {cfg.label}
                </option>
              ))}
            </select>

            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                title="إعادة ضبط الفلاتر"
                className="p-2 rounded-xl bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20 transition-colors shadow-xs"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Telemetry Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-card border border-border/80 rounded-xl p-3 flex items-center justify-between shadow-xs">
          <div className="space-y-0.5">
            <div className="text-[11px] text-muted-foreground">إجمالي الحصص المعروضة</div>
            <div className="text-lg font-bold text-foreground font-mono tabular-nums">{stats.total}</div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
            <CalendarIcon className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-card border border-border/80 rounded-xl p-3 flex items-center justify-between shadow-xs">
          <div className="space-y-0.5">
            <div className="text-[11px] text-muted-foreground">حصص مؤكدة</div>
            <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
              {stats.confirmed}
            </div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-card border border-border/80 rounded-xl p-3 flex items-center justify-between shadow-xs">
          <div className="space-y-0.5">
            <div className="text-[11px] text-muted-foreground">حصص مجدولة</div>
            <div className="text-lg font-bold text-blue-600 dark:text-blue-400 font-mono tabular-nums">
              {stats.scheduled}
            </div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-500/20">
            <Clock className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-card border border-border/80 rounded-xl p-3 flex items-center justify-between shadow-xs">
          <div className="space-y-0.5">
            <div className="text-[11px] text-muted-foreground">حصص ملغية</div>
            <div className="text-lg font-bold text-red-600 dark:text-red-400 font-mono tabular-nums">
              {stats.cancelled}
            </div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center border border-red-500/20">
            <XCircle className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Main Calendar Chassis */}
      <div className="bg-card border border-border/80 rounded-2xl overflow-hidden shadow-xs">
        {loading && (
          <div className="p-8 text-center space-y-2">
            <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" />
            <p className="text-xs text-muted-foreground">جارٍ تحميل وتحديث الحصص الأكاديمية...</p>
          </div>
        )}

        {/* 1. Monthly Grid View */}
        {!loading && viewMode === "month" && (
          <div className="overflow-x-auto">
            <div className="min-w-[720px]">
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

              {/* Day Cells */}
              <div className="grid grid-cols-7">
                {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                  <div
                    key={`empty-${i}`}
                    className="min-h-[115px] border-b border-l border-border/60 last:border-l-0 p-1.5 bg-muted/10"
                  />
                ))}

                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const daySessions = getSessionsForDay(day);
                  const isToday =
                    today.getDate() === day &&
                    today.getMonth() === currentMonth &&
                    today.getFullYear() === currentYear;
                  const pad = (n: number) => String(n).padStart(2, "0");
                  const dateStr = `${currentYear}-${pad(currentMonth + 1)}-${pad(day)}`;
                  const dayOfWeek = new Date(currentYear, currentMonth, day).getDay();

                  return (
                    <div
                      key={day}
                      className={`min-h-[115px] border-b border-l border-border/60 last:border-l-0 p-1.5 flex flex-col justify-between transition-colors group relative ${
                        isToday ? "bg-primary/5" : "hover:bg-muted/15"
                      }`}
                    >
                      {/* Day Header */}
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              setDayOverviewDate({
                                dateStr,
                                dayName: DAYS_AR[dayOfWeek],
                                dayNumber: day,
                              })
                            }
                            className={`text-xs font-mono font-bold w-6 h-6 flex items-center justify-center rounded-full tabular-nums hover:ring-2 hover:ring-primary/40 transition-all ${
                              isToday
                                ? "bg-primary text-primary-foreground shadow-xs"
                                : "text-foreground hover:bg-muted"
                            }`}
                            title="عرض كافة حصص هذا اليوم"
                          >
                            {day}
                          </button>

                          {daySessions.length > 0 && (
                            <span className="text-[10px] bg-muted/80 text-foreground px-1.5 py-0.2 rounded-full font-mono tabular-nums">
                              {daySessions.length}
                            </span>
                          )}
                        </div>

                        {/* Quick Add Button on Day Cell */}
                        <button
                          type="button"
                          onClick={() => openAddSessionForDate(dateStr)}
                          className="w-5 h-5 rounded-md hover:bg-primary/10 hover:text-primary text-muted-foreground flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 sm:opacity-70"
                          title="حجز حصة جديدة في هذا اليوم"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Day Sessions List */}
                      <div className="space-y-1 flex-1">
                        {daySessions.slice(0, 3).map((s) => {
                          const st = STATUS_CONFIG[s.status] || STATUS_CONFIG.SCHEDULED;
                          return (
                            <button
                              key={s.id}
                              onClick={() => setSelectedSession(s)}
                              className={`w-full text-right text-[11px] px-1.5 py-0.5 rounded-md border truncate block transition-transform active:scale-[0.98] ${st.badge}`}
                              title={`${s.scheduledAt.slice(11, 16)} - ${s.student?.firstName || "طالب"} (${s.subject?.name || ""})`}
                            >
                              <span className="font-mono tabular-nums font-semibold ml-1">
                                {toLocalTimeStr(s.scheduledAt)}
                              </span>
                              <span>{s.student?.firstName || "طالب"}</span>
                            </button>
                          );
                        })}

                        {/* +N More Button -> Solves the weakness! */}
                        {daySessions.length > 3 && (
                          <button
                            type="button"
                            onClick={() =>
                              setDayOverviewDate({
                                dateStr,
                                dayName: DAYS_AR[dayOfWeek],
                                dayNumber: day,
                              })
                            }
                            className="text-[10px] text-primary font-bold px-1 py-0.5 hover:underline block text-right w-full"
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
          </div>
        )}

        {/* 2. Weekly Columns View */}
        {!loading && viewMode === "week" && (
          <div className="overflow-x-auto p-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 min-w-[700px]">
              {weekDays.map((col) => (
                <div
                  key={col.dateStr}
                  className={`bg-background border rounded-xl p-2.5 flex flex-col space-y-2.5 transition-colors ${
                    col.isToday ? "border-primary/50 shadow-sm" : "border-border/80"
                  }`}
                >
                  {/* Column Header */}
                  <div className="flex items-center justify-between pb-2 border-b border-border/60">
                    <div className="space-y-0.5">
                      <div className="text-xs font-bold text-foreground">{col.dayName}</div>
                      <div className="text-[11px] text-muted-foreground font-mono tabular-nums">
                        {col.dateStr}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {col.sessions.length > 0 && (
                        <span className="text-[10px] bg-primary/10 text-primary font-bold px-1.5 py-0.5 rounded-full font-mono tabular-nums">
                          {col.sessions.length}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => openAddSessionForDate(col.dateStr)}
                        className="w-6 h-6 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors"
                        title="إضافة حصة"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Sessions in Day */}
                  <div className="space-y-2 flex-1 min-h-[160px]">
                    {col.sessions.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-center p-3 text-muted-foreground border border-dashed border-border/60 rounded-lg">
                        <span className="text-[11px]">لا توجد حصص</span>
                        <button
                          type="button"
                          onClick={() => openAddSessionForDate(col.dateStr)}
                          className="mt-1 text-[10px] text-primary hover:underline font-medium"
                        >
                          + حجز حصة
                        </button>
                      </div>
                    ) : (
                      col.sessions.map((s) => {
                        const st = STATUS_CONFIG[s.status] || STATUS_CONFIG.SCHEDULED;
                        return (
                          <div
                            key={s.id}
                            onClick={() => setSelectedSession(s)}
                            className={`p-2 rounded-lg border text-xs cursor-pointer space-y-1 transition-transform hover:-translate-y-0.5 shadow-2xs ${st.badge}`}
                          >
                            <div className="flex items-center justify-between font-mono font-bold text-[11px]">
                              <span>{toLocalTimeStr(s.scheduledAt)}</span>
                              <span className="text-[10px]">{s.plannedDuration} د</span>
                            </div>
                            <div className="font-semibold text-foreground truncate">
                              {s.student?.firstName} {s.student?.lastName || ""}
                            </div>
                            <div className="text-[11px] text-muted-foreground truncate">
                              {s.subject?.name || "مادة غير محددة"}
                            </div>
                            <div className="text-[10px] text-muted-foreground truncate flex items-center gap-1">
                              <User className="w-3 h-3 text-primary shrink-0" />
                              <span>{s.teacher?.name || "مهندس غير محدد"}</span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 3. Agenda / List View (Mobile-Friendly & Comprehensive) */}
        {!loading && viewMode === "agenda" && (
          <div className="p-3 sm:p-5 space-y-5">
            {agendaGroups.length === 0 ? (
              <div className="text-center py-12 space-y-3">
                <CalendarIcon className="w-10 h-10 text-muted-foreground/40 mx-auto" />
                <h3 className="text-sm font-bold text-foreground">لا توجد حصص مسجلة في هذا النطاق</h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  لم يتم العثور على أي مواعيد مطابقة للفلاتر المحددة أو خلال هذا الشهر
                </p>
                <button
                  type="button"
                  onClick={() => setSessionModal({})}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-lg shadow-xs hover:bg-primary/90"
                >
                  <Plus className="w-3.5 h-3.5" />
                  حجز أول حصة الآن
                </button>
              </div>
            ) : (
              agendaGroups.map((group) => (
                <div key={group.dateStr} className="space-y-2.5">
                  {/* Date Divider */}
                  <div className="flex items-center justify-between pb-1.5 border-b border-border/80">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                          group.isToday
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-foreground"
                        }`}
                      >
                        {group.dayName}
                      </span>
                      <span className="text-xs font-semibold text-foreground font-mono">
                        {group.dateStr}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        ({group.sessions.length} حصة)
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => openAddSessionForDate(group.dateStr)}
                      className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline font-semibold"
                    >
                      <Plus className="w-3 h-3" />
                      إضافة حصة
                    </button>
                  </div>

                  {/* Sessions Stack */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    {group.sessions.map((s) => {
                      const st = STATUS_CONFIG[s.status] || STATUS_CONFIG.SCHEDULED;
                      return (
                        <div
                          key={s.id}
                          className="bg-card border border-border/80 rounded-xl p-3 shadow-xs space-y-2.5 hover:border-primary/40 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="space-y-0.5 min-w-0">
                              <div className="font-bold text-xs text-foreground truncate">
                                {s.student?.firstName} {s.student?.lastName || ""}
                              </div>
                              <div className="text-[11px] text-muted-foreground flex items-center gap-1 truncate">
                                <BookOpen className="w-3 h-3 text-primary shrink-0" />
                                <span>{s.subject?.name || "مادة غير محددة"}</span>
                              </div>
                            </div>

                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border shrink-0 ${st.badge}`}>
                              {st.label}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground bg-muted/20 p-2 rounded-lg">
                            <div className="flex items-center gap-1 truncate">
                              <User className="w-3 h-3 text-muted-foreground shrink-0" />
                              <span className="truncate">{s.teacher?.name || "مهندس غير محدد"}</span>
                            </div>
                            <div className="flex items-center gap-1 justify-end font-mono tabular-nums">
                              <Clock className="w-3 h-3 text-muted-foreground shrink-0" />
                              <span>{toLocalTimeStr(s.scheduledAt)} ({s.plannedDuration} د)</span>
                            </div>
                          </div>

                          {s.topic && (
                            <div className="text-[11px] text-muted-foreground truncate bg-card border border-border/60 px-2 py-1 rounded-md">
                              موضوع: {s.topic}
                            </div>
                          )}

                          <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-border/60">
                            {s.status === "SCHEDULED" && (
                              <button
                                type="button"
                                disabled={actionLoading === s.id}
                                onClick={() => handleConfirmSession(s.id)}
                                className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-md text-[11px] font-medium hover:bg-emerald-500/20"
                              >
                                {actionLoading === s.id ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Check className="w-3 h-3" />
                                )}
                                تأكيد
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => setSelectedSession(s)}
                              className="px-2 py-1 bg-muted/60 text-foreground border border-border/80 rounded-md text-[11px] font-medium hover:bg-muted"
                            >
                              تفاصيل وإجراءات
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Empty state when no sessions in month */}
        {!loading && sessions.length === 0 && (
          <div className="border-t border-border/80 py-8 text-center text-xs text-muted-foreground space-y-1">
            <p>لا توجد حصص أكاديمية مسجلة في هذا الشهر</p>
            <button
              type="button"
              onClick={() => setSessionModal({})}
              className="text-primary hover:underline font-semibold"
            >
              + اضغط هنا لجدولة حصة جديدة
            </button>
          </div>
        )}
      </div>

      {/* 4. Day Overview Modal (Full day sessions list) */}
      {dayOverviewDate && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-xs z-50 flex items-center justify-center p-4"
          onClick={() => setDayOverviewDate(null)}
        >
          <div
            className="bg-card border border-border/80 rounded-2xl shadow-2xl p-4 sm:p-5 max-w-lg w-full mx-auto space-y-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-border/80">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <CalendarDays className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">
                    حصص يوم {dayOverviewDate.dayName}
                  </h3>
                  <p className="text-[11px] text-muted-foreground font-mono">
                    {dayOverviewDate.dateStr}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDayOverviewDate(null)}
                className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* List of sessions for this day */}
            <div className="space-y-2">
              {filteredSessions.filter((s) => toLocalDateStr(s.scheduledAt) === dayOverviewDate.dateStr).length === 0 ? (
                <div className="text-center py-6 text-xs text-muted-foreground">
                  لا توجد حصص في هذا اليوم
                </div>
              ) : (
                filteredSessions
                  .filter((s) => toLocalDateStr(s.scheduledAt) === dayOverviewDate.dateStr)
                  .map((s) => {
                    const st = STATUS_CONFIG[s.status] || STATUS_CONFIG.SCHEDULED;
                    return (
                      <div
                        key={s.id}
                        className="p-3 rounded-xl border border-border/80 bg-background/60 space-y-2 hover:border-primary/40 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="font-bold text-xs text-foreground">
                            {s.student?.firstName} {s.student?.lastName || ""}
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${st.badge}`}>
                            {st.label}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
                          <div className="flex items-center gap-1 truncate">
                            <BookOpen className="w-3 h-3 text-primary shrink-0" />
                            <span className="truncate">{s.subject?.name || "مادة غير محددة"}</span>
                          </div>
                          <div className="flex items-center gap-1 truncate">
                            <User className="w-3 h-3 text-muted-foreground shrink-0" />
                            <span className="truncate">{s.teacher?.name || "مهندس غير محدد"}</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-[11px] pt-2 border-t border-border/60">
                          <div className="font-mono text-muted-foreground">
                            {toLocalTimeStr(s.scheduledAt)} ({s.plannedDuration} دقيقة)
                          </div>
                          <div className="flex items-center gap-1.5">
                            {s.status === "SCHEDULED" && (
                              <button
                                type="button"
                                disabled={actionLoading === s.id}
                                onClick={() => handleConfirmSession(s.id)}
                                className="px-2 py-0.5 bg-emerald-500/10 text-emerald-600 rounded text-[11px] font-medium hover:bg-emerald-500/20"
                              >
                                تأكيد
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedSession(s);
                                setDayOverviewDate(null);
                              }}
                              className="px-2 py-0.5 bg-muted text-foreground rounded text-[11px] font-medium hover:bg-muted/80"
                            >
                              إجراءات
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
              )}
            </div>

            {/* Bottom Actions */}
            <div className="pt-3 border-t border-border/80 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  openAddSessionForDate(dayOverviewDate.dateStr);
                  setDayOverviewDate(null);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:bg-primary/90 shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                حجز حصة لهذا اليوم
              </button>

              <button
                type="button"
                onClick={() => setDayOverviewDate(null)}
                className="px-3 py-1.5 bg-muted text-foreground text-xs font-medium rounded-lg hover:bg-muted/80"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Selected Session Details & Operational Actions Modal */}
      {selectedSession && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-xs z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedSession(null)}
        >
          <div
            className="bg-card border border-border/80 rounded-2xl shadow-2xl p-4 sm:p-6 max-w-md w-full mx-auto space-y-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-border/80">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <CalendarIcon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">تفاصيل وإجراءات الحصة</h3>
                  <span className="text-[11px] text-muted-foreground font-mono">
                    ID: {selectedSession.id.slice(0, 8)}...
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSession(null)}
                className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              {/* Student */}
              <div className="flex items-center gap-3 p-3 bg-muted/30 border border-border/60 rounded-xl">
                <User className="w-5 h-5 text-primary flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-semibold text-foreground text-xs">
                    {selectedSession.student?.firstName} {selectedSession.student?.lastName || ""}
                  </p>
                  <p className="text-[11px] text-muted-foreground">الطالب المقيد</p>
                </div>
              </div>

              {/* Teacher */}
              <div className="flex items-center gap-3 p-3 bg-muted/30 border border-border/60 rounded-xl">
                <GraduationCap className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-semibold text-foreground text-xs">
                    {selectedSession.teacher?.name || "مهندس غير محدد"}
                  </p>
                  <p className="text-[11px] text-muted-foreground">المدرس / المهندس المسؤول</p>
                </div>
              </div>

              {/* Subject */}
              <div className="flex items-center gap-3 p-3 bg-muted/30 border border-border/60 rounded-xl">
                <BookOpen className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-semibold text-foreground text-xs">
                    {selectedSession.subject?.name || "مادة غير محددة"}
                  </p>
                  <p className="text-[11px] text-muted-foreground">المادة الدراسية</p>
                </div>
              </div>

              {/* Timing */}
              <div className="flex items-center gap-3 p-3 bg-muted/30 border border-border/60 rounded-xl">
                <Clock className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-semibold text-foreground text-xs font-mono tabular-nums">
                    {new Date(selectedSession.scheduledAt).toLocaleDateString("ar-EG", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}{" "}
                    — الساعة {toLocalTimeStr(selectedSession.scheduledAt)}
                  </p>
                  <p className="text-[11px] text-muted-foreground font-mono tabular-nums">
                    المدة المحددة: {selectedSession.actualDuration || selectedSession.plannedDuration} دقيقة
                  </p>
                </div>
              </div>

              {/* Status */}
              <div className="flex justify-between items-center p-3 rounded-xl border border-border/60 bg-card">
                <span className="text-muted-foreground font-medium">حالة الحصة الحالية</span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                    STATUS_CONFIG[selectedSession.status]?.badge || ""
                  }`}
                >
                  {STATUS_CONFIG[selectedSession.status]?.label || selectedSession.status}
                </span>
              </div>

              {/* Topic & Notes */}
              {selectedSession.topic && (
                <div className="p-3 bg-muted/30 border border-border/60 rounded-xl">
                  <p className="text-[11px] text-muted-foreground mb-1">موضوع الدرس</p>
                  <p className="font-medium text-foreground text-xs">{selectedSession.topic}</p>
                </div>
              )}

              {selectedSession.notes && (
                <div className="p-3 bg-muted/30 border border-border/60 rounded-xl">
                  <p className="text-[11px] text-muted-foreground mb-1">ملاحظات إضافية</p>
                  <p className="text-foreground text-xs">{selectedSession.notes}</p>
                </div>
              )}
            </div>

            {/* Operational Actions Buttons */}
            <div className="pt-3 border-t border-border/80 flex flex-wrap gap-2 items-center justify-between">
              <div className="flex items-center gap-1.5 flex-wrap">
                {selectedSession.status === "SCHEDULED" && (
                  <button
                    type="button"
                    disabled={actionLoading === selectedSession.id}
                    onClick={() => handleConfirmSession(selectedSession.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 shadow-xs"
                  >
                    {actionLoading === selectedSession.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Check className="w-3.5 h-3.5" />
                    )}
                    تأكيد الحضور
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    const toEdit = { ...selectedSession };
                    setSelectedSession(null);
                    setSessionModal(toEdit);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-card border border-border/80 text-foreground hover:bg-muted rounded-lg text-xs font-semibold shadow-xs"
                >
                  <Pencil className="w-3.5 h-3.5 text-primary" />
                  تعديل الموعد
                </button>

                {selectedSession.status !== "CANCELLED" && (
                  <button
                    type="button"
                    disabled={actionLoading === selectedSession.id}
                    onClick={() => handleCancelSession(selectedSession.id)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20 rounded-lg text-xs font-medium"
                  >
                    {actionLoading === selectedSession.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <X className="w-3.5 h-3.5" />
                    )}
                    إلغاء
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => setSelectedSession(null)}
                className="px-3 py-1.5 bg-muted text-foreground text-xs font-medium rounded-lg hover:bg-muted/80"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Schedule / Edit Session Modal */}
      {sessionModal !== undefined && (
        <SessionModal
          session={sessionModal}
          teachers={teachers}
          subjects={subjects}
          enrollments={enrollments}
          students={students}
          onClose={() => setSessionModal(undefined)}
          onSave={handleSaveSession}
        />
      )}
    </div>
  );
};

export default EducationCalendarPage;
