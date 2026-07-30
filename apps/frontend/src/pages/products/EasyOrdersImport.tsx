import { ShoppingBag as ShoppingBagIcon, Download as ArrowDownTrayIcon, Check as CheckCircleIcon, X as XCircleIcon, AlertTriangle as ExclamationTriangleIcon, Search as MagnifyingGlassIcon, Settings as Cog6ToothIcon, RefreshCw as ArrowPathIcon, File as DocumentTextIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import React, { useState, useEffect } from "react";
;
import { toast } from "sonner";
import tokenManager from "../../utils/tokenManager";

interface Product {
  name: string;
  description: string;
  price: number;
  comparePrice?: number;
  cost?: number;
  sku?: string;
  barcode?: string;
  stock: number;
  trackInventory: boolean;
  images: string[];
  category?: string;
  tags: string[];
  weight?: number;
  dimensions?: any;
  easyOrdersId?: string;
  easyOrdersUrl?: string;
}

interface SyncLog {
  id: string;
  syncType: string;
  status: string;
  startedAt: string;
  completedAt?: string;
  totalItems: number;
  successCount: number;
  failedCount: number;
  skippedCount: number;
  errorMessage?: string;
}

const EasyOrdersImport: React.FC = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<"products" | "orders">("products");
  const [apiKey, setApiKey] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<Set<number>>(
    new Set(),
  );
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const getAuthHeaders = (additionalHeaders: Record<string, string> = {}) =>
    tokenManager.createAuthHeaders(additionalHeaders);

  // Load settings on mount
  useEffect(() => {
    loadSettings();
    loadSyncLogs();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await fetch("/api/v1/easy-orders/settings", {
        headers: getAuthHeaders(),
      });
      const data = await response.json();
      if (data.success && data.data) {
        setSettings(data.data);
        if (data.data.hasApiKey) {
          setApiKey("********"); // Placeholder
        }
      }
    } catch (error) {
      console.error("Error loading settings:", error);
    }
  };

  const loadSyncLogs = async () => {
    try {
      const response = await fetch("/api/v1/easy-orders/sync-logs", {
        headers: getAuthHeaders(),
      });
      const data = await response.json();
      if (data.success) {
        setSyncLogs(data.data);
      }
    } catch (error) {
      console.error("Error loading sync logs:", error);
    }
  };

  const saveSettings = async () => {
    if (!apiKey.trim()) {
      toast.error(t("easyOrdersImport.errorApiKey"));
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/v1/easy-orders/settings", {
        method: "POST",
        headers: getAuthHeaders({
          "Content-Type": "application/json",
        }),
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
    } catch (error) {
      toast.error(t("common.error"));
    } finally {
      setLoading(false);
    }
  };

  // جلب المنتجات من Easy Orders
  const fetchProducts = async () => {
    if (!apiKey.trim()) {
      toast.error(t("easyOrdersImport.errorApiKey"));
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/v1/easy-orders/fetch-products", {
        method: "POST",
        headers: getAuthHeaders({
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({
          apiKey: apiKey === "********" ? undefined : apiKey.trim(),
        }),
      });

      const data = await response.json();

      if (data.success) {
        const fetchedProducts: Product[] = data.data?.products ?? [];
        setProducts(fetchedProducts);
        toast.success(data.message);

        const allIndexes = new Set<number>(
          fetchedProducts.map((_: any, i: number) => i),
        );
        setSelectedProducts(allIndexes);
      } else {
        toast.error(data.message || t("easyOrdersImport.errorFetch"));
      }
    } catch (error: any) {
      console.error("Error fetching products:", error);
      toast.error(t("easyOrdersImport.errorConnection"));
    } finally {
      setLoading(false);
    }
  };

  const syncOrders = async () => {
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
    } catch (error) {
      toast.error(t("common.error"));
    } finally {
      setSyncing(false);
    }
  };

  // مسح البيانات
  const clearData = () => {
    setProducts([]);
    setSelectedProducts(new Set());
    setSearchTerm("");
  };

  // استيراد المنتجات المحددة
  const importProducts = async () => {
    if (selectedProducts.size === 0) {
      toast.error(t("easyOrdersImport.errorSelectOne"));
      return;
    }

    setImporting(true);
    try {
      const selectedProductsList = Array.from(selectedProducts).map(
        (index) => products[index],
      );

      const response = await fetch("/api/v1/easy-orders/import-selected", {
        method: "POST",
        headers: getAuthHeaders({
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({
          products: selectedProductsList,
        }),
      });

      const data = await response.json();

      if (data.success) {
        const { imported, failed, skipped } = data.data;

        let message = t("easyOrdersImport.successImport", { imported });
        if (skipped > 0)
          message += " | " + t("easyOrdersImport.skipped", { count: skipped });
        if (failed > 0)
          message += " | " + t("easyOrdersImport.failed", { count: failed });

        toast.success(message);
        clearData();
      } else {
        toast.error(data.message || t("easyOrdersImport.errorImport"));
      }
    } catch (error: any) {
      console.error("Error importing products:", error);
      toast.error(t("easyOrdersImport.errorImportConnection"));
    } finally {
      setImporting(false);
    }
  };

  // تحديد/إلغاء تحديد منتج
  const toggleProduct = (index: number) => {
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedProducts(newSelected);
  };

  // تحديد/إلغاء تحديد الكل
  const toggleAll = () => {
    if (selectedProducts.size === filteredProducts.length) {
      setSelectedProducts(new Set());
    } else {
      const allIndexes = new Set(
        filteredProducts.map((p) => products.indexOf(p)),
      );
      setSelectedProducts(allIndexes);
    }
  };

  // فلترة المنتجات حسب البحث
  const filteredProducts = products.filter(
    (product) =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6" dir="rtl">
      <div className="w-full">
        {/* Navigation Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6">
          <button
            onClick={() => setActiveTab("products")}
            className={`px-6 py-3 font-medium text-sm flex items-center gap-2 ${activeTab === "products"
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-gray-500 hover:text-gray-700"
              }`}
          >
            <ShoppingBagIcon className="h-5 w-5" />
            استيراد المنتجات
          </button>
          <button
            onClick={() => setActiveTab("orders")}
            className={`px-6 py-3 font-medium text-sm flex items-center gap-2 ${activeTab === "orders"
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-gray-500 hover:text-gray-700"
              }`}
          >
            <ArrowPathIcon className="h-5 w-5" />
            مزامنة الطلبات والإعدادات
          </button>
        </div>

        {activeTab === "products" ? (
          <>
            {/* Form */}
            {products.length === 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  استيراد المنتجات من Easy Orders
                </h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      مفتاح الـ API الخاص بـ Easy Orders *
                    </label>
                    <input
                      type="password"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="أدخل مفتاح الـ API هنا..."
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <button
                    onClick={fetchProducts}
                    disabled={loading || !apiKey.trim()}
                    className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    ) : (
                      <MagnifyingGlassIcon className="h-5 w-5" />
                    )}
                    جلب المنتجات
                  </button>
                </div>
              </div>
            )}

            {/* List */}
            {products.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                      المنتجات المتاحة ({filteredProducts.length})
                    </h2>
                    <p className="text-sm text-gray-600">تم تحديد {selectedProducts.size} منتج</p>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={toggleAll} className="px-4 py-2 border rounded-lg">
                      {selectedProducts.size === filteredProducts.length ? "إلغاء تحديد الكل" : "تحديد الكل"}
                    </button>
                    <button
                      onClick={importProducts}
                      className="px-6 py-2 bg-green-600 text-white rounded-lg flex items-center gap-2"
                      disabled={importing}
                    >
                      {importing && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
                      استيراد المحدد
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {filteredProducts.map((product, index) => {
                    const originalIndex = products.indexOf(product);
                    const isSelected = selectedProducts.has(originalIndex);
                    return (
                      <div
                        key={originalIndex}
                        onClick={() => toggleProduct(originalIndex)}
                        className={`border-2 rounded-xl p-4 cursor-pointer transition-all ${isSelected ? "border-blue-500 bg-blue-50 dark:bg-blue-900/10" : "border-gray-200 dark:border-gray-700"}`}
                      >
                        {product.images?.[0] && (
                          <img
                            src={`/api/proxy-image?url=${encodeURIComponent(product.images[0])}`}
                            className="w-full h-40 object-cover rounded-lg mb-3"
                            alt=""
                          />
                        )}
                        <h3 className="font-bold mb-1">{product.name}</h3>
                        <p className="text-blue-600 font-bold">{product.price} ج.م</p>
                        <p className="text-xs text-gray-500 mt-1">الكمية: {product.stock}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="space-y-6">
            {/* Settings Card */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <Cog6ToothIcon className="h-6 w-6 text-blue-600" />
                </div>
                <h2 className="text-xl font-bold">إعدادات الربط</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">مفتاح الـ API</label>
                    <input
                      type="password"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      className="w-full px-4 py-2 border rounded-lg bg-gray-50 dark:bg-gray-700"
                    />
                  </div>
                  <button
                    onClick={saveSettings}
                    disabled={loading}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    {loading ? "جاري الحفظ..." : "حفظ الإعدادات"}
                  </button>
                </div>

                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <CheckCircleIcon className="h-5 w-5 text-green-500" />
                    حالة المزامنة التلقائية
                  </h3>
                  {settings ? (
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">آخر مزامنة ناجحة:</span>
                        <span className="font-medium">
                          {settings.lastSyncAt ? new Date(settings.lastSyncAt).toLocaleString("ar-EG") : "لم تتم بعد"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">حالة آخر عملية:</span>
                        <span className={`font-medium ${settings.lastSyncStatus === 'success' ? 'text-green-600' : 'text-red-500'}`}>
                          {settings.lastSyncStatus === 'success' ? 'ناجحة' : 'فاشلة'}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">لم يتم إعداد الربط بعد</p>
                  )}
                  <button
                    onClick={syncOrders}
                    disabled={syncing || !settings?.hasApiKey}
                    className="w-full mt-4 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center justify-center gap-2 transition-all shadow-md shadow-indigo-200 dark:shadow-none disabled:opacity-50"
                  >
                    {syncing ? (
                      <ArrowPathIcon className="h-5 w-5 animate-spin" />
                    ) : (
                      <ArrowPathIcon className="h-5 w-5" />
                    )}
                    مزامنة الطلبات الآن
                  </button>
                </div>
              </div>
            </div>

            {/* Logs Card */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700">
              <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                    <DocumentTextIcon className="h-6 w-6 text-orange-600" />
                  </div>
                  <h2 className="text-xl font-bold">سجلات المزامنة</h2>
                </div>
                <button
                  onClick={loadSyncLogs}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                >
                  <ArrowPathIcon className="h-5 w-5 text-gray-400" />
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-right text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 border-b border-gray-100 dark:border-gray-700">
                    <tr>
                      <th className="px-6 py-4 font-semibold">التوقيت</th>
                      <th className="px-6 py-4 font-semibold">الحالة</th>
                      <th className="px-6 py-4 font-semibold">العناصر</th>
                      <th className="px-6 py-4 font-semibold">المدة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                    {syncLogs.length > 0 ? (
                      syncLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            {new Date(log.startedAt).toLocaleString("ar-EG")}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${log.status === 'SUCCESS' ? 'bg-green-100 text-green-700' :
                                log.status === 'RUNNING' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'
                              }`}>
                              {log.status === 'SUCCESS' ? 'ناجحة' : log.status === 'RUNNING' ? 'جاري العمل' : 'فاشلة'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            {log.successCount} نجاح | {log.failedCount} فشل
                          </td>
                          <td className="px-6 py-4 text-gray-500">
                            {log.completedAt ? `${Math.floor((new Date(log.completedAt).getTime() - new Date(log.startedAt).getTime()) / 1000)} ثانية` : "-"}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="px-6 py-8 text-center text-gray-400">لا توجد سجلات حتى الآن</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EasyOrdersImport;
