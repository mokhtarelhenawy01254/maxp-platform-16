import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { tToast } from "../../utils/i18n-toast";
import { Link, Navigate, useLocation } from "react-router-dom";
import { apiClient } from "../../services/apiClient";
import { useTheme } from "../../hooks/useTheme";

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

interface MerchantProfile {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  commissionRate: number;
  autoFulfill: boolean;
  fulfillmentMode?: string | null;
  _count?: {
    merchantProducts?: number;
    merchantOrders?: number;
    commissions?: number;
  };
}

interface MerchantOperationsSummary {
  summary?: {
    assignedPieces?: number;
    payablePieces?: number;
    pendingPayablePieces?: number;
    deliveredPayableAmount?: number;
    inShippingAmount?: number;
    confirmedCommissionAmount?: number;
    paidAmount?: number;
  };
}

interface MerchantPayout {
  id: string;
  amount: string | number;
  status: string;
  paymentMethod: string;
  createdAt: string;
  processedAt?: string | null;
}

interface MerchantPayoutSummary {
  balances: {
    availableAmount: number;
    availableCommissionsCount: number;
    confirmedAmount: number;
    pendingPayoutAmount: number;
    paidAmount: number;
  };
  payouts: MerchantPayout[];
}

const payoutStatusLabels: Record<string, string> = {
  PENDING: "قيد المراجعة",
  PROCESSED: "تم التحويل",
  FAILED: "فشل التحويل",
  CANCELLED: "ملغي",
};

const fulfillmentLabels: Record<string, string> = {
  MERCHANT: "التاجر يشحن",
  COMPANY_WAREHOUSE: "من مخزن الشركة",
  MIXED: "مختلط",
};

const merchantPortalSections = [
  { id: "merchant-overview", path: "/merchant-portal", label: "نظرة عامة" },
  { id: "merchant-products", path: "/products", label: "المنتجات" },
  { id: "merchant-inventory", path: "/inventory", label: "المخزون" },
  { id: "merchant-orders", path: "/orders", label: "طلباتي" },
  { id: "merchant-commissions", path: "/merchant-portal/commissions", label: "المستحقات" },
] as const;

type MerchantPortalSectionId = (typeof merchantPortalSections)[number]["id"];

const resolveActiveSection = (
  pathname: string,
  hash: string,
): MerchantPortalSectionId => {
  if (hash === "#merchant-commissions") return "merchant-commissions";

  if (pathname.endsWith("/commissions")) return "merchant-commissions";

  return "merchant-overview";
};

const formatMoney = (value: string | number | undefined) =>
  `${Number(value || 0).toLocaleString("ar-EG", {
    maximumFractionDigits: 2,
  })} ج.م`;

const formatPieces = (value: string | number | undefined) =>
  Number(value || 0).toLocaleString("ar-EG", {
    maximumFractionDigits: 0,
  });

const getApiErrorMessage = (error: unknown, fallback: string) => {
  if (typeof error !== "object" || error === null || !("response" in error)) {
    return fallback;
  }

  const response = (
    error as { response?: { data?: { message?: string } } }
  ).response;

  return response?.data?.message || fallback;
};

