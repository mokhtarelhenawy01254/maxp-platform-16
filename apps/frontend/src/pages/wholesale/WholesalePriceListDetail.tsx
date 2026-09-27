import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiClient } from "../../services/apiClient";

interface PriceListItem {
  productId: string;
  productName: string;
  sku?: string;
  price: number;
}

interface PriceListData {
  id?: string;
  name: string;
  nameEn?: string;
  currency: string;
  isActive: boolean;
  items: PriceListItem[];
}

export default function WholesalePriceListDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id || id === "new";
  const [form, setForm] = useState<PriceListData>({
    name: "",
    nameEn: "",
    currency: "EGP",
    isActive: true,
    items: [],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isNew) {
      setLoading(false);
      return;
    }
    const load = async () => {
      try {
        setLoading(true);
        const res = await apiClient.get(`/wholesale/price-lists/${id}`);
        const data = res?.data?.data;
        if (data) {
          setForm({
            name: data.name || "",
            nameEn: data.nameEn || "",
            currency: data.currency || "EGP",
            isActive: data.isActive ?? true,
            items: data.items || [],
          });
        }
      } catch (err: any) {
        setError(err?.response?.data?.message || "فشل تحميل قائمة الأسعار");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, isNew]);

  const addItem = () => {
    setForm((prev) => ({
      ...prev,
      items: [...prev.items, { productId: "", productName: "", sku: "", price: 0 }],
    }));
  };

  const updateItem = (index: number, field: keyof PriceListItem, value: string | number) => {
    setForm((prev) => {
      const items = [...prev.items];
      items[index] = { ...items[index], [field]: value };
      return { ...prev, items };
    });
  };

  const removeItem = (index: number) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);
      if (isNew) {
        await apiClient.post("/wholesale/price-lists", form);
      } else {
        await apiClient.put(`/wholesale/price-lists/${id}`, form);
      }
      navigate("/wholesale/price-lists");
    } catch (err: any) {
      setError(err?.response?.data?.message || "فشل الحفظ");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {isNew ? "إضافة قائمة أسعار" : "تعديل قائمة الأسعار"}
        </h1>
      </div>
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">اسم القائمة</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">الاسم بالإنجليزية</label>
              <input
                type="text"
                value={form.nameEn || ""}
                onChange={(e) => setForm({ ...form, nameEn: e.target.value })}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">العملة</label>
              <select
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value })}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              >
                <option value="EGP">EGP</option>
                <option value="USD">USD</option>
                <option value="SAR">SAR</option>
              </select>
            </div>
            <div className="flex items-center gap-2 pt-6">
              <input
                type="checkbox"
                id="isActive"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary dark:border-gray-600 dark:bg-gray-800"
              />
              <label htmlFor="isActive" className="text-sm font-medium text-gray-700 dark:text-gray-200 cursor-pointer">
                نشط
              </label>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">المنتجات</h2>
            <button
              type="button"
              onClick={addItem}
              className="rounded-lg bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              + إضافة منتج
            </button>
          </div>
          {form.items.length === 0 ? (
            <p className="py-8 text-center text-gray-500 dark:text-gray-400">
              لم يتم إضافة منتجات بعد. اضغط "إضافة منتج" للبدء.
            </p>
          ) : (
            <div className="space-y-3">
              {form.items.map((item, i) => (
                <div key={i} className="flex flex-wrap items-end gap-3 rounded-lg border border-gray-100 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-800/60">
                  <div className="flex-1 min-w-[140px]">
                    <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">معرف المنتج</label>
                    <input
                      type="text"
                      value={item.productId}
                      onChange={(e) => updateItem(i, "productId", e.target.value)}
                      className="w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-900 placeholder-gray-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 dark:placeholder-gray-500"
                    />
                  </div>
                  <div className="flex-[2] min-w-[200px]">
                    <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">اسم المنتج</label>
                    <input
                      type="text"
                      value={item.productName}
                      onChange={(e) => updateItem(i, "productName", e.target.value)}
                      className="w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-900 placeholder-gray-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 dark:placeholder-gray-500"
                    />
                  </div>
                  <div className="w-24">
                    <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">السعر</label>
                    <input
                      type="number"
                      value={item.price}
                      onChange={(e) => updateItem(i, "price", parseFloat(e.target.value) || 0)}
                      className="w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-900 placeholder-gray-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 dark:placeholder-gray-500"
                      step="0.01"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(i)}
                    className="rounded bg-red-100 px-2.5 py-1.5 text-sm text-red-600 hover:bg-red-200 dark:bg-red-900/40 dark:text-red-300 dark:hover:bg-red-900/60 transition-colors"
                  >
                    حذف
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-primary px-6 py-2 text-sm font-medium text-white disabled:opacity-50 hover:bg-primary/90 transition-colors"
          >
            {saving ? "جاري الحفظ..." : "حفظ"}
          </button>
          <button
            type="button"
            onClick={() => navigate("/wholesale/price-lists")}
            className="rounded-lg border border-gray-300 bg-white px-6 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            إلغاء
          </button>
        </div>
      </form>
    </div>
  );
}
