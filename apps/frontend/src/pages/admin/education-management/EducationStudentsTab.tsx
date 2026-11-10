import React from "react";
import { Link } from "react-router-dom";
import { Search, Plus, Phone, Eye, Pencil, Trash2, BookOpen, MapPin } from "lucide-react";
import type { EducationStudent, Customer, EducationSubject } from "./types";
import { StudentModal } from "./StudentModal";

export interface EducationStudentsTabProps {
  students: EducationStudent[];
  subjects: EducationSubject[];
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
  subjects,
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
  const q = studentSearch.toLowerCase().trim();
  const codeQ = q.startsWith("#") ? q.slice(1).trim() : q;
  const filtered = students.filter(
    (s) =>
      !q ||
      (s.code || "").toLowerCase().includes(codeQ) ||
      (s.firstName || "").toLowerCase().includes(q) ||
      (s.lastName || "").toLowerCase().includes(q) ||
      (s.phone || "").toLowerCase().includes(q) ||
      (s.phone2 || "").toLowerCase().includes(q) ||
      (s.address || "").toLowerCase().includes(q) ||
      (s.customer?.firstName || "").toLowerCase().includes(q) ||
      (s.customer?.lastName || "").toLowerCase().includes(q) ||
      (s.customer?.phone || "").toLowerCase().includes(q) ||
      (s.customer?.phone2 || "").toLowerCase().includes(q)
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
              placeholder="بحث عن طالب بالاسم، الكود، أو الهاتف..."
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
              <div className="space-y-0.5 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h3 className="font-semibold text-sm text-foreground truncate">
                    {s.firstName} {s.lastName || ""}
                  </h3>
                  {s.code && (
                    <span className="font-mono text-[10px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20 shrink-0" dir="ltr">
                      #{s.code}
                    </span>
                  )}
                </div>
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

            {/* Student Phones */}
            <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-1.5 font-mono">
              <Phone className="w-3 h-3 text-primary shrink-0" />
              <span>{s.phone || "—"}</span>
              {s.phone2 && (
                <span className="text-[10px] text-primary/90 font-sans bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20">
                  إضافي: {s.phone2}
                </span>
              )}
            </div>

            {/* Student Address */}
            {s.address && (
              <div className="text-xs text-muted-foreground flex items-center gap-1.5 truncate" title={s.address}>
                <MapPin className="w-3 h-3 text-primary shrink-0" />
                <span className="truncate">{s.address}</span>
              </div>
            )}

            {/* Guardian & Guardian Phones */}
            <div className="text-xs text-muted-foreground space-y-0.5">
              <div>
                ولي الأمر:{" "}
                <span className="text-foreground font-medium">
                  {s.customer
                    ? `${s.customer.firstName} ${s.customer.lastName || ""}`
                    : "—"}
                </span>
              </div>
              {s.customer?.phone && (
                <div className="text-[11px] font-mono text-muted-foreground/80 flex flex-wrap items-center gap-1">
                  <span>{s.customer.phone}</span>
                  {(s.customer as any)?.phone2 && (
                    <span className="text-primary font-normal">
                      | إضافي: {(s.customer as any).phone2}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Subjects Tags */}
            {(s as any).subjects &&
              Array.isArray((s as any).subjects) &&
              (s as any).subjects.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1 border-t border-border/40">
                  {(s as any).subjects.map((sub: any, idx: number) => {
                    const subName =
                      typeof sub === "string"
                        ? subjects.find((x) => x.id === sub)?.name || sub
                        : sub.name || sub.id;
                    return (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-primary/10 text-primary border border-primary/20"
                      >
                        <BookOpen className="w-2.5 h-2.5" />
                        {subName}
                      </span>
                    );
                  })}
                </div>
              )}

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
          key={studentModal?.id || "new"}
          student={studentModal}
          subjects={subjects}
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
