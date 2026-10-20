import React from "react";
import { useTranslation } from "react-i18next";

export interface OrderStatusCancellationSectionProps {
  statusNotes: string;
  setStatusNotes: (val: string) => void;
  cancellationAdditionalNotes: string;
  setCancellationAdditionalNotes: (val: string) => void;
  cancellationReasonOptions: Array<{ id: string; reason: string }>;
  cancellationReasonOptionsLoading: boolean;
  updating: boolean;
}

export const OrderStatusCancellationSection: React.FC<
  OrderStatusCancellationSectionProps
> = ({
  statusNotes,
  setStatusNotes,
  cancellationAdditionalNotes,
  setCancellationAdditionalNotes,
  cancellationReasonOptions,
  cancellationReasonOptionsLoading,
  updating,
}) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-3 rounded-xl border border-destructive/20 bg-destructive/5 p-3.5">
      <label className="block text-xs font-bold text-destructive">
        {t("orderDetails.cancellationReasonRequiredLabel", {
          defaultValue: "سبب الإلغاء (إلزامي)",
        })}
      </label>
      {cancellationReasonOptions.length > 0 ? (
        <select
          value={statusNotes}
          onChange={(e) => setStatusNotes(e.target.value)}
          disabled={updating || cancellationReasonOptionsLoading}
          className="h-10 w-full rounded-xl border border-border/70 bg-background px-3 text-xs text-foreground focus:border-destructive focus:outline-none"
        >
          <option value="">
            {t("orderDetails.selectCancellationReason", {
              defaultValue: "-- اختر سبب الإلغاء --",
            })}
          </option>
          {cancellationReasonOptions.map((reason) => (
            <option key={reason.id} value={reason.reason}>
              {reason.reason}
            </option>
          ))}
        </select>
      ) : (
        <textarea
          value={statusNotes}
          onChange={(e) => setStatusNotes(e.target.value)}
          rows={2}
          className="w-full rounded-xl border border-border/70 bg-background p-2.5 text-xs text-foreground focus:border-destructive focus:outline-none"
          placeholder={String(
            t("orderDetails.cancellationReasonPlaceholder2", {
              defaultValue: "اكتب سبب الإلغاء بالتفصيل...",
            })
          )}
        />
      )}
      {cancellationReasonOptionsLoading && (
        <p className="text-[11px] text-muted-foreground">
          {t("orderDetails.loadingReasons", {
            defaultValue: "جاري تحميل أسباب الإلغاء...",
          })}
        </p>
      )}
      <div>
        <label className="block text-xs font-bold text-foreground mb-1">
          {t("orderDetails.additionalNotesLabel", {
            defaultValue: "ملاحظات إضافية (اختياري)",
          })}
        </label>
        <textarea
          value={cancellationAdditionalNotes}
          onChange={(e) => setCancellationAdditionalNotes(e.target.value)}
          rows={2}
          className="w-full rounded-xl border border-border/70 bg-background p-2.5 text-xs text-foreground focus:border-primary focus:outline-none"
          placeholder={String(
            t("orderDetails.additionalNotesPlaceholder", {
              defaultValue: "أي تفاصيل أخرى...",
            })
          )}
        />
      </div>
    </div>
  );
};
