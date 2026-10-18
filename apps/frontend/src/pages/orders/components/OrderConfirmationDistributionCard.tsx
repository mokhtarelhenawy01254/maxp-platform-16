import React from "react";
import { useTranslation } from "react-i18next";
import { ShieldCheck, UserCheck } from "lucide-react";

export interface OrderConfirmationDistributionCardProps {
  order: {
    confirmedAt?: string | null;
    confirmedBy?: string | null;
    confirmedByUser?: { firstName?: string; lastName?: string } | null;
    assignedTo?: string | null;
    assignedToUser?: { firstName?: string; lastName?: string } | null;
    assignedBy?: string | null;
    assignedByUser?: { firstName?: string; lastName?: string } | null;
    assignedAt?: string | null;
    assignmentStrategy?: string | null;
    confirmationNotes?: string | null;
  };
  effectiveStatus: string;
  formatOptionalDate: (val?: string | null) => string;
}

export const OrderConfirmationDistributionCard: React.FC<OrderConfirmationDistributionCardProps> = ({
  order,
  effectiveStatus,
  formatOptionalDate,
}) => {
  const { t } = useTranslation();

  const isCurrentlyPending = [
    "PENDING",
    "PENDING_STOCK",
    "ON_HOLD_STOCK",
    "CANCELLED",
    "TRASH",
    "WOO_TAGHEZ",
  ].includes((effectiveStatus || "").toUpperCase());

  const confirmationStatusLabel =
    (!isCurrentlyPending && order.confirmedAt) || effectiveStatus === "CONFIRMED"
      ? t("orderDetails.confirmedStatus", { defaultValue: "مؤكد" })
      : t("orderDetails.notConfirmedStatus", { defaultValue: "غير مؤكد" });

  const assignmentStatusLabel = order.assignedTo
    ? t("orderDetails.distributed", { defaultValue: "تم التوزيع" })
    : t("orderDetails.notDistributed", { defaultValue: "لم يوزع" });

  const confirmedByName = order.confirmedByUser
    ? `${order.confirmedByUser.firstName || ""} ${order.confirmedByUser.lastName || ""}`.trim()
    : order.confirmedBy || "—";

  const assignedToName = order.assignedToUser
    ? `${order.assignedToUser.firstName || ""} ${order.assignedToUser.lastName || ""}`.trim()
    : order.assignedTo || "—";

  const assignedByName = order.assignedByUser
    ? `${order.assignedByUser.firstName || ""} ${order.assignedByUser.lastName || ""}`.trim()
    : order.assignedBy || "—";

  return (
    <div className="rounded-2xl border border-border/70 bg-card p-4 sm:p-5 shadow-xs space-y-4">
      <div className="flex items-center gap-2.5 border-b border-border/50 pb-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <ShieldCheck className="h-4 w-4" />
        </div>
        <div>
          <h3 className="text-sm sm:text-base font-bold text-foreground">
            {t("orderDetails.confirmAndDistributionData", { defaultValue: "بيانات التأكيد والتوزيع" })}
          </h3>
          <p className="text-[11px] text-muted-foreground">
            {t("orderDetails.confirmAndDistributionHint", { defaultValue: "تفاصيل حالة تأكيد الطلب والموظف المسؤول" })}
          </p>
        </div>
      </div>

      <div className="space-y-2.5 text-xs sm:text-sm text-foreground">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">{t("orderDetails.confirmationStatus", { defaultValue: "حالة التأكيد" })}</span>
          <span className="font-bold text-foreground">{confirmationStatusLabel}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">{t("orderDetails.confirmationDate", { defaultValue: "تاريخ التأكيد" })}</span>
          <span className="font-mono tabular-nums">{formatOptionalDate(order.confirmedAt)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">{t("orderDetails.confirmedBy", { defaultValue: "الموظف المؤكد" })}</span>
          <span className="font-semibold text-foreground">{confirmedByName || "—"}</span>
        </div>

        <div className="border-t border-border/50 pt-2.5" />

        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">{t("orderDetails.distributionStatus", { defaultValue: "حالة التوزيع" })}</span>
          <span className="font-bold text-foreground">{assignmentStatusLabel}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">{t("orderDetails.distributedToLabel", { defaultValue: "موزع إلى" })}</span>
          <span className="font-semibold text-foreground">{assignedToName || "—"}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">{t("orderDetails.distributionMethod", { defaultValue: "طريقة التوزيع" })}</span>
          <span>{order.assignmentStrategy || "—"}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">{t("orderDetails.distributionDate", { defaultValue: "تاريخ التوزيع" })}</span>
          <span className="font-mono tabular-nums">{formatOptionalDate(order.assignedAt)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">{t("orderDetails.distributedByLabel", { defaultValue: "موزع بواسطة" })}</span>
          <span>{assignedByName || "—"}</span>
        </div>

        {order.confirmationNotes && (
          <div className="border-t border-border/50 pt-2.5 text-xs">
            <span className="text-muted-foreground block mb-1 font-semibold">
              {t("orderDetails.confirmationNotesLabel", { defaultValue: "ملاحظات التأكيد" })}
            </span>
            <p className="rounded-xl bg-muted/40 p-2.5 text-foreground leading-relaxed">
              {order.confirmationNotes}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderConfirmationDistributionCard;
