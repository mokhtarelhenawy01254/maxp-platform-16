import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { tToast } from "../../../utils/i18n-toast";
import io, { Socket } from "socket.io-client";
import { WooOrder, ImportJob, Settings } from "../types";
import tokenManager from "../../../utils/tokenManager";

export const useWooCommerceImport = (settings: Settings | null) => {
  const [loading, setLoading] = useState(false);
  const [wooOrders, setWooOrders] = useState<WooOrder[]>([]);
  const [activeJob, setActiveJob] = useState<ImportJob | null>(null);
  const [importing, setImporting] = useState(false);
  const [totalOrdersCount, setTotalOrdersCount] = useState<number | null>(null);
  const [countingOrders, setCountingOrders] = useState(false);
  const [selectedWooOrders, setSelectedWooOrders] = useState<Set<string>>(
    new Set(),
  );

  // Resume state if any
  const [resumeState, setResumeState] = useState<{
    currentPage: number;
    currentBatch: number;
    processedOrders: number;
    grandTotal: number;
    totalBatches: number;
    timestamp: string;
  } | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const [showImportOptions, setShowImportOptions] = useState(false);
  const [importOptions, setImportOptions] = useState({
    limit: "10" as "10" | "50" | "100" | "all",
    status: "any",
    dateFrom: "",
    dateTo: "",
    batchSize: "50" as "50" | "100",
    duplicateAction: "skip" as "skip" | "update",
  });
  const getAuthHeaders = (additionalHeaders: Record<string, string> = {}) =>
    tokenManager.createAuthHeaders(additionalHeaders);

  // Socket.io initialization for real-time progress
  useEffect(() => {
    socketRef.current = io("/", {
      path: "/socket.io",
      transports: ["websocket"],
      upgrade: false,
      auth: {
        token: tokenManager.getAccessToken(),
      },
    });

    socketRef.current.on("connect", () => {
      console.log("🔌 Socket connected:", socketRef.current?.id);
    });

    socketRef.current.on("import:progress", (data: any) => {
      if (data.jobId && (!activeJob || activeJob.jobId === data.jobId)) {
        setActiveJob((prev) => ({
          ...prev!,
          jobId: data.jobId,
          type: "import",
          status: "running",
          progress: data,
        }));
      }
    });

    socketRef.current.on("import:completed", (data: any) => {
      setActiveJob((prev) => ({
        ...prev!,
        status: "completed",
        progress: { ...prev!.progress, ...data.result, percentage: 100 },
      }));
      tToast.success("wooImport.msg_1451");
      setTimeout(() => setActiveJob(null), 5000);
    });

    socketRef.current.on("import:failed", (data: any) => {
      setActiveJob((prev) => ({
        ...prev!,
        status: "failed",
        progress: { ...prev!.progress, error: data.error },
      }));
      toast.error(`فشل الاستيراد: ${data.error}`);
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, []); // Logic simplified for hook context

  const loadActiveJobs = async () => {
    try {
      const response = await fetch("/api/v1/import-jobs/list", {
        headers: getAuthHeaders(),
      });
      const data = await response.json();
      if (data.success && data.data) {
        // Find running job or most recent one
        const runningJob = data.data.find(
          (j: any) => j.status === "running" || j.status === "pending",
        );
        if (runningJob) {
          setActiveJob(runningJob);
        } else if (data.data.length > 0) {
          // Optionally show last completed job? For now just null if no running job
          // setActiveJob(data.data[0]);
        }
      }
    } catch (error) {
      console.error("Error loading active jobs", error);
    }
  };

  const fetchOrdersCount = async () => {
    if (!settings?.hasCredentials) {
      tToast.error("wooImport.msg_48e6");
      return;
    }

    setCountingOrders(true);
    try {
      const response = await fetch("/api/v1/woocommerce/orders/count", {
        method: "POST",
        headers: getAuthHeaders({
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({
          id: settings.id,
          status:
            importOptions.status !== "any" ? importOptions.status : undefined,
          after: importOptions.dateFrom || undefined,
          before: importOptions.dateTo || undefined,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setTotalOrdersCount(data.data.count);
        toast.success(`إجمالي الطلبات: ${data.data.count}`);
      }
    } catch (error) {
      console.error("Error counting orders:", error);
      tToast.error("wooImport.failed_fetch_454e");
    } finally {
      setCountingOrders(false);
    }
  };

  const fetchWooOrders = async () => {
    if (!settings?.hasCredentials) return;

    setLoading(true);
    setWooOrders([]);
    try {
      const response = await fetch("/api/v1/woocommerce/orders/fetch", {
        method: "POST",
        headers: getAuthHeaders({
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({
          id: settings.id,
          limit:
            importOptions.limit === "all" ? 20 : parseInt(importOptions.limit),
          status:
            importOptions.status !== "any" ? importOptions.status : undefined,
          after: importOptions.dateFrom || undefined,
          before: importOptions.dateTo || undefined,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setWooOrders(data.data.orders);
        toast.success(`تم جلب ${data.data.orders.length} طلب للمراجعة`);
      } else {
        toast.error(data.message);
      }
    } catch (error: any) {
      tToast.error("wooImport.error_fetch_5a91");
    } finally {
      setLoading(false);
    }
  };

  const startBackendImport = async () => {
    setImporting(true);
    try {
      const response = await fetch("/api/v1/import-jobs/start", {
        method: "POST",
        headers: getAuthHeaders({
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({
          id: settings?.id,
          type: "orders",
          limit:
            importOptions.limit === "all" ? 0 : parseInt(importOptions.limit),
          batchSize: parseInt(importOptions.batchSize),
          status: importOptions.status,
          dateFrom: importOptions.dateFrom,
          dateTo: importOptions.dateTo,
          duplicateAction: importOptions.duplicateAction,
        }),
      });
      const data = await response.json();
      if (data.success) {
        setActiveJob(data.data);
        tToast.success("wooImport.msg_f1d1");
      } else {
        toast.error(data.message);
      }
    } catch (error: any) {
      tToast.error("wooImport.msg_dc3a");
    } finally {
      setImporting(false);
    }
  };

  const pauseBackendImport = async () => {
    if (!activeJob) return;
    try {
      await fetch(`/api/v1/import-jobs/pause/${activeJob.jobId}`, {
        method: "POST",
        headers: getAuthHeaders(),
      });
      tToast.success("wooImport.success_send_ff9e");
    } catch (e) {
      tToast.error("wooImport.msg_41af");
    }
  };

  const resumeBackendImport = async () => {
    if (!activeJob) return;
    try {
      await fetch(`/api/v1/import-jobs/resume/${activeJob.jobId}`, {
        method: "POST",
        headers: getAuthHeaders(),
      });
      tToast.success("wooImport.msg_b87b");
    } catch (e) {
      tToast.error("wooImport.msg_e256");
    }
  };

  const cancelBackendImport = async () => {
    if (!activeJob) return;
    try {
      await fetch(`/api/v1/import-jobs/cancel/${activeJob.jobId}`, {
        method: "POST",
        headers: getAuthHeaders(),
      });
      tToast.success("wooImport.msg_26c8");
      setActiveJob(null);
    } catch (e) {
      tToast.error("wooImport.msg_8c96");
    }
  };

  const importSelectedOrders = async () => {
    if (selectedWooOrders.size === 0) return;

    setImporting(true);
    try {
      const ordersToImport = wooOrders.filter((o) =>
        selectedWooOrders.has(o.wooCommerceId),
      );

      const response = await fetch("/api/v1/woocommerce/orders/import", {
        method: "POST",
        headers: getAuthHeaders({
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({
          id: settings?.id,
          orders: ordersToImport,
          duplicateAction: importOptions.duplicateAction,
        }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success(`تم استيراد ${data.data.imported} طلب بنجاح`);
        setSelectedWooOrders(new Set());
        // Remove imported orders from review list
        setWooOrders((prev) =>
          prev.filter((o) => !selectedWooOrders.has(o.wooCommerceId)),
        );
      } else {
        toast.error(data.message);
      }
    } catch (error: any) {
      tToast.error("wooImport.msg_4145");
    } finally {
      setImporting(false);
    }
  };

  return {
    loading,
    importing,
    wooOrders,
    setWooOrders,
    activeJob,
    setActiveJob,
    totalOrdersCount,
    countingOrders,
    selectedWooOrders,
    setSelectedWooOrders,
    resumeState,
    loadActiveJobs,
    fetchOrdersCount,
    fetchWooOrders,
    startBackendImport,
    pauseBackendImport,
    resumeBackendImport,
    cancelBackendImport,
    importSelectedOrders,
    showImportOptions,
    setShowImportOptions,
    importOptions,
    setImportOptions,
  };
};
