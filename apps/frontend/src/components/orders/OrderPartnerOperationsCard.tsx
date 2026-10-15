import React from "react";
import { Link } from "react-router-dom";
import {
  ExternalLink,
  Archive,
  Store,
  Package,
  Users,
} from "lucide-react";
import { useCurrency } from "../../hooks/useCurrency";
import { cn } from "../../lib/utils";

type AffiliateInfo = {
  id?: string;
  affiliateCode?: string;
  status?: string;
  user?: {
    firstName?: string;
    lastName?: string;
    email?: string;
  };
};

export type MerchantOrderOperationsInfo = {
  id?: string;
  merchantId?: string | null;
  merchantName?: string | null;
  merchantEmail?: string | null;
  merchantFulfillmentMode?: string | null;
  status?: string | null;
  operationStatus?: string | null;
  fulfillmentSource?: string | null;
  warehouseId?: string | null;
  warehouseName?: string | null;
  shippingCompanyId?: string | null;
  shippingCompanyName?: string | null;
  trackingNumber?: string | null;
  shipmentStatus?: string | null;
  pieces?: number | null;
  merchantAmount?: number | null;
  merchantCommissionAmount?: number | null;
  affiliateCommissionAmount?: number | null;
  settlementStatus?: string | null;
};

interface OrderPartnerOperationsCardProps {
  affiliate?: AffiliateInfo | null;
  className?: string;
  compact?: boolean;
  merchantOrder?: MerchantOrderOperationsInfo | null;
}

type DetailItem = {
  label: string;
  value?: React.ReactNode;
  tone?: "default" | "emerald" | "amber" | "violet" | "sky";
};

const getAffiliateDisplayName = (affiliate?: AffiliateInfo | null) => {
  if (!affiliate) return "";
  const userName = `${affiliate.user?.firstName || ""} ${affiliate.user?.lastName || ""}`.trim();
  return (
    userName ||
    affiliate.affiliateCode ||
    affiliate.user?.email ||
    affiliate.id ||
    ""
  );
};

const getFulfillmentSourceText = (source?: string | null) => {
  switch (String(source || "").toUpperCase()) {
    case "COMPANY_WAREHOUSE":
      return "من مخزن الشركة";
    case "MERCHANT":
      return "من عند التاجر";
    default:
      return "";
  }
};

const getMerchantOperationStatusText = (status?: string | null) => {
  switch (String(status || "").toUpperCase()) {
    case "PREPARATION":
      return "قيد التجهيز";
    case "IN_SHIPPING":
      return "في الشحن";
    case "DELIVERED":
      return "تم التسليم";
    case "NOT_DELIVERED":
      return "مرتجع / لم يسلم";
    default:
      return "";
  }
};

const getMerchantSettlementStatusText = (status?: string | null) => {
  switch (String(status || "").toUpperCase()) {
    case "PAYABLE":
      return "مستحق للسحب";
    case "PENDING":
      return "مستحقات قيد التأكيد";
    case "PAID":
      return "تم السداد";
    case "NOT_PAYABLE":
      return "غير مستحق";
    default:
      return "";
  }
};

const formatOptionalText = (value?: string | null) => {
  const text = String(value || "").trim();
  return text || null;
};

const toneClasses: Record<NonNullable<DetailItem["tone"]>, string> = {
  default:
    "border-border/60 bg-background/80 text-foreground",
  emerald:
    "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  amber:
    "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  violet:
    "border-violet-500/20 bg-violet-500/10 text-violet-600 dark:text-violet-400",
  sky:
    "border-sky-500/20 bg-sky-500/10 text-sky-600 dark:text-sky-400",
};

