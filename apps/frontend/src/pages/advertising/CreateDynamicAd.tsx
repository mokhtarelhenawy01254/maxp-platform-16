import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Layers,
  Sparkles,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { tToast } from "../../utils/i18n-toast";
import {
  facebookAdsService,
  CreateDynamicAdData,
  FacebookProductCatalog,
} from "../../services/facebookAdsService";
import { CreateDynamicAdReview } from "./CreateDynamicAdReview";

export const CreateDynamicAd: React.FC = () => {
  const { adSetId } = useParams<{ adSetId: string }>();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [catalogs, setCatalogs] = useState<FacebookProductCatalog[]>([]);
  const [productSets, setProductSets] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const [formData, setFormData] = useState<CreateDynamicAdData>({
    name: "",
    catalogId: "",
    productSetId: "",
    status: "PAUSED",
    headline: "",
    description: "",
    callToAction: "SHOP_NOW",
  });

  const totalSteps = 3;

  useEffect(() => {
    loadCatalogs();
  }, []);

  useEffect(() => {
    if (formData.catalogId) {
      loadProductSets();
    }
  }, [formData.catalogId]);

  const loadCatalogs = async () => {
    try {
      setLoadingData(true);
      const data = await facebookAdsService.getCatalogs();
      setCatalogs((data || []).filter((c) => c.status === "ACTIVE"));
    } catch (error: any) {
      console.error("Error loading catalogs:", error);
      tToast.error("CreateDynamicAd.failed_load_54a9");
    } finally {
      setLoadingData(false);
    }
  };

  const loadProductSets = async () => {
    if (!formData.catalogId) return;
    try {
      const sets = await facebookAdsService.getProductSets(formData.catalogId);
      setProductSets(sets || []);
    } catch (error: any) {
      console.error("Error loading product sets:", error);
      tToast.error("CreateDynamicAd.failed_load_fa45");
    }
  };

  const handleInputChange = (field: keyof CreateDynamicAdData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        if (!formData.name.trim()) {
          tToast.error("CreateDynamicAd.please_name_e56c");
          return false;
        }
        if (!formData.catalogId) {
          tToast.error("CreateDynamicAd.msg_8fe0");
          return false;
        }
        return true;
      case 2:
        if (!formData.productSetId) {
          tToast.error("CreateDynamicAd.msg_b753");
          return false;
        }
        return true;
      case 3:
        return true;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep < totalSteps) {
        setCurrentStep(currentStep + 1);
      }
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    if (!validateStep(currentStep) || !adSetId) return;

    try {
      setLoading(true);
      await facebookAdsService.createDynamicAd(adSetId, formData);
      tToast.success("CreateDynamicAd.success_create_6286");
      navigate(-1);
    } catch (error: any) {
      console.error("Error creating dynamic ad:", error);
      toast.error(error?.response?.data?.error || "فشل في إنشاء Dynamic Ad");
    } finally {
      setLoading(false);
    }
  };

  if (!adSetId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] p-6 text-center">
        <AlertTriangle className="h-8 w-8 text-destructive mb-2" />
        <p className="text-sm font-medium text-foreground">معرف المجموعة الإعلانية (AdSet) غير موجود</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 h-full overflow-hidden bg-background">
      {/* 1. TOP COMMAND BAR */}
      <header className="h-auto min-h-12 border-b border-border/70 px-3 sm:px-4 py-2 bg-card/95 backdrop-blur-md flex flex-wrap sm:flex-nowrap items-center justify-between gap-2.5 shrink-0 z-10">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            onClick={() => navigate(-1)}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            title="رجوع"
          >
            <ArrowRight className="h-4 w-4" />
          </button>
          <div className="min-w-0">
            <h1 className="text-xs sm:text-sm font-bold text-foreground truncate">
              إنشاء إعلان كتالوج ديناميكي (DPA)
            </h1>
            <p className="text-[11px] text-muted-foreground truncate">
              Dynamic Product Ad
            </p>
          </div>
        </div>

        {/* Step Indicator Badges */}
        <div className="flex items-center gap-1.5 shrink-0 text-xs">
          {[
            { step: 1, label: "بيانات الإعلان" },
            { step: 2, label: "مجموعة المنتجات" },
            { step: 3, label: "المراجعة" },
          ].map((item) => (
            <div
              key={item.step}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium border ${
                item.step === currentStep
                  ? "bg-primary text-primary-foreground border-primary"
                  : item.step < currentStep
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                    : "bg-muted/40 text-muted-foreground border-border/60"
              }`}
            >
              {item.step < currentStep ? (
                <CheckCircle2 className="h-3 w-3" />
              ) : (
                <span className="font-mono text-[10px]">{item.step}</span>
              )}
              <span className="hidden sm:inline">{item.label}</span>
            </div>
          ))}
        </div>
      </header>

      {/* 2. CHASSIS SURFACE BODY */}
      <main className="flex-1 overflow-y-auto min-h-0 bg-background divide-y divide-border/60">
        <div className="p-4 sm:p-5 max-w-2xl mx-auto space-y-4">
          
          {/* Step 1: Ad Info */}
          {currentStep === 1 && (
            <div className="p-4 rounded-md border border-border/70 bg-card space-y-3.5">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  اسم الإعلان *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-md border border-border/80 bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                  placeholder="مثال: Dynamic Ad - منتجات موسم الصيف"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  كتالوج المنتجات (Catalog) *
                </label>
                {loadingData ? (
                  <div className="p-3 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>جاري تحميل الكتالوجات...</span>
                  </div>
                ) : catalogs.length === 0 ? (
                  <div className="p-3 rounded-md bg-amber-500/10 border border-amber-500/20 text-xs text-amber-600 dark:text-amber-400">
                    لا توجد كتالوجات مفعلة. يرجى ربط كتالوج منتجات فيسبوك أولاً.
                  </div>
                ) : (
                  <select
                    value={formData.catalogId}
                    onChange={(e) => handleInputChange("catalogId", e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-md border border-border/80 bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                    required
                  >
                    <option value="">اختر كتالوج المنتجات</option>
                    {catalogs.map((catalog) => (
                      <option key={catalog.id} value={catalog.id}>
                        {catalog.name} ({catalog.productCount ?? catalog.syncedProducts ?? 0} منتج)
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  العنوان الترويجي (Headline)
                </label>
                <input
                  type="text"
                  value={formData.headline}
                  onChange={(e) => handleInputChange("headline", e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-md border border-border/80 bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                  placeholder="مثال: تشكيلة حصرية مع شحن سريع"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  النص الأساسي للإعلان (Description)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleInputChange("description", e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-md border border-border/80 bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary leading-relaxed"
                  rows={3}
                  placeholder="اكتب رسالة الإعلان الترويجية..."
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  زر الحث على اتخاذ إجراء (CTA)
                </label>
                <select
                  value={formData.callToAction}
                  onChange={(e) => handleInputChange("callToAction", e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-md border border-border/80 bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                >
                  <option value="SHOP_NOW">تسوق الآن (Shop Now)</option>
                  <option value="LEARN_MORE">اعرف المزيد (Learn More)</option>
                  <option value="SIGN_UP">سجل الآن (Sign Up)</option>
                  <option value="DOWNLOAD">تحميل (Download)</option>
                </select>
              </div>
            </div>
          )}

          {/* Step 2: Product Set */}
          {currentStep === 2 && (
            <div className="p-4 rounded-md border border-border/70 bg-card space-y-3.5">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  مجموعة المنتجات (Product Set) *
                </label>
                {productSets.length === 0 ? (
                  <div className="p-3 rounded-md bg-amber-500/10 border border-amber-500/20 text-xs text-amber-600 dark:text-amber-400">
                    لا توجد مجموعات منتجات (Product Sets) مرتبطة بهذا الكتالوج.
                  </div>
                ) : (
                  <select
                    value={formData.productSetId}
                    onChange={(e) => handleInputChange("productSetId", e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-md border border-border/80 bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                    required
                  >
                    <option value="">اختر مجموعة المنتجات</option>
                    {productSets.map((set) => (
                      <option key={set.id} value={set.id}>
                        {set.name} ({set.product_count ?? set.productCount ?? 0} منتج)
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="p-3 rounded-md border border-primary/20 bg-primary/[0.04] text-[11px] text-muted-foreground leading-relaxed">
                <span className="font-semibold text-foreground">ملاحظة ذكية: </span>
                يقوم محرك فيسبوك باختيار وعرض المنتجات الأكثر ملاءمة لكل مستخدم تلقائياً من المجموعة المحددة بناءً على اهتماماته وسلوكه الشرائي.
              </div>
            </div>
          )}

          {/* Step 3: Review */}
          {currentStep === 3 && (
            <CreateDynamicAdReview
              formData={formData}
              catalogs={catalogs}
              productSets={productSets}
            />
          )}

          {/* Navigation Controls */}
          <div className="flex items-center justify-between pt-3">
            <button
              type="button"
              onClick={handlePrevious}
              disabled={currentStep === 1}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md border border-border/80 bg-card hover:bg-muted text-foreground transition-all active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight className="h-3.5 w-3.5" />
              <span>السابق</span>
            </button>

            {currentStep < totalSteps ? (
              <button
                type="button"
                onClick={handleNext}
                className="inline-flex items-center gap-1 px-4 py-1.5 text-xs font-semibold rounded-md bg-primary hover:bg-primary/90 text-primary-foreground transition-all active:scale-[0.97]"
              >
                <span>التالي</span>
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-md bg-primary hover:bg-primary/90 text-primary-foreground transition-all active:scale-[0.97] disabled:opacity-50"
              >
                <Sparkles className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                <span>{loading ? "جاري الإنشاء..." : "إنشاء الإعلان الديناميكي"}</span>
              </button>
            )}
          </div>

        </div>
      </main>
    </div>
  );
};

export default CreateDynamicAd;
