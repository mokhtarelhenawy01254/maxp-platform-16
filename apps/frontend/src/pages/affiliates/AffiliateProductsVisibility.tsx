import React, { useState, useEffect, useCallback } from "react";
import { apiClient } from "../../services/apiClient";
import { useCurrency } from "../../hooks/useCurrency";
import { useTheme } from "../../hooks/useTheme";
import {
  EyeIcon,
  EyeSlashIcon,
  MagnifyingGlassIcon,
  CheckIcon,
  XMarkIcon,
  AdjustmentsHorizontalIcon,
  ShoppingBagIcon,
} from "@heroicons/react/24/outline";
import { toast } from "sonner";
import { tToast } from "../../utils/i18n-toast";

type VisibilityMode = "ALL" | "HIDDEN" | "SELECTED";

interface Product {
  id: string;
  name: string;
  price: number;
  images: string;
  slug?: string | null;
  isActive: boolean;
  allowAffiliateMarkup: boolean;
  affiliateVisibility: VisibilityMode | null;
  affiliateVisibleAffiliateIds: string | null;
}

interface Affiliate {
  id: string;
  user?: { firstName: string; lastName: string };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface ApiListResponse {
  success: boolean;
  data: Product[];
  pagination: Pagination;
}

interface ApiAffiliatesResponse {
  success: boolean;
  data: Affiliate[];
}

const normalizeImage = (images: string | string[] | null | undefined): string => {
  if (!images) return "/placeholder-product.png";
  if (Array.isArray(images)) return images[0] || "/placeholder-product.png";
  try {
    const parsed = JSON.parse(images);
    if (Array.isArray(parsed)) return parsed[0] || "/placeholder-product.png";
    return String(parsed);
  } catch {
    return images;
  }
};

const parseAffiliateIds = (raw: string | null): string[] => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const AffiliatePicker: React.FC<{
  selected: string[];
  onChange: (ids: string[]) => void;
  onClose: () => void;
}> = ({ selected, onChange, onClose }) => {
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [loading, setLoading] = useState(true);
  const [localSelected, setLocalSelected] = useState<Set<string>>(new Set(selected));

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await apiClient.get<ApiAffiliatesResponse>("/affiliates/list");
        if (res.data.success) {
          setAffiliates(res.data.data);
        }
      } catch {
        tToast.error("affiliates_AffiliateProductsVisibility.failed_load_20b1");
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const toggle = (id: string) => {
    setLocalSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="font-bold text-lg dark:text-white">اختيار المسوقين</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
            <XMarkIcon className="h-5 w-5 dark:text-gray-400" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {loading ? (
            <div className="text-center py-8 text-gray-500">جاري التحميل...</div>
          ) : affiliates.length === 0 ? (
            <div className="text-center py-8 text-gray-500">لا يوجد مسوقون نشطون</div>
          ) : (
            affiliates.map((a) => {
              const name = a.user
                ? `${a.user.firstName} ${a.user.lastName}`
                : a.id;
              return (
                <label
                  key={a.id}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={localSelected.has(a.id)}
                    onChange={() => toggle(a.id)}
                    className="h-5 w-5 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                  />
                  <span className="text-sm dark:text-gray-200">{name}</span>
                </label>
              );
            })
          )}
        </div>
        <div className="flex gap-3 p-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={() => { setLocalSelected(new Set()); onChange([]); onClose(); }}
            className="flex-1 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-600 text-sm font-medium dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            إلغاء التحديد
          </button>
          <button
            onClick={() => { onChange(Array.from(localSelected)); onClose(); }}
            className="flex-1 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700"
          >
            تطبيق ({localSelected.size})
          </button>
        </div>
      </div>
    </div>
  );
};

const AffiliateProductsVisibility: React.FC = () => {
  const { formatPrice } = useCurrency();
  const { actualTheme } = useTheme();
  const isDark = actualTheme === "dark";

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [savingId, setSavingId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [pickerProductId, setPickerProductId] = useState<string | null>(null);

  const limit = 20;

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const url = `/products?limit=${limit}&page=${page}${search ? `&search=${encodeURIComponent(search)}` : ""}`;
      const res = await apiClient.get<ApiListResponse>(url);
      if (res.data.success) {
        setProducts(res.data.data);
        setTotalPages(res.data.pagination.totalPages);
        setTotal(res.data.pagination.total);
      }
    } catch {
      tToast.error("affiliates_AffiliateProductsVisibility.failed_load_e3ee");
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const handleSingleUpdate = async (productId: string, data: Record<string, unknown>) => {
    setSavingId(productId);
    try {
      const res = await apiClient.patch("/products/bulk/affiliate-visibility", {
        productIds: [productId],
        ...data,
      });
      if (res.data.success) {
        fetchProducts();
      }
    } catch {
      tToast.error("affiliates_AffiliateProductsVisibility.msg_d8af");
    } finally {
      setSavingId(null);
    }
  };

  const handleBulkUpdate = async (data: Record<string, unknown>) => {
    if (selectedIds.size === 0) return;
    try {
      const res = await apiClient.patch("/products/bulk/affiliate-visibility", {
        productIds: Array.from(selectedIds),
        ...data,
      });
      if (res.data.success) {
        toast.success(`تم تحديث ${res.data.data.count} منتج`);
        setSelectedIds(new Set());
        fetchProducts();
      }
    } catch {
      tToast.error("affiliates_AffiliateProductsVisibility.msg_eddc");
    }
  };

  const toggleMarkup = (product: Product) => {
    handleSingleUpdate(product.id, {
      allowAffiliateMarkup: !product.allowAffiliateMarkup,
    });
  };

  const toggleVisibility = (product: Product, mode: VisibilityMode) => {
    handleSingleUpdate(product.id, {
      affiliateVisibility: mode,
      affiliateVisibleAffiliateIds:
        mode === "SELECTED" ? product.affiliateVisibleAffiliateIds : null,
    });
  };

  const handleAffiliatePickerSave = async (productId: string, ids: string[]) => {
    if (ids.length === 0) {
      handleSingleUpdate(productId, {
        affiliateVisibility: "ALL",
        affiliateVisibleAffiliateIds: null,
      });
    } else {
      handleSingleUpdate(productId, {
        affiliateVisibility: "SELECTED",
        affiliateVisibleAffiliateIds: ids,
      });
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === products.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(products.map((p) => p.id)));
    }
  };

  const stats = {
    total,
    markupEnabled: products.filter((p) => p.allowAffiliateMarkup).length,
    hidden: products.filter((p) => p.affiliateVisibility === "HIDDEN").length,
  };

  return (
    <div className={`min-h-screen ${isDark ? "bg-gray-900" : "bg-gray-50"} p-6`}>
      <div className="w-full space-y-6">
        {/* Header */}
        <div>
          <h1 className={`text-2xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
            إدارة ظهور المنتجات للمسوقين
          </h1>
          <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"} mt-1`}>
            تحكم في المنتجات التي تظهر للمسوقين، هامش الربح، وظهور المنتجات لمجموعات محددة
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "إجمالي المنتجات", value: stats.total, color: "bg-blue-500" },
            { label: "مفعل لها Markup", value: stats.markupEnabled, color: "bg-emerald-500" },
            { label: "مخفية عن المسوقين", value: stats.hidden, color: "bg-red-500" },
          ].map((stat) => (
            <div
              key={stat.label}
              className={`rounded-2xl border p-4 ${isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-100"} shadow-sm`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 ${stat.color} rounded-xl flex items-center justify-center`}>
                  <ShoppingBagIcon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>{stat.label}</p>
                  <p className={`text-xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>{stat.value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Search + Filter */}
        <div className="flex gap-4 items-center">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="ابحث عن منتج..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`w-full pr-10 pl-4 py-3 rounded-xl border ${isDark ? "bg-gray-800 border-gray-700 text-white" : "bg-white border-gray-100 text-gray-900"} outline-none focus:ring-2 focus:ring-indigo-500`}
            />
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
          </div>
        )}

        {/* Bulk Bar */}
        {!loading && selectedIds.size > 0 && (
          <div
            className={`rounded-2xl border p-4 shadow-md backdrop-blur-sm flex items-center justify-between flex-wrap gap-3 ${
              isDark
                ? "bg-indigo-900/30 border-indigo-700/50"
                : "bg-indigo-50/80 border-indigo-200"
            }`}
          >
            <span className={`text-sm font-medium ${isDark ? "text-indigo-200" : "text-indigo-800"}`}>
              تم تحديد {selectedIds.size} منتج
            </span>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => handleBulkUpdate({ allowAffiliateMarkup: true })}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700"
              >
                <CheckIcon className="h-4 w-4" /> تفعيل Markup
              </button>
              <button
                onClick={() => handleBulkUpdate({ allowAffiliateMarkup: false })}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-600 text-white text-xs font-bold hover:bg-gray-700"
              >
                <XMarkIcon className="h-4 w-4" /> إيقاف Markup
              </button>
              <button
                onClick={() => handleBulkUpdate({ affiliateVisibility: "ALL" })}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700"
              >
                <EyeIcon className="h-4 w-4" /> إظهار للكل
              </button>
              <button
                onClick={() => handleBulkUpdate({ affiliateVisibility: "HIDDEN" })}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-bold hover:bg-red-700"
              >
                <EyeSlashIcon className="h-4 w-4" /> إخفاء عن المسوقين
              </button>
              <button
                onClick={() => setSelectedIds(new Set())}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold border ${
                  isDark
                    ? "border-gray-600 text-gray-300 hover:bg-gray-700"
                    : "border-gray-200 text-gray-700 hover:bg-gray-50"
                }`}
              >
                <XMarkIcon className="h-4 w-4" /> إلغاء
              </button>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && products.length === 0 && (
          <div className="text-center py-20">
            <ShoppingBagIcon className={`h-16 w-16 mx-auto mb-4 ${isDark ? "text-gray-700" : "text-gray-300"}`} />
            <p className={`text-lg ${isDark ? "text-gray-400" : "text-gray-500"}`}>
              {search ? "لا توجد منتجات مطابقة للبحث" : "لا توجد منتجات بعد"}
            </p>
          </div>
        )}

        {/* Table */}
        {!loading && products.length > 0 && (
          <div className={`rounded-2xl border overflow-hidden ${isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-100"} shadow-sm`}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className={isDark ? "bg-gray-900" : "bg-gray-50"}>
                  <tr>
                    <th className="p-3 text-right">
                      <input
                        type="checkbox"
                        checked={selectedIds.size === products.length && products.length > 0}
                        onChange={toggleSelectAll}
                        className="h-4 w-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                      />
                    </th>
                    <th className={`p-3 text-right font-medium ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                      المنتج
                    </th>
                    <th className={`p-3 text-right font-medium ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                      السعر
                    </th>
                    <th className={`p-3 text-center font-medium ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                      Markup
                    </th>
                    <th className={`p-3 text-center font-medium ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                      الظهور للمسوقين
                    </th>
                    <th className={`p-3 text-center font-medium ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                      مسوقين محددين
                    </th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDark ? "divide-gray-700" : "divide-gray-100"}`}>
                  {products.map((product) => {
                    const isSaving = savingId === product.id;
                    const visibleIds = parseAffiliateIds(product.affiliateVisibleAffiliateIds);
                    return (
                      <tr
                        key={product.id}
                        className={`${isDark ? "hover:bg-gray-700/50" : "hover:bg-gray-50"} transition-colors ${
                          selectedIds.has(product.id)
                            ? isDark
                              ? "bg-indigo-900/20"
                              : "bg-indigo-50/50"
                            : ""
                        }`}
                      >
                        <td className="p-3">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(product.id)}
                            onChange={() => toggleSelect(product.id)}
                            className="h-4 w-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                          />
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-3">
                            <img
                              src={normalizeImage(product.images)}
                              alt={product.name}
                              className="w-10 h-10 rounded-lg object-cover bg-gray-100"
                            />
                            <span className={`font-medium truncate max-w-[200px] ${isDark ? "text-white" : "text-gray-900"}`}>
                              {product.name}
                            </span>
                          </div>
                        </td>
                        <td className={`p-3 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                          {formatPrice(product.price)}
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => toggleMarkup(product)}
                            disabled={isSaving}
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                              product.allowAffiliateMarkup
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300"
                                : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
                            }`}
                          >
                            {product.allowAffiliateMarkup ? (
                              <CheckIcon className="h-3.5 w-3.5" />
                            ) : (
                              <XMarkIcon className="h-3.5 w-3.5" />
                            )}
                            {product.allowAffiliateMarkup ? "مفعل" : "متوقف"}
                          </button>
                        </td>
                        <td className="p-3 text-center">
                          <select
                            value={product.affiliateVisibility || "ALL"}
                            onChange={(e) =>
                              toggleVisibility(product, e.target.value as VisibilityMode)
                            }
                            disabled={isSaving}
                            className={`text-xs rounded-lg border px-2 py-1 outline-none ${
                              isDark
                                ? "bg-gray-700 border-gray-600 text-gray-200"
                                : "bg-white border-gray-200 text-gray-700"
                            }`}
                          >
                            <option value="ALL">الكل</option>
                            <option value="HIDDEN">مخفي</option>
                            <option value="SELECTED">محدد</option>
                          </select>
                        </td>
                        <td className="p-3 text-center">
                          {product.affiliateVisibility === "SELECTED" ? (
                            <button
                              onClick={() => setPickerProductId(product.id)}
                              disabled={isSaving}
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border ${
                                isDark
                                  ? "border-indigo-500/50 text-indigo-300 hover:bg-indigo-900/30"
                                  : "border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                              }`}
                            >
                              <AdjustmentsHorizontalIcon className="h-3.5 w-3.5" />
                              {visibleIds.length} مسوق
                            </button>
                          ) : (
                            <span className={`text-xs ${isDark ? "text-gray-500" : "text-gray-400"}`}>—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className={`flex items-center justify-between px-4 py-3 border-t ${isDark ? "border-gray-700" : "border-gray-100"}`}>
                <span className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                  الصفحة {page} من {totalPages} ({total} منتج)
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className={`px-3 py-1 rounded-lg text-xs font-bold border ${
                      isDark ? "border-gray-600 text-gray-300" : "border-gray-200 text-gray-700"
                    } disabled:opacity-40`}
                  >
                    السابق
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className={`px-3 py-1 rounded-lg text-xs font-bold border ${
                      isDark ? "border-gray-600 text-gray-300" : "border-gray-200 text-gray-700"
                    } disabled:opacity-40`}
                  >
                    التالي
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Affiliate Picker Modal */}
      {pickerProductId && (
        <AffiliatePicker
          selected={parseAffiliateIds(
            products.find((p) => p.id === pickerProductId)?.affiliateVisibleAffiliateIds ?? null,
          )}
          onChange={(ids) => handleAffiliatePickerSave(pickerProductId, ids)}
          onClose={() => setPickerProductId(null)}
        />
      )}
    </div>
  );
};

export default AffiliateProductsVisibility;
