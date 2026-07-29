import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { tToast } from "../../utils/i18n-toast";
import {
  AdjustmentsHorizontalIcon,
  ArrowLeftIcon,
  BanknotesIcon,
  CheckCircleIcon,
  ClipboardDocumentListIcon,
  CreditCardIcon,
  DocumentTextIcon,
  IdentificationIcon,
  ReceiptPercentIcon,
  ShoppingBagIcon,
  UserCircleIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import { apiClient } from "../../services/apiClient";
import { useCurrency } from "../../hooks/useCurrency";

type MoneyValue = number | string | null | undefined;

interface ApiSuccess<T> {
  success: boolean;
  data: T;
  message?: string;
}

interface AffiliateUser {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  avatar?: string | null;
}

interface AffiliateRecord {
  id: string;
  userId: string;
  affiliateCode: string;
  status: "PENDING" | "ACTIVE" | "SUSPENDED";
  commissionType: "PERCENTAGE" | "MARKUP";
  commissionRate: number;
  totalEarnings: MoneyValue;
  paidEarnings: MoneyValue;
  pendingEarnings: MoneyValue;
  totalSales: number;
  totalClicks: number;
  conversionRate: number;
  paymentMethod?: string | null;
  paymentDetails?: string | null;
  minPayout: MoneyValue;
  canCreateOrdersForOthers: boolean;
  canViewCustomerData: boolean;
  identityDocumentUrl?: string | null;
  identityDocumentUploadedAt?: string | null;
  identityDocumentStatus?: string | null;
  identityDocumentReviewNote?: string | null;
  statusReason?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
  user: AffiliateUser;
  company?: {
    id: string;
    name: string;
    slug: string;
    currency?: string | null;
  } | null;
}

interface AffiliateProfileStats {
  ordersCount: number;
  deliveredOrders: number;
  cancelledOrders: number;
  totalOrderValue: MoneyValue;
  commissionsCount: number;
  confirmedCommissionAmount: MoneyValue;
  pendingCommissionAmount: MoneyValue;
  paidCommissionAmount: MoneyValue;
  cancelledCommissionAmount: MoneyValue;
  payoutRequestsCount: number;
  pendingPayoutAmount: MoneyValue;
  processedPayoutAmount: MoneyValue;
}

interface AffiliateOrderRow {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus?: string | null;
  total: MoneyValue;
  currency?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  sourceType?: string | null;
  orderSource?: string | null;
  createdAt: string;
}

interface AffiliateCommissionRow {
  id: string;
  amount: MoneyValue;
  status: string;
  type?: string | null;
  calculationType?: string | null;
  rate?: number | null;
  orderTotal: MoneyValue;
  payoutId?: string | null;
  createdAt: string;
  order?: {
    id: string;
    orderNumber?: string | null;
    status?: string | null;
    total?: MoneyValue;
    createdAt?: string | null;
  } | null;
}

interface AffiliatePayoutRow {
  id: string;
  amount: MoneyValue;
  currency?: string | null;
  status: string;
  paymentMethod?: string | null;
  paymentDetails?: string | null;
  transactionId?: string | null;
  externalReference?: string | null;
  proofFileUrl?: string | null;
  processedAt?: string | null;
  createdAt: string;
  notes?: string | null;
}

interface AffiliateReferralRow {
  id: string;
  referralCode: string;
  referralUrl?: string | null;
  converted: boolean;
  convertedAt?: string | null;
  source?: string | null;
  createdAt: string;
  customer?: {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    phone?: string | null;
    email?: string | null;
  } | null;
  order?: {
    id: string;
    orderNumber?: string | null;
    status?: string | null;
    total?: MoneyValue;
    createdAt?: string | null;
  } | null;
}

interface AffiliateReviewLog {
  id: string;
  eventType: string;
  title: string;
  note?: string | null;
  previousStatus?: string | null;
  nextStatus?: string | null;
  previousDocumentStatus?: string | null;
  nextDocumentStatus?: string | null;
  createdAt: string;
  actor?: {
    id: string;
    name?: string | null;
    email?: string | null;
  } | null;
}

interface AffiliateDocumentVersion {
  id: string;
  fileUrl: string;
  uploadedAt: string;
  source: string;
  isCurrent: boolean;
  replacedAt?: string | null;
}

interface AffiliateProfileResponse {
  affiliate: AffiliateRecord;
  stats: AffiliateProfileStats;
  orders: AffiliateOrderRow[];
  commissions: AffiliateCommissionRow[];
  payouts: AffiliatePayoutRow[];
  referrals: AffiliateReferralRow[];
  reviewHistory: AffiliateReviewLog[];
  documentHistory: AffiliateDocumentVersion[];
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

const formatDate = (date?: string | null) => {
  if (!date) return "غير محدد";
  return new Date(date).toLocaleString("ar-EG", {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

const getDisplayName = (user?: AffiliateUser | null) => {
  const fullName = `${user?.firstName || ""} ${user?.lastName || ""}`.trim();
  return fullName || user?.email || "مسوق بدون اسم";
};

const statusLabels: Record<string, string> = {
  ACTIVE: "نشط",
  PENDING: "قيد المراجعة",
  SUSPENDED: "موقوف",
  CONFIRMED: "مؤكدة",
  PAID: "تم السداد",
  PROCESSED: "تم التحويل",
  CANCELLED: "ملغية",
  FAILED: "فشل",
  DELIVERED: "تم التسليم",
  PROCESSING: "قيد التجهيز",
  SHIPPED: "تم الشحن",
};

const statusTone = (status?: string | null) => {
  switch (String(status || "").toUpperCase()) {
    case "ACTIVE":
    case "CONFIRMED":
    case "DELIVERED":
    case "PAID":
    case "PROCESSED":
      return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200";
    case "PENDING":
    case "PROCESSING":
    case "SHIPPED":
      return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200";
    case "SUSPENDED":
    case "CANCELLED":
    case "FAILED":
      return "border-red-200 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-200";
    default:
      return "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300";
  }
};

const getDocumentStatusLabel = (status?: string | null) => {
  switch (status) {
    case "APPROVED":
      return "المستند معتمد";
    case "REJECTED":
      return "المستند مرفوض";
    case "PENDING_REVIEW":
      return "المستند قيد المراجعة";
    default:
      return "لا يوجد مستند";
  }
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

const MetricCard: React.FC<{
  icon: React.ElementType;
  label: string;
  sub?: string;
  value: React.ReactNode;
}> = ({ icon: Icon, label, sub, value }) => (
  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
          {label}
        </p>
        <div className="mt-2 text-xl font-bold text-slate-950 dark:text-white">
          {value}
        </div>
      </div>
      <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
    </div>
    {sub ? <p className="mt-3 text-xs text-slate-500">{sub}</p> : null}
  </div>
);

const AffiliateProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { formatPrice } = useCurrency();
  const [profile, setProfile] = useState<AffiliateProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [commissionRate, setCommissionRate] = useState("");
  const [policyForm, setPolicyForm] = useState({
    minPayout: "100",
    canCreateOrdersForOthers: true,
    canViewCustomerData: true,
  });

  const loadProfile = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const response = await apiClient.get<ApiSuccess<AffiliateProfileResponse>>(
        `/affiliates/${id}/profile`,
      );
      if (response.data.success) {
        const data = response.data.data;
        setProfile(data);
        setCommissionRate(String(data.affiliate.commissionRate || 0));
        setPolicyForm({
          minPayout: String(toNumber(data.affiliate.minPayout || 100)),
          canCreateOrdersForOthers: Boolean(
            data.affiliate.canCreateOrdersForOthers,
          ),
          canViewCustomerData: Boolean(data.affiliate.canViewCustomerData),
        });
      }
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "فشل تحميل ملف المسوق"));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const affiliate = profile?.affiliate;
  const stats = profile?.stats;
  const displayName = useMemo(
    () => getDisplayName(affiliate?.user),
    [affiliate?.user],
  );

  const updateStatus = async (nextStatus: "ACTIVE" | "PENDING" | "SUSPENDED") => {
    if (!affiliate) return;
    const enteredReason = window.prompt(
      nextStatus === "SUSPENDED"
        ? "سبب إيقاف المسوق"
        : "ملاحظة القرار (اختياري)",
      affiliate.statusReason || "",
    );
    if (enteredReason === null) return;
    if (nextStatus === "SUSPENDED" && !enteredReason.trim()) {
      tToast.error("AffiliateProfile.msg_996e");
      return;
    }

    try {
      setSaving(true);
      await apiClient.put(`/affiliates/${affiliate.id}/status`, {
        status: nextStatus,
        statusReason: enteredReason.trim() || null,
      });
      tToast.success("AffiliateProfile.success_update_status_085a");
      await loadProfile();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "فشل تحديث حالة المسوق"));
    } finally {
      setSaving(false);
    }
  };

  const saveCommission = async () => {
    if (!affiliate) return;
    const nextRate = Number(commissionRate);
    if (!Number.isFinite(nextRate) || nextRate < 0) {
      tToast.error("AffiliateProfile.msg_47d6");
      return;
    }

    try {
      setSaving(true);
      await apiClient.put(`/affiliates/${affiliate.id}/commission`, {
        commissionRate: nextRate,
      });
      tToast.success("AffiliateProfile.success_update_6452");
      await loadProfile();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "فشل تحديث العمولة"));
    } finally {
      setSaving(false);
    }
  };

  const savePolicy = async () => {
    if (!affiliate) return;
    try {
      setSaving(true);
      await apiClient.put(`/affiliates/${affiliate.id}/policy`, {
        minPayout: Number(policyForm.minPayout),
        canCreateOrdersForOthers: policyForm.canCreateOrdersForOthers,
        canViewCustomerData: policyForm.canViewCustomerData,
      });
      tToast.success("AffiliateProfile.success_update_d401");
      await loadProfile();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "فشل تحديث ضوابط المسوق"));
    } finally {
      setSaving(false);
    }
  };

  const reviewDocument = async (status: "APPROVED" | "REJECTED") => {
    if (!affiliate) return;
    let reviewNote = "";
    if (status === "REJECTED") {
      const note = window.prompt("سبب رفض مستند الاعتماد", "");
      if (note === null) return;
      reviewNote = note.trim();
      if (!reviewNote) {
        tToast.error("AffiliateProfile.msg_de2f");
        return;
      }
    }

    try {
      setSaving(true);
      await apiClient.put(`/affiliates/${affiliate.id}/document-review`, {
        status,
        reviewNote: reviewNote || null,
      });
      tToast.success("AffiliateProfile.success_update_status_fd25");
      await loadProfile();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "فشل تحديث مستند المسوق"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (!profile || !affiliate || !stats) {
    return (
      <div className="p-6">
        <button
          onClick={() => navigate("/affiliates/management")}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          رجوع لإدارة المسوقين
        </button>
        <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-8 text-red-700">
          ملف المسوق غير متاح.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-3 py-4 text-slate-900 dark:bg-slate-950 dark:text-white sm:px-6 sm:py-6">
      <div className="mx-auto max-w-6xl 2xl:max-w-7xl space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            onClick={() => navigate("/affiliates/management")}
            className="inline-flex min-h-10 w-fit items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            إدارة المسوقين
          </button>
          <Link
            to={`/orders?page=1&limit=20&affiliateId=${affiliate.id}`}
            className="inline-flex min-h-10 w-fit items-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950"
          >
            <ShoppingBagIcon className="h-4 w-4" />
            طلبات هذا المسوق
          </Link>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex min-w-0 items-start gap-4">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-200">
                <UserCircleIcon className="h-9 w-9" />
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="truncate text-2xl font-bold sm:text-3xl">
                    {displayName}
                  </h1>
                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-bold ${statusTone(affiliate.status)}`}
                  >
                    {statusLabels[affiliate.status] || affiliate.status}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500 dark:text-slate-400">
                  <span>{affiliate.user.email || "بدون بريد"}</span>
                  <span>{affiliate.user.phone || "بدون هاتف"}</span>
                  <span>كود: {affiliate.affiliateCode}</span>
                  <span>منذ {formatDate(affiliate.createdAt)}</span>
                </div>
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-3 lg:min-w-[420px]">
              <button
                onClick={() => void updateStatus("ACTIVE")}
                disabled={saving || affiliate.status === "ACTIVE"}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200"
              >
                <CheckCircleIcon className="h-4 w-4" />
                تفعيل
              </button>
              <button
                onClick={() => void updateStatus("SUSPENDED")}
                disabled={saving || affiliate.status === "SUSPENDED"}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-50 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-200"
              >
                <XCircleIcon className="h-4 w-4" />
                إيقاف
              </button>
              <button
                onClick={() => void updateStatus("PENDING")}
                disabled={saving || affiliate.status === "PENDING"}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 text-sm font-semibold text-amber-700 transition hover:bg-amber-100 disabled:opacity-50 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200"
              >
                <AdjustmentsHorizontalIcon className="h-4 w-4" />
                مراجعة
              </button>
            </div>
          </div>
        </section>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            icon={BanknotesIcon}
            label="الرصيد القابل للسحب"
            value={formatPrice(toNumber(affiliate.pendingEarnings))}
            sub={`الحد الأدنى ${formatPrice(toNumber(affiliate.minPayout))}`}
          />
          <MetricCard
            icon={ReceiptPercentIcon}
            label="العمولات المؤكدة"
            value={formatPrice(toNumber(stats.confirmedCommissionAmount))}
            sub={`${stats.commissionsCount} سجل عمولة`}
          />
          <MetricCard
            icon={ShoppingBagIcon}
            label="طلبات المسوق"
            value={stats.ordersCount.toLocaleString("ar-EG")}
            sub={`${stats.deliveredOrders.toLocaleString("ar-EG")} مسلم، ${stats.cancelledOrders.toLocaleString("ar-EG")} ملغي`}
          />
          <MetricCard
            icon={CreditCardIcon}
            label="تم تحويله"
            value={formatPrice(toNumber(stats.processedPayoutAmount))}
            sub={`${stats.payoutRequestsCount.toLocaleString("ar-EG")} طلب سحب`}
          />
        </div>

        <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
          <div className="space-y-5">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <h2 className="text-lg font-bold">تاريخ الطلبات المرتبطة</h2>
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full text-right text-sm">
                  <thead className="text-xs text-slate-500">
                    <tr>
                      <th className="py-2">رقم الطلب</th>
                      <th className="py-2">العميل</th>
                      <th className="py-2">الحالة</th>
                      <th className="py-2">القيمة</th>
                      <th className="py-2">التاريخ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {profile.orders.map((order) => (
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
                          {order.customerName || "عميل غير محدد"}
                        </td>
                        <td className="py-3">
                          <span
                            className={`rounded-full border px-2 py-1 text-xs font-semibold ${statusTone(order.status)}`}
                          >
                            {statusLabels[order.status] || order.status}
                          </span>
                        </td>
                        <td className="py-3 font-semibold">
                          {formatPrice(toNumber(order.total))}
                        </td>
                        <td className="py-3 text-slate-500">
                          {formatDate(order.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {profile.orders.length === 0 ? (
                  <div className="py-8 text-center text-sm text-slate-500">
                    لا توجد طلبات مرتبطة بهذا المسوق.
                  </div>
                ) : null}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <h2 className="text-lg font-bold">تاريخ العمولات والسحوبات</h2>
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <div>
                  <h3 className="mb-3 text-sm font-bold text-slate-600 dark:text-slate-300">
                    العمولات
                  </h3>
                  <div className="space-y-2">
                    {profile.commissions.slice(0, 10).map((commission) => (
                      <div
                        key={commission.id}
                        className="rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-semibold">
                            {commission.order?.orderNumber || "طلب غير محدد"}
                          </span>
                          <span className="font-bold text-emerald-600 dark:text-emerald-300">
                            {formatPrice(toNumber(commission.amount))}
                          </span>
                        </div>
                        <div className="mt-1 flex justify-between text-xs text-slate-500">
                          <span>{statusLabels[commission.status] || commission.status}</span>
                          <span>{formatDate(commission.createdAt)}</span>
                        </div>
                      </div>
                    ))}
                    {profile.commissions.length === 0 ? (
                      <p className="py-4 text-center text-sm text-slate-500">
                        لا توجد عمولات.
                      </p>
                    ) : null}
                  </div>
                </div>
                <div>
                  <h3 className="mb-3 text-sm font-bold text-slate-600 dark:text-slate-300">
                    السحوبات
                  </h3>
                  <div className="space-y-2">
                    {profile.payouts.slice(0, 10).map((payout) => (
                      <div
                        key={payout.id}
                        className="rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-semibold">
                            {payout.paymentMethod || "طريقة غير محددة"}
                          </span>
                          <span className="font-bold">
                            {formatPrice(toNumber(payout.amount))}
                          </span>
                        </div>
                        <div className="mt-1 flex justify-between text-xs text-slate-500">
                          <span>{statusLabels[payout.status] || payout.status}</span>
                          <span>{formatDate(payout.createdAt)}</span>
                        </div>
                        {payout.proofFileUrl ? (
                          <a
                            href={payout.proofFileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-2 inline-block text-xs font-semibold text-indigo-600 hover:underline"
                          >
                            إثبات التحويل
                          </a>
                        ) : null}
                      </div>
                    ))}
                    {profile.payouts.length === 0 ? (
                      <p className="py-4 text-center text-sm text-slate-500">
                        لا توجد سحوبات.
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <h2 className="text-lg font-bold">الإحالات والعملاء</h2>
              <p className="mt-1 text-xs text-slate-500">
                صلاحية عرض بيانات العملاء:{" "}
                {affiliate.canViewCustomerData ? "مفعلة" : "غير مفعلة"}
              </p>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {profile.referrals.map((referral) => (
                  <div
                    key={referral.id}
                    className="rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-700"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-semibold">{referral.referralCode}</span>
                      <span
                        className={`rounded-full border px-2 py-1 text-xs font-semibold ${referral.converted ? statusTone("ACTIVE") : statusTone("PENDING")}`}
                      >
                        {referral.converted ? "تم التحويل" : "زيارة فقط"}
                      </span>
                    </div>
                    <div className="mt-2 text-xs text-slate-500">
                      {referral.order?.orderNumber || referral.source || "مصدر غير محدد"}
                    </div>
                    {affiliate.canViewCustomerData && referral.customer ? (
                      <div className="mt-2 text-xs text-slate-600 dark:text-slate-300">
                        {`${referral.customer.firstName || ""} ${referral.customer.lastName || ""}`.trim() ||
                          referral.customer.phone ||
                          "عميل غير محدد"}
                      </div>
                    ) : null}
                  </div>
                ))}
                {profile.referrals.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-slate-700">
                    لا توجد إحالات مسجلة.
                  </div>
                ) : null}
              </div>
            </section>
          </div>

          <aside className="space-y-5">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <h2 className="flex items-center gap-2 text-lg font-bold">
                <AdjustmentsHorizontalIcon className="h-5 w-5" />
                إعدادات المسوق
              </h2>
              <div className="mt-4 space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-500">
                    العمولة
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={commissionRate}
                      onChange={(event) => setCommissionRate(event.target.value)}
                      className="min-h-10 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950"
                    />
                    <button
                      onClick={() => void saveCommission()}
                      disabled={saving}
                      className="rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white disabled:opacity-60"
                    >
                      حفظ
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    النوع: {affiliate.commissionType === "MARKUP" ? "هامش ربح" : "نسبة"}
                  </p>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-500">
                    الحد الأدنى للسحب
                  </label>
                  <input
                    type="number"
                    value={policyForm.minPayout}
                    onChange={(event) =>
                      setPolicyForm((current) => ({
                        ...current,
                        minPayout: event.target.value,
                      }))
                    }
                    className="min-h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950"
                  />
                </div>
                <label className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700">
                  إنشاء طلبات للعملاء
                  <input
                    type="checkbox"
                    checked={policyForm.canCreateOrdersForOthers}
                    onChange={(event) =>
                      setPolicyForm((current) => ({
                        ...current,
                        canCreateOrdersForOthers: event.target.checked,
                      }))
                    }
                  />
                </label>
                <label className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700">
                  عرض بيانات العملاء
                  <input
                    type="checkbox"
                    checked={policyForm.canViewCustomerData}
                    onChange={(event) =>
                      setPolicyForm((current) => ({
                        ...current,
                        canViewCustomerData: event.target.checked,
                      }))
                    }
                  />
                </label>
                <button
                  onClick={() => void savePolicy()}
                  disabled={saving}
                  className="min-h-10 w-full rounded-xl bg-slate-950 text-sm font-semibold text-white disabled:opacity-60 dark:bg-white dark:text-slate-950"
                >
                  حفظ الضوابط
                </button>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <h2 className="flex items-center gap-2 text-lg font-bold">
                <IdentificationIcon className="h-5 w-5" />
                المستندات والمراجعة
              </h2>
              <div className="mt-4 space-y-3 text-sm">
                <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                  <div className="font-semibold">
                    {getDocumentStatusLabel(affiliate.identityDocumentStatus)}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    {formatDate(affiliate.identityDocumentUploadedAt)}
                  </div>
                  {affiliate.identityDocumentReviewNote ? (
                    <p className="mt-2 text-xs text-red-600 dark:text-red-300">
                      {affiliate.identityDocumentReviewNote}
                    </p>
                  ) : null}
                  {affiliate.identityDocumentUrl ? (
                    <a
                      href={affiliate.identityDocumentUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:underline"
                    >
                      <DocumentTextIcon className="h-4 w-4" />
                      فتح المستند الحالي
                    </a>
                  ) : null}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => void reviewDocument("APPROVED")}
                    disabled={saving || !affiliate.identityDocumentUrl}
                    className="min-h-10 rounded-xl border border-emerald-200 bg-emerald-50 text-sm font-semibold text-emerald-700 disabled:opacity-50 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200"
                  >
                    اعتماد المستند
                  </button>
                  <button
                    onClick={() => void reviewDocument("REJECTED")}
                    disabled={saving || !affiliate.identityDocumentUrl}
                    className="min-h-10 rounded-xl border border-red-200 bg-red-50 text-sm font-semibold text-red-700 disabled:opacity-50 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-200"
                  >
                    رفض المستند
                  </button>
                </div>
                <div className="space-y-2">
                  {profile.documentHistory.slice(0, 4).map((document) => (
                    <a
                      key={document.id}
                      href={document.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2 text-xs hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                    >
                      <span>{document.isCurrent ? "الحالي" : "نسخة سابقة"}</span>
                      <span>{formatDate(document.uploadedAt)}</span>
                    </a>
                  ))}
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <h2 className="flex items-center gap-2 text-lg font-bold">
                <ClipboardDocumentListIcon className="h-5 w-5" />
                سجل القرارات
              </h2>
              <div className="mt-4 space-y-3">
                {profile.reviewHistory.map((log) => (
                  <div
                    key={log.id}
                    className="rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-700"
                  >
                    <div className="font-semibold">{log.title}</div>
                    <div className="mt-1 text-xs text-slate-500">
                      {formatDate(log.createdAt)}
                    </div>
                    {log.note ? (
                      <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">
                        {log.note}
                      </p>
                    ) : null}
                  </div>
                ))}
                {profile.reviewHistory.length === 0 ? (
                  <p className="py-4 text-center text-sm text-slate-500">
                    لا يوجد سجل مراجعات.
                  </p>
                ) : null}
              </div>
            </section>
          </aside>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <h2 className="text-lg font-bold">بيانات الدفع</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-700">
              <div className="text-xs text-slate-500">طريقة الدفع</div>
              <div className="mt-1 font-semibold">
                {affiliate.paymentMethod || "غير محدد"}
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-700 md:col-span-2">
              <div className="text-xs text-slate-500">بيانات التحويل</div>
              <div className="mt-1 break-words font-semibold">
                {parsePaymentDetails(affiliate.paymentDetails)}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default AffiliateProfile;
