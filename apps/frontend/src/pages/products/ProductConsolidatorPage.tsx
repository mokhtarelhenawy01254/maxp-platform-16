import React, { useEffect, useMemo, useState, useCallback } from "react";
import { apiClient } from "../../services/apiClient";
import { getImageUrl } from "../../utils/imageUrl";

interface DuplicateGroupItem {
  id: string;
  name: string;
  sku: string | null;
  price: number;
  comparePrice: number | null;
  images: string[];
  mainImage: string | null;
  status: string | null;
  isActive: boolean;
  isHidden: boolean;
}

interface DuplicateGroup {
  name: string;
  count: number;
  items: DuplicateGroupItem[];
}

interface SelectedVariant {
  productId: string;
  name: string;
  sku: string;
  price: number | null;
  stock: number | null;
  images: string[];
  include: boolean;
}

const ORIGINALS_ACTIONS = [
  { value: "HIDE", label: "إخفاء الأصل (الاحتفاظ في سلة المحذوفات)", hint: "المنتج الأصلي يُخفى من الكتالوج ويبقى قابلاً للاسترجاع" },
  { value: "KEEP", label: "الاحتفاظ بالأصل كما هو", hint: "يظهر المنتج الأصلي والمنتج الجديد معاً في الكتالوج" },
  { value: "DELETE", label: "حذف الأصل نهائياً (خطير)", hint: "يُنقل كل الطلبات والعروض التقديمية والمخزون للمنتج الجديد ثم يُحذف الأصل نهائياً" },
];

