import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { apiClient } from "../../services/apiClient";
import { useAuth } from "../../hooks/useAuthSimple";
import { useCurrency } from "../../hooks/useCurrency";
import { toast } from "sonner";
import { tToast } from "../../utils/i18n-toast";
import { useTheme } from "../../hooks/useTheme";
import { createStorageKey, getWithExpiry, setWithExpiry } from "../../utils/storage";
import {
  buildAffiliateCatalogUrl,
  buildAffiliateProductUrl,
  type AffiliateStoreCompany,
} from "./affiliateStoreLinks";
import { copyAffiliateText } from "./affiliateClipboard";
import {
  ChartBarIcon,
  CurrencyDollarIcon,
  ShoppingBagIcon,
  UserGroupIcon,
  LinkIcon,
  ClipboardDocumentListIcon,
  ArrowTrendingUpIcon,
  PencilSquareIcon,
} from "@heroicons/react/24/outline";

interface AffiliateStats {
  totalEarnings: number;
  paidEarnings: number;
  pendingEarnings: number;
  totalSales: number;
  totalClicks: number;
  conversionRate: number;
  totalOrders: number;
  totalCommissions: number;
}

interface AffiliateCommission {
  id: string;
  amount: number;
  status: string;
  createdAt: string;
  order?: {
    orderNumber?: string | null;
  } | null;
}

interface Affiliate {
  id: string;
  affiliateCode: string;
  commissionType: "PERCENTAGE" | "MARKUP";
  commissionRate: number;
  status: string;
  canCreateOrdersForOthers?: boolean;
  canViewCustomerData?: boolean;
  statusReason?: string | null;
  reviewedAt?: string | null;
  identityDocumentStatus?: string | null;
  identityDocumentReviewNote?: string | null;
  identityDocumentReviewedAt?: string | null;
  totalEarnings: number;
  paidEarnings: number;
  pendingEarnings: number;
  totalSales: number;
  totalClicks: number;
  conversionRate: number;
  company?: AffiliateStoreCompany | null;
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

const AffiliateDashboard: React.FC = () => {
  const { user } = useAuth();
  const { formatPrice } = useCurrency();
  const { actualTheme } = useTheme();
  const isDark = actualTheme === "dark";
  const [affiliate, setAffiliate] = useState<Affiliate | null>(null);
  const [stats, setStats] = useState<AffiliateStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recentCommissions, setRecentCommissions] = useState<
    AffiliateCommission[]
  >([]);
  const [replacementDocument, setReplacementDocument] = useState<File | null>(
    null,
  );
  const [uploadingReplacementDocument, setUploadingReplacementDocument] =
    useState(false);
  const CACHE_TTL_MS = 60_000;

  const cacheKey = useMemo(() => {
    const companyId = user?.companyId || user?.company?.id || "unknown";
    return createStorageKey("affiliate-dashboard", companyId);
  }, [user?.company?.id, user?.companyId]);

  const applyCachedPayload = useCallback((payload: {
    affiliate: Affiliate | null;
    stats: AffiliateStats | null;
    recentCommissions: AffiliateCommission[];
  }) => {
    setAffiliate(payload.affiliate);
    setStats(payload.stats);
    setRecentCommissions(payload.recentCommissions || []);
  }, []);

  const loadAffiliateData = useCallback(async ({ signal, background = false } = {}) => {
    try {
      if (!background) {
        setLoading(true);
        setError(null);
      }

      const [affiliateRes, statsRes, commissionsRes] = await Promise.all([
        apiClient.get("/affiliates/me", { signal }),
        apiClient.get("/affiliates/stats", { signal }),
        apiClient.get("/affiliates/commissions?limit=5", { signal }),
      ]);

      if (affiliateRes.data.success) {
        setAffiliate(affiliateRes.data.data);
      }

      if (statsRes.data.success) {
        setStats(statsRes.data.data);
      }

      if (commissionsRes.data.success) {
        setRecentCommissions(commissionsRes.data.data);
      }

      setWithExpiry(
        cacheKey,
        {
          affiliate: affiliateRes.data.success ? affiliateRes.data.data : null,
          stats: statsRes.data.success ? statsRes.data.data : null,
          recentCommissions: commissionsRes.data.success ? commissionsRes.data.data : [],
        },
        CACHE_TTL_MS,
      );
    } catch (error: unknown) {
      console.error("Error loading affiliate data:", error);
      if (!background) {
        setError(getApiErrorMessage(error, "فشل تحميل البيانات"));
      }
    } finally {
      if (!background) {
        setLoading(false);
      }
    }
  }, [cacheKey]);

