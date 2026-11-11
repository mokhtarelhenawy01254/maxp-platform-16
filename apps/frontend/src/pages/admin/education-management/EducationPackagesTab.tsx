import React from "react";
import { useTranslation } from "react-i18next";
import { Plus, Pencil, Trash2 } from "lucide-react";
import type { EducationPackage, EducationSubject } from "./types";
import { PackageModal } from "./PackageModal";

export interface EducationPackagesTabProps {
  packages: EducationPackage[];
  subjects: EducationSubject[];
  enableSubjects?: boolean;
  packageSubjectFilter: string;
  setPackageSubjectFilter: (f: string) => void;
  packageModal: Partial<EducationPackage> | null | undefined;
  setPackageModal: (p: Partial<EducationPackage> | null | undefined) => void;
  handleSavePackage: (d: Partial<EducationPackage>) => Promise<void>;
  handleTogglePackage: (id: string, current: boolean) => Promise<void>;
  handleDeletePackage: (id: string) => Promise<void>;
}

export const EducationPackagesTab: React.FC<EducationPackagesTabProps> = ({
  packages,
  subjects,
  enableSubjects = false,
  packageSubjectFilter,
  setPackageSubjectFilter,
  packageModal,
  setPackageModal,
  handleSavePackage,
  handleTogglePackage,
  handleDeletePackage,
}) => {
  const { t, i18n } = useTranslation();
  const isEn = i18n.language === "en";

  const filtered = packages.filter(
    (p) => (!enableSubjects || !packageSubjectFilter ? true : p.subjectId === packageSubjectFilter)
  );

  return (
    <div className="space-y-4" dir={isEn ? "ltr" : "rtl"}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h2 className="text-base font-bold text-foreground">
          {t("education.packages.title", isEn ? "Session Packages Management" : "إدارة باقات الحصص")}
        </h2>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {enableSubjects && (
            <select
              className="bg-background border border-input rounded-lg px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary flex-1 sm:w-48"
              value={packageSubjectFilter}
              onChange={(e) => setPackageSubjectFilter(e.target.value)}
            >
              <option value="">{t("education.packages.allSubjects", isEn ? "All Subjects" : "كل المواد")}</option>
              {subjects
                .filter((s) => s.isActive)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
            </select>
          )}
          <button
            type="button"
            onClick={() => setPackageModal({})}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:bg-primary/90 shadow-xs shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            {t("education.packages.addPackage", isEn ? "Add Package" : "إضافة باقة")}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3.5 sm:gap-4">
        {filtered.map((p) => (
          <div
            key={p.id}
            className={`bg-card border border-border/80 rounded-xl p-3.5 sm:p-4 shadow-xs space-y-3 transition-all hover:border-primary/40 ${
              !p.isActive ? "opacity-60 bg-muted/20" : ""
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold text-sm text-foreground">
                  {p.name}
                </h3>
                {enableSubjects && p.subject?.name && (
                  <p className="text-xs text-muted-foreground">
                    {p.subject.name}
                  </p>
                )}
              </div>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${
                  p.isActive
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                    : "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
                }`}
              >
                {p.isActive
                  ? t("education.statuses.ACTIVE", isEn ? "Active" : "نشط")
                  : t("education.statuses.INACTIVE", isEn ? "Inactive" : "معطل")}
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5 text-xs">
              <span className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-md font-mono tabular-nums">
                {t("education.packages.hours", { count: p.hoursCount, defaultValue: isEn ? `${p.hoursCount} hours` : `${p.hoursCount} ساعة` })}
              </span>
              <span className="bg-muted/60 text-muted-foreground px-2 py-0.5 rounded-md font-mono tabular-nums">
                {t("education.packages.duration", { count: p.sessionDuration, defaultValue: isEn ? `${p.sessionDuration} min/session` : `${p.sessionDuration} دقيقة/حصة` })}
              </span>
              <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-md font-mono tabular-nums font-semibold">
                {t("education.packages.priceWithCurrency", { price: p.price, defaultValue: isEn ? `${p.price} EGP` : `${p.price} ج.م` })}
              </span>
            </div>

            {p.description && (
              <p className="text-xs text-muted-foreground line-clamp-2">
                {p.description}
              </p>
            )}

            <div className="flex items-center gap-2 pt-3 border-t border-border/60">
              <button
                type="button"
                onClick={() => setPackageModal(p)}
                className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-1.5 bg-muted/60 text-foreground hover:bg-muted text-xs rounded-lg transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" />
                {t("education.actions.edit", isEn ? "Edit" : "تعديل")}
              </button>
              <button
                type="button"
                onClick={() => handleTogglePackage(p.id, p.isActive)}
                className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                  p.isActive
                    ? "bg-red-500/10 text-red-600 hover:bg-red-500/20"
                    : "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20"
                }`}
              >
                {p.isActive
                  ? t("education.actions.deactivate", isEn ? "Deactivate" : "تعطيل")
                  : t("education.actions.activate", isEn ? "Activate" : "تفعيل")}
              </button>
              <button
                type="button"
                onClick={() => handleDeletePackage(p.id)}
                className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                title={t("education.packages.deletePackage", isEn ? "Delete Package" : "حذف الباقة")}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="col-span-full text-center py-12 text-xs text-muted-foreground">
            {t("education.packages.empty", isEn ? "No registered packages" : "لا توجد باقات مسجلة")}
          </p>
        )}
      </div>
      {packageModal !== undefined && (
        <PackageModal
          pkg={packageModal}
          subjects={subjects}
          enableSubjects={enableSubjects}
          onClose={() => setPackageModal(undefined)}
          onSave={handleSavePackage}
        />
      )}
    </div>
  );
};
