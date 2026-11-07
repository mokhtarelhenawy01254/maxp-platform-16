import React from "react";
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
  enrollmentModal: Partial<EducationEnrollment> | null | undefined;
  setEnrollmentModal: (
    e: Partial<EducationEnrollment> | null | undefined
  ) => void;
  handleSaveEnrollment: (d: Partial<EducationEnrollment>) => Promise<void>;
  handleDeleteEnrollment: (id: string) => Promise<void>;
}

export const EducationEnrollmentsTab: React.FC<EducationEnrollmentsTabProps> = ({
  enrollments,
  students,
  packages,
  teachers,
  subjects,
  enrollmentModal,
  setEnrollmentModal,
  handleSaveEnrollment,
  handleDeleteEnrollment,
}) => {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <h2 className="text-base font-bold text-foreground">
          إدارة التسجيلات والاشتراكات
        </h2>
        <button
          type="button"
          onClick={() => setEnrollmentModal({})}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:bg-primary/90 shadow-xs"
        >
          <Plus className="w-3.5 h-3.5" />
          إضافة تسجيل جديد
        </button>
      </div>

      <div className="bg-card border border-border/80 rounded-xl overflow-hidden shadow-xs">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border/80 bg-muted/40 text-muted-foreground text-xs">
              {[
                "الطالب",
                "الباقة",
                "المادة",
                "المدرس",
                "الساعات المتبقية",
                "المدفوع",
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
            {enrollments.map((e) => {
              const remaining = e.remainingHours ?? 0;
              const total = e.totalHours ?? 0;
              const pct =
                total > 0 ? Math.round((remaining / total) * 100) : 0;
              return (
                <tr key={e.id} className="hover:bg-muted/30 transition-colors">
                  <td className={CELL_CLS + " font-medium text-foreground"}>
                    {e.student
                      ? `${e.student.firstName} ${e.student.lastName || ""}`
                      : "—"}
                  </td>
                  <td className={CELL_CLS + " text-muted-foreground"}>
                    {e.package?.name || "—"}
                  </td>
                  <td className={CELL_CLS + " text-muted-foreground"}>
                    {e.package?.subject?.name || "—"}
                  </td>
                  <td className={CELL_CLS}>
                    {e.teacher?.name || (
                      <span className="text-amber-500 text-[11px] font-medium">
                        لم يحدد بعد
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
                    {e.amountPaid || 0} ج.م
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
                        ? "مدفوع"
                        : "معلق"}
                    </span>
                  </td>
                  <td className={CELL_CLS}>
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => setEnrollmentModal(e)}
                        className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
                        title="تعديل"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      {!e.teacher?.id && (
                        <span title="مطلوب تعيين مدرس">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDeleteEnrollment(e.id)}
                        className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-500/10 rounded-md transition-colors"
                        title="حذف"
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
        {enrollments.length === 0 && (
          <p className="text-center py-12 text-xs text-muted-foreground">
            لا توجد تسجيلات مسجلة
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
          onClose={() => setEnrollmentModal(undefined)}
          onSave={handleSaveEnrollment}
        />
      )}
    </div>
  );
};
