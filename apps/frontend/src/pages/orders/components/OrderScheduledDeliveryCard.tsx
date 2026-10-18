import React from "react";
import { useTranslation } from "react-i18next";
import { CalendarClock, CheckCircle2 } from "lucide-react";

export interface OrderScheduledDeliveryCardProps {
  scheduledDeliveryDate: string;
  scheduledNotes?: string | null;
  autoTransitionEnabled?: boolean | null;
}

export const OrderScheduledDeliveryCard: React.FC<OrderScheduledDeliveryCardProps> = ({
  scheduledDeliveryDate,
  scheduledNotes,
  autoTransitionEnabled,
}) => {
  const { t } = useTranslation();

  const dateObj = new Date(scheduledDeliveryDate);
  const formattedDate = dateObj.toLocaleDateString("ar-EG", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const formattedTime = dateObj.toLocaleTimeString("ar-EG", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  return (
    <div className="rounded-2xl border border-border/70 bg-card p-4 sm:p-5 shadow-xs space-y-3.5 mt-4 sm:mt-6">
      <div className="flex items-center gap-2.5 border-b border-border/50 pb-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
          <CalendarClock className="h-4 w-4" />
        </div>
        <div>
          <h3 className="text-sm sm:text-base font-bold text-foreground">
            {t("orderDetails.scheduledSectionTitle", { defaultValue: "بيانات التوصيل المؤجل والمجدول" })}
          </h3>
          <p className="text-[11px] text-muted-foreground">
            {t("orderDetails.scheduledSectionDesc", { defaultValue: "الموعد المحدد للتسليم بناءً على طلب العميل" })}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3.5 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <span className="text-[11px] font-semibold text-muted-foreground block mb-0.5">
              {t("orderDetails.scheduledDeliveryDateLabel", { defaultValue: "تاريخ التوصيل المجدول" })}
            </span>
            <span className="text-xs sm:text-sm font-bold text-foreground font-mono tabular-nums">
              {formattedDate}
            </span>
          </div>

          <div>
            <span className="text-[11px] font-semibold text-muted-foreground block mb-0.5">
              {t("orderDetails.deliveryTimeLabel", { defaultValue: "الوقت التقريبي" })}
            </span>
            <span className="text-xs sm:text-sm font-bold text-foreground font-mono tabular-nums" dir="ltr">
              {formattedTime}
            </span>
          </div>
        </div>

        {scheduledNotes && (
          <div className="border-t border-amber-500/20 pt-2.5">
            <span className="text-[11px] font-semibold text-muted-foreground block mb-1">
              {t("orderDetails.scheduledNotesLabel", { defaultValue: "ملاحظات التأجيل" })}
            </span>
            <p className="text-xs text-foreground leading-relaxed">
              {scheduledNotes}
            </p>
          </div>
        )}
      </div>

      {autoTransitionEnabled && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>
            {t("orderDetails.autoTransitionText", { defaultValue: "سيتم تحويل حالة الطلب تلقائياً إلى قيد التجهيز عند حلول الموعد" })}
          </span>
        </div>
      )}
    </div>
  );
};

export default OrderScheduledDeliveryCard;
