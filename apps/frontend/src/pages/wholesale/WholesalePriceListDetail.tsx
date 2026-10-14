import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { apiClient } from "../../services/apiClient";
import {
  Tag,
  Plus,
  Trash2,
  ArrowRight,
  Save,
  Layers,
  DollarSign,
  Package,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";

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
      setError(err?.response?.data?.message || "فشل حفظ قائمة الأسعار");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-card flex flex-col items-center justify-center gap-3 text-muted-foreground font-sans">
        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-mono">جاري تحميل مصفوفة الأسعار...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-card text-foreground font-sans rtl" dir="rtl">
      {/* Telemetry Status Ribbon */}
      <div className="border-b border-border/70 bg-muted/20 px-4 sm:px-6 py-2">
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-muted-foreground font-medium">
              <span className={`inline-block w-2 h-2 rounded-full ${form.isActive ? "bg-emerald-500" : "bg-amber-500"}`} />
              {form.isActive ? "قائمة مفعلة ونشطة" : "قائمة معطلة مؤقتاً"}
            </span>
            <span className="text-border">|</span>
            <span className="text-muted-foreground font-mono">
              {isNew ? "NEW_DRAFT" : `PL_ID: ${id}`}
            </span>
          </div>
          <div className="flex items-center gap-4 font-mono tabular-nums text-muted-foreground">
            <span>المنتجات المسجلة: <strong className="text-foreground">{form.items.length}</strong></span>
            <span className="text-border">|</span>
            <span>العملة: <strong className="text-foreground">{form.currency}</strong></span>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
        {/* Navigation & Header */}
        <div>
          <Link
            to="/wholesale/price-lists"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-3"
          >
            <ArrowRight className="w-3.5 h-3.5" />
            العودة إلى مصفوفة قوائم الأسعار
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/70">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-muted/40 text-foreground border border-border/70">
                  <Tag className="w-3 h-3 text-muted-foreground" />
                  هيكل تسعير الجملة
                </span>
                <span className="text-[11px] text-muted-foreground font-mono">
                  {isNew ? "new-pricelist" : `pl-${id?.slice(0, 8)}`}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">
                {isNew ? "إنشاء قائمة أسعار جملة جديدة" : `تعديل قائمة الأسعار: ${form.name || "—"}`}
              </h1>
              <p className="text-xs text-muted-foreground">
                تحديد الأسعار الحصرية وهوامش الخصم لتطبيقها تلقائياً على طلبات التجار والموزعين
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-md border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-500 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* General Info Card */}
          <div className="bg-card border border-border/70 rounded-lg p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-border/70 pb-3">
              <Layers className="w-4 h-4 text-primary" />
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">بيانات القائمة العامة</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-medium text-foreground">اسم القائمة (بالعربية) *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="مثال: أسعار كبار الموزعين - قطاع الصعيد"
                  className="w-full bg-background border border-border/80 rounded-md px-3 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-medium text-foreground">الاسم بالإنجليزية (اختياري)</label>
                <input
                  type="text"
                  value={form.nameEn || ""}
                  onChange={(e) => setForm({ ...form, nameEn: e.target.value })}
                  placeholder="Tier 1 VIP Wholesale"
                  className="w-full bg-background border border-border/80 rounded-md px-3 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-medium text-foreground">العملة المعتمدة</label>
                <select
                  value={form.currency}
                  onChange={(e) => setForm({ ...form, currency: e.target.value })}
                  className="w-full bg-background border border-border/80 rounded-md px-3 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                >
                  <option value="EGP">جنيه مصري (EGP)</option>
                  <option value="SAR">ريال سعودي (SAR)</option>
                  <option value="USD">دولار أمريكي (USD)</option>
                </select>
              </div>
            </div>

            <div className="pt-2">
              <label className="inline-flex items-center gap-2 cursor-pointer text-xs">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  className="rounded border-border/80 text-primary focus:ring-primary"
                />
                <span className="font-medium text-foreground">تفعيل القائمة وإتاحتها للتطبيق الفوري على حسابات التجار</span>
              </label>
            </div>
          </div>

          {/* Products Table Card */}
          <div className="bg-card border border-border/70 rounded-lg p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-border/70 pb-3">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-primary" />
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">جدول تسعير الأصناف والمنتجات</h2>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-muted/40 text-muted-foreground font-mono tabular-nums">
                  {form.items.length} صنف
                </span>
              </div>

              <button
                type="button"
                onClick={addItem}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-medium transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                إضافة منتج
              </button>
            </div>

            {form.items.length === 0 ? (
              <div className="py-12 text-center space-y-2 border border-dashed border-border/70 rounded-md">
                <Package className="w-8 h-8 text-muted-foreground mx-auto" />
                <p className="text-xs text-muted-foreground">
                  لم يتم إدراج أي منتجات في هذه القائمة بعد. اضغط "إضافة منتج" لإدراج الأصناف وتحديد أسعار الجملة.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {form.items.map((item, i) => (
                  <div
                    key={i}
                    className="flex flex-wrap items-end gap-3 rounded-md border border-border/70 bg-muted/10 p-3 text-xs hover:border-border transition-colors"
                  >
                    <div className="flex-1 min-w-[140px] space-y-1">
                      <label className="text-[11px] font-medium text-muted-foreground">معرف المنتج / SKU</label>
                      <input
                        type="text"
                        value={item.productId}
                        onChange={(e) => updateItem(i, "productId", e.target.value)}
                        placeholder="PRD-102"
                        className="w-full bg-background border border-border/80 rounded-md px-2.5 py-1 text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>

                    <div className="flex-[2] min-w-[200px] space-y-1">
                      <label className="text-[11px] font-medium text-muted-foreground">اسم الصنف / المنتج *</label>
                      <input
                        type="text"
                        value={item.productName}
                        onChange={(e) => updateItem(i, "productName", e.target.value)}
                        placeholder="قميص أكسفورد أبيض كلاسيك"
                        className="w-full bg-background border border-border/80 rounded-md px-2.5 py-1 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>

                    <div className="w-32 space-y-1">
                      <label className="text-[11px] font-medium text-muted-foreground">
                        سعر الجملة ({form.currency}) *
                      </label>
                      <input
                        type="number"
                        value={item.price}
                        onChange={(e) => updateItem(i, "price", parseFloat(e.target.value) || 0)}
                        className="w-full bg-background border border-border/80 rounded-md px-2.5 py-1 text-foreground font-mono tabular-nums focus:outline-none focus:ring-1 focus:ring-primary"
                        step="0.01"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => removeItem(i)}
                      className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-muted/40 rounded transition-colors"
                      title="حذف هذا الصنف"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 px-5 py-2 text-xs font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              <Save className="w-3.5 h-3.5" />
              {saving ? "جاري الحفظ..." : "حفظ قائمة الأسعار"}
            </button>
            <button
              type="button"
              onClick={() => navigate("/wholesale/price-lists")}
              className="px-4 py-2 text-xs font-medium rounded-md bg-muted/40 text-foreground hover:bg-muted/70 border border-border/70 transition-colors"
            >
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
