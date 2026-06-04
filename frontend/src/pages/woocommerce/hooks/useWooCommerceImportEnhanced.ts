/**
 * 🚀 Enhanced WooCommerce Import Hook
 * Optimized with TanStack Query caching, memory management, and better performance
 */

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import io, { Socket } from "socket.io-client";
import tokenManager from "../../../utils/tokenManager";
import { wooCommerceStorage } from "../../../utils/storage";
import {
  retryWithBackoff,
  isRecoverableError,
  getUserFriendlyMessage,
} from "../../../utils/errorHandler";
import { debounce } from "../../../utils/pagination";

// Types (defined locally to avoid import issues)
interface WooOrder {
  wooCommerceId: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  wooCommerceStatus: string;
  total: number;
  currency: string;
  wooCommerceDateCreated: string;
  localStatus?: string;
}

interface ImportJob {
  jobId: string;
  type: string;
  status:
    | "pending"
    | "running"
    | "paused"
    | "completed"
    | "failed"
    | "cancelled";
  progress: {
    currentPage: number;
    currentBatch: number;
    totalBatches: number;
    processedOrders: number;
    grandTotal: number;
    imported: number;
    updated: number;
    skipped: number;
    failed: number;
    percentage: number;
    status?: string;
    error?: string;
  };
}

interface Settings {
  hasCredentials?: boolean;
  storeUrl?: string;
  [key: string]: unknown;
}

interface ImportOptions {
  limit: string;
  status: string;
  dateFrom: string;
  dateTo: string;
  batchSize: string;
  duplicateAction: string;
}

interface UseWooCommerceImportEnhancedProps {
  settings: Settings | null;
  queryClient?: ReturnType<typeof useQueryClient>;
}

// API configuration
const API_CONFIG = {
  baseUrl: "/api/v1",
  timeout: 30000,
  maxRetries: 3,
  retryDelay: 1000,
};

const getAuthHeaders = (additionalHeaders: Record<string, string> = {}) =>
  tokenManager.createAuthHeaders(additionalHeaders);

/**
 * Check browser memory usage
 */
function getMemoryStats(): { used: number; limit: number; percentage: number } {
  const perfMemory = performance as unknown as {
    memory?: { usedJSHeapSize: number; jsHeapSizeLimit: number };
  };
  const used = perfMemory.memory?.usedJSHeapSize || 0;
  const limit = perfMemory.memory?.jsHeapSizeLimit || 0;

  return {
    used,
    limit,
    percentage: limit > 0 ? Math.round((used / limit) * 100) : 0,
  };
}

/**
 * Check if we should reduce batch size based on memory
 */
function getAdaptiveBatchSize(defaultSize: number): number {
  const stats = getMemoryStats();

  if (stats.percentage > 80) return Math.floor(defaultSize * 0.5);
  if (stats.percentage > 60) return Math.floor(defaultSize * 0.75);
  return defaultSize;
}

/**
 * API client with retry logic
 */
