import React, { useState } from "react";
import {
  ShieldCheck,
  AlertTriangle,
  User,
  Phone,
  Copy,
  Check,
} from "lucide-react";
import {
  CustomerRatingBadge,
  CustomerRatingLevel,
} from "../../../../../components/orders/CustomerRatingBadge";
import type { WorkspaceOrder } from "../../types";

export interface CustomerRatingDossierSectionProps {
  order: WorkspaceOrder;
  deliveryRate: number | null;
  totalDelivered: number;
  totalOrdersCount: number;
  isHighRisk: boolean;
  isVip: boolean;
  isArabic: boolean;
  onRatingChange?: (newRating: CustomerRatingLevel) => void;
}

export const CustomerRatingDossierSection: React.FC<CustomerRatingDossierSectionProps> = ({
  order,
  deliveryRate,
  totalDelivered,
  totalOrdersCount,
  isHighRisk,
  isVip,
  isArabic,
  onRatingChange,
}) => {
  const [copiedPhone, setCopiedPhone] = useState(false);

  const handleCopyPhone = (phone: string) => {
    if (!phone) return;
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard
        .writeText(phone)
        .then(() => {
          setCopiedPhone(true);
          setTimeout(() => setCopiedPhone(false), 2000);
        })
        .catch(() => {});
    }
  };

  return (
    <section className="space-y-2.5">
      {/* Rating Title & Interactive Badge */}
      <div className="flex items-center justify-between gap-1.5 font-bold text-foreground">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
          <span className="font-bold">{isArabic ? "تقييم العميل" : "Customer Rating"}</span>
        </div>
        <CustomerRatingBadge
          rating={order.customerStats?.customerRating || order.customerRating || "UNKNOWN"}
          orderNumber={order.orderNumber}
          customerId={order.customerId}
          deliveryRate={deliveryRate}
          totalDelivered={totalDelivered}
          totalAttempts={totalOrdersCount}
          orderStatus={order.status}
          interactive={true}
          size="sm"
          showLabel={true}
          onRatingChange={(newRating) => onRatingChange?.(newRating)}
        />
      </div>

      {/* Customer Contact Bar */}
      <div className="rounded-lg border border-border/50 bg-muted/20 p-2 space-y-1">
        <div className="flex items-center justify-between text-muted-foreground text-[11px]">
          <span className="flex items-center gap-1.5 min-w-0">
            <User className="h-3 w-3 text-muted-foreground/70 shrink-0" />
            <span
              className="font-semibold text-foreground truncate max-w-[130px]"
              title={order.customerName}
            >
              {order.customerName || (isArabic ? "عميل غير مسجل" : "Customer")}
            </span>
          </span>
          {order.customerPhone && (
            <button
              type="button"
              onClick={() => handleCopyPhone(order.customerPhone)}
              className="flex items-center gap-1 text-[10px] font-mono tabular-nums text-muted-foreground hover:text-foreground transition active:scale-95 shrink-0"
              title={isArabic ? "نسخ رقم الهاتف" : "Copy phone number"}
            >
              <Phone className="h-2.5 w-2.5" />
              <span dir="ltr">{order.customerPhone}</span>
              {copiedPhone ? (
                <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <Copy className="h-3 w-3 opacity-60 hover:opacity-100" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Delivery Reliability Bar */}
      <div className="space-y-1.5 rounded-lg border border-border/50 bg-muted/10 p-2.5">
        <div className="flex items-center justify-between text-muted-foreground">
          <span className="font-medium">{isArabic ? "نسبة الاستلام السابقة" : "Delivery Rate"}</span>
          <span className="font-mono font-bold tabular-nums text-foreground">
            {deliveryRate !== null ? `${Math.round(deliveryRate)}%` : isArabic ? "عميل جديد" : "New Customer"}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/60">
          <div
            className={`h-full transition-all duration-300 rounded-full ${
              deliveryRate === null
                ? "bg-slate-400 w-1/4"
                : deliveryRate >= 80
                  ? "bg-emerald-500"
                  : deliveryRate >= 50
                    ? "bg-amber-500"
                    : "bg-destructive"
            }`}
            style={{
              width: deliveryRate !== null ? `${Math.max(8, Math.min(100, deliveryRate))}%` : "25%",
            }}
          />
        </div>

        <div className="flex items-center justify-between pt-0.5 text-[10.5px] text-muted-foreground">
          <span>{isArabic ? "إجمالي الطلبات المستلمة" : "Total Delivered"}</span>
          <span className="font-mono font-bold tabular-nums text-foreground">
            {totalDelivered} / {totalOrdersCount}
          </span>
        </div>
      </div>

      {/* Alert / VIP Badges */}
      {isHighRisk && (
        <div className="flex items-center gap-1.5 rounded-lg border border-destructive/20 bg-destructive/10 p-2 text-[11px] font-semibold text-destructive">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>
            {isArabic
              ? "تنبيه: مرتجع مرتفع — يفضل طلب عربون شحن"
              : "High return risk — recommend shipping deposit"}
          </span>
        </div>
      )}

      {isVip && (
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-2 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
          <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span>
            {isArabic
              ? "عميل موثوق VIP — أولوية قصوى للشحن"
              : "VIP Customer — top fulfillment priority"}
          </span>
        </div>
      )}
    </section>
  );
};
