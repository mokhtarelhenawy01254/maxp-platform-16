import React from "react";
import { useTranslation } from "react-i18next";
import { Plus, Pencil, Trash2, AlertTriangle } from "lucide-react";
import type {
  EducationEnrollment,
  EducationStudent,
  EducationPackage,
  EducationTeacher,
  EducationSubject,
} from "./types";
import { CELL_CLS } from "./types";
import { EnrollmentModal } from "./EnrollmentModal";

export interface EducationEnrollmentsTabProps {
  enrollments: EducationEnrollment[];
  students: EducationStudent[];
  packages: EducationPackage[];
  teachers: EducationTeacher[];
  subjects: EducationSubject[];
  enableSubjects?: boolean;
  enrollmentModal: Partial<EducationEnrollment> | null | undefined;
  setEnrollmentModal: (
    e: Partial<EducationEnrollment> | null | undefined
  ) => void;
  handleSaveEnrollment: (d: Partial<EducationEnrollment>) => Promise<void>;
  handleDeleteEnrollment: (id: string) => Promise<void>;
  handleSaveStudent?: (d: Partial<EducationStudent>) => Promise<EducationStudent | null>;
}

export const EducationEnrollmentsTab: React.FC<EducationEnrollmentsTabProps> = ({
  enrollments,
  students,
  packages,
  teachers,
  subjects,
  enableSubjects = true,
  enrollmentModal,
  setEnrollmentModal,
  handleSaveEnrollment,
  handleDeleteEnrollment,
  handleSaveStudent,
}) => {
  const { t, i18n } = useTranslation();
  const isEn = i18n.language === "en";

  return (
    <div className="space-y-4" dir={isEn ? "ltr" : "rtl"}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h2 className="text-base font-bold text-foreground">
          {t("education.enrollments.title", isEn ? "Enrollments & Subscriptions Management" : "إدارة التسجيلات والاشتراكات")}
        </h2>
        <button
          type="button"
          onClick={() => setEnrollmentModal({})}
          className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:bg-primary/90 shadow-xs shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          {t("education.enrollments.addEnrollment", isEn ? "Add New Enrollment" : "إضافة تسجيل جديد")}
        </button>
      </div>

      {/* Mobile Cards View */}
      <div className="grid grid-cols-1 gap-3 md:hidden">
        {enrollments.map((e) => {
          const remaining = e.remainingHours ?? 0;
          const total = e.totalHours ?? 0;
          const pct = total > 0 ? Math.round((remaining / total) * 100) : 0;
          return (
            <div
              key={e.id}
              className={`bg-card border border-border/80 rounded-xl p-3.5 shadow-xs space-y-3 ${
                e.isActive === false ? "opacity-60 bg-muted/20" : ""
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-sm text-foreground truncate flex items-center gap-1.5">
                    <span>
                      {e.student
                        ? `${e.student.firstName} ${e.student.lastName || ""}`
                        : "—"}
                    </span>
                    {e.student?.code && (
                      <span className="font-mono text-[10px] text-primary bg-primary/10 px-1 py-0.2 rounded border border-primary/20 shrink-0" dir="ltr">
                        #{e.student.code}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {e.package?.name} {enableSubjects && e.package?.subject?.name ? `• ${e.package.subject.name}` : ""}
                  </div>
                </div>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border shrink-0 ${
                    e.isActive !== false
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                      : "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
                  }`}
                >
                  {e.isActive !== false
                    ? t("education.statuses.ACTIVE", isEn ? "Active" : "نشط")
                    : t("education.statuses.INACTIVE", isEn ? "Inactive" : "معطل")}
                </span>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-1 border-t border-border/40">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <span>{t("education.enrollments.teacher", isEn ? "Instructor:" : "المهندس:")}</span>
                  {e.teacher?.name ? (
                    <span className="font-medium text-foreground">{e.teacher.name}</span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-amber-500 font-medium">
                      <AlertTriangle className="w-3 h-3" />
                      {t("education.enrollments.notAssigned", isEn ? "Not Assigned" : "لم يحدد بعد")}
                    </span>
                  )}
                </div>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${
                    ["COMPLETED", "PAID"].includes(e.paymentStatus)
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                      : e.paymentStatus === "PENDING"
                      ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                      : "bg-muted/60 text-muted-foreground border-border"
                  }`}
                >
                  {["COMPLETED", "PAID"].includes(e.paymentStatus)
                    ? t("education.statuses.PAID", isEn ? "Paid" : "مدفوع")
                    : t("education.statuses.PENDING", isEn ? "Pending" : "معلق")}
                  {" "}({e.amountPaid || 0} {isEn ? "EGP" : "ج.م"})
                </span>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-muted-foreground">{t("education.enrollments.remainingHours", isEn ? "Remaining Hours:" : "الساعات المتبقية:")}</span>
                  <span
                    className={`font-semibold ${
                      remaining < total * 0.2
                        ? "text-red-600 dark:text-red-400"
                        : remaining < total * 0.5
                        ? "text-amber-600 dark:text-amber-400"
                        : "text-emerald-600 dark:text-emerald-400"
                    }`}
                  >
                    {t("education.enrollments.remainingProgress", {
                      remaining,
                      total,
                      percent: pct,
                      defaultValue: isEn ? `${remaining} of ${total} hours (${pct}%)` : `${remaining} من ${total} ساعة (${pct}%)`,
                    })}
                  </span>
                </div>
                <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      pct <= 20
                        ? "bg-red-500"
                        : pct <= 50
                        ? "bg-amber-500"
                        : "bg-emerald-500"
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-border/60">
                <button
                  type="button"
                  onClick={() => setEnrollmentModal(e)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors border border-border/60"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  {t("education.actions.edit", isEn ? "Edit" : "تعديل")}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleSaveEnrollment({
                      id: e.id,
                      isActive: e.isActive === false,
                    })
                  }
                  className={`px-2.5 py-1 text-xs rounded-lg transition-colors ${
                    e.isActive !== false
                      ? "bg-red-500/10 text-red-600 hover:bg-red-500/20"
                      : "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20"
                  }`}
                >
                  {e.isActive !== false
                    ? t("education.actions.deactivate", isEn ? "Deactivate" : "تعطيل")
                    : t("education.actions.activate", isEn ? "Activate" : "تفعيل")}
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteEnrollment(e.id)}
                  className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-500/10 rounded-md transition-colors"
                  title={t("education.actions.delete", isEn ? "Delete" : "حذف")}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
        {enrollments.length === 0 && (
          <div className="bg-card border border-border/80 rounded-xl p-8 text-center text-xs text-muted-foreground">
            {t("education.enrollments.empty", isEn ? "No registered enrollments" : "لا توجد تسجيلات مسجلة")}
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
                  t("education.enrollments.package", isEn ? "Package" : "الباقة"),
                  ...(enableSubjects ? [t("education.enrollments.subject", isEn ? "Subject" : "المادة")] : []),
                  t("education.enrollments.teacher", isEn ? "Instructor" : "المهندس"),
                  t("education.enrollments.remainingHours", isEn ? "Remaining Hours" : "الساعات المتبقية"),
                  t("education.enrollments.paidAmount", isEn ? "Paid Amount" : "المدفوع"),
                  t("education.enrollments.paymentStatus", isEn ? "Status" : "الحالة"),
                  t("education.enrollments.activation", isEn ? "Activation" : "التفعيل"),
                  "",
                ].map((h, i) => (
                  <th key={i} className={`${isEn ? "text-left" : "text-right"} py-3 px-4 font-semibold`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {enrollments.map((e) => {
                const remaining = e.remainingHours ?? 0;
                const total = e.totalHours ?? 0;
                const pct =
                  total > 0 ? Math.round((remaining / total) * 100) : 0;
                return (
                  <tr key={e.id} className={`hover:bg-muted/30 transition-colors ${e.isActive === false ? "opacity-60 bg-muted/20" : ""}`}>
                    <td className={CELL_CLS + " font-medium text-foreground"}>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span>
                          {e.student
                            ? `${e.student.firstName} ${e.student.lastName || ""}`
                            : "—"}
                        </span>
                        {e.student?.code && (
                          <span className="font-mono text-[10px] text-primary bg-primary/10 px-1 py-0.2 rounded border border-primary/20" dir="ltr">
                            #{e.student.code}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className={CELL_CLS + " text-muted-foreground"}>
                      {e.package?.name || "—"}
                    </td>
                    {enableSubjects && (
                      <td className={CELL_CLS + " text-muted-foreground"}>
                        {e.package?.subject?.name || "—"}
                      </td>
                    )}
                    <td className={CELL_CLS}>
                      {e.teacher?.name || (
                        <span className="text-amber-500 text-[11px] font-medium">
                          {t("education.enrollments.notAssigned", isEn ? "Not Assigned" : "لم يحدد بعد")}
                        </span>
                      )}
                    </td>
                    <td className={CELL_CLS}>
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-mono tabular-nums font-medium ${
                            remaining < total * 0.2
                              ? "text-red-600 dark:text-red-400"
                              : remaining < total * 0.5
                              ? "text-amber-600 dark:text-amber-400"
                              : "text-emerald-600 dark:text-emerald-400"
                          }`}
                        >
                          {remaining}/{total}
                        </span>
                        <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              pct <= 20
                                ? "bg-red-500"
                                : pct <= 50
                                ? "bg-amber-500"
                                : "bg-emerald-500"
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td
                      className={
                        CELL_CLS + " font-mono tabular-nums text-foreground"
                      }
                    >
                      {e.amountPaid || 0} {isEn ? "EGP" : "ج.م"}
                    </td>
                    <td className={CELL_CLS}>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${
                          ["COMPLETED", "PAID"].includes(e.paymentStatus)
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                            : e.paymentStatus === "PENDING"
                            ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                            : "bg-muted/60 text-muted-foreground border-border"
                        }`}
                      >
                        {["COMPLETED", "PAID"].includes(e.paymentStatus)
                          ? t("education.statuses.PAID", isEn ? "Paid" : "مدفوع")
                          : t("education.statuses.PENDING", isEn ? "Pending" : "معلق")}
                      </span>
                    </td>
                    <td className={CELL_CLS}>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${
                          e.isActive !== false
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                            : "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
                        }`}
                      >
                        {e.isActive !== false
                          ? t("education.statuses.ACTIVE", isEn ? "Active" : "نشط")
                          : t("education.statuses.INACTIVE", isEn ? "Inactive" : "معطل")}
                      </span>
                    </td>
                    <td className={CELL_CLS}>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setEnrollmentModal(e)}
                          className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
                          title={t("education.actions.edit", isEn ? "Edit" : "تعديل")}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        {!e.teacher?.id && (
                          <span title={isEn ? "Instructor assignment needed" : "مطلوب تعيين مهندس"}>
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() =>
                            handleSaveEnrollment({
                              id: e.id,
                              isActive: e.isActive === false,
                            })
                          }
                          className={`px-2.5 py-1 text-xs rounded-lg transition-colors ${
                            e.isActive !== false
                              ? "bg-red-500/10 text-red-600 hover:bg-red-500/20"
                              : "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20"
                          }`}
                        >
                          {e.isActive !== false
                            ? t("education.actions.deactivate", isEn ? "Deactivate" : "تعطيل")
                            : t("education.actions.activate", isEn ? "Activate" : "تفعيل")}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteEnrollment(e.id)}
                          className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-500/10 rounded-md transition-colors"
                          title={t("education.actions.delete", isEn ? "Delete" : "حذف")}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {enrollments.length === 0 && (
          <p className="text-center py-12 text-xs text-muted-foreground">
            {t("education.enrollments.empty", isEn ? "No registered enrollments" : "لا توجد تسجيلات مسجلة")}
          </p>
        )}
      </div>
      {enrollmentModal !== undefined && (
        <EnrollmentModal
          enrollment={enrollmentModal}
          students={students}
          packages={packages}
          teachers={teachers}
          subjects={subjects}
          enableSubjects={enableSubjects}
          onClose={() => setEnrollmentModal(undefined)}
          onSave={handleSaveEnrollment}
          onAddNewStudent={handleSaveStudent}
        />
      )}
    </div>
  );
};
