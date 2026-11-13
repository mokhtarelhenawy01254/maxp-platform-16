import React from "react";
import { useTranslation } from "react-i18next";
import { Search, Plus, Pencil, Check, Trash2 } from "lucide-react";
import type { EducationSubject } from "./types";
import { CELL_CLS } from "./types";
import { SubjectModal } from "./SubjectModal";

export interface EducationSubjectsTabProps {
  subjects: EducationSubject[];
  subjectSearch: string;
  setSubjectSearch: (q: string) => void;
  subjectModal: Partial<EducationSubject> | null | undefined;
  setSubjectModal: (s: Partial<EducationSubject> | null | undefined) => void;
  handleSaveSubject: (d: Partial<EducationSubject>) => Promise<void>;
  handleToggleSubject: (id: string, current: boolean) => Promise<void>;
  handleDeleteSubject: (id: string) => Promise<void>;
}

export const EducationSubjectsTab: React.FC<EducationSubjectsTabProps> = ({
  subjects,
  subjectSearch,
  setSubjectSearch,
  subjectModal,
  setSubjectModal,
  handleSaveSubject,
  handleToggleSubject,
  handleDeleteSubject,
}) => {
  const { t, i18n } = useTranslation();
  const isEn = i18n.language === "en";

  const q = subjectSearch.toLowerCase().trim();
  const filtered = subjects.filter(
    (s) => !q || (s.name || "").toLowerCase().includes(q)
  );

  return (
    <div className="space-y-4" dir={isEn ? "ltr" : "rtl"}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h2 className="text-base font-bold text-foreground">
          {t("education.subjects.title", isEn ? "Academic Subjects Management" : "إدارة المواد الأكاديمية")}
        </h2>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className={`w-3.5 h-3.5 absolute ${isEn ? "left-3" : "right-3"} top-2.5 text-muted-foreground`} />
            <input
              className={`bg-background border border-input rounded-lg ${isEn ? "pl-9 pr-3" : "pr-9 pl-3"} py-1.5 text-xs text-foreground w-full focus:outline-none focus:ring-1 focus:ring-primary`}
              placeholder={t("education.subjects.search", isEn ? "Search subjects..." : "بحث في المواد...")}
              value={subjectSearch}
              onChange={(e) => setSubjectSearch(e.target.value)}
            />
          </div>
          <button
            type="button"
            onClick={() => setSubjectModal({})}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:bg-primary/90 shadow-xs shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            {t("education.subjects.addSubject", isEn ? "Add Subject" : "إضافة مادة")}
          </button>
        </div>
      </div>

      {/* Mobile Cards View */}
      <div className="grid grid-cols-1 gap-2.5 md:hidden">
        {filtered.map((s) => (
          <div
            key={s.id}
            className={`bg-card border border-border/80 rounded-xl p-3.5 shadow-xs space-y-2.5 ${
              !s.isActive ? "opacity-60 bg-muted/20" : ""
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="font-semibold text-sm text-foreground">
                {s.name}
              </div>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border shrink-0 ${
                  s.isActive
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                    : "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
                }`}
              >
                {s.isActive
                  ? t("education.subjects.active", isEn ? "Active" : "نشط")
                  : t("education.subjects.inactive", isEn ? "Inactive" : "معطل")}
              </span>
            </div>
            {s.description && (
              <p className="text-xs text-muted-foreground line-clamp-2">
                {s.description}
              </p>
            )}
            <div className="flex items-center justify-between text-xs pt-1 border-t border-border/40">
              <span className="text-muted-foreground">{t("education.subjects.price", isEn ? "Subject Price:" : "سعر المادة:")}</span>
              <span className="tabular-nums font-semibold text-emerald-600 dark:text-emerald-400">
                {typeof s.price === "number" && s.price > 0
                  ? t("education.subjects.priceWithCurrency", { price: s.price.toLocaleString(), defaultValue: isEn ? `${s.price.toLocaleString()} EGP` : `${s.price.toLocaleString()} ج.م` })
                  : (isEn ? "0 EGP" : "0 ج.م")}
              </span>
            </div>
            <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-border/60">
              <button
                type="button"
                onClick={() => setSubjectModal(s)}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors border border-border/60"
              >
                <Pencil className="w-3.5 h-3.5" />
                {t("education.actions.edit", isEn ? "Edit" : "تعديل")}
              </button>
              <button
                type="button"
                onClick={() => handleToggleSubject(s.id, s.isActive)}
                className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-md transition-colors border ${
                  s.isActive
                    ? "text-red-600 dark:text-red-400 border-red-500/20 hover:bg-red-500/10"
                    : "text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/10"
                }`}
              >
                <Check className="w-3.5 h-3.5" />
                {s.isActive
                  ? t("education.actions.deactivate", isEn ? "Deactivate" : "تعطيل")
                  : t("education.actions.activate", isEn ? "Activate" : "تفعيل")}
              </button>
              <button
                type="button"
                onClick={() => handleDeleteSubject(s.id)}
                className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-500/10 rounded-md transition-colors"
                aria-label={t("education.actions.delete", isEn ? "Delete" : "حذف")} title={t("education.actions.delete", isEn ? "Delete" : "حذف")}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="bg-card border border-border/80 rounded-xl p-8 text-center text-xs text-muted-foreground">
            {t("education.subjects.empty", isEn ? "No registered subjects" : "لا توجد مواد مسجلة")}
          </div>
        )}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block bg-card border border-border/80 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/80 bg-muted/40 text-muted-foreground text-xs">
                {[
                  t("education.subjects.name", isEn ? "Name" : "الاسم"),
                  t("education.subjects.description", isEn ? "Description" : "الوصف"),
                  t("education.subjects.price", isEn ? "Price / Fee" : "السعر / الرسوم"),
                  t("education.subjects.status", isEn ? "Status" : "الحالة"),
                  "",
                ].map((h, i) => (
                  <th key={i} className={`${isEn ? "text-left" : "text-right"} py-3 px-4 font-semibold`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filtered.map((s) => (
                <tr key={s.id} className="hover:bg-muted/30 transition-colors">
                  <td className={CELL_CLS + " font-medium text-foreground"}>
                    {s.name}
                  </td>
                  <td className={CELL_CLS + " text-muted-foreground"}>
                    {s.description || "—"}
                  </td>
                  <td className={CELL_CLS + " font-mono tabular-nums text-foreground"}>
                    {typeof s.price === "number" && s.price > 0 ? (
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                        {t("education.subjects.priceWithCurrency", { price: s.price.toLocaleString(), defaultValue: isEn ? `${s.price.toLocaleString()} EGP` : `${s.price.toLocaleString()} ج.م` })}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">{isEn ? "0 EGP" : "0 ج.م"}</span>
                    )}
                  </td>
                  <td className={CELL_CLS}>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${
                        s.isActive
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                          : "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
                      }`}
                    >
                      {s.isActive
                        ? t("education.subjects.active", isEn ? "Active" : "نشط")
                        : t("education.subjects.inactive", isEn ? "Inactive" : "معطل")}
                    </span>
                  </td>
                  <td className={CELL_CLS}>
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => setSubjectModal(s)}
                        className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
                        aria-label={t("education.actions.edit", isEn ? "Edit" : "تعديل")} title={t("education.actions.edit", isEn ? "Edit" : "تعديل")}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleSubject(s.id, s.isActive)}
                        className={`p-1.5 rounded-md transition-colors ${
                          s.isActive
                            ? "text-red-600 dark:text-red-400 hover:bg-red-500/10"
                            : "text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
                        }`}
                        aria-label={s.isActive ? t("education.actions.deactivate", isEn ? "Deactivate" : "تعطيل") : t("education.actions.activate", isEn ? "Activate" : "تفعيل")} title={s.isActive ? t("education.actions.deactivate", isEn ? "Deactivate" : "تعطيل") : t("education.actions.activate", isEn ? "Activate" : "تفعيل")}
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteSubject(s.id)}
                        className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-500/10 rounded-md transition-colors"
                        aria-label={t("education.actions.delete", isEn ? "Delete" : "حذف")} title={t("education.actions.delete", isEn ? "Delete" : "حذف")}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <p className="text-center py-12 text-xs text-muted-foreground">
            {t("education.subjects.empty", isEn ? "No registered subjects" : "لا توجد مواد مسجلة")}
          </p>
        )}
      </div>
      {subjectModal !== undefined && (
        <SubjectModal
          subject={subjectModal}
          onClose={() => setSubjectModal(undefined)}
          onSave={handleSaveSubject}
        />
      )}
    </div>
  );
};
