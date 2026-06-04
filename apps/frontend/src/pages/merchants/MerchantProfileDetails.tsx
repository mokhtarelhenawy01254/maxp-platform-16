import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
  ArchiveBoxIcon,
  ArrowLeftIcon,
  BanknotesIcon,
  BuildingStorefrontIcon,
  ClipboardDocumentListIcon,
  CreditCardIcon,
  CubeIcon,
  PencilSquareIcon,
  ReceiptPercentIcon,
  ShoppingBagIcon,
  TruckIcon,
  UserCircleIcon,
} from "@heroicons/react/24/outline";
import { apiClient } from "../../services/apiClient";
import { useCurrency } from "../../hooks/useCurrency";

type MoneyValue = number | string | null | undefined;

interface ApiSuccess<T> {
  success: boolean;
  data: T;
  message?: string;
}

interface MerchantUser {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  avatar?: string | null;
  isActive?: boolean;
  isEmailVerified?: boolean;
  emailVerifiedAt?: string | null;
  lastLoginAt?: string | null;
  createdAt?: string | null;
}

interface MerchantInventorySnapshot {
  stockLocation?: string;
  stockLocationLabel?: string;
  canEditStock?: boolean;
  warehouseNames?: string[];
  warehouseName?: string | null;
  merchantProductStock?: number;
  physicalQuantity?: number;
  physicalAvailable?: number;
  reservedQuantity?: number;
  availableForSale?: number;
}

interface MerchantProduct {
  id: string;
  merchantSku?: string | null;
  merchantPrice?: MoneyValue;
  stock?: number | null;
  isActive?: boolean;
  syncEnabled?: boolean;
  lastSyncedAt?: string | null;
  inventorySnapshot?: MerchantInventorySnapshot | null;
  product?: {
    id: string;
    name?: string | null;
    sku?: string | null;
    price?: MoneyValue;
    stock?: number | null;
    isActive?: boolean;
  } | null;
}

interface MerchantInventorySummary {
  linkedProducts?: number;
  availableForSale?: number;
  merchantProductStock?: number;
  physicalQuantity?: number;
  physicalAvailable?: number;
  reservedQuantity?: number;
  stockLocation?: string;
  stockLocationLabel?: string;
  warehouseNames?: string[];
}

interface MerchantOperationRow {
  id: string;
  orderId?: string;
  orderNumber?: string;
  createdAt?: string;
  customerName?: string;
  customerPhone?: string;
  fulfillmentSource?: string;
  warehouseName?: string | null;
  shippingCompanyName?: string | null;
  trackingNumber?: string | null;
  merchantOrderStatus?: string;
  shipmentStatus?: string;
  orderStatus?: string;
  operationStatus?: string;
  pieces?: number;
  merchantAmount?: MoneyValue;
  commissionAmount?: MoneyValue;
  shippingCost?: MoneyValue;
  payablePieces?: number;
  pendingPayablePieces?: number;
  payableAmount?: MoneyValue;
  expectedAmount?: MoneyValue;
}

interface MerchantOperationsSummary {
  summary?: {
    assignedOrdersCount?: number;
    assignedPieces?: number;
    preparationOrdersCount?: number;
    preparationPieces?: number;
    inShippingOrdersCount?: number;
    inShippingPieces?: number;
    deliveredOrdersCount?: number;
    deliveredPieces?: number;
    notDeliveredOrdersCount?: number;
    notDeliveredPieces?: number;
    payablePieces?: number;
    pendingPayablePieces?: number;
    expectedReceivableAmount?: MoneyValue;
    inShippingAmount?: MoneyValue;
    deliveredPayableAmount?: MoneyValue;
    notDeliveredAmount?: MoneyValue;
    shippingCostAmount?: MoneyValue;
    confirmedCommissionAmount?: MoneyValue;
    pendingCommissionAmount?: MoneyValue;
    paidAmount?: MoneyValue;
  };
  rows?: MerchantOperationRow[];
  pagination?: {
    total: number;
    limit: number;
    offset: number;
  };
}

