import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useDateFormat } from "../../hooks/useDateFormat";
import { useCurrency } from "../../hooks/useCurrency";
import { getApiUrl } from "../../config/environment";
import tokenManager from "../../utils/tokenManager";
import { toast } from "sonner";
import {
  TicketIcon,
  PlusIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  ClipboardDocumentIcon,
  XMarkIcon,
  SparklesIcon,
  MagnifyingGlassIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  CurrencyDollarIcon,
} from "@heroicons/react/24/outline";

export interface Coupon {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  type: "percentage" | "fixed" | "free_shipping" | "PERCENTAGE" | "FIXED_AMOUNT" | "FREE_SHIPPING";
  value: number;
  minOrderAmount?: number | null;
  maxDiscountAmount?: number | null;
  usageLimit?: number | null;
  usageCount: number;
  userUsageLimit?: number | null;
  validFrom: string;
  validTo: string;
  isActive: boolean;
  customerSegments?: string[] | string | null;
  allowWithLoyalty?: boolean;
  createdAt?: string;
  createdBy?: string;
}

interface CouponStats {
  totalCoupons: number;
  activeCoupons: number;
  totalUsages: number;
  totalDiscount: number;
}

const Coupons: React.FC = () => {
  const { t } = useTranslation();
  const { formatDate } = useDateFormat();
  const { formatPrice } = useCurrency();

  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [stats, setStats] = useState<CouponStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Modals
  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);
  const [showCouponModal, setShowCouponModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingCoupon, setDeletingCoupon] = useState<Coupon | null>(null);

  // Filters & Search & Pagination
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState({
    isActive: "",
    type: "",
    customerSegment: "",
  });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const limit = 20;

  // Default dates for new coupon (now to +30 days)
  const getDefaultDates = () => {
    const now = new Date();
    const in30Days = new Date();
    in30Days.setDate(in30Days.getDate() + 30);
    const toInputFormat = (d: Date) => {
      const pad = (n: number) => String(n).padStart(2, "0");
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };
    return {
      validFrom: toInputFormat(now),
      validTo: toInputFormat(in30Days),
    };
  };

  const initialNewCouponState = {
    code: "",
    name: "",
    description: "",
    type: "percentage" as "percentage" | "fixed" | "free_shipping",
    value: 10,
    minOrderAmount: 0,
    maxDiscountAmount: 0,
    usageLimit: 100,
    userUsageLimit: 1,
    validFrom: getDefaultDates().validFrom,
    validTo: getDefaultDates().validTo,
    isActive: true,
    customerSegments: ["all"],
    allowWithLoyalty: true,
  };

  const [newCoupon, setNewCoupon] = useState(initialNewCouponState);

  // Helper for generating promo code
  const generateRandomCode = (prefix = "SAVE") => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let rand = "";
    for (let i = 0; i < 4; i++) {
      rand += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `${prefix}-${rand}`;
  };

  const getTypeText = (type: string) => {
    switch (type?.toLowerCase()) {
      case "percentage":
        return t("coupons.typePercentage");
      case "fixed":
      case "fixed_amount":
        return t("coupons.typeFixed");
      case "free_shipping":
        return t("coupons.typeFreeShipping");
      default:
        return type;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type?.toLowerCase()) {
      case "percentage":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-800/50";
      case "fixed":
      case "fixed_amount":
        return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50";
      case "free_shipping":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 border border-purple-200 dark:border-purple-800/50";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
    }
  };

  // Fetch Stats
  const fetchStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      const response = await fetch(`${getApiUrl()}/coupons/stats`, {
        headers: tokenManager.createAuthHeaders({
          "Content-Type": "application/json",
        }),
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setStats(data.data);
        }
      }
    } catch (err) {
      console.error("Error fetching coupon stats:", err);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // Fetch Coupons
  const fetchCoupons = useCallback(async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();

      if (filters.isActive) queryParams.append("isActive", filters.isActive);
      if (filters.type) queryParams.append("type", filters.type);
      if (filters.customerSegment)
        queryParams.append("customerSegment", filters.customerSegment);
      queryParams.append("page", String(page));
      queryParams.append("limit", String(limit));

      const response = await fetch(`${getApiUrl()}/coupons?${queryParams.toString()}`, {
        headers: tokenManager.createAuthHeaders({
          "Content-Type": "application/json",
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        setCoupons(data.data || []);
        if (data.pagination) {
          setTotalPages(data.pagination.totalPages || 1);
          setTotalCount(data.pagination.total || 0);
        }
      }
    } catch (error) {
      console.error("Error fetching coupons:", error);
      toast.error(t("coupons.fetchFailed"));
    } finally {
      setLoading(false);
    }
  }, [filters, page, t]);

  useEffect(() => {
    fetchCoupons();
  }, [fetchCoupons]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Client-side search filter
  const filteredCoupons = useMemo(() => {
    if (!searchQuery.trim()) return coupons;
    const q = searchQuery.toLowerCase().trim();
    return coupons.filter(
      (c) =>
        c.code?.toLowerCase().includes(q) ||
        c.name?.toLowerCase().includes(q) ||
        c.description?.toLowerCase().includes(q),
    );
  }, [coupons, searchQuery]);

  // Create Coupon
  const createCoupon = async () => {
    if (!newCoupon.code.trim() || !newCoupon.name.trim()) {
      toast.error("يرجى إدخال كود الكوبون واسمه");
      return;
    }
    if (newCoupon.type !== "free_shipping" && (!newCoupon.value || newCoupon.value <= 0)) {
      toast.error("يرجى تحديد قيمة الخصم أكبر من 0");
      return;
    }

    try {
      setActionLoading(true);
      const response = await fetch(`${getApiUrl()}/coupons`, {
        method: "POST",
        headers: tokenManager.createAuthHeaders({
          "Content-Type": "application/json",
        }),
        body: JSON.stringify(newCoupon),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        toast.success(t("coupons.created"));
        setShowCreateModal(false);
        setNewCoupon({
          ...initialNewCouponState,
          ...getDefaultDates(),
        });
        fetchCoupons();
        fetchStats();
      } else {
        toast.error(data.error || t("coupons.createFailed"));
      }
    } catch (error: unknown) {
      console.error("Error creating coupon:", error);
      toast.error(
        `${t("coupons.createFailed")}: ${
          error instanceof Error ? error.message : t("coupons.createError")
        }`,
      );
    } finally {
      setActionLoading(false);
    }
  };

  // Update Coupon
  const handleUpdateCoupon = async () => {
    if (!editingCoupon) return;
    if (!editingCoupon.code.trim() || !editingCoupon.name.trim()) {
      toast.error("يرجى إدخال كود الكوبون واسمه");
      return;
    }

    try {
      setActionLoading(true);
      const response = await fetch(`${getApiUrl()}/coupons/${editingCoupon.id}`, {
        method: "PUT",
        headers: tokenManager.createAuthHeaders({
          "Content-Type": "application/json",
        }),
        body: JSON.stringify(editingCoupon),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        toast.success(t("coupons.updated"));
        setShowEditModal(false);
        setEditingCoupon(null);
        fetchCoupons();
        fetchStats();
      } else {
        toast.error(data.error || t("coupons.updateFailed"));
      }
    } catch (err: unknown) {
      console.error("Error updating coupon:", err);
      toast.error(t("coupons.updateFailed"));
    } finally {
      setActionLoading(false);
    }
  };

  // Quick Toggle Status
  const handleToggleStatus = async (coupon: Coupon) => {
    const newStatus = !coupon.isActive;
    setCoupons((prev) =>
      prev.map((c) => (c.id === coupon.id ? { ...c, isActive: newStatus } : c)),
    );

    try {
      const response = await fetch(`${getApiUrl()}/coupons/${coupon.id}`, {
        method: "PUT",
        headers: tokenManager.createAuthHeaders({
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({ isActive: newStatus }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        toast.success(t("coupons.statusUpdated"));
        fetchStats();
      } else {
        setCoupons((prev) =>
          prev.map((c) => (c.id === coupon.id ? { ...c, isActive: coupon.isActive } : c)),
        );
        toast.error(data.error || t("coupons.updateFailed"));
      }
    } catch {
      setCoupons((prev) =>
        prev.map((c) => (c.id === coupon.id ? { ...c, isActive: coupon.isActive } : c)),
      );
      toast.error(t("coupons.updateFailed"));
    }
  };

  // Delete Coupon
  const handleDeleteCoupon = async () => {
    if (!deletingCoupon) return;
    try {
      setActionLoading(true);
      const response = await fetch(`${getApiUrl()}/coupons/${deletingCoupon.id}`, {
        method: "DELETE",
        headers: tokenManager.createAuthHeaders({
          "Content-Type": "application/json",
        }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        toast.success(t("coupons.deleted"));
        setShowDeleteModal(false);
        setDeletingCoupon(null);
        fetchCoupons();
        fetchStats();
      } else {
        toast.error(data.error || t("coupons.deleteFailed"));
      }
    } catch (err) {
      console.error("Error deleting coupon:", err);
      toast.error(t("coupons.deleteFailed"));
    } finally {
      setActionLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast.success(t("coupons.codeCopied"));
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 bg-slate-50/50 dark:bg-slate-950 min-h-screen space-y-4" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-1">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-gray-950 dark:text-white sm:text-2xl flex items-center gap-2">
            <TicketIcon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            {t("coupons.pageTitle")}
          </h1>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 sm:text-sm">
            {t("coupons.pageDescription")}
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => {
              fetchCoupons();
              fetchStats();
            }}
            title="تحديث البيانات"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/80 shadow-2xs active:scale-[0.98] transition-all"
          >
            <ArrowPathIcon className={`h-3.5 w-3.5 ${loading ? "animate-spin text-indigo-600" : ""}`} />
            تحديث
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 rounded-lg text-xs font-semibold shadow-xs active:scale-[0.98] transition-all"
          >
            <PlusIcon className="h-3.5 w-3.5" />
            {t("coupons.newCoupon")}
          </button>
        </div>
      </div>

      {/* KPI Stats Strip - Linear Single Chassis */}
      <div className="rounded-xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-2xs overflow-hidden">
        <div className="grid grid-cols-2 divide-y divide-gray-100 dark:divide-gray-800 sm:grid-cols-4 sm:divide-y-0 sm:divide-x sm:divide-x-reverse rtl:sm:divide-x-reverse">
          <div className="p-3 sm:p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 font-medium mb-1">
              <span>{t("coupons.statsTotalCoupons")}</span>
              <span className="flex h-1.5 w-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
            </div>
            <div className="text-lg sm:text-xl font-bold tracking-tight text-gray-950 dark:text-white font-mono tabular-nums">
              {statsLoading ? "..." : (stats?.totalCoupons ?? totalCount)}
            </div>
            <div className="text-[11px] text-gray-400 dark:text-gray-500 mt-1 font-mono">
              إجمالي الكوبونات المسجلة
            </div>
          </div>

          <div className="p-3 sm:p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 font-medium mb-1">
              <span>{t("coupons.statsActiveCoupons")}</span>
              <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </div>
            <div className="text-lg sm:text-xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
              {statsLoading ? "..." : (stats?.activeCoupons ?? "-")}
            </div>
            <div className="text-[11px] text-emerald-600/70 dark:text-emerald-400/70 mt-1 font-mono">
              جاهزة للاستخدام الآن
            </div>
          </div>

          <div className="p-3 sm:p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 font-medium mb-1">
              <span>{t("coupons.statsTotalUsages")}</span>
              <span className="flex h-1.5 w-1.5 rounded-full bg-indigo-500" />
            </div>
            <div className="text-lg sm:text-xl font-bold tracking-tight text-indigo-600 dark:text-indigo-400 font-mono tabular-nums">
              {statsLoading ? "..." : (stats?.totalUsages ?? "-")}
            </div>
            <div className="text-[11px] text-gray-400 dark:text-gray-500 mt-1 font-mono">
              مرات التطبيق بالطلبات
            </div>
          </div>

          <div className="p-3 sm:p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 font-medium mb-1">
              <span>{t("coupons.statsTotalDiscount")}</span>
              <span className="flex h-1.5 w-1.5 rounded-full bg-amber-500" />
            </div>
            <div className="text-lg sm:text-xl font-bold tracking-tight text-amber-600 dark:text-amber-400 font-mono tabular-nums">
              {statsLoading ? "..." : formatPrice(stats?.totalDiscount || 0)}
            </div>
            <div className="text-[11px] text-gray-400 dark:text-gray-500 mt-1 font-mono">
              قيمة الخصومات الممنوحة
            </div>
          </div>
        </div>
      </div>

      {/* Table Chassis with integrated control bar */}
      <div className="rounded-xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-2xs overflow-hidden">
        {/* Compact Integrated Filter Bar */}
        <div className="p-3 border-b border-gray-100 dark:border-gray-800 flex flex-wrap items-center justify-between gap-2 bg-gray-50/50 dark:bg-gray-900/50">
          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <MagnifyingGlassIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t("coupons.searchPlaceholder")}
                className="w-full pr-9 pl-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-white transition-all"
              />
            </div>

            <select
              value={filters.isActive}
              onChange={(e) => {
                setFilters({ ...filters, isActive: e.target.value });
                setPage(1);
              }}
              className="px-2.5 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs text-gray-700 dark:text-gray-200 focus:outline-none"
            >
              <option value="">{t("coupons.filterAllStatuses")}</option>
              <option value="true">{t("coupons.filterActive")}</option>
              <option value="false">{t("coupons.filterInactive")}</option>
            </select>

            <select
              value={filters.type}
              onChange={(e) => {
                setFilters({ ...filters, type: e.target.value });
                setPage(1);
              }}
              className="px-2.5 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs text-gray-700 dark:text-gray-200 focus:outline-none"
            >
              <option value="">{t("coupons.filterAllTypes")}</option>
              <option value="percentage">{t("coupons.filterPercentage")}</option>
              <option value="fixed">{t("coupons.filterFixed")}</option>
              <option value="free_shipping">{t("coupons.filterFreeShipping")}</option>
            </select>

            <select
              value={filters.customerSegment}
              onChange={(e) => {
                setFilters({ ...filters, customerSegment: e.target.value });
                setPage(1);
              }}
              className="px-2.5 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs text-gray-700 dark:text-gray-200 focus:outline-none"
            >
              <option value="">{t("coupons.filterAllSegments")}</option>
              <option value="all">{t("coupons.filterAllCustomers")}</option>
              <option value="new">{t("coupons.filterNewCustomers")}</option>
              <option value="VIP">{t("coupons.filterVip")}</option>
              <option value="regular">{t("coupons.filterRegular")}</option>
            </select>
          </div>

          {(searchQuery || filters.isActive || filters.type || filters.customerSegment) && (
            <button
              onClick={() => {
                setFilters({ isActive: "", type: "", customerSegment: "" });
                setSearchQuery("");
                setPage(1);
              }}
              className="text-xs text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 underline px-2 py-1"
            >
              {t("coupons.filterReset")}
            </button>
          )}
        </div>

        {/* Table directly inside chassis */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-800 text-right rtl:text-right ltr:text-left">
            <thead className="bg-slate-50/75 dark:bg-slate-900/75 text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-2.5">{t("coupons.tableCode")}</th>
                <th className="px-4 py-2.5">{t("coupons.tableName")}</th>
                <th className="px-4 py-2.5">{t("coupons.tableType")}</th>
                <th className="px-4 py-2.5">{t("coupons.tableValue")}</th>
                <th className="px-4 py-2.5">{t("coupons.tableUsage")}</th>
                <th className="px-4 py-2.5">{t("coupons.tableValidity")}</th>
                <th className="px-4 py-2.5">{t("coupons.tableStatus")}</th>
                <th className="px-4 py-2.5 text-center">{t("coupons.tableActions")}</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-100 dark:divide-gray-800/80">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center">
                    <div className="inline-flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 dark:border-indigo-400"></div>
                    </div>
                  </td>
                </tr>
              ) : filteredCoupons.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center">
                    <TicketIcon className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-600" />
                    <h3 className="mt-2 text-xs font-semibold text-gray-900 dark:text-white">
                      {t("coupons.noCoupons")}
                    </h3>
                    <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                      {t("coupons.noCouponsDesc")}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredCoupons.map((coupon) => (
                  <tr
                    key={coupon.id}
                    className="hover:bg-gray-50/70 dark:hover:bg-gray-800/40 transition-colors"
                  >
                    {/* Code */}
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <span className="font-mono text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50/80 dark:bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-200/60 dark:border-indigo-800/40">
                          {coupon.code || coupon.id}
                        </span>
                        <button
                          onClick={() => copyToClipboard(coupon.code || coupon.id)}
                          title="نسخ الكود"
                          className="text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                        >
                          <ClipboardDocumentIcon className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>

                    {/* Name & Description */}
                    <td className="px-4 py-2.5">
                      <div className="text-xs font-semibold text-gray-900 dark:text-white">
                        {coupon.name}
                      </div>
                      {coupon.description && (
                        <div className="text-[11px] text-gray-400 dark:text-gray-500 truncate max-w-xs">
                          {coupon.description}
                        </div>
                      )}
                      {coupon.minOrderAmount && coupon.minOrderAmount > 0 ? (
                        <div className="text-[11px] text-indigo-600 dark:text-indigo-400 font-mono tabular-nums">
                          الحد الأدنى: {formatPrice(coupon.minOrderAmount)}
                        </div>
                      ) : null}
                    </td>

                    {/* Type */}
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${getTypeColor(
                          coupon.type,
                        )}`}
                      >
                        {getTypeText(coupon.type)}
                      </span>
                    </td>

                    {/* Value */}
                    <td className="px-4 py-2.5 whitespace-nowrap text-xs font-bold text-gray-900 dark:text-gray-100 font-mono tabular-nums" dir="ltr">
                      {coupon.type?.toLowerCase() === "percentage"
                        ? `${coupon.value}%`
                        : coupon.type?.toLowerCase() === "free_shipping"
                          ? t("coupons.typeFreeShipping")
                          : formatPrice(coupon.value)}
                    </td>

                    {/* Usage Progress */}
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <div className="text-xs font-medium text-gray-700 dark:text-gray-300 font-mono tabular-nums">
                        {coupon.usageCount || 0} / {coupon.usageLimit || "∞"}
                      </div>
                      {coupon.usageLimit && coupon.usageLimit > 0 ? (
                        <div className="w-20 bg-gray-100 dark:bg-gray-800 rounded-full h-1 mt-1 overflow-hidden">
                          <div
                            className="bg-indigo-600 dark:bg-indigo-500 h-1 rounded-full transition-all"
                            style={{
                              width: `${Math.min(
                                100,
                                Math.max(0, (coupon.usageCount / coupon.usageLimit) * 100),
                              )}%`,
                            }}
                          />
                        </div>
                      ) : null}
                    </td>

                    {/* Validity */}
                    <td className="px-4 py-2.5 whitespace-nowrap text-[11px] text-gray-500 dark:text-gray-400 font-mono tabular-nums">
                      <div>من: {formatDate(coupon.validFrom)}</div>
                      <div>إلى: {formatDate(coupon.validTo)}</div>
                    </td>

                    {/* Status & Quick Toggle */}
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <button
                        onClick={() => handleToggleStatus(coupon)}
                        title="انقر للتبديل الفوري"
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border transition-all ${
                          coupon.isActive
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/30 dark:border-emerald-900/50 dark:text-emerald-300"
                            : "bg-rose-50 text-rose-700 border-rose-200/80 dark:bg-rose-950/30 dark:border-rose-900/50 dark:text-rose-300"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            coupon.isActive ? "bg-emerald-500" : "bg-rose-500"
                          }`}
                        />
                        {coupon.isActive ? t("coupons.active") : t("coupons.inactive")}
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-2.5 whitespace-nowrap text-center">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => {
                            setSelectedCoupon(coupon);
                            setShowCouponModal(true);
                          }}
                          title="عرض التفاصيل"
                          className="p-1 rounded text-gray-400 hover:text-indigo-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        >
                          <EyeIcon className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            setEditingCoupon({ ...coupon });
                            setShowEditModal(true);
                          }}
                          title="تعديل الكوبون"
                          className="p-1 rounded text-gray-400 hover:text-blue-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        >
                          <PencilIcon className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            setDeletingCoupon(coupon);
                            setShowDeleteModal(true);
                          }}
                          title="حذف الكوبون"
                          className="p-1 rounded text-gray-400 hover:text-rose-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        >
                          <TrashIcon className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/30 flex items-center justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">
              {t("coupons.pageInfo", { page, totalPages })} (إجمالي {totalCount} كوبون)
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                {t("coupons.pagePrev")}
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                {t("coupons.pageNext")}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create Coupon Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto backdrop-blur-xs">
          <div className="relative w-full max-w-2xl bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-6 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <TicketIcon className="h-5 w-5 text-indigo-600" />
                {t("coupons.modalCreateTitle")}
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4 pt-4">
              {/* Code & Name */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                      {t("coupons.couponCode")} *
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        setNewCoupon({
                          ...newCoupon,
                          code: generateRandomCode(),
                        })
                      }
                      className="text-xs text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 font-medium inline-flex items-center gap-1"
                    >
                      <SparklesIcon className="h-3.5 w-3.5" />
                      {t("coupons.generateCode")}
                    </button>
                  </div>
                  <input
                    type="text"
                    value={newCoupon.code}
                    onChange={(e) =>
                      setNewCoupon({
                        ...newCoupon,
                        code: e.target.value.toUpperCase().replace(/\s+/g, ""),
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-mono uppercase bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                    placeholder={t("coupons.codePlaceholder")}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    {t("coupons.couponName")} *
                  </label>
                  <input
                    type="text"
                    value={newCoupon.name}
                    onChange={(e) => setNewCoupon({ ...newCoupon, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                    placeholder={t("coupons.namePlaceholder")}
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  {t("coupons.description")}
                </label>
                <textarea
                  value={newCoupon.description}
                  onChange={(e) =>
                    setNewCoupon({ ...newCoupon, description: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                  rows={2}
                  placeholder={t("coupons.descPlaceholder")}
                />
              </div>

              {/* Discount Type & Value */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    {t("coupons.discountType")} *
                  </label>
                  <select
                    value={newCoupon.type}
                    onChange={(e) =>
                      setNewCoupon({
                        ...newCoupon,
                        type: e.target.value as "percentage" | "fixed" | "free_shipping",
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="percentage">{t("coupons.typePercentage")}</option>
                    <option value="fixed">{t("coupons.typeFixed")}</option>
                    <option value="free_shipping">{t("coupons.typeFreeShipping")}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    {t("coupons.value")} {newCoupon.type !== "free_shipping" && "*"}
                  </label>
                  <input
                    type="number"
                    disabled={newCoupon.type === "free_shipping"}
                    value={newCoupon.type === "free_shipping" ? 0 : newCoupon.value}
                    onChange={(e) =>
                      setNewCoupon({
                        ...newCoupon,
                        value: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                    placeholder={newCoupon.type === "percentage" ? "15%" : "50"}
                  />
                </div>
              </div>

              {/* Min Order & Max Discount */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    {t("coupons.minOrderAmount")}
                  </label>
                  <input
                    type="number"
                    value={newCoupon.minOrderAmount || ""}
                    onChange={(e) =>
                      setNewCoupon({
                        ...newCoupon,
                        minOrderAmount: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    {t("coupons.maxDiscount")} (للنسبة المئوية)
                  </label>
                  <input
                    type="number"
                    disabled={newCoupon.type !== "percentage"}
                    value={newCoupon.maxDiscountAmount || ""}
                    onChange={(e) =>
                      setNewCoupon({
                        ...newCoupon,
                        maxDiscountAmount: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                    placeholder="غير محدد"
                  />
                </div>
              </div>

              {/* Usage Limits */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    {t("coupons.totalUsageLimit")}
                  </label>
                  <input
                    type="number"
                    value={newCoupon.usageLimit || ""}
                    onChange={(e) =>
                      setNewCoupon({
                        ...newCoupon,
                        usageLimit: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                    placeholder="100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    {t("coupons.perCustomerLimit")}
                  </label>
                  <input
                    type="number"
                    value={newCoupon.userUsageLimit || ""}
                    onChange={(e) =>
                      setNewCoupon({
                        ...newCoupon,
                        userUsageLimit: parseInt(e.target.value) || 1,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                    placeholder="1"
                  />
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    {t("coupons.startDate")} *
                  </label>
                  <input
                    type="datetime-local"
                    value={newCoupon.validFrom}
                    onChange={(e) =>
                      setNewCoupon({ ...newCoupon, validFrom: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    {t("coupons.endDate")} *
                  </label>
                  <input
                    type="datetime-local"
                    value={newCoupon.validTo}
                    onChange={(e) =>
                      setNewCoupon({ ...newCoupon, validTo: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Stacking & Active Checkboxes */}
              <div className="flex flex-col sm:flex-row gap-4 pt-2">
                <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newCoupon.isActive}
                    onChange={(e) =>
                      setNewCoupon({ ...newCoupon, isActive: e.target.checked })
                    }
                    className="h-4 w-4 text-indigo-600 rounded border-gray-300"
                  />
                  {t("coupons.activateCoupon")}
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newCoupon.allowWithLoyalty}
                    onChange={(e) =>
                      setNewCoupon({ ...newCoupon, allowWithLoyalty: e.target.checked })
                    }
                    className="h-4 w-4 text-indigo-600 rounded border-gray-300"
                  />
                  {t("coupons.allowWithLoyalty")}
                </label>
              </div>

              {/* Footer Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  {t("coupons.cancel")}
                </button>
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={createCoupon}
                  className="px-5 py-2 rounded-lg text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 disabled:opacity-50 inline-flex items-center gap-2"
                >
                  {actionLoading ? (
                    <ArrowPathIcon className="h-4 w-4 animate-spin" />
                  ) : (
                    t("coupons.create")
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Coupon Modal */}
      {showEditModal && editingCoupon && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto backdrop-blur-xs">
          <div className="relative w-full max-w-2xl bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-6 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <PencilIcon className="h-5 w-5 text-blue-600" />
                {t("coupons.modalEditTitle")}
              </h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    {t("coupons.couponCode")} *
                  </label>
                  <input
                    type="text"
                    value={editingCoupon.code}
                    onChange={(e) =>
                      setEditingCoupon({
                        ...editingCoupon,
                        code: e.target.value.toUpperCase().replace(/\s+/g, ""),
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-mono uppercase bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    {t("coupons.couponName")} *
                  </label>
                  <input
                    type="text"
                    value={editingCoupon.name}
                    onChange={(e) =>
                      setEditingCoupon({ ...editingCoupon, name: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  {t("coupons.description")}
                </label>
                <textarea
                  value={editingCoupon.description || ""}
                  onChange={(e) =>
                    setEditingCoupon({
                      ...editingCoupon,
                      description: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    {t("coupons.discountType")} *
                  </label>
                  <select
                    value={editingCoupon.type}
                    onChange={(e) =>
                      setEditingCoupon({
                        ...editingCoupon,
                        type: e.target.value as Coupon["type"],
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="percentage">{t("coupons.typePercentage")}</option>
                    <option value="fixed">{t("coupons.typeFixed")}</option>
                    <option value="free_shipping">{t("coupons.typeFreeShipping")}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    {t("coupons.value")} *
                  </label>
                  <input
                    type="number"
                    value={editingCoupon.value}
                    onChange={(e) =>
                      setEditingCoupon({
                        ...editingCoupon,
                        value: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    {t("coupons.minOrderAmount")}
                  </label>
                  <input
                    type="number"
                    value={editingCoupon.minOrderAmount ?? ""}
                    onChange={(e) =>
                      setEditingCoupon({
                        ...editingCoupon,
                        minOrderAmount: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    {t("coupons.maxDiscount")}
                  </label>
                  <input
                    type="number"
                    value={editingCoupon.maxDiscountAmount ?? ""}
                    onChange={(e) =>
                      setEditingCoupon({
                        ...editingCoupon,
                        maxDiscountAmount: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    {t("coupons.totalUsageLimit")}
                  </label>
                  <input
                    type="number"
                    value={editingCoupon.usageLimit ?? ""}
                    onChange={(e) =>
                      setEditingCoupon({
                        ...editingCoupon,
                        usageLimit: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    {t("coupons.perCustomerLimit")}
                  </label>
                  <input
                    type="number"
                    value={editingCoupon.userUsageLimit ?? ""}
                    onChange={(e) =>
                      setEditingCoupon({
                        ...editingCoupon,
                        userUsageLimit: parseInt(e.target.value) || 1,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 pt-2">
                <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingCoupon.isActive}
                    onChange={(e) =>
                      setEditingCoupon({
                        ...editingCoupon,
                        isActive: e.target.checked,
                      })
                    }
                    className="h-4 w-4 text-indigo-600 rounded border-gray-300"
                  />
                  {t("coupons.activateCoupon")}
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingCoupon.allowWithLoyalty ?? true}
                    onChange={(e) =>
                      setEditingCoupon({
                        ...editingCoupon,
                        allowWithLoyalty: e.target.checked,
                      })
                    }
                    className="h-4 w-4 text-indigo-600 rounded border-gray-300"
                  />
                  {t("coupons.allowWithLoyalty")}
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  {t("coupons.cancel")}
                </button>
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={handleUpdateCoupon}
                  className="px-5 py-2 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 inline-flex items-center gap-2"
                >
                  {actionLoading ? (
                    <ArrowPathIcon className="h-4 w-4 animate-spin" />
                  ) : (
                    t("coupons.saveChanges")
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && deletingCoupon && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between pb-3 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-bold text-red-600 flex items-center gap-2">
                <TrashIcon className="h-5 w-5 text-red-600" />
                {t("coupons.modalDeleteTitle")}
              </h3>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <div className="py-4 text-sm text-gray-600 dark:text-gray-300">
              <p>{t("coupons.deleteConfirm")}</p>
              <div className="mt-3 p-3 bg-red-50 dark:bg-red-950/40 rounded-lg border border-red-200 dark:border-red-900/50">
                <p className="font-mono font-bold text-red-700 dark:text-red-400">
                  {deletingCoupon.code}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {deletingCoupon.name}
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-3 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                {t("coupons.cancel")}
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleDeleteCoupon}
                className="px-5 py-2 rounded-lg text-sm font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 inline-flex items-center gap-2"
              >
                {actionLoading ? (
                  <ArrowPathIcon className="h-4 w-4 animate-spin" />
                ) : (
                  t("coupons.delete")
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Coupon Details Modal */}
      {showCouponModal && selectedCoupon && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto backdrop-blur-xs">
          <div className="relative w-full max-w-2xl bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-6 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <TicketIcon className="h-5 w-5 text-indigo-600" />
                {t("coupons.modalViewTitle")}
              </h3>
              <button
                onClick={() => setShowCouponModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4 pt-4">
              <div className="bg-indigo-50/60 dark:bg-indigo-950/40 p-5 rounded-xl border border-indigo-100 dark:border-indigo-900/50 text-center">
                <div className="inline-flex items-center gap-2">
                  <span className="text-3xl font-black text-indigo-600 dark:text-indigo-400 font-mono tracking-wider">
                    {selectedCoupon.code || selectedCoupon.id}
                  </span>
                  <button
                    onClick={() =>
                      copyToClipboard(selectedCoupon.code || selectedCoupon.id)
                    }
                    className="p-1.5 rounded-lg text-indigo-500 hover:bg-indigo-100 dark:hover:bg-indigo-900/60"
                  >
                    <ClipboardDocumentIcon className="h-5 w-5" />
                  </button>
                </div>
                <div className="text-lg font-bold text-gray-900 dark:text-white mt-2">
                  {selectedCoupon.name}
                </div>
                {selectedCoupon.description && (
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-1 max-w-lg mx-auto">
                    {selectedCoupon.description}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">
                    {t("coupons.tableType")}
                  </label>
                  <div className="mt-1">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${getTypeColor(
                        selectedCoupon.type,
                      )}`}
                    >
                      {getTypeText(selectedCoupon.type)}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">
                    {t("coupons.value")}
                  </label>
                  <div className="mt-1 text-sm font-bold text-gray-900 dark:text-gray-100">
                    {selectedCoupon.type?.toLowerCase() === "percentage"
                      ? `${selectedCoupon.value}%`
                      : selectedCoupon.type?.toLowerCase() === "free_shipping"
                        ? t("coupons.typeFreeShipping")
                        : formatPrice(selectedCoupon.value)}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">
                    {t("coupons.minOrderAmount")}
                  </label>
                  <div className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                    {selectedCoupon.minOrderAmount && selectedCoupon.minOrderAmount > 0
                      ? formatPrice(selectedCoupon.minOrderAmount)
                      : "0"}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">
                    {t("coupons.maxDiscount")}
                  </label>
                  <div className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                    {selectedCoupon.maxDiscountAmount &&
                    selectedCoupon.maxDiscountAmount > 0
                      ? formatPrice(selectedCoupon.maxDiscountAmount)
                      : t("coupons.notSpecified")}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">
                    {t("coupons.totalUsageLimit")}
                  </label>
                  <div className="mt-1 text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {selectedCoupon.usageCount || 0} /{" "}
                    {selectedCoupon.usageLimit || "∞"}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">
                    {t("coupons.tableStatus")}
                  </label>
                  <div className="mt-1">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        selectedCoupon.isActive
                          ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                          : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                      }`}
                    >
                      {selectedCoupon.isActive
                        ? t("coupons.active")
                        : t("coupons.inactive")}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">
                    {t("coupons.startDate")}
                  </label>
                  <div className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                    {formatDate(selectedCoupon.validFrom)}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">
                    {t("coupons.endDate")}
                  </label>
                  <div className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                    {formatDate(selectedCoupon.validTo)}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => {
                    setShowCouponModal(false);
                    setEditingCoupon({ ...selectedCoupon });
                    setShowEditModal(true);
                  }}
                  className="px-4 py-2 border border-blue-300 dark:border-blue-600 rounded-lg text-sm font-semibold text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30"
                >
                  {t("coupons.modalEditTitle")}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCouponModal(false)}
                  className="px-5 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-sm font-medium text-gray-800 dark:text-gray-200"
                >
                  {t("coupons.close")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Coupons;
