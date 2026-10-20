import React from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";

export interface ConfirmationQueueDisabledStateProps {
  embedded?: boolean;
}

export const ConfirmationQueueDisabledState: React.FC<ConfirmationQueueDisabledStateProps> = ({
  embedded = false,
}) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-4 sm:space-y-6" dir="rtl">
      {!embedded && (
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">
              {t("orders.ordersNeedingConfirmation", { defaultValue: "طلبات تحتاج إلى تأكيد" })}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              {t("orders.ordersNeedingConfirmationDescDisabled", { defaultValue: "المركز مقفول من الإعدادات حالياً" })}
            </p>
          </div>
        </div>
      )}
      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-300">
            <ExclamationTriangleIcon className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h2 className="text-sm sm:text-base font-bold text-foreground">
              المركز مقفول من الإعدادات
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              تم إيقاف مركز التأكيد من إعدادات الطلبات، ولن تظهر أي طلبات في قائمة التأكيد حتى يتم تفعيله.
            </p>
            <div className="pt-3">
              <Link
                to="/settings/orders?tab=confirmation"
                className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white transition-all hover:bg-amber-700 active:scale-95"
              >
                <span>فتح إعدادات مركز التأكيد</span>
                <span dir="ltr">←</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
