import React from "react";
import { useTranslation } from "react-i18next";

export interface OrderStatusReturnSectionProps {
  returnReason: string;
  setReturnReason: (val: string) => void;
  statusNotes: string;
  setStatusNotes: (val: string) => void;
  returnAdditionalNotes: string;
  setReturnAdditionalNotes: (val: string) => void;
  commonReturnReasons: string[];
  updating: boolean;
}

export const OrderStatusReturnSection: React.FC<
  OrderStatusReturnSectionProps
> = ({
  returnReason,
  setReturnReason,
  statusNotes,
  setStatusNotes,
  returnAdditionalNotes,
  setReturnAdditionalNotes,
  commonReturnReasons,
  updating,
}) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-3 rounded-xl border border-rose-500/20 bg-rose-500/5 p-3.5">
      <label className="block text-xs font-bold text-rose-700 dark:text-rose-300">
        {t("orderDetails.selectReturnReason", {
          defaultValue: "سبب المرتجع (اختر من الأسباب الشائعة)",
        })}
      </label>
      <select
        value={returnReason}
        onChange={(e) => {
          const val = e.target.value;
          setReturnReason(val);
          if (val && val !== "other") {
            setStatusNotes(val);
          }
        }}
        disabled={updating}
        className="h-10 w-full rounded-xl border border-border/70 bg-background px-3 text-xs text-foreground focus:border-rose-500 focus:outline-none"
      >
        <option value="">
          {t("orderDetails.chooseReturnReason", {
            defaultValue: "-- اختر سبب المرتجع --",
          })}
        </option>
        {commonReturnReasons.map((reasonText, idx) => (
          <option key={idx} value={reasonText}>
            {reasonText}
          </option>
        ))}
        <option value="other">
          {t("orderDetails.otherReason", {
            defaultValue: "سبب آخر (كتابة مخصصة)",
          })}
        </option>
      </select>

      <div>
        <label className="block text-xs font-bold text-foreground mb-1">
          {t("orderDetails.returnReasonDetails", {
            defaultValue: "نص سبب المرتجع بالتفصيل",
          })}
        </label>
        <textarea
          value={statusNotes}
          onChange={(e) => setStatusNotes(e.target.value)}
          rows={2}
          className="w-full rounded-xl border border-border/70 bg-background p-2.5 text-xs text-foreground focus:border-rose-500 focus:outline-none"
          placeholder={String(
            t("orderDetails.returnReasonPlaceholder", {
              defaultValue: "اكتب سبب إرجاع الطلب بالتفصيل هنا...",
            })
          )}
        />
      </div>

      <div>
        <label className="block text-xs font-bold text-foreground mb-1">
          {t("orderDetails.additionalNotesLabel", {
            defaultValue: "ملاحظات إضافية (اختياري)",
          })}
        </label>
        <textarea
          value={returnAdditionalNotes}
          onChange={(e) => setReturnAdditionalNotes(e.target.value)}
          rows={2}
          className="w-full rounded-xl border border-border/70 bg-background p-2.5 text-xs text-foreground focus:border-primary focus:outline-none"
          placeholder={String(
            t("orderDetails.additionalNotesPlaceholder", {
              defaultValue: "أي ملاحظات إضافية...",
            })
          )}
        />
      </div>
    </div>
  );
};
