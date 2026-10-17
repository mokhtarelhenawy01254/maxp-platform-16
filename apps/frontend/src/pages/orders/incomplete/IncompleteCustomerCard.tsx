import React from "react";
import { useTranslation } from "react-i18next";
import { Phone, MessageCircle } from "lucide-react";

interface CustomerInfo {
  name: string;
  phone?: string | null;
  email?: string | null;
}

interface IncompleteCustomerCardProps {
  customerInfo: CustomerInfo;
  cartId: string;
  whatsappUrl: string | null;
}

export const IncompleteCustomerCard: React.FC<IncompleteCustomerCardProps> = ({
  customerInfo,
  cartId,
  whatsappUrl,
}) => {
  const { t } = useTranslation();

  return (
    <div className="rounded-xl border border-border/70 bg-card p-5 shadow-xs">
      <h2 className="text-sm font-bold text-foreground">
        {t("orders.incompleteCustomerInfo") || "بيانات العميل والاتصال"}
      </h2>
      <div className="mt-3.5 space-y-3 text-xs">
        <div>
          <div className="text-[11px] text-muted-foreground font-medium">
            {t("orders.incompleteCustomerName") || "اسم العميل"}
          </div>
          <div className="mt-1 font-semibold text-foreground">
            {customerInfo.name}
          </div>
        </div>

        <div>
          <div className="text-[11px] text-muted-foreground font-medium">
            {t("orders.incompleteContactPhone") || "رقم الهاتف"}
          </div>
          <div className="mt-1 font-mono tabular-nums font-semibold text-foreground">
            {customerInfo.phone || t("orders.notSpecified") || "غير محدد"}
          </div>
        </div>

        <div>
          <div className="text-[11px] text-muted-foreground font-medium">
            {t("orders.incompleteContactEmail") || "البريد الإلكتروني"}
          </div>
          <div className="mt-1 font-medium text-foreground">
            {customerInfo.email || t("orders.notSpecified") || "غير محدد"}
          </div>
        </div>

        <div>
          <div className="text-[11px] text-muted-foreground font-medium">
            {t("orders.cartId") || "معرف السلة"}
          </div>
          <div className="mt-1 font-mono text-xs text-muted-foreground">
            {cartId}
          </div>
        </div>

        {customerInfo.phone && (
          <div className="flex items-center gap-2 pt-2 border-t border-border/40">
            <a
              href={`tel:${customerInfo.phone.replace(/\D/g, "")}`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors"
            >
              <Phone className="h-3.5 w-3.5" />
              <span>{t("orders.incompleteCall") || "اتصال هاتفي"}</span>
            </a>
            {whatsappUrl && (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                <span>{t("orders.incompleteWhatsApp") || "واتساب"}</span>
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
