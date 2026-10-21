import { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import tokenManager from "../../../../utils/tokenManager";
import { EasyOrdersProduct, EasyOrdersSyncLog, EasyOrdersSettings } from "./types";

export function useEasyOrdersController() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<"products" | "orders">("products");
  const [apiKey, setApiKey] = useState("");
  const [products, setProducts] = useState<EasyOrdersProduct[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [syncLogs, setSyncLogs] = useState<EasyOrdersSyncLog[]>([]);
  const [settings, setSettings] = useState<EasyOrdersSettings | null>(null);

  const getAuthHeaders = useCallback(
    (additionalHeaders: Record<string, string> = {}) =>
      tokenManager.createAuthHeaders(additionalHeaders),
    []
  );

  const loadSettings = useCallback(async () => {
    try {
      const response = await fetch("/api/v1/easy-orders/settings", {
        headers: getAuthHeaders(),
      });
      const data = await response.json();
      if (data.success && data.data) {
        setSettings(data.data);
        if (data.data.hasApiKey) {
          setApiKey("********");
        }
      }
    } catch (error) {
      console.error("Error loading settings:", error);
    }
  }, [getAuthHeaders]);

  const loadSyncLogs = useCallback(async () => {
    try {
      const response = await fetch("/api/v1/easy-orders/sync-logs", {
        headers: getAuthHeaders(),
      });
      const data = await response.json();
      if (data.success) {
        setSyncLogs(data.data || []);
      }
    } catch (error) {
      console.error("Error loading sync logs:", error);
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    loadSettings();
    loadSyncLogs();
  }, [loadSettings, loadSyncLogs]);

  const saveSettings = useCallback(async () => {
    if (!apiKey.trim()) {
      toast.error(t("easyOrdersImport.errorApiKey"));
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/v1/easy-orders/settings", {
        method: "POST",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          apiKey: apiKey === "********" ? undefined : apiKey,
          syncEnabled: true,
        }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success(t("common.savedSuccessfully"));
        loadSettings();
      } else {
        toast.error(data.message);
      }
    } catch {
      toast.error(t("common.error"));
    } finally {
      setLoading(false);
    }
  }, [apiKey, t, getAuthHeaders, loadSettings]);

  const fetchProducts = useCallback(async () => {
    if (!apiKey.trim()) {
      toast.error(t("easyOrdersImport.errorApiKey"));
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/v1/easy-orders/fetch-products", {
        method: "POST",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          apiKey: apiKey === "********" ? undefined : apiKey.trim(),
        }),
      });

      const data = await response.json();
      if (data.success) {
        const fetchedProducts: EasyOrdersProduct[] = data.data?.products ?? [];
        setProducts(fetchedProducts);
        toast.success(data.message);
        setSelectedProducts(new Set(fetchedProducts.map((_, i) => i)));
      } else {
        toast.error(data.message || t("easyOrdersImport.errorFetch"));
      }
    } catch (error) {
      console.error("Error fetching products:", error);
      toast.error(t("easyOrdersImport.errorConnection"));
    } finally {
      setLoading(false);
    }
  }, [apiKey, t, getAuthHeaders]);

  const syncOrders = useCallback(async () => {
    setSyncing(true);
    try {
      const response = await fetch("/api/v1/easy-orders/sync-orders", {
        method: "POST",
        headers: getAuthHeaders(),
      });
      const data = await response.json();
      if (data.success) {
        toast.success(t("easyOrdersImport.successSync") || "تمت المزامنة بنجاح");
        loadSyncLogs();
        loadSettings();
      } else {
        toast.error(data.message);
      }
    } catch {
      toast.error(t("common.error"));
    } finally {
      setSyncing(false);
    }
  }, [getAuthHeaders, loadSyncLogs, loadSettings, t]);

  const clearData = useCallback(() => {
    setProducts([]);
    setSelectedProducts(new Set());
    setSearchTerm("");
  }, []);

  const importProducts = useCallback(async () => {
    if (selectedProducts.size === 0) {
      toast.error(t("easyOrdersImport.errorSelectOne"));
      return;
    }

    setImporting(true);
    try {
      const selectedProductsList = Array.from(selectedProducts).map(
        (index) => products[index]
      );

      const response = await fetch("/api/v1/easy-orders/import-selected", {
        method: "POST",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ products: selectedProductsList }),
      });

      const data = await response.json();
      if (data.success) {
        const { imported, failed, skipped } = data.data || {};
        let message = t("easyOrdersImport.successImport", { imported: imported || 0 });
        if (skipped > 0) message += " | " + t("easyOrdersImport.skipped", { count: skipped });
        if (failed > 0) message += " | " + t("easyOrdersImport.failed", { count: failed });

        toast.success(message);
        clearData();
      } else {
        toast.error(data.message || t("easyOrdersImport.errorImport"));
      }
    } catch (error) {
      console.error("Error importing products:", error);
      toast.error(t("easyOrdersImport.errorImportConnection"));
    } finally {
      setImporting(false);
    }
  }, [selectedProducts, products, getAuthHeaders, t, clearData]);

  const toggleProduct = useCallback((index: number) => {
    setSelectedProducts((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }, []);

  const filteredProducts = useMemo(() => {
    return products.filter(
      (product) =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [products, searchTerm]);

  const toggleAll = useCallback(() => {
    if (selectedProducts.size === filteredProducts.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(
        new Set(filteredProducts.map((p) => products.indexOf(p)))
      );
    }
  }, [selectedProducts.size, filteredProducts, products]);

  return {
    activeTab,
    setActiveTab,
    apiKey,
    setApiKey,
    products,
    selectedProducts,
    loading,
    importing,
    syncing,
    searchTerm,
    setSearchTerm,
    syncLogs,
    settings,
    filteredProducts,
    saveSettings,
    fetchProducts,
    syncOrders,
    clearData,
    importProducts,
    toggleProduct,
    toggleAll,
    loadSyncLogs,
  };
}
