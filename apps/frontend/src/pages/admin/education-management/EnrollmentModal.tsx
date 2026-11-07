import React, { useState } from "react";
import { X } from "lucide-react";
import type {
  EducationEnrollment,
  EducationStudent,
  EducationPackage,
  EducationTeacher,
  EducationSubject,
} from "./types";
import { MODAL_CLS, INPUT_CLS } from "./types";
import { DateInput } from '../../../components/ui/DateInput';

export interface EnrollmentModalProps {
  enrollment?: Partial<EducationEnrollment> | null;
  students: EducationStudent[];
  packages: EducationPackage[];
  teachers: EducationTeacher[];
  subjects: EducationSubject[];
  onClose: () => void;
  onSave: (d: Partial<EducationEnrollment>) => Promise<void>;
}

export const EnrollmentModal: React.FC<EnrollmentModalProps> = ({
  enrollment,
  students,
  packages,
  teachers,
  onClose,
  onSave,
}) => {
  const [form, setForm] = useState({
    studentId: "",
    packageId: "",
    teacherId: "",
    amountPaid: 0,
    paymentStatus:
      enrollment?.paymentStatus === "PAID"
        ? "COMPLETED"
        : enrollment?.paymentStatus || "PENDING",
    expiresAt: "",
    ...enrollment,
  });

  const selectedPackage = packages.find((p) => p.id === form.packageId);
  const filteredTeachers = selectedPackage
    ? teachers.filter((t) =>
        t.subjectRates?.some(
          (sr) => sr.subjectId === selectedPackage.subjectId
        )
      )
    : teachers;

  return (
    <div
      className="fixed inset-0 bg-background/80 backdrop-blur-xs z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className={MODAL_CLS + " max-h-[90vh] overflow-y-auto"}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-border/80">
          <h3 className="text-sm font-bold text-foreground">
            {enrollment?.id ? "تعديل التسجيل" : "إضافة تسجيل جديد"}
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
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">
              الطالب *
            </label>
            <select
              className={INPUT_CLS}
              value={form.studentId}
              onChange={(e) =>
                setForm({ ...form, studentId: e.target.value })
              }
              disabled={!!enrollment?.id}
            >
              <option value="">اختر الطالب</option>
              {students
                .filter((s) => s.isActive)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.firstName} {s.lastName || ""}{" "}
                    {s.phone ? `- ${s.phone}` : ""}
                  </option>
                ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">
              الباقة الدراسية *
            </label>
            <select
              className={INPUT_CLS}
              value={form.packageId}
              onChange={(e) => {
                setForm({
                  ...form,
                  packageId: e.target.value,
                  teacherId: "",
                });
              }}
              disabled={!!enrollment?.id}
            >
              <option value="">اختر الباقة</option>
              {packages
                .filter((p) => p.isActive)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} - {p.subject?.name} ({p.hoursCount}س - {p.price}
                    ج.م)
                  </option>
                ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">
              المدرس المعين{" "}
              {!enrollment?.id && (
                <span className="text-muted-foreground text-[11px]">
                  (اختياري)
                </span>
              )}
            </label>
            <select
              className={INPUT_CLS}
              value={form.teacherId || ""}
              onChange={(e) =>
                setForm({ ...form, teacherId: e.target.value || "" })
              }
            >
              <option value="">-- لم يحدد بعد --</option>
              {filteredTeachers
                .filter((t) => t.isActive)
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
            </select>
            {filteredTeachers.length === 0 && form.packageId && (
              <p className="text-[11px] text-amber-500 mt-1">
                لا يوجد مدرسين لهذه المادة. أضف مدرساً مع سعر للمادة أولاً.
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">
                المبلغ المدفوع (ج.م)
              </label>
              <input
                type="number"
                min={0}
                className={INPUT_CLS}
                value={form.amountPaid}
                onChange={(e) =>
                  setForm({ ...form, amountPaid: Number(e.target.value) })
                }
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">
                حالة السداد
              </label>
              <select
                className={INPUT_CLS}
                value={form.paymentStatus}
                onChange={(e) =>
                  setForm({ ...form, paymentStatus: e.target.value })
                }
              >
                <option value="PENDING">معلق</option>
                <option value="COMPLETED">مدفوع</option>
              </select>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">
              تاريخ انتهاء الباقة
            </label>
            <DateInput
              className={INPUT_CLS}
              value={form.expiresAt?.split("T")[0] || ""}
              onChange={(e) =>
                setForm({ ...form, expiresAt: e.target.value || "" })
              }
            />
          </div>
        </div>
        <div className="flex justify-end gap-2.5 pt-3 border-t border-border/80">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs rounded-lg bg-muted text-foreground hover:bg-muted/80"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={() =>
              onSave({ ...form, teacherId: form.teacherId || null })
            }
            disabled={!form.studentId || !form.packageId}
            className="px-4 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-50"
          >
            حفظ
          </button>
        </div>
      </div>
    </div>
  );
};
