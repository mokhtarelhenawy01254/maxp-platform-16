import React, { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  PlusIcon,
  MagnifyingGlassIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  EyeIcon,
  InformationCircleIcon,
  PencilIcon,
  UsersIcon,
  ShoppingBagIcon,
  TagIcon,
  ChatBubbleLeftRightIcon,
} from "@heroicons/react/24/outline";
import {
  customerService,
  Customer,
  CustomerFilters,
} from "../../services/customerService";
import LoadingSpinner from "../../components/LoadingSpinner";
import { useDateFormat } from "../../hooks/useDateFormat";
import CustomerImportModal from "./CustomerImportModal";
import { useAuth } from "../../hooks/useAuthSimple";

const CustomerList: React.FC = () => {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [__cb] = useState("v2");
  const { formatDate } = useDateFormat();
  const { user } = useAuth();
  const isAdmin = ["OWNER", "COMPANY_ADMIN", "SUPER_ADMIN", "MANAGER"].includes(
    user?.role || "",
  );

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showOnlyWithOrders, setShowOnlyWithOrders] = useState(false);
  const [autoDiscountFilter, setAutoDiscountFilter] = useState<
    "" | "AVAILABLE" | "PRE_ACTIVATION"
  >("");
  const [availableDiscountCount, setAvailableDiscountCount] = useState<
    number | null
  >(null);
  const [filters, setFilters] = useState<CustomerFilters>(() => {
    const statusFromUrl = searchParams.get("status");
    return {
      page: 1,
      limit: 10,
      sortBy: "updatedAt",
      sortOrder: "desc",
      ...(statusFromUrl ? { status: statusFromUrl } : {}),
    };
  });

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false,
  });

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [availableTags, setAvailableTags] = useState<{ name: string; count: number }[]>([]);
  const [selectedTag, setSelectedTag] = useState("");

  const statusOptions = customerService.getStatusOptions();

  // Sync status filter from URL search params (set by sidebar links)
  useEffect(() => {
    const statusFromUrl = searchParams.get("status");
    setFilters((prev) => {
      const newStatus = statusFromUrl || undefined;
      if (prev.status === newStatus) return prev;
      return { ...prev, page: 1, status: newStatus };
    });
  }, [searchParams]);

  // Toggle hasOrders filter
  const handleToggleWithOrders = () => {
    const newVal = !showOnlyWithOrders;
    setShowOnlyWithOrders(newVal);
    setFilters((prev) => ({ ...prev, page: 1, hasOrders: newVal ? true : undefined }));
  };

  // Auto-discount status filter
  const handleAutoDiscountFilter = (value: "" | "AVAILABLE" | "PRE_ACTIVATION") => {
    setAutoDiscountFilter(value);
    setFilters((prev) => ({
      ...prev,
      page: 1,
      autoDiscountStatus: value || undefined,
    }));
  };

  // Total customers with an active auto-discount coupon (badge in header)
  useEffect(() => {
    let cancelled = false;
    customerService
      .getCustomers({ page: 1, limit: 1, autoDiscountStatus: "AVAILABLE" })
      .then((res) => {
        if (!cancelled) setAvailableDiscountCount(res.pagination?.total ?? null);
      })
      .catch(() => {
        if (!cancelled) setAvailableDiscountCount(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Selection handlers
  const toggleSelectAll = () => {
    if (selectedIds.size === customers.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(customers.map((c) => c.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };


  const loadCustomers = async () => {
    try {
      setIsLoading(true);
      const response = await customerService.getCustomers(filters);
      setCustomers(response.data);
      setPagination(response.pagination);
    } catch (err: any) {
      setError(err.message || t("customers.loadingError"));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, [filters]);

  // 🏷️ Fetch available tags on mount
  useEffect(() => {
    customerService.getDistinctTags().then(setAvailableTags).catch(() => {});
  }, []);

  const handleTagFilter = (tagName: string) => {
    setSelectedTag(tagName);
    setFilters((prev) => ({ ...prev, tag: tagName || undefined, page: 1 }));
  };

  // ⚡ Auto-search debounce on typing (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      const trimmed = searchQuery.trim();
      setFilters((prev) => {
        if (prev.search === (trimmed || undefined)) return prev;
        return {
          ...prev,
          search: trimmed || undefined,
          page: 1,
        };
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setFilters((prev) => ({
      ...prev,
      search: searchQuery.trim() || undefined,
      page: 1,
    }));
  };

  // Parse tags safely — DB stores them as a JSON string or real array
  const parseTags = (tags: any): string[] => {
    if (!tags) return [];
    if (Array.isArray(tags)) return tags;
    if (typeof tags === "string") {
      try {
        const parsed = JSON.parse(tags);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  };

  const handlePageChange = (page: number) => {
    setFilters((prev) => ({ ...prev, page }));
  };

  const handleExport = async (format: "csv" | "json") => {
    try {
      await customerService.exportCustomers(format, filters);
    } catch (err: any) {
      setError(err.message || t("customers.exportError"));
    }
  };

  const getStatusBadge = (status: string) => {
    const statusOption = statusOptions.find(
      (option) => option.value === status,
    );
    if (!statusOption) return null;

    const colorClasses = {
      yellow: "bg-yellow-100 text-yellow-800",
      green: "bg-green-100 text-green-800",
      gray: "bg-gray-100 text-gray-800",
      purple: "bg-purple-100 text-purple-800",
      red: "bg-red-100 text-red-800",
    };

    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClasses[statusOption.color as keyof typeof colorClasses]}`}
      >
        {statusOption.label}
      </span>
    );
  };

  const getRatingBadge = (rating: string | undefined, deliveryRate?: number | null) => {
    if (!rating || rating === "UNKNOWN") return null;
    const r = rating.toLowerCase();
    switch (r) {
      case "excellent":
        return (
          <span className="ml-2 text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 px-2 py-0.5 rounded-full ring-1 ring-emerald-600/20 font-medium inline-flex items-center gap-1">
            <span>عميل ممتاز</span>
            {deliveryRate !== undefined && deliveryRate !== null && deliveryRate > 0 && (
              <span className="opacity-80 text-[10px]">({Math.round(deliveryRate)}%)</span>
            )}
          </span>
        );
      case "good":
        return (
          <span className="ml-2 text-xs bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300 px-2 py-0.5 rounded-full ring-1 ring-sky-600/20 font-medium inline-flex items-center gap-1">
            <span>عميل جيد</span>
            {deliveryRate !== undefined && deliveryRate !== null && deliveryRate > 0 && (
              <span className="opacity-80 text-[10px]">({Math.round(deliveryRate)}%)</span>
            )}
          </span>
        );
      case "average":
        return (
          <span className="ml-2 text-xs bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 px-2 py-0.5 rounded-full ring-1 ring-amber-600/20 font-medium inline-flex items-center gap-1">
            <span>عميل متوسط</span>
            {deliveryRate !== undefined && deliveryRate !== null && deliveryRate > 0 && (
              <span className="opacity-80 text-[10px]">({Math.round(deliveryRate)}%)</span>
            )}
          </span>
        );
      case "poor":
      case "bad":
        return (
          <span className="ml-2 text-xs bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 px-2 py-0.5 rounded-full ring-1 ring-rose-600/20 font-medium inline-flex items-center gap-1">
            <span>عميل ضعيف</span>
            {deliveryRate !== undefined && deliveryRate !== null && (
              <span className="opacity-80 text-[10px]">({Math.round(deliveryRate)}%)</span>
            )}
          </span>
        );
      default:
        return null;
    }
  };

  const getAutoDiscountBadge = (status: string | null | undefined) => {
    if (!status) return null;
    if (status === "AVAILABLE") {
      return (
        <span
          className="mr-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
          title="عند العميل كوبون خصم فعّال على أوردره الجاي"
        >
          خصم متاح
        </span>
      );
    }
    if (status === "PRE_ACTIVATION") {
      return (
        <span
          className="mr-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
          title="طلب قبل تفعيل نظام الولاء — الخصم التلقائي مش بيطبق عليه"
        >
          قبل تفعيل النظام
        </span>
      );
    }
    return null;
  };

  const getTierBadge = (tier: { name?: string; nameAr?: string; color?: string } | null | undefined) => {
    if (!tier) return null;
    const label = tier.nameAr || tier.name || "عميل";
    const color = tier.color || "#6366f1";
    return (
      <span
        className="mr-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
        style={{ backgroundColor: color + "1A", color, border: `1px solid ${color}40` }}
        title={`مستوى الولاء: ${label}`}
      >
        {label}
      </span>
    );
  };

  if (isLoading && customers.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4 sm:space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                {t("customers.pageTitle")}
              </h1>
              {pagination.total > 0 && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-100/80 dark:bg-zinc-800/70 text-zinc-600 dark:text-zinc-400 text-xs font-mono font-medium tabular-nums shadow-2xs">
                  {pagination.total} عميل
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              {t("customers.pageSubtitle")}
            </p>
            {availableDiscountCount !== null && availableDiscountCount > 0 && (
              <span className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 tabular-nums shadow-2xs">
                <TagIcon className="h-3 w-3" />
                <span>{availableDiscountCount} عميل مؤهل لخصم تلقائي</span>
              </span>
            )}
          </div>
          {isAdmin && (
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setIsImportModalOpen(true)}
                className="inline-flex items-center px-3 py-1.5 sm:py-2 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs font-medium text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all duration-150 active:scale-[0.97] shadow-2xs"
              >
                <ArrowUpTrayIcon className="h-3.5 w-3.5 ml-1.5 text-zinc-400" />
                {t("customers.importCSV")}
              </button>
              <button
                onClick={() => handleExport("csv")}
                className="inline-flex items-center px-3 py-1.5 sm:py-2 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs font-medium text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all duration-150 active:scale-[0.97] shadow-2xs"
              >
                <ArrowDownTrayIcon className="h-3.5 w-3.5 ml-1.5 text-zinc-400" />
                {t("customers.exportCSV")}
              </button>

              <Link
                to="/customers/new"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold text-white bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200 shadow-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] transition-all duration-150 active:scale-[0.97]"
              >
                <PlusIcon className="h-3.5 w-3.5 text-white dark:text-zinc-950" />
                <span>{t("customers.addCustomer")}</span>
              </Link>
            </div>
          )}
        </div>

        {/* Quick Status Tabs (Linear-style unified tray) */}
        <div className="bg-zinc-100/80 dark:bg-zinc-800/60 p-1 rounded-lg border border-zinc-200/60 dark:border-zinc-700/50 flex items-center gap-1 overflow-x-auto no-scrollbar">
          {[
            { id: "", label: "الكل" },
            { id: "LEAD", label: "عملاء محتملون" },
            { id: "ACTIVE", label: "نشطون" },
            { id: "INACTIVE", label: "غير نشطين" },
            { id: "BLOCKED", label: "محظورون" },
          ].map((tab) => {
            const currentStatus = searchParams.get("status") || "";
            const isActive = currentStatus === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  const newParams = new URLSearchParams(searchParams);
                  if (tab.id) {
                    newParams.set("status", tab.id);
                  } else {
                    newParams.delete("status");
                  }
                  setSearchParams(newParams);
                }}
                className={`px-3 py-1 rounded-md text-xs whitespace-nowrap transition-all duration-150 active:scale-[0.97] flex items-center gap-1.5 ${
                  isActive
                    ? "bg-white dark:bg-zinc-900 text-zinc-950 dark:text-zinc-50 shadow-xs font-semibold"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200/60 dark:hover:bg-zinc-700/60 font-medium"
                }`}
              >
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-zinc-900 p-3 sm:p-3.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-2xs">
          <div className="flex flex-col sm:flex-row gap-2.5">
            {/* Search */}
            <form onSubmit={handleSearch} className="flex-1">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-zinc-400 dark:text-zinc-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t("customers.searchPlaceholder")}
                  className="block w-full pr-9 pl-3 py-2 text-xs sm:text-sm border border-zinc-200 dark:border-zinc-700 rounded-lg bg-zinc-50/50 dark:bg-zinc-800/60 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100 focus:border-zinc-900 dark:focus:border-zinc-100 transition-all shadow-2xs"
                />
              </div>
            </form>

            {/* Toggle: with orders only */}
            <button
              onClick={handleToggleWithOrders}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition-all duration-150 active:scale-[0.97] shrink-0 shadow-2xs ${
                showOnlyWithOrders
                  ? "border-zinc-900 dark:border-zinc-100 text-zinc-900 dark:text-zinc-100 bg-zinc-100 dark:bg-zinc-800 font-semibold"
                  : "border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700"
              }`}
            >
              {showOnlyWithOrders ? (
                <ShoppingBagIcon className="h-3.5 w-3.5" />
              ) : (
                <UsersIcon className="h-3.5 w-3.5" />
              )}
              <span>
                {showOnlyWithOrders
                  ? t("customers.withOrdersOnly")
                  : t("customers.showAllCustomers")}
              </span>
            </button>

            {/* 🎟️ Auto-Discount Status Filter */}
            <select
              value={autoDiscountFilter}
              onChange={(e) =>
                handleAutoDiscountFilter(
                  e.target.value as "" | "AVAILABLE" | "PRE_ACTIVATION",
                )
              }
              className="px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 text-sm bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">كل الخصومات</option>
              <option value="AVAILABLE">خصم متاح</option>
              <option value="PRE_ACTIVATION">قبل تفعيل النظام</option>
            </select>

            {/* 🏷️ Tag Filter */}
            {availableTags.length > 0 && (
              <select
                value={selectedTag}
                onChange={(e) => handleTagFilter(e.target.value)}
                className="px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 text-sm bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">{t("customers.allTags")}</option>
                {availableTags.map((tag) => (
                  <option key={tag.name} value={tag.name}>
                    🏷️ {tag.name} ({tag.count})
                  </option>
                ))}
              </select>
            )}

            {/* ⭐ NPS Filter (promoter 9-10 / passive 7-8 / detractor 0-6) */}
            <select
              value={selectedTag.startsWith('nps_') ? selectedTag : ''}
              onChange={(e) => handleTagFilter(e.target.value)}
              className="px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 text-sm bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
              title="فلترة حسب NPS المخزن كـ tag"
            >
              <option value="">كل NPS</option>
              <option value="nps_promoter">⭐ 9-10 مروّج</option>
              <option value="nps_passive">😐 7-8 محايد</option>
              <option value="nps_detractor">⚠️ 0-6 منتقد</option>
            </select>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded-md">
            {error}
          </div>
        )}

        {/* Bulk Action Toolbar */}
        {selectedIds.size > 0 && (
          <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-700 px-4 py-3 rounded-md flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-indigo-700 dark:text-indigo-300 font-medium">
                {t("customers.selectedCount", { count: selectedIds.size })}
              </span>
              <button
                onClick={() => setSelectedIds(new Set())}
                className="text-sm text-indigo-600 hover:text-indigo-800 dark:text-indigo-400"
              >
                {t("customers.cancelSelection")}
              </button>
            </div>
            <div className="flex items-center gap-2">
              {/* Delete function removed as requested */}
            </div>
          </div>
        )}

        {/* Customers Table */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl shadow-2xs overflow-hidden mb-6">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-zinc-200/60 dark:divide-zinc-800/60">
              <thead className="bg-zinc-50/80 dark:bg-zinc-850/80 border-b border-zinc-200/80 dark:border-zinc-800/80">
                <tr>
                  <th className="px-4 py-3.5 text-center">
                    <input
                      type="checkbox"
                      checked={
                        selectedIds.size === customers.length &&
                        customers.length > 0
                      }
                      onChange={toggleSelectAll}
                      className="h-4 w-4 text-zinc-900 dark:text-zinc-100 focus:ring-zinc-900 dark:focus:ring-zinc-100 border-zinc-300 dark:border-zinc-700 rounded dark:bg-zinc-800"
                    />
                  </th>
                  <th className="px-4 py-3.5 text-right text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-[0.08em]">
                    {t("customers.tableCustomer")}
                  </th>
                  <th className="px-4 py-3.5 text-right text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-[0.08em]">
                    {t("customers.tableContactInfo")}
                  </th>
                  <th className="px-4 py-3.5 text-right text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-[0.08em]">
                    {t("customers.tableStatus")}
                  </th>
                  <th className="px-4 py-3.5 text-right text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-[0.08em]">
                    {t("customers.tableStats")}
                  </th>
                  <th className="px-4 py-3.5 text-right text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-[0.08em]">
                    {t("customers.tableUpdatedAt")}
                  </th>
                  <th className="px-4 py-3.5 text-right text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-[0.08em]">
                    {t("customers.tableActions")}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-zinc-900 divide-y divide-zinc-100 dark:divide-zinc-800/60">
                {customers.map((customer) => (
                  <tr
                    key={customer.id}
                    className={`hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40 transition-colors ${selectedIds.has(customer.id) ? "bg-zinc-100/70 dark:bg-zinc-800/60" : ""}`}
                  >
                    <td className="px-4 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(customer.id)}
                        onChange={() => toggleSelect(customer.id)}
                        className="h-4 w-4 text-zinc-900 dark:text-zinc-100 focus:ring-zinc-900 dark:focus:ring-zinc-100 border-zinc-300 dark:border-zinc-700 rounded dark:bg-zinc-800"
                      />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0 h-9 w-9">
                          <div className="h-9 w-9 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/80 dark:border-zinc-700 flex items-center justify-center shadow-2xs">
                            <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 font-mono">
                              {customer.firstName &&
                                customer.firstName.charAt(0)}
                              {customer.lastName && customer.lastName.charAt(0)}
                            </span>
                          </div>
                        </div>
                        <div>
                          <div className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5 flex-wrap">
                            <span>{customer.firstName || ""} {customer.lastName || ""}</span>
                            {getRatingBadge(customer.customerRating, (customer as any).deliveryRate)}
                            {getTierBadge(customer.loyaltyTier)}
                            {getAutoDiscountBadge(customer.autoDiscountStatus)}
                          </div>
                          {parseTags(customer.tags).length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {parseTags(customer.tags).slice(0, 2).map((tag, index) => (
                                <span
                                  key={index}
                                  className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200/60 dark:border-zinc-700"
                                >
                                  {tag}
                                </span>
                              ))}
                              {parseTags(customer.tags).length > 2 && (
                                <span className="text-[10px] text-zinc-400 font-mono">
                                  +{parseTags(customer.tags).length - 2}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-xs font-medium text-zinc-900 dark:text-zinc-100">
                        {customer.email || "-"}
                      </div>
                      <div className="text-xs text-zinc-500 dark:text-zinc-400 tabular-nums font-mono mt-0.5">
                        {customer.phone || "-"}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {getStatusBadge(customer.status)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-zinc-500 dark:text-zinc-400 font-mono">
                      <div>
                        {t("customers.conversations")}:{" "}
                        <span className="tabular-nums font-semibold text-zinc-800 dark:text-zinc-200">
                          {customer._count?.conversations || 0}
                        </span>
                      </div>
                      <div>
                        {t("customers.orders")}:{" "}
                        <span className="tabular-nums font-semibold text-zinc-800 dark:text-zinc-200">
                          {customer._count?.orders || 0}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-zinc-400 dark:text-zinc-500 tabular-nums font-mono">
                      {formatDate(customer.updatedAt)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs font-medium">
                      <div className="flex items-center gap-1">
                        {customer.phone && (
                          <a
                            href={`https://wa.me/${customer.phone.replace(/[^0-9]/g, "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="مراسلة سريعة عبر واتساب"
                            aria-label="مراسلة سريعة عبر واتساب"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-transparent hover:border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-all duration-150 active:scale-[0.94]"
                          >
                            <ChatBubbleLeftRightIcon className="h-4 w-4" />
                          </a>
                        )}
                        <Link
                          to={`/customers/${customer.id}/portal`}
                          title="صفحة العميل (النقاط والخصومات والكاش باك)"
                          aria-label="صفحة العميل (النقاط والخصومات والكاش باك)"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-transparent hover:border-zinc-200 dark:hover:border-zinc-700 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all duration-150 active:scale-[0.94]"
                        >
                          <EyeIcon className="h-3.5 w-3.5" />
                        </Link>
                        <Link
                          to={`/customers/${customer.id}`}
                          title={t("customers.tableActions")}
                          aria-label={t("customers.tableActions")}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-transparent hover:border-zinc-200 dark:hover:border-zinc-700 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all duration-150 active:scale-[0.94]"
                        >
                          <InformationCircleIcon className="h-3.5 w-3.5" />
                        </Link>
                        <Link
                          to={`/customers/${customer.id}/edit`}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-transparent hover:border-zinc-200 dark:hover:border-zinc-700 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all duration-150 active:scale-[0.94]"
                          aria-label="تعديل العميل"
                        >
                          <PencilIcon className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination && pagination.total > 0 && (
            <div className="bg-white dark:bg-gray-800 px-4 py-3 flex items-center justify-between border-t border-gray-200 dark:border-gray-700 sm:px-6 relative z-20">
              <div className="flex-1 flex justify-between sm:hidden relative z-20">
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={!pagination.hasPrev}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50"
                >
                  {t("customers.previous")}
                </button>
                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={!pagination.hasNext}
                  className="mr-3 relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50"
                >
                  {t("customers.next")}
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    {t("customers.showing")}{" "}
                    <span className="font-medium">
                      {(pagination.page - 1) * pagination.limit + 1}
                    </span>{" "}
                    {t("customers.to")}{" "}
                    <span className="font-medium">
                      {Math.min(
                        pagination.page * pagination.limit,
                        pagination.total,
                      )}
                    </span>{" "}
                    {t("customers.of")}{" "}
                    <span className="font-medium">{pagination.total}</span>{" "}
                    {t("customers.result")}
                  </p>
                </div>
                <div>
                  <nav
                    className="relative z-20 inline-flex rounded-md shadow-sm -space-x-px"
                    aria-label="Pagination"
                  >
                    <button
                      onClick={() => handlePageChange(pagination.page - 1)}
                      disabled={!pagination.hasPrev}
                      className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm font-medium text-gray-500 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50"
                    >
                      {t("customers.previous")}
                    </button>
                    {Array.from(
                      { length: Math.min(5, pagination.totalPages) },
                      (_, i) => {
                        const page = i + 1;
                        return (
                          <button
                            key={page}
                            onClick={() => handlePageChange(page)}
                            className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                              page === pagination.page
                                ? "z-10 bg-indigo-50 border-indigo-500 text-indigo-600"
                                : "bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600"
                            }`}
                          >
                            {page}
                          </button>
                        );
                      },
                    )}
                    <button
                      onClick={() => handlePageChange(pagination.page + 1)}
                      disabled={!pagination.hasNext}
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm font-medium text-gray-500 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50"
                    >
                      {t("customers.next")}
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Empty State */}
        {!isLoading && customers.length === 0 && (
          <div className="text-center py-12">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">
              {t("customers.noCustomers")}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {t("customers.noCustomersDesc")}
            </p>
            {isAdmin && (
              <div className="mt-6">
                <Link
                  to="/customers/new"
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  <PlusIcon className="h-4 w-4 ml-2" />
                  {t("customers.addCustomer")}
                </Link>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Import Modal */}
      <CustomerImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={() => {
          setIsImportModalOpen(false);
          loadCustomers();
        }}
      />
    </>
  );
};

export default CustomerList;
