import { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { getApiUrl } from "../../../config/environment";
import tokenManager from "../../../utils/tokenManager";
import { toast } from "sonner";
import { Coupon, CouponStats, CouponFilters, NewCouponState } from "./types";

export const getDefaultDates = () => {
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

export const initialNewCouponState: NewCouponState = {
  code: "",
  name: "",
  description: "",
  type: "percentage",
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

export const generateRandomCode = (prefix = "SAVE") => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let rand = "";
  for (let i = 0; i < 4; i++) {
    rand += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${prefix}-${rand}`;
};

export const useCouponsController = () => {
  const { t } = useTranslation();

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
  const [filters, setFilters] = useState<CouponFilters>({
    isActive: "",
    type: "",
    customerSegment: "",
  });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const limit = 20;

  const [newCoupon, setNewCoupon] = useState<NewCouponState>(initialNewCouponState);

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
  }, [filters.isActive, filters.type, filters.customerSegment, page]);

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

  const resetFilters = () => {
    setFilters({ isActive: "", type: "", customerSegment: "" });
    setSearchQuery("");
    setPage(1);
  };

  return {
    t,
    coupons,
    stats,
    loading,
    statsLoading,
    actionLoading,
    selectedCoupon,
    setSelectedCoupon,
    showCouponModal,
    setShowCouponModal,
    showCreateModal,
    setShowCreateModal,
    showEditModal,
    setShowEditModal,
    editingCoupon,
    setEditingCoupon,
    showDeleteModal,
    setShowDeleteModal,
    deletingCoupon,
    setDeletingCoupon,
    searchQuery,
    setSearchQuery,
    filters,
    setFilters,
    page,
    setPage,
    totalPages,
    totalCount,
    newCoupon,
    setNewCoupon,
    filteredCoupons,
    getTypeText,
    getTypeColor,
    fetchCoupons,
    fetchStats,
    createCoupon,
    handleUpdateCoupon,
    handleToggleStatus,
    handleDeleteCoupon,
    copyToClipboard,
    resetFilters,
  };
};
