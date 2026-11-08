import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  BookOpen,
  Gift,
  Users,
  GraduationCap,
  Layers,
  Clock,
  Calendar,
  CheckCircle2,
  ArrowUpRight,
  Plus,
  Search,
  AlertTriangle,
  Phone,
  MessageCircle,
  DollarSign,
  Sparkles,
  XCircle,
  Eye,
} from "lucide-react";
import type {
  EducationSession,
  EducationEnrollment,
  EducationStudent,
  EducationTeacher,
  EducationSubject,
  EducationPackage,
  Customer,
  TabId,
} from "./types";
import { SESSION_STATUS } from "./types";
import {
  EducationDetailDrawer,
  DrawerTarget,
} from "./EducationDetailDrawer";
import { StudentModal } from "./StudentModal";
import { SessionModal } from "./SessionModal";
import { EnrollmentModal } from "./EnrollmentModal";
import { TeacherModal } from "./TeacherModal";

export interface EducationDashboardTabProps {
  stats: {
    totalSubjects: number;
    totalPackages: number;
    totalStudents: number;
    totalTeachers: number;
    activeEnrollments: number;
    sessionsToday: number;
    totalSessions: number;
    scheduledSessions: number;
  };
  sessions: EducationSession[];
  enrollments: EducationEnrollment[];
  students?: EducationStudent[];
  teachers?: EducationTeacher[];
  subjects?: EducationSubject[];
  packages?: EducationPackage[];
  setActiveTab: (tab: TabId) => void;
  // Modals
  studentModal?: Partial<EducationStudent> | null;
  setStudentModal?: (s: Partial<EducationStudent> | null | undefined) => void;
  sessionModal?: Partial<EducationSession> | null;
  setSessionModal?: (s: Partial<EducationSession> | null | undefined) => void;
  enrollmentModal?: Partial<EducationEnrollment> | null;
  setEnrollmentModal?: (e: Partial<EducationEnrollment> | null | undefined) => void;
  teacherModal?: Partial<EducationTeacher> | null;
  setTeacherModal?: (t: Partial<EducationTeacher> | null | undefined) => void;
  // Handlers
  handleConfirmSession?: (id: string, actualDuration?: number) => Promise<void>;
  handleCancelSession?: (id: string) => Promise<void>;
  handleSaveStudent?: (d: Partial<EducationStudent>) => Promise<void>;
  handleSaveTeacher?: (d: Partial<EducationTeacher>) => Promise<void>;
  handleSaveSession?: (d: Partial<EducationSession>) => Promise<void>;
  handleSaveEnrollment?: (d: Partial<EducationEnrollment>) => Promise<void>;
  // Customer search
  customers?: Customer[];
  customerResults?: Customer[];
  searchCustomers?: (q: string) => Promise<void>;
}

// Safe Date Formatter helper
const formatSafeDateTime = (dateStr?: string | null, isEn = false) => {
  if (!dateStr) return { date: "—", time: "—" };
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return { date: dateStr, time: "—" };
  return {
    date: d.toLocaleDateString(isEn ? "en-US" : "ar-EG"),
    time: d.toLocaleTimeString(isEn ? "en-US" : "ar-EG", {
      hour: "2-digit",
      minute: "2-digit",
    }),
  };
};