async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${API_CONFIG.baseUrl}${endpoint}`;

  return retryWithBackoff(
    async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        API_CONFIG.timeout,
      );

      const response = await fetch(url, {
        ...options,
        headers: getAuthHeaders({
          "Content-Type": "application/json",
          ...(options.headers as Record<string, string>),
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(
          `API Error: ${response.statusText} (${response.status})`,
        );
      }

      return response.json();
    },
    {
      maxRetries: API_CONFIG.maxRetries,
      initialDelay: API_CONFIG.retryDelay,
      retryCondition: isRecoverableError,
    },
  );
}

/**
 * Enhanced Import Hook with TanStack Query
 */
export function useWooCommerceImportEnhanced({
  settings,
  queryClient,
}: UseWooCommerceImportEnhancedProps) {
  const socketRef = useRef<Socket | null>(null);

  // Import options state with localStorage persistence
  const [importOptions, setImportOptions] = useState<ImportOptions>(() => {
    try {
      const saved = wooCommerceStorage.getWithExpiry("importOptions");
      if (saved) return saved as ImportOptions;
    } catch {
      // Fallback if storage fails
    }
    return {
      limit: "100",
      status: "any",
      dateFrom: "",
      dateTo: "",
      batchSize: "100",
      duplicateAction: "skip",
    };
  });

  // Save options to storage on change (debounced)
  const saveOptionsDebounced = useMemo(
    () =>
      debounce((opts: ImportOptions) => {
        try {
          wooCommerceStorage.setWithExpiry(
            "importOptions",
            opts,
            24 * 60 * 60 * 1000,
          );
        } catch {
          console.warn("Failed to save import options");
        }
      }, 1000),
    [],
  );

  useEffect(() => {
    saveOptionsDebounced(importOptions);
  }, [importOptions, saveOptionsDebounced]);

  // ============ QUERY: Fetch Orders Count ============
  const ordersCountQuery = useQuery({
    queryKey: ["woocommerce", "orders", "count", importOptions],
    queryFn: async () => {
      const response = await apiClient<{
        success: boolean;
        data: { count: number };
      }>("/woocommerce/orders/count", {
        method: "POST",
        body: JSON.stringify({
          status:
            importOptions.status !== "any" ? importOptions.status : undefined,
          after: importOptions.dateFrom || undefined,
          before: importOptions.dateTo || undefined,
        }),
      });
      return response.data.count;
    },
    enabled: !!settings?.hasCredentials,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: (failureCount, error) => {
      if (!isRecoverableError(error)) return false;
      return failureCount < API_CONFIG.maxRetries;
    },
  });

  // ============ QUERY: Fetch Orders Preview ============
  const ordersPreviewQuery = useQuery({
    queryKey: ["woocommerce", "orders", "preview", importOptions],
    queryFn: async () => {
      const response = await apiClient<{
        success: boolean;
        data: { orders: WooOrder[] };
      }>("/woocommerce/orders/fetch", {
        method: "POST",
        body: JSON.stringify({
          limit: parseInt(importOptions.limit),
          status:
            importOptions.status !== "any" ? importOptions.status : undefined,
          after: importOptions.dateFrom || undefined,
          before: importOptions.dateTo || undefined,
        }),
      });
      return response.data.orders;
    },
    enabled: !!settings?.hasCredentials,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  // ============ QUERY: Active Import Jobs ============
  const activeJobsQuery = useQuery({
    queryKey: ["woocommerce", "import-jobs"],
    queryFn: async () => {
      const response = await apiClient<{ success: boolean; data: ImportJob[] }>(
        "/import-jobs/list",
      );
      return response.data;
    },
    refetchInterval: 5000,
    staleTime: 1000,
  });

  // ============ MUTATION: Start Import ============
  const startImportMutation = useMutation({
    mutationFn: async (options: ImportOptions) => {
      const adaptiveBatchSize = getAdaptiveBatchSize(
        parseInt(options.batchSize),
      );

      const response = await apiClient<{
        success: boolean;
        data: ImportJob;
        message: string;
      }>("/import-jobs/start", {
        method: "POST",
        body: JSON.stringify({
          type: "orders",
          limit: options.limit === "all" ? 0 : parseInt(options.limit),
          batchSize: adaptiveBatchSize,
          status: options.status,
          dateFrom: options.dateFrom,
          dateTo: options.dateTo,
          duplicateAction: options.duplicateAction,
        }),
      });

      return response.data;
    },
    onSuccess: () => {
      toast.success("🚀 تم بدء الاستيراد في الخلفية");
      queryClient?.invalidateQueries({
        queryKey: ["woocommerce", "import-jobs"],
      });
    },
    onError: (error) => {
      toast.error(getUserFriendlyMessage(error));
    },
  });

  // ============ MUTATION: Pause Import ============
  const pauseImportMutation = useMutation({
    mutationFn: async (jobId: string) => {
      await apiClient(`/import-jobs/pause/${jobId}`, { method: "POST" });
    },
    onSuccess: () => {
      toast.success("⏸️ تم إيقاف الاستيراد مؤقتاً");
      queryClient?.invalidateQueries({
        queryKey: ["woocommerce", "import-jobs"],
      });
    },
    onError: () => {
      toast.error("❌ فشل في إيقاف الاستيراد");
    },
  });

  // ============ MUTATION: Resume Import ============
  const resumeImportMutation = useMutation({
    mutationFn: async (jobId: string) => {
      await apiClient(`/import-jobs/resume/${jobId}`, { method: "POST" });
    },
    onSuccess: () => {
      toast.success("▶️ تم استئناف الاستيراد");
      queryClient?.invalidateQueries({
        queryKey: ["woocommerce", "import-jobs"],
      });
    },
    onError: () => {
      toast.error("❌ فشل في استئناف الاستيراد");
    },
  });

  // ============ MUTATION: Cancel Import ============
  const cancelImportMutation = useMutation({
    mutationFn: async (jobId: string) => {
      await apiClient(`/import-jobs/cancel/${jobId}`, { method: "POST" });
    },
    onSuccess: () => {
      toast.success("🛑 تم إلغاء الاستيراد");
      queryClient?.invalidateQueries({
        queryKey: ["woocommerce", "import-jobs"],
      });
    },
    onError: () => {
      toast.error("❌ فشل في إلغاء الاستيراد");
    },
  });

  // ============ MUTATION: Import Selected ============
  const importSelectedMutation = useMutation({
    mutationFn: async ({
      orders,
      duplicateAction,
    }: {
      orders: WooOrder[];
      duplicateAction: string;
    }) => {
      const response = await apiClient<{
        success: boolean;
        data: { imported: number };
        message: string;
      }>("/woocommerce/orders/import", {
        method: "POST",
        body: JSON.stringify({ orders, duplicateAction }),
      });
      return response.data;
    },
    onSuccess: (data) => {
      toast.success(`✅ تم استيراد ${data.imported} طلب بنجاح`);
      queryClient?.invalidateQueries({
        queryKey: ["woocommerce", "orders", "preview"],
      });
      queryClient?.invalidateQueries({
        queryKey: ["woocommerce", "orders", "count"],
      });
    },
    onError: () => {
      toast.error("❌ فشل في استيراد الطلبات المحددة");
    },
  });

  // ============ Socket.IO Connection ============
  useEffect(() => {
    if (!settings?.hasCredentials) return;

    socketRef.current = io("/", {
      path: "/socket.io",
      transports: ["websocket"],
      upgrade: false,
      auth: { token: tokenManager.getAccessToken() || "" },
    });

    const socket = socketRef.current;

    socket.on("connect", () => {
      console.log("🔌 Import socket connected:", socket.id);
    });

    socket.on("import:completed", () => {
      toast.success("🎉 تم اكتمال الاستيراد بنجاح!");
      queryClient?.invalidateQueries({
        queryKey: ["woocommerce", "import-jobs"],
      });
      queryClient?.invalidateQueries({
        queryKey: ["woocommerce", "orders", "preview"],
      });
      queryClient?.invalidateQueries({
        queryKey: ["woocommerce", "orders", "count"],
      });
    });

    socket.on("import:failed", (data: { jobId: string; error: string }) => {
      toast.error(`❌ فشل الاستيراد: ${data.error}`);
      queryClient?.invalidateQueries({
        queryKey: ["woocommerce", "import-jobs"],
      });
    });

    return () => {
      socket.disconnect();
    };
  }, [settings?.hasCredentials, queryClient]);

  // ============ Memory Management ============
  useEffect(() => {
    const checkMemory = () => {
      const stats = getMemoryStats();

      if (stats.percentage > 90) {
        console.warn("⚠️ Memory usage critical! Clearing query cache...");
        queryClient?.clear();
        toast.error("🧠 تم مسح ذاكرة التخزين المؤقت بسبب ضغط الذاكرة");
      }
    };

    const interval = setInterval(checkMemory, 30000);
    return () => clearInterval(interval);
  }, [queryClient]);

  // ============ Computed Values ============
  const activeJob = activeJobsQuery.data?.find(
    (j: ImportJob) => j.status === "running" || j.status === "pending",
  );

  const isPending =
    startImportMutation.isPending ||
    pauseImportMutation.isPending ||
    resumeImportMutation.isPending ||
    cancelImportMutation.isPending ||
    importSelectedMutation.isPending;

  const stats = useMemo(
    () => ({
      memory: getMemoryStats(),
      isImporting: isPending,
      isLoading:
        ordersCountQuery.isLoading ||
        ordersPreviewQuery.isLoading ||
        activeJobsQuery.isLoading,
    }),
    [
      isPending,
      ordersCountQuery.isLoading,
      ordersPreviewQuery.isLoading,
      activeJobsQuery.isLoading,
    ],
  );

  // ============ Public API ============
  return {
    // State
    importOptions,
    setImportOptions,

    // Data
    totalOrdersCount: ordersCountQuery.data ?? null,
    wooOrders: ordersPreviewQuery.data ?? [],
    activeJob,

    // Loading States
    countingOrders: ordersCountQuery.isLoading,
    fetchingOrders: ordersPreviewQuery.isLoading,
    loadingJobs: activeJobsQuery.isLoading,

    // Mutations
    startImport: (opts: ImportOptions) => startImportMutation.mutateAsync(opts),
    pauseImport: (jobId: string) => pauseImportMutation.mutate(jobId),
    resumeImport: (jobId: string) => resumeImportMutation.mutate(jobId),
    cancelImport: (jobId: string) => cancelImportMutation.mutate(jobId),
    importSelected: (vars: { orders: WooOrder[]; duplicateAction: string }) =>
      importSelectedMutation.mutateAsync(vars),

    // Utilities
    refetchCount: () =>
      queryClient?.invalidateQueries({
        queryKey: ["woocommerce", "orders", "count"],
      }),
    refetchPreview: () =>
      queryClient?.invalidateQueries({
        queryKey: ["woocommerce", "orders", "preview"],
      }),
    clearCache: () => queryClient?.clear(),

    // Stats
    stats,

    // Memory
    memoryStats: stats.memory,
  };
}

/**
 * Memory-optimized version for large imports (>10,000 orders)
 */
export function useWooCommerceImportLarge({
  settings,
}: UseWooCommerceImportEnhancedProps) {
  const base = useWooCommerceImportEnhanced({ settings });

  // Additional optimizations for large datasets
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  // Virtual scrolling state
  const [scrollIndex, setScrollIndex] = useState(0);

  const visibleRange = useMemo(() => {
    const start = Math.max(0, scrollIndex - 5);
    const end = Math.min(base.wooOrders.length, scrollIndex + pageSize + 5);
    return { start, end };
  }, [scrollIndex, pageSize, base.wooOrders.length]);

  return {
    ...base,
    page,
    setPage,
    pageSize,
    setPageSize,
    scrollIndex,
    setScrollIndex,
    visibleRange,
    totalPages: Math.ceil((base.wooOrders.length || 0) / pageSize),
  };
}

export default useWooCommerceImportEnhanced;
