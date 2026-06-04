import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

import {
  Users,
  Wallet,
  TrendingUp,
  Link as LinkIcon,
  Copy,
  Clock,
  DollarSign,
  AlertCircle,
} from "lucide-react";

import { apiClient } from "../../services/apiClient";
import { useCurrency } from "../../hooks/useCurrency";
import toast from "react-hot-toast";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { useAuth } from "../../hooks/useAuthSimple";
import {
  createStorageKey,
  getWithExpiry,
  setWithExpiry,
} from "../../utils/storage";

interface PartnerDashboardData {
  partner: {
    id: string;
    partnerCode: string;
    title: string;
    totalEarnings: number;
    pendingEarnings: number;
    totalPaid: number;
    status: string;
  };
  stats: {
    directReferralsCount: number;
    totalNetworkCount: number;
    activeCompaniesCount: number;
  };
  trends?: {
    earningsChange?: number;
    referralsChange?: number;
  };
  pagination?: {
    commissions: { page: number; pageSize: number; total: number };
    payouts: { page: number; pageSize: number; total: number };
    referrals: { page: number; pageSize: number; total: number };
  };
  recentCommissions: any[];
  recentPayouts: any[];
  referredCompanies: {
    name: string;
    status: string;
    createdAt: string;
  }[];
}

// Pure helpers (hoisted) to avoid TDZ issues inside hooks
const calcHasMore = (
  info?: { page: number; pageSize: number; total?: number },
  pageDataLength = 0,
) => {
  if (!info) return false;
  if (typeof info.total === "number" && info.total > 0) {
    return info.page * info.pageSize < info.total;
  }
  return pageDataLength === info.pageSize;
};

const calcTrendPercent = (current?: number, previous?: number) => {
  if (previous === undefined || previous === null) return undefined;
  if (previous === 0) return current && current > 0 ? 100 : 0;
  return Math.round(
    ((Number(current || 0) - Number(previous)) / Number(previous)) * 100,
  );
};

