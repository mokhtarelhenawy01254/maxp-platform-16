import React, { useState, useEffect, useMemo } from "react";
import { apiClient } from "../../services/apiClient";
import { useCurrency } from "../../hooks/useCurrency";
import { getCurrencyByCode } from "../../utils/currency";
import { toast } from "sonner";
import { tToast } from "../../utils/i18n-toast";
import {
  Zap,
  Search,
  RefreshCw,
  Check,
  AlertTriangle,
  Loader2,
  DollarSign,
  TrendingUp,
} from "lucide-react";

interface Product {
  id: string;
  name: string;
  sku: string;
  price: string | number;
  cost: string | number;
  basePrice: string | number;
  affiliateCommission: string | number | null;
  commissionType: string | null;
  platformMarginType: "FIXED" | "PERCENTAGE";
  platformMarginValue: number;
  category?: { name: string };
}

interface ApiSuccess<T> {
  success: boolean;
  data: T;
  message?: string;
}

const EDITABLE_PRICE_FIELDS = ["cost", "basePrice", "price"] as const;

const AffiliateQuickActions: React.FC = () => {
  const { currency } = useCurrency();
  const currencyInfo = getCurrencyByCode(currency || "EGP");
  const displayCurrency = currencyInfo?.symbol || "ج.م";

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [pendingChanges, setPendingChanges] = useState<{
    [key: string]: Partial<Product>;
  }>({});

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get<ApiSuccess<Product[]>>("/products");
      if (response?.data?.success && Array.isArray(response.data.data)) {
        setProducts(response.data.data);
      }
    } catch (error) {
      tToast.error("AffiliateQuickActions.error_error_d0bd");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (
    productId: string,
    field: keyof Product,
    value: any,
  ) => {
    setPendingChanges((prev) => {
      const currentProduct = products.find((p) => p.id === productId);
      if (!currentProduct) return prev;

      const updatedChanges = {
        ...(prev[productId] || {}),
        [field]: value,
      };

      if (field === "cost") {
        const cost = Number(value);
        let platMargin = 0;
        if (currentProduct.platformMarginType === "FIXED") {
          platMargin = currentProduct.platformMarginValue;
        } else {
          platMargin = (cost * currentProduct.platformMarginValue) / 100;
        }
        const newBasePrice = cost + platMargin;
        updatedChanges.basePrice = Number(newBasePrice.toFixed(2));
      }

      return {
        ...prev,
        [productId]: updatedChanges,
      };
    });
  };

  const handleBulkSave = async () => {
    const changesCount = Object.keys(pendingChanges).length;
    if (changesCount === 0) return;

    const updates: Array<{ id: string; payload: Partial<Product> }> = [];
    for (const [id, changes] of Object.entries(pendingChanges)) {
      const product = products.find((p) => p.id === id);
      if (!product) continue;

      const payload: Partial<Product> = {};

      for (const field of EDITABLE_PRICE_FIELDS) {
        if (changes[field] === undefined) continue;
        const parsed = Number(changes[field]);
        if (!Number.isFinite(parsed) || parsed < 0) {
          toast.error(`قيمة ${product.name} غير صالحة`);
          return;
        }
        payload[field] = Number(parsed.toFixed(2));
      }

      const nextCost = Number(payload.cost ?? product.cost);
      const nextBasePrice = Number(payload.basePrice ?? product.basePrice ?? product.price);
      const nextFinalPrice = Number(payload.price ?? product.price);

      if (
        !Number.isFinite(nextCost) ||
        !Number.isFinite(nextBasePrice) ||
        !Number.isFinite(nextFinalPrice)
      ) {
        toast.error(`أسعار ${product.name} غير مكتملة`);
        return;
      }

      if (nextBasePrice < nextCost) {
        toast.error(`تكلفة المسوق في ${product.name} لا يجب أن تقل عن سعر التاجر`);
        return;
      }

      if (nextFinalPrice < nextBasePrice) {
        toast.error(`السعر النهائي في ${product.name} لا يجب أن يقل عن تكلفة المسوق`);
        return;
      }

      updates.push({ id, payload });
    }

    try {
      setSaving(true);
      const updatePromises = updates.map(({ id, payload }) =>
        apiClient.patch<ApiSuccess<unknown>, Partial<Product>>(`/products/${id}`, payload),
      );

      await Promise.all(updatePromises);
      toast.success(`تم تحديث ${changesCount} منتج بنجاح`);
      setPendingChanges({});
      fetchProducts();
    } catch (error) {
      tToast.error("AffiliateQuickActions.error_error_8409");
    } finally {
      setSaving(false);
    }
  };

  const filteredProducts = useMemo(() => {
    const q = search.toLowerCase().trim();
    return products.filter(
      (p) =>
        p.name?.toLowerCase().includes(q) ||
        (p.sku && p.sku.toLowerCase().includes(q)),
    );
  }, [products, search]);

  const changesCount = Object.keys(pendingChanges).length;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-muted-foreground font-sans">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="text-xs">جاري تحميل جدول التسعير السريع...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-5 p-4 sm:p-6 font-sans text-foreground" dir="rtl">
      {/* Top Header */}
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-b border-border/70 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
              <Zap className="h-4 w-4" />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-foreground">
              إدارة التسعير الثلاثي وهوامش العمولات
            </h1>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            إدارة متزامنة لسعر التكلفة، هامش ربح المنصة، وعمولات شبكة المسوقين
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchProducts}
            className="inline-flex items-center justify-center h-8 w-8 rounded-md border border-border/70 bg-card text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            title="تحديث البيانات"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={handleBulkSave}
            disabled={changesCount === 0 || saving}
            className="inline-flex items-center justify-center gap-1.5 rounded-md bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors shadow-xs disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>جاري الحفظ...</span>
              </>
            ) : (
              <>
                <Check className="h-3.5 w-3.5" />
                <span>حفظ التعديلات {changesCount > 0 ? `(${changesCount})` : ""}</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Filter and Search Ribbon */}
      <div className="rounded-lg border border-border/70 bg-card p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="بحث باسم المنتج أو كود SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pr-8 pl-3 py-1.5 text-xs rounded-md border border-border/70 bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <div className="text-xs font-mono tabular-nums text-muted-foreground">
          المنتجات: <span className="font-semibold text-foreground">{filteredProducts.length}</span>
        </div>
      </div>

      {/* Single-Surface Table */}
      <div className="rounded-xl border border-border/70 bg-card overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border/60 text-right text-xs">
            <thead className="bg-muted/30">
              <tr>
                <th className="px-4 py-3 font-semibold uppercase tracking-wider text-muted-foreground">المنتج</th>
                <th className="px-4 py-3 font-semibold uppercase tracking-wider text-muted-foreground">سعر التاجر (التكلفة)</th>
                <th className="px-4 py-3 font-semibold uppercase tracking-wider text-muted-foreground">هامش المنصة</th>
                <th className="px-4 py-3 font-semibold uppercase tracking-wider text-muted-foreground">تكلفة المسوق</th>
                <th className="px-4 py-3 font-semibold uppercase tracking-wider text-muted-foreground">سعر البيع النهائي</th>
                <th className="px-4 py-3 font-semibold uppercase tracking-wider text-muted-foreground">عمولة المسوق</th>
                <th className="px-4 py-3 font-semibold uppercase tracking-wider text-muted-foreground text-center">التوزيع</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 bg-card font-mono tabular-nums">
              {filteredProducts.map((product) => {
                const changes = pendingChanges[product.id] || {};
                const currentCost = changes.cost !== undefined ? changes.cost : product.cost;
                const currentBasePrice =
                  changes.basePrice !== undefined ? changes.basePrice : product.basePrice || product.price;
                const currentFinalPrice = changes.price !== undefined ? changes.price : product.price;

                const platformProfit = Number(currentBasePrice) - Number(currentCost);
                const affiliateProfit = Number(currentFinalPrice) - Number(currentBasePrice);
                const isInvalid = platformProfit < 0 || affiliateProfit < 0;

                return (
                  <tr
                    key={product.id}
                    className={`hover:bg-muted/30 transition-colors ${isInvalid ? "bg-red-500/5" : ""}`}
                  >
                    <td className="px-4 py-3 font-sans whitespace-nowrap">
                      <div className="font-semibold text-foreground">{product.name}</div>
                      <div className="text-[10px] text-muted-foreground font-mono mt-0.5">{product.sku || "N/A"}</div>
                    </td>

                    {/* Cost input */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          value={currentCost || ""}
                          onChange={(e) => handleInputChange(product.id, "cost", e.target.value)}
                          className="w-20 px-2 py-1 rounded-md border border-border/70 bg-background text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                        <span className="text-[10px] text-muted-foreground font-sans">{displayCurrency}</span>
                      </div>
                    </td>

                    {/* Platform margin */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className={`font-semibold ${platformProfit < 0 ? "text-rose-600 dark:text-rose-400" : "text-blue-600 dark:text-blue-400"}`}>
                        +{platformProfit.toFixed(2)}
                        <span className="mr-1 text-[10px] text-muted-foreground font-sans">{displayCurrency}</span>
                      </div>
                      <div className="text-[10px] text-muted-foreground font-sans">
                        {product.platformMarginType === "FIXED" ? "مبلغ ثابت" : `${product.platformMarginValue}%`}
                      </div>
                    </td>

                    {/* Base price input */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          value={currentBasePrice || ""}
                          onChange={(e) => handleInputChange(product.id, "basePrice", e.target.value)}
                          className="w-20 px-2 py-1 rounded-md border border-primary/30 bg-primary/5 text-foreground text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                        <span className="text-[10px] text-muted-foreground font-sans">{displayCurrency}</span>
                      </div>
                    </td>

                    {/* Final price input */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          value={currentFinalPrice || ""}
                          onChange={(e) => handleInputChange(product.id, "price", e.target.value)}
                          className="w-20 px-2 py-1 rounded-md border border-border/70 bg-background text-foreground text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                        <span className="text-[10px] text-muted-foreground font-sans">{displayCurrency}</span>
                      </div>
                    </td>

                    {/* Affiliate profit */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className={`font-semibold ${affiliateProfit < 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                        +{affiliateProfit.toFixed(2)}
                        <span className="mr-1 text-[10px] text-muted-foreground font-sans">{displayCurrency}</span>
                      </div>
                      {affiliateProfit < 0 && (
                        <div className="text-[10px] text-rose-500 font-sans flex items-center gap-1 mt-0.5">
                          <AlertTriangle className="h-3 w-3" />
                          <span>خسارة مسوق</span>
                        </div>
                      )}
                    </td>

                    {/* Breakdown */}
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <div className="inline-flex flex-col text-[10px] text-muted-foreground space-y-0.5 min-w-[110px]">
                        <div className="flex justify-between">
                          <span className="font-sans">التاجر:</span> <span>{currentCost}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-sans">المنصة:</span> <span>{platformProfit.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-emerald-600 dark:text-emerald-400 border-t border-border/60 pt-0.5 font-bold">
                          <span className="font-sans">المسوق:</span> <span>{affiliateProfit.toFixed(2)}</span>
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredProducts.length === 0 && (
          <div className="py-16 text-center text-muted-foreground">
            <Search className="h-8 w-8 mx-auto mb-2 text-muted-foreground/60" />
            <p className="text-xs">لم يتم العثور على منتجات مطابقة لبحثك</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AffiliateQuickActions;
