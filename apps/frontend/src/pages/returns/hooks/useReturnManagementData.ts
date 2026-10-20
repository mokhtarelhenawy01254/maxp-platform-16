import React, { useState, useEffect, useMemo, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  returnService,
  ReturnRequest,
  ReviewDisplayConfig,
} from "../../../services/returnService";
import { apiClient } from "../../../services/apiClient";

export const useReturnManagementData = () => {
  const { t } = useTranslation();
  const [requests, setRequests] = useState<ReturnRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<ReturnRequest | null>(null);

  // Display Config
  const [displayConfig, setDisplayConfig] = useState<ReviewDisplayConfig | null>(null);

  // Categories for responsible party names
  const [categories, setCategories] = useState<any[]>([]);
  const responsiblePartyLabel = useMemo(() => {
    const m: Record<string, string> = {};
    categories.forEach((cat: any) => {
      if (!m[cat.defaultRole]) m[cat.defaultRole] = cat.name;
    });
    return (role?: string | null) => (role ? m[role] || role : "-");
  }, [categories]);

  // Filters & Search
  const [searchParams, setSearchParams] = useSearchParams();
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState(searchParams.get("search") ?? "");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Order statuses for secondary filter
  const [orderStatuses, setOrderStatuses] = useState<{ code: string; label: string }[]>([]);

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Review Tab: "pending" = unreviewed (default), "reviewed" = completed
  const [reviewTab, setReviewTab] = useState<"pending" | "reviewed">(
    searchParams.get("tab") === "reviewed" ? "reviewed" : "pending",
  );

  // ?preview=1 -> auto-open the details modal for the first loaded request
  const previewRequested = searchParams.get("preview") === "1";
  const previewAppliedRef = useRef(false);

  const handleReviewTabChange = (tab: "pending" | "reviewed") => {
    setReviewTab(tab);
    const next = new URLSearchParams(searchParams);
    if (tab === "pending") next.delete("tab");
    else next.set("tab", "reviewed");
    setSearchParams(next, { replace: true });
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = { page, limit: 20 };
      params.isReviewed = reviewTab === "reviewed" ? "true" : "false";
      if (orderStatusFilter) params.orderStatus = orderStatusFilter;
      if (searchTerm) params.search = searchTerm;
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;
      if (displayConfig?.ordersStartDate) params.startDate = displayConfig.ordersStartDate;
      const reqRes = await returnService.getRequests(params);
      setRequests(reqRes.data.data);
      setTotal(reqRes.data.total);
      setTotalPages(reqRes.data.totalPages);
      if (previewRequested && !previewAppliedRef.current && reqRes.data.data.length > 0) {
        previewAppliedRef.current = true;
        setSelectedRequest(reqRes.data.data[0]);
      }
    } catch (error) {
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
  }, [searchTerm, orderStatusFilter, dateFrom, dateTo, reviewTab]);

  useEffect(() => {
    fetchData();
  }, [searchTerm, orderStatusFilter, dateFrom, dateTo, page, displayConfig, reviewTab]);

  // Load order statuses for secondary filter
  useEffect(() => {
    apiClient
      .get("/order-status", { _skipErrorToast: true })
      .then((res) => {
        if (res.data?.success && Array.isArray(res.data.data)) {
          const fetched = res.data.data
            .filter((s: any) => s.statusType !== "payment")
            .map((s: any) => ({ code: s.code, label: s.name || s.code }));
          if (fetched.length > 0) setOrderStatuses(fetched);
        }
      })
      .catch(() => {});
  }, []);

  // Load display settings
  useEffect(() => {
    returnService
      .getSettings()
      .then((res) => {
        const config = res.data?.reviewDisplayConfig;
        if (config) setDisplayConfig(config);
      })
      .catch(() => {});
  }, []);

  // Load categories for responsible party names
  useEffect(() => {
    returnService
      .getCategories()
      .then((res) => setCategories(res.data))
      .catch(() => {});
  }, []);

  const copyTracking = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(t("returns.k_225"));
    } catch {
      toast.error(t("returns.k_226"));
    }
  };

  return {
    t,
    requests,
    loading,
    selectedRequest,
    setSelectedRequest,
    displayConfig,
    responsiblePartyLabel,
    orderStatusFilter,
    setOrderStatusFilter,
    searchTerm,
    setSearchTerm,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    orderStatuses,
    page,
    setPage,
    totalPages,
    total,
    reviewTab,
    handleReviewTabChange,
    fetchData,
    copyTracking,
  };
};
