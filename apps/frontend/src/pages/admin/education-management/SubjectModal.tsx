import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import type { EducationSubject } from "./types";
import { MODAL_CLS, INPUT_CLS } from "./types";

export interface SubjectModalProps {
  subject?: Partial<EducationSubject> | null;
  onClose: () => void;
  onSave: (d: Partial<EducationSubject>) => Promise<void>;
}

export const SubjectModal: React.FC<SubjectModalProps> = ({
  subject,
  onClose,
  onSave,
}) => {
  const { t, i18n } = useTranslation();
  const isEn = i18n.language === "en";

  const [form, setForm] = useState({
    name: "",
    description: "",
    price: 0,
    ...subject,
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
            {subject?.id
              ? t("education.subjects.modalTitleEdit", isEn ? "Edit Subject" : "تعديل المادة")
              : t("education.subjects.modalTitleNew", isEn ? "Add New Subject" : "إضافة مادة جديدة")}
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
              {t("education.subjects.name", isEn ? "Subject Name" : "اسم المادة")} *
            </label>
            <input
              className={INPUT_CLS}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder={t("education.subjects.namePlaceholder", isEn ? "e.g. English Language, Mathematics, Programming..." : "مثال: لغة إنجليزية، رياضيات، برمجة...")}
            />
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
              placeholder={t("education.subjects.descPlaceholder", isEn ? "Brief description of the subject..." : "وصف مختصر للمادة التعليمية...")}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">
              {t("education.subjects.price", isEn ? "Subject Price / Fee (EGP)" : "سعر المادة / رسوم السداد (ج.م)")}
            </label>
            <input
              type="number"
              min={0}
              step="any"
              className={INPUT_CLS}
              value={form.price !== undefined && form.price !== null ? form.price : ""}
              onChange={(e) =>
                setForm({
                  ...form,
                  price: e.target.value === "" ? 0 : Number(e.target.value),
                })
              }
              placeholder={t("education.subjects.pricePlaceholder", "0.00")}
            />
            <p className="text-[11px] text-muted-foreground">
              {t("education.subjects.priceHint", isEn ? "Base payment option for the subject (session rate / designated fee)" : "خيار الدفع الأساسي للمادة (سعر الحصة / الرسوم المقررة)")}
            </p>
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
            disabled={!form.name.trim()}
            className="px-4 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-50"
          >
            {t("education.actions.save", isEn ? "Save" : "حفظ")}
          </button>
        </div>
      </div>
    </div>
  );
};
