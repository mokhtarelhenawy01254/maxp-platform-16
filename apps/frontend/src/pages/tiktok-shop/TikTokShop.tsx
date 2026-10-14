import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  RefreshCw,
  Package,
  Link2,
  Store,
} from "lucide-react";
import {
  getAccountStatus,
  saveAccount,
  syncOrders,
  syncProducts,
  TikTokShopAccountStatus,
  TikTokShopOrder,
  TikTokShopProduct,
} from "../../services/tiktokShopService";
import TikTokShopTables from "./TikTokShopTables";

const inputClass =
  "w-full rounded-md border border-border/80 bg-background px-3 py-1.5 text-xs text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary";

const labelClass =
  "mb-1 block text-xs font-medium text-foreground";

const getErrorMessage = (error: unknown): string => {
  const err = error as {
    response?: { data?: { error?: string | { message?: string } } };
  };
  const raw = err.response?.data?.error;
  if (typeof raw === "string") return raw;
  if (raw && typeof raw.message === "string") return raw.message;
  return "حدث خطأ غير متوقع";
};

const formatDate = (value: string | null): string => {
  if (!value) return "—";
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
      toast.error("يرجى إدخال معرف المتجر و App Key و App Secret و Access Token");
      return;
    }
    setSaving(true);
    try {
      const saved = await saveAccount(form);
      setAccount(saved);
      toast.success("تم ربط حساب متجر TikTok Shop بنجاح");
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
    toast.success("تم فصل الحساب");
  };

  const handleSyncOrders = async (): Promise<void> => {
    setSyncingOrders(true);
    try {
      const result = await syncOrders();
      setOrders(result.data);
      toast.success(`تمت مزامنة ${result.count} طلب بنجاح`);
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
      toast.success(`تمت مزامنة ${result.count} منتج بنجاح`);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSyncingProducts(false);
    }
  };

  return (
    <div dir="rtl" className="min-h-screen bg-card text-foreground font-sans rtl">
      {/* Telemetry Status Ribbon */}
      <div className="border-b border-border/70 bg-muted/20 px-4 sm:px-6 py-2">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-muted-foreground font-medium">
              <span className={`inline-block w-2 h-2 rounded-full ${account?.connected ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
              {account?.connected ? "متصل بـ TikTok Shop API" : "بانتظار التهيئة والربط"}
            </span>
            <span className="text-border">|</span>
            <span className="text-muted-foreground font-mono">
              REGION: {account?.region || "GLOBAL"}
            </span>
          </div>
          <div className="flex items-center gap-4 font-mono tabular-nums text-muted-foreground">
            <span>الطلبات المستوردة: <strong className="text-foreground">{orders.length}</strong></span>
            <span className="text-border">|</span>
            <span>المنتجات المتزامنة: <strong className="text-foreground">{products.length}</strong></span>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6 lg:p-8">
        {/* Top Control Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/70">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-muted/40 text-foreground border border-border/70">
                <Store className="w-3.5 h-3.5 text-muted-foreground" />
                تكامل التجارة الاجتماعية
              </span>
              <span className="text-[11px] text-muted-foreground font-mono">
                tiktok.shop.v2
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">
              متجر TikTok Shop
            </h1>
            <p className="text-xs text-muted-foreground">
              ربط حساب البائع في تيك توك ومزامنة المنتجات والطلبات والمخزون لحظياً
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSyncOrders}
              disabled={syncingOrders || !account?.connected}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-muted/50 text-foreground hover:bg-muted/80 border border-border/70 text-xs font-medium transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-muted-foreground ${syncingOrders ? "animate-spin" : ""}`} />
              {syncingOrders ? "جاري المزامنة..." : "مزامنة الطلبات"}
            </button>
            <button
              onClick={handleSyncProducts}
              disabled={syncingProducts || !account?.connected}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-medium transition-colors disabled:opacity-50"
            >
              <Package className="w-3.5 h-3.5" />
              {syncingProducts ? "جاري المزامنة..." : "مزامنة المنتجات"}
            </button>
          </div>
        </div>

        {/* Connect card */}
        <div className="rounded-lg border border-border/70 bg-card p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-border/70 pb-3">
            <div className="flex items-center gap-2">
              <Link2 className="w-4 h-4 text-primary" />
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {account?.connected ? "تفاصيل الاتصال النشط" : "تهيئة بيانات الربط البرمجي"}
              </h2>
            </div>
            {account?.connected && (
              <button
                onClick={handleDisconnect}
                className="text-xs font-medium text-muted-foreground hover:text-red-500 transition-colors"
              >
                فصل وإعادة التهيئة
              </button>
            )}
          </div>

          {loading ? (
            <p className="text-xs text-muted-foreground font-mono py-2">
              جاري فحص حالة الحساب...
            </p>
          ) : account?.connected ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
              <div className="p-3 bg-muted/10 border border-border/60 rounded-md">
                <p className="text-[11px] text-muted-foreground">اسم المتجر</p>
                <p className="text-xs font-semibold text-foreground mt-0.5">
                  {account.shopName || "—"}
                </p>
              </div>
              <div className="p-3 bg-muted/10 border border-border/60 rounded-md">
                <p className="text-[11px] text-muted-foreground">المنطقة الجغرافية</p>
                <p className="text-xs font-semibold font-mono text-foreground mt-0.5">
                  {account.region || "—"}
                </p>
              </div>
              <div className="p-3 bg-muted/10 border border-border/60 rounded-md">
                <p className="text-[11px] text-muted-foreground">حالة الاتصال</p>
                <p className="text-xs font-semibold text-emerald-500 mt-0.5">
                  {account.status === "connected" ? "متصل ونشط" : account.status || "—"}
                </p>
              </div>
              <div className="p-3 bg-muted/10 border border-border/60 rounded-md">
                <p className="text-[11px] text-muted-foreground">آخر مزامنة ناجحة</p>
                <p className="text-xs font-semibold font-mono tabular-nums text-foreground mt-0.5">
                  {formatDate(account.lastSyncedAt || null)}
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className={labelClass}>معرف المتجر (Shop ID)</label>
                <input
                  name="shopId"
                  value={form.shopId}
                  onChange={handleFormChange}
                  placeholder="e.g. 7492109841"
                  className={`${inputClass} font-mono`}
                />
              </div>
              <div>
                <label className={labelClass}>App Key</label>
                <input
                  name="appKey"
                  value={form.appKey}
                  onChange={handleFormChange}
                  placeholder="App Key"
                  className={`${inputClass} font-mono`}
                />
              </div>
              <div>
                <label className={labelClass}>App Secret</label>
                <input
                  name="appSecret"
                  type="password"
                  value={form.appSecret}
                  onChange={handleFormChange}
                  placeholder="••••••••••••"
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
                  placeholder="Bearer token"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>اسم المتجر (Shop Name)</label>
                <input
                  name="shopName"
                  value={form.shopName}
                  onChange={handleFormChange}
                  placeholder="MaxP Store"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>المنطقة (Region)</label>
                <input
                  name="region"
                  value={form.region}
                  onChange={handleFormChange}
                  placeholder="مثال: AE أو EG أو US"
                  className={`${inputClass} font-mono`}
                />
              </div>
              <div className="sm:col-span-3 pt-2">
                <button
                  onClick={handleConnect}
                  disabled={saving}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2 text-xs font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  {saving ? "جاري الحفظ والتحقق..." : "حفظ وربط المتجر"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Orders and Products Data Tables */}
        <TikTokShopTables
          orders={orders}
          products={products}
          formatDate={formatDate}
          formatAmount={formatAmount}
        />
      </div>
    </div>
  );
}
