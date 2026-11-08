import React from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Search, Plus, Eye, Pencil, Trash2 } from "lucide-react";
import type { EducationTeacher, EducationSubject } from "./types";
import { TeacherModal } from "./TeacherModal";

export interface EducationTeachersTabProps {
  teachers: EducationTeacher[];
  subjects: EducationSubject[];
  teacherSearch: string;
  setTeacherSearch: (q: string) => void;
  teacherModal: Partial<EducationTeacher> | null | undefined;
  setTeacherModal: (t: Partial<EducationTeacher> | null | undefined) => void;
  handleSaveTeacher: (d: Partial<EducationTeacher>) => Promise<void>;
  handleToggleTeacher: (id: string, current: boolean) => Promise<void>;
  handleDeleteTeacher: (id: string) => Promise<void>;
}

export const EducationTeachersTab: React.FC<EducationTeachersTabProps> = ({
  teachers,
  subjects,
  teacherSearch,
  setTeacherSearch,
  teacherModal,
  setTeacherModal,
  handleSaveTeacher,
  handleToggleTeacher,
  handleDeleteTeacher,
}) => {
  const { i18n } = useTranslation();
  const isEn = i18n.language === "en";

  const filtered = teachers.filter(
    (t) =>
      !teacherSearch ||
      t.name.includes(teacherSearch) ||
      t.phone?.includes(teacherSearch)
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <h2 className="text-base font-bold text-foreground">
          {isEn ? "Manage Instructors & Educational Staff" : "إدارة المهندسين والكوادر التعليمية"}
        </h2>
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute right-3 top-2.5 text-muted-foreground" />
            <input
              className="bg-background border border-input rounded-lg pr-9 pl-3 py-1.5 text-xs text-foreground w-48 focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder={isEn ? "Search for instructor..." : "بحث عن مهندس..."}
              value={teacherSearch}
              onChange={(e) => setTeacherSearch(e.target.value)}
            />
          </div>
          <button
            type="button"
            onClick={() => setTeacherModal({})}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:bg-primary/90 shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            {isEn ? "Add Instructor" : "إضافة مهندس"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((t) => (
          <div
            key={t.id}
            className={`bg-card border border-border/80 rounded-xl p-4.5 shadow-xs space-y-3 transition-all hover:border-primary/40 ${
              !t.isActive ? "opacity-60 bg-muted/20" : ""
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold text-sm text-foreground">
                  {t.name}
                </h3>
                <p className="text-xs text-muted-foreground font-mono">
                  {t.phone || "—"}
                </p>
              </div>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${
                  t.isActive
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                    : "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
                }`}
              >
                {t.isActive ? "نشط" : "معطل"}
              </span>
            </div>

            <div className="flex flex-wrap gap-1">
              {t.subjectRates?.map((sr) => (
                <span
                  key={sr.id}
                  className="text-[11px] bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-md font-mono tabular-nums"
                >
                  {sr.subject.name}: {sr.hourlyRate} ج.م/س
                </span>
              ))}
              {(!t.subjectRates || t.subjectRates.length === 0) && (
                <span className="text-xs text-muted-foreground">
                  لا توجد أسعار محددة
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 pt-3 border-t border-border/60">
              <Link
                to={`/admin/education/teacher/${t.id}`}
                className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-1.5 bg-muted/60 text-foreground hover:bg-muted text-xs rounded-lg transition-colors"
              >
                <Eye className="w-3.5 h-3.5" />
                عرض
              </Link>
              <button
                type="button"
                onClick={() => setTeacherModal(t)}
                className="px-2.5 py-1.5 text-xs text-foreground bg-muted/60 hover:bg-muted rounded-lg transition-colors"
                title="تعديل"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => handleToggleTeacher(t.id, t.isActive)}
                className={`px-2.5 py-1.5 text-xs rounded-lg transition-colors ${
                  t.isActive
                    ? "bg-red-500/10 text-red-600 hover:bg-red-500/20"
                    : "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20"
                }`}
              >
                {t.isActive ? "تعطيل" : "تفعيل"}
              </button>
              <button
                type="button"
                onClick={() => handleDeleteTeacher(t.id)}
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
            {isEn ? "No registered instructors" : "لا يوجد مهندسين مسجلين"}
          </p>
        )}
      </div>
      {teacherModal !== undefined && (
        <TeacherModal
          teacher={teacherModal}
          subjects={subjects}
          onClose={() => setTeacherModal(undefined)}
          onSave={handleSaveTeacher}
        />
      )}
    </div>
  );
};
