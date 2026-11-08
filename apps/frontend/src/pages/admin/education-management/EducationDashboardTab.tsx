import React from "react";
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
} from "lucide-react";
import type { EducationSession, EducationEnrollment, TabId } from "./types";
import { SESSION_STATUS } from "./types";

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
  setActiveTab: (tab: TabId) => void;
}

export const EducationDashboardTab: React.FC<EducationDashboardTabProps> = ({
  stats,
  sessions,
  enrollments,
  setActiveTab,
}) => {
  const { i18n } = useTranslation();
  const isEn = i18n.language === "en";

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 xl:grid-cols-8 gap-2.5 sm:gap-3">
        {[
          {
            label: "المواد الدراسية",
            value: stats.totalSubjects,
            icon: BookOpen,
            color:
              "text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/20",
          },
          {
            label: "الباقات المتاحة",
            value: stats.totalPackages,
            icon: Gift,
            color:
              "text-purple-600 dark:text-purple-400 bg-purple-500/10 border-purple-500/20",
          },
          {
            label: "الطلاب المسجلين",
            value: stats.totalStudents,
            icon: Users,
            color:
              "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
          },
          {
            label: isEn ? "Available Instructors" : "المهندسين المتاحين",
            value: stats.totalTeachers,
            icon: GraduationCap,
            color:
              "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20",
          },
          {
            label: "تسجيلات سارية",
            value: stats.activeEnrollments,
            icon: Layers,
            color:
              "text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
          },
          {
            label: "حصص اليوم",
            value: stats.sessionsToday,
            icon: Clock,
            color:
              "text-sky-600 dark:text-sky-400 bg-sky-500/10 border-sky-500/20",
          },
          {
            label: "حصص مجدولة",
            value: stats.scheduledSessions,
            icon: Calendar,
            color:
              "text-orange-600 dark:text-orange-400 bg-orange-500/10 border-orange-500/20",
          },
          {
            label: "حصص مؤكدة",
            value: stats.totalSessions,
            icon: CheckCircle2,
            color:
              "text-teal-600 dark:text-teal-400 bg-teal-500/10 border-teal-500/20",
          },
        ].map((c, i) => (
          <div
            key={i}
            className="bg-card border border-border/80 rounded-xl p-3 sm:p-3.5 flex items-center justify-between gap-2 shadow-xs min-w-0"
          >
            <div className="space-y-0.5 min-w-0 flex-1">
              <p className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-foreground truncate">
                {c.value}
              </p>
              <p className="text-[11px] sm:text-xs text-muted-foreground truncate" title={c.label}>
                {c.label}
              </p>
            </div>
            <div className={`p-2 rounded-lg border shrink-0 ${c.color}`}>
              <c.icon className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 sm:gap-4">
        <div className="bg-card border border-border/80 rounded-xl p-4 sm:p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              أحدث الحصص المجدولة
            </h3>
            <button
              type="button"
              onClick={() => setActiveTab("sessions")}
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              عرض الكل
              <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
          <div className="space-y-2">
            {sessions.slice(0, 6).map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 border border-border/60 text-xs gap-2"
              >
                <div className="truncate min-w-0">
                  <span className="font-medium text-foreground">
                    {s.student
                      ? `${s.student.firstName} ${s.student.lastName || ""}`
                      : "—"}
                  </span>
                  <span className="text-muted-foreground mx-1">•</span>
                  <span className="text-muted-foreground">
                    {s.subject?.name || "مادة غير محددة"}
                  </span>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-[11px] border shrink-0 ${
                    SESSION_STATUS[s.status]?.color || ""
                  }`}
                >
                  {SESSION_STATUS[s.status]?.label || s.status}
                </span>
              </div>
            ))}
            {sessions.length === 0 && (
              <p className="text-center py-6 text-xs text-muted-foreground">
                لا توجد حصص مسجلة
              </p>
            )}
          </div>
        </div>

        <div className="bg-card border border-border/80 rounded-xl p-4 sm:p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Layers className="w-4 h-4 text-primary" />
              التسجيلات النشطة
            </h3>
            <button
              type="button"
              onClick={() => setActiveTab("enrollments")}
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              عرض الكل
              <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
          <div className="space-y-2">
            {enrollments.slice(0, 6).map((e) => (
              <div
                key={e.id}
                className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 border border-border/60 text-xs gap-2"
              >
                <div className="truncate min-w-0">
                  <span className="font-medium text-foreground">
                    {e.student
                      ? `${e.student.firstName} ${e.student.lastName || ""}`
                      : "—"}
                  </span>
                  <span className="text-muted-foreground mx-1">•</span>
                  <span className="text-muted-foreground">
                    {e.package?.name}
                  </span>
                </div>
                <span className="font-mono tabular-nums text-xs font-medium text-primary shrink-0">
                  {e.remainingHours}/{e.totalHours} س
                </span>
              </div>
            ))}
            {enrollments.length === 0 && (
              <p className="text-center py-6 text-xs text-muted-foreground">
                لا توجد تسجيلات نشطة
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