const ProductConsolidatorPage: React.FC = () => {
  const [groups, setGroups] = useState<DuplicateGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedGroup, setSelectedGroup] = useState<string>("");
  const [selectedItems, setSelectedItems] = useState<Record<string, boolean>>({});

  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [originalsAction, setOriginalsAction] = useState("HIDE");
  const [variantEdits, setVariantEdits] = useState<Record<string, Partial<SelectedVariant>>>({});

  const [executing, setExecuting] = useState(false);
  const [result, setResult] = useState<{ message: string; productId: string | null } | null>(null);

  const loadGroups = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get("/products/consolidate/duplicates");
      if (res.data?.success) {
        const groupsData = res.data.data || [];
        setGroups(groupsData);
        if (groupsData.length > 0 && !selectedGroup) {
          setSelectedGroup(groupsData[0].name);
        }
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || "فشل في جلب المجموعات المكررة");
    } finally {
      setLoading(false);
    }
  }, [selectedGroup]);

  useEffect(() => {
    loadGroups();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeGroup = useMemo(
    () => groups.find((g) => g.name === selectedGroup) || null,
    [groups, selectedGroup],
  );

  const selectedItemsList = useMemo(() => {
    if (!activeGroup) return [];
    return activeGroup.items.filter((item) => selectedItems[item.id]);
  }, [activeGroup, selectedItems]);

  const selectAllInGroup = () => {
    if (!activeGroup) return;
    const next: Record<string, boolean> = {};
    activeGroup.items.forEach((item) => { next[item.id] = true; });
    setSelectedItems(next);
  };

  const toggleItem = (id: string) => {
    setSelectedItems((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const canExecute = activeGroup && selectedItemsList.length >= 1 && newName.trim().length > 0;

  const handleExecute = async () => {
    if (!canExecute || !activeGroup) return;
    setError(null);
    setResult(null);
    setExecuting(true);
    try {
      const variantSelections = selectedItemsList.map((item) => {
        const edit = variantEdits[item.id] || {};
        return {
          productId: item.id,
          name: edit.name ?? item.name,
          sku: edit.sku ?? item.sku ?? "",
          price: edit.price !== undefined ? edit.price : item.price,
          stock: edit.stock !== undefined ? edit.stock : null,
          images: edit.images ?? item.images,
        };
      });
      const res = await apiClient.post("/products/consolidate", {
        name: newName.trim(),
        description: newDescription.trim() || null,
        sourceProductIds: selectedItemsList.map((item) => item.id),
        variantSelections,
        originalsAction,
        newSlug: newSlug.trim() || null,
      });
      if (res.data?.success) {
        setResult({
          message: res.data.message || "تم الدمج بنجاح",
          productId: res.data.data?.product?.id || null,
        });
        await loadGroups();
        setSelectedItems({});
        setNewName("");
        setNewDescription("");
        setNewSlug("");
        setVariantEdits({});
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || "فشل تنفيذ الدمج");
    } finally {
      setExecuting(false);
    }
  };

  const setVariantEdit = (id: string, patch: Partial<SelectedVariant>) => {
    setVariantEdits((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-800 p-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-flex items-center gap-1.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs font-medium px-3 py-1 rounded-full">
                  أداة دمج المنتجات
                </span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                دمج المنتجات المكررة
              </h1>
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                ادمج منتجات متعددة في منتج واحد جديد مع الاحتفاظ بـ SKU لكل منتج كمتغير مستقل
              </p>
            </div>
            <button
              onClick={loadGroups}
              className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              disabled={loading}
            >
              تحديث القائمة
            </button>
          </div>

          {error && (
            <div className="mb-4 bg-red-50 dark:bg-red-900/20 border-r-4 border-red-500 p-3 rounded-l-md text-sm text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          {result && (
            <div className="mb-4 bg-emerald-50 dark:bg-emerald-900/20 border-r-4 border-emerald-500 p-3 rounded-l-md text-sm text-emerald-700 dark:text-emerald-300">
              {result.message}
              {result.productId && (
                <a href={`/products/${result.productId}/edit`} className="underline ml-2">عرض المنتج الجديد</a>
              )}
            </div>
          )}

          {/* Step 1: Group selection */}
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">1. اختر مجموعة المنتجات المكررة</h2>
            <select
              value={selectedGroup}
              onChange={(e) => {
                setSelectedGroup(e.target.value);
                setSelectedItems({});
                setVariantEdits({});
              }}
              className="w-full md:w-96 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg text-sm p-2"
            >
              <option value="">اختر مجموعة...</option>
              {groups.map((group) => (
                <option key={group.name} value={group.name}>
                  {group.name} ({group.count} منتجات)
                </option>
              ))}
            </select>
          </div>

          {/* Step 2: Select products */}
          {activeGroup && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  2. اختر المنتجات المطلوب دمجها ({selectedItemsList.length}/{activeGroup.items.length})
                </h2>
                <button
                  onClick={selectAllInGroup}
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  تحديد الكل
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {activeGroup.items.map((item) => (
                  <div
                    key={item.id}
                    className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                      selectedItems[item.id]
                        ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20"
                        : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300"
                    }`}
                    onClick={() => toggleItem(item.id)}
                  >
                    <div className="flex items-start gap-3">
                      {item.images?.[0] ? (
                        <img
                          src={getImageUrl(item.images[0], "thumbnail") || ""}
                          alt=""
                          loading="lazy"
                          decoding="async"
                          className="w-14 h-14 object-cover rounded-lg"
                        />
                      ) : (
                        <div className="w-14 h-14 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center text-gray-400 text-xs">
                          لا توجد صورة
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{item.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">SKU: {item.sku || "—"}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{item.price} ج.م</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={!!selectedItems[item.id]}
                        onChange={() => toggleItem(item.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="mt-1 accent-indigo-600"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: New product details */}
          {activeGroup && (
            <div className="mb-6">
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">3. بيانات المنتج الجديد</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">اسم المنتج الجديد *</label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => {
                      setNewName(e.target.value);
                      if (!newSlug) setNewSlug(e.target.value.trim().toLowerCase().replace(/\s+/g, "-"));
                    }}
                    placeholder="مثال: حذاء سوان الرياضي"
                    className="w-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg text-sm p-2"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">الرابط (اختياري)</label>
                  <input
                    type="text"
                    value={newSlug}
                    onChange={(e) => setNewSlug(e.target.value.trim())}
                    placeholder="/product/..."
                    className="w-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg text-sm p-2"
                  />
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">الوصف</label>
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  rows={3}
                  placeholder="وصف المنتج الجديد (يُورث من أول منتج إن تُرك فارغاً)"
                  className="w-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg text-sm p-2"
                />
              </div>
            </div>
          )}

          {/* Step 4: Variant details */}
          {selectedItemsList.length > 0 && (
            <div className="mb-6">
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                4. تفاصيل المتغيرات (لكل منتج SKU مستقل)
              </h2>
              <div className="space-y-3">
                {selectedItemsList.map((item) => {
                  const edit = variantEdits[item.id] || {};
                  return (
                    <div key={item.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-gray-50 dark:bg-gray-800/50">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">اسم المتغير</label>
                          <input
                            type="text"
                            value={edit.name ?? item.name}
                            onChange={(e) => setVariantEdit(item.id, { name: e.target.value })}
                            className="w-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-md text-sm p-1.5"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">SKU</label>
                          <input
                            type="text"
                            value={edit.sku ?? item.sku ?? ""}
                            onChange={(e) => setVariantEdit(item.id, { sku: e.target.value })}
                            className="w-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-md text-sm p-1.5"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">السعر</label>
                          <input
                            type="number"
                            value={edit.price !== undefined ? edit.price : item.price}
                            onChange={(e) => setVariantEdit(item.id, { price: e.target.value === "" ? null : Number(e.target.value) })}
                            className="w-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-md text-sm p-1.5"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">المخزون (اختياري)</label>
                          <input
                            type="number"
                            value={edit.stock !== undefined && edit.stock !== null ? edit.stock : ""}
                            onChange={(e) => setVariantEdit(item.id, { stock: e.target.value === "" ? null : Number(e.target.value) })}
                            placeholder="يُورث من المنتج الأصلي"
                            className="w-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-md text-sm p-1.5"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 5: Originals action */}
          {activeGroup && (
            <div className="mb-6">
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">5. ماذا يحدث للمنتجات الأصلية؟</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {ORIGINALS_ACTIONS.map((action) => (
                  <button
                    key={action.value}
                    type="button"
                    onClick={() => setOriginalsAction(action.value)}
                    className={`border rounded-lg p-3 text-right transition-colors ${
                      originalsAction === action.value
                        ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20"
                        : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300"
                    }`}
                  >
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{action.label}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{action.hint}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
            <button
              onClick={handleExecute}
              disabled={!canExecute || executing}
              className="px-6 py-2.5 bg-gradient-to-l from-indigo-600 to-purple-600 text-white font-semibold rounded-lg hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {executing ? "جاري الدمج..." : "تنفيذ الدمج"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductConsolidatorPage;