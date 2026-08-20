import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  getAccountStatus,
  saveAccount,
  syncOrders,
  syncProducts,
  TikTokShopAccountStatus,
  TikTokShopOrder,
  TikTokShopProduct,
} from "../../services/tiktokShopService";

const inputClass =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500 dark:focus:border-blue-400 dark:focus:ring-blue-900/40";

const primaryButtonClass =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50";

const secondaryButtonClass =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700";

const labelClass =
  "mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300";

const getErrorMessage = (error: unknown): string => {
  const err = error as {
    response?: { data?: { error?: string | { message?: string } } };
  };
  const raw = err.response?.data?.error;
  if (typeof raw === "string") return raw;
  if (raw && typeof raw.message === "string") return raw.message;
  return "╪¡╪»╪½ ╪«╪╖╪ú ╪║┘è╪▒ ┘à╪¬┘ê┘é╪╣";
};

const formatDate = (value: string | null): string => {
  if (!value) return "ΓÇö";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("ar-EG");
};

const formatAmount = (value: number): string =>
  typeof value === "number" ? value.toFixed(2) : String(value ?? 0);

export default function TikTokShop() {
  const [account, setAccount] = useState<TikTokShopAccountStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncingOrders, setSyncingOrders] = useState(false);
  const [syncingProducts, setSyncingProducts] = useState(false);
  const [orders, setOrders] = useState<TikTokShopOrder[]>([]);
  const [products, setProducts] = useState<TikTokShopProduct[]>([]);
  const [form, setForm] = useState({
    shopId: "",
    appKey: "",
    appSecret: "",
    accessToken: "",
    shopName: "",
    region: "",
  });

  const loadAccountStatus = async () => {
    setLoading(true);
    try {
      const status = await getAccountStatus();
      setAccount(status);
      if (status.connected) {
        setForm((prev) => ({
          ...prev,
          shopId: status.shopId || prev.shopId,
          shopName: status.shopName || prev.shopName,
          region: status.region || prev.region,
        }));
      }
    } catch (error) {
      setAccount({ connected: false });
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccountStatus();
  }, []);

  const handleFormChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ): void => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleConnect = async (): Promise<void> => {
    if (!form.shopId || !form.appKey || !form.appSecret || !form.accessToken) {
      toast.error("┘è╪▒╪¼┘ë ╪Ñ╪»╪«╪º┘ä ┘à╪╣╪▒┘ü ╪º┘ä┘à╪¬╪¼╪▒ ┘ê App Key ┘ê App Secret ┘ê Access Token");
      return;
    }
    setSaving(true);
    try {
      const saved = await saveAccount(form);
      setAccount(saved);
      toast.success("╪¬┘à ╪▒╪¿╪╖ ╪¡╪│╪º╪¿ ┘à╪¬╪¼╪▒ TikTok Shop ╪¿┘å╪¼╪º╪¡");
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const handleDisconnect = (): void => {
    setForm({ shopId: "", appKey: "", appSecret: "", accessToken: "", shopName: "", region: "" });
    setAccount({ connected: false });
    setOrders([]);
    setProducts([]);
    toast.success("╪¬┘à ┘ü╪╡┘ä ╪º┘ä╪¡╪│╪º╪¿");
  };

  const handleSyncOrders = async (): Promise<void> => {
    setSyncingOrders(true);
    try {
      const result = await syncOrders();
      setOrders(result.data);
      toast.success(`╪¬┘à╪¬ ┘à╪▓╪º┘à┘å╪⌐ ${result.count} ╪╖┘ä╪¿ ╪¿┘å╪¼╪º╪¡`);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSyncingOrders(false);
    }
  };

  const handleSyncProducts = async (): Promise<void> => {
    setSyncingProducts(true);
    try {
      const result = await syncProducts();
      setProducts(result.data);
      toast.success(`╪¬┘à╪¬ ┘à╪▓╪º┘à┘å╪⌐ ${result.count} ┘à┘å╪¬╪¼ ╪¿┘å╪¼╪º╪¡`);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSyncingProducts(false);
    }
  };

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8 dark:bg-gray-900"
    >
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            ┘à╪¬╪¼╪▒ TikTok Shop
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            ╪▒╪¿╪╖ ╪¡╪│╪º╪¿ ┘à╪¬╪¼╪▒ TikTok Shop ┘ê┘à╪▓╪º┘à┘å╪⌐ ╪º┘ä╪╖┘ä╪¿╪º╪¬ ┘ê╪º┘ä┘à┘å╪¬╪¼╪º╪¬
          </p>
        </div>

        {/* Connect card */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
            {account?.connected ? "╪¡╪º┘ä╪⌐ ╪º┘ä╪▒╪¿╪╖" : "╪▒╪¿╪╖ ╪º┘ä┘à╪¬╪¼╪▒"}
          </h2>

          {loading ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              ╪¼╪º╪▒┘è ╪¬╪¡┘à┘è┘ä ╪¡╪º┘ä╪⌐ ╪º┘ä╪¡╪│╪º╪¿...
            </p>
          ) : account?.connected ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">╪º╪│┘à ╪º┘ä┘à╪¬╪¼╪▒</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {account.shopName || "ΓÇö"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">╪º┘ä┘à┘å╪╖┘é╪⌐</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {account.region || "ΓÇö"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">╪º┘ä╪¡╪º┘ä╪⌐</p>
                  <p className="text-sm font-medium text-green-600 dark:text-green-400">
                    {account.status === "connected" ? "┘à╪¬╪╡┘ä" : account.status || "ΓÇö"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">╪ó╪«╪▒ ┘à╪▓╪º┘à┘å╪⌐</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {formatDate(account.lastSyncedAt || null)}
                  </p>
                </div>
              </div>
              <button onClick={handleDisconnect} className={secondaryButtonClass}>
                ┘ü╪╡┘ä/╪Ñ╪╣╪º╪»╪⌐ ╪▒╪¿╪╖
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>┘à╪╣╪▒┘ü ╪º┘ä┘à╪¬╪¼╪▒</label>
                <input
                  name="shopId"
                  value={form.shopId}
                  onChange={handleFormChange}
                  placeholder="shop id"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>App Key</label>
                <input
                  name="appKey"
                  value={form.appKey}
                  onChange={handleFormChange}
                  placeholder="app key"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>App Secret</label>
                <input
                  name="appSecret"
                  type="password"
                  value={form.appSecret}
                  onChange={handleFormChange}
                  placeholder="app secret"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Access Token</label>
                <input
                  name="accessToken"
                  type="password"
                  value={form.accessToken}
                  onChange={handleFormChange}
                  placeholder="access token"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>╪º╪│┘à ╪º┘ä┘à╪¬╪¼╪▒</label>
                <input
                  name="shopName"
                  value={form.shopName}
                  onChange={handleFormChange}
                  placeholder="╪º╪│┘à ╪º┘ä┘à╪¬╪¼╪▒"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>╪º┘ä┘à┘å╪╖┘é╪⌐</label>
                <input
                  name="region"
                  value={form.region}
                  onChange={handleFormChange}
                  placeholder="┘à╪½╪º┘ä: AE ╪ú┘ê US"
                  className={inputClass}
                />
              </div>
              <div className="sm:col-span-2">
                <button
                  onClick={handleConnect}
                  disabled={saving}
                  className={primaryButtonClass}
                >
                  {saving ? "╪¼╪º╪▒┘è ╪º┘ä╪¡┘ü╪╕..." : "╪¡┘ü╪╕ ┘ê╪▒╪¿╪╖"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Sync actions */}
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleSyncOrders}
            disabled={syncingOrders || !account?.connected}
            className={primaryButtonClass}
          >
            {syncingOrders ? "╪¼╪º╪▒┘è ╪º┘ä┘à╪▓╪º┘à┘å╪⌐..." : "┘à╪▓╪º┘à┘å╪⌐ ╪º┘ä╪╖┘ä╪¿╪º╪¬"}
          </button>
          <button
            onClick={handleSyncProducts}
            disabled={syncingProducts || !account?.connected}
            className={primaryButtonClass}
          >
            {syncingProducts ? "╪¼╪º╪▒┘è ╪º┘ä┘à╪▓╪º┘à┘å╪⌐..." : "┘à╪▓╪º┘à┘å╪⌐ ╪º┘ä┘à┘å╪¬╪¼╪º╪¬"}
          </button>
        </div>

        {/* Orders table */}
        {orders.length > 0 && (
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                ╪º┘ä╪╖┘ä╪¿╪º╪¬
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500 dark:bg-gray-700/50 dark:text-gray-400">
                  <tr>
                    <th className="px-6 py-3 text-right font-medium">┘à╪╣╪▒┘ü ╪º┘ä╪╖┘ä╪¿</th>
                    <th className="px-6 py-3 text-right font-medium">╪º┘ä╪¡╪º┘ä╪⌐</th>
                    <th className="px-6 py-3 text-right font-medium">╪º┘ä┘à╪┤╪¬╪▒┘è</th>
                    <th className="px-6 py-3 text-right font-medium">╪º┘ä╪Ñ╪¼┘à╪º┘ä┘è</th>
                    <th className="px-6 py-3 text-right font-medium">╪º┘ä╪╣┘à┘ä╪⌐</th>
                    <th className="px-6 py-3 text-right font-medium">╪º┘ä╪¬╪º╪▒┘è╪«</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {orders.map((order) => (
                    <tr key={order.orderId} className="hover:bg-gray-50 dark:hover:bg-gray-700/40">
                      <td className="px-6 py-3 text-gray-900 dark:text-gray-100">{order.orderId}</td>
                      <td className="px-6 py-3 text-gray-900 dark:text-gray-100">{order.status}</td>
                      <td className="px-6 py-3 text-gray-900 dark:text-gray-100">
                        {order.buyerName || order.buyerUsername || "ΓÇö"}
                      </td>
                      <td className="px-6 py-3 text-gray-900 dark:text-gray-100">
                        {formatAmount(order.totalAmount)}
                      </td>
                      <td className="px-6 py-3 text-gray-900 dark:text-gray-100">{order.currency}</td>
                      <td className="px-6 py-3 text-gray-900 dark:text-gray-100">
                        {formatDate(order.createTime)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Products table */}
        {products.length > 0 && (
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                ╪º┘ä┘à┘å╪¬╪¼╪º╪¬
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500 dark:bg-gray-700/50 dark:text-gray-400">
                  <tr>
                    <th className="px-6 py-3 text-right font-medium">╪º┘ä┘à╪╣╪▒┘ü</th>
                    <th className="px-6 py-3 text-right font-medium">╪º┘ä╪º╪│┘à</th>
                    <th className="px-6 py-3 text-right font-medium">╪º┘ä╪¡╪º┘ä╪⌐</th>
                    <th className="px-6 py-3 text-right font-medium">╪╣╪»╪» ╪º┘ä┘Ç SKU</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {products.map((product) => (
                    <tr key={product.productId} className="hover:bg-gray-50 dark:hover:bg-gray-700/40">
                      <td className="px-6 py-3 text-gray-900 dark:text-gray-100">{product.productId}</td>
                      <td className="px-6 py-3 text-gray-900 dark:text-gray-100">{product.title}</td>
                      <td className="px-6 py-3 text-gray-900 dark:text-gray-100">{product.status}</td>
                      <td className="px-6 py-3 text-gray-900 dark:text-gray-100">{product.skuCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
