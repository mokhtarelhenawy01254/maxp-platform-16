import React from "react";

interface CaseCreatePricingNotesSectionProps {
  priceSnapshot: number;
  setPriceSnapshot: (val: number) => void;
  discount: number;
  setDiscount: (val: number) => void;
  notes: string;
  setNotes: (val: string) => void;
  inputCls: string;
  labelCls: string;
}

export const CaseCreatePricingNotesSection: React.FC<
  CaseCreatePricingNotesSectionProps
> = ({
  priceSnapshot,
  setPriceSnapshot,
  discount,
  setDiscount,
  notes,
  setNotes,
  inputCls,
  labelCls,
}) => {
  return (
    <>
      {/* Pricing & Discount */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-blue-50/50 dark:bg-blue-950/20 p-3 rounded-xl border border-blue-100 dark:border-blue-900/40">
        <div>
          <label className={labelCls}>السعر المبدئي المحسوب (ج.م)</label>
          <input
            type="number"
            step="any"
            min={0}
            className={`${inputCls} tabular-nums font-mono`}
            value={priceSnapshot}
            onChange={(e) => setPriceSnapshot(parseFloat(e.target.value) || 0)}
          />
          <span className="text-[11px] text-gray-500 mt-0.5 block">
            محسوب تلقائياً بناءً على تعاقد الطبيب والوحدات
          </span>
        </div>
        <div>
          <label className={labelCls}>الخصم إن وجد (ج.م)</label>
          <input
            type="number"
            step="any"
            min={0}
            className={`${inputCls} tabular-nums font-mono`}
            value={discount}
            onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
          />
        </div>
      </div>

      <div>
        <label className={labelCls}>ملاحظات الفني / الطبيب</label>
        <textarea
          className={`${inputCls} resize-none`}
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="أي تفاصيل خاصة بتشريح السن أو حواف التحضير أو طريقة التوصيل..."
        />
      </div>
    </>
  );
};

export default CaseCreatePricingNotesSection;
