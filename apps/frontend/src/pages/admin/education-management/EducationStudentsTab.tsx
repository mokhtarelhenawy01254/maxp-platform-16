import React from "react";
import { Link } from "react-router-dom";
import { Search, Plus, Phone, Eye, Pencil, Trash2 } from "lucide-react";
import type { EducationStudent, Customer } from "./types";
import { StudentModal } from "./StudentModal";

export interface EducationStudentsTabProps {
  students: EducationStudent[];
  customers: Customer[];
  customerResults: Customer[];
  studentSearch: string;
  setStudentSearch: (q: string) => void;
  studentModal: Partial<EducationStudent> | null | undefined;
  setStudentModal: (s: Partial<EducationStudent> | null | undefined) => void;
  searchCustomers: (q: string) => Promise<void>;
  handleSaveStudent: (d: Partial<EducationStudent>) => Promise<void>;
  handleToggleStudent: (id: string, current: boolean) => Promise<void>;
  handleDeleteStudent: (id: string) => Promise<void>;
}

export const EducationStudentsTab: React.FC<EducationStudentsTabProps> = ({
  students,
  customers,
  customerResults,
  studentSearch,
  setStudentSearch,
  studentModal,
  setStudentModal,
  searchCustomers,
  handleSaveStudent,
  handleToggleStudent,
  handleDeleteStudent,
}) => {
  const filtered = students.filter(
    (s) =>
      !studentSearch ||
      s.firstName.includes(studentSearch) ||
      s.lastName?.includes(studentSearch) ||
      s.phone?.includes(studentSearch)
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h2 className="text-base font-bold text-foreground">إدارة الطلاب</h2>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 absolute right-3 top-2.5 text-muted-foreground" />
            <input
              className="bg-background border border-input rounded-lg pr-9 pl-3 py-1.5 text-xs text-foreground w-full focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="بحث عن طالب..."
              value={studentSearch}
              onChange={(e) => setStudentSearch(e.target.value)}
            />
          </div>
          <button
            type="button"
            onClick={() => setStudentModal({})}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:bg-primary/90 shadow-xs shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            إضافة طالب
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3.5 sm:gap-4">
        {filtered.map((s) => (
          <div
            key={s.id}
            className={`bg-card border border-border/80 rounded-xl p-3.5 sm:p-4 shadow-xs space-y-3 transition-all hover:border-primary/40 ${
              !s.isActive ? "opacity-60 bg-muted/20" : ""
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold text-sm text-foreground">
                  {s.firstName} {s.lastName || ""}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {s.grade || "الصف غير محدد"}
                </p>
              </div>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${
                  s.isActive
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                    : "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
                }`}
              >
                {s.isActive ? "نشط" : "معطل"}
              </span>
            </div>

            <div className="text-xs text-muted-foreground flex items-center gap-1.5 font-mono">
              <Phone className="w-3 h-3 text-primary shrink-0" />
              {s.phone || "—"}
            </div>

            <div className="text-xs text-muted-foreground">
              ولي الأمر:{" "}
              {s.customer
                ? `${s.customer.firstName} ${s.customer.lastName || ""}`
                : "—"}
            </div>

            <div className="flex items-center gap-2 pt-3 border-t border-border/60">
              <Link
                to={`/admin/education/student/${s.id}`}
                className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-1.5 bg-muted/60 text-foreground hover:bg-muted text-xs rounded-lg transition-colors"
              >
                <Eye className="w-3.5 h-3.5" />
                عرض
              </Link>
              <button
                type="button"
                onClick={() => setStudentModal(s)}
                className="px-2.5 py-1.5 text-xs text-foreground bg-muted/60 hover:bg-muted rounded-lg transition-colors"
                title="تعديل"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => handleToggleStudent(s.id, s.isActive)}
                className={`px-2.5 py-1.5 text-xs rounded-lg transition-colors ${
                  s.isActive
                    ? "bg-red-500/10 text-red-600 hover:bg-red-500/20"
                    : "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20"
                }`}
              >
                {s.isActive ? "تعطيل" : "تفعيل"}
              </button>
              <button
                type="button"
                onClick={() => handleDeleteStudent(s.id)}
                className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                title="حذف"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="col-span-full text-center py-12 text-xs text-muted-foreground">
            لا يوجد طلاب مسجلين
          </p>
        )}
      </div>
      {studentModal !== undefined && (
        <StudentModal
          student={studentModal}
          customers={customers}
          customerResults={customerResults}
          onCustomerSearch={searchCustomers}
          onClose={() => setStudentModal(undefined)}
          onSave={handleSaveStudent}
        />
      )}
    </div>
  );
};
