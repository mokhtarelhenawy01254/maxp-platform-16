import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock,
  ExternalLink,
  Eye,
  Flame,
  Layers,
  Loader2,
  Package,
  Percent,
  Plus,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Tag,
  Trash2,
  Truck,
  Zap
} from "lucide-react";
import { apiClient } from "../../services/apiClient";
import { getDirection } from "../../i18n";
import type {
  PostPurchaseOfferConfig,
  PostPurchaseOfferProduct
} from "../../types/postPurchaseOffer";
import { DEFAULT_POST_PURCHASE_OFFER } from "../../types/postPurchaseOffer";

interface CatalogItem {
  id: string;
  name: string;
  price: number | null;
  comparePrice?: number | null;
  imageUrl?: string;
  sku?: string;
  categoryName?: string;
}

export default function PostPurchaseOfferBuilderPage() {
  const { t } = useTranslation();
  const isRtl = getDirection() === "rtl";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  // Offer State
  const [offer, setOffer] = useState<PostPurchaseOfferConfig>(DEFAULT_POST_PURCHASE_OFFER);

  // Catalog Products
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [isProductPickerOpen, setIsProductPickerOpen] = useState(false);

  // Preview Mode
  const [previewDevice, setPreviewDevice] = useState<"mobile" | "desktop">("mobile");

  // Load Existing Offer Configuration
  const loadOffer = async () => {
    try {
      setLoading(true);
      const res = (await apiClient.get("/post-purchase-offer")) as {
        data?: { data?: PostPurchaseOfferConfig };
      };
      if (res?.data?.data) {
        setOffer((prev) => ({ ...prev, ...res.data!.data }));
      }
    } catch (err: any) {
      console.warn("Could not load post-purchase offer:", err);
    } finally {
      setLoading(false);
    }
  };

  // Load Products Catalog
  const loadCatalog = async () => {
    try {
      setCatalogLoading(true);
      const res = (await apiClient.get("/products?limit=250&status=active")) as {
        data?: { data?: any[] } | any[];
      };
      const list = Array.isArray((res?.data as any)?.data)
        ? (res?.data as any).data
        : Array.isArray(res?.data)
          ? res?.data
          : [];

      const normalized: CatalogItem[] = list.map((p: any) => {
        let imageUrl: string | undefined;
        if (typeof p.imageUrl === "string" && p.imageUrl.trim()) {
          imageUrl = p.imageUrl.trim();
        } else if (Array.isArray(p.images) && p.images.length > 0) {
          const first = p.images[0];
          imageUrl = typeof first === "string" ? first : first?.url;
        }
        return {
          id: String(p.id || ""),
          name: String(p.name || "منتج بدون اسم"),
          price: Number(p.price) || 0,
          comparePrice: Number(p.comparePrice) || null,
          sku: String(p.sku || ""),
          categoryName: p.category?.name || "",
          imageUrl
        };
      });
      setCatalog(normalized);
    } catch (err) {
      console.error("Failed to load catalog products:", err);
    } finally {
      setCatalogLoading(false);
    }
  };

  useEffect(() => {
    void loadOffer();
    void loadCatalog();
  }, []);

  // Filtered products in picker
  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return catalog.slice(0, 40);
    const query = productSearch.toLowerCase();
    return catalog
      .filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.sku.toLowerCase().includes(query)
      )
      .slice(0, 40);
  }, [catalog, productSearch]);

  // Selected product from catalog
  const selectedProduct = useMemo(() => {
    return catalog.find((p) => p.id === offer.productId) || null;
  }, [catalog, offer.productId]);

  // Calculated Pricing
  const calculatedOfferPrice = useMemo(() => {
    const base = Number(offer.originalPrice) || Number(selectedProduct?.price) || 0;
    if (offer.discountType === "percentage") {
      const discount = (base * (Number(offer.discountValue) || 0)) / 100;
      return Math.max(0, Number((base - discount).toFixed(2)));
    }
    return Math.max(0, Number(Number(offer.discountValue || 0).toFixed(2)));
  }, [offer.discountType, offer.discountValue, offer.originalPrice, selectedProduct]);

  const calculatedSavings = useMemo(() => {
    const base = Number(offer.originalPrice) || Number(selectedProduct?.price) || 0;
    return Math.max(0, base - calculatedOfferPrice);
  }, [offer.originalPrice, selectedProduct, calculatedOfferPrice]);

  const calculatedSavingsPercent = useMemo(() => {
    const base = Number(offer.originalPrice) || Number(selectedProduct?.price) || 0;
    if (base <= 0) return 0;
    return Math.round((calculatedSavings / base) * 100);
  }, [offer.originalPrice, selectedProduct, calculatedSavings]);

  // Save changes
  const handleSave = async () => {
    try {
      setSaving(true);
      const payload: PostPurchaseOfferConfig = {
        ...offer,
        offerPrice: calculatedOfferPrice
      };

      const res = (await apiClient.put("/post-purchase-offer", payload)) as {
        data?: { success?: boolean; message?: string };
      };

      if (res?.data?.success !== false) {
        toast.success("تم حفظ إعدادات العرض بنجاح!");
        setLastSavedAt(new Date());
      } else {
        throw new Error(res?.data?.message || "فشل الحفظ");
      }
    } catch (err: any) {
      console.error("Save failed:", err);
      toast.error(err?.message || "حدث خطأ أثناء حفظ إعدادات العرض");
    } finally {
      setSaving(false);
    }
  };

  // Select Product Handler
  const handleSelectProduct = (p: CatalogItem) => {
    setOffer((prev) => ({
      ...prev,
      productId: p.id,
      productName: p.name,
      originalPrice: p.price || 0,
      productImage: p.imageUrl || prev.productImage
    }));
    setIsProductPickerOpen(false);
  };

  // Add Feature Bullet
  const handleAddFeature = () => {
    if (offer.features.length >= 6) {
      toast.error("الحد الأقصى هو 6 ميزات لضمان سرعة التحويل");
      return;
    }
    setOffer((prev) => ({
      ...prev,
      features: [...prev.features, "ميزة إضافية للعرض"]
    }));
  };

  // Remove Feature Bullet
  const handleRemoveFeature = (index: number) => {
    setOffer((prev) => ({
      ...prev,
      features: prev.features.filter((_, i) => i !== index)
    }));
  };

  // Update Feature Bullet
  const handleUpdateFeature = (index: number, val: string) => {
    setOffer((prev) => {
      const next = [...prev.features];
      next[index] = val;
      return { ...prev, features: next };
    });
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center" dir={isRtl ? "rtl" : "ltr"}>
        <Loader2 className="w-10 h-10 text-primary animate-spin mb-3" />
        <p className="text-sm font-medium text-muted-foreground">
          جارٍ تحميل أداة العرض الخاص بعد الطلب...
        </p>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-slate-50/60 dark:bg-zinc-950 p-3 sm:p-6 space-y-6" dir={isRtl ? "rtl" : "ltr"}>

      {/* Top Header Control Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/80 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
              One-Click Upsell Engine
            </span>
            {offer.enabled ? (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-600 animate-ping" />
                العرض نشط في المتجر
              </span>
            ) : (
              <span className="text-xs font-medium text-muted-foreground">
                العرض متوقف حالياً
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
            أداة العرض الخاص بعد الطلب (Post-Purchase Offer)
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl text-pretty">
            صمم صفحة عرض خاص لمرة واحدة تظهر للمشتري مباشرة بعد الضغط على تأكيد الطلب وقبل صفحة الشكر، لزيادة متوسط قيمة الطلب (AOV) بدون أي مخاطرة على الطلب الأصلي.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {lastSavedAt && (
            <span className="text-xs text-muted-foreground hidden lg:inline tabular-nums">
              آخر حفظ: {lastSavedAt.toLocaleTimeString()}
            </span>
          )}
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm shadow-md hover:opacity-95 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>حفظ الإعدادات</span>
          </button>
        </div>
      </div>

      {/* Main 2-Column Bento Chassis */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* ──────────────── Left Column: Form Controls (7 cols) ──────────────── */}
        <div className="lg:col-span-7 space-y-6">

          {/* Card 1: Status Toggle */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                  <Zap className="w-4 h-4 text-emerald-600" />
                  حالة العرض الخاص بعد الطلب
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  تفعيل أو تعطيل توجيه المشتري لصفحة العرض بعد الشيك آوت
                </p>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={offer.enabled}
                onClick={() => setOffer((prev) => ({ ...prev, enabled: !prev.enabled }))}
                className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors cursor-pointer ${
                  offer.enabled ? "bg-emerald-600" : "bg-gray-300 dark:bg-gray-700"
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 rounded-full bg-white transition-transform ${
                    offer.enabled ? (isRtl ? "-translate-x-6" : "translate-x-6") : (isRtl ? "-translate-x-1" : "translate-x-1")
                  }`}
                />
              </button>
            </div>

            {offer.enabled && !offer.productId && (
              <div className="rounded-xl border border-amber-300/80 bg-amber-500/10 p-3 text-xs text-amber-900 dark:text-amber-200 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>يرجى اختيار المنتج المعروض من الكتالوج أدناه لتفعيل العرض للعملاء.</span>
              </div>
            )}
          </div>

          {/* Card 2: Product Selector & Pricing */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-5">
            <h3 className="font-bold text-base text-foreground flex items-center gap-2">
              <Package className="w-4 h-4 text-primary" />
              منتج العرض والتسعير
            </h3>

            {/* Selected Product Banner */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-foreground">المنتج المعروض:</label>

              {offer.productId ? (
                <div className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-muted/30">
                  <div className="flex items-center gap-3">
                    {offer.productImage ? (
                      <img
                        src={offer.productImage}
                        alt="Product"
                        className="w-14 h-14 object-cover rounded-lg border border-border"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center text-xs text-muted-foreground">
                        لا توجد صورة
                      </div>
                    )}
                    <div>
                      <p className="font-bold text-sm text-foreground leading-tight">
                        {offer.productName || selectedProduct?.name || "منتج محدد"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1 tabular-nums">
                        السعر الأصلي: {offer.originalPrice} ج.م
                        {selectedProduct?.sku ? ` • كود: ${selectedProduct.sku}` : ""}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsProductPickerOpen(true)}
                    className="px-3 py-1.5 rounded-lg border border-border text-xs font-bold hover:bg-muted transition-colors cursor-pointer"
                  >
                    تغيير المنتج
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsProductPickerOpen(true)}
                  className="w-full p-4 rounded-xl border-2 border-dashed border-border/80 hover:border-primary/60 hover:bg-primary/5 transition-all text-center cursor-pointer flex flex-col items-center justify-center gap-1.5 text-muted-foreground hover:text-primary"
                >
                  <Plus className="w-5 h-5" />
                  <span className="font-bold text-sm">اختر منتج العرض من الكتالوج</span>
                </button>
              )}
            </div>

            {/* Product Picker Modal / Dropdown */}
            {isProductPickerOpen && (
              <div className="rounded-xl border border-border bg-card p-4 space-y-3 shadow-lg">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs">اختر المنتج من القائمة:</span>
                  <button
                    type="button"
                    onClick={() => setIsProductPickerOpen(false)}
                    className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    إغلاق ✕
                  </button>
                </div>

                <div className="relative">
                  <Search className="w-4 h-4 absolute top-2.5 start-3 text-muted-foreground" />
                  <input
                    type="text"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder="ابحث بالاسم أو الباركود..."
                    className="w-full ps-9 pe-3 py-2 text-xs rounded-lg border border-border bg-background"
                  />
                </div>

                <div className="max-h-56 overflow-y-auto divide-y divide-border/60">
                  {catalogLoading ? (
                    <div className="p-4 text-center text-xs text-muted-foreground">جارٍ تحميل المنتجات...</div>
                  ) : filteredProducts.length === 0 ? (
                    <div className="p-4 text-center text-xs text-muted-foreground">لا توجد منتجات مطابقة</div>
                  ) : (
                    filteredProducts.map((p) => (
                      <div
                        key={p.id}
                        onClick={() => handleSelectProduct(p)}
                        className="p-2.5 hover:bg-muted/50 rounded-lg flex items-center justify-between cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          {p.imageUrl ? (
                            <img src={p.imageUrl} alt="" className="w-9 h-9 rounded object-cover border" />
                          ) : (
                            <div className="w-9 h-9 rounded bg-muted flex items-center justify-center text-[10px]">📦</div>
                          )}
                          <div>
                            <p className="text-xs font-bold text-foreground line-clamp-1">{p.name}</p>
                            <p className="text-[10px] text-muted-foreground tabular-nums">{p.price || 0} ج.م</p>
                          </div>
                        </div>
                        <span className="text-xs font-bold text-primary">اختيار</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Discount & Pricing Config */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border/60">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">نوع الخصم:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setOffer((prev) => ({ ...prev, discountType: "percentage" }))}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      offer.discountType === "percentage"
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground"
                    }`}
                  >
                    نسبة مئوية (%)
                  </button>
                  <button
                    type="button"
                    onClick={() => setOffer((prev) => ({ ...prev, discountType: "fixed_price" }))}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      offer.discountType === "fixed_price"
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground"
                    }`}
                  >
                    سعر محدد (ج.م)
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">
                  {offer.discountType === "percentage" ? "نسبة الخصم (%):" : "السعر المعروض للعميل (ج.م):"}
                </label>
                <input
                  type="number"
                  min="0"
                  max={offer.discountType === "percentage" ? 100 : 99999}
                  value={offer.discountValue}
                  onChange={(e) =>
                    setOffer((prev) => ({ ...prev, discountValue: Math.max(0, Number(e.target.value) || 0) }))
                  }
                  className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-background font-bold tabular-nums"
                />
              </div>
            </div>

            {/* Live Pricing Summary Box */}
            <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-500/10 text-xs space-y-1 text-emerald-950 dark:text-emerald-200">
              <div className="flex justify-between items-center font-bold">
                <span>السعر النهائي في العرض:</span>
                <span className="text-sm font-black tabular-nums">{calculatedOfferPrice} ج.م</span>
              </div>
              <div className="flex justify-between items-center text-muted-foreground text-[11px]">
                <span>مقدار التوفير للعميل:</span>
                <span className="tabular-nums font-bold text-emerald-700 dark:text-emerald-300">
                  وفر {calculatedSavings} ج.م ({calculatedSavingsPercent}% خصم)
                </span>
              </div>
            </div>

            {/* Free Shipping Toggle */}
            <div className="flex items-center justify-between pt-1">
              <div>
                <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5 text-emerald-600" />
                  شحن مجاني للعرض
                </p>
                <p className="text-[11px] text-muted-foreground">
                  يُشحن في نفس طرد الطلب الأصلي دون إضافة أي تكاليف شحن
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={offer.freeShipping}
                onClick={() => setOffer((prev) => ({ ...prev, freeShipping: !prev.freeShipping }))}
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors cursor-pointer ${
                  offer.freeShipping ? "bg-emerald-600" : "bg-gray-300 dark:bg-gray-700"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                    offer.freeShipping ? (isRtl ? "-translate-x-6" : "translate-x-6") : (isRtl ? "-translate-x-1" : "translate-x-1")
                  }`}
                />
              </button>
            </div>

          </div>

          {/* Card 3: Copywriting & Urgency Customization */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-4">
            <h3 className="font-bold text-base text-foreground flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              تخصيص نصوص العرض والعداد
            </h3>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-foreground">شريط التنبيه العلوي (Badge):</label>
                <input
                  type="text"
                  value={offer.badgeText}
                  onChange={(e) => setOffer((prev) => ({ ...prev, badgeText: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-foreground">العنوان الرئيسي:</label>
                <input
                  type="text"
                  value={offer.title}
                  onChange={(e) => setOffer((prev) => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-foreground">العنوان الفرعي:</label>
                <input
                  type="text"
                  value={offer.subtitle}
                  onChange={(e) => setOffer((prev) => ({ ...prev, subtitle: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-foreground">وصف العرض / تفاصيل المنتج:</label>
                <textarea
                  rows={2}
                  value={offer.description}
                  onChange={(e) => setOffer((prev) => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background text-xs leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="space-y-1">
                  <label className="font-bold text-foreground">نص زر القبول (CTA):</label>
                  <input
                    type="text"
                    value={offer.acceptButtonText}
                    onChange={(e) => setOffer((prev) => ({ ...prev, acceptButtonText: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background font-bold text-emerald-700 dark:text-emerald-300"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-foreground">نص زر الرفض / المتابعة:</label>
                  <input
                    type="text"
                    value={offer.declineButtonText}
                    onChange={(e) => setOffer((prev) => ({ ...prev, declineButtonText: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-muted-foreground"
                  />
                </div>
              </div>

              <div className="space-y-1 pt-1">
                <label className="font-bold text-foreground flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  مدة العداد التنازلي بالدقائق:
                </label>
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={offer.timerMinutes}
                  onChange={(e) => setOffer((prev) => ({ ...prev, timerMinutes: Math.max(1, Number(e.target.value) || 5) }))}
                  className="w-32 px-3 py-2 rounded-xl border border-border bg-background font-bold tabular-nums"
                />
              </div>
            </div>

            {/* Feature Bullets List */}
            <div className="space-y-2 pt-2 border-t border-border/60">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-foreground">ميزات وضمانات العرض:</label>
                <button
                  type="button"
                  onClick={handleAddFeature}
                  className="text-xs font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  إضافة ميزة
                </button>
              </div>

              <div className="space-y-2">
                {offer.features.map((feat, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <input
                      type="text"
                      value={feat}
                      onChange={(e) => handleUpdateFeature(idx, e.target.value)}
                      className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-border bg-background"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveFeature(idx)}
                      className="p-1.5 text-muted-foreground hover:text-rose-600 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>

        {/* ──────────────── Right Column: Live Interactive Preview (5 cols) ──────────────── */}
        <div className="lg:col-span-5 sticky top-6 space-y-3">

          {/* Preview Controls Bar */}
          <div className="flex items-center justify-between bg-card p-2.5 rounded-xl border border-border shadow-sm text-xs">
            <span className="font-bold text-foreground flex items-center gap-1.5">
              <Eye className="w-4 h-4 text-primary" />
              معاينة حية للمشتري
            </span>

            <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => setPreviewDevice("mobile")}
                className={`px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                  previewDevice === "mobile"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                موبايل
              </button>
              <button
                type="button"
                onClick={() => setPreviewDevice("desktop")}
                className={`px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                  previewDevice === "desktop"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                كمبيوتر
              </button>
            </div>
          </div>

          {/* Device Mockup Shell */}
          <div
            className={`mx-auto transition-all duration-300 border-4 border-slate-300 dark:border-zinc-800 rounded-3xl overflow-hidden bg-slate-50 dark:bg-zinc-950 shadow-2xl p-3 text-xs ${
              previewDevice === "mobile" ? "max-w-[360px]" : "w-full"
            }`}
          >
            {/* Mockup Screen Content */}
            <div className="space-y-3 scale-95 origin-top">

              {/* Step 1: Order received banner */}
              <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-200 text-emerald-900 dark:text-emerald-200 text-[11px] leading-tight flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <div>
                  <p className="font-bold">تم استلام طلبك الأساسي بنجاح!</p>
                  <p className="text-[10px] text-emerald-800 dark:text-emerald-300">طلبك محفوظ ومؤكد. انتظر لحظة...</p>
                </div>
              </div>

              {/* Step 2: Timer */}
              <div className="p-2 rounded-lg bg-amber-500/15 border border-amber-200 text-amber-900 dark:text-amber-200 text-[11px] font-bold flex justify-between items-center">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                  ينتهي العرض خلال:
                </span>
                <span className="font-mono font-black tabular-nums bg-amber-600 text-white px-2 py-0.5 rounded">
                  0{offer.timerMinutes}:00
                </span>
              </div>

              {/* Step 3: Offer Card */}
              <div className="rounded-2xl border border-border bg-card p-3.5 shadow-sm space-y-3">
                {offer.badgeText && (
                  <div className="text-center">
                    <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500/10 text-rose-600 border border-rose-200">
                      {offer.badgeText}
                    </span>
                  </div>
                )}

                <div className="text-center space-y-1">
                  <h4 className="font-black text-xs leading-snug text-foreground text-balance">
                    {offer.title || "عنوان العرض"}
                  </h4>
                  <p className="text-[10px] text-muted-foreground line-clamp-2">
                    {offer.subtitle}
                  </p>
                </div>

                {/* Product Image */}
                <div className="aspect-square rounded-xl overflow-hidden border border-border/80 bg-muted/20 relative">
                  {offer.productImage ? (
                    <img src={offer.productImage} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground text-[10px]">
                      صورة المنتج المعروض
                    </div>
                  )}
                  {calculatedSavingsPercent > 0 && (
                    <div className="absolute top-2 start-2 px-2 py-0.5 rounded-md bg-rose-600 text-white font-bold text-[10px]">
                      وفر {calculatedSavingsPercent}%
                    </div>
                  )}
                </div>

                {/* Pricing */}
                <div className="p-2.5 rounded-xl bg-muted/40 border border-border/60 text-center space-y-0.5">
                  <div className="flex items-baseline justify-center gap-2">
                    <span className="font-black text-base text-emerald-600 tabular-nums">
                      {calculatedOfferPrice} ج.م
                    </span>
                    {offer.originalPrice > calculatedOfferPrice && (
                      <span className="line-through text-muted-foreground text-xs tabular-nums">
                        {offer.originalPrice} ج.م
                      </span>
                    )}
                  </div>
                  {calculatedSavings > 0 && (
                    <p className="text-[10px] font-bold text-emerald-700">
                      وفرت {calculatedSavings} ج.م!
                    </p>
                  )}
                  {offer.freeShipping && (
                    <p className="text-[9px] text-muted-foreground flex items-center justify-center gap-1 pt-1">
                      <Truck className="w-3 h-3 text-emerald-600" />
                      شحن مجاني مع نفس الطرد
                    </p>
                  )}
                </div>

                {/* Features */}
                {offer.features && offer.features.length > 0 && (
                  <ul className="space-y-1 text-[10px] text-foreground">
                    {offer.features.slice(0, 3).map((f, i) => (
                      <li key={i} className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                        <span className="line-clamp-1">{f}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {/* Buttons */}
                <div className="space-y-1.5 pt-2">
                  <button
                    type="button"
                    className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 text-white font-black text-xs shadow-md"
                  >
                    {offer.acceptButtonText || "نعم! أضف هذا العرض لطلبي"}
                  </button>
                  <p className="text-[10px] text-muted-foreground text-center underline">
                    {offer.declineButtonText || "لا شكراً، اكتفِ بطلبي الأصلي فقط"}
                  </p>
                </div>
              </div>

            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
