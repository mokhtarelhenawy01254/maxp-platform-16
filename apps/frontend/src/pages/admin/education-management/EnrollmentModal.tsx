import React, { useState, useEffect } from "react";
import { X, Plus, AlertTriangle, Loader2 } from "lucide-react";
import type {
  EducationEnrollment,
  EducationStudent,
  EducationPackage,
  EducationTeacher,
  EducationSubject,
} from "./types";
import { MODAL_CLS, INPUT_CLS } from "./types";
import { DateInput } from "../../../components/ui/DateInput";
import { api, getAuthHeaders } from "./api";

export interface EnrollmentModalProps {
  enrollment?: Partial<EducationEnrollment> | null;
  students: EducationStudent[];
  packages: EducationPackage[];
  teachers: EducationTeacher[];
  subjects: EducationSubject[];
  onClose: () => void;
  onSave: (d: Partial<EducationEnrollment>) => Promise<void>;
  onAddNewStudent?: (d: Partial<EducationStudent>) => Promise<EducationStudent | null>;
}

export const EnrollmentModal: React.FC<EnrollmentModalProps> = ({
  enrollment,
  students,
  packages,
  teachers,
  onClose,
  onSave,
  onAddNewStudent,
}) => {
  const [form, setForm] = useState({
    studentId: "",
    packageId: "",
    teacherId: "",
    amountPaid: 0,
    expiresAt: "",
    ...enrollment,
    paymentStatus:
      enrollment?.paymentStatus === "PAID"
        ? "COMPLETED"
        : enrollment?.paymentStatus || "PENDING",
  });

  const [localStudents, setLocalStudents] = useState<EducationStudent[]>(students);
  useEffect(() => {
    setLocalStudents(students);
  }, [students]);

  const [isCreatingStudent, setIsCreatingStudent] = useState(false);
  const [newStudentForm, setNewStudentForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    guardianName: "",
  });
  const [savingStudent, setSavingStudent] = useState(false);
  const [studentError, setStudentError] = useState<string | null>(null);

  const handleQuickCreateStudent = async () => {
    if (!newStudentForm.firstName.trim() || savingStudent) return;
    setSavingStudent(true);
    setStudentError(null);
    try {
      let created: EducationStudent | null = null;
      if (onAddNewStudent) {
        created = await onAddNewStudent({
          firstName: newStudentForm.firstName.trim(),
          lastName: newStudentForm.lastName.trim(),
          phone: newStudentForm.phone.trim() || undefined,
          notes: newStudentForm.guardianName.trim()
            ? `ولي الأمر: ${newStudentForm.guardianName.trim()}`
            : undefined,
          ...((newStudentForm.guardianName.trim()
            ? { guardianName: newStudentForm.guardianName.trim() }
            : {}) as any),
        });
      } else {
        const res = await fetch(api("students"), {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({
            firstName: newStudentForm.firstName.trim(),
            lastName: newStudentForm.lastName.trim(),
            phone: newStudentForm.phone.trim() || undefined,
            guardianName: newStudentForm.guardianName.trim() || undefined,
          }),
        });
        const d = await res.json();
        if (d.success && d.data) {
          created = d.data;
        } else {
          setStudentError(d.error || "فشل إنشاء الطالب");
          return;
        }
      }

      if (created) {
        setLocalStudents((prev) => [created!, ...prev]);
        setForm((prev) => ({ ...prev, studentId: created!.id }));
        setIsCreatingStudent(false);
        setNewStudentForm({
          firstName: "",
          lastName: "",
          phone: "",
          guardianName: "",
        });
      }
    } catch (e: any) {
      setStudentError(e.message || "حدث خطأ أثناء إضافة الطالب");
    } finally {
      setSavingStudent(false);
    }
  };

  const selectedPackage = packages.find((p) => p.id === form.packageId);
  const filteredTeachers = selectedPackage
    ? teachers.filter((t) =>
        t.subjectRates?.some(
          (sr) => sr.subjectId === selectedPackage.subjectId
        )
      )
    : teachers;

  const activeStudents = localStudents.filter((s) => s.isActive);

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
          {/* Student selection / creation */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-foreground">
                الطالب *
              </label>
              {!enrollment?.id && !isCreatingStudent && (
                <button
                  type="button"
                  onClick={() => setIsCreatingStudent(true)}
                  className="text-[11px] text-primary hover:underline font-semibold inline-flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  + إضافة طالب جديد
                </button>
              )}
            </div>

            {isCreatingStudent ? (
              <div className="p-3 bg-muted/40 border border-primary/30 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between border-b border-border/60 pb-1.5">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Plus className="w-3.5 h-3.5 text-primary" />
                    إضافة طالب جديد وتحديده فوراً
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreatingStudent(false);
                      setStudentError(null);
                    }}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    إلغاء
                  </button>
                </div>
                {studentError && (
                  <p className="text-[11px] text-red-500 font-medium">{studentError}</p>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] text-muted-foreground">الاسم الأول *</label>
                    <input
                      className={INPUT_CLS}
                      placeholder="مثال: يوسف"
                      value={newStudentForm.firstName}
                      onChange={(e) =>
                        setNewStudentForm({ ...newStudentForm, firstName: e.target.value })
                      }
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-muted-foreground">اسم العائلة / الأخير</label>
                    <input
                      className={INPUT_CLS}
                      placeholder="مثال: محمد"
                      value={newStudentForm.lastName}
                      onChange={(e) =>
                        setNewStudentForm({ ...newStudentForm, lastName: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] text-muted-foreground">هاتف الطالب</label>
                    <input
                      className={INPUT_CLS}
                      placeholder="01xxxxxxxxx"
                      value={newStudentForm.phone}
                      onChange={(e) =>
                        setNewStudentForm({ ...newStudentForm, phone: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-muted-foreground">اسم ولي الأمر (اختياري)</label>
                    <input
                      className={INPUT_CLS}
                      placeholder="اسم ولي الأمر"
                      value={newStudentForm.guardianName}
                      onChange={(e) =>
                        setNewStudentForm({ ...newStudentForm, guardianName: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreatingStudent(false);
                      setStudentError(null);
                    }}
                    className="px-2.5 py-1 text-xs rounded-md bg-muted text-muted-foreground hover:bg-muted/80"
                  >
                    رجوع
                  </button>
                  <button
                    type="button"
                    disabled={!newStudentForm.firstName.trim() || savingStudent}
                    onClick={handleQuickCreateStudent}
                    className="px-3 py-1 bg-primary text-primary-foreground text-xs font-semibold rounded-md hover:bg-primary/90 disabled:opacity-50 inline-flex items-center gap-1.5"
                  >
                    {savingStudent && <Loader2 className="w-3 h-3 animate-spin" />}
                    حفظ واختيار الطالب
                  </button>
                </div>
              </div>
            ) : (
              <>
                <select
                  className={INPUT_CLS}
                  value={form.studentId}
                  onChange={(e) =>
                    setForm({ ...form, studentId: e.target.value })
                  }
                  disabled={!!enrollment?.id}
                >
                  <option value="">
                    {activeStudents.length === 0 ? "-- لا يوجد طلاب مسجلين --" : "اختر الطالب"}
                  </option>
                  {activeStudents.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.code ? `[#${s.code}] ` : ""}{s.firstName} {s.lastName || ""} {s.phone ? `- ${s.phone}` : ""}
                    </option>
                  ))}
                </select>

                {activeStudents.length === 0 && !enrollment?.id && (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs space-y-2">
                    <div className="flex items-center gap-1.5 font-semibold text-amber-600 dark:text-amber-400">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>لا يوجد أي طلاب مسجلين في النظام بعد.</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      لتسجيل باقة دراسية، يجب إضافة الطالب أولاً. يمكنك إضافته الآن مباشرة دون مغادرة هذه الشاشة:
                    </p>
                    <button
                      type="button"
                      onClick={() => setIsCreatingStudent(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-md hover:bg-primary/90 shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      + إضافة طالب جديد الآن
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Package Selection */}
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
                    {p.name} - {p.subject?.name} ({p.hoursCount}س - {p.price} ج.م)
                  </option>
                ))}
            </select>
          </div>

          {/* Teacher Selection */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">
              المهندس المعين{" "}
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
                لا يوجد مهندسين لهذه المادة. أضف مهندساً مع سعر للمادة أولاً.
              </p>
            )}
          </div>

          {/* Amount & Status */}
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

          {/* Expiration date */}
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

        {/* Modal Footer */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-3 border-t border-border/80">
          <div className="text-[11px] text-amber-500 font-medium">
            {!form.studentId && !form.packageId
              ? "* يرجى اختيار الطالب والباقة لتفعيل الحفظ"
              : !form.studentId
              ? "* يرجى اختيار الطالب لتفعيل الحفظ"
              : !form.packageId
              ? "* يرجى اختيار الباقة لتفعيل الحفظ"
              : null}
          </div>
          <div className="flex justify-end gap-2.5">
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
                onSave({
                  ...form,
                  teacherId: form.teacherId || null,
                  expiresAt: form.expiresAt ? form.expiresAt : null,
                })
              }
              disabled={!form.studentId || !form.packageId}
              className="px-4 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-opacity"
            >
              حفظ
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
