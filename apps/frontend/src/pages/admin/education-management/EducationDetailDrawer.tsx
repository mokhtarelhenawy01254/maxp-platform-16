import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import {
  X,
  ExternalLink,
  Phone,
  MessageCircle,
  Mail,
  User,
  GraduationCap,
  Calendar,
  Clock,
  BookOpen,
  Layers,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Plus,
  Pencil,
  DollarSign,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type {
  EducationStudent,
  EducationTeacher,
  EducationSession,
  EducationEnrollment,
  EducationSubject,
  EducationPackage,
} from "./types";
import { getSessionStatus } from "./types";

export interface DrawerTarget {
  type: "student" | "teacher" | "session" | "enrollment";
  id: string;
}

export interface EducationDetailDrawerProps {
  drawer: DrawerTarget | null;
  onClose: () => void;
  students: EducationStudent[];
  teachers: EducationTeacher[];
  sessions: EducationSession[];
  enrollments: EducationEnrollment[];
  subjects: EducationSubject[];
  packages: EducationPackage[];
  isEn?: boolean;
  onConfirmSession?: (id: string, actualDuration?: number) => Promise<void>;
  onCancelSession?: (id: string) => Promise<void>;
  onOpenScheduleSession?: (prefill?: Partial<EducationSession>) => void;
  onOpenEnrollment?: (prefill?: Partial<EducationEnrollment>) => void;
  onOpenEditStudent?: (student: EducationStudent) => void;
  onOpenEditTeacher?: (teacher: EducationTeacher) => void;
  onOpenEditSession?: (session: EducationSession) => void;
  onSelectDrawer?: (target: DrawerTarget) => void;
}

// Safe Date Formatter that will never throw a RangeError on invalid dates
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

export const EducationDetailDrawer: React.FC<EducationDetailDrawerProps> = ({
  drawer,
  onClose,
  students,
  teachers,
  sessions,
  enrollments,
  subjects,
  packages,
  isEn = false,
  onConfirmSession,
  onCancelSession,
  onOpenScheduleSession,
  onOpenEnrollment,
  onOpenEditStudent,
  onOpenEditTeacher,
  onOpenEditSession,
  onSelectDrawer,
}) => {
  // ESC key listener to close drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && drawer) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [drawer, onClose]);

  // Lock body scroll while drawer is open
  useEffect(() => {
    if (drawer) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [drawer]);

  if (!drawer) return null;

  // Resolve target entity
  let content = null;

  if (drawer.type === "student") {
    const student = students.find((s) => s.id === drawer.id);
    if (!student) {
      content = (
        <div className="p-6 text-center text-muted-foreground text-xs">
          {isEn ? "Student not found" : "تعذر العثور على بيانات الطالب"}
        </div>
      );
    } else {
      const studentEnrollments = enrollments.filter(
        (e) => e.studentId === student.id
      );
      const studentSessions = sessions
        .filter((s) => s.studentId === student.id)
        .sort((a, b) => {
          const timeA = a.scheduledAt ? new Date(a.scheduledAt).getTime() : 0;
          const timeB = b.scheduledAt ? new Date(b.scheduledAt).getTime() : 0;
          return (isNaN(timeB) ? 0 : timeB) - (isNaN(timeA) ? 0 : timeA);
        });

      const totalRemainingHours = studentEnrollments.reduce(
        (sum, e) => sum + (e.remainingHours || 0),
        0
      );
      const totalAllHours = studentEnrollments.reduce(
        (sum, e) => sum + (e.totalHours || 0),
        0
      );

      const cleanPhone = (student.phone || student.customer?.phone || "").replace(
        /\D/g,
        ""
      );
      const whatsappUrl = cleanPhone
        ? `https://wa.me/${cleanPhone.startsWith("2") ? cleanPhone : "2" + cleanPhone}`
        : null;

      content = (
        <div className="space-y-5">
          {/* Student Profile Card */}
          <div className="bg-muted/40 border border-border/70 rounded-xl p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-base border border-primary/20 shrink-0">
                  {(student.firstName || "?").charAt(0)}
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-sm text-foreground truncate">
                    {student.firstName} {student.lastName || ""}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground flex-wrap">
                    {student.code && (
                      <span className="font-mono bg-primary/10 text-primary border border-primary/20 px-1.5 py-0.5 rounded text-[10px] font-semibold" dir="ltr">
                        #{student.code}
                      </span>
                    )}
                    {student.grade && (
                      <span className="bg-background px-2 py-0.5 rounded text-[11px] border border-border/60">
                        {student.grade}
                      </span>
                    )}
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                        student.isActive
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                          : "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
                      }`}
                    >
                      {student.isActive
                        ? isEn
                          ? "Active"
                          : "نشط"
                        : isEn
                        ? "Inactive"
                        : "غير نشط"}
                    </span>
                  </div>
                </div>
              </div>

              <Link
                to={`/admin/education/student/${student.id}`}
                className="text-primary hover:text-primary/80 p-1.5 rounded-lg border border-border/70 hover:bg-background text-xs inline-flex items-center gap-1 shrink-0"
                title={isEn ? "Full profile page" : "الملف الكامل"}
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Quick Contacts */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/50 text-xs">
              {(student.phone || student.customer?.phone) && (
                <>
                  <a
                    href={`tel:${student.phone || student.customer?.phone}`}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-background border border-border/70 hover:border-primary text-foreground text-xs"
                  >
                    <Phone className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                    <span dir="ltr">
                      {student.phone || student.customer?.phone}
                    </span>
                  </a>
                  {whatsappUrl && (
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 text-xs font-medium"
                    >
                      <MessageCircle className="w-3 h-3 text-emerald-600" />
                      {isEn ? "WhatsApp" : "واتساب"}
                    </a>
                  )}
                </>
              )}
              {student.customer && (
                <div className="text-[11px] text-muted-foreground w-full pt-1">
                  {isEn ? "Guardian / Account: " : "ولي الأمر / الحساب: "}
                  <span className="font-medium text-foreground">
                    {student.customer.firstName} {student.customer.lastName}
                  </span>
                </div>
              )}
              {student.notes && (
                <div className="w-full text-xs text-muted-foreground bg-background/60 p-2 rounded-lg border border-border/50 mt-1">
                  <span className="font-medium text-foreground">
                    {isEn ? "Notes: " : "ملاحظات: "}
                  </span>
                  {student.notes}
                </div>
              )}
            </div>
          </div>

          {/* Hours Balance Summary */}
          <div className="bg-card border border-border/80 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-foreground flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-primary" />
                {isEn ? "Total Hours Balance" : "رصيد الساعات الإجمالي"}
              </span>
              <span className="font-mono tabular-nums font-bold text-primary">
                {totalRemainingHours} / {totalAllHours} {isEn ? "hrs" : "ساعة"}
              </span>
            </div>
            <div className="w-full bg-muted/60 h-2 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  totalRemainingHours <= 2
                    ? "bg-rose-500"
                    : totalRemainingHours <= 5
                    ? "bg-amber-500"
                    : "bg-emerald-500"
                }`}
                style={{
                  width: `${
                    totalAllHours > 0
                      ? Math.min(100, (totalRemainingHours / totalAllHours) * 100)
                      : 0
                  }%`,
                }}
              />
            </div>
            {totalRemainingHours <= 2 && totalAllHours > 0 && (
              <div className="flex items-center gap-1.5 text-[11px] text-rose-600 dark:text-rose-400 bg-rose-500/10 px-2 py-1 rounded border border-rose-500/20">
                <AlertTriangle className="w-3 h-3 shrink-0" />
                <span>
                  {isEn
                    ? "Low hours alert: recommend package renewal"
                    : "تنبيه: الرصيد أوشك على الانتهاء، يُنصح بتجديد الباقة"}
                </span>
              </div>
            )}
          </div>

          {/* Active Enrollments */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-primary" />
                {isEn ? "Enrolled Packages" : "الباقات والاشتراكات المسجلة"}
                <span className="text-muted-foreground font-mono text-[11px]">
                  ({studentEnrollments.length})
                </span>
              </h4>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenEnrollment?.({ studentId: student.id });
                }}
                className="text-[11px] text-primary hover:underline font-medium inline-flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                {isEn ? "Add Package" : "اشتراك باقة جديدة"}
              </button>
            </div>

            <div className="space-y-2">
              {studentEnrollments.map((e) => {
                const percent =
                  e.totalHours > 0
                    ? Math.round((e.remainingHours / e.totalHours) * 100)
                    : 0;
                return (
                  <div
                    key={e.id}
                    className="p-3 rounded-lg border border-border/70 bg-muted/20 space-y-2 hover:border-primary/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-semibold text-xs text-foreground">
                          {e.package?.name || (isEn ? "Package" : "باقة دراسية")}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {e.package?.subject?.name || (isEn ? "Subject" : "مادة دراسية")}
                        </div>
                      </div>
                      <span className="font-mono text-xs font-bold tabular-nums text-primary">
                        {e.remainingHours} / {e.totalHours} {isEn ? "hrs" : "س"}
                      </span>
                    </div>

                    <div className="w-full bg-muted/60 h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${
                          e.remainingHours <= 2
                            ? "bg-rose-500"
                            : e.remainingHours <= 5
                            ? "bg-amber-500"
                            : "bg-emerald-500"
                        }`}
                        style={{ width: `${Math.min(100, percent)}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/40">
                      <div className="flex items-center gap-1">
                        <GraduationCap className="w-3 h-3 text-primary" />
                        {e.teacher ? (
                          <button
                            type="button"
                            onClick={() =>
                              onSelectDrawer?.({
                                type: "teacher",
                                id: e.teacherId!,
                              })
                            }
                            className="text-foreground hover:text-primary hover:underline font-medium"
                          >
                            {e.teacher.name}
                          </button>
                        ) : (
                          <span className="text-amber-600 dark:text-amber-400">
                            {isEn ? "No Instructor assigned" : "لم يُعين مهندس"}
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onOpenScheduleSession?.({
                            studentId: student.id,
                            enrollmentId: e.id,
                            teacherId: e.teacherId || "",
                            subjectId: e.package?.subject?.id,
                          });
                        }}
                        className="text-primary hover:underline font-medium inline-flex items-center gap-1"
                      >
                        <Plus className="w-2.5 h-2.5" />
                        {isEn ? "Schedule Session" : "جدولة حصة"}
                      </button>
                    </div>
                  </div>
                );
              })}

              {studentEnrollments.length === 0 && (
                <div className="p-4 rounded-lg border border-dashed border-border/80 text-center text-xs text-muted-foreground">
                  {isEn
                    ? "No packages enrolled yet"
                    : "لا توجد باقات مفعلة لهذا الطالب"}
                </div>
              )}
            </div>
          </div>

          {/* Recent Sessions */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-primary" />
                {isEn ? "Sessions History" : "سجل وجدول الحصص"}
                <span className="text-muted-foreground font-mono text-[11px]">
                  ({studentSessions.length})
                </span>
              </h4>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenScheduleSession?.({
                    studentId: student.id,
                  });
                }}
                className="text-[11px] text-primary hover:underline font-medium inline-flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                {isEn ? "Schedule" : "جدولة حصة جديدة"}
              </button>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto no-scrollbar">
              {studentSessions.slice(0, 8).map((s) => {
                const { date, time } = formatSafeDateTime(s.scheduledAt, isEn);
                return (
                  <div
                    key={s.id}
                    className="p-2.5 rounded-lg border border-border/60 bg-card text-xs space-y-1.5 hover:border-primary/40 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          onSelectDrawer?.({ type: "session", id: s.id })
                        }
                        className={`${isEn ? "text-left" : "text-right"} hover:text-primary font-medium text-foreground truncate`}
                      >
                        {s.subject?.name || (isEn ? "Subject" : "مادة دراسية")}
                        {s.topic ? ` - ${s.topic}` : ""}
                      </button>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-medium border shrink-0 ${
                          getSessionStatus(s.status, isEn).color
                        }`}
                      >
                        {getSessionStatus(s.status, isEn).label}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-muted-foreground font-mono">
                      <span>
                        {date} {time}
                      </span>
                      <span>
                        {s.actualDuration || s.plannedDuration}{" "}
                        {isEn ? "min" : "دقيقة"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-border/40 text-[11px]">
                      <span className="text-muted-foreground">
                        {isEn ? "Instructor: " : "المهندس: "}
                        <strong className="text-foreground">
                          {s.teacher?.name || "—"}
                        </strong>
                      </span>

                      {s.status === "SCHEDULED" && onConfirmSession && (
                        <button
                          type="button"
                          onClick={() => onConfirmSession(s.id)}
                          className="px-2 py-0.5 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 text-[10px] font-semibold"
                        >
                          {isEn ? "Confirm" : "تأكيد الحضور"}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {studentSessions.length === 0 && (
                <div className="p-4 rounded-lg border border-dashed border-border/80 text-center text-xs text-muted-foreground">
                  {isEn ? "No sessions yet" : "لا توجد حصص مسجلة حتى الآن"}
                </div>
              )}
            </div>
          </div>

          {/* Quick Edit Button */}
          <div className="pt-2 border-t border-border/70 flex gap-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenEditStudent?.(student);
              }}
              className="flex-1 py-2 px-3 rounded-lg border border-border/80 bg-background hover:bg-muted text-xs font-semibold text-foreground inline-flex items-center justify-center gap-1.5"
            >
              <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
              {isEn ? "Edit Student Details" : "تعديل بيانات الطالب"}
            </button>
          </div>
        </div>
      );
    }
  } else if (drawer.type === "teacher") {
    // Respect user rules: "Instructors" in English, "المهندسين" in Arabic
    const teacher = teachers.find((t) => t.id === drawer.id);
    if (!teacher) {
      content = (
        <div className="p-6 text-center text-muted-foreground text-xs">
          {isEn ? "Instructor not found" : "تعذر العثور على بيانات المهندس"}
        </div>
      );
    } else {
      const teacherEnrollments = enrollments.filter(
        (e) => e.teacherId === teacher.id
      );
      const teacherSessions = sessions
        .filter((s) => s.teacherId === teacher.id)
        .sort((a, b) => {
          const timeA = a.scheduledAt ? new Date(a.scheduledAt).getTime() : 0;
          const timeB = b.scheduledAt ? new Date(b.scheduledAt).getTime() : 0;
          return (isNaN(timeB) ? 0 : timeB) - (isNaN(timeA) ? 0 : timeA);
        });

      const uniqueStudentsMap = new Map<string, { id: string; name: string }>();
      teacherEnrollments.forEach((e) => {
        if (e.studentId) {
          const st = students.find((s) => s.id === e.studentId);
          const studentName = st
            ? `${st.firstName} ${st.lastName || ""}`
            : e.student
            ? `${e.student.firstName} ${e.student.lastName || ""}`
            : (isEn ? "Student" : "طالب");
          uniqueStudentsMap.set(e.studentId, { id: e.studentId, name: studentName });
        }
      });
      const uniqueStudents = Array.from(uniqueStudentsMap.values());

      const upcomingSessions = teacherSessions.filter(
        (s) => s.status === "SCHEDULED"
      );
      const confirmedSessions = teacherSessions.filter(
        (s) => s.status === "CONFIRMED"
      );

      const cleanPhone = (teacher.phone || "").replace(/\D/g, "");
      const whatsappUrl = cleanPhone
        ? `https://wa.me/${cleanPhone.startsWith("2") ? cleanPhone : "2" + cleanPhone}`
        : null;

      content = (
        <div className="space-y-5">
          {/* Teacher Profile Card */}
          <div className="bg-muted/40 border border-border/70 rounded-xl p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold text-base border border-amber-500/20 shrink-0">
                  {(teacher.name || "?").charAt(0)}
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-sm text-foreground truncate">
                    {teacher.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                    <span className="text-[11px] text-primary font-medium">
                      {isEn ? "Instructor" : "مهندس معتمد"}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                        teacher.isActive
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                          : "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
                      }`}
                    >
                      {teacher.isActive
                        ? isEn
                          ? "Active"
                          : "نشط"
                        : isEn
                        ? "Inactive"
                        : "غير نشط"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <Link
                  to={`/admin/education/teacher/${teacher.id}`}
                  className="text-primary hover:text-primary/80 p-1.5 rounded-lg border border-border/70 hover:bg-background text-xs inline-flex items-center gap-1"
                  title={isEn ? "Instructor Profile" : "الملف الشخصي"}
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* Quick Contacts */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/50 text-xs">
              {teacher.phone && (
                <>
                  <a
                    href={`tel:${teacher.phone}`}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-background border border-border/70 hover:border-primary text-foreground text-xs"
                  >
                    <Phone className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                    <span dir="ltr">{teacher.phone}</span>
                  </a>
                  {whatsappUrl && (
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 text-xs font-medium"
                    >
                      <MessageCircle className="w-3 h-3 text-emerald-600" />
                      {isEn ? "WhatsApp" : "واتساب"}
                    </a>
                  )}
                </>
              )}
              {teacher.email && (
                <a
                  href={`mailto:${teacher.email}`}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-background border border-border/70 text-muted-foreground hover:text-foreground text-xs"
                >
                  <Mail className="w-3 h-3 text-primary" />
                  <span className="truncate max-w-[180px]">{teacher.email}</span>
                </a>
              )}
              {teacher.bio && (
                <div className="w-full text-xs text-muted-foreground bg-background/60 p-2 rounded-lg border border-border/50 mt-1">
                  {teacher.bio}
                </div>
              )}
            </div>
          </div>

          {/* Quick Workload KPIs */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-card border border-border/80 rounded-xl p-3 text-center space-y-0.5">
              <span className="text-lg font-bold font-mono tabular-nums text-foreground">
                {uniqueStudents.length}
              </span>
              <p className="text-[11px] text-muted-foreground truncate">
                {isEn ? "Students" : "الطلاب المسندين"}
              </p>
            </div>
            <div className="bg-card border border-border/80 rounded-xl p-3 text-center space-y-0.5">
              <span className="text-lg font-bold font-mono tabular-nums text-amber-600 dark:text-amber-400">
                {upcomingSessions.length}
              </span>
              <p className="text-[11px] text-muted-foreground truncate">
                {isEn ? "Upcoming" : "حصص قادمة"}
              </p>
            </div>
            <div className="bg-card border border-border/80 rounded-xl p-3 text-center space-y-0.5">
              <span className="text-lg font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
                {confirmedSessions.length}
              </span>
              <p className="text-[11px] text-muted-foreground truncate">
                {isEn ? "Completed" : "حصص منجزة"}
              </p>
            </div>
          </div>

          {/* Subjects & Hourly Rates */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-primary" />
              {isEn ? "Assigned Subjects & Rates" : "المواد المسندة وسعر الساعة"}
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {teacher.subjectRates && teacher.subjectRates.length > 0 ? (
                teacher.subjectRates.map((sr) => (
                  <div
                    key={sr.id}
                    className="p-2.5 rounded-lg border border-border/70 bg-muted/20 flex items-center justify-between text-xs"
                  >
                    <span className="font-medium text-foreground">
                      {sr.subject?.name || (isEn ? "Subject" : "مادة")}
                    </span>
                    <span className="font-mono tabular-nums font-bold text-primary">
                      {sr.hourlyRate} {isEn ? "EGP/hr" : "ج.م/س"}
                    </span>
                  </div>
                ))
              ) : (
                <div className="p-3 col-span-2 rounded-lg border border-dashed border-border/80 text-center text-xs text-muted-foreground">
                  {isEn
                    ? "No specific subject rates configured"
                    : "لم يتم تحديد تسعير ساعات للمواد"}
                </div>
              )}
            </div>
          </div>

          {/* Assigned Students */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-primary" />
              {isEn ? "Assigned Students" : "الطلاب المشتركين مع المهندس"}
              <span className="text-muted-foreground font-mono text-[11px]">
                ({uniqueStudents.length})
              </span>
            </h4>
            <div className="space-y-1.5 max-h-48 overflow-y-auto no-scrollbar">
              {uniqueStudents.map((st) => (
                <div
                  key={st.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-card border border-border/60 hover:border-primary/50 text-xs"
                >
                  <button
                    type="button"
                    onClick={() =>
                      onSelectDrawer?.({ type: "student", id: st.id })
                    }
                    className="font-medium text-foreground hover:text-primary hover:underline text-right truncate"
                  >
                    {st.name}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenScheduleSession?.({
                        teacherId: teacher.id,
                        studentId: st.id,
                      });
                    }}
                    className="text-[11px] text-primary hover:underline inline-flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    {isEn ? "Schedule" : "حصة"}
                  </button>
                </div>
              ))}
              {uniqueStudents.length === 0 && (
                <div className="p-3 rounded-lg border border-dashed border-border/80 text-center text-xs text-muted-foreground">
                  {isEn ? "No students assigned" : "لا يوجد طلاب مسندين حالياً"}
                </div>
              )}
            </div>
          </div>

          {/* Fast Navigation to Schedule & Payments */}
          <div className="pt-2 border-t border-border/70 grid grid-cols-2 gap-2">
            <Link
              to="/admin/education/teacher-schedule"
              className="py-2 px-3 rounded-lg border border-border/80 bg-background hover:bg-muted text-xs font-semibold text-foreground inline-flex items-center justify-center gap-1.5"
            >
              <Calendar className="w-3.5 h-3.5 text-primary" />
              {isEn ? "Instructor Schedule" : "جدول المهندسين"}
            </Link>
            <Link
              to="/admin/education/teacher-payments"
              className="py-2 px-3 rounded-lg border border-border/80 bg-background hover:bg-muted text-xs font-semibold text-foreground inline-flex items-center justify-center gap-1.5"
            >
              <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
              {isEn ? "Instructor Payments" : "مرتبات المهندسين"}
            </Link>
          </div>

          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenEditTeacher?.(teacher);
            }}
            className="w-full py-2 px-3 rounded-lg border border-border/80 bg-background hover:bg-muted text-xs font-semibold text-foreground inline-flex items-center justify-center gap-1.5"
          >
            <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
            {isEn ? "Edit Instructor Info" : "تعديل بيانات المهندس"}
          </button>
        </div>
      );
    }
  } else if (drawer.type === "session") {
    const session = sessions.find((s) => s.id === drawer.id);
    if (!session) {
      content = (
        <div className="p-6 text-center text-muted-foreground text-xs">
          {isEn ? "Session not found" : "تعذر العثور على بيانات الحصة"}
        </div>
      );
    } else {
      const { date, time } = formatSafeDateTime(session.scheduledAt, isEn);
      const student = session.student;
      const teacher = session.teacher;

      content = (
        <div className="space-y-5">
          {/* Status Header */}
          <div className="bg-muted/40 border border-border/70 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span
                className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                  getSessionStatus(session.status, isEn).color
                }`}
              >
                {getSessionStatus(session.status, isEn).label}
              </span>
              <span className="text-xs font-mono text-muted-foreground">
                {session.actualDuration || session.plannedDuration}{" "}
                {isEn ? "minutes" : "دقيقة"}
              </span>
            </div>

            <div className="space-y-1">
              <h3 className="font-bold text-base text-foreground">
                {session.subject?.name || (isEn ? "Subject" : "مادة دراسية")}
              </h3>
              {session.topic && (
                <p className="text-xs text-muted-foreground">{session.topic}</p>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground pt-2 border-t border-border/50">
              <Calendar className="w-3.5 h-3.5 text-primary shrink-0" />
              <span>
                {date} {time}
              </span>
            </div>
          </div>

          {/* Student Info Card */}
          <div className="p-3.5 rounded-xl border border-border/80 bg-card space-y-2">
            <div className="text-[11px] font-semibold text-muted-foreground flex items-center justify-between">
              <span>{isEn ? "Student" : "الطالب"}</span>
              {session.studentId && (
                <button
                  type="button"
                  onClick={() =>
                    onSelectDrawer?.({
                      type: "student",
                      id: session.studentId,
                    })
                  }
                  className="text-primary hover:underline"
                >
                  {isEn ? "View Profile" : "عرض الملف"}
                </button>
              )}
            </div>
            <div className="flex items-center justify-between">
              <div className="font-bold text-sm text-foreground">
                {student
                  ? `${student.firstName} ${student.lastName || ""}`
                  : "—"}
              </div>
            </div>
          </div>

          {/* Teacher Info Card */}
          <div className="p-3.5 rounded-xl border border-border/80 bg-card space-y-2">
            <div className="text-[11px] font-semibold text-muted-foreground flex items-center justify-between">
              <span>{isEn ? "Instructor" : "المهندس"}</span>
              {session.teacherId && (
                <button
                  type="button"
                  onClick={() =>
                    onSelectDrawer?.({
                      type: "teacher",
                      id: session.teacherId,
                    })
                  }
                  className="text-primary hover:underline"
                >
                  {isEn ? "View Profile" : "عرض الملف"}
                </button>
              )}
            </div>
            <div className="flex items-center justify-between">
              <div className="font-bold text-sm text-foreground">
                {teacher?.name || (isEn ? "Unassigned Instructor" : "مهندس غير محدد")}
              </div>
            </div>
          </div>

          {/* Session Notes */}
          {session.notes && (
            <div className="p-3.5 rounded-xl border border-border/80 bg-card space-y-1">
              <div className="text-[11px] font-semibold text-muted-foreground">
                {isEn ? "Session Notes" : "ملاحظات الحصة"}
              </div>
              <p className="text-xs text-foreground leading-relaxed">
                {session.notes}
              </p>
            </div>
          )}

          {/* Direct Actions */}
          <div className="space-y-2 pt-2 border-t border-border/70">
            {session.status === "SCHEDULED" && (
              <>
                <button
                  type="button"
                  onClick={async () => {
                    if (onConfirmSession) {
                      await onConfirmSession(session.id);
                      onClose();
                    }
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs inline-flex items-center justify-center gap-2 shadow-xs transition-colors"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {isEn ? "Confirm Attendance & Complete" : "تأكيد الحضور وإتمام الحصة"}
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    if (onCancelSession) {
                      await onCancelSession(session.id);
                      onClose();
                    }
                  }}
                  className="w-full py-2 px-4 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 font-semibold text-xs inline-flex items-center justify-center gap-2 transition-colors"
                >
                  <XCircle className="w-4 h-4" />
                  {isEn ? "Cancel Session" : "إلغاء الحصة"}
                </button>
              </>
            )}

            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenEditSession?.(session);
              }}
              className="w-full py-2 px-4 rounded-xl border border-border/80 bg-background hover:bg-muted font-semibold text-xs text-foreground inline-flex items-center justify-center gap-2"
            >
              <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
              {isEn ? "Edit Session Data" : "تعديل تفاصيل الحصة"}
            </button>
          </div>
        </div>
      );
    }
  } else if (drawer.type === "enrollment") {
    const enrollment = enrollments.find((e) => e.id === drawer.id);
    if (!enrollment) {
      content = (
        <div className="p-6 text-center text-muted-foreground text-xs">
          {isEn ? "Enrollment not found" : "تعذر العثور على بيانات الاشتراك"}
        </div>
      );
    } else {
      const student = enrollment.student;
      const teacher = enrollment.teacher;
      const pkg = enrollment.package;
      const percent =
        enrollment.totalHours > 0
          ? Math.round((enrollment.remainingHours / enrollment.totalHours) * 100)
          : 0;

      content = (
        <div className="space-y-5">
          <div className="bg-muted/40 border border-border/70 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground">
                {pkg?.name || (isEn ? "Package" : "باقة دراسية")}
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                  enrollment.isActive
                    ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                    : "bg-muted text-muted-foreground border-border"
                }`}
              >
                {enrollment.isActive
                  ? isEn
                    ? "Active"
                    : "نشط"
                  : isEn
                  ? "Inactive"
                  : "غير نشط"}
              </span>
            </div>

            <div className="text-xs text-muted-foreground">
              {pkg?.subject?.name || (isEn ? "Subject" : "المادة الدراسية")}
            </div>

            {/* Hours Progress */}
            <div className="space-y-1.5 pt-2 border-t border-border/50">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">
                  {isEn ? "Hours Balance:" : "الرصيد المتبقي:"}
                </span>
                <span className="font-mono font-bold text-primary tabular-nums">
                  {enrollment.remainingHours} / {enrollment.totalHours}{" "}
                  {isEn ? "hrs" : "ساعة"}
                </span>
              </div>
              <div className="w-full bg-muted/60 h-2 rounded-full overflow-hidden">
                <div
                  className={`h-full ${
                    enrollment.remainingHours <= 2
                      ? "bg-rose-500"
                      : enrollment.remainingHours <= 5
                      ? "bg-amber-500"
                      : "bg-emerald-500"
                  }`}
                  style={{ width: `${Math.min(100, percent)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Student & Teacher */}
          <div className="p-3.5 rounded-xl border border-border/80 bg-card space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">
                {isEn ? "Student:" : "الطالب:"}
              </span>
              <button
                type="button"
                onClick={() =>
                  onSelectDrawer?.({
                    type: "student",
                    id: enrollment.studentId,
                  })
                }
                className="font-bold text-foreground hover:text-primary hover:underline"
              >
                {student
                  ? `${student.firstName} ${student.lastName || ""}`
                  : "—"}
              </button>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">
                {isEn ? "Assigned Instructor:" : "المهندس المسند:"}
              </span>
              {enrollment.teacherId ? (
                <button
                  type="button"
                  onClick={() =>
                    onSelectDrawer?.({
                      type: "teacher",
                      id: enrollment.teacherId!,
                    })
                  }
                  className="font-bold text-foreground hover:text-primary hover:underline"
                >
                  {teacher?.name || (isEn ? "Certified Instructor" : "مهندس معتمد")}
                </button>
              ) : (
                <span className="text-amber-600 dark:text-amber-400 font-semibold">
                  {isEn ? "Unassigned" : "غير محدد"}
                </span>
              )}
            </div>

            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">
                {isEn ? "Amount Paid:" : "المبلغ المدفوع:"}
              </span>
              <span className="font-mono font-semibold text-foreground tabular-nums">
                {enrollment.amountPaid} {isEn ? "EGP" : "ج.م"}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenScheduleSession?.({
                studentId: enrollment.studentId,
                teacherId: enrollment.teacherId || "",
                enrollmentId: enrollment.id,
                subjectId: pkg?.subject?.id,
              });
            }}
            className="w-full py-2.5 px-4 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs inline-flex items-center justify-center gap-2 shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            {isEn ? "Schedule Session from Package" : "جدولة حصة من هذا الاشتراك"}
          </button>
        </div>
      );
    }
  }

  // Header Title
  const getDrawerHeaderTitle = () => {
    switch (drawer.type) {
      case "student":
        return isEn ? "Student Details" : "ملف الطالب السريع";
      case "teacher":
        return isEn ? "Instructor Details" : "ملف المهندس السريع";
      case "session":
        return isEn ? "Session Details" : "تفاصيل الحصة";
      case "enrollment":
        return isEn ? "Enrollment Details" : "تفاصيل الاشتراك";
    }
  };

  return (
    <div
      className="fixed inset-0 z-40 overflow-hidden font-sans"
      dir={isEn ? "ltr" : "rtl"}
    >
      {/* Precision Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-xs transition-opacity duration-200"
        onClick={onClose}
      />

      {/* Slide-over Container */}
      <div
        className={`absolute inset-y-0 ${
          isEn ? "right-0 pl-4 sm:pl-10" : "left-0 pr-4 sm:pr-10"
        } max-w-full flex`}
      >
        <aside
          className={`w-screen max-w-md sm:max-w-lg bg-card text-foreground ${
            isEn ? "border-l" : "border-r"
          } border-border flex flex-col shadow-2xl animate-in ${
            isEn ? "slide-in-from-right" : "slide-in-from-left"
          } duration-200`}
        >
          {/* Drawer Top Header */}
          <div className="flex items-center justify-between p-4 border-b border-border/80 bg-muted/20 shrink-0">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <h2 className="text-sm font-bold text-foreground">
                {getDrawerHeaderTitle()}
              </h2>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg border border-border/70 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              aria-label={isEn ? "Close drawer" : "إغلاق النافذة"}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Drawer Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
            {content}
          </div>
        </aside>
      </div>
    </div>
  );
};
