import React from "react";
import { useTranslation } from "react-i18next";
import { Plus, Check, X, Pencil, Clock, BookOpen, User } from "lucide-react";
import type {
  EducationSession,
  EducationTeacher,
  EducationSubject,
  EducationEnrollment,
  EducationStudent,
} from "./types";
import { CELL_CLS, SESSION_STATUS, getSessionStatus } from "./types";
import { SessionModal } from "./SessionModal";
import { DateInput } from '../../../components/ui/DateInput';

export interface EducationSessionsTabProps {
  sessions: EducationSession[];
  teachers: EducationTeacher[];
  subjects: EducationSubject[];
  enrollments: EducationEnrollment[];
  students: EducationStudent[];
  sessionFilters: {
    status: string;
    teacherId: string;
    from: string;
    to: string;
  };
  setSessionFilters: React.Dispatch<
    React.SetStateAction<{
      status: string;
      teacherId: string;
      from: string;
      to: string;
    }>
  >;
  sessionModal: Partial<EducationSession> | null | undefined;
  setSessionModal: (s: Partial<EducationSession> | null | undefined) => void;
  handleSaveSession: (d: Partial<EducationSession>) => Promise<void>;
  handleConfirmSession: (
    id: string,
    actualDuration?: number
  ) => Promise<void>;
  handleCancelSession: (id: string) => Promise<void>;
}

