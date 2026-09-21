import React from "react";
import { useTranslation } from "react-i18next";
import {
  ArrowPathRoundedSquareIcon,
  ClockIcon,
  TruckIcon,
  TagIcon,
  PencilSquareIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";
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
      className="relative overflow-hidden rounded-2xl border border-rose-200 bg-rose-50/70 p-5 shadow-sm transition-all dark:border-rose-900/60 dark:bg-rose-950/20"
    >
      {/* Visual Indicator Bar */}
      <div
        className="absolute inset-y-0 right-0 w-1.5 bg-rose-600 dark:bg-rose-500"
        aria-hidden="true"
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        {/* Title and Badge */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-700 shadow-inner dark:bg-rose-900/40 dark:text-rose-300">
            <ArrowPathRoundedSquareIcon className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2
                id="order-return-heading"
                className="text-base font-bold text-rose-950 dark:text-rose-100"
              >
                {returnDetails.isPartial
                  ? t("orderDetails.orderPartiallyReturned", { defaultValue: "الطلب مرتجع جزئياً" })
                  : t("orderDetails.orderReturned", { defaultValue: "الطلب مرتجع" })}
              </h2>
              <span className="inline-flex items-center gap-1 rounded-full border border-rose-300 bg-rose-100/80 px-2.5 py-0.5 text-xs font-semibold text-rose-800 dark:border-rose-800 dark:bg-rose-900/40 dark:text-rose-200">
                <TagIcon className="h-3 w-3" aria-hidden="true" />
                <span>{returnDetails.returnTypeLabel}</span>
              </span>
            </div>
            <p className="mt-0.5 text-xs text-rose-800/80 dark:text-rose-300/80">
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
            className="inline-flex items-center gap-1.5 self-start rounded-xl border border-rose-300 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 shadow-xs transition hover:bg-rose-50 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-rose-500 dark:border-rose-800 dark:bg-gray-800 dark:text-rose-300 dark:hover:bg-rose-950/40"
          >
            <PencilSquareIcon className="h-3.5 w-3.5" aria-hidden="true" />
            <span>
              {hasReason
                ? t("orderDetails.editReturnReason", { defaultValue: "تعديل سبب المرتجع" })
                : t("orderDetails.addReturnReason", { defaultValue: "تحديد سبب المرتجع" })}
            </span>
          </button>
        )}
      </div>

      {/* Prominent Return Reason Box */}
      <div className="mt-4 rounded-xl border border-rose-200/80 bg-white/90 p-4 shadow-xs dark:border-rose-900/50 dark:bg-gray-900/80">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-rose-700 dark:text-rose-400">
            {t("orderDetails.returnReason", { defaultValue: "سبب المرتجع" })}
          </span>
          {returnDetails.source && (
            <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
              {t("orderDetails.returnSource", { defaultValue: "المصدر:" })} {returnDetails.source}
            </span>
          )}
        </div>

        {hasReason ? (
          <p className="mt-2 whitespace-pre-wrap text-sm font-semibold leading-relaxed text-gray-900 dark:text-gray-100 sm:text-base">
            {returnDetails.reason}
          </p>
        ) : (
          <div className="mt-2">
            <p className="text-sm italic text-gray-500 dark:text-gray-400">
              {t("orderDetails.noReturnReason", {
                defaultValue: "لم يتم تسجيل سبب للمرتجع من شركة الشحن أو موظف المتابعة.",
              })}
            </p>
          </div>
        )}

        {/* Secondary reason if exists (e.g. earlier courier delay note) */}
        {returnDetails.secondaryReason && returnDetails.secondaryReason !== returnDetails.reason && (
          <div className="mt-3 border-t border-rose-100 pt-3 dark:border-rose-950">
            <span className="text-xs font-medium text-rose-800/90 dark:text-rose-300/90">
              {t("orderDetails.carrierDelayReason", { defaultValue: "ملاحظة الشحن / التأخير المسبق:" })}
            </span>
            <p className="mt-1 text-xs text-gray-700 dark:text-gray-300">
              {returnDetails.secondaryReason}
            </p>
          </div>
        )}

        {/* Admin or Customer Notes from Return Request */}
        {(returnDetails.adminNotes || returnDetails.customerNotes) && (
          <div className="mt-3 space-y-1.5 border-t border-rose-100 pt-3 text-xs dark:border-rose-950">
            {returnDetails.customerNotes && returnDetails.customerNotes !== returnDetails.reason && (
              <div className="flex items-start gap-1.5 text-gray-600 dark:text-gray-300">
                <DocumentTextIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-400" />
                <span><strong className="font-semibold text-gray-700 dark:text-gray-200">ملاحظات العميل:</strong> {returnDetails.customerNotes}</span>
              </div>
            )}
            {returnDetails.adminNotes && returnDetails.adminNotes !== returnDetails.reason && (
              <div className="flex items-start gap-1.5 text-gray-600 dark:text-gray-300">
                <DocumentTextIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-400" />
                <span><strong className="font-semibold text-gray-700 dark:text-gray-200">ملاحظات الإدارة:</strong> {returnDetails.adminNotes}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Metadata Telemetry Footnote */}
      <div className="mt-3 flex flex-wrap items-center gap-y-2 gap-x-4 text-xs text-gray-600 dark:text-gray-400">
        {returnDetails.returnedAt && (
          <div className="inline-flex items-center gap-1.5">
            <ClockIcon className="h-3.5 w-3.5 shrink-0 text-gray-400 dark:text-gray-500" />
            <span>
              {t("orderDetails.returnedAt", { defaultValue: "تاريخ التسجيل:" })}{" "}
              <span className="font-mono tabular-nums text-gray-800 dark:text-gray-200">
                {formatDateTime(returnDetails.returnedAt)}
              </span>
            </span>
          </div>
        )}

        {returnDetails.reportedBy && (
          <div className="inline-flex items-center gap-1.5">
            <span className="text-gray-400">بواسطة:</span>
            <span className="font-medium text-gray-800 dark:text-gray-200">
              {returnDetails.reportedBy}
            </span>
          </div>
        )}

        {returnDetails.trackingNumber && (
          <div className="inline-flex items-center gap-1.5">
            <TruckIcon className="h-3.5 w-3.5 shrink-0 text-gray-400 dark:text-gray-500" />
            <span>
              {returnDetails.carrier || "الشحنة"}:{" "}
              <span className="font-mono tabular-nums text-gray-800 dark:text-gray-200" dir="ltr">
                #{returnDetails.trackingNumber}
              </span>
            </span>
          </div>
        )}

        {returnDetails.turboBranchName && (
          <div className="inline-flex items-center gap-1.5">
            <span>الفرع:</span>
            <span className="font-medium text-gray-800 dark:text-gray-200">
              {returnDetails.turboBranchName}
            </span>
          </div>
        )}

        {returnDetails.turboCaptainName && (
          <div className="inline-flex items-center gap-1.5">
            <span>المندوب:</span>
            <span className="font-medium text-gray-800 dark:text-gray-200">
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