  useEffect(() => {
    const controller = new AbortController();
    setAffiliate(null);
    setStats(null);
    setRecentCommissions([]);
    setError(null);
    const cached = getWithExpiry<{
      affiliate: Affiliate | null;
      stats: AffiliateStats | null;
      recentCommissions: AffiliateCommission[];
    }>(cacheKey);

    if (cached) {
      applyCachedPayload(cached);
      setLoading(false);
      loadAffiliateData({ signal: controller.signal, background: true });
    } else {
      loadAffiliateData({ signal: controller.signal });
    }

    return () => controller.abort();
  }, [cacheKey, loadAffiliateData, applyCachedPayload]);

  const generateAffiliateLink = (productId?: string) => {
    if (!affiliate) return "";
    if (productId) {
      return buildAffiliateProductUrl(affiliate, productId);
    }
    return buildAffiliateCatalogUrl(affiliate);
  };

  const copyToClipboard = async (text: string) => {
    const copied = await copyAffiliateText(text);
    if (copied) {
      tToast.success("affiliates_AffiliateDashboard.msg_8552");
      return;
    }
    tToast.error("affiliates_AffiliateDashboard.msg_6c14");
  };

  const uploadReplacementDocument = async () => {
    if (!affiliate || !replacementDocument) {
      tToast.error("affiliates_AffiliateDashboard.msg_ea5b");
      return;
    }

    try {
      setUploadingReplacementDocument(true);
      const formData = new FormData();
      formData.append("identityDocument", replacementDocument);

      const response = await apiClient.post<
        { success: boolean; data?: Affiliate; message?: string },
        FormData
      >("/affiliates/me/identity-document", formData);

      if (response.data.success && response.data.data) {
        setAffiliate(response.data.data);
        setReplacementDocument(null);
        tToast.success("affiliates_AffiliateDashboard.msg_e5e2");
      }
    } catch (error: unknown) {
      toast.error(
        getApiErrorMessage(error, "فشل رفع النسخة الجديدة من مستند الاعتماد"),
      );
    } finally {
      setUploadingReplacementDocument(false);
    }
  };

  const canCreateOrdersForOthers = affiliate?.canCreateOrdersForOthers !== false;
  const canViewCustomerData = affiliate?.canViewCustomerData !== false;
  const quickActionCount =
    2 + (canCreateOrdersForOthers ? 1 : 0) + (canViewCustomerData ? 1 : 0);
  const quickActionGridClass =
    quickActionCount >= 4
      ? "md:grid-cols-4"
      : quickActionCount === 3
        ? "md:grid-cols-3"
        : "md:grid-cols-2";