interface MerchantRecord {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  address?: string | null;
  commissionRate: number;
  autoFulfill?: boolean;
  fulfillmentMode?: string | null;
  defaultWarehouseId?: string | null;
  defaultShippingCompanyId?: string | null;
  webhookUrl?: string | null;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
  products?: MerchantProduct[];
  inventorySummary?: MerchantInventorySummary | null;
  operationsSummary?: MerchantOperationsSummary | null;
  _count?: {
    merchantOrders?: number;
    merchantProducts?: number;
    commissions?: number;
    merchant_payouts?: number;
    orders?: number;
  };
}

interface MerchantCommissionRow {
  id: string;
  amount: MoneyValue;
  status: string;
  type?: string | null;
  calculationType?: string | null;
  rate?: number | null;
  markup?: MoneyValue;
  baseAmount?: MoneyValue;
  orderTotal: MoneyValue;
  merchantPayoutId?: string | null;
  paidAt?: string | null;
  createdAt: string;
  order?: {
    id: string;
    orderNumber?: string | null;
    status?: string | null;
    total?: MoneyValue;
    createdAt?: string | null;
  } | null;
  merchant_payout?: {
    id: string;
    status?: string | null;
    createdAt?: string | null;
    processedAt?: string | null;
  } | null;
}

interface MerchantPayoutRow {
  id: string;
  amount: MoneyValue;
  currency?: string | null;
  status: string;
  paymentMethod?: string | null;
  paymentDetails?: string | null;
  transactionId?: string | null;
  externalReference?: string | null;
  processedAt?: string | null;
  processedBy?: string | null;
  notes?: string | null;
  createdAt: string;
  commissions?: Array<{
    id: string;
    amount: MoneyValue;
    status: string;
    order?: {
      id: string;
      orderNumber?: string | null;
      status?: string | null;
    } | null;
  }>;
}

interface MerchantWarehouse {
  id: string;
  name: string;
  location?: string | null;
  type?: string | null;
  isActive?: boolean;
  createdAt?: string | null;
  _count?: {
    inventories?: number;
    shipments?: number;
  };
}

interface ShippingCompany {
  id: string;
  name: string;
  slug?: string | null;
  phone?: string | null;
  providerKey?: string | null;
  integrationMode?: string | null;
  isActive?: boolean;
}

interface MerchantProfileStats {
  linkedProducts: number;
  availableForSale: number;
  merchantProductStock: number;
  physicalQuantity: number;
  physicalAvailable: number;
  reservedQuantity: number;
  ordersCount: number;
  assignedPieces: number;
  deliveredOrders: number;
  deliveredPieces: number;
  inShippingOrders: number;
  inShippingPieces: number;
  notDeliveredOrders: number;
  notDeliveredPieces: number;
  payablePieces: number;
  pendingPayablePieces: number;
  expectedReceivableAmount: MoneyValue;
  deliveredPayableAmount: MoneyValue;
  inShippingAmount: MoneyValue;
  notDeliveredAmount: MoneyValue;
  shippingCostAmount: MoneyValue;
  commissionsCount: number;
  confirmedCommissionAmount: MoneyValue;
  pendingCommissionAmount: MoneyValue;
  paidCommissionAmount: MoneyValue;
  cancelledCommissionAmount: MoneyValue;
  availablePayoutAmount: MoneyValue;
  availableCommissionsCount: number;
  pendingPayoutAmount: MoneyValue;
  confirmedPayoutAmount: MoneyValue;
  paidPayoutAmount: MoneyValue;
  payoutRequestsCount: number;
  processedPayoutAmount: MoneyValue;
}

interface MerchantProfileResponse {
  merchant: MerchantRecord;
  user?: MerchantUser | null;
  defaultWarehouse?: MerchantWarehouse | null;
  defaultShippingCompany?: ShippingCompany | null;
  merchantWarehouses: MerchantWarehouse[];
  inventorySummary?: MerchantInventorySummary | null;
  operationsSummary?: MerchantOperationsSummary | null;
  products: MerchantProduct[];
  commissions: MerchantCommissionRow[];
  payouts: MerchantPayoutRow[];
  stats: MerchantProfileStats;
}

const getApiErrorMessage = (error: unknown, fallback: string) => {
  if (
    error &&
    typeof error === "object" &&
    "response" in error &&
    error.response &&
    typeof error.response === "object" &&
    "data" in error.response &&
    error.response.data &&
    typeof error.response.data === "object" &&
    "message" in error.response.data &&
    typeof error.response.data.message === "string"
  ) {
    return error.response.data.message;
  }

  return fallback;
};

