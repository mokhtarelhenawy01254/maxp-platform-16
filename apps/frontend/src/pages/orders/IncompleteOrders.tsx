import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { getDirection } from "../../i18n";
import {
  MagnifyingGlassIcon,
  ClipboardDocumentIcon,
  ArrowTopRightOnSquareIcon,
  ArrowDownTrayIcon,
  ArrowPathIcon,
  ShoppingCartIcon,
  CurrencyDollarIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PhoneIcon,
  ChatBubbleLeftRightIcon,
  ShoppingBagIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  DocumentTextIcon,
  XMarkIcon,
  NoSymbolIcon,
} from "@heroicons/react/24/outline";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useCurrency } from "../../hooks/useCurrency";
import { useAuth } from "../../hooks/useAuthSimple";
import { useCompany } from "../../contexts/CompanyContext";
import { apiClient } from "../../services/apiClient";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import IncompleteCancelModal from "./components/IncompleteCancelModal";
import {
  ORDER_CAMPAIGN_ATTRIBUTION_APP_SLUGS,
  getCurrentCompanyActiveApps,
  hasAnyCompanyAppSlug,
  normalizeCompanyAppSlug,
} from "../../utils/companyApps";
import {
  IncompleteConvertResponse,
  IncompleteListResponse,
  IncompleteOrder,
  IncompleteStats,
  formatDateTimeCompact,
  getAbandonReasonLabel,
  getCustomerContact,
  getCustomerName,
  getExpiryStatus,
  getGovernorate,
  getLastUpdated,
  getOrderAttribution,
  getRelativeTime,
  getStatusLabel,
  getValueColor,
  getValueLabel,
  getValueTier,
} from "./incompleteUtils";
import type { OrderAttributionData } from "./types";

type SortValue = "recent" | "value_desc" | "value_asc" | "priority";

type PhoneFilter = "all" | "with_phone" | "no_phone";

interface IncompleteListParams {
  page: number;
  limit: number;
  hasPhone?: boolean;
  search?: string;
  status?: string;
  sortBy?: string;
  sortDir?: string;
}

const SKELETON_WIDTHS = [72, 55, 30, 45, 60, 35, 50, 40];

const escapeCsv = (value: unknown) => {
  const str = value == null ? "" : String(value);
  return `"${str.replace(/"/g, '""')}"`;
};

const AttributionCell: React.FC<{ attribution?: OrderAttributionData | null }> = ({
  attribution,
}) => {
  if (!attribution) {
    return (
      <span className="text-sm text-gray-300 dark:text-gray-600">—</span>
    );
  }

  const sourceLabel = (value?: string) =>
    value === "audience_network" || value === "audience-network"
      ? "Audience Network"
      : value;
  const sourceMedium = [sourceLabel(attribution.source), attribution.medium]
    .filter(Boolean)
    .join(" / ");
  const campaignLabel = attribution.campaignName || attribution.campaignId;

  return (
    <div className="flex flex-col items-start gap-1">
      <div className="flex flex-wrap items-center gap-1">
        {attribution.platform && (
          <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
            {attribution.platform}
          </span>
        )}
        {sourceMedium && (
          <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-600 dark:bg-gray-700 dark:text-gray-200">
            {sourceMedium}
          </span>
        )}
      </div>
      {campaignLabel && (
        <span
          className="inline-flex max-w-[170px] items-center rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
          title={campaignLabel}
        >
          <span className="truncate">{campaignLabel}</span>
        </span>
      )}
    </div>
  );
};

