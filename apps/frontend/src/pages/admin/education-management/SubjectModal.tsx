import React, { useState } from "react";
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
      <div className={MODAL_CLS} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between pb-3 border-b border-border/80">
          <h3 className="text-sm font-bold text-foreground">
            {subject?.id ? "تعديل المادة" : "إضافة مادة جديدة"}
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
              اسم المادة *
            </label>
            <input
              className={INPUT_CLS}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="مثال: لغة إنجليزية، رياضيات، برمجة..."
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">الوصف</label>
            <textarea
              className={INPUT_CLS}
              rows={2}
              value={form.description || ""}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              placeholder="وصف مختصر للمادة التعليمية..."
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">
              سعر المادة / رسوم السداد (ج.م)
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
              placeholder="0.00"
            />
            <p className="text-[11px] text-muted-foreground">
              خيار الدفع الأساسي للمادة (سعر الحصة / الرسوم المقررة)
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-2.5 pt-3 border-t border-border/80">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs rounded-lg bg-muted text-foreground hover:bg-muted/80"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={() => onSave(form)}
            disabled={!form.name.trim()}
            className="px-4 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-50"
          >
            حفظ
          </button>
        </div>
      </div>
    </div>
  );
};