const toNumber = (value: MoneyValue) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatInteger = (value: MoneyValue) =>
  toNumber(value).toLocaleString("ar-EG", {
    maximumFractionDigits: 0,
  });

const formatDate = (date?: string | null) => {
  if (!date) return "غير محدد";
  return new Date(date).toLocaleString("ar-EG", {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

const getDisplayName = (user?: MerchantUser | null, fallback?: string) => {
  const fullName = `${user?.firstName || ""} ${user?.lastName || ""}`.trim();
  return fullName || fallback || user?.email || "تاجر بدون اسم";
};

const parsePaymentDetails = (value?: string | null) => {
  const text = String(value || "").trim();
  if (!text) return "غير محدد";

  try {
    const parsed = JSON.parse(text) as Record<string, unknown>;
    return Object.entries(parsed)
      .map(([key, item]) => `${key}: ${String(item)}`)
      .join("، ");
  } catch (_) {
    return text;
  }
};

const statusLabels: Record<string, string> = {
  ACTIVE: "نشط",
  INACTIVE: "غير نشط",
  PENDING: "قيد الانتظار",
  CONFIRMED: "مؤكدة",
  PAID: "تم السداد",
  PROCESSED: "تم التحويل",
  CANCELLED: "ملغية",
  FAILED: "فشل",
  DELIVERED: "تم التسليم",
  PROCESSING: "قيد التنفيذ",
  SHIPPED: "تم الشحن",
  FULFILLED: "تم التنفيذ",
  PREPARATION: "قيد التجهيز",
  IN_SHIPPING: "في الشحن",
  NOT_DELIVERED: "مرتجع أو لم يسلم",
  MERCHANT: "عند التاجر",
  COMPANY_WAREHOUSE: "مخزن الشركة",
};

const fulfillmentModeLabels: Record<string, string> = {
  MERCHANT: "التاجر يشحن من عنده",
  COMPANY_WAREHOUSE: "التاجر يسلم لمخزن الشركة",
};

const statusTone = (status?: string | null) => {
  switch (String(status || "").toUpperCase()) {
    case "ACTIVE":
    case "CONFIRMED":
    case "DELIVERED":
    case "PAID":
    case "PROCESSED":
    case "FULFILLED":
      return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200";
    case "PENDING":
    case "PROCESSING":
    case "SHIPPED":
    case "PREPARATION":
    case "IN_SHIPPING":
      return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200";
    case "CANCELLED":
    case "FAILED":
    case "NOT_DELIVERED":
    case "INACTIVE":
      return "border-red-200 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-200";
    default:
      return "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300";
  }
};

const Badge: React.FC<{ label: React.ReactNode; tone?: string }> = ({
  label,
  tone,
}) => (
  <span
    className={`inline-flex min-h-7 items-center rounded-full border px-3 py-1 text-xs font-bold ${tone || statusTone()}`}
  >
    {label}
  </span>
);

const MetricCard: React.FC<{
  icon: React.ElementType;
  label: string;
  sub?: string;
  value: React.ReactNode;
}> = ({ icon: Icon, label, sub, value }) => (
  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
          {label}
        </p>
        <div className="mt-2 text-xl font-bold text-slate-950 dark:text-white">
          {value}
        </div>
      </div>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
    </div>
    {sub ? <p className="mt-3 text-xs text-slate-500">{sub}</p> : null}
  </div>
);

const InfoRow: React.FC<{ label: string; value: React.ReactNode }> = ({
  label,
  value,
}) => (
  <div className="flex items-start justify-between gap-4 border-b border-slate-100 py-3 last:border-0 dark:border-slate-800">
    <span className="text-sm text-slate-500 dark:text-slate-400">{label}</span>
    <span className="max-w-[65%] text-left text-sm font-semibold text-slate-900 dark:text-white">
      {value || "غير محدد"}
    </span>
  </div>
);

const EmptyState: React.FC<{ text: string }> = ({ text }) => (
  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400">
    {text}
  </div>
);

const MerchantProfileDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { formatPrice } = useCurrency();
  const [profile, setProfile] = useState<MerchantProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async () => {
    if (!id) return;

    try {
      setLoading(true);
      const response = await apiClient.get<ApiSuccess<MerchantProfileResponse>>(
        `/merchants/${id}/profile`,
      );
      if (response.data.success) {
        setProfile(response.data.data);
      }
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "فشل تحميل ملف التاجر"));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const merchant = profile?.merchant;
  const user = profile?.user;
  const stats = profile?.stats;
  const displayName = useMemo(
    () => getDisplayName(user, merchant?.name),
    [merchant?.name, user],
  );
  const fulfillmentMode = String(merchant?.fulfillmentMode || "MERCHANT");

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (!profile || !merchant || !stats) {
    return (
      <div className="p-6">
        <button
          onClick={() => navigate("/merchants")}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          رجوع للتجار
        </button>
        <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-8 text-red-700">
          ملف التاجر غير متاح.
        </div>
      </div>
    );
  }

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-slate-50 px-3 py-4 text-slate-900 dark:bg-slate-950 dark:text-white sm:px-6 sm:py-6"
    >
      <div className="mx-auto max-w-7xl space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            onClick={() => navigate("/merchants")}
            className="inline-flex min-h-10 w-fit items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            إدارة التجار
          </button>
          <div className="flex flex-wrap gap-2">
            <Link
              to={`/orders?page=1&limit=20&merchantId=${merchant.id}`}
              className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950"
            >
              <ShoppingBagIcon className="h-4 w-4" />
              طلبات هذا التاجر
            </Link>
            <Link
              to={`/merchants/${merchant.id}/edit`}
              className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              <PencilSquareIcon className="h-4 w-4" />
              تعديل وإدارة الربط
            </Link>
          </div>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex min-w-0 items-start gap-4">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-200">
                <BuildingStorefrontIcon className="h-9 w-9" />
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="truncate text-2xl font-bold sm:text-3xl">
                    ملف التاجر: {displayName}
                  </h1>
                  <Badge
                    label={merchant.isActive ? "نشط" : "غير نشط"}
                    tone={statusTone(merchant.isActive ? "ACTIVE" : "INACTIVE")}
                  />
                  <Badge
                    label={fulfillmentModeLabels[fulfillmentMode] || fulfillmentMode}
                    tone={statusTone(fulfillmentMode)}
                  />
                </div>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500 dark:text-slate-400">
                  <span>{merchant.email || "بدون بريد"}</span>
                  <span>{merchant.phone || "بدون هاتف"}</span>
                  <span>عمولة التاجر: {formatInteger(merchant.commissionRate)}%</span>
                  <span>منذ {formatDate(merchant.createdAt)}</span>
                </div>
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2 lg:min-w-[360px]">
              <Badge
                label={`المنتجات: ${formatInteger(stats.linkedProducts)}`}
                tone={statusTone("CONFIRMED")}
              />
              <Badge
                label={`الطلبات: ${formatInteger(stats.ordersCount)}`}
                tone={statusTone("IN_SHIPPING")}
              />
              <Badge
                label={`قابل للسحب: ${formatPrice(toNumber(stats.availablePayoutAmount))}`}
                tone={statusTone("PAID")}
              />
              <Badge
                label={`الرصيد المتاح: ${formatInteger(stats.availableForSale)} قطعة`}
                tone={statusTone("ACTIVE")}
              />
            </div>
          </div>
        </section>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            icon={BanknotesIcon}
            label="المتاح للسحب"
            value={formatPrice(toNumber(stats.availablePayoutAmount))}
            sub={`${formatInteger(stats.availableCommissionsCount)} عمولة مؤهلة للسحب`}
          />
          <MetricCard
            icon={ReceiptPercentIcon}
            label="عمولات مؤكدة"
            value={formatPrice(toNumber(stats.confirmedCommissionAmount))}
            sub={`${formatInteger(stats.commissionsCount)} سجل عمولة`}
          />
          <MetricCard
            icon={ArchiveBoxIcon}
            label="الرصيد الفعلي"
            value={`${formatInteger(stats.availableForSale)} قطعة`}
            sub={`${formatInteger(stats.reservedQuantity)} محجوز، ${formatInteger(stats.physicalAvailable)} متاح فعلي`}
          />
          <MetricCard
            icon={ShoppingBagIcon}
            label="طلبات التاجر"
            value={formatInteger(stats.ordersCount)}
            sub={`${formatInteger(stats.deliveredOrders)} مسلم، ${formatInteger(stats.inShippingOrders)} في الشحن`}
          />
        </div>

        <div className="grid gap-5 xl:grid-cols-[1fr_390px]">
          <div className="space-y-5">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-lg font-bold">تاريخ الطلبات المرتبطة</h2>
                <Link
                  to={`/orders?page=1&limit=20&merchantId=${merchant.id}`}
                  className="text-sm font-semibold text-indigo-600 hover:underline dark:text-indigo-300"
                >
                  فتح كل طلبات التاجر
                </Link>
              </div>
              <div className="mt-4 overflow-x-auto">
                {profile.operationsSummary?.rows?.length ? (
                  <table className="min-w-full text-right text-sm">
                    <thead className="text-xs text-slate-500">
                      <tr>
                        <th className="py-2">رقم الطلب</th>
                        <th className="py-2">العميل</th>
                        <th className="py-2">التنفيذ</th>
                        <th className="py-2">القطع</th>
                        <th className="py-2">مستحق</th>
                        <th className="py-2">التاريخ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {profile.operationsSummary.rows.map((order) => (
                        <tr key={order.id}>
                          <td className="py-3">
                            <Link
                              to={`/orders/${order.orderNumber}`}
                              className="font-semibold text-indigo-600 hover:underline dark:text-indigo-300"
                            >
                              {order.orderNumber}
                            </Link>
                          </td>
                          <td className="py-3 text-slate-600 dark:text-slate-300">
                            <div className="font-semibold">
                              {order.customerName || "عميل غير محدد"}
                            </div>
                            <div className="text-xs text-slate-400">
                              {order.customerPhone || "بدون هاتف"}
                            </div>
                          </td>
                          <td className="py-3">
                            <div className="flex flex-wrap gap-1">
                              <Badge
                                label={
                                  statusLabels[order.operationStatus || ""] ||
                                  order.operationStatus ||
                                  "غير محدد"
                                }
                                tone={statusTone(order.operationStatus)}
                              />
                              <Badge
                                label={
                                  order.fulfillmentSource === "COMPANY_WAREHOUSE"
                                    ? "من مخزن الشركة"
                                    : "من عند التاجر"
                                }
                              />
                            </div>
                            <div className="mt-1 text-xs text-slate-500">
                              {order.warehouseName || order.shippingCompanyName
                                ? `${order.warehouseName || "بدون مخزن"} · ${
                                    order.shippingCompanyName || "بدون شركة شحن"
                                  }`
                                : "بدون تفاصيل شحن"}
                            </div>
                          </td>
                          <td className="py-3 font-semibold">
                            {formatInteger(order.pieces)}
                          </td>
                          <td className="py-3 font-semibold">
                            {formatPrice(toNumber(order.payableAmount))}
                          </td>
                          <td className="py-3 text-slate-500">
                            {formatDate(order.createdAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <EmptyState text="لا توجد طلبات مرتبطة بهذا التاجر حتى الآن." />
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <h2 className="text-lg font-bold">عمولات التاجر</h2>
              <div className="mt-4 overflow-x-auto">
                {profile.commissions.length ? (
                  <table className="min-w-full text-right text-sm">
                    <thead className="text-xs text-slate-500">
                      <tr>
                        <th className="py-2">الطلب</th>
                        <th className="py-2">الحالة</th>
                        <th className="py-2">العمولة</th>
                        <th className="py-2">قيمة الطلب</th>
                        <th className="py-2">السحب</th>
                        <th className="py-2">التاريخ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {profile.commissions.map((commission) => (
                        <tr key={commission.id}>
                          <td className="py-3">
                            {commission.order?.orderNumber ? (
                              <Link
                                to={`/orders/${commission.order.orderNumber}`}
                                className="font-semibold text-indigo-600 hover:underline dark:text-indigo-300"
                              >
                                {commission.order.orderNumber}
                              </Link>
                            ) : (
                              "طلب غير محدد"
                            )}
                          </td>
                          <td className="py-3">
                            <Badge
                              label={
                                statusLabels[commission.status] ||
                                commission.status
                              }
                              tone={statusTone(commission.status)}
                            />
                          </td>
                          <td className="py-3 font-semibold">
                            {formatPrice(toNumber(commission.amount))}
                          </td>
                          <td className="py-3 text-slate-600 dark:text-slate-300">
                            {formatPrice(toNumber(commission.orderTotal))}
                          </td>
                          <td className="py-3 text-slate-500">
                            {commission.merchant_payout ? (
                              <Badge
                                label={
                                  statusLabels[
                                    commission.merchant_payout.status || ""
                                  ] ||
                                  commission.merchant_payout.status ||
                                  "مرتبط"
                                }
                                tone={statusTone(commission.merchant_payout.status)}
                              />
                            ) : (
                              "لم يطلب بعد"
                            )}
                          </td>
                          <td className="py-3 text-slate-500">
                            {formatDate(commission.createdAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <EmptyState text="لا توجد عمولات مسجلة لهذا التاجر." />
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <h2 className="text-lg font-bold">طلبات السحب</h2>
              <div className="mt-4 overflow-x-auto">
                {profile.payouts.length ? (
                  <table className="min-w-full text-right text-sm">
                    <thead className="text-xs text-slate-500">
                      <tr>
                        <th className="py-2">المبلغ</th>
                        <th className="py-2">الحالة</th>
                        <th className="py-2">طريقة الدفع</th>
                        <th className="py-2">مرجع التحويل</th>
                        <th className="py-2">التاريخ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {profile.payouts.map((payout) => (
                        <tr key={payout.id}>
                          <td className="py-3 font-semibold">
                            {formatPrice(toNumber(payout.amount), payout.currency || undefined)}
                          </td>
                          <td className="py-3">
                            <Badge
                              label={statusLabels[payout.status] || payout.status}
                              tone={statusTone(payout.status)}
                            />
                          </td>
                          <td className="py-3 text-slate-600 dark:text-slate-300">
                            <div>{payout.paymentMethod || "غير محدد"}</div>
                            <div className="text-xs text-slate-400">
                              {parsePaymentDetails(payout.paymentDetails)}
                            </div>
                          </td>
                          <td className="py-3 text-slate-500">
                            {payout.externalReference ||
                              payout.transactionId ||
                              "بدون مرجع"}
                          </td>
                          <td className="py-3 text-slate-500">
                            {formatDate(payout.processedAt || payout.createdAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <EmptyState text="لا توجد طلبات سحب لهذا التاجر." />
                )}
              </div>
            </section>
          </div>

          <aside className="space-y-5">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <div className="flex items-center gap-2">
                <UserCircleIcon className="h-5 w-5 text-slate-500" />
                <h2 className="text-lg font-bold">بيانات الحساب</h2>
              </div>
              <div className="mt-4">
                <InfoRow label="اسم التاجر" value={merchant.name} />
                <InfoRow label="البريد" value={merchant.email} />
                <InfoRow label="الهاتف" value={merchant.phone} />
                <InfoRow label="العنوان" value={merchant.address} />
                <InfoRow
                  label="حساب الدخول"
                  value={
                    user ? (
                      <Badge
                        label={user.isActive ? "نشط" : "غير نشط"}
                        tone={statusTone(user.isActive ? "ACTIVE" : "INACTIVE")}
                      />
                    ) : (
                      "غير مربوط بمستخدم"
                    )
                  }
                />
                <InfoRow
                  label="آخر دخول"
                  value={user ? formatDate(user.lastLoginAt) : "غير محدد"}
                />
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <div className="flex items-center gap-2">
                <TruckIcon className="h-5 w-5 text-slate-500" />
                <h2 className="text-lg font-bold">إعدادات التشغيل</h2>
              </div>
              <div className="mt-4">
                <InfoRow
                  label="مسار التنفيذ"
                  value={fulfillmentModeLabels[fulfillmentMode] || fulfillmentMode}
                />
                <InfoRow
                  label="التنفيذ التلقائي"
                  value={merchant.autoFulfill ? "مفعل" : "غير مفعل"}
                />
                <InfoRow
                  label="المخزن الافتراضي"
                  value={profile.defaultWarehouse?.name || "غير محدد"}
                />
                <InfoRow
                  label="شركة الشحن"
                  value={profile.defaultShippingCompany?.name || "غير محدد"}
                />
                <InfoRow
                  label="Webhook"
                  value={
                    merchant.webhookUrl ? (
                      <span className="break-all">{merchant.webhookUrl}</span>
                    ) : (
                      "غير محدد"
                    )
                  }
                />
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <div className="flex items-center gap-2">
                <CubeIcon className="h-5 w-5 text-slate-500" />
                <h2 className="text-lg font-bold">المخزون والمنتجات</h2>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-950">
                  <p className="text-slate-500">المتاح للبيع</p>
                  <p className="mt-1 font-bold">{formatInteger(stats.availableForSale)}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-950">
                  <p className="text-slate-500">المحجوز</p>
                  <p className="mt-1 font-bold">{formatInteger(stats.reservedQuantity)}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-950">
                  <p className="text-slate-500">فعلي</p>
                  <p className="mt-1 font-bold">{formatInteger(stats.physicalQuantity)}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-950">
                  <p className="text-slate-500">منتجات مربوطة</p>
                  <p className="mt-1 font-bold">{formatInteger(stats.linkedProducts)}</p>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                {profile.products.slice(0, 6).map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl border border-slate-100 p-3 dark:border-slate-800"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold">
                          {item.product?.name || "منتج غير محدد"}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          SKU: {item.merchantSku || item.product?.sku || "غير محدد"}
                        </p>
                      </div>
                      <Badge
                        label={item.isActive ? "نشط" : "موقوف"}
                        tone={statusTone(item.isActive ? "ACTIVE" : "INACTIVE")}
                      />
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                      <span className="rounded-lg bg-slate-50 px-2 py-2 dark:bg-slate-950">
                        بيع: {formatPrice(toNumber(item.merchantPrice))}
                      </span>
                      <span className="rounded-lg bg-slate-50 px-2 py-2 dark:bg-slate-950">
                        متاح: {formatInteger(item.inventorySnapshot?.availableForSale)}
                      </span>
                      <span className="rounded-lg bg-slate-50 px-2 py-2 dark:bg-slate-950">
                        مصدر:{" "}
                        {item.inventorySnapshot?.stockLocationLabel ||
                          profile.inventorySummary?.stockLocationLabel ||
                          "غير محدد"}
                      </span>
                    </div>
                  </div>
                ))}
                {!profile.products.length ? (
                  <EmptyState text="لا توجد منتجات مربوطة بهذا التاجر." />
                ) : null}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <div className="flex items-center gap-2">
                <ClipboardDocumentListIcon className="h-5 w-5 text-slate-500" />
                <h2 className="text-lg font-bold">مخازن التاجر</h2>
              </div>
              <div className="mt-4 space-y-3">
                {profile.merchantWarehouses.map((warehouse) => (
                  <div
                    key={warehouse.id}
                    className="rounded-xl border border-slate-100 p-3 dark:border-slate-800"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold">{warehouse.name}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {warehouse.location || "بدون موقع"} ·{" "}
                          {warehouse.type || "main"}
                        </p>
                      </div>
                      <Badge
                        label={warehouse.isActive ? "نشط" : "غير نشط"}
                        tone={statusTone(warehouse.isActive ? "ACTIVE" : "INACTIVE")}
                      />
                    </div>
                    <div className="mt-3 text-xs text-slate-500">
                      {formatInteger(warehouse._count?.inventories)} سجل مخزون،{" "}
                      {formatInteger(warehouse._count?.shipments)} شحنة
                    </div>
                  </div>
                ))}
                {!profile.merchantWarehouses.length ? (
                  <EmptyState text="لا توجد مخازن مخصصة لهذا التاجر." />
                ) : null}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <div className="flex items-center gap-2">
                <CreditCardIcon className="h-5 w-5 text-slate-500" />
                <h2 className="text-lg font-bold">ملخص مالي</h2>
              </div>
              <div className="mt-4">
                <InfoRow
                  label="مستحق مؤكد"
                  value={formatPrice(toNumber(stats.confirmedCommissionAmount))}
                />
                <InfoRow
                  label="مستحق معلق"
                  value={formatPrice(toNumber(stats.pendingCommissionAmount))}
                />
                <InfoRow
                  label="قيد التحويل"
                  value={formatPrice(toNumber(stats.pendingPayoutAmount))}
                />
                <InfoRow
                  label="تم سداده"
                  value={formatPrice(toNumber(stats.paidPayoutAmount))}
                />
                <InfoRow
                  label="قيمة طلبات مسلمة"
                  value={formatPrice(toNumber(stats.deliveredPayableAmount))}
                />
                <InfoRow
                  label="قيمة في الشحن"
                  value={formatPrice(toNumber(stats.inShippingAmount))}
                />
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default MerchantProfileDetails;
