import React from "react";
import { useTranslation } from "react-i18next";
import {
  RotateCcw,
  Clock,
  Truck,
  Tag,
  Pencil,
  FileText,
} from "lucide-react";
import { OrderReturnDetails } from "../utils/returnHelper";
import { useDateFormat } from "../../../hooks/useDateFormat";

interface OrderReturnCardProps {
  returnDetails: OrderReturnDetails;
  onEditReason?: () => void;
  canEdit?: boolean;
}

export const OrderReturnCard: React.FC<OrderReturnCardProps> = ({
  returnDetails,
  onEditReason,
  canEdit = true,
}) => {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat();

  const hasReason = Boolean(returnDetails.reason && returnDetails.reason.trim());

  return (
    <section
      aria-labelledby="order-return-heading"
      className="relative overflow-hidden rounded-xl border border-rose-500/30 bg-rose-500/[0.04] p-4 sm:p-5 text-card-foreground shadow-none space-y-3.5"
    >
      {/* Visual Indicator Bar */}
      <div
        className="absolute inset-y-0 right-0 w-1 bg-rose-500"
        aria-hidden="true"
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        {/* Title and Badge */}
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-400">
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2
                id="order-return-heading"
                className="text-sm font-semibold text-rose-900 dark:text-rose-200"
              >
                {returnDetails.isPartial
                  ? t("orderDetails.orderPartiallyReturned", { defaultValue: "الطلب مرتجع جزئياً" })
                  : t("orderDetails.orderReturned", { defaultValue: "الطلب مرتجع" })}
              </h2>
              <span className="inline-flex items-center gap-1 rounded-md border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 font-mono text-[11px] font-medium text-rose-700 dark:text-rose-300">
                <Tag className="h-3 w-3" aria-hidden="true" />
                <span>{returnDetails.returnTypeLabel}</span>
              </span>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {returnDetails.isPartial
                ? t("orderDetails.partialReturnDesc", { defaultValue: "تم استرجاع جزء من منتجات هذا الطلب" })
                : t("orderDetails.fullReturnDesc", { defaultValue: "تم إرجاع هذا الطلب بالكامل ولم يتم إتمام تسليمه" })}
            </p>
          </div>
        </div>

        {/* Action Button */}
        {canEdit && onEditReason && (
          <button
            type="button"
            onClick={onEditReason}
            className="inline-flex items-center gap-1.5 self-start rounded-lg border border-rose-500/30 bg-card px-2.5 py-1 text-xs font-medium text-rose-700 dark:text-rose-300 transition hover:bg-rose-500/10 active:scale-[0.98]"
          >
            <Pencil className="h-3 w-3" aria-hidden="true" />
            <span>
              {hasReason
                ? t("orderDetails.editReturnReason", { defaultValue: "تعديل سبب المرتجع" })
                : t("orderDetails.addReturnReason", { defaultValue: "تحديد سبب المرتجع" })}
            </span>
          </button>
        )}
      </div>

      {/* Prominent Return Reason Box */}
      <div className="rounded-lg border border-border/60 bg-card p-3.5 space-y-2 text-xs">
        <div className="flex items-center justify-between">
          <span className="font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400 text-[11px]">
            {t("orderDetails.returnReason", { defaultValue: "سبب المرتجع" })}
          </span>
          {returnDetails.source && (
            <span className="text-[11px] text-muted-foreground">
              {t("orderDetails.returnSource", { defaultValue: "المصدر:" })} {returnDetails.source}
            </span>
          )}
        </div>

        {hasReason ? (
          <p className="whitespace-pre-wrap text-xs sm:text-sm font-medium leading-relaxed text-foreground">
            {returnDetails.reason}
          </p>
        ) : (
          <p className="italic text-muted-foreground">
            {t("orderDetails.noReturnReason", {
              defaultValue: "لم يتم تسجيل سبب للمرتجع من شركة الشحن أو موظف المتابعة.",
            })}
          </p>
        )}

        {/* Secondary reason if exists */}
        {returnDetails.secondaryReason && returnDetails.secondaryReason !== returnDetails.reason && (
          <div className="border-t border-border/60 pt-2 text-xs">
            <span className="font-medium text-muted-foreground">
              {t("orderDetails.carrierDelayReason", { defaultValue: "ملاحظة الشحن / التأخير المسبق:" })}
            </span>
            <p className="mt-0.5 text-foreground">
              {returnDetails.secondaryReason}
            </p>
          </div>
        )}

        {/* Admin or Customer Notes from Return Request */}
        {(returnDetails.adminNotes || returnDetails.customerNotes) && (
          <div className="space-y-1.5 border-t border-border/60 pt-2 text-xs">
            {returnDetails.customerNotes && returnDetails.customerNotes !== returnDetails.reason && (
              <div className="flex items-start gap-1.5 text-muted-foreground">
                <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span><strong className="font-medium text-foreground">ملاحظات العميل:</strong> {returnDetails.customerNotes}</span>
              </div>
            )}
            {returnDetails.adminNotes && returnDetails.adminNotes !== returnDetails.reason && (
              <div className="flex items-start gap-1.5 text-muted-foreground">
                <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span><strong className="font-medium text-foreground">ملاحظات الإدارة:</strong> {returnDetails.adminNotes}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Metadata Telemetry Footnote */}
      <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-xs text-muted-foreground font-mono">
        {returnDetails.returnedAt && (
          <div className="inline-flex items-center gap-1.5">
            <Clock className="h-3 w-3 shrink-0 text-muted-foreground" />
            <span>
              {t("orderDetails.returnedAt", { defaultValue: "تاريخ التسجيل:" })}{" "}
              <span className="tabular-nums text-foreground">
                {formatDateTime(returnDetails.returnedAt)}
              </span>
            </span>
          </div>
        )}

        {returnDetails.reportedBy && (
          <div className="inline-flex items-center gap-1.5 font-sans">
            <span className="text-muted-foreground">بواسطة:</span>
            <span className="font-medium text-foreground">
              {returnDetails.reportedBy}
            </span>
          </div>
        )}

        {returnDetails.trackingNumber && (
          <div className="inline-flex items-center gap-1.5">
            <Truck className="h-3 w-3 shrink-0 text-muted-foreground" />
            <span>
              {returnDetails.carrier || "الشحنة"}:{" "}
              <span className="tabular-nums text-foreground" dir="ltr">
                #{returnDetails.trackingNumber}
              </span>
            </span>
          </div>
        )}

        {returnDetails.turboBranchName && (
          <div className="inline-flex items-center gap-1.5 font-sans">
            <span className="text-muted-foreground">الفرع:</span>
            <span className="font-medium text-foreground">
              {returnDetails.turboBranchName}
            </span>
          </div>
        )}

        {returnDetails.turboCaptainName && (
          <div className="inline-flex items-center gap-1.5 font-sans">
            <span className="text-muted-foreground">المندوب:</span>
            <span className="font-medium text-foreground">
              {returnDetails.turboCaptainName}
              {returnDetails.turboCaptainPhone ? ` (${returnDetails.turboCaptainPhone})` : ""}
            </span>
          </div>
        )}
      </div>
    </section>
  );
};

export default OrderReturnCard;
