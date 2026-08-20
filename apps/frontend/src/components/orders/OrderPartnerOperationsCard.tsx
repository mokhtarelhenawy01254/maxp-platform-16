import React from "react";
import { Link } from "react-router-dom";
import {
  ArrowTopRightOnSquareIcon,
  ArchiveBoxIcon,
  BuildingStorefrontIcon,
  CubeIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
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
    "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-950/50 dark:text-slate-200",
  emerald:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200",
  amber:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200",
  violet:
    "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-500/20 dark:bg-violet-500/10 dark:text-violet-200",
  sky:
    "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-200",
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
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">
            <Icon className="h-5 w-5" aria-hidden="true" />
          </span>
          <h5 className="truncate text-sm font-bold text-slate-900 dark:text-white">
            {title}
          </h5>
        </div>
        {action}
      </div>

      {visibleItems.length > 0 ? (
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {visibleItems.map((item) => (
            <div
              key={item.label}
              className={cn(
                "min-w-0 rounded-lg border px-3 py-2 text-xs",
                toneClasses[item.tone || "default"],
              )}
            >
              <div className="font-medium opacity-75">{item.label}</div>
              <div className="mt-1 truncate font-semibold">{item.value}</div>
            </div>
          ))}
        </div>
      ) : null}
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
      className="inline-flex h-8 items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200"
    >
      <ArrowTopRightOnSquareIcon className="h-4 w-4" aria-hidden="true" />
      فتح التاجر
    </Link>
  ) : null;
  const affiliateAction = affiliate?.id ? (
    <Link
      to={`/affiliates/management/${affiliate.id}`}
      className="inline-flex h-8 items-center gap-1 rounded-lg border border-violet-200 bg-violet-50 px-2.5 text-xs font-semibold text-violet-700 transition hover:bg-violet-100 dark:border-violet-500/20 dark:bg-violet-500/10 dark:text-violet-200"
    >
      <ArrowTopRightOnSquareIcon className="h-4 w-4" aria-hidden="true" />
      فتح المسوق
    </Link>
  ) : null;

  return (
    <div
      className={cn(
        "rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-700 dark:bg-slate-950/40",
        className,
      )}
    >
      <div className="mb-4 flex flex-col gap-1">
        <h4
          className={cn(
            "font-bold text-slate-900 dark:text-white",
            compact ? "text-sm" : "text-base",
          )}
        >
          تشغيل الطلب
        </h4>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          مراجعة التشغيل والعمولات المرتبطة بالطلب.
        </p>
      </div>

      <div className="grid gap-3 xl:grid-cols-3">
        <DetailCard
          title="التاجر والأرباح"
          icon={BuildingStorefrontIcon}
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
          icon={ArchiveBoxIcon}
          action={
            hasWarehouseContext ? (
              <Link
                to="/inventory"
                className="inline-flex h-8 items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2.5 text-xs font-semibold text-amber-700 transition hover:bg-amber-100 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200"
              >
                <CubeIcon className="h-4 w-4" aria-hidden="true" />
                فتح المخزون
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
          icon={UserGroupIcon}
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
