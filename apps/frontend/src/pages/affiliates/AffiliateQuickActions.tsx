import { DollarSign as CurrencyDollarIcon, Search as MagnifyingGlassIcon, RefreshCw as ArrowPathIcon, Check as CheckCircleIcon, AlertTriangle as ExclamationTriangleIcon, Zap as BoltIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import React, { useState, useEffect } from "react";
import { apiClient } from "../../services/apiClient";
import { useTheme } from "../../hooks/useTheme";
import { useCurrency } from "../../hooks/useCurrency";
import { getCurrencyByCode } from "../../utils/currency";
import { toast } from "sonner";
;

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
  const { actualTheme } = useTheme();
  const { t } = useTranslation();
  const { currency } = useCurrency();
  const isDark = actualTheme === "dark";

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
      if (response.data.success) {
        setProducts(response.data.data);
      }
    } catch (error) {
      toast.error("حدث خطأ أثناء تحميل المنتجات");
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

      // أتمتة حساب السعر الأساسي للمسوق عند تغيير سعر التاجر (cost)
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
      const updatePromises = updates.map(
        ({ id, payload }) =>
          apiClient.patch<ApiSuccess<unknown>, Partial<Product>>(
            `/products/${id}`,
            payload,
          ),
      );

      await Promise.all(updatePromises);
      toast.success(`تم تحديث ${changesCount} منتج بنجاح!`);
      setPendingChanges({});
      fetchProducts();
    } catch (error) {
      toast.error("حدث خطأ أثناء حفظ التعديلات");
    } finally {
      setSaving(false);
    }
  };

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.sku && p.sku.toLowerCase().includes(search.toLowerCase())),
  );

  return (
    <div
      className={`p-6 min-h-screen ${isDark ? "bg-gray-900 text-white" : "bg-gray-50 text-gray-900"}`}
    >
      <div className="w-full">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2 text-indigo-500">
              <BoltIcon className="h-8 w-8" />
              الأكشن السريع: إدارة التسعير الثلاثي 🇪🇬
            </h1>
            <p className={`mt-1 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
              إدارة أسعار التجار (التكلفة)، ربح المنصة، وعمولات المسوقين في مكان
              واحد.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchProducts}
              className={`p-2 rounded-lg border ${isDark ? "border-gray-700 hover:bg-gray-800" : "border-gray-300 hover:bg-gray-100"}`}
              title="تحديث البيانات"
            >
              <ArrowPathIcon
                className={`h-5 w-5 ${loading ? "animate-spin" : ""}`}
              />
            </button>
            <button
              onClick={handleBulkSave}
              disabled={Object.keys(pendingChanges).length === 0 || saving}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-semibold shadow-lg shadow-indigo-500/20"
            >
              {saving
                ? "جاري الحفظ..."
                : `حفظ التغييرات (${Object.keys(pendingChanges).length})`}
              {!saving && <CheckCircleIcon className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className={`mb-6 relative`}>
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="ابحث باسم المنتج أو الـ SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`w-full pl-10 pr-4 py-3 rounded-xl border ${
              isDark
                ? "bg-gray-800 border-gray-700 focus:border-indigo-500"
                : "bg-white border-gray-300 focus:border-indigo-500"
            } outline-none transition-all shadow-sm`}
          />
        </div>

        {/* Triple Profit Table */}
        <div
          className={`overflow-x-auto rounded-xl border ${isDark ? "border-gray-700" : "border-gray-200"} shadow-sm`}
        >
          <table className="w-full text-right border-collapse">
            <thead
              className={`${isDark ? "bg-gray-800 text-gray-400" : "bg-gray-100 text-gray-600"}`}
            >
              <tr>
                <th className="px-4 py-4 font-semibold text-sm">المنتج</th>
                <th className="px-4 py-4 font-semibold text-sm">
                  سعر التاجر 🏗️
                </th>
                <th className="px-4 py-4 font-semibold text-sm">
                  ربح المنصة 🏢
                </th>
                <th className="px-4 py-4 font-semibold text-sm">
                  تكلفة المسوق 👤
                </th>
                <th className="px-4 py-4 font-semibold text-sm">
                  السعر النهائي 🏷️
                </th>
                <th className="px-4 py-4 font-semibold text-sm">ربح المسوق</th>
                <th className="px-4 py-4 font-semibold text-sm">
                  إجمالي التوزيع
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredProducts.map((product) => {
                const changes = pendingChanges[product.id] || {};
                const currentCost =
                  changes.cost !== undefined ? changes.cost : product.cost;
                const currentBasePrice =
                  changes.basePrice !== undefined
                    ? changes.basePrice
                    : product.basePrice || product.price;
                const currentFinalPrice =
                  changes.price !== undefined ? changes.price : product.price;

                // حساب ربح المنصة الفعلي المعروض
                const platformProfit =
                  Number(currentBasePrice) - Number(currentCost);
                // حساب ربح المسوق الفعلي
                const affiliateProfit =
                  Number(currentFinalPrice) - Number(currentBasePrice);

                const isInvalid = platformProfit < 0 || affiliateProfit < 0;

                return (
                  <tr
                    key={product.id}
                    className={`${isDark ? "hover:bg-gray-800/50" : "hover:bg-gray-50"} transition-colors ${isInvalid ? "bg-red-50 dark:bg-red-900/10" : ""}`}
                  >
                    <td className="px-4 py-4">
                      <div className="font-medium text-sm">{product.name}</div>
                      <div className="text-xs text-gray-500 font-mono mt-0.5">
                        {product.sku || "N/A"}
                      </div>
                    </td>

                    {/* سعر التاجر - قابل للتعديل */}
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={currentCost || ""}
                          onChange={(e) =>
                            handleInputChange(
                              product.id,
                              "cost",
                              e.target.value,
                            )
                          }
                          className={`w-24 px-2 py-1.5 rounded-lg border text-sm font-mono ${
                            isDark
                              ? "bg-gray-800 border-gray-700"
                              : "bg-white border-gray-300"
                          }`}
                        />
                        <span className="text-[10px] text-gray-500">
                          {displayCurrency}
                        </span>
                      </div>
                    </td>

                    {/* ربح المنصة - عرض فقط (يتأثر بسعر التاجر تلقائياً) */}
                    <td className="px-4 py-4">
                      <div
                        className={`text-sm font-medium ${platformProfit < 0 ? "text-red-500" : "text-blue-500"}`}
                      >
                        +{platformProfit.toFixed(2)}
                        <span className="mr-1 text-[10px] text-gray-500">
                          {displayCurrency}
                        </span>
                      </div>
                      <div className="text-[9px] text-gray-400">
                        {product.platformMarginType === "FIXED"
                          ? "ثابت"
                          : `${product.platformMarginValue}%`}
                      </div>
                    </td>

                    {/* تكلفة المسوق (Base Price) - قابل للتعديل كاستثناء */}
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={currentBasePrice || ""}
                          onChange={(e) =>
                            handleInputChange(
                              product.id,
                              "basePrice",
                              e.target.value,
                            )
                          }
                          className={`w-24 px-2 py-1.5 rounded-lg border text-sm font-mono font-bold ${
                            isDark
                              ? "bg-blue-900/20 border-blue-700"
                              : "bg-blue-50 border-blue-200 text-blue-800"
                          }`}
                        />
                        <span className="text-[10px] text-gray-500">
                          {displayCurrency}
                        </span>
                      </div>
                    </td>

                    {/* السعر النهائي للجمهور - قابل للتعديل */}
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={currentFinalPrice || ""}
                          onChange={(e) =>
                            handleInputChange(
                              product.id,
                              "price",
                              e.target.value,
                            )
                          }
                          className={`w-24 px-2 py-1.5 rounded-lg border text-sm font-mono ${
                            isDark
                              ? "bg-gray-800 border-gray-700 text-indigo-400"
                              : "bg-white border-gray-300 text-indigo-600 font-bold"
                          }`}
                        />
                        <span className="text-[10px] text-gray-500">
                          {displayCurrency}
                        </span>
                      </div>
                    </td>

                    {/* ربح المسوق - عرض فقط */}
                    <td className="px-4 py-4">
                      <div
                        className={`text-sm font-bold ${affiliateProfit < 0 ? "text-red-500" : "text-green-500"}`}
                      >
                        {affiliateProfit.toFixed(2)}
                        <span className="mr-1 text-[10px] text-gray-500">
                          {displayCurrency}
                        </span>
                      </div>
                      {affiliateProfit < 0 && (
                        <div className="text-[9px] text-red-400 flex items-center gap-1">
                          <ExclamationTriangleIcon className="h-2 w-2" />
                          خسارة مسوق
                        </div>
                      )}
                    </td>

                    {/* الإجمالي */}
                    <td className="px-4 py-4">
                      <div className="flex flex-col text-[10px] text-gray-500">
                        <span className="flex justify-between">
                          التاجر: <span>{currentCost}</span>
                        </span>
                        <span className="flex justify-between">
                          المنصة: <span>{platformProfit.toFixed(2)}</span>
                        </span>
                        <span className="flex justify-between border-t border-gray-700/20 mt-1 pt-1 font-bold">
                          المنتج: <span>{currentBasePrice}</span>
                        </span>
                        <span className="flex justify-between text-green-500">
                          المسوق: <span>{affiliateProfit.toFixed(2)}</span>
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredProducts.length === 0 && !loading && (
          <div className="text-center py-20">
            <MagnifyingGlassIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">
              لم يتم العثور على منتجات تطابق بحثك.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AffiliateQuickActions;