const MerchantPortalDashboard: React.FC = () => {
  const { actualTheme } = useTheme();
  const isDark = actualTheme === "dark";
  const location = useLocation();
  const normalizedPathname = location.pathname.replace(/\/+$/, "") || "/";
  const activeSectionId = resolveActiveSection(location.pathname, location.hash);
  const [requestingPayout, setRequestingPayout] = useState(false);

  const profileQuery = useQuery({
    queryKey: ["merchant-portal-me"],
    queryFn: async () => (await apiClient.get<ApiResponse<MerchantProfile>>("/merchant-portal/me")).data.data,
    staleTime: 60 * 1000,
    placeholderData: (prev) => prev,
  });

  const operationsQuery = useQuery({
    queryKey: ["merchant-portal-operations-summary"],
    queryFn: async () => (await apiClient.get<ApiResponse<MerchantOperationsSummary>>("/merchant-portal/operations-summary")).data.data,
    staleTime: 60 * 1000,
    placeholderData: (prev) => prev,
  });

  const payoutQuery = useQuery({
    queryKey: ["merchant-portal-payout-summary"],
    queryFn: async () => (await apiClient.get<ApiResponse<MerchantPayoutSummary>>("/merchant-portal/payout-summary")).data.data,
    staleTime: 60 * 1000,
    placeholderData: (prev) => prev,
  });

  const profile = profileQuery.data ?? null;
  const operationsSummary = operationsQuery.data ?? null;
  const payoutSummary = payoutQuery.data ?? null;
  const loading = (profileQuery.isLoading && !profile) || (operationsQuery.isLoading && !operationsSummary) || (payoutQuery.isLoading && !payoutSummary);
  const accessError = profileQuery.error
    ? getApiErrorMessage(profileQuery.error, "تعذر تحميل بورتال التاجر")
    : operationsQuery.error
      ? getApiErrorMessage(operationsQuery.error, "تعذر تحميل بورتال التاجر")
      : "";

  const cardClass = isDark
    ? "border-slate-700 bg-slate-900/75 text-slate-100"
    : "border-stone-200 bg-white text-stone-900";

  const loadPortal = async () => {
    await Promise.all([
      profileQuery.refetch(),
      operationsQuery.refetch(),
      payoutQuery.refetch(),
    ]);
  };

  useEffect(() => {
    if (loading || (accessError && !profile)) return undefined;

    const timeoutId = window.setTimeout(() => {
      document
        .getElementById(activeSectionId)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [accessError, activeSectionId, loading, profile]);

  const requestMerchantPayout = async () => {
    const availableAmount = Number(payoutSummary?.balances.availableAmount || 0);
    if (availableAmount <= 0) {
      tToast.error("MerchantPortalDashboard.msg_ea8b");
      return;
    }

    try {
      setRequestingPayout(true);
      await apiClient.post<ApiResponse<MerchantPayout>>(
        "/merchant-portal/payout-request",
        {
          amount: availableAmount,
          paymentMethod: "WALLET",
          paymentDetails: {
            source: "merchant-portal",
            merchantEmail: profile?.email || "",
          },
        },
      );
      tToast.success("MerchantPortalDashboard.success_send_8bfa");
      await loadPortal();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "تعذر إنشاء طلب السحب"));
    } finally {
      setRequestingPayout(false);
    }
  };

  const operationTotals = operationsSummary?.summary || {};
  const payoutBalances = payoutSummary?.balances || {
    availableAmount: 0,
    availableCommissionsCount: 0,
    confirmedAmount: 0,
    pendingPayoutAmount: 0,
    paidAmount: 0,
  };
  const payoutRows = payoutSummary?.payouts || [];
  const coreTools = [
    {
      title: "المنتجات",
      body: "تعديل سعر التاجر وبيانات المنتج المتاحة لك من نفس شاشة المنتجات الأساسية.",
      path: "/products",
      action: "فتح المنتجات",
    },
    {
      title: "المخزون",
      body: "متابعة الرصيد ومكانه، وتعديل الكمية فقط عندما يكون المخزون عند التاجر.",
      path: "/inventory",
      action: "فتح المخزون",
    },
    {
      title: "الطلبات",
      body: "متابعة طلباتك من نفس شاشة الطلبات، مع صلاحيات تختلف بين الشحن الذاتي ومخزن الشركة.",
      path: "/orders",
      action: "فتح الطلبات",
    },
  ];

  if (normalizedPathname === "/merchant-portal/products") {
    return <Navigate to="/products" replace />;
  }

  if (normalizedPathname === "/merchant-portal/orders") {
    return <Navigate to="/orders" replace />;
  }

  if (
    normalizedPathname.startsWith("/merchant-portal/") &&
    normalizedPathname !== "/merchant-portal/commissions"
  ) {
    return <Navigate to="/merchant-portal" replace />;
  }

  if (loading) {
    return (
      <div className={`min-h-screen p-6 ${isDark ? "bg-slate-950" : "bg-stone-50"}`}>
        <div className={`mx-auto max-w-6xl rounded-3xl border p-8 ${cardClass}`}>
          جاري تحميل بورتال التاجر...
        </div>
      </div>
    );
  }

  if (accessError && !profile) {
    return (
      <div className={`min-h-screen p-6 ${isDark ? "bg-slate-950" : "bg-stone-50"}`}>
        <div className={`mx-auto max-w-3xl rounded-[2rem] border p-8 text-center ${cardClass}`}>
          <p className="mb-3 text-sm font-bold text-amber-600">Merchant Portal</p>
          <h1 className="text-3xl font-black">غير مسموح بفتح بورتال التاجر</h1>
          <p className={`mx-auto mt-3 max-w-xl ${isDark ? "text-slate-300" : "text-stone-600"}`}>
            {accessError}
          </p>
          <p className={`mx-auto mt-2 max-w-xl text-sm ${isDark ? "text-slate-400" : "text-stone-500"}`}>
            لو أنت مالك الشركة أو مديرها استخدم صفحة إدارة التجار، أما هذا المسار فهو مخصص لحسابات التجار فقط.
          </p>
          <button
            type="button"
            onClick={loadPortal}
            className="mt-6 rounded-full bg-amber-500 px-6 py-3 font-bold text-white hover:bg-amber-600"
          >
            إعادة المحاولة
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen p-6 ${isDark ? "bg-slate-950" : "bg-stone-50"}`}>
      <div className="mx-auto max-w-6xl 2xl:max-w-7xl space-y-6">
        {activeSectionId === "merchant-overview" ? (
          <>
            <section className="grid gap-4 md:grid-cols-5">
              {[
                ["المنتجات", profile?._count?.merchantProducts || 0],
                ["الطلبات", profile?._count?.merchantOrders || 0],
                ["العمولات", profile?._count?.commissions || 0],
                ["نسبة التاجر", `${profile?.commissionRate || 0}%`],
                ["طريقة التنفيذ", fulfillmentLabels[profile?.fulfillmentMode || "MERCHANT"] || "التاجر يشحن"],
              ].map(([label, value]) => (
                <div key={label} className={`rounded-3xl border p-5 ${cardClass}`}>
                  <p className={`text-sm ${isDark ? "text-slate-400" : "text-stone-500"}`}>{label}</p>
                  <p className="mt-2 text-3xl font-black">{value}</p>
                </div>
              ))}
            </section>

            <section className={`rounded-[2rem] border p-6 ${cardClass}`}>
              <h2 className="text-2xl font-black">الأدوات الموحدة</h2>
              <p className={`mt-2 max-w-2xl text-sm ${isDark ? "text-slate-400" : "text-stone-500"}`}>
                لا توجد شاشة طلبات أو منتجات خاصة بالتاجر هنا. كل التشغيل يتم من نفس أدوات الشركة،
                والبوابة تبقى لملخص الحساب والمستحقات فقط.
              </p>
              <div className="mt-5 grid gap-4 md:grid-cols-3">
                {coreTools.map((tool) => (
                  <div
                    key={tool.path}
                    className={`rounded-3xl border p-5 ${isDark ? "border-slate-800 bg-slate-950/50" : "border-stone-200 bg-stone-50"}`}
                  >
                    <p className="font-black">{tool.title}</p>
                    <p className={`mt-2 text-sm ${isDark ? "text-slate-400" : "text-stone-500"}`}>
                      {tool.body}
                    </p>
                    <Link
                      to={tool.path}
                      className="mt-4 inline-flex rounded-full bg-amber-500 px-4 py-2 text-sm font-bold text-white hover:bg-amber-600"
                    >
                      {tool.action}
                    </Link>
                  </div>
                ))}
              </div>
            </section>
          </>
        ) : null}

        {activeSectionId === "merchant-commissions" ? (
          <section id="merchant-commissions" className={`rounded-[2rem] border p-6 ${cardClass}`}>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h2 className="text-2xl font-black">مستحقاتي</h2>
                <p className={`mt-2 max-w-2xl text-sm ${isDark ? "text-slate-400" : "text-stone-500"}`}>
                  المستحقات هنا مبنية على عمولات التاجر المؤكدة للطلبات التي تم تسليمها فقط. الطلبات المرتجعة
                  أو الملغية لا تدخل في الرصيد القابل للسحب.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={loadPortal}
                  className="rounded-full bg-amber-500 px-5 py-2 text-sm font-bold text-white hover:bg-amber-600"
                >
                  تحديث
                </button>
                <button
                  type="button"
                  onClick={requestMerchantPayout}
                  disabled={requestingPayout || payoutBalances.availableAmount <= 0}
                  className="rounded-full bg-emerald-600 px-5 py-2 text-sm font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {requestingPayout ? "جارٍ الطلب..." : "طلب سحب الرصيد"}
                </button>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {[
                ["قابل للسحب", formatMoney(payoutBalances.availableAmount)],
                ["قيد طلبات السحب", formatMoney(payoutBalances.pendingPayoutAmount)],
                ["تم دفعه", formatMoney(payoutBalances.paidAmount)],
              ].map(([label, value]) => (
                <div key={label} className={`rounded-3xl border p-5 ${isDark ? "border-slate-800 bg-slate-950/50" : "border-stone-200 bg-stone-50"}`}>
                  <p className={`text-sm ${isDark ? "text-slate-400" : "text-stone-500"}`}>{label}</p>
                  <p className="mt-2 text-2xl font-black">{value}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-4">
              {[
                ["قطع اتسلمت", formatPieces(operationTotals.payablePieces || 0)],
                ["قطع في الشحن", formatPieces(operationTotals.pendingPayablePieces || 0)],
                ["قيمة مستحقة بعد التسليم", formatMoney(operationTotals.deliveredPayableAmount || 0)],
                ["قيمة في الشحن", formatMoney(operationTotals.inShippingAmount || 0)],
              ].map(([label, value]) => (
                <div key={label} className={`rounded-2xl border p-4 ${isDark ? "border-slate-800" : "border-stone-200"}`}>
                  <p className={`text-xs ${isDark ? "text-slate-400" : "text-stone-500"}`}>{label}</p>
                  <p className="mt-1 text-lg font-black">{value}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 overflow-x-auto">
              <table className="w-full min-w-[680px] text-right text-sm">
                <thead className={isDark ? "text-slate-400" : "text-stone-500"}>
                  <tr>
                    <th className="py-3">طلب السحب</th>
                    <th className="py-3">تاريخ الطلب</th>
                    <th className="py-3">الحالة</th>
                    <th className="py-3">طريقة الدفع</th>
                    <th className="py-3">المبلغ</th>
                  </tr>
                </thead>
                <tbody>
                  {payoutRows.map((row) => (
                    <tr key={row.id} className={isDark ? "border-t border-slate-800" : "border-t border-stone-200"}>
                      <td className="py-4 font-bold">#{row.id.slice(-8)}</td>
                      <td className="py-4">
                        {new Date(row.createdAt).toLocaleDateString("ar-EG")}
                      </td>
                      <td className="py-4">{payoutStatusLabels[row.status] || row.status}</td>
                      <td className="py-4">{row.paymentMethod}</td>
                      <td className="py-4 font-bold">
                        {formatMoney(row.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {payoutRows.length === 0 ? (
                <p className={`py-8 text-center ${isDark ? "text-slate-400" : "text-stone-500"}`}>
                  لا توجد طلبات سحب حتى الآن.
                </p>
              ) : null}
            </div>

            <div className={`mt-6 rounded-2xl border p-4 text-sm ${isDark ? "border-slate-800 bg-slate-950/50 text-slate-300" : "border-stone-200 bg-stone-50 text-stone-600"}`}>
              المستحقات هنا هي الجزء المالي فقط. تشغيل الطلبات والمخزون يتم من
              {" "}
              <Link to="/orders" className="font-bold text-amber-600 hover:text-amber-700">
                الطلبات
              </Link>
              {" "}
              و
              {" "}
              <Link to="/inventory" className="font-bold text-amber-600 hover:text-amber-700">
                المخزون
              </Link>
              {" "}
              بنفس شاشات الشركة وصلاحيات التاجر.
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
};

export default MerchantPortalDashboard;