const PartnerDashboard: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { formatPrice } = useCurrency();

  const [data, setData] = useState<PartnerDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payoutAmount, setPayoutAmount] = useState("");
  const [payoutMethod, setPayoutMethod] = useState("VODAFONE_CASH");
  const [payoutLoading, setPayoutLoading] = useState(false);
  const [commPage, setCommPage] = useState(1);
  const [payoutPage, setPayoutPage] = useState(1);
  const [refPage, setRefPage] = useState(1);
  const [pagination, setPagination] = useState({
    commissions: { page: 1, pageSize: 10, total: 0 },
    payouts: { page: 1, pageSize: 5, total: 0 },
    referrals: { page: 1, pageSize: 10, total: 0 },
  });
  const [hasMore, setHasMore] = useState({
    commissions: true,
    payouts: true,
    referrals: true,
  });
  const CACHE_TTL_MS = 60_000;

  const cacheKey = useMemo(() => {
    const companyId = user?.companyId || user?.company?.id || "unknown";
    return createStorageKey("partner-dashboard", companyId);
  }, [user?.company?.id, user?.companyId]);

  const fetchDashboardData = useCallback(
    async ({
      signal,
      background = false,
      appendSection,
      overridePages,
    }: {
      signal?: AbortSignal;
      background?: boolean;
      appendSection?: "commissions" | "payouts" | "referrals";
      overridePages?: {
        commPage?: number;
        payoutPage?: number;
        refPage?: number;
      };
    } = {}) => {
      let success = false;
      try {
        if (!background) {
          setLoading(true);
          setError(null);
        }

        const response = await apiClient.get("/platform-partners/dashboard", {
          signal,
          params: {
            commPage: overridePages?.commPage ?? commPage,
            commLimit: pagination.commissions.pageSize,
            payoutPage: overridePages?.payoutPage ?? payoutPage,
            payoutLimit: pagination.payouts.pageSize,
            refPage: overridePages?.refPage ?? refPage,
            refLimit: pagination.referrals.pageSize,
          },
        });
        if (response.data.status === "success") {
          const dash = response.data.data.dashboard;
          const nextPagination = dash.pagination || pagination;
          setPagination(nextPagination);
          setData((prev) => {
            const prevData = appendSection ? prev || dash : dash;
            const computedTrends = {
              earningsChange:
                dash.trends?.earningsChange ??
                calcTrendPercent(
                  dash.partner?.totalEarnings,
                  prev?.partner?.totalEarnings,
                ),
              referralsChange:
                dash.trends?.referralsChange ??
                calcTrendPercent(
                  dash.stats?.totalNetworkCount,
                  prev?.stats?.totalNetworkCount,
                ),
            };
            return {
              ...dash,
              trends: computedTrends,
              recentCommissions:
                appendSection === "commissions"
                  ? [
                      ...(prevData?.recentCommissions || []),
                      ...(dash.recentCommissions || []),
                    ]
                  : dash.recentCommissions,
              recentPayouts:
                appendSection === "payouts"
                  ? [
                      ...(prevData?.recentPayouts || []),
                      ...(dash.recentPayouts || []),
                    ]
                  : dash.recentPayouts,
              referredCompanies:
                appendSection === "referrals"
                  ? [
                      ...(prevData?.referredCompanies || []),
                      ...(dash.referredCompanies || []),
                    ]
                  : dash.referredCompanies,
            };
          });
          setHasMore({
            commissions: calcHasMore(
              nextPagination.commissions,
              dash.recentCommissions?.length || 0,
            ),
            payouts: calcHasMore(
              nextPagination.payouts,
              dash.recentPayouts?.length || 0,
            ),
            referrals: calcHasMore(
              nextPagination.referrals,
              dash.referredCompanies?.length || 0,
            ),
          });
          setWithExpiry(cacheKey, dash, CACHE_TTL_MS);
          setError(null);
          success = true;
        } else {
          const message =
            response.data.message ||
            t("platformPartner.dashboard.errors.fetchDashboard");
          setError(message);
          toast.error(message);
        }
      } catch (error: any) {
        const message =
          error.response?.data?.message ||
          t("platformPartner.dashboard.errors.fetchDashboard");
        setError(message);
        toast.error(message);
      } finally {
        if (!background) {
          setLoading(false);
        }
      }
      return success;
    },
    [cacheKey, t, commPage, payoutPage, refPage, pagination],
  );

  useEffect(() => {
    const controller = new AbortController();
    const initialPages = {
      commPage: 1,
      payoutPage: 1,
      refPage: 1,
    };
    setData(null);
    setCommPage(1);
    setPayoutPage(1);
    setRefPage(1);
    setPagination({
      commissions: { page: 1, pageSize: 10, total: 0 },
      payouts: { page: 1, pageSize: 5, total: 0 },
      referrals: { page: 1, pageSize: 10, total: 0 },
    });
    setHasMore({
      commissions: true,
      payouts: true,
      referrals: true,
    });
    setError(null);
    const cached = getWithExpiry<PartnerDashboardData>(cacheKey);

    if (cached) {
      setData(cached);
      setLoading(false);
      fetchDashboardData({
        signal: controller.signal,
        background: true,
        overridePages: initialPages,
      });
    } else {
      fetchDashboardData({
        signal: controller.signal,
        overridePages: initialPages,
      });
    }

    return () => controller.abort();
  }, [cacheKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const copyToClipboard = (text: string, message: string) => {
    navigator.clipboard.writeText(text);
    toast.success(message);
  };

  const loadMoreCommissions = () => {
    if (!hasMore.commissions) return;
    const nextPage = commPage + 1;
    fetchDashboardData({
      background: true,
      appendSection: "commissions",
      overridePages: { commPage: nextPage },
    }).then((ok) => {
      if (ok) setCommPage(nextPage);
    });
  };

  const loadMorePayouts = () => {
    if (!hasMore.payouts) return;
    const nextPage = payoutPage + 1;
    fetchDashboardData({
      background: true,
      appendSection: "payouts",
      overridePages: { payoutPage: nextPage },
    }).then((ok) => {
      if (ok) setPayoutPage(nextPage);
    });
  };

  const loadMoreReferrals = () => {
    if (!hasMore.referrals) return;
    const nextPage = refPage + 1;
    fetchDashboardData({
      background: true,
      appendSection: "referrals",
      overridePages: { refPage: nextPage },
    }).then((ok) => {
      if (ok) setRefPage(nextPage);
    });
  };

  const statusLabel = (status: string) => {
    const map: Record<string, string> = {
      PAID: t("platformPartner.dashboard.status.paid") || "مدفوعة",
      CONFIRMED: t("platformPartner.dashboard.status.confirmed") || "مؤكدة",
      PENDING: t("platformPartner.dashboard.status.pending") || "معلّقة",
      PROCESSED: t("platformPartner.dashboard.status.processed") || "مُعالَجة",
      FAILED: t("platformPartner.dashboard.status.failed") || "فشلت",
      CANCELLED: t("platformPartner.dashboard.status.cancelled") || "مُلغاة",
      ACTIVE: t("platformPartner.dashboard.status.active") || "نشط",
      INACTIVE: t("platformPartner.dashboard.status.inactive") || "غير نشط",
    };
    return map[status] || status || "—";
  };

  const statusTone = (status: string) => {
    const key = status?.toUpperCase();
    if (["PAID", "CONFIRMED", "PROCESSED", "ACTIVE"].includes(key)) {
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200 border border-emerald-200/60 dark:border-emerald-800/60";
    }
    if (["PENDING"].includes(key)) {
      return "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200 border border-amber-200/60 dark:border-amber-800/60";
    }
    return "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200 border border-red-200/60 dark:border-red-800/60";
  };

  const trendTone = (value?: number | null) => {
    if (value === null || value === undefined)
      return "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300";
    if (value > 0)
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200";
    if (value < 0)
      return "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200";
    return "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200";
  };

  const methodLabel = (method: string) => {
    const map: Record<string, string> = {
      VODAFONE_CASH:
        t("platformPartner.dashboard.payout.methods.vodafoneCash") ||
        "فودافون كاش",
      INSTAPAY:
        t("platformPartner.dashboard.payout.methods.instapay") || "إنستاباي",
      BANK_TRANSFER:
        t("platformPartner.dashboard.payout.methods.bankTransfer") ||
        "حوالة بنكية",
      CASH: t("platformPartner.dashboard.payout.methods.cash") || "نقدي",
      WALLET: t("platformPartner.dashboard.payout.methods.wallet") || "محفظة",
    };
    return map[method] || method || "—";
  };

  const handlePayoutRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payoutAmount || Number(payoutAmount) <= 0) {
      toast.error(t("platformPartner.dashboard.payout.validAmountError"));
      return;
    }

    try {
      setPayoutLoading(true);
      const response = await apiClient.post(
        "/platform-partners/payout-request",
        {
          amount: Number(payoutAmount),
          method: payoutMethod,
          details: {}, // Can be expanded for bank details etc.
        },
      );

      if (response.data.status === "success") {
        toast.success(t("platformPartner.dashboard.payout.success"));
        setPayoutAmount("");
        fetchDashboardData({ background: true });
      }
    } catch (error: any) {
      toast.error(
        error.response?.data?.message ||
          t("platformPartner.dashboard.payout.error"),
      );
    } finally {
      setPayoutLoading(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="relative">
          <div className="h-16 w-16 rounded-full border-t-4 border-blue-500 animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-blue-500">
            {t("common.loading")}
          </div>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="p-8 text-center max-w-2xl mx-auto text-gray-500">
        {error}
      </div>
    );
  }

  if (!data?.partner && !loading) {
    return (
      <div className="p-8 text-center max-w-2xl mx-auto">
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 p-8 rounded-2xl shadow-sm">
          <AlertCircle className="w-16 h-16 text-blue-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">
            {t("platformPartner.dashboard.accountRequired")}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {t("platformPartner.dashboard.accountRequiredDesc")}
          </p>
        </div>
      </div>
    );
  }

  if (!data || !data.partner) return null;

  const referralLink = `${window.location.origin}/auth/register?partner=${data.partner.partnerCode}`;
  const rankOrder = [
    "PARTNER",
    "SENIOR_PARTNER",
    "MASTER_PARTNER",
    "EXECUTIVE_PARTNER",
  ];
  const currentRankIndex = Math.max(0, rankOrder.indexOf(data.partner.title));
  const progressToTop = Math.min(
    100,
    Math.round(((currentRankIndex + 1) / rankOrder.length) * 100),
  );
  const nextRankKey = rankOrder[currentRankIndex + 1];
  const nextRankLabel = nextRankKey
    ? t(`platformPartner.dashboard.ranks.${nextRankKey}`) || nextRankKey
    : t("platformPartner.dashboard.rankings.maxRank") || "";

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      {error && (
        <div className="p-4 border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/30 rounded-xl text-red-700 dark:text-red-200 flex items-center justify-between">
          <span>{error}</span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => fetchDashboardData()}
          >
            {t("common.retry") || "إعادة المحاولة"}
          </Button>
        </div>
      )}
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm backdrop-blur-xl bg-opacity-80">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            {t("platformPartner.dashboard.hello")}{" "}
            <span className="text-blue-600">{data.partner.partnerCode}</span>
            <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border-none">
              {t(`platformPartner.dashboard.ranks.${data.partner.title}`)}
            </Badge>
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {t("platformPartner.dashboard.subtitle")}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() =>
              copyToClipboard(
                data.partner.partnerCode,
                t("platformPartner.dashboard.partnerCodeCopied"),
              )
            }
            className="gap-2"
          >
            <Copy className="w-4 h-4" /> {data.partner.partnerCode}
          </Button>
          <Button
            className="bg-blue-600 hover:bg-blue-700 gap-2"
            onClick={() =>
              copyToClipboard(
                referralLink,
                t("platformPartner.dashboard.referralLinkCopied"),
              )
            }
          >
            <LinkIcon className="w-4 h-4" />{" "}
            {t("platformPartner.dashboard.copyLink")}
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          {
            label: t("platformPartner.dashboard.stats.totalEarnings"),
            value: formatPrice(data.partner.totalEarnings),
            icon: <Wallet className="text-emerald-500" />,
            trendValue: data.trends?.earningsChange,
          },
          {
            label: t("platformPartner.dashboard.stats.availablePayout"),
            value: formatPrice(data.partner.pendingEarnings),
            icon: <DollarSign className="text-blue-500" />,
            trendValue: null,
          },
          {
            label: t("platformPartner.dashboard.stats.directReferrals"),
            value: data.stats.directReferralsCount,
            icon: <Users className="text-purple-500" />,
            trendValue: data.trends?.referralsChange,
          },
          {
            label: t("platformPartner.dashboard.stats.totalNetwork"),
            value: data.stats.totalNetworkCount,
            icon: <TrendingUp className="text-orange-500" />,
            trendValue: data.trends?.referralsChange,
          },
        ].map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card className="border-none shadow-md bg-white dark:bg-gray-900 hover:shadow-xl transition-shadow duration-300">
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                    {stat.icon}
                  </div>
                  <Badge
                    variant="secondary"
                    className={trendTone(stat.trendValue)}
                  >
                    {stat.trendValue === null || stat.trendValue === undefined
                      ? "—"
                      : `${stat.trendValue > 0 ? "+" : ""}${stat.trendValue}%`}
                  </Badge>
                </div>
                <div className="mt-4">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {stat.label}
                  </p>
                  <h3 className="text-2xl font-bold mt-1">{stat.value}</h3>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Activity Table */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-none shadow-sm bg-white dark:bg-gray-900 overflow-hidden">
            <CardHeader className="border-b dark:border-gray-800">
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="w-5 h-5 text-gray-400" />{" "}
                {t("platformPartner.dashboard.commissions.title")}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 font-medium">
                    <tr className="text-left border-b dark:border-gray-800">
                      <th className="px-6 py-4">
                        {t("platformPartner.dashboard.commissions.source")}
                      </th>
                      <th className="px-6 py-4">
                        {t("platformPartner.dashboard.commissions.amount")}
                      </th>
                      <th className="px-6 py-4">
                        {t("platformPartner.dashboard.commissions.level")}
                      </th>
                      <th className="px-6 py-4">
                        {t("platformPartner.dashboard.commissions.status")}
                      </th>
                      <th className="px-6 py-4">
                        {t("platformPartner.dashboard.commissions.date")}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y dark:divide-gray-800">
                    {data.recentCommissions.length > 0 ? (
                      data.recentCommissions.map((comm, idx) => (
                        <tr
                          key={idx}
                          className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        >
                          <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                            {comm.fromCompany?.name ||
                              t("platformPartner.dashboard.commissions.system")}
                          </td>
                          <td className="px-6 py-4 text-emerald-600 dark:text-emerald-300 font-bold">
                            {formatPrice(comm.amount)}
                          </td>
                          <td className="px-6 py-4">
                            <Badge
                              variant="outline"
                              className="dark:border-gray-700 dark:text-gray-200"
                            >
                              {t("platformPartner.dashboard.commissions.level")}{" "}
                              {comm.level}
                            </Badge>
                          </td>
                          <td className="px-6 py-4">
                            <Badge className={statusTone(comm.status)}>
                              {statusLabel(comm.status)}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 text-gray-500 dark:text-gray-400">
                            {new Date(comm.createdAt).toLocaleDateString()}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-6 py-12 text-center text-gray-400"
                        >
                          {t(
                            "platformPartner.dashboard.commissions.noCommissions",
                          )}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              {hasMore.commissions && (
                <div className="px-6 py-4 text-center">
                  <Button variant="outline" onClick={loadMoreCommissions}>
                    {t("common.loadMore") || "تحميل المزيد"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Payouts Table - Added New Section */}
          <Card className="border-none shadow-sm bg-white dark:bg-gray-900 overflow-hidden">
            <CardHeader className="border-b dark:border-gray-800">
              <CardTitle className="text-lg flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-gray-400" />{" "}
                {t("platformPartner.dashboard.payout.recentPayouts")}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 font-medium">
                    <tr className="text-left border-b dark:border-gray-800">
                      <th className="px-6 py-4">
                        {t("platformPartner.dashboard.payout.amount")}
                      </th>
                      <th className="px-6 py-4">
                        {t("platformPartner.dashboard.payout.method")}
                      </th>
                      <th className="px-6 py-4">
                        {t("platformPartner.dashboard.payout.status")}
                      </th>
                      <th className="px-6 py-4">
                        {t("platformPartner.dashboard.payout.date")}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y dark:divide-gray-800">
                    {data.recentPayouts?.length > 0 ? (
                      data.recentPayouts.map((payout, idx) => (
                        <tr
                          key={idx}
                          className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        >
                          <td className="px-6 py-4 font-bold text-gray-900 dark:text-white">
                            {formatPrice(payout.amount)}
                          </td>
                          <td className="px-6 py-4 text-gray-500 dark:text-gray-400">
                            {methodLabel(payout.paymentMethod)}
                          </td>
                          <td className="px-6 py-4">
                            <Badge
                              className={`${statusTone(payout.status)} ${payout.status === "PENDING" ? "animate-pulse" : ""}`}
                            >
                              {statusLabel(payout.status)}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 text-gray-500 dark:text-gray-400">
                            {new Date(payout.createdAt).toLocaleDateString()}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={4}
                          className="px-6 py-12 text-center text-gray-400"
                        >
                          {t("platformPartner.dashboard.payout.noPayouts")}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              {hasMore.payouts && (
                <div className="px-6 py-4 text-center">
                  <Button variant="outline" onClick={loadMorePayouts}>
                    {t("common.loadMore") || "تحميل المزيد"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Referral History Table - Added New Section */}
          <Card className="border-none shadow-sm bg-white dark:bg-gray-900 overflow-hidden">
            <CardHeader className="border-b dark:border-gray-800">
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="w-5 h-5 text-gray-400" />{" "}
                {t("platformPartner.dashboard.referrals.historyTitle")}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 font-medium">
                    <tr className="text-left border-b dark:border-gray-800">
                      <th className="px-6 py-4">
                        {t("platformPartner.dashboard.referrals.companyName")}
                      </th>
                      <th className="px-6 py-4">
                        {t("platformPartner.dashboard.referrals.status")}
                      </th>
                      <th className="px-6 py-4">
                        {t("platformPartner.dashboard.referrals.date")}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y dark:divide-gray-800">
                    {data.referredCompanies?.length > 0 ? (
                      data.referredCompanies.map((ref, idx) => (
                        <tr
                          key={idx}
                          className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        >
                          <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                            {ref.name}
                          </td>
                          <td className="px-6 py-4">
                            <Badge className={statusTone(ref.status)}>
                              {statusLabel(ref.status)}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 text-gray-500 dark:text-gray-400">
                            {new Date(ref.createdAt).toLocaleDateString()}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={3}
                          className="px-6 py-12 text-center text-gray-400"
                        >
                          {t("platformPartner.dashboard.referrals.noReferrals")}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              {hasMore.referrals && (
                <div className="px-6 py-4 text-center">
                  <Button variant="outline" onClick={loadMoreReferrals}>
                    {t("common.loadMore") || "تحميل المزيد"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Payout Section */}
        <div className="space-y-6">
          <Card className="border-none shadow-lg bg-gradient-to-br from-blue-700 to-indigo-900 text-white">
            <CardContent className="p-8">
              <div className="flex justify-between items-center mb-6">
                <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-xl">
                  <Wallet className="w-8 h-8" />
                </div>
                <div className="text-right">
                  <p className="text-sm text-blue-100">
                    {t("platformPartner.dashboard.payout.readyForWithdrawal")}
                  </p>
                  <h2 className="text-3xl font-bold">
                    {formatPrice(data.partner.pendingEarnings)}
                  </h2>
                </div>
              </div>

              <form onSubmit={handlePayoutRequest} className="space-y-4">
                <div className="space-y-2">
                  <label
                    htmlFor="partner-payout-amount"
                    className="text-sm font-medium text-blue-100"
                  >
                    {t("platformPartner.dashboard.payout.amountToWithdraw")}
                  </label>
                  <input
                    id="partner-payout-amount"
                    name="payoutAmount"
                    type="number"
                    inputMode="numeric"
                    autoComplete="off"
                    value={payoutAmount}
                    onChange={(e) => setPayoutAmount(e.target.value)}
                    placeholder="EGP"
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 placeholder-white/60 text-white focus:outline-none focus:ring-2 focus:ring-white/30 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label
                    htmlFor="partner-payout-method"
                    className="text-sm font-medium text-blue-100"
                  >
                    {t("platformPartner.dashboard.payout.method")}
                  </label>
                  <select
                    id="partner-payout-method"
                    name="payoutMethod"
                    autoComplete="off"
                    value={payoutMethod}
                    onChange={(e) => setPayoutMethod(e.target.value)}
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-white/30 transition-all appearance-none text-white"
                  >
                    <option value="VODAFONE_CASH" className="text-gray-900">
                      {t(
                        "platformPartner.dashboard.payout.methods.vodafoneCash",
                      )}
                    </option>
                    <option value="INSTAPAY" className="text-gray-900">
                      {t("platformPartner.dashboard.payout.methods.instapay")}
                    </option>
                    <option value="BANK_TRANSFER" className="text-gray-900">
                      {t(
                        "platformPartner.dashboard.payout.methods.bankTransfer",
                      )}
                    </option>
                    <option value="CASH" className="text-gray-900">
                      {t("platformPartner.dashboard.payout.methods.cash")}
                    </option>
                    <option value="WALLET" className="text-gray-900">
                      {t("platformPartner.dashboard.payout.methods.wallet")}
                    </option>
                  </select>
                </div>
                <Button
                  type="submit"
                  disabled={payoutLoading || !payoutAmount}
                  className="w-full bg-white text-blue-900 hover:bg-blue-50 py-6 text-lg font-bold rounded-xl shadow-lg transition-transform active:scale-[0.98]"
                >
                  {payoutLoading
                    ? t("platformPartner.dashboard.payout.processing")
                    : t("platformPartner.dashboard.payout.withdrawFunds")}
                </Button>
              </form>

              <p className="mt-4 text-xs text-center text-blue-200 opacity-80">
                {t("platformPartner.dashboard.payout.minimumAmount")}
              </p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-white dark:bg-gray-900">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-gray-500">
                {t("platformPartner.dashboard.rankings.title")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="h-2 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 rounded-full"
                    style={{ width: `${progressToTop}%` }}
                  ></div>
                </div>
                <span className="text-xs font-bold text-blue-600">
                  {progressToTop}%
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                {t("platformPartner.dashboard.rankings.nextRank")}{" "}
                <span className="text-gray-600 dark:text-gray-300">
                  {nextRankLabel ||
                    t("platformPartner.dashboard.rankings.maxRank")}
                </span>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PartnerDashboard;
