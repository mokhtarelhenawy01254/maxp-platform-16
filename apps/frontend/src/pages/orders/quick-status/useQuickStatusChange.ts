import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { apiClient } from "../../../services/apiClient";
import orderWorkflowService, {
  OrderStatusDefinition,
} from "../../../services/orderWorkflowService";
import { getStatusDisplay } from "../../../utils/statusRegistry";
import type { ChangeLogEntry } from "./QuickStatusChangeLog";

export interface OrderData {
  id: string;
  orderNumber: string;
  status: string;
  customerName?: string;
  customerPhone?: string;
  total?: number;
  currency?: string;
}

export function useQuickStatusChange() {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);

  const [orderCode, setOrderCode] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [currentOrder, setCurrentOrder] = useState<OrderData | null>(null);
  const [changeLog, setChangeLog] = useState<ChangeLogEntry[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [changeLoading, setChangeLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [duplicateModal, setDuplicateModal] = useState<{
    code: string;
    count: number;
  } | null>(null);
  const [siteStatuses, setSiteStatuses] = useState<
    { id: string; name: string; code?: string }[]
  >([]);
  const [workflowEnabled, setWorkflowEnabled] = useState(false);
  const searchCountsRef = useRef<Record<string, number>>({});
  const blockedCodesRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    inputRef.current?.focus();
    orderWorkflowService
      .getStatuses()
      .then((res) => {
        if (res?.data && Array.isArray(res.data)) {
          setSiteStatuses(
            res.data.map((s: OrderStatusDefinition) => ({
              id: s.id,
              name: s.name,
              code: s.code,
            }))
          );
        } else if (Array.isArray(res)) {
          setSiteStatuses(
            res.map((s: OrderStatusDefinition) => ({
              id: s.id,
              name: s.name,
              code: s.code,
            }))
          );
        }
      })
      .catch((err) => {
        console.warn(
          "Could not fetch site statuses, using defaults:",
          err?.response?.status
        );
      });

    orderWorkflowService
      .getConfig()
      .then((res) => {
        const config = res?.data;
        setWorkflowEnabled(!!config?.enabled);
      })
      .catch(() => {});
  }, []);

  const handleSearch = useCallback(async () => {
    const code = orderCode.trim();
    if (!code) {
      toast.error(t("quickStatus.enterOrderCode"));
      return;
    }

    const codeKey = code.toLowerCase();

    if (blockedCodesRef.current.has(codeKey)) {
      const blockMsg = t("quickStatus.orderBlocked", { code });
      setSearchError(blockMsg);
      toast.error(blockMsg);
      setOrderCode("");
      inputRef.current?.focus();
      return;
    }

    const preSelectedStatus = selectedStatus;
    setSearchLoading(true);
    setHasSearched(true);
    setSearchError("");
    setCurrentOrder(null);

    try {
      const response = await apiClient.get(
        `/orders-enhanced/${encodeURIComponent(code)}`
      );
      const body = response.data;
      if (body?.success && body?.data) {
        const order = { ...body.data, status: body.data.status?.toUpperCase() };

        const searchCount = (searchCountsRef.current[codeKey] || 0) + 1;
        searchCountsRef.current = {
          ...searchCountsRef.current,
          [codeKey]: searchCount,
        };
        if (searchCount > 1) {
          blockedCodesRef.current.add(codeKey);
          setCurrentOrder(null);
          setSelectedStatus("");
          setOrderCode("");
          setDuplicateModal({
            code: order.orderNumber || code,
            count: searchCount,
          });
          return;
        }

        setCurrentOrder(order);
        const statusToSet = preSelectedStatus || order.status;
        setSelectedStatus(statusToSet);

        setChangeLog((prev) => {
          const exists = prev.find((p) => p.id === order.id);
          if (exists) return prev;
          const newEntry: ChangeLogEntry = {
            id: order.id,
            orderNumber: order.orderNumber,
            oldStatus: order.status,
            newStatus: "",
            changedAt: new Date().toLocaleString("ar-EG"),
          };
          return [newEntry, ...prev];
        });

        if (preSelectedStatus && preSelectedStatus !== order.status) {
          try {
            const changeRes = await apiClient.post(
              "/order-workflow/change-status",
              {
                orderId: order.id,
                statusId: preSelectedStatus,
                isOverride: !workflowEnabled,
              }
            );
            if (changeRes.data?.data?.status === "pending") {
              toast.info(t("quickStatus.pendingApproval"));
            } else {
              setChangeLog((prev) =>
                prev.map((entry) =>
                  entry.id === order.id
                    ? {
                        ...entry,
                        newStatus: preSelectedStatus,
                        changedAt: new Date().toLocaleString("ar-EG"),
                      }
                    : entry
                )
              );
              setCurrentOrder({ ...order, status: preSelectedStatus });
              toast.success(t("quickStatus.changeSuccess"));
            }
          } catch (changeErr) {
            console.error("Auto-change error:", changeErr);
            const axErr = changeErr as {
              response?: { data?: { message?: string } };
            };
            toast.error(
              axErr.response?.data?.message || t("quickStatus.changeError")
            );
          }
        }
      } else {
        setSearchError(t("quickStatus.orderNotFound", { code }));
      }
    } catch (error) {
      const axiosError = error as {
        response?: { status?: number; data?: { message?: string } };
      };
      if (axiosError.response?.status === 404) {
        setSearchError(t("quickStatus.orderNotFound", { code }));
      } else if (
        axiosError.response?.status === 401 ||
        axiosError.response?.status === 403
      ) {
        setSearchError("انتهت صلاحية الجلسة — يرجى تسجيل الدخول مجدداً.");
      } else {
        console.error("Search error:", error);
        setSearchError(t("quickStatus.searchError"));
      }
    } finally {
      setSearchLoading(false);
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 0);
    }
  }, [orderCode, selectedStatus, workflowEnabled, t]);

  const handleChangeStatus = useCallback(async () => {
    if (!currentOrder) return;
    if (!selectedStatus) {
      toast.error(t("quickStatus.selectStatus"));
      return;
    }
    if (selectedStatus === currentOrder.status) {
      toast.error(t("quickStatus.sameStatus"));
      return;
    }

    setChangeLoading(true);
    try {
      const response = await apiClient.post("/order-workflow/change-status", {
        orderId: currentOrder.id,
        statusId: selectedStatus,
        isOverride: !workflowEnabled,
      });
      if (response.data?.data?.status === "pending") {
        toast.info(t("quickStatus.pendingApproval"));
      } else {
        setChangeLog((prev) =>
          prev.map((entry) =>
            entry.id === currentOrder.id
              ? {
                  ...entry,
                  newStatus: selectedStatus,
                  changedAt: new Date().toLocaleString("ar-EG"),
                }
              : entry
          )
        );
        setCurrentOrder((prev) =>
          prev ? { ...prev, status: selectedStatus } : null
        );
        toast.success(t("quickStatus.changeSuccess"));
      }
    } catch (error) {
      console.error("Status change error:", error);
      const axiosError = error as {
        response?: { data?: { message?: string } };
      };
      const msg =
        axiosError.response?.data?.message || t("quickStatus.changeError");
      toast.error(msg);
    } finally {
      setChangeLoading(false);
      setOrderCode("");
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    }
  }, [currentOrder, selectedStatus, workflowEnabled, t]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (duplicateModal) {
      e.preventDefault();
      return;
    }
    if (e.key === "Enter") {
      if (
        currentOrder &&
        selectedStatus &&
        selectedStatus !== currentOrder.status
      ) {
        handleChangeStatus();
      } else {
        handleSearch();
      }
    }
  };

  const handleClear = () => {
    setOrderCode("");
    setCurrentOrder(null);
    setSelectedStatus("");
    setSearchError("");
    searchCountsRef.current = {};
    setHasSearched(false);
    inputRef.current?.focus();
  };

  const getStatusDisplayName = (statusValue: string) => {
    const dynStatus = siteStatuses.find(
      (s) => s.id === statusValue || s.code === statusValue
    );
    if (dynStatus) return dynStatus.name;
    return getStatusDisplay(statusValue).label;
  };

  return {
    inputRef,
    orderCode,
    setOrderCode,
    selectedStatus,
    setSelectedStatus,
    currentOrder,
    changeLog,
    setChangeLog,
    searchLoading,
    changeLoading,
    hasSearched,
    searchError,
    duplicateModal,
    setDuplicateModal,
    siteStatuses,
    handleSearch,
    handleChangeStatus,
    handleKeyDown,
    handleClear,
    getStatusDisplayName,
  };
}

export default useQuickStatusChange;
