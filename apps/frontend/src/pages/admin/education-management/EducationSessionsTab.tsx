import React from "react";
import { Plus, Check, X, Pencil } from "lucide-react";
import type {
  EducationSession,
  EducationTeacher,
  EducationSubject,
  EducationEnrollment,
  EducationStudent,
} from "./types";
import { CELL_CLS, SESSION_STATUS } from "./types";
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
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <h2 className="text-base font-bold text-foreground">
          إدارة الحصص والجداول
        </h2>
        <div className="flex flex-wrap gap-2 items-center">
          <select
            className="bg-background border border-input rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            value={sessionFilters.status}
            onChange={(e) =>
              setSessionFilters({ ...sessionFilters, status: e.target.value })
            }
          >
            <option value="">كل الحالات</option>
            {Object.entries(SESSION_STATUS).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </select>
          <select
            className="bg-background border border-input rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            value={sessionFilters.teacherId}
            onChange={(e) =>
              setSessionFilters({
                ...sessionFilters,
                teacherId: e.target.value,
              })
            }
          >
            <option value="">كل المهندسين</option>
            {teachers
              .filter((t) => t.isActive)
              .map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
          </select>
          <DateInput
            className="bg-background border border-input rounded-lg px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            value={sessionFilters.from}
            onChange={(e) =>
              setSessionFilters({ ...sessionFilters, from: e.target.value })
            }
          />
          <DateInput
            className="bg-background border border-input rounded-lg px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            value={sessionFilters.to}
            onChange={(e) =>
              setSessionFilters({ ...sessionFilters, to: e.target.value })
            }
          />
          <button
            type="button"
            onClick={() => setSessionModal({})}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:bg-primary/90 shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            إضافة حصة
          </button>
        </div>
      </div>

      <div className="bg-card border border-border/80 rounded-xl overflow-hidden shadow-xs">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border/80 bg-muted/40 text-muted-foreground text-xs">
              {[
                "الطالب",
                "المهندس",
                "المادة",
                "التاريخ والوقت",
                "المدة",
                "الحالة",
                "",
              ].map((h) => (
                <th key={h} className="text-right py-3 px-4 font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {filtered.map((s) => (
              <tr key={s.id} className="hover:bg-muted/30 transition-colors">
                <td className={CELL_CLS + " font-medium text-foreground"}>
                  {s.student
                    ? `${s.student.firstName} ${s.student.lastName || ""}`
                    : "—"}
                </td>
                <td className={CELL_CLS + " text-muted-foreground"}>
                  {s.teacher?.name || "—"}
                </td>
                <td className={CELL_CLS + " text-muted-foreground"}>
                  {s.subject?.name || "—"}
                </td>
                <td className={CELL_CLS + " font-mono text-muted-foreground"}>
                  {new Date(s.scheduledAt).toLocaleDateString("ar-EG")}{" "}
                  {new Date(s.scheduledAt).toLocaleTimeString("ar-EG", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </td>
                <td
                  className={
                    CELL_CLS + " font-mono tabular-nums text-foreground"
                  }
                >
                  {s.actualDuration || s.plannedDuration} دقيقة
                </td>
                <td className={CELL_CLS}>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${
                      SESSION_STATUS[s.status]?.color || ""
                    }`}
                  >
                    {SESSION_STATUS[s.status]?.label || s.status}
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
                          title="تأكيد الحضور"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCancelSession(s.id)}
                          className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-500/10 rounded-md transition-colors"
                          title="إلغاء الحصة"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => setSessionModal(s)}
                      className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
                      title="تفاصيل"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="text-center py-12 text-xs text-muted-foreground">
            لا توجد حصص مسجلة
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