  if (loading && !affiliate) {
    return (
      <div
        className={`flex items-center justify-center min-h-screen ${isDark ? "bg-gray-900" : "bg-gray-50"}`}
      >
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error && !affiliate) {
    return (
      <div
        className={`min-h-screen ${isDark ? "bg-gray-900" : "bg-gray-50"} px-3 pb-24 pt-4 text-center text-gray-500 sm:p-6`}
      >
        {error}
      </div>
    );
  }

  if (!affiliate) {
    return (
      <div
        className={`min-h-screen ${isDark ? "bg-gray-900" : "bg-gray-50"} px-3 pb-24 pt-4 sm:p-6`}
      >
        <div
          className={`w-full ${isDark ? "bg-yellow-900/30 border-yellow-700" : "bg-yellow-50 border-yellow-200"} rounded-2xl border p-5 text-center shadow-sm sm:p-6`}
        >
          <h2
            className={`text-xl font-semibold ${isDark ? "text-yellow-300" : "text-yellow-800"} mb-2`}
          >
            لم يتم تسجيلك كمسوق بعد
          </h2>
          <p
            className={isDark ? "text-yellow-200 mb-4" : "text-yellow-700 mb-4"}
          >
            سجل الآن للبدء في كسب العمولات
          </p>
          <Link
            to="/affiliates/register"
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-blue-600 px-6 py-2.5 text-white transition hover:bg-blue-700"
          >
            تسجيل كمسوق
          </Link>
        </div>
      </div>
    );
  }

  if (affiliate.status !== "ACTIVE") {
    const isSuspended = affiliate.status === "SUSPENDED";
    const title = isSuspended ? "حسابك موقوف حالياً" : "حسابك قيد المراجعة";
    const description =
      affiliate.statusReason ||
      (isSuspended
        ? "تم إيقاف حسابك حالياً. راجع الإدارة لمعرفة السبب وخطوات إعادة التفعيل."
        : "سيتم تفعيل حسابك قريباً بعد مراجعة طلبك");
    const documentStatusDescription =
      affiliate.identityDocumentStatus === "REJECTED"
        ? affiliate.identityDocumentReviewNote ||
          "مستند الاعتماد مرفوض حالياً. راجع الإدارة ثم أعد رفع مستند واضح وصحيح."
        : affiliate.identityDocumentStatus === "PENDING_REVIEW"
          ? "مستند الاعتماد قيد المراجعة حالياً من الإدارة."
          : null;

    return (
      <div
        className={`min-h-screen ${isDark ? "bg-gray-900" : "bg-gray-50"} px-3 pb-24 pt-4 sm:p-6`}
      >
        <div
          className={`w-full ${
            isSuspended
              ? isDark
                ? "bg-red-900/30 border-red-700"
                : "bg-red-50 border-red-200"
              : isDark
                ? "bg-yellow-900/30 border-yellow-700"
                : "bg-yellow-50 border-yellow-200"
          } rounded-2xl border p-5 text-center shadow-sm sm:p-6`}
        >
          <h2
            className={`text-xl font-semibold ${
              isSuspended
                ? isDark
                  ? "text-red-300"
                  : "text-red-800"
                : isDark
                  ? "text-yellow-300"
                  : "text-yellow-800"
            } mb-2`}
          >
            {title}
          </h2>
          <p
            className={
              isSuspended
                ? isDark
                  ? "text-red-200"
                  : "text-red-700"
                : isDark
                  ? "text-yellow-200"
                  : "text-yellow-700"
            }
          >
            {description}
          </p>
          {documentStatusDescription && (
            <div
              className={`mt-4 rounded-xl border px-4 py-3 text-sm ${
                affiliate.identityDocumentStatus === "REJECTED"
                  ? isDark
                    ? "border-red-800 bg-red-950/30 text-red-200"
                    : "border-red-200 bg-red-50 text-red-700"
                  : isDark
                    ? "border-yellow-800 bg-yellow-950/30 text-yellow-200"
                    : "border-yellow-200 bg-yellow-50 text-yellow-700"
              }`}
            >
              {documentStatusDescription}
            </div>
          )}
          {affiliate.identityDocumentStatus === "REJECTED" && (
            <div
              className={`mx-auto mt-5 max-w-xl rounded-2xl border p-4 text-right ${
                isDark
                  ? "border-gray-700 bg-gray-900/50"
                  : "border-gray-200 bg-white"
              }`}
            >
              <h3
                className={`text-sm font-semibold ${
                  isDark ? "text-white" : "text-gray-900"
                }`}
              >
                رفع نسخة جديدة من مستند الاعتماد
              </h3>
              <p
                className={`mt-2 text-sm ${
                  isDark ? "text-gray-300" : "text-gray-600"
                }`}
              >
                ارفع ملفًا أوضح أو أحدث ليعود طلبك إلى المراجعة بدل البقاء في
                حالة الرفض.
              </p>
              <input
                type="file"
                accept="image/*,.pdf,application/pdf"
                aria-label="رفع نسخة جديدة من مستند الاعتماد"
                onChange={(e) =>
                  setReplacementDocument(e.target.files?.[0] || null)
                }
                className={`mt-4 min-h-11 w-full rounded-xl border px-4 py-2 ${
                  isDark
                    ? "border-gray-600 bg-gray-800 text-white file:bg-gray-700 file:text-white"
                    : "border-gray-300 bg-white text-gray-900"
                }`}
              />
              {replacementDocument && (
                <p className="mt-2 text-xs text-green-600 dark:text-green-400">
                  الملف المختار: {replacementDocument.name}
                </p>
              )}
              <button
                type="button"
                onClick={uploadReplacementDocument}
                disabled={!replacementDocument || uploadingReplacementDocument}
                className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              >
                {uploadingReplacementDocument
                  ? "جارٍ رفع النسخة..."
                  : "رفع نسخة جديدة"}
              </button>
            </div>
          )}
          {affiliate.reviewedAt && (
            <p className="mt-3 text-xs text-gray-500">
              آخر مراجعة:{" "}
              {new Date(affiliate.reviewedAt).toLocaleDateString("ar-EG")}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`${isDark ? "bg-gray-900" : "bg-gray-50"} px-3 pb-24 pt-4 sm:p-6`}
    >
      <div className="w-full space-y-4 sm:space-y-6">
        <div>
          <h1
            className={`text-2xl font-bold sm:text-3xl ${isDark ? "text-white" : "text-gray-900"}`}
          >
            لوحة تحكم المسوق
          </h1>
          <p className={`${isDark ? "text-gray-300" : "text-gray-600"} mt-1 text-sm sm:mt-2 sm:text-base`}>
            كود الإحالة الخاص بك:{" "}
            <strong className={isDark ? "text-white" : "text-gray-900"}>
              {affiliate.affiliateCode}
            </strong>
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-2 md:gap-6 lg:grid-cols-4">
          <div
            className={`${isDark ? "border-gray-700 bg-gray-800" : "border-gray-100 bg-white"} rounded-2xl border p-4 shadow-sm sm:p-6`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p
                  className={`text-xs sm:text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}
                >
                  إجمالي الأرباح
                </p>
                <p
                  className={`mt-2 text-2xl font-bold sm:text-3xl ${isDark ? "text-white" : "text-gray-900"}`}
                >
                  {formatPrice(affiliate.totalEarnings)}
                </p>
              </div>
              <CurrencyDollarIcon className="hidden h-8 w-8 text-green-600 sm:block" />
            </div>
          </div>

          <div
            className={`${isDark ? "border-gray-700 bg-gray-800" : "border-gray-100 bg-white"} rounded-2xl border p-4 shadow-sm sm:p-6`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p
                  className={`text-xs sm:text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}
                >
                  الأرباح المعلقة
                </p>
                <p
                  className={`mt-2 text-2xl font-bold sm:text-3xl ${isDark ? "text-white" : "text-gray-900"}`}
                >
                  {formatPrice(affiliate.pendingEarnings)}
                </p>
              </div>
              <ChartBarIcon className="hidden h-8 w-8 text-blue-600 sm:block" />
            </div>
          </div>

          <div
            className={`${isDark ? "border-gray-700 bg-gray-800" : "border-gray-100 bg-white"} rounded-2xl border p-4 shadow-sm sm:p-6`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p
                  className={`text-xs sm:text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}
                >
                  إجمالي المبيعات
                </p>
                <p
                  className={`mt-2 text-2xl font-bold sm:text-3xl ${isDark ? "text-white" : "text-gray-900"}`}
                >
                  {affiliate.totalSales}
                </p>
              </div>
              <ShoppingBagIcon className="hidden h-8 w-8 text-purple-600 sm:block" />
            </div>
          </div>

          <div
            className={`${isDark ? "border-gray-700 bg-gray-800" : "border-gray-100 bg-white"} rounded-2xl border p-4 shadow-sm sm:p-6`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p
                  className={`text-xs sm:text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}
                >
                  معدل التحويل
                </p>
                <p
                  className={`mt-2 text-2xl font-bold sm:text-3xl ${isDark ? "text-white" : "text-gray-900"}`}
                >
                  {affiliate.conversionRate.toFixed(2)}%
                </p>
              </div>
              <ArrowTrendingUpIcon className="hidden h-8 w-8 text-orange-600 sm:block" />
            </div>
          </div>
        </div>

        {/* Affiliate Link Generator */}
        <div
          className={`${isDark ? "border-gray-700 bg-gray-800" : "border-gray-100 bg-white"} rounded-2xl border p-4 shadow-sm sm:p-6`}
        >
          <h2
            className={`mb-4 flex items-center gap-2 text-lg font-semibold sm:text-xl ${isDark ? "text-white" : "text-gray-900"}`}
          >
            <LinkIcon className="h-6 w-6" />
            رابط الإحالة الخاص بك
          </h2>
          <div className="space-y-4">
            <div>
              <label
                className={`block text-sm font-medium ${isDark ? "text-gray-300" : "text-gray-700"} mb-2`}
              >
                رابط عام (للمتجر)
              </label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  type="text"
                  readOnly
                  value={generateAffiliateLink()}
                  className={`min-h-11 flex-1 rounded-xl border px-4 py-2 text-sm ${
                    isDark
                      ? "bg-gray-700 border-gray-600 text-white"
                      : "bg-white border-gray-300 text-gray-900"
                  }`}
                />
                <button
                  onClick={() => copyToClipboard(generateAffiliateLink())}
                  className="min-h-11 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
                >
                  نسخ
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div
          className={`grid grid-cols-2 ${quickActionGridClass} gap-3 sm:gap-6`}
        >
          <Link
            to="/affiliates/orders"
            className={`${isDark ? "border-gray-700 bg-gray-800" : "border-gray-100 bg-white"} min-h-28 rounded-2xl border p-4 shadow-sm transition hover:shadow-md sm:p-6`}
          >
            <div className="flex h-full items-center gap-3 sm:gap-4">
              <ClipboardDocumentListIcon className="h-7 w-7 shrink-0 text-blue-600 sm:h-8 sm:w-8" />
              <div>
                <h3
                  className={`font-semibold ${isDark ? "text-white" : "text-gray-900"}`}
                >
                  طلباتي
                </h3>
                <p
                  className={`mt-1 text-xs sm:text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}
                >
                  عرض جميع الطلبات
                </p>
              </div>
            </div>
          </Link>

          {canCreateOrdersForOthers && (
            <Link
              to="/affiliates/orders/create"
              className={`${isDark ? "border-gray-700 bg-gray-800" : "border-gray-100 bg-white"} min-h-28 rounded-2xl border p-4 shadow-sm transition hover:shadow-md sm:p-6`}
            >
              <div className="flex h-full items-center gap-3 sm:gap-4">
                <PencilSquareIcon className="h-7 w-7 shrink-0 text-green-600 sm:h-8 sm:w-8" />
                <div>
                  <h3
                    className={`font-semibold ${isDark ? "text-white" : "text-gray-900"}`}
                  >
                    طلب جديد للعميل
                  </h3>
                  <p
                    className={`mt-1 text-xs sm:text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}
                  >
                    تجهيز الطلب من منتجات الشركة
                  </p>
                </div>
              </div>
            </Link>
          )}

          <Link
            to="/affiliates/referrals"
            className={`${isDark ? "border-gray-700 bg-gray-800" : "border-gray-100 bg-white"} min-h-28 rounded-2xl border p-4 shadow-sm transition hover:shadow-md sm:p-6`}
          >
            <div className="flex h-full items-center gap-3 sm:gap-4">
              <LinkIcon className="h-7 w-7 shrink-0 text-orange-600 sm:h-8 sm:w-8" />
              <div>
                <h3
                  className={`font-semibold ${isDark ? "text-white" : "text-gray-900"}`}
                >
                  إحالاتي
                </h3>
                <p
                  className={`mt-1 text-xs sm:text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}
                >
                  {canViewCustomerData
                    ? "متابعة التحويلات والعملاء"
                    : "متابعة التحويلات"}
                </p>
              </div>
            </div>
          </Link>

          {canViewCustomerData && (
            <Link
              to="/affiliates/customers"
              className={`${isDark ? "border-gray-700 bg-gray-800" : "border-gray-100 bg-white"} min-h-28 rounded-2xl border p-4 shadow-sm transition hover:shadow-md sm:p-6`}
            >
              <div className="flex h-full items-center gap-3 sm:gap-4">
                <UserGroupIcon className="h-7 w-7 shrink-0 text-purple-600 sm:h-8 sm:w-8" />
                <div>
                  <h3
                    className={`font-semibold ${isDark ? "text-white" : "text-gray-900"}`}
                  >
                    عملائي
                  </h3>
                  <p
                    className={`mt-1 text-xs sm:text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}
                  >
                    عرض العملاء المرتبطين
                  </p>
                </div>
              </div>
            </Link>
          )}
        </div>

        {/* Recent Commissions */}
        <div
          className={`${isDark ? "border-gray-700 bg-gray-800" : "border-gray-100 bg-white"} overflow-hidden rounded-2xl border shadow-sm`}
        >
          <h2
            className={`p-4 text-lg font-semibold sm:text-xl ${isDark ? "text-white" : "text-gray-900"}`}
          >
            آخر العمولات
          </h2>
          {recentCommissions.length > 0 ? (
            <div className="p-3 md:p-0">
              <table className="block min-w-full md:table md:divide-y md:divide-gray-200">
                <thead className={`hidden md:table-header-group ${isDark ? "bg-gray-700" : "bg-gray-50"}`}>
                  <tr>
                    <th
                      className={`px-6 py-3 text-right text-xs font-medium uppercase ${
                        isDark ? "text-gray-300" : "text-gray-500"
                      }`}
                    >
                      رقم الطلب
                    </th>
                    <th
                      className={`px-6 py-3 text-right text-xs font-medium uppercase ${
                        isDark ? "text-gray-300" : "text-gray-500"
                      }`}
                    >
                      المبلغ
                    </th>
                    <th
                      className={`px-6 py-3 text-right text-xs font-medium uppercase ${
                        isDark ? "text-gray-300" : "text-gray-500"
                      }`}
                    >
                      الحالة
                    </th>
                    <th
                      className={`px-6 py-3 text-right text-xs font-medium uppercase ${
                        isDark ? "text-gray-300" : "text-gray-500"
                      }`}
                    >
                      التاريخ
                    </th>
                  </tr>
                </thead>
                <tbody
                  className={`block space-y-3 md:table-row-group md:space-y-0 ${isDark ? "md:bg-gray-800 md:divide-gray-700" : "md:bg-white md:divide-gray-200"} md:divide-y`}
                >
                  {recentCommissions.map((commission) => (
                    <tr
                      key={commission.id}
                      className={`block rounded-2xl border p-4 transition md:table-row md:rounded-none md:border-0 md:p-0 ${
                        isDark
                          ? "border-gray-700 bg-gray-900/35 hover:bg-gray-700"
                          : "border-gray-100 bg-white hover:bg-gray-50"
                      }`}
                    >
                      <td
                        className={`flex items-center justify-between gap-4 pb-3 text-sm md:table-cell md:px-6 md:py-4 md:whitespace-nowrap ${isDark ? "text-gray-300" : "text-gray-900"}`}
                      >
                        <span className="text-xs font-medium text-gray-500 md:hidden">
                          رقم الطلب
                        </span>
                        <span>{commission.order?.orderNumber || "-"}</span>
                      </td>
                      <td className="flex items-center justify-between gap-4 border-t py-3 text-sm font-medium text-green-600 md:table-cell md:border-0 md:px-6 md:py-4 md:whitespace-nowrap">
                        <span className="text-xs font-medium text-gray-500 md:hidden">
                          المبلغ
                        </span>
                        <span>{formatPrice(commission.amount)}</span>
                      </td>
                      <td className="flex items-center justify-between gap-4 border-t py-3 md:table-cell md:border-0 md:px-6 md:py-4 md:whitespace-nowrap">
                        <span className="text-xs font-medium text-gray-500 md:hidden">
                          الحالة
                        </span>
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${
                            commission.status === "PAID"
                              ? isDark
                                ? "bg-green-900/50 text-green-300"
                                : "bg-green-100 text-green-800"
                              : commission.status === "CONFIRMED"
                                ? isDark
                                  ? "bg-blue-900/50 text-blue-300"
                                  : "bg-blue-100 text-blue-800"
                                : isDark
                                  ? "bg-yellow-900/50 text-yellow-300"
                                  : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {commission.status === "PAID"
                            ? "مدفوع"
                            : commission.status === "CONFIRMED"
                              ? "مؤكد"
                              : "معلق"}
                        </span>
                      </td>
                      <td
                        className={`flex items-center justify-between gap-4 border-t pt-3 text-sm md:table-cell md:border-0 md:px-6 md:py-4 md:whitespace-nowrap ${isDark ? "border-gray-700 text-gray-400" : "border-gray-100 text-gray-500"}`}
                      >
                        <span className="text-xs font-medium text-gray-500 md:hidden">
                          التاريخ
                        </span>
                        <span>
                          {new Date(commission.createdAt).toLocaleDateString(
                            "ar-EG",
                          )}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p
              className={`text-center py-8 ${isDark ? "text-gray-400" : "text-gray-500"}`}
            >
              لا توجد عمولات بعد
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AffiliateDashboard;
