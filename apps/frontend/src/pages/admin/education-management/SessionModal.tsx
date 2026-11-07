import React, { useState } from "react";
import { X } from "lucide-react";
import type {
  EducationSession,
  EducationTeacher,
  EducationSubject,
  EducationEnrollment,
  EducationStudent,
} from "./types";
import { MODAL_CLS, INPUT_CLS, SESSION_STATUS } from "./types";

export interface SessionModalProps {
  session?: Partial<EducationSession> | null;
  teachers: EducationTeacher[];
  subjects: EducationSubject[];
  enrollments: EducationEnrollment[];
  students: EducationStudent[];
  onClose: () => void;
  onSave: (d: Partial<EducationSession>) => Promise<void>;
}

export const SessionModal: React.FC<SessionModalProps> = ({
  session,
  teachers,
  subjects,
  enrollments,
  students,
  onClose,
  onSave,
}) => {
  const [form, setForm] = useState({
    ...session,
    enrollmentId: session?.enrollmentId || "",
    scheduledAt: session?.scheduledAt
      ? new Date(session.scheduledAt).toISOString().slice(0, 16)
      : "",
    plannedDuration: session?.plannedDuration || 60,
    topic: session?.topic || "",
    notes: session?.notes || "",
  });

  const selectedEnrollment = enrollments.find(
    (e) => e.id === form.enrollmentId
  );

  return (
    <div
      className="fixed inset-0 bg-background/80 backdrop-blur-xs z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className={MODAL_CLS} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between pb-3 border-b border-border/80">
          <h3 className="text-sm font-bold text-foreground">
            {session?.id ? "تفاصيل وبيانات الحصة" : "جدولة حصة جديدة"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="space-y-3">
          {!session?.id && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">
                التسجيل / الاشتراك *
              </label>
              <select
                className={INPUT_CLS}
                value={form.enrollmentId}
                onChange={(e) =>
                  setForm({ ...form, enrollmentId: e.target.value })
                }
              >
                <option value="">اختر التسجيل</option>
                {enrollments
                  .filter((e) => e.isActive !== false && e.remainingHours > 0)
                  .map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.student?.firstName} {e.student?.lastName || ""} -{" "}
                      {e.package?.name} ({e.remainingHours}/{e.totalHours} س)
                    </option>
                  ))}
              </select>
              {selectedEnrollment && (
                <p
                  className={`text-[11px] mt-1 ${
                    selectedEnrollment.teacher
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-amber-500"
                  }`}
                >
                  {selectedEnrollment.teacher
                    ? `المتبقي: ${selectedEnrollment.remainingHours} ساعة - المدرس: ${selectedEnrollment.teacher.name}`
                    : "التسجيل ده مفيهوش مدرس — الحصة مش هتتحفظ. روح تبويب «التسجيلات» وحدّد المدرس، وبعدها ارجع هنا."}
                </p>
              )}
            </div>
          )}
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">
              تاريخ ووقت الحصة *
            </label>
            <input
              type="datetime-local"
              className={INPUT_CLS}
              value={form.scheduledAt}
              onChange={(e) =>
                setForm({ ...form, scheduledAt: e.target.value })
              }
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">
              المدة المخططة (بالدقائق)
            </label>
            <input
              type="number"
              min={15}
              step={15}
              className={INPUT_CLS}
              value={form.plannedDuration}
              onChange={(e) =>
                setForm({ ...form, plannedDuration: Number(e.target.value) })
              }
              disabled={!!session?.id}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">
              موضوع الحصة والدرس
            </label>
            <input
              className={INPUT_CLS}
              value={form.topic || ""}
              onChange={(e) => setForm({ ...form, topic: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">
              ملاحظات إضافية
            </label>
            <textarea
              className={INPUT_CLS}
              rows={2}
              value={form.notes || ""}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
          {session?.status && (
            <div className="p-3 bg-muted/40 border border-border/60 rounded-xl space-y-1 text-xs">
              <p className="flex items-center gap-1.5">
                <span className="text-muted-foreground">حالة الحصة:</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[11px] border ${
                    SESSION_STATUS[session.status]?.color || ""
                  }`}
                >
                  {SESSION_STATUS[session.status]?.label}
                </span>
              </p>
              {session.actualDuration && (
                <p className="text-[11px] text-muted-foreground font-mono tabular-nums">
                  المدة الفعلية: {session.actualDuration} دقيقة
                </p>
              )}
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2.5 pt-3 border-t border-border/80">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs rounded-lg bg-muted text-foreground hover:bg-muted/80"
          >
            إلغاء
          </button>
          {!session?.id && (
            <button
              type="button"
              onClick={() => onSave(form)}
              disabled={
                !form.enrollmentId ||
                !form.scheduledAt ||
                (!!selectedEnrollment && !selectedEnrollment.teacher)
              }
              className="px-4 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-50"
            >
              حفظ
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