const IncompleteOrders: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { formatPrice } = useCurrency();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { company } = useCompany();

  const isMerchant = user?.role === "MERCHANT";
  const activeCompanyAppSlugSet = useMemo(
    () =>
      new Set(
        getCurrentCompanyActiveApps(user, company)
          .map(normalizeCompanyAppSlug)
          .filter(Boolean),
      ),
    [company, user],
  );
  const hasCampaignAttributionApp = hasAnyCompanyAppSlug(
    activeCompanyAppSlugSet,
    ORDER_CAMPAIGN_ATTRIBUTION_APP_SLUGS,
  );
  const canShowAttribution = !isMerchant && hasCampaignAttributionApp;

  const [orders, setOrders] = useState<IncompleteOrder[]>([]);
  const [serverStats, setServerStats] = useState<IncompleteStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [totalOrders, setTotalOrders] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");
  const [phoneFilter, setPhoneFilter] = useState<PhoneFilter>("with_phone");
  const [sortValue, setSortValue] = useState<SortValue>("priority");
  const [refreshKey, setRefreshKey] = useState(0);
  const [confirmConvertCartId, setConfirmConvertCartId] = useState<string | null>(null);
  const [convertingCartId, setConvertingCartId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [contactCartId, setContactCartId] = useState<string | null>(null);
  const [contactMethod, setContactMethod] = useState("call");
  const [contactResult, setContactResult] = useState("");
  const [contactNote, setContactNote] = useState("");
  const [savingContact, setSavingContact] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [selectedCancelOrder, setSelectedCancelOrder] = useState<IncompleteOrder | null>(null);

  const isRTL = getDirection() === "rtl";
  const lang = i18n.language;

  const fallbackStats = useMemo(() => {
    const active = orders.filter((o) => o.status !== "lost");
    const lost = orders.filter((o) => o.status === "lost");
    return {
      total: totalOrders,
      active: active.length,
      lost: lost.length,
      totalValue: active.reduce((s, o) => s + (o.total || 0), 0) + lost.reduce((s, o) => s + (o.total || 0), 0),
      activeValue: active.reduce((s, o) => s + (o.total || 0), 0),
      lostValue: lost.reduce((s, o) => s + (o.total || 0), 0),
    };
  }, [orders, totalOrders]);

  const stats = serverStats || fallbackStats;
  const statsAreServer = !!serverStats;

  useEffect(() => {
    const timeout = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  const buildParams = useCallback(
    (pageIndex: number, pageSize: number): IncompleteListParams => {
      const params: IncompleteListParams = {
        page: pageIndex,
        limit: pageSize,
      };
      if (phoneFilter === "with_phone") params.hasPhone = true;
      else if (phoneFilter === "no_phone") params.hasPhone = false;
      if (search) params.search = search;
      if (statusFilter && statusFilter !== "all") params.status = statusFilter;
      if (sortValue === "priority") {
        params.sortBy = "priority";
      } else if (sortValue === "recent") {
        params.sortBy = "checkoutUpdatedAt";
        params.sortDir = "desc";
      } else if (sortValue === "value_desc") {
        params.sortBy = "total";
        params.sortDir = "desc";
      } else if (sortValue === "value_asc") {
        params.sortBy = "total";
        params.sortDir = "asc";
      }
      return params;
    },
    [search, statusFilter, sortValue, phoneFilter],
  );

  useEffect(() => {
    const fetchIncompleteOrders = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await apiClient.get<IncompleteListResponse>("/orders-new/incomplete", {
          params: buildParams(page, limit),
        });
        const data = response.data;

        if (data?.success) {
          setOrders(Array.isArray(data.data) ? data.data : []);
          setTotalOrders(data.pagination?.total || 0);
          setTotalPages(data.pagination?.pages || 1);
          setServerStats(data.stats || null);
        } else {
          setOrders([]);
          setTotalOrders(0);
          setTotalPages(1);
          setServerStats(null);
        }
      } catch (err) {
        const apiError = err as { response?: { data?: { message?: string } }; message?: string };
        setError(apiError.response?.data?.message || t("orders.loadingOrders"));
      } finally {
        setLoading(false);
      }
    };

    fetchIncompleteOrders();
  }, [page, limit, buildParams, t, refreshKey]);

  const handleRetry = () => {
    setRefreshKey((prev) => prev + 1);
  };

  const handleCopyCartId = async (cartId: string) => {
    if (!cartId) return;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(cartId);
      } else {
        const tempInput = document.createElement("input");
        tempInput.value = cartId;
        document.body.appendChild(tempInput);
        tempInput.select();
        document.execCommand("copy");
        document.body.removeChild(tempInput);
      }
      toast.success(t("orders.incompleteCopied"));
    } catch (copyError) {
      toast.error(t("orders.incompleteCopyFailed"));
    }
  };

  const handleConvert = async (cartId: string) => {
    if (!cartId) return;
    setConvertingCartId(cartId);
    try {
      const response = await apiClient.post<IncompleteConvertResponse>(
        `/orders-new/incomplete/${encodeURIComponent(cartId)}/convert`,
      );
      const data = response.data;
      if (data?.success) {
        toast.success(t("orders.incompleteConvertSuccess"));
        if (data?.conversionLogFailed) {
          toast.warning(t("orders.incompleteConvertLogFailed"), { duration: 8000 });
        }
        setConfirmConvertCartId(null);
        handleRetry();
      } else {
        toast.error(data?.message || t("orders.incompleteConvertFailed"));
      }
    } catch (err: any) {
      const respData = err?.response?.data;
      if (respData?.code === 'EXISTING_CUSTOMER_ORDER') {
        const proceed = window.confirm(
          `${respData.message}\n\nهل تريد بالتأكيد إنشاء طلب إضافي لهذا العميل؟`
        );
        if (proceed) {
          try {
            const forceRes = await apiClient.post<IncompleteConvertResponse>(
              `/orders-new/incomplete/${encodeURIComponent(cartId)}/convert`,
              { force: true },
            );
            if (forceRes.data?.success) {
              toast.success(t("orders.incompleteConvertSuccess"));
              if (forceRes.data?.conversionLogFailed) {
                toast.warning(t("orders.incompleteConvertLogFailed"), { duration: 8000 });
              }
              setConfirmConvertCartId(null);
              handleRetry();
              return;
            }
          } catch (forceErr: any) {
            toast.error(forceErr?.response?.data?.message || forceErr?.message || t("orders.incompleteConvertFailed"));
            return;
          }
        } else {
          return;
        }
      }
      const apiError = err as { response?: { data?: { message?: string } }; message?: string };
      toast.error(apiError.response?.data?.message || apiError.message || t("orders.incompleteConvertFailed"));
    } finally {
      setConvertingCartId(null);
    }
  };

  const openContactModal = (cartId: string) => {
    setContactCartId(cartId);
    setContactMethod("call");
    setContactResult("");
    setContactNote("");
  };

  const handleSaveContact = async () => {
    if (!contactCartId) return;
    setSavingContact(true);
    try {
      const isCancelled = contactResult === "cancelled";
      const response = await apiClient.post<{ success: boolean; message?: string }>(
        `/orders-new/incomplete/${encodeURIComponent(contactCartId)}/contact`,
        {
          method: contactMethod,
          result: contactResult,
          note: contactNote,
          dismissCart: isCancelled,
        },
      );
      if (response.data?.success) {
        toast.success(
          isCancelled
            ? t("orders.incompleteCancelSuccess")
            : t("orders.incompleteContactLogged")
        );
        const savedCartId = contactCartId;
        setContactCartId(null);
        if (isCancelled) {
          setOrders((prev) => prev.filter((o) => o.cartId !== savedCartId));
          setRefreshKey((prev) => prev + 1);
        }
      } else {
        toast.error(response.data?.message || t("orders.incompleteContactFailed"));
      }
    } catch (err) {
      const apiError = err as { response?: { data?: { message?: string } }; message?: string };
      toast.error(apiError.response?.data?.message || apiError.message || t("orders.incompleteContactFailed"));
    } finally {
      setSavingContact(false);
    }
  };

  const buildWhatsAppUrl = (phone: string, name: string | null, total: number) => {
    const digits = phone.replace(/\D/g, "");
    if (!digits) return null;
    const msg = t("orders.incompleteWhatsAppMessage", {
      name: name || t("orders.notSpecified"),
      total: formatPrice(total),
    });
    return `https://wa.me/${digits}?text=${encodeURIComponent(msg)}`;
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const all: IncompleteOrder[] = [];
      const pageSize = 100;
      let pageIndex = 1;
      let total = 1;
      while ((pageIndex - 1) * pageSize < total) {
        const response = await apiClient.get<IncompleteListResponse>("/orders-new/incomplete", {
          params: buildParams(pageIndex, pageSize),
        });
        const data = response.data;
        if (!data?.success) break;
        all.push(...(Array.isArray(data.data) ? data.data : []));
        total = data.pagination?.total || 0;
        pageIndex += 1;
      }

      if (!all.length) {
        toast.error(t("orders.incompleteExportFailed"));
        return;
      }

      const headers = [
        t("orders.cartId"),
        t("orders.customerName"),
        t("orders.phone"),
        t("orders.incompleteContactEmail"),
        t("orders.governorate"),
        t("orders.itemsCount"),
        t("orders.total"),
        t("orders.orderStatus"),
        t("orders.incompleteReasonColumn"),
        t("orders.lastUpdated"),
        t("orders.incompleteAdSource"),
        t("orders.incompleteCampaign"),
      ];
      const rows = all.map((o) => {
        const contact = getCustomerContact(o.checkoutData);
        const name = getCustomerName(o.checkoutData);
        const attribution = getOrderAttribution(o);
        const sourceMedium = attribution
          ? [attribution.source, attribution.medium].filter(Boolean).join(" / ")
          : "";
        const campaign = attribution
          ? attribution.campaignName || attribution.campaignId || ""
          : "";
        return [
          o.cartId,
          name || "",
          contact.phone,
          contact.email,
          getGovernorate(o.checkoutData),
          o.itemsCount || 0,
          o.total || 0,
          getStatusLabel(o.status, t),
          getAbandonReasonLabel(o.abandonReason, t),
          getLastUpdated(o),
          sourceMedium,
          campaign,
        ];
      });
      const csv = "\uFEFF" + [headers, ...rows]
        .map((row) => row.map(escapeCsv).join(","))
        .join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `incomplete-orders-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      const apiError = err as { response?: { data?: { message?: string } }; message?: string };
      toast.error(apiError.response?.data?.message || apiError.message || t("orders.incompleteExportFailed"));
    } finally {
      setExporting(false);
    }
  };

  const statCards = [
    {
      label: t("orders.total"),
      value: stats.total,
      icon: ShoppingCartIcon,
      color: "text-blue-600 bg-blue-50 dark:text-blue-300 dark:bg-blue-900/30",
      sub: statsAreServer ? undefined : t("orders.incompletePageStats"),
    },
    {
      label: t("orders.incompleteStatusActive"),
      value: stats.active,
      icon: ClockIcon,
      color: "text-amber-600 bg-amber-50 dark:text-amber-300 dark:bg-amber-900/30",
      sub: statsAreServer
        ? formatPrice(stats.activeValue)
        : `${formatPrice(stats.activeValue)} · ${t("orders.incompletePageStats")}`,
    },
    {
      label: t("orders.incompleteStatusLost"),
      value: stats.lost,
      icon: ExclamationTriangleIcon,
      color: "text-red-600 bg-red-50 dark:text-red-300 dark:bg-red-900/30",
      sub: statsAreServer
        ? formatPrice(stats.lostValue)
        : `${formatPrice(stats.lostValue)} · ${t("orders.incompletePageStats")}`,
    },
    {
      label: t("orders.totalValue"),
      value: formatPrice(stats.totalValue),
      icon: CurrencyDollarIcon,
      color: "text-emerald-600 bg-emerald-50 dark:text-emerald-300 dark:bg-emerald-900/30",
    },
  ];

  const PrevIcon = isRTL ? ChevronRightIcon : ChevronLeftIcon;
  const NextIcon = isRTL ? ChevronLeftIcon : ChevronRightIcon;

  return (
    <div className="space-y-4" dir={getDirection()}>
      {/* Top Header */}
      <div className="flex items-center justify-between flex-wrap gap-3 pb-1">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-gray-950 dark:text-white sm:text-2xl">
            {t("orders.incompleteTitle")}
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 sm:text-sm">
            {t("orders.incompleteSubtitle")}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            to="/settings/orders?tab=incomplete"
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-200 shadow-2xs hover:bg-gray-50 dark:hover:bg-gray-700/80 active:scale-[0.98] transition-all"
          >
            <Cog6ToothIcon className="h-3.5 w-3.5" />
            {t("orders.incompleteSettings")}
          </Link>
          <Link
            to="/orders/incomplete/reports"
            className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 dark:border-blue-900/50 bg-blue-50/70 dark:bg-blue-900/20 px-3 py-1.5 text-xs font-medium text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/30 active:scale-[0.98] transition-all"
          >
            <ChartBarIcon className="h-3.5 w-3.5" />
            {t("orders.incompleteReports")}
          </Link>
          <button
            type="button"
            onClick={handleExport}
            disabled={exporting || loading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-200 shadow-2xs hover:bg-gray-50 dark:hover:bg-gray-700/80 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {exporting ? (
              <ArrowPathIcon className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <ArrowDownTrayIcon className="h-3.5 w-3.5" />
            )}
            {exporting ? t("orders.incompleteExporting") : t("orders.incompleteExport")}
          </button>
        </div>
      </div>

      {/* Telemetry Strip - Linear Single Chassis */}
      <div className="rounded-xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-2xs overflow-hidden">
        <div className="grid grid-cols-2 divide-y divide-gray-100 dark:divide-gray-800 sm:grid-cols-4 sm:divide-y-0 sm:divide-x sm:divide-x-reverse rtl:sm:divide-x-reverse">
          {statCards.map((card, idx) => (
            <div key={idx} className="p-3 sm:p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 font-medium mb-1">
                <span>{card.label}</span>
                <span className="flex h-1.5 w-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
              </div>
              <div className="text-lg sm:text-xl font-bold tracking-tight text-gray-950 dark:text-white font-mono tabular-nums">
                {typeof card.value === "number" ? card.value.toLocaleString() : card.value}
              </div>
              {card.sub && (
                <div className="text-[11px] text-gray-400 dark:text-gray-500 mt-1 truncate">
                  {card.sub}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Filters and Search Bar - Cohesive Single Surface */}
      <div className="rounded-xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900 p-2.5 shadow-2xs">
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <label htmlFor="incomplete-orders-search" className="sr-only">
              {t("orders.incompleteSearchLabel")}
            </label>
            <MagnifyingGlassIcon className="h-4 w-4 text-gray-400 absolute start-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="incomplete-orders-search"
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={t("orders.incompleteSearchPlaceholder")}
              className="w-full ps-9 pe-9 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50/50 dark:bg-gray-800/50 text-xs sm:text-sm placeholder-gray-400 focus:bg-white dark:focus:bg-gray-800 focus:border-gray-400 focus:ring-1 focus:ring-gray-300 dark:focus:ring-gray-700 outline-none transition-all"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {/* Segmented active/lost toggle */}
            <div className="flex items-center rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-100/70 dark:bg-gray-800 p-0.5">
              <button
                type="button"
                onClick={() => {
                  setStatusFilter("active");
                  setPage(1);
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  statusFilter === "active"
                    ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-xs"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                }`}
                aria-pressed={statusFilter === "active"}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                {t("orders.incompleteStatusActive")}
                <span className="font-mono tabular-nums text-[11px] opacity-75">
                  ({stats.active})
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setStatusFilter("lost");
                  setPage(1);
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  statusFilter === "lost"
                    ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-xs"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                }`}
                aria-pressed={statusFilter === "lost"}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                {t("orders.incompleteStatusLost")}
                <span className="font-mono tabular-nums text-[11px] opacity-75">
                  ({stats.lost})
                </span>
              </button>
            </div>

            <label htmlFor="incomplete-orders-phone" className="sr-only">
              {t("orders.incompletePhoneLabel")}
            </label>
            <select
              id="incomplete-orders-phone"
              value={phoneFilter}
              onChange={(e) => {
                setPhoneFilter(e.target.value as PhoneFilter);
                setPage(1);
              }}
              className="px-2.5 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-xs font-medium focus:border-gray-400 focus:ring-1 focus:ring-gray-300 dark:focus:ring-gray-700 outline-none transition-all cursor-pointer"
            >
              <option value="with_phone">{t("orders.incompletePhoneWith")}</option>
              <option value="no_phone">{t("orders.incompletePhoneWithout")}</option>
              <option value="all">{t("orders.incompletePhoneAll")}</option>
            </select>

            <label htmlFor="incomplete-orders-sort" className="sr-only">
              {t("orders.incompleteSort")}
            </label>
            <select
              id="incomplete-orders-sort"
              value={sortValue}
              onChange={(e) => {
                setSortValue(e.target.value as SortValue);
                setPage(1);
              }}
              className="px-2.5 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-xs font-medium focus:border-gray-400 focus:ring-1 focus:ring-gray-300 dark:focus:ring-gray-700 outline-none transition-all cursor-pointer"
            >
              <option value="priority">{t("orders.incompleteSortPriority")}</option>
              <option value="recent">{t("orders.incompleteSortLastUpdated")}</option>
              <option value="value_desc">{t("orders.incompleteSortValueDesc")}</option>
              <option value="value_asc">{t("orders.incompleteSortValueAsc")}</option>
            </select>

            <label htmlFor="incomplete-orders-per-page" className="sr-only">
              {t("orders.incompletePerPage")}
            </label>
            <select
              id="incomplete-orders-per-page"
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setPage(1);
              }}
              className="px-2 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-xs font-medium focus:border-gray-400 focus:ring-1 focus:ring-gray-300 dark:focus:ring-gray-700 outline-none transition-all cursor-pointer font-mono"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>

            <button
              type="button"
              onClick={handleRetry}
              className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700/80 active:scale-[0.98] transition-all"
              title={t("orders.incompleteRetry")}
              aria-label={t("orders.incompleteRetry")}
            >
              <ArrowPathIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Orders Table - Single Surface Chassis */}
      <div className="rounded-xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-start min-w-[1350px]">
            <thead>
              <tr className="border-b border-gray-200/80 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-800/40">
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t("orders.customer")}
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t("orders.contact")}
                </th>
                <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t("orders.itemsCount")}
                </th>
                <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t("orders.amount")}
                </th>
                {canShowAttribution && (
                  <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t("orders.incompleteAdSource")}
                  </th>
                )}
                <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t("orders.lastUpdated")}
                </th>
                <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t("orders.incompleteReasonColumn")}
                </th>
                <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t("orders.orderStatus")}
                </th>
                <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t("orders.incompleteActions")}
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, idx) => (
                  <tr key={`skeleton-${idx}`} className="border-b border-gray-50 dark:border-gray-700/50 last:border-0">
                    {SKELETON_WIDTHS.map((width, cellIdx) => (
                      <td key={`skeleton-${idx}-${cellIdx}`} className="px-5 py-4">
                        <div
                          className="h-4 rounded-md bg-gray-100 dark:bg-gray-700 animate-pulse"
                          style={{ width: `${width}%` }}
                        />
                      </td>
                    ))}
                  </tr>
                ))
              ) : error ? (
                <tr>
                  <td colSpan={canShowAttribution ? 9 : 8} className="px-5 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="p-3 rounded-full bg-red-50 dark:bg-red-900/20">
                        <ExclamationTriangleIcon className="h-6 w-6 text-red-500" />
                      </div>
                      <p className="text-sm font-medium text-red-600 dark:text-red-400">{error}</p>
                      <button
                        type="button"
                        onClick={handleRetry}
                        className="inline-flex items-center gap-2 rounded-lg border border-red-200 dark:border-red-800 px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      >
                        <ArrowPathIcon className="h-4 w-4" />
                        {t("orders.incompleteRetry")}
                      </button>
                    </div>
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={canShowAttribution ? 9 : 8} className="px-5 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="p-3 rounded-full bg-gray-100 dark:bg-gray-700">
                        <ShoppingCartIcon className="h-6 w-6 text-gray-400" />
                      </div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                        {t("orders.incompleteNoOrders")}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        {t("orders.incompleteNoOrdersDesc")}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                orders.map((order, idx) => {
                  const contact = getCustomerContact(order.checkoutData);
                  const lastUpdated = getLastUpdated(order);
                  const name = getCustomerName(order.checkoutData);
                  const valueTier = getValueTier(order.total || 0);
                  const governorate = getGovernorate(order.checkoutData);
                  const expiry = getExpiryStatus(order, t);
                  const whatsappUrl = buildWhatsAppUrl(contact.phone, name, order.total || 0);
                  const isConverting = convertingCartId === order.cartId;

                  return (
                    <tr
                      key={order.cartId}
                      onClick={() => navigate(`/orders/incomplete/${encodeURIComponent(order.cartId)}`)}
                      className={`group border-b border-gray-100 dark:border-gray-800/80 last:border-0 transition-colors cursor-pointer hover:bg-gray-50/70 dark:hover:bg-gray-800/50 ${
                        idx % 2 === 0 ? "bg-white dark:bg-gray-900" : "bg-gray-50/20 dark:bg-gray-900/40"
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="h-7 w-7 rounded-full bg-slate-100 dark:bg-slate-850 flex items-center justify-center text-xs font-semibold text-slate-700 dark:text-slate-300 shrink-0">
                            {name ? name.charAt(0).toUpperCase() : "?"}
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white truncate max-w-[160px]">
                              {name || (
                                <span className="text-gray-400 dark:text-gray-500 italic">
                                  {t("orders.notSpecified")}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
                              <span className="font-mono tabular-nums truncate max-w-[120px]" title={order.cartId}>
                                {order.cartId.slice(0, 12)}...
                              </span>
                              {governorate && (
                                <>
                                  <span className="text-gray-300 dark:text-gray-600">·</span>
                                  <span>{governorate}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-xs sm:text-sm text-gray-900 dark:text-white font-mono tabular-nums font-medium">
                          {contact.phone || (
                            <span className="text-gray-400 dark:text-gray-500 font-sans">{t("orders.notSpecified")}</span>
                          )}
                        </div>
                        <div className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5 truncate max-w-[140px]">
                          {contact.email || "-"}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <span className="text-xs sm:text-sm font-semibold font-mono tabular-nums text-gray-900 dark:text-white">
                            {order.itemsCount || 0}
                          </span>
                          <span className="text-[11px] text-gray-400 dark:text-gray-500">
                            {t("orders.items")}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-800/60 text-xs font-semibold font-mono tabular-nums text-gray-900 dark:text-white"
                          title={getValueLabel(valueTier, t)}
                        >
                          <span>{formatPrice(order.total || 0)}</span>
                        </div>
                      </td>
                      {canShowAttribution && (
                        <td className="px-4 py-3">
                          <AttributionCell attribution={getOrderAttribution(order)} />
                        </td>
                      )}
                      <td className="px-4 py-3">
                        <div className="text-xs text-gray-600 dark:text-gray-300" title={lastUpdated ? formatDateTimeCompact(lastUpdated, lang) : ""}>
                          {lastUpdated ? getRelativeTime(lastUpdated, t) || formatDateTimeCompact(lastUpdated, lang) : "-"}
                        </div>
                        {lastUpdated && (
                          <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5 font-mono tabular-nums">
                            {formatDateTimeCompact(lastUpdated, lang)}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-col gap-1.5">
                          {order.abandonReason?.code ? (
                            <span
                              className="inline-flex w-fit max-w-[210px] items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-800 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
                              title={getAbandonReasonLabel(order.abandonReason, t)}
                            >
                              <span className="truncate">
                                {getAbandonReasonLabel(order.abandonReason, t)}
                              </span>
                            </span>
                          ) : (
                            <span className="text-sm text-gray-300 dark:text-gray-600">—</span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-col gap-1.5">
                          <span
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border w-fit ${
                              order.status === "lost"
                                ? "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800"
                                : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800"
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                order.status === "lost" ? "bg-red-500" : "bg-amber-500"
                              }`}
                            />
                            {getStatusLabel(order.status, t)}
                          </span>
                          {expiry && (
                            <span
                              className={`inline-flex items-center gap-1 text-[11px] font-medium ${
                                expiry.urgent
                                  ? "text-red-500 dark:text-red-400"
                                  : "text-gray-400 dark:text-gray-500"
                              }`}
                            >
                              <ClockIcon className="h-3 w-3" />
                              {expiry.label}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5">
                          {contact.phone ? (
                            <a
                              href={`tel:${contact.phone.replace(/\D/g, "")}`}
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-500 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200 dark:hover:bg-emerald-900/20 dark:hover:text-emerald-400 dark:hover:border-emerald-800 transition-all"
                              title={t("orders.incompleteCall")}
                              aria-label={t("orders.incompleteCall")}
                            >
                              <PhoneIcon className="h-4 w-4" />
                            </a>
                          ) : (
                            <span
                              className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-300 dark:text-gray-600 cursor-not-allowed"
                              title={t("orders.incompleteNoPhoneToContact")}
                              aria-label={t("orders.incompleteNoPhoneToContact")}
                            >
                              <PhoneIcon className="h-4 w-4" />
                            </span>
                          )}
                          {whatsappUrl ? (
                            <a
                              href={whatsappUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-500 hover:bg-green-50 hover:text-green-600 hover:border-green-200 dark:hover:bg-green-900/20 dark:hover:text-green-400 dark:hover:border-green-800 transition-all"
                              title={t("orders.incompleteWhatsApp")}
                              aria-label={t("orders.incompleteWhatsApp")}
                            >
                              <ChatBubbleLeftRightIcon className="h-4 w-4" />
                            </a>
                          ) : (
                            <span
                              className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-300 dark:text-gray-600 cursor-not-allowed"
                              title={t("orders.incompleteNoPhoneToContact")}
                              aria-label={t("orders.incompleteNoPhoneToContact")}
                            >
                              <ChatBubbleLeftRightIcon className="h-4 w-4" />
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (contact.phone) {
                                setConfirmConvertCartId(order.cartId);
                              } else {
                                toast.error(t("orders.incompleteConvertNoPhone"));
                              }
                            }}
                            disabled={isConverting}
                            className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            title={t("orders.incompleteQuickConvert")}
                            aria-label={t("orders.incompleteQuickConvert")}
                          >
                            {isConverting ? (
                              <ArrowPathIcon className="h-4 w-4 animate-spin" />
                            ) : (
                              <ShoppingBagIcon className="h-4 w-4" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openContactModal(order.cartId);
                            }}
                            className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-500 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 dark:hover:bg-indigo-900/20 dark:hover:text-indigo-400 dark:hover:border-indigo-800 transition-all"
                            title={t("orders.incompleteLogContact") as string}
                            aria-label={t("orders.incompleteLogContact") as string}
                          >
                            <DocumentTextIcon className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedCancelOrder(order);
                              setCancelModalOpen(true);
                            }}
                            className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                            title={t("orders.incompleteCancelOrder") as string}
                            aria-label={t("orders.incompleteCancelOrder") as string}
                          >
                            <NoSymbolIcon className="h-4 w-4" />
                          </button>
                          <Link
                            to={`/orders/incomplete/${encodeURIComponent(order.cartId)}`}
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-500 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 dark:hover:bg-blue-900/20 dark:hover:text-blue-400 dark:hover:border-blue-800 transition-all"
                            title={t("orders.incompleteViewDetails")}
                            aria-label={t("orders.incompleteViewDetails")}
                          >
                            <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                          </Link>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopyCartId(order.cartId);
                            }}
                            className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-300 transition-all"
                            title={t("orders.incompleteCopyId")}
                            aria-label={t("orders.incompleteCopyId")}
                          >
                            <ClipboardDocumentIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {!loading && orders.length > 0 && (
        <div className="flex items-center justify-between flex-wrap gap-4 text-sm">
          <div className="text-gray-500 dark:text-gray-400">
            <span className="font-medium text-gray-700 dark:text-gray-200">
              {totalOrders}
            </span>{" "}
            {t("orders.orders2")}{" "}
            <span className="text-gray-300 dark:text-gray-600 mx-1">·</span>
            {t("orders.showing")}{" "}
            <span className="font-medium text-gray-700 dark:text-gray-200">
              {(page - 1) * limit + 1}
            </span>{" "}
            {t("orders.to")}{" "}
            <span className="font-medium text-gray-700 dark:text-gray-200">
              {Math.min(page * limit, totalOrders)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
              disabled={page === 1}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-gray-200 dark:border-gray-600 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <PrevIcon className="h-4 w-4" />
              {t("orders.previous")}
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                const start = Math.max(1, Math.min(page - 2, totalPages - 4));
                const pg = start + i;
                if (pg > totalPages) return null;
                return (
                  <button
                    key={pg}
                    onClick={() => setPage(pg)}
                    className={`h-9 w-9 rounded-lg text-sm font-medium transition-colors ${
                      pg === page
                        ? "bg-blue-600 text-white shadow-sm"
                        : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600"
                    }`}
                  >
                    {pg}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={page >= totalPages}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-gray-200 dark:border-gray-600 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {t("orders.next")}
              <NextIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!confirmConvertCartId}
        title={t("orders.incompleteConfirmTitle")}
        content={t("orders.incompleteConfirmContent")}
        confirmLabel={t("orders.incompleteQuickConvert")}
        cancelLabel={t("orders.incompleteCancel")}
        confirmColor="success"
        onConfirm={() => confirmConvertCartId && handleConvert(confirmConvertCartId)}
        onCancel={() => setConfirmConvertCartId(null)}
      />

      {contactCartId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
          onClick={() => setContactCartId(null)}
        >
          <div
            className="w-full max-w-md bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                {t("orders.incompleteLogContact")}
              </h3>
              <button
                type="button"
                onClick={() => setContactCartId(null)}
                className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                aria-label={t("orders.incompleteCancel") as string}
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label htmlFor="contact-method" className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  {t("orders.incompleteContactMethod")}
                </label>
                <select
                  id="contact-method"
                  value={contactMethod}
                  onChange={(e) => setContactMethod(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/30 outline-none transition-all"
                >
                  <option value="call">{t("orders.incompleteCall")}</option>
                  <option value="whatsapp">{t("orders.incompleteWhatsApp")}</option>
                  <option value="email">{t("orders.incompleteContactEmail")}</option>
                </select>
              </div>

              <div>
                <label htmlFor="contact-result" className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  {t("orders.incompleteContactResult")}
                </label>
                <select
                  id="contact-result"
                  value={contactResult}
                  onChange={(e) => setContactResult(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/30 outline-none transition-all"
                >
                  <option value="">{t("orders.notSpecified")}</option>
                  <option value="answered">{t("orders.incompleteContactResultAnswered")}</option>
                  <option value="no_reply">{t("orders.incompleteContactResultNoReply")}</option>
                  <option value="busy">{t("orders.incompleteContactResultBusy")}</option>
                  <option value="wrong_number">{t("orders.incompleteContactResultWrongNumber")}</option>
                  <option value="cancelled">{t("orders.incompleteContactResultCancelled")}</option>
                </select>
              </div>

              {contactResult === "cancelled" && (
                <div className="rounded-xl border border-red-200/80 bg-red-50/70 p-3 space-y-2 dark:border-red-900/40 dark:bg-red-900/15">
                  <p className="text-xs text-red-700 dark:text-red-300">
                    {t("orders.incompleteContactCancelledNotice")}
                  </p>
                  <div className="space-y-1">
                    <span className="block text-[11px] font-medium text-red-800 dark:text-red-300">
                      {t("orders.incompleteCancelReasonPrompt")}:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {[
                        t("orders.incompleteCancelReasonHighShipping"),
                        t("orders.incompleteCancelReasonBoughtElsewhere"),
                        t("orders.incompleteCancelReasonNotInterested"),
                        t("orders.incompleteCancelReasonPriceHigh"),
                        t("orders.incompleteCancelReasonChangedMind"),
                        t("orders.incompleteCancelReasonOther"),
                      ].map((reason) => (
                        <button
                          key={reason}
                          type="button"
                          onClick={() => {
                            setContactNote((prev) =>
                              prev ? `${reason} - ${prev}` : reason
                            );
                          }}
                          className="rounded-lg border border-red-200 bg-white px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50 dark:border-red-800 dark:bg-gray-800 dark:text-red-300 transition-colors shadow-2xs"
                        >
                          {reason}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label htmlFor="contact-note" className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  {t("orders.incompleteContactNote")}
                </label>
                <textarea
                  id="contact-note"
                  value={contactNote}
                  onChange={(e) => setContactNote(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/30 outline-none transition-all resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setContactCartId(null)}
                className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                {t("orders.incompleteCancel")}
              </button>
              <button
                type="button"
                onClick={handleSaveContact}
                disabled={savingContact}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {savingContact ? (
                  <ArrowPathIcon className="h-4 w-4 animate-spin" />
                ) : (
                  <DocumentTextIcon className="h-4 w-4" />
                )}
                {savingContact ? t("orders.incompleteContactSaving") : t("orders.incompleteContactSave")}
              </button>
            </div>
          </div>
        </div>
      )}

      <IncompleteCancelModal
        open={cancelModalOpen}
        cartId={selectedCancelOrder?.cartId || null}
        customerName={selectedCancelOrder ? getCustomerName(selectedCancelOrder.checkoutData) : null}
        customerPhone={selectedCancelOrder ? getCustomerContact(selectedCancelOrder.checkoutData)?.phone : null}
        cartTotal={selectedCancelOrder?.total}
        onClose={() => {
          setCancelModalOpen(false);
          setSelectedCancelOrder(null);
        }}
        onSuccess={() => {
          if (selectedCancelOrder) {
            setOrders((prev) => prev.filter((o) => o.cartId !== selectedCancelOrder.cartId));
          }
          setRefreshKey((prev) => prev + 1);
        }}
      />
    </div>
  );
};

export default IncompleteOrders;
