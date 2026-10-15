import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Plus,
  AlertTriangle,
  FolderPlus,
  Loader2,
  Save,
} from "lucide-react";
import { toast } from "sonner";
import { tToast } from "../../utils/i18n-toast";
import {
  facebookAdsService,
  CreateCatalogData,
} from "../../services/facebookAdsService";

export const CreateCatalog: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<CreateCatalogData>({
    name: "",
    description: "",
    businessId: "",
    catalogType: "PRODUCTS",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [adAccounts, setAdAccounts] = useState<any[]>([]);

  useEffect(() => {
    loadAdAccounts();
  }, []);

  const loadAdAccounts = async () => {
    try {
      const data = await facebookAdsService.getAdAccounts();
      setAdAccounts(data || []);
    } catch (error) {
      console.error("Error loading ad accounts:", error);
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors["name"] = "اسم كتالوج المنتجات مطلوب";
    if (!formData.businessId.trim())
      newErrors["businessId"] = "معرف الحساب التجاري Facebook Business ID مطلوب";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      setLoading(true);
      await facebookAdsService.createCatalog(formData);
      tToast.success("CreateCatalog.success_create_8f33");
      navigate("/advertising/facebook-ads/catalogs");
    } catch (error: any) {
      console.error("Error creating catalog:", error);
      const errorMsg = error?.response?.data?.error || "فشل في إنشاء الكتالوج في فيسبوك";
      toast.error(errorMsg);

      if (errorMsg.toLowerCase().includes("name")) {
        setErrors((prev) => ({ ...prev, name: errorMsg }));
      } else if (errorMsg.toLowerCase().includes("business")) {
        setErrors((prev) => ({ ...prev, businessId: errorMsg }));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      const newErrors = { ...errors };
      delete newErrors[name];
      setErrors(newErrors);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 h-full overflow-hidden bg-background" dir="rtl">
      {/* 1. TOP COMMAND BAR */}
      <header className="h-auto min-h-12 border-b border-border/70 px-3 sm:px-4 py-2 bg-card/95 backdrop-blur-md flex flex-wrap sm:flex-nowrap items-center justify-between gap-2.5 shrink-0 z-10">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={() => navigate("/advertising/facebook-ads/catalogs")}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            title="رجوع للكتالوجات"
          >
            <ArrowRight className="h-4 w-4" />
          </button>
          <div className="min-w-0">
            <h1 className="text-xs sm:text-sm font-bold text-foreground truncate">
              إنشاء كتالوج منتجات جديد (Product Catalog)
            </h1>
            <p className="text-[11px] text-muted-foreground truncate">
              تكوين كتالوج إعلانات Meta Commerce المتوافق مع Meta Graph API
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => navigate("/advertising/facebook-ads/catalogs")}
            className="px-3 py-1 text-xs font-medium rounded-md border border-border/80 bg-card hover:bg-muted text-foreground transition-colors"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold text-primary-foreground bg-primary hover:bg-primary/90 transition-all active:scale-[0.97] disabled:opacity-50"
          >
            <Save className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>{loading ? "جاري الإنشاء..." : "إنشاء الكتالوج الآن"}</span>
          </button>
        </div>
      </header>

      {/* 2. CHASSIS SURFACE BODY */}
      <main className="flex-1 overflow-y-auto min-h-0 bg-background divide-y divide-border/60">
        <div className="p-4 sm:p-5 max-w-2xl mx-auto space-y-4">
          
          <form onSubmit={handleSubmit} className="p-4 sm:p-5 rounded-md border border-border/70 bg-card space-y-4">
            <div className="flex items-center justify-between pb-2.5 border-b border-border/50">
              <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                <FolderPlus className="h-4 w-4 text-primary" />
                <span>بيانات الكتالوج وحساب الأعمال</span>
              </div>
              <span className="text-[10px] text-muted-foreground font-mono">
                Meta Commerce Manager
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Catalog Name */}
              <div className="space-y-1.5">
                <label htmlFor="name" className="text-xs font-semibold text-foreground flex items-center justify-between">
                  <span>اسم الكتالوج *</span>
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="مثال: كتالوج المنتجات الرئيسي - صيف 2026"
                  className={`w-full px-3 py-1.5 text-xs rounded-md border bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary ${
                    errors["name"] ? "border-destructive text-destructive" : "border-border/80"
                  }`}
                />
                {errors["name"] && (
                  <p className="text-[10px] text-destructive flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    <span>{errors["name"]}</span>
                  </p>
                )}
              </div>

              {/* Business ID */}
              <div className="space-y-1.5">
                <label htmlFor="businessId" className="text-xs font-semibold text-foreground flex items-center justify-between">
                  <span>Facebook Business ID *</span>
                </label>
                <input
                  type="text"
                  id="businessId"
                  name="businessId"
                  dir="ltr"
                  value={formData.businessId}
                  onChange={handleChange}
                  placeholder="مثال: 102938475612345"
                  className={`w-full px-3 py-1.5 text-xs font-mono rounded-md border bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary ${
                    errors["businessId"] ? "border-destructive" : "border-border/80"
                  }`}
                />
                {errors["businessId"] ? (
                  <p className="text-[10px] text-destructive flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    <span>{errors["businessId"]}</span>
                  </p>
                ) : (
                  <p className="text-[10px] text-muted-foreground">
                    يمكنك استخراجه من إعدادات Meta Business Manager
                  </p>
                )}
              </div>
            </div>

            {/* Ad Account Selection */}
            <div className="space-y-1.5">
              <label htmlFor="adAccountId" className="text-xs font-semibold text-foreground">
                الحساب الإعلاني المقترن (Ad Account - اختياري)
              </label>
              <select
                id="adAccountId"
                name="adAccountId"
                value={formData.adAccountId || ""}
                onChange={handleChange}
                className="w-full px-3 py-1.5 text-xs rounded-md border border-border/80 bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
              >
                <option value="">اختر حساب إعلاني لربطه تلقائياً بالكتالوج...</option>
                {adAccounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name} ({account.account_id})
                  </option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label htmlFor="description" className="text-xs font-semibold text-foreground">
                الوصف التوضيحي (اختياري)
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                placeholder="وصف مختصر للغرض من الكتالوج أو التشكيلة المعنية..."
                className="w-full px-3 py-1.5 text-xs rounded-md border border-border/80 bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary leading-relaxed"
              />
            </div>

          </form>

        </div>
      </main>
    </div>
  );
};

export default CreateCatalog;
