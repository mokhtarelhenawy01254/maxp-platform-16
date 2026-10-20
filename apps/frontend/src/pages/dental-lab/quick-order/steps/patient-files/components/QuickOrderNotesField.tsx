import { MODAL_INPUT_CLS } from "../../../../shared";

interface QuickOrderNotesFieldProps {
  notes: string;
  onNotesChange: (v: string) => void;
}

export function QuickOrderNotesField({ notes, onNotesChange }: QuickOrderNotesFieldProps) {
  const inputCls = `${MODAL_INPUT_CLS} text-sm`;
  const labelCls = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";

  return (
    <div>
      <label className={labelCls}>ملاحظات فنية إضافية للمعمل</label>
      <textarea
        className={`${inputCls} min-h-[55px] resize-y`}
        placeholder="تعليمات الطبيب، تفاصيل الإطباق، تشريح الحواف..."
        value={notes}
        onChange={(e) => onNotesChange(e.target.value)}
      />
    </div>
  );
}
