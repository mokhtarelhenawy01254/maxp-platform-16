import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { X, AlertCircle, Loader2, CheckCircle2, UserCheck, Calendar } from "lucide-react";
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
  const { i18n } = useTranslation();
  const isEn = i18n.language === "en";
  const isEdit = !!session?.id;

  // Helper: sensible default for scheduledAt (local YYYY-MM-DDTHH:mm)
  const getDefaultScheduledAt = (): string => {
    if (session?.scheduledAt) {
      const d = new Date(session.scheduledAt);
      if (!isNaN(d.getTime())) {
        const pad = (n: number) => String(n).padStart(2, "0");
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
      }
    }
    const d = new Date();
    // Default to tomorrow 10:00 AM local time
    d.setDate(d.getDate() + 1);
    d.setHours(10, 0, 0, 0);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T10:00`;
  };

  const initialEnrollment = enrollments.find((e) => e.id === session?.enrollmentId);
  const initialTeacherId =
    session?.teacherId ||
    initialEnrollment?.teacherId ||
    initialEnrollment?.teacher?.id ||
    "";

  const [form, setForm] = useState({
    ...session,
    enrollmentId: session?.enrollmentId || "",
    teacherId: initialTeacherId,
    scheduledAt: getDefaultScheduledAt(),
    plannedDuration: session?.plannedDuration || 60,
    topic: session?.topic || "",
    notes: session?.notes || "",
  });

  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const selectedEnrollment = enrollments.find(
    (e) => e.id === form.enrollmentId
  );

  const handleEnrollmentChange = (newEnrollmentId: string) => {
    const enr = enrollments.find((e) => e.id === newEnrollmentId);
    setForm((prev) => ({
      ...prev,
      enrollmentId: newEnrollmentId,
      // If the selected enrollment already has a teacher, use it; otherwise retain or let user pick
      teacherId: enr?.teacherId || enr?.teacher?.id || prev.teacherId || "",
    }));
    setFieldErrors((prev) => ({ ...prev, enrollmentId: "", teacherId: "" }));
  };

  const activeTeachers = teachers.filter((t) => t.isActive !== false);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);
    const errors: Record<string, string> = {};

    if (!isEdit && !form.enrollmentId) {
      errors.enrollmentId = "يرجى اختيار التسجيل / الاشتراك أولاً";
    }

    if (!form.scheduledAt) {
      errors.scheduledAt = "يرجى تحديد موعد الحصة (التاريخ والوقت)";
    } else if (isNaN(new Date(form.scheduledAt).getTime())) {
      errors.scheduledAt = "تاريخ ووقت الحصة غير صالح";
    }

    const resolvedTeacherId =
      form.teacherId ||
      selectedEnrollment?.teacherId ||
      selectedEnrollment?.teacher?.id;

    if (!resolvedTeacherId) {
      errors.teacherId = isEn
        ? "Please select the assigned instructor"
        : "يرجى اختيار المهندس المعين للحصة";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setSaving(true);
    try {
      await onSave({
        ...form,
        teacherId: resolvedTeacherId,
      });
    } catch (err: any) {
      setErrorMessage(err?.message || "حدث خطأ أثناء حفظ الحصة، يرجى المحاولة مرة أخرى");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-background/80 backdrop-blur-xs z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className={MODAL_CLS + " max-h-[92vh] overflow-y-auto"} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between pb-3 border-b border-border/80">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" />
            {isEdit ? "تفاصيل وبيانات الحصة" : "جدولة حصة جديدة"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {errorMessage && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-2.5 text-xs text-red-600 dark:text-red-400">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="font-semibold">تعذر حفظ الحصة</p>
              <p className="text-[11px] leading-relaxed">{errorMessage}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {!isEdit && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">
                التسجيل / الاشتراك *
              </label>
              <select
                className={`${INPUT_CLS} ${fieldErrors.enrollmentId ? "border-red-500 focus:ring-red-500" : ""}`}
                value={form.enrollmentId}
                onChange={(e) => handleEnrollmentChange(e.target.value)}
              >
                <option value="">-- اختر التسجيل --</option>
                {enrollments
                  .filter((e) => e.isActive !== false && e.remainingHours > 0)
                  .map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.student?.firstName} {e.student?.lastName || ""} -{" "}
                      {e.package?.name || "باقة"} ({e.remainingHours}/{e.totalHours} س متبقية)
                    </option>
                  ))}
              </select>
              {fieldErrors.enrollmentId && (
                <p className="text-[11px] text-red-500 font-medium">{fieldErrors.enrollmentId}</p>
              )}
              {selectedEnrollment && (
                <div className="p-2.5 bg-muted/40 border border-border/60 rounded-lg text-xs space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground">الطالب:</span>
                    <span className="font-semibold text-foreground">
                      {selectedEnrollment.student?.firstName} {selectedEnrollment.student?.lastName || ""}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground">الباقة والمادة:</span>
                    <span className="text-foreground">
                      {selectedEnrollment.package?.name} {selectedEnrollment.package?.subject?.name ? `(${selectedEnrollment.package.subject.name})` : ""}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground">الرصيد المتبقي:</span>
                    <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                      {selectedEnrollment.remainingHours} من {selectedEnrollment.totalHours} ساعة
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Teacher Selection */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-foreground">
                {isEn ? "Assigned Instructor *" : "المهندس المعين للحصة *"}
              </label>
              {selectedEnrollment?.teacher && (
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium">
                  <CheckCircle2 className="w-3 h-3" />
                  {isEn ? "Enrollment Instructor:" : "مهندس التسجيل:"} {selectedEnrollment.teacher.name}
                </span>
              )}
            </div>
            <select
              className={`${INPUT_CLS} ${fieldErrors.teacherId ? "border-red-500 focus:ring-red-500" : ""}`}
              value={form.teacherId}
              onChange={(e) => {
                setForm({ ...form, teacherId: e.target.value });
                setFieldErrors((prev) => ({ ...prev, teacherId: "" }));
              }}
              disabled={isEdit && session?.status !== "SCHEDULED"}
            >
              <option value="">{isEn ? "-- Select Instructor --" : "-- اختر المهندس للحصة --"}</option>
              {activeTeachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} {t.phone ? `(${t.phone})` : ""}
                </option>
              ))}
            </select>
            {fieldErrors.teacherId && (
              <p className="text-[11px] text-red-500 font-medium">{fieldErrors.teacherId}</p>
            )}
            {selectedEnrollment && !selectedEnrollment.teacher && (
              <p className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1 mt-1">
                <UserCheck className="w-3.5 h-3.5 shrink-0" />
                {isEn
                  ? "This enrollment has no assigned instructor yet — the instructor chosen here will be assigned automatically."
                  : "هذا التسجيل لم يتم تعيين مهندس له مسبقاً — المهندس الذي تختاره هنا سيتم تعيينه تلقائياً لهذا التسجيل وهذه الحصة."}
              </p>
            )}
          </div>

          {/* Date & Time */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">
              تاريخ ووقت الحصة *
            </label>
            <input
              type="datetime-local"
              className={`${INPUT_CLS} ${fieldErrors.scheduledAt ? "border-red-500 focus:ring-red-500" : ""}`}
              value={form.scheduledAt}
              onChange={(e) => {
                setForm({ ...form, scheduledAt: e.target.value });
                setFieldErrors((prev) => ({ ...prev, scheduledAt: "" }));
              }}
              disabled={isEdit && session?.status !== "SCHEDULED"}
            />
            {fieldErrors.scheduledAt && (
              <p className="text-[11px] text-red-500 font-medium">{fieldErrors.scheduledAt}</p>
            )}
          </div>

          {/* Planned Duration */}
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
                setForm({ ...form, plannedDuration: Number(e.target.value) || 60 })
              }
              disabled={isEdit && session?.status !== "SCHEDULED"}
            />
          </div>

          {/* Topic */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">
              موضوع الحصة والدرس
            </label>
            <input
              className={INPUT_CLS}
              placeholder="مثال: الدرس الأول - مقدمة وتدريبات"
              value={form.topic || ""}
              onChange={(e) => setForm({ ...form, topic: e.target.value })}
            />
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">
              ملاحظات إضافية
            </label>
            <textarea
              className={INPUT_CLS}
              rows={2}
              placeholder="أي ملاحظات خاصة بالتحضير أو الواجب..."
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

          <div className="flex justify-end gap-2.5 pt-3 border-t border-border/80">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-3.5 py-1.5 text-xs rounded-lg bg-muted text-foreground hover:bg-muted/80 disabled:opacity-50"
            >
              إلغاء
            </button>
            {(!isEdit || session?.status === "SCHEDULED") && (
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-50 inline-flex items-center gap-1.5 shadow-xs"
              >
                {saving && <Loader2 className="w-3 h-3 animate-spin" />}
                {saving ? "جاري الحفظ..." : (isEdit ? "حفظ التعديلات" : "حفظ الحصة")}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
