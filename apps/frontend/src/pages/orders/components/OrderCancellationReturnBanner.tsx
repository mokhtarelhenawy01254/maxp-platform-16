import React from "react";
import { useTranslation } from "react-i18next";
import { Ban, RotateCcw } from "lucide-react";

export interface ReturnDetails {
  isReturned?: boolean;
  returnTypeLabel?: string;
  source?: string;
  reason?: string;
  secondaryReason?: string;
}

export interface OrderCancellationReturnBannerProps {
  isCancellation: boolean;
  latestCancellationReason?: string;
  returnDetails?: ReturnDetails | null;
}

export const OrderCancellationReturnBanner: React.FC<OrderCancellationReturnBannerProps> = ({
  isCancellation,
  latestCancellationReason,
  returnDetails,
}) => {
  const { t } = useTranslation();

  return (
    <>
      {isCancellation && (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 sm:p-5 shadow-xs space-y-2">
          <div className="flex items-center gap-2">
            <Ban className="h-4 w-4 text-destructive shrink-0" />
            <h3 className="text-xs sm:text-sm font-bold text-destructive">
              {t("orderDetails.cancellationReason", { defaultValue: "سبب إلغاء الطلب" })}
            </h3>
          </div>
          <p className="whitespace-pre-wrap text-xs sm:text-sm font-medium leading-relaxed text-destructive/90">
            {latestCancellationReason ||
              t("orderDetails.noCancellationReason", { defaultValue: "لم يتم تحديد سبب للإلغاء" })}
          </p>
        </div>
      )}

      {returnDetails && returnDetails.isReturned && (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 sm:p-5 shadow-xs space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-rose-700 dark:text-rose-300">
              <RotateCcw className="h-4 w-4 shrink-0" />
              <span>{returnDetails.returnTypeLabel || t("orderDetails.returnedOrder", { defaultValue: "طلب مرتجع" })}</span>
            </div>
            {returnDetails.source && (
              <span className="text-[11px] font-mono text-muted-foreground">
                {returnDetails.source}
              </span>
            )}
          </div>
          <p className="whitespace-pre-wrap text-xs sm:text-sm font-semibold leading-relaxed text-rose-800 dark:text-rose-200">
            {returnDetails.reason ||
              t("orderDetails.noReturnReason", { defaultValue: "لم يتم تسجيل سبب محدد للمرتجع" })}
          </p>
          {returnDetails.secondaryReason && returnDetails.secondaryReason !== returnDetails.reason && (
            <div className="pt-2 border-t border-rose-500/20 text-xs text-rose-700 dark:text-rose-300">
              <span className="font-bold">ملاحظة الشحن: </span>
              <span>{returnDetails.secondaryReason}</span>
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default OrderCancellationReturnBanner;
