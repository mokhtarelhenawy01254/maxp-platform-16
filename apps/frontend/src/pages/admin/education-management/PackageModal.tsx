import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import type { EducationPackage, EducationSubject } from "./types";
import { MODAL_CLS, INPUT_CLS } from "./types";

export interface PackageModalProps {
  pkg?: Partial<EducationPackage> | null;
  subjects: EducationSubject[];
  enableSubjects?: boolean;
  onClose: () => void;
  onSave: (d: Partial<EducationPackage>) => Promise<void>;
}

export const PackageModal: React.FC<PackageModalProps> = ({
  pkg,
  subjects,
  enableSubjects = false,
  onClose,
  onSave,
}) => {
  const { t, i18n } = useTranslation();
  const isEn = i18n.language === "en";

  const [form, setForm] = useState({
    name: "",
    description: "",
    subjectId: "",
    hoursCount: 1,
    sessionDuration: 60,
    price: 0,
    ...pkg,
  });

  return (
    <div
      className="fixed inset-0 bg-background/80 backdrop-blur-xs z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className={MODAL_CLS}
        onClick={(e) => e.stopPropagation()}
        dir={isEn ? "ltr" : "rtl"}
      >
        <div className="flex items-center justify-between pb-3 border-b border-border/80">
          <h3 className="text-sm font-bold text-foreground">
            {pkg?.id
              ? t("education.packages.modalTitleEdit", isEn ? "Edit Session Package" : "تعديل باقة الحصص")
              : t("education.packages.modalTitleNew", isEn ? "Add New Package" : "إضافة باقة جديدة")}
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
              {t("education.packages.name", isEn ? "Package Name" : "اسم الباقة")} *
            </label>
            <input
              className={INPUT_CLS}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder={isEn ? "e.g. 10 Sessions Intensive Course" : "مثال: باقة 10 حصص مكثفة"}
            />
          </div>
          {enableSubjects && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">
                {t("education.packages.subject", isEn ? "Subject" : "المادة")} *
              </label>
              <select
                className={INPUT_CLS}
                value={form.subjectId}
                onChange={(e) => {
                  const subId = e.target.value;
                  const foundSub = subjects.find((s) => s.id === subId);
                  setForm((prev) => ({
                    ...prev,
                    subjectId: subId,
                    price: prev.price === 0 && foundSub?.price ? foundSub.price : prev.price,
                  }));
                }}
              >
                <option value="">{t("education.packages.selectSubject", isEn ? "Select Subject" : "اختر المادة")}</option>
                {subjects
                  .filter((s) => s.isActive)
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
              </select>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">
                {t("education.packages.hoursCount", isEn ? "Hours Count" : "عدد الساعات")}
              </label>
              <input
                type="number"
                min={1}
                className={INPUT_CLS}
                value={form.hoursCount}
                onChange={(e) =>
                  setForm({ ...form, hoursCount: Number(e.target.value) })
                }
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">
                {t("education.packages.sessionDuration", isEn ? "Minutes/Session" : "الدقائق/حصة")}
              </label>
              <input
                type="number"
                min={15}
                step={15}
                className={INPUT_CLS}
                value={form.sessionDuration}
                onChange={(e) =>
                  setForm({ ...form, sessionDuration: Number(e.target.value) })
                }
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">
                {t("education.packages.priceLabel", isEn ? "Price (EGP)" : "السعر (ج.م)")}
              </label>
              <input
                type="number"
                min={0}
                className={INPUT_CLS}
                value={form.price}
                onChange={(e) =>
                  setForm({ ...form, price: Number(e.target.value) })
                }
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">
              {t("education.subjects.description", isEn ? "Description" : "الوصف")}
            </label>
            <textarea
              className={INPUT_CLS}
              rows={2}
              value={form.description || ""}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              placeholder={isEn ? "Package description or syllabus summary..." : "وصف الباقة أو ملخص المنهج..."}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2.5 pt-3 border-t border-border/80">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs rounded-lg bg-muted text-foreground hover:bg-muted/80"
          >
            {t("education.actions.cancel", isEn ? "Cancel" : "إلغاء")}
          </button>
          <button
            type="button"
            onClick={() => onSave(form)}
            disabled={!form.name || (enableSubjects && !form.subjectId)}
            className="px-4 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-50"
          >
            {t("education.actions.save", isEn ? "Save" : "حفظ")}
          </button>
        </div>
      </div>
    </div>
  );
};