export const EducationSessionsTab: React.FC<EducationSessionsTabProps> = ({
  sessions,
  teachers,
  subjects,
  enrollments,
  students,
  sessionFilters,
  setSessionFilters,
  sessionModal,
  setSessionModal,
  handleSaveSession,
  handleConfirmSession,
  handleCancelSession,
}) => {
  const { t, i18n } = useTranslation();
  const isEn = i18n.language === "en";

  const filtered = sessions.filter((s) => {
    if (sessionFilters.status && s.status !== sessionFilters.status)
      return false;
    if (sessionFilters.teacherId && s.teacherId !== sessionFilters.teacherId)
      return false;
    if (sessionFilters.from && s.scheduledAt < sessionFilters.from) return false;
    if (
      sessionFilters.to &&
      s.scheduledAt > sessionFilters.to + "T23:59:59"
    )
      return false;
    return true;
  });

  return (
    <div className="space-y-4" dir={isEn ? "ltr" : "rtl"}>
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <h2 className="text-base font-bold text-foreground">
          {t("education.sessions.title", isEn ? "Sessions & Schedule Management" : "إدارة الحصص والجداول")}
        </h2>
        <div className="flex flex-col sm:flex-row flex-wrap gap-2 w-full lg:w-auto items-stretch sm:items-center">
          <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
            <select
              className="bg-background border border-input rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary w-full sm:w-auto"
              value={sessionFilters.status}
              onChange={(e) =>
                setSessionFilters({ ...sessionFilters, status: e.target.value })
              }
            >
              <option value="">{t("education.sessions.allStatuses", isEn ? "All Statuses" : "كل الحالات")}</option>
              {Object.entries(SESSION_STATUS).map(([k]) => (
                <option key={k} value={k}>
                  {getSessionStatus(k, isEn).label}
                </option>
              ))}
            </select>
            <select
              className="bg-background border border-input rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary w-full sm:w-auto"
              value={sessionFilters.teacherId}
              onChange={(e) =>
                setSessionFilters({
                  ...sessionFilters,
                  teacherId: e.target.value,
                })
              }
            >
              <option value="">{t("education.sessions.allTeachers", isEn ? "All Teachers" : "كل المدرسين")}</option>
              {teachers
                .filter((t) => t.isActive)
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
            <DateInput
              className="bg-background border border-input rounded-lg px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary w-full sm:w-32"
              value={sessionFilters.from}
              onChange={(e) =>
                setSessionFilters({ ...sessionFilters, from: e.target.value })
              }
            />
            <DateInput
              className="bg-background border border-input rounded-lg px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary w-full sm:w-32"
              value={sessionFilters.to}
              onChange={(e) =>
                setSessionFilters({ ...sessionFilters, to: e.target.value })
              }
            />
          </div>
          <button
            type="button"
            onClick={() => setSessionModal({})}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:bg-primary/90 shadow-xs shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            {t("education.sessions.scheduleSession", isEn ? "Schedule Session" : "إضافة حصة")}
          </button>
        </div>
      </div>

      {/* Mobile Cards View */}
      <div className="grid grid-cols-1 gap-3 md:hidden">
        {filtered.map((s) => (
          <div
            key={s.id}
            className="bg-card border border-border/80 rounded-xl p-3.5 shadow-xs space-y-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-sm text-foreground truncate flex items-center gap-1.5">
                  <span>
                    {s.student
                      ? `${s.student.firstName} ${s.student.lastName || ""}`
                      : "—"}
                  </span>
                  {s.student?.code && (
                    <span className="font-mono text-[10px] text-primary bg-primary/10 px-1 py-0.5 rounded border border-primary/20 shrink-0" dir="ltr">
                      #{s.student.code}
                    </span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  <User className="w-3 h-3 text-primary shrink-0" />
                  <span className="truncate">{s.teacher?.name || (isEn ? "Unassigned Teacher" : "مدرس غير محدد")}</span>
                </div>
              </div>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border shrink-0 ${
                  getSessionStatus(s.status, isEn).color
                }`}
              >
                {getSessionStatus(s.status, isEn).label}
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-1 border-t border-border/40">
              <div className="flex items-center gap-1.5 text-muted-foreground font-mono">
                <Clock className="w-3.5 h-3.5 text-primary shrink-0" />
                <span>
                  {new Date(s.scheduledAt).toLocaleDateString(isEn ? "en-US" : "ar-EG")}{" "}
                  {new Date(s.scheduledAt).toLocaleTimeString(isEn ? "en-US" : "ar-EG", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              <span className="text-[11px] tabular-nums bg-muted/60 text-foreground px-2 py-0.5 rounded-md">
                {s.actualDuration || s.plannedDuration} {isEn ? "min" : "دقيقة"}
              </span>
            </div>

            {s.subject?.name && (
              <div className="flex items-center gap-1.5 text-xs">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 text-[11px]">
                  <BookOpen className="w-3 h-3" />
                  {s.subject.name}
                </span>
                {s.topic && (
                  <span className="text-muted-foreground text-[11px] truncate">
                    ({s.topic})
                  </span>
                )}
              </div>
            )}

            <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-border/60">
              {s.status === "SCHEDULED" && (
                <>
                  <button
                    type="button"
                    onClick={() => handleConfirmSession(s.id)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-md transition-colors border border-emerald-500/20"
                    aria-label={t("education.dashboard.confirmSession", isEn ? "Confirm Attendance" : "تأكيد الحضور")} title={t("education.dashboard.confirmSession", isEn ? "Confirm Attendance" : "تأكيد الحضور")}
                  >
                    <Check className="w-3.5 h-3.5" />
                    {t("education.actions.confirm", isEn ? "Confirm" : "تأكيد")}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCancelSession(s.id)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-red-600 dark:text-red-400 bg-red-500/10 hover:bg-red-500/20 rounded-md transition-colors border border-red-500/20"
                    aria-label={t("education.dashboard.cancelSession", isEn ? "Cancel Session" : "إلغاء الحصة")} title={t("education.dashboard.cancelSession", isEn ? "Cancel Session" : "إلغاء الحصة")}
                  >
                    <X className="w-3.5 h-3.5" />
                    {t("education.actions.cancel", isEn ? "Cancel" : "إلغاء")}
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={() => setSessionModal(s)}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors border border-border/60"
                aria-label={t("education.actions.edit", isEn ? "Edit" : "تعديل")} title={t("education.actions.edit", isEn ? "Edit" : "تعديل")}
              >
                <Pencil className="w-3.5 h-3.5" />
                {t("education.actions.edit", isEn ? "Edit" : "تعديل")}
              </button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="bg-card border border-border/80 rounded-xl p-8 text-center text-xs text-muted-foreground">
            {t("education.sessions.empty", isEn ? "No registered sessions matching criteria" : "لا توجد حصص مسجلة")}
          </div>
        )}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block bg-card border border-border/80 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="border-b border-border/80 bg-muted/40 text-muted-foreground text-xs">
                {[
                  t("education.enrollments.student", isEn ? "Student" : "الطالب"),
                  t("education.enrollments.teacher", isEn ? "Teacher" : "المدرس"),
                  t("education.enrollments.subject", isEn ? "Subject" : "المادة"),
                  t("education.sessions.dateAndTime", isEn ? "Date & Time" : "التاريخ والوقت"),
                  t("education.sessions.plannedDuration", isEn ? "Duration" : "المدة"),
                  t("education.subjects.status", isEn ? "Status" : "الحالة"),
                  "",
                ].map((h, i) => (
                  <th key={i} className={`${isEn ? "text-left" : "text-right"} py-3 px-4 font-semibold`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filtered.map((s) => (
                <tr key={s.id} className="hover:bg-muted/30 transition-colors">
                  <td className={CELL_CLS + " font-medium text-foreground"}>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span>
                        {s.student
                          ? `${s.student.firstName} ${s.student.lastName || ""}`
                          : "—"}
                      </span>
                      {s.student?.code && (
                        <span className="font-mono text-[10px] text-primary bg-primary/10 px-1 py-0.5 rounded border border-primary/20" dir="ltr">
                          #{s.student.code}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className={CELL_CLS + " text-muted-foreground"}>
                    {s.teacher?.name || "—"}
                  </td>
                  <td className={CELL_CLS + " text-muted-foreground"}>
                    {s.subject?.name || "—"}
                  </td>
                  <td className={CELL_CLS + " font-mono text-muted-foreground"}>
                    {new Date(s.scheduledAt).toLocaleDateString(isEn ? "en-US" : "ar-EG")}{" "}
                    {new Date(s.scheduledAt).toLocaleTimeString(isEn ? "en-US" : "ar-EG", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td
                    className={
                      CELL_CLS + " font-mono tabular-nums text-foreground"
                    }
                  >
                    {s.actualDuration || s.plannedDuration} {isEn ? "min" : "دقيقة"}
                  </td>
                  <td className={CELL_CLS}>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${
                        getSessionStatus(s.status, isEn).color
                      }`}
                    >
                      {getSessionStatus(s.status, isEn).label}
                    </span>
                  </td>
                  <td className={CELL_CLS}>
                    <div className="flex items-center justify-end gap-1">
                      {s.status === "SCHEDULED" && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleConfirmSession(s.id)}
                            className="p-1.5 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 rounded-md transition-colors"
                            aria-label={t("education.dashboard.confirmSession", isEn ? "Confirm Attendance" : "تأكيد الحضور")} title={t("education.dashboard.confirmSession", isEn ? "Confirm Attendance" : "تأكيد الحضور")}
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCancelSession(s.id)}
                            className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-500/10 rounded-md transition-colors"
                            aria-label={t("education.dashboard.cancelSession", isEn ? "Cancel Session" : "إلغاء الحصة")} title={t("education.dashboard.cancelSession", isEn ? "Cancel Session" : "إلغاء الحصة")}
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                      <button
                        type="button"
                        onClick={() => setSessionModal(s)}
                        className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
                        aria-label={t("education.actions.edit", isEn ? "Edit Details" : "تفاصيل")} title={t("education.actions.edit", isEn ? "Edit Details" : "تفاصيل")}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <p className="text-center py-12 text-xs text-muted-foreground">
            {t("education.sessions.empty", isEn ? "No registered sessions" : "لا توجد حصص مسجلة")}
          </p>
        )}
      </div>
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
