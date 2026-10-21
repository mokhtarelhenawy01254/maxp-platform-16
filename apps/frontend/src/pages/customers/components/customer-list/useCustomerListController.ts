import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  customerService,
  Customer,
  CustomerFilters,
} from "@/services/customerService";
import { useAuth } from "@/hooks/useAuthSimple";

export const useCustomerListController = () => {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
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

  // Sync status filter from URL search params
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

  // Total customers with an active auto-discount coupon
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

  const loadCustomers = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await customerService.getCustomers(filters);
      setCustomers(response.data || []);
      setPagination(
        response.pagination || {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false,
        },
      );
    } catch (err: any) {
      setError(err.message || t("customers.loadingError"));
    } finally {
      setIsLoading(false);
    }
  }, [filters, t]);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  // Fetch available tags on mount
  useEffect(() => {
    customerService.getDistinctTags().then(setAvailableTags).catch(() => {});
  }, []);

  const handleTagFilter = (tagName: string) => {
    setSelectedTag(tagName);
    setFilters((prev) => ({ ...prev, tag: tagName || undefined, page: 1 }));
  };

  // Auto-search debounce on typing (300ms)
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

  // Status Tab selection
  const handleStatusTabChange = (statusId: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (statusId) {
      newParams.set("status", statusId);
    } else {
      newParams.delete("status");
    }
    setSearchParams(newParams);
  };

  return {
    t,
    isAdmin,
    customers,
    isLoading,
    error,
    searchQuery,
    setSearchQuery,
    showOnlyWithOrders,
    handleToggleWithOrders,
    autoDiscountFilter,
    handleAutoDiscountFilter,
    availableDiscountCount,
    pagination,
    isImportModalOpen,
    setIsImportModalOpen,
    selectedIds,
    setSelectedIds,
    availableTags,
    selectedTag,
    handleTagFilter,
    statusOptions,
    currentStatus: searchParams.get("status") || "",
    handleStatusTabChange,
    toggleSelectAll,
    toggleSelect,
    loadCustomers,
    handleSearch,
    handlePageChange,
    handleExport,
  };
};
