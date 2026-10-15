import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  ArrowRight,
  Plus,
  AlertCircle,
  FolderPlus,
  Building2,
  Sparkles
} from "lucide-react";
import { toast } from "sonner";
import { tToast } from "../../utils/i18n-toast";
import {
  facebookAdsService,
  CreateCatalogData,
} from "../../services/facebookAdsService";

const CreateCatalog: React.FC = () => {
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
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6" dir="rtl">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/70 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <Link
              to="/advertising/facebook-ads/catalogs"
              className="p-1.5 rounded-lg border border-border/70 bg-card hover:bg-muted/40 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowRight className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-xl font-black text-foreground">
                إنشاء كتالوج منتجات جديد (Product Catalog)
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                تكوين كتالوج إعلانات فيسبوك وديناميكيات المنتجات المتوافقة مع Meta Graph API
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/advertising/facebook-ads/catalogs"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/70 bg-card hover:bg-muted/40 text-xs font-semibold text-foreground transition-colors"
          >
            إلغاء والعودة
          </Link>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-card border border-border/70 rounded-xl p-5 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-border/40 pb-3">
            <div className="flex items-center gap-2 text-xs font-bold text-foreground">
              <FolderPlus className="w-4 h-4 text-primary" />
              <span>بيانات الكتالوج وحساب الأعمال</span>
            </div>
            <span className="text-[11px] text-muted-foreground font-mono">
              Meta Commerce Manager
            </span>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {/* Catalog Name */}
            <div className="space-y-1.5">
              <label htmlFor="name" className="text-xs font-bold text-foreground flex items-center justify-between">
                <span>اسم الكتالوج</span>
                <span className="text-[10px] text-destructive font-medium">* مطلوب</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="مثال: كتالوج المتجر الرئيسي - صيف 2026"
                className={`w-full px-3 py-2 border rounded-lg bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary ${
                  errors["name"] ? "border-destructive" : "border-border/70"
                }`}
              />
              {errors["name"] && (
                <p className="text-[11px] text-destructive flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{errors["name"]}</span>
                </p>
              )}
            </div>

            {/* Business ID */}
            <div className="space-y-1.5">
              <label htmlFor="businessId" className="text-xs font-bold text-foreground flex items-center justify-between">
                <span>Facebook Business ID</span>
                <span className="text-[10px] text-destructive font-medium">* مطلوب</span>
              </label>
              <input
                type="text"
                id="businessId"
                name="businessId"
                dir="ltr"
                value={formData.businessId}
                onChange={handleChange}
                placeholder="مثال: 102938475612345"
                className={`w-full px-3 py-2 border rounded-lg bg-background text-xs font-mono text-left text-foreground focus:outline-none focus:ring-1 focus:ring-primary ${
                  errors["businessId"] ? "border-destructive" : "border-border/70"
                }`}
              />
              {errors["businessId"] ? (
                <p className="text-[11px] text-destructive flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{errors["businessId"]}</span>
                </p>
              ) : (
                <p className="text-[11px] text-muted-foreground">
                  يمكنك استخراجه من إعدادات Meta Business Manager.
                </p>
              )}
            </div>
          </div>

          {/* Ad Account Selection */}
          <div className="space-y-1.5">
            <label htmlFor="adAccountId" className="text-xs font-bold text-foreground block">
              الحساب الإعلاني المقترن (Ad Account - اختياري)
            </label>
            <select
              id="adAccountId"
              name="adAccountId"
              value={formData.adAccountId || ""}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-border/70 rounded-lg bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
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
            <label htmlFor="description" className="text-xs font-bold text-foreground block">
              الوصف التوضيحي (اختياري)
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              placeholder="وصف مختصر للغرض من الكتالوج أو التشكيلة المعنية..."
              className="w-full px-3 py-2 border border-border/70 rounded-lg bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
            />
          </div>

          {/* Action Row */}
          <div className="pt-3 border-t border-border/40 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => navigate("/advertising/facebook-ads/catalogs")}
              className="px-4 py-2 border border-border/70 rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-50"
            >
              {loading ? (
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Plus className="w-3.5 h-3.5" />
              )}
              <span>{loading ? "جارِ الإنشاء..." : "إنشاء الكتالوج الآن"}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default CreateCatalog;
