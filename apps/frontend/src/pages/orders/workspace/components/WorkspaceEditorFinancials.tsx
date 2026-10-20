import React from "react";
import { CheckIcon, XMarkIcon } from "@heroicons/react/24/outline";

export interface WorkspaceEditorFinancialsProps {
  shipping: number;
  setShipping: (val: number) => void;
  discount: number;
  setDiscount: (val: number) => void;
  finalTotal: number;
  formatPrice: (amount: number) => string;
  isArabic: boolean;
  isSaving: boolean;
  onCancel: () => void;
  onSave: () => void;
}

export const WorkspaceEditorFinancials: React.FC<
  WorkspaceEditorFinancialsProps
> = ({
  shipping,
  setShipping,
  discount,
  setDiscount,
  finalTotal,
  formatPrice,
  isArabic,
  isSaving,
  onCancel,
  onSave,
}) => {
  return (
    <>
      {/* Financials Controls */}
      <div className="mt-3 grid grid-cols-2 gap-2 border-t border-border/30 pt-2 text-xs">
        <div>
          <label className="text-[11px] font-semibold text-muted-foreground">
            {isArabic ? "الشحن" : "Shipping"}
          </label>
          <input
            type="number"
            min="0"
            value={shipping}
            onChange={(e) =>
              setShipping(Math.max(0, parseFloat(e.target.value) || 0))
            }
            className="mt-0.5 h-7 w-full rounded border border-border/60 bg-background px-2 font-mono text-xs font-bold tabular-nums text-foreground focus:border-primary focus:outline-none"
          />
        </div>

        <div>
          <label className="text-[11px] font-semibold text-muted-foreground">
            {isArabic ? "الخصم" : "Discount"}
          </label>
          <input
            type="number"
            min="0"
            value={discount}
            onChange={(e) =>
              setDiscount(Math.max(0, parseFloat(e.target.value) || 0))
            }
            className="mt-0.5 h-7 w-full rounded border border-border/60 bg-background px-2 font-mono text-xs font-bold tabular-nums text-foreground focus:border-primary focus:outline-none"
          />
        </div>
      </div>

      {/* Totals Preview */}
      <div className="mt-2.5 flex items-center justify-between rounded bg-muted/40 px-2.5 py-1.5 text-xs">
        <span className="font-bold text-foreground">
          {isArabic ? "الإجمالي الجديد المحسوب:" : "New Computed Total:"}
        </span>
        <span className="font-mono text-sm font-black tabular-nums text-primary">
          {formatPrice(finalTotal)}
        </span>
      </div>

      {/* Action Buttons */}
      <div className="mt-3 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSaving}
          className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-background px-2.5 py-1 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
        >
          <XMarkIcon className="h-3.5 w-3.5" />
          <span>{isArabic ? "إلغاء" : "Cancel"}</span>
        </button>

        <button
          type="button"
          onClick={onSave}
          disabled={isSaving}
          className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1 text-xs font-bold text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-50"
        >
          <CheckIcon className="h-3.5 w-3.5" />
          <span>
            {isSaving
              ? isArabic
                ? "جارٍ الحفظ…"
                : "Saving…"
              : isArabic
              ? "حفظ التعديلات"
              : "Save Changes"}
          </span>
        </button>
      </div>
    </>
  );
};
