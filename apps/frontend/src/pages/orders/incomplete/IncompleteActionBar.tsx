import React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { ArrowRight, ArrowLeft, RotateCw, Ban } from "lucide-react";

interface IncompleteActionBarProps {
  hasOrder: boolean;
  converting: boolean;
  hasCustomerPhone: boolean;
  isRTL: boolean;
  onConvertToOrder: () => void;
  onOpenCancelModal: () => void;
}

export const IncompleteActionBar: React.FC<IncompleteActionBarProps> = ({
  hasOrder,
  converting,
  hasCustomerPhone,
  isRTL,
  onConvertToOrder,
  onOpenCancelModal,
}) => {
  const { t } = useTranslation();
  const BackIcon = isRTL ? ArrowRight : ArrowLeft;
  const ConvertIcon = isRTL ? ArrowLeft : ArrowRight;

  return (
    <div className="flex items-center justify-between flex-wrap gap-3 pb-2 border-b border-border/70">
      <div>
        <h1 className="text-xl font-black text-foreground">
          {t("orders.incompleteDetailsTitle") || "تفاصيل السلة المتروكة"}
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          {t("orders.incompleteDetailsSubtitle") || "متابعة بيانات العميل والمنتجات المتروكة واسترداد الطلب"}
        </p>
      </div>

      <div className="flex items-center gap-2">
        {hasOrder && (
          <>
            <button
              type="button"
              onClick={onConvertToOrder}
              disabled={converting || !hasCustomerPhone}
              className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-xs"
              title={!hasCustomerPhone ? t("orders.incompleteConvertNoPhone") || "لا يمكن التحويل لعدم وجود هاتف" : ""}
            >
              {converting ? (
                <RotateCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <ConvertIcon className="h-3.5 w-3.5" />
              )}
              <span>
                {converting
                  ? t("orders.incompleteConverting") || "جاري التحويل..."
                  : t("orders.incompleteConvertToOrder") || "تحويل لطلب مؤكد"}
              </span>
            </button>

            <button
              type="button"
              onClick={onOpenCancelModal}
              disabled={converting}
              className="inline-flex items-center gap-1.5 rounded-xl border border-destructive/30 bg-destructive/10 px-3.5 py-2 text-xs font-semibold text-destructive hover:bg-destructive/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title={t("orders.incompleteCancelOrder") || "إلغاء السلة"}
            >
              <Ban className="h-3.5 w-3.5" />
              <span>{t("orders.incompleteCancelOrder") || "إلغاء"}</span>
            </button>
          </>
        )}

        <Link
          to="/orders/incomplete"
          className="inline-flex items-center gap-1.5 rounded-xl border border-border/70 bg-card px-3 py-2 text-xs font-medium text-foreground hover:bg-muted transition-colors"
        >
          <BackIcon className="h-3.5 w-3.5" />
          <span>{t("orders.incompleteBack") || "رجوع"}</span>
        </Link>
      </div>
    </div>
  );
};