const DetailCard: React.FC<{
  action?: React.ReactNode;
  icon: React.ElementType;
  items: DetailItem[];
  title: string;
}> = ({ action, icon: Icon, items, title }) => {
  const visibleItems = items.filter(
    (item) => item.value !== null && item.value !== undefined && item.value !== "",
  );

  if (visibleItems.length === 0 && !action) {
    return null;
  }

  return (
    <section className="rounded-xl border border-border/70 bg-card p-4 shadow-xs flex flex-col justify-between">
      <div>
        <div className="flex items-start justify-between gap-2.5">
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-muted/40 text-foreground">
              <Icon className="h-4 w-4" aria-hidden="true" />
            </span>
            <h5 className="truncate text-xs font-semibold text-foreground">
              {title}
            </h5>
          </div>
          {action}
        </div>

        {visibleItems.length > 0 && (
          <div className="mt-3.5 grid gap-2 sm:grid-cols-2">
            {visibleItems.map((item) => (
              <div
                key={item.label}
                className={cn(
                  "min-w-0 rounded-lg border px-2.5 py-1.5 text-xs font-mono tabular-nums",
                  toneClasses[item.tone || "default"],
                )}
              >
                <div className="text-[10px] font-medium opacity-70 font-sans">{item.label}</div>
                <div className="mt-0.5 truncate font-semibold">{item.value}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

const OrderPartnerOperationsCard: React.FC<OrderPartnerOperationsCardProps> = ({
  affiliate,
  className,
  compact = false,
  merchantOrder,
}) => {
  const { formatPrice } = useCurrency();

  const affiliateName = getAffiliateDisplayName(affiliate);
  const affiliateEmail = formatOptionalText(affiliate?.user?.email);
  const affiliateCode = formatOptionalText(affiliate?.affiliateCode);
  const operationLabel = getMerchantOperationStatusText(
    merchantOrder?.operationStatus,
  );
  const fulfillmentLabel = getFulfillmentSourceText(
    merchantOrder?.fulfillmentSource,
  );
  const settlementLabel = getMerchantSettlementStatusText(
    merchantOrder?.settlementStatus,
  );
  const merchantName =
    formatOptionalText(merchantOrder?.merchantName) ||
    formatOptionalText(merchantOrder?.merchantEmail) ||
    formatOptionalText(merchantOrder?.merchantId);
  const warehouseName =
    formatOptionalText(merchantOrder?.warehouseName) ||
    (String(merchantOrder?.fulfillmentSource || "").toUpperCase() ===
    "COMPANY_WAREHOUSE"
      ? "مخزن الشركة"
      : null);
  const merchantAmount =
    typeof merchantOrder?.merchantAmount === "number" &&
    Number.isFinite(merchantOrder.merchantAmount)
      ? formatPrice(merchantOrder.merchantAmount)
      : null;
  const merchantCommission =
    typeof merchantOrder?.merchantCommissionAmount === "number" &&
    Number.isFinite(merchantOrder.merchantCommissionAmount)
      ? formatPrice(merchantOrder.merchantCommissionAmount)
      : null;
  const affiliateCommission =
    typeof merchantOrder?.affiliateCommissionAmount === "number" &&
    Number.isFinite(merchantOrder.affiliateCommissionAmount)
      ? formatPrice(merchantOrder.affiliateCommissionAmount)
      : null;

  const hasMerchantContext = Boolean(merchantName || merchantCommission);
  const hasWarehouseContext = Boolean(
    fulfillmentLabel ||
      warehouseName ||
      merchantOrder?.shippingCompanyName ||
      merchantOrder?.trackingNumber ||
      merchantOrder?.shipmentStatus,
  );
  const hasAffiliateContext = Boolean(affiliateName || affiliateCommission);

  if (!hasMerchantContext && !hasWarehouseContext && !hasAffiliateContext) {
    return null;
  }

  const merchantAction = merchantOrder?.merchantId ? (
    <Link
      to={`/merchants/${merchantOrder.merchantId}`}
      className="inline-flex h-7 items-center gap-1 rounded-lg border border-border/70 bg-muted/40 hover:bg-muted px-2 text-[11px] font-medium text-foreground transition-colors"
    >
      <ExternalLink className="h-3 w-3" aria-hidden="true" />
      <span>فتح التاجر</span>
    </Link>
  ) : null;

  const affiliateAction = affiliate?.id ? (
    <Link
      to={`/affiliates/management/${affiliate.id}`}
      className="inline-flex h-7 items-center gap-1 rounded-lg border border-border/70 bg-muted/40 hover:bg-muted px-2 text-[11px] font-medium text-foreground transition-colors"
    >
      <ExternalLink className="h-3 w-3" aria-hidden="true" />
      <span>فتح المسوق</span>
    </Link>
  ) : null;

  return (
    <div
      className={cn(
        "rounded-2xl border border-border/70 bg-card p-4 shadow-sm text-card-foreground space-y-3.5",
        className,
      )}
      dir="rtl"
    >
      <div className="flex flex-col gap-0.5">
        <h4
          className={cn(
            "font-semibold text-foreground tracking-tight",
            compact ? "text-xs" : "text-sm",
          )}
        >
          بيانات تشغيل الطلب والشركاء
        </h4>
        <p className="text-[11px] text-muted-foreground">
          تفاصيل التاجر، المخزن المشحن منه، والمسوق المحال من خلاله
        </p>
      </div>

      <div className="grid gap-3 xl:grid-cols-3">
        <DetailCard
          title="التاجر والأرباح"
          icon={Store}
          action={merchantAction}
          items={[
            { label: "التاجر", value: merchantName, tone: "emerald" },
            {
              label: "البريد",
              value: formatOptionalText(merchantOrder?.merchantEmail),
            },
            { label: "حالة التشغيل", value: operationLabel, tone: "sky" },
            {
              label: "عدد القطع",
              value:
                typeof merchantOrder?.pieces === "number" &&
                merchantOrder.pieces > 0
                  ? `${merchantOrder.pieces} قطعة`
                  : null,
            },
            { label: "قيمة التاجر", value: merchantAmount },
            {
              label: "مستحق التاجر",
              value: merchantCommission,
              tone: "emerald",
            },
            { label: "التسوية", value: settlementLabel, tone: "amber" },
          ]}
        />

        <DetailCard
          title="المخزن والتنفيذ"
          icon={Archive}
          action={
            hasWarehouseContext ? (
              <Link
                to="/inventory"
                className="inline-flex h-7 items-center gap-1 rounded-lg border border-border/70 bg-muted/40 hover:bg-muted px-2 text-[11px] font-medium text-foreground transition-colors"
              >
                <Package className="h-3 w-3" aria-hidden="true" />
                <span>فتح المخزون</span>
              </Link>
            ) : null
          }
          items={[
            { label: "مصدر التنفيذ", value: fulfillmentLabel, tone: "amber" },
            { label: "المخزن", value: warehouseName },
            {
              label: "شركة الشحن",
              value: formatOptionalText(merchantOrder?.shippingCompanyName),
              tone: "sky",
            },
            {
              label: "رقم التتبع",
              value: formatOptionalText(merchantOrder?.trackingNumber),
            },
            {
              label: "حالة الشحنة",
              value: formatOptionalText(merchantOrder?.shipmentStatus),
            },
          ]}
        />

        <DetailCard
          title="المسوق والأرباح"
          icon={Users}
          action={affiliateAction}
          items={[
            { label: "المسوق", value: affiliateName, tone: "violet" },
            { label: "كود المسوق", value: affiliateCode },
            { label: "البريد", value: affiliateEmail },
            {
              label: "حالة الحساب",
              value: formatOptionalText(affiliate?.status),
            },
            {
              label: "ربح المسوق",
              value: affiliateCommission,
              tone: "violet",
            },
          ]}
        />
      </div>
    </div>
  );
};

export default OrderPartnerOperationsCard;