export const EducationDashboardTab: React.FC<EducationDashboardTabProps> = ({
  stats,
  sessions,
  enrollments,
  students = [],
  teachers = [],
  subjects = [],
  packages = [],
  setActiveTab,
  studentModal,
  setStudentModal,
  sessionModal,
  setSessionModal,
  enrollmentModal,
  setEnrollmentModal,
  teacherModal,
  setTeacherModal,
  handleConfirmSession,
  handleCancelSession,
  handleSaveStudent,
  handleSaveTeacher,
  handleSaveSession,
  handleSaveEnrollment,
  customers = [],
  customerResults = [],
  searchCustomers = async () => {},
}) => {
  const { i18n } = useTranslation();
  const isEn = i18n.language === "en";

  // Slide-over Drawer State
  const [activeDrawer, setActiveDrawer] = useState<DrawerTarget | null>(null);

  // Sessions list filter and search
  const [sessionTab, setSessionTab] = useState<"today" | "upcoming" | "confirmed" | "all">("today");
  const [sessionSearch, setSessionSearch] = useState("");

  // Teacher filter search
  const [teacherSearch, setTeacherSearch] = useState("");

  // Student filter search
  const [studentSearch, setStudentSearch] = useState("");

  // Today ISO Date string YYYY-MM-DD
  const todayStr = useMemo(() => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }, []);

  // Filtered Sessions for Timeline
  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => {
      const sDateStr = s.scheduledAt ? s.scheduledAt.slice(0, 10) : "";

      // Tab filter
      if (sessionTab === "today") {
        if (sDateStr !== todayStr) return false;
      } else if (sessionTab === "upcoming") {
        if (s.status !== "SCHEDULED") return false;
      } else if (sessionTab === "confirmed") {
        if (s.status !== "CONFIRMED") return false;
      }

      // Search query
      if (sessionSearch.trim()) {
        const q = sessionSearch.toLowerCase();
        const studentName = `${s.student?.firstName || ""} ${s.student?.lastName || ""}`.toLowerCase();
        const teacherName = (s.teacher?.name || "").toLowerCase();
        const subjectName = (s.subject?.name || "").toLowerCase();
        const topic = (s.topic || "").toLowerCase();

        return (
          studentName.includes(q) ||
          teacherName.includes(q) ||
          subjectName.includes(q) ||
          topic.includes(q)
        );
      }

      return true;
    });
  }, [sessions, sessionTab, sessionSearch, todayStr]);

  // Smart Alerts
  // 1. Low Hours: active enrollments with remaining hours <= 2
  const lowHoursEnrollments = useMemo(() => {
    return enrollments.filter(
      (e) => e.isActive && (e.remainingHours ?? 0) <= 2
    );
  }, [enrollments]);

  // 2. Unassigned Instructor
  const unassignedEnrollments = useMemo(() => {
    return enrollments.filter((e) => e.isActive && !e.teacherId);
  }, [enrollments]);

  // 3. Overdue Scheduled Sessions (scheduled time has passed or is today, still SCHEDULED)
  const overdueSessions = useMemo(() => {
    const now = new Date();
    return sessions.filter((s) => {
      if (!s.scheduledAt || s.status !== "SCHEDULED") return false;
      const sDate = new Date(s.scheduledAt);
      return !isNaN(sDate.getTime()) && sDate <= now;
    });
  }, [sessions]);

  // Filtered Instructors (المهندسين)
  const filteredTeachers = useMemo(() => {
    return teachers.filter((t) => {
      if (!teacherSearch.trim()) return true;
      const q = teacherSearch.toLowerCase();
      const matchName = t.name.toLowerCase().includes(q);
      const matchPhone = (t.phone || "").includes(q);
      const matchSubject = t.subjectRates?.some((sr) =>
        sr.subject?.name?.toLowerCase().includes(q)
      );
      return matchName || matchPhone || matchSubject;
    });
  }, [teachers, teacherSearch]);

  // Filtered Students
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      if (!studentSearch.trim()) return true;
      const q = studentSearch.toLowerCase();
      const matchName = `${s.firstName} ${s.lastName || ""}`.toLowerCase().includes(q);
      const matchPhone = (s.phone || s.customer?.phone || "").includes(q);
      const matchGrade = (s.grade || "").toLowerCase().includes(q);
      return matchName || matchPhone || matchGrade;
    });
  }, [students, studentSearch]);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* 1. Quick Command Action Bar */}
      <div className="bg-gradient-to-r from-card via-card to-muted/40 border border-border/80 rounded-2xl p-3.5 sm:p-4 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-foreground">
                {isEn
                  ? "Unified Education Command Center"
                  : "مركز العمليات السريعة للقطاع التعليمي"}
              </h2>
              <p className="text-[11px] sm:text-xs text-muted-foreground">
                {isEn
                  ? "Execute operations, view student & instructor profiles in drawers without leaving"
                  : "إجراء العمليات ومتابعة الطلاب والمهندسين بالنوافذ الجانبية دون مغادرة الصفحة"}
              </p>
            </div>
          </div>

          {/* Quick Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setActiveDrawer(null);
                setStudentModal?.({});
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-all active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              {isEn ? "New Student" : "تسجيل طالب"}
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveDrawer(null);
                setSessionModal?.({});
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold shadow-xs transition-all active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              {isEn ? "Schedule Session" : "جدولة حصة"}
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveDrawer(null);
                setEnrollmentModal?.({});
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-all active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              {isEn ? "New Enrollment" : "اشتراك باقة"}
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveDrawer(null);
                setTeacherModal?.({});
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-xs transition-all active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              {isEn ? "Add Instructor" : "إضافة مهندس"}
            </button>

            <div className="h-5 w-[1px] bg-border/80 mx-1 hidden sm:block" />

            <Link
              to="/admin/education/teacher-schedule"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:py-2 rounded-xl border border-border/80 bg-background hover:bg-muted text-xs font-medium text-foreground transition-colors"
            >
              <Calendar className="w-3.5 h-3.5 text-primary" />
              {isEn ? "Instructor Schedule" : "جدول المهندسين"}
            </Link>

            <Link
              to="/admin/education/teacher-payments"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:py-2 rounded-xl border border-border/80 bg-background hover:bg-muted text-xs font-medium text-foreground transition-colors"
            >
              <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
              {isEn ? "Instructor Payments" : "مرتبات المهندسين"}
            </Link>
          </div>
        </div>
      </div>

      {/* 2. Top Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 xl:grid-cols-8 gap-2.5 sm:gap-3">
        {[
          {
            label: isEn ? "Subjects" : "المواد الدراسية",
            value: stats.totalSubjects,
            icon: BookOpen,
            color: "text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/20",
            tab: "subjects" as TabId,
          },
          {
            label: isEn ? "Packages" : "الباقات المتاحة",
            value: stats.totalPackages,
            icon: Gift,
            color: "text-purple-600 dark:text-purple-400 bg-purple-500/10 border-purple-500/20",
            tab: "packages" as TabId,
          },
          {
            label: isEn ? "Students" : "الطلاب المسجلين",
            value: stats.totalStudents,
            icon: Users,
            color: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
            tab: "students" as TabId,
          },
          {
            label: isEn ? "Instructors" : "المهندسين",
            value: stats.totalTeachers,
            icon: GraduationCap,
            color: "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20",
            tab: "teachers" as TabId,
          },
          {
            label: isEn ? "Active Enrollments" : "تسجيلات سارية",
            value: stats.activeEnrollments,
            icon: Layers,
            color: "text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
            tab: "enrollments" as TabId,
          },
          {
            label: isEn ? "Today's Sessions" : "حصص اليوم",
            value: stats.sessionsToday,
            icon: Clock,
            color: "text-sky-600 dark:text-sky-400 bg-sky-500/10 border-sky-500/20",
            tab: "sessions" as TabId,
          },
          {
            label: isEn ? "Scheduled" : "حصص مجدولة",
            value: stats.scheduledSessions,
            icon: Calendar,
            color: "text-orange-600 dark:text-orange-400 bg-orange-500/10 border-orange-500/20",
            tab: "sessions" as TabId,
          },
          {
            label: isEn ? "Confirmed Sessions" : "حصص مؤكدة",
            value: stats.totalSessions,
            icon: CheckCircle2,
            color: "text-teal-600 dark:text-teal-400 bg-teal-500/10 border-teal-500/20",
            tab: "sessions" as TabId,
          },
        ].map((c, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setActiveTab(c.tab)}
            className="bg-card border border-border/80 hover:border-primary/50 transition-colors rounded-xl p-3 sm:p-3.5 flex items-center justify-between gap-2 shadow-xs min-w-0 text-right cursor-pointer"
          >
            <div className="space-y-0.5 min-w-0 flex-1">
              <p className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-foreground truncate">
                {c.value}
              </p>
              <p
                className="text-[11px] sm:text-xs text-muted-foreground truncate"
                title={c.label}
              >
                {c.label}
              </p>
            </div>
            <div className={`p-2 rounded-lg border shrink-0 ${c.color}`}>
              <c.icon className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            </div>
          </button>
        ))}
      </div>

      {/* 3. Actionable Smart Alerts Bar */}
      {(lowHoursEnrollments.length > 0 ||
        unassignedEnrollments.length > 0 ||
        overdueSessions.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Low Hours Alert */}
          {lowHoursEnrollments.length > 0 && (
            <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-rose-700 dark:text-rose-300 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  {isEn
                    ? "Low Hours Balance (< 2h)"
                    : "باقات قاربت على النفاد (أقل من ساعتين)"}
                </span>
                <span className="font-mono text-xs font-bold bg-rose-500/20 text-rose-700 dark:text-rose-300 px-2 py-0.5 rounded-full">
                  {lowHoursEnrollments.length}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                {isEn
                  ? "Students needing package renewal"
                  : "طلاب بحاجة لتجديد الباقة فوراً"}
              </p>
              <div className="space-y-1.5 pt-1">
                {lowHoursEnrollments.slice(0, 3).map((e) => (
                  <div
                    key={e.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-background/80 text-xs border border-rose-500/20"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setActiveDrawer({
                          type: "student",
                          id: e.studentId,
                        })
                      }
                      className="font-medium text-foreground hover:text-primary hover:underline truncate"
                    >
                      {e.student
                        ? `${e.student.firstName} ${e.student.lastName || ""}`
                        : "طالب"}
                    </button>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="font-mono font-bold text-rose-600 dark:text-rose-400 text-[11px]">
                        {e.remainingHours} س
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveDrawer(null);
                          setEnrollmentModal?.({ studentId: e.studentId });
                        }}
                        className="px-2 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-[10px] font-semibold"
                      >
                        {isEn ? "Renew" : "تجديد"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Unassigned Instructors Alert */}
          {unassignedEnrollments.length > 0 && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                  <GraduationCap className="w-4 h-4 text-amber-600 shrink-0" />
                  {isEn ? "Unassigned Instructors" : "اشتراكات بدون مهندس"}
                </span>
                <span className="font-mono text-xs font-bold bg-amber-500/20 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full">
                  {unassignedEnrollments.length}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                {isEn
                  ? "Enrollments requiring an instructor"
                  : "اشتراكات نشطة بحاجة لتعيين مهندس"}
              </p>
              <div className="space-y-1.5 pt-1">
                {unassignedEnrollments.slice(0, 3).map((e) => (
                  <div
                    key={e.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-background/80 text-xs border border-amber-500/20"
                  >
                    <span className="font-medium text-foreground truncate">
                      {e.student
                        ? `${e.student.firstName} ${e.student.lastName || ""}`
                        : "طالب"}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveDrawer(null);
                        setEnrollmentModal?.(e);
                      }}
                      className="px-2 py-0.5 bg-amber-600 hover:bg-amber-700 text-white rounded text-[10px] font-semibold shrink-0"
                    >
                      {isEn ? "Assign Instructor" : "تعيين مهندس"}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Overdue / Need Confirmation Alert */}
          {overdueSessions.length > 0 && (
            <div className="bg-sky-500/10 border border-sky-500/20 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-sky-700 dark:text-sky-300 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-sky-600 shrink-0" />
                  {isEn
                    ? "Pending Confirmation"
                    : "حصص بحاجة لتأكيد الحضور"}
                </span>
                <span className="font-mono text-xs font-bold bg-sky-500/20 text-sky-700 dark:text-sky-300 px-2 py-0.5 rounded-full">
                  {overdueSessions.length}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                {isEn
                  ? "Sessions ready for attendance confirmation"
                  : "حصص تمت أو مجدولة اليوم تنتظر تأكيد الحضور"}
              </p>
              <div className="space-y-1.5 pt-1">
                {overdueSessions.slice(0, 3).map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-background/80 text-xs border border-sky-500/20"
                  >
                    <span className="font-medium text-foreground truncate">
                      {s.student?.firstName} • {s.subject?.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleConfirmSession?.(s.id)}
                      className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-semibold shrink-0"
                    >
                      {isEn ? "Confirm" : "تأكيد"}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. Main Two-Column Command Center Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5">
        {/* Left Column (7 cols): Live Sessions Timeline & Hub */}
        <div className="lg:col-span-7 bg-card border border-border/80 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3.5">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary shrink-0" />
              <div>
                <h3 className="text-sm font-bold text-foreground">
                  {isEn ? "Live Sessions Timeline" : "مركز حصص اليوم والجدول المباشر"}
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  {isEn
                    ? "Confirm or cancel sessions directly without leaving"
                    : "تأكيد الحضور أو الإلغاء بضغطة زر واحدة دون الانتقال"}
                </p>
              </div>
            </div>

            {/* Sub-tabs */}
            <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl text-xs">
              <button
                type="button"
                onClick={() => setSessionTab("today")}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                  sessionTab === "today"
                    ? "bg-background text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {isEn ? "Today" : "اليوم"}
              </button>
              <button
                type="button"
                onClick={() => setSessionTab("upcoming")}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                  sessionTab === "upcoming"
                    ? "bg-background text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {isEn ? "Upcoming" : "المجدولة"}
              </button>
              <button
                type="button"
                onClick={() => setSessionTab("confirmed")}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                  sessionTab === "confirmed"
                    ? "bg-background text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {isEn ? "Confirmed" : "المؤكدة"}
              </button>
              <button
                type="button"
                onClick={() => setSessionTab("all")}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                  sessionTab === "all"
                    ? "bg-background text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {isEn ? "All" : "الكل"}
              </button>
            </div>
          </div>

          {/* Search sessions */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute right-3 top-2.5 text-muted-foreground" />
            <input
              type="text"
              placeholder={
                isEn
                  ? "Search by student, instructor, subject, or topic..."
                  : "بحث باسم الطالب، المهندس، المادة، أو موضوع الحصة..."
              }
              value={sessionSearch}
              onChange={(e) => setSessionSearch(e.target.value)}
              className="w-full bg-background border border-input rounded-xl pr-9 pl-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Sessions List */}
          <div className="space-y-2.5 max-h-[520px] overflow-y-auto no-scrollbar pr-0.5">
            {filteredSessions.map((s) => {
              const { time } = formatSafeDateTime(s.scheduledAt, isEn);
              return (
                <div
                  key={s.id}
                  className="p-3 rounded-xl border border-border/70 bg-muted/20 hover:border-primary/50 transition-colors space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-2">
                        {s.student ? (
                          <button
                            type="button"
                            onClick={() =>
                              setActiveDrawer({
                                type: "student",
                                id: s.studentId,
                              })
                            }
                            className="font-bold text-xs text-foreground hover:text-primary hover:underline truncate"
                          >
                            {s.student.firstName} {s.student.lastName || ""}
                          </button>
                        ) : (
                          <span className="font-semibold text-xs text-foreground">
                            —
                          </span>
                        )}

                        <span className="text-muted-foreground text-xs">•</span>

                        <span className="text-xs font-medium text-foreground truncate">
                          {s.subject?.name || "مادة دراسية"}
                        </span>
                      </div>

                      {s.topic && (
                        <p className="text-[11px] text-muted-foreground truncate">
                          {s.topic}
                        </p>
                      )}
                    </div>

                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border shrink-0 ${
                        SESSION_STATUS[s.status]?.color || ""
                      }`}
                    >
                      {SESSION_STATUS[s.status]?.label || s.status}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-2 border-t border-border/50">
                    <div className="flex items-center gap-3 text-muted-foreground text-[11px]">
                      <span className="font-mono flex items-center gap-1">
                        <Clock className="w-3 h-3 text-primary shrink-0" />
                        {time}
                      </span>

                      <span className="flex items-center gap-1">
                        <GraduationCap className="w-3 h-3 text-amber-600 shrink-0" />
                        {s.teacher ? (
                          <button
                            type="button"
                            onClick={() =>
                              setActiveDrawer({
                                type: "teacher",
                                id: s.teacherId,
                              })
                            }
                            className="text-foreground hover:text-primary hover:underline font-medium"
                          >
                            {s.teacher.name}
                          </button>
                        ) : (
                          <span>مهندس غير محدد</span>
                        )}
                      </span>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1.5">
                      {s.status === "SCHEDULED" && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleConfirmSession?.(s.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold shadow-xs transition-colors"
                            title={isEn ? "Confirm attendance" : "تأكيد الحضور"}
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            {isEn ? "Confirm" : "تأكيد"}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleCancelSession?.(s.id)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-[11px] font-medium"
                            title={isEn ? "Cancel session" : "إلغاء الحصة"}
                          >
                            <XCircle className="w-3 h-3" />
                            {isEn ? "Cancel" : "إلغاء"}
                          </button>
                        </>
                      )}

                      <button
                        type="button"
                        onClick={() =>
                          setActiveDrawer({ type: "session", id: s.id })
                        }
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-border/80 bg-background hover:bg-muted text-muted-foreground hover:text-foreground text-[11px]"
                        title={isEn ? "Quick view" : "معاينة سريعة"}
                      >
                        <Eye className="w-3 h-3" />
                        {isEn ? "Details" : "التفاصيل"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredSessions.length === 0 && (
              <div className="p-8 text-center border border-dashed border-border/80 rounded-xl space-y-1.5">
                <p className="text-xs font-semibold text-foreground">
                  {isEn ? "No sessions found" : "لا توجد حصص تطابق التصفية"}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {isEn
                    ? "Try changing filters or schedule a new session"
                    : "يمكنك تغيير الفلتر أو جدولة حصة جديدة مباشرة من الزر أعلاه"}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column (5 cols): Instructors Workload & Roster */}
        <div className="lg:col-span-5 bg-card border border-border/80 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-border/60 pb-3.5">
            <div className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-amber-600 shrink-0" />
              <div>
                <h3 className="text-sm font-bold text-foreground">
                  {isEn ? "Instructors & Workload" : "لوحة المهندسين وساعات العمل"}
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  {isEn
                    ? "Click any instructor to view workload drawer"
                    : "اضغط على أي مهندس لفتح نافذة التفاصيل وساعات العمل"}
                </p>
              </div>
            </div>

            <Link
              to="/admin/education/teacher-schedule"
              className="text-xs text-primary hover:underline flex items-center gap-1 font-medium"
            >
              {isEn ? "Full Schedule" : "الجدول الكامل"}
              <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>

          {/* Search instructors */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute right-3 top-2.5 text-muted-foreground" />
            <input
              type="text"
              placeholder={
                isEn ? "Search instructors by name or subject..." : "بحث باسم المهندس أو المادة..."
              }
              value={teacherSearch}
              onChange={(e) => setTeacherSearch(e.target.value)}
              className="w-full bg-background border border-input rounded-xl pr-9 pl-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Instructors List */}
          <div className="space-y-2.5 max-h-[520px] overflow-y-auto no-scrollbar pr-0.5">
            {filteredTeachers.map((teacher) => {
              const assignedCount = enrollments.filter(
                (e) => e.teacherId === teacher.id
              ).length;
              const teacherUpcoming = sessions.filter(
                (s) => s.teacherId === teacher.id && s.status === "SCHEDULED"
              ).length;

              const cleanPhone = (teacher.phone || "").replace(/\D/g, "");
              const whatsappUrl = cleanPhone
                ? `https://wa.me/${cleanPhone.startsWith("2") ? cleanPhone : "2" + cleanPhone}`
                : null;

              return (
                <div
                  key={teacher.id}
                  className="p-3 rounded-xl border border-border/70 bg-muted/20 hover:border-amber-500/50 transition-colors space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold text-xs border border-amber-500/20 shrink-0">
                        {(teacher.name || "?").charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <button
                          type="button"
                          onClick={() =>
                            setActiveDrawer({
                              type: "teacher",
                              id: teacher.id,
                            })
                          }
                          className="font-bold text-xs text-foreground hover:text-primary hover:underline truncate text-right block"
                        >
                          {teacher.name}
                        </button>
                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-0.5">
                          <span>{assignedCount} {isEn ? "students" : "طالب"}</span>
                          <span>•</span>
                          <span className="text-amber-600 dark:text-amber-400 font-medium font-mono">
                            {teacherUpcoming} {isEn ? "upcoming" : "حصة قادمة"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setActiveDrawer({ type: "teacher", id: teacher.id })
                      }
                      className="p-1.5 rounded-lg border border-border/80 bg-background hover:bg-muted text-primary text-xs shrink-0"
                      title={isEn ? "View instructor drawer" : "معاينة المهندس"}
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Subjects pills & Contact */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/50 text-[11px]">
                    <div className="flex flex-wrap gap-1">
                      {teacher.subjectRates && teacher.subjectRates.length > 0 ? (
                        teacher.subjectRates.slice(0, 2).map((sr) => (
                          <span
                            key={sr.id}
                            className="px-2 py-0.5 rounded-md bg-background border border-border/70 text-foreground text-[10px]"
                          >
                            {sr.subject?.name} ({sr.hourlyRate} ج.م/س)
                          </span>
                        ))
                      ) : (
                        <span className="text-muted-foreground text-[10px]">
                          {isEn ? "General Instructor" : "مهندس معتمد"}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      {whatsappUrl && (
                        <a
                          href={whatsappUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 border border-emerald-500/20"
                          title="WhatsApp"
                        >
                          <MessageCircle className="w-3 h-3" />
                        </a>
                      )}
                      {teacher.phone && (
                        <a
                          href={`tel:${teacher.phone}`}
                          className="p-1 rounded-md bg-background border border-border/70 text-muted-foreground hover:text-foreground"
                          title="Call"
                        >
                          <Phone className="w-3 h-3" />
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setActiveDrawer(null);
                          setSessionModal?.({ teacherId: teacher.id });
                        }}
                        className="px-2 py-0.5 rounded bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 font-semibold text-[10px] inline-flex items-center gap-0.5"
                      >
                        <Plus className="w-2.5 h-2.5" />
                        {isEn ? "Session" : "حصة"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredTeachers.length === 0 && (
              <div className="p-8 text-center border border-dashed border-border/80 rounded-xl space-y-1 text-xs text-muted-foreground">
                {isEn ? "No instructors found" : "لم يتم العثور على مهندسين"}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 5. Active Students & Enrollments Directory */}
      <div className="bg-card border border-border/80 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3.5">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <h3 className="text-sm font-bold text-foreground">
                {isEn ? "Students & Active Package Balances" : "دليل الطلاب ورصيد الباقات النشطة"}
              </h3>
              <p className="text-[11px] text-muted-foreground">
                {isEn
                  ? "Track hours remaining, guardian details, and view profiles in drawer"
                  : "متابعة الساعات المتبقية وتفاصيل أولياء الأمور عبر النافذة الجانبية"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-3.5 h-3.5 absolute right-3 top-2.5 text-muted-foreground" />
              <input
                type="text"
                placeholder={
                  isEn ? "Search students by name, phone..." : "بحث باسم الطالب أو الهاتف..."
                }
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                className="w-full bg-background border border-input rounded-xl pr-9 pl-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <button
              type="button"
              onClick={() => setActiveTab("students")}
              className="text-xs text-primary hover:underline flex items-center gap-1 font-medium shrink-0"
            >
              {isEn ? "Full Table" : "الجدول الكامل"}
              <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Students Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filteredStudents.slice(0, 12).map((student) => {
            const studentEnrollments = enrollments.filter(
              (e) => e.studentId === student.id
            );
            const totalRemaining = studentEnrollments.reduce(
              (sum, e) => sum + (e.remainingHours || 0),
              0
            );
            const totalHours = studentEnrollments.reduce(
              (sum, e) => sum + (e.totalHours || 0),
              0
            );
            const percent =
              totalHours > 0
                ? Math.round((totalRemaining / totalHours) * 100)
                : 0;

            const cleanPhone = (student.phone || student.customer?.phone || "").replace(
              /\D/g,
              ""
            );
            const whatsappUrl = cleanPhone
              ? `https://wa.me/${cleanPhone.startsWith("2") ? cleanPhone : "2" + cleanPhone}`
              : null;

            return (
              <div
                key={student.id}
                className="p-3.5 rounded-xl border border-border/70 bg-muted/20 hover:border-emerald-500/50 transition-colors space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs border border-emerald-500/20 shrink-0">
                      {(student.firstName || "?").charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <button
                        type="button"
                        onClick={() =>
                          setActiveDrawer({
                            type: "student",
                            id: student.id,
                          })
                        }
                        className="font-bold text-xs text-foreground hover:text-primary hover:underline truncate text-right block"
                      >
                        {student.firstName} {student.lastName || ""}
                      </button>
                      <div className="text-[11px] text-muted-foreground truncate">
                        {student.grade || (isEn ? "Enrolled Student" : "طالب مسجل")}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setActiveDrawer({ type: "student", id: student.id })
                    }
                    className="p-1.5 rounded-lg border border-border/80 bg-background hover:bg-muted text-primary text-xs shrink-0"
                    title={isEn ? "View student drawer" : "معاينة ملف الطالب"}
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Hours Balance Progress */}
                <div className="space-y-1.5 bg-background/80 p-2.5 rounded-lg border border-border/50 text-xs">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground">
                      {isEn ? "Remaining Hours" : "الرصيد المتبقي"}
                    </span>
                    <span className="font-mono font-bold text-primary tabular-nums">
                      {totalRemaining} / {totalHours} س
                    </span>
                  </div>
                  <div className="w-full bg-muted/80 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        totalRemaining <= 2
                          ? "bg-rose-500"
                          : totalRemaining <= 5
                          ? "bg-amber-500"
                          : "bg-emerald-500"
                      }`}
                      style={{ width: `${Math.min(100, percent)}%` }}
                    />
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="flex items-center justify-between pt-1 border-t border-border/50 text-[11px]">
                  <div className="flex items-center gap-1.5">
                    {whatsappUrl && (
                      <a
                        href={whatsappUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 border border-emerald-500/20"
                        title="WhatsApp"
                      >
                        <MessageCircle className="w-3 h-3" />
                      </a>
                    )}
                    {(student.phone || student.customer?.phone) && (
                      <a
                        href={`tel:${student.phone || student.customer?.phone}`}
                        className="p-1 rounded-md bg-background border border-border/70 text-muted-foreground hover:text-foreground"
                        title="Call"
                      >
                        <Phone className="w-3 h-3" />
                      </a>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveDrawer(null);
                      setSessionModal?.({ studentId: student.id });
                    }}
                    className="px-2 py-0.5 rounded bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 font-semibold text-[10px] inline-flex items-center gap-0.5"
                  >
                    <Plus className="w-2.5 h-2.5" />
                    {isEn ? "Schedule" : "جدولة حصة"}
                  </button>
                </div>
              </div>
            );
          })}

          {filteredStudents.length === 0 && (
            <div className="col-span-full p-8 text-center border border-dashed border-border/80 rounded-xl space-y-1 text-xs text-muted-foreground">
              {isEn ? "No students found" : "لم يتم العثور على طلاب مسجلين"}
            </div>
          )}
        </div>
      </div>

      {/* 6. Slide-over Detail Drawer Component (z-40) */}
      <EducationDetailDrawer
        drawer={activeDrawer}
        onClose={() => setActiveDrawer(null)}
        students={students}
        teachers={teachers}
        sessions={sessions}
        enrollments={enrollments}
        subjects={subjects}
        packages={packages}
        isEn={isEn}
        onConfirmSession={handleConfirmSession}
        onCancelSession={handleCancelSession}
        onOpenScheduleSession={(prefill) => {
          setActiveDrawer(null);
          setSessionModal?.(prefill || {});
        }}
        onOpenEnrollment={(prefill) => {
          setActiveDrawer(null);
          setEnrollmentModal?.(prefill || {});
        }}
        onOpenEditStudent={(st) => {
          setActiveDrawer(null);
          setStudentModal?.(st);
        }}
        onOpenEditTeacher={(t) => {
          setActiveDrawer(null);
          setTeacherModal?.(t);
        }}
        onOpenEditSession={(s) => {
          setActiveDrawer(null);
          setSessionModal?.(s);
        }}
        onSelectDrawer={(target) => {
          setActiveDrawer(target);
        }}
      />

      {/* 7. Inline Modals When Triggered Directly From Dashboard (z-50) */}
      {studentModal !== null && studentModal !== undefined && (
        <StudentModal
          student={studentModal}
          customers={customers}
          customerResults={customerResults}
          onCustomerSearch={searchCustomers}
          onClose={() => setStudentModal?.(null)}
          onSave={async (d) => {
            if (handleSaveStudent) await handleSaveStudent(d);
          }}
        />
      )}

      {sessionModal !== null && sessionModal !== undefined && (
        <SessionModal
          session={sessionModal}
          teachers={teachers}
          subjects={subjects}
          enrollments={enrollments}
          students={students}
          onClose={() => setSessionModal?.(null)}
          onSave={async (d) => {
            if (handleSaveSession) await handleSaveSession(d);
          }}
        />
      )}

      {enrollmentModal !== null && enrollmentModal !== undefined && (
        <EnrollmentModal
          enrollment={enrollmentModal}
          students={students}
          packages={packages}
          teachers={teachers}
          subjects={subjects}
          onClose={() => setEnrollmentModal?.(null)}
          onSave={async (d) => {
            if (handleSaveEnrollment) await handleSaveEnrollment(d);
          }}
          onAddNewStudent={async (stData) => {
            if (handleSaveStudent) {
              await handleSaveStudent(stData);
            }
            return null;
          }}
        />
      )}

      {teacherModal !== null && teacherModal !== undefined && (
        <TeacherModal
          teacher={teacherModal}
          subjects={subjects}
          onClose={() => setTeacherModal?.(null)}
          onSave={async (d) => {
            if (handleSaveTeacher) await handleSaveTeacher(d);
          }}
        />
      )}
    </div>
  );
};
