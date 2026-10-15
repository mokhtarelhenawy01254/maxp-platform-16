import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { 
  ArrowRight, 
  Users, 
  Globe, 
  Percent, 
  Sparkles, 
  AlertCircle,
  CheckCircle2,
  Sliders
} from "lucide-react";
import { toast } from "sonner";
import { tToast } from "../../utils/i18n-toast";
import {
  facebookAdsService,
  CreateLookalikeAudienceData,
  FacebookCustomAudience,
  FacebookAdAccount,
} from "../../services/facebookAdsService";

const CreateLookalikeAudience: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [customAudiences, setCustomAudiences] = useState<FacebookCustomAudience[]>([]);
  const [adAccounts, setAdAccounts] = useState<FacebookAdAccount[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const [formData, setFormData] = useState<CreateLookalikeAudienceData>({
    name: "",
    description: "",
    sourceAudienceId: "",
    country: "EG",
    ratio: 1,
    adAccountId: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoadingData(true);
      const [audiences, accounts] = await Promise.all([
        facebookAdsService.getCustomAudiences(),
        facebookAdsService.getAdAccounts(),
      ]);

      setCustomAudiences(audiences.filter((a) => a.status === "ACTIVE"));
      setAdAccounts(accounts || []);

      if (accounts.length > 0 && !formData.adAccountId) {
        setFormData((prev) => ({ ...prev, adAccountId: accounts[0].id }));
      }
    } catch (error: any) {
      console.error("Error loading data:", error);
      tToast.error("CreateLookalikeAudience.failed_load_9cfe");
    } finally {
      setLoadingData(false);
    }
  };

  const handleInputChange = (
    field: keyof CreateLookalikeAudienceData,
    value: any,
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.sourceAudienceId || !formData.country) {
      tToast.error("CreateLookalikeAudience.msg_30e5");
      return;
    }

    try {
      setLoading(true);
      await facebookAdsService.createLookalikeAudience(formData);
      tToast.success("CreateLookalikeAudience.success_create_ddc4");
      navigate("/advertising/facebook-ads/audiences");
    } catch (error: any) {
      console.error("Error creating lookalike audience:", error);
      toast.error(
        error?.response?.data?.error || "فشل في إنشاء الجمهور المشابه",
      );
    } finally {
      setLoading(false);
    }
  };

  const countries = [
    { value: "EG", label: "مصر (Egypt)" },
    { value: "SA", label: "المملكة العربية السعودية (Saudi Arabia)" },
    { value: "AE", label: "الإمارات العربية المتحدة (UAE)" },
    { value: "KW", label: "الكويت (Kuwait)" },
    { value: "QA", label: "قطر (Qatar)" },
    { value: "US", label: "الولايات المتحدة (United States)" },
    { value: "GB", label: "المملكة المتحدة (United Kingdom)" },
  ];

  if (loadingData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px] text-muted-foreground gap-3" dir="rtl">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <span className="text-xs">جارِ تحميل بيانات الجماهير والحسابات الإعلانية...</span>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6" dir="rtl">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/70 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <Link
              to="/advertising/facebook-ads/audiences"
              className="p-1.5 rounded-lg border border-border/70 bg-card hover:bg-muted/40 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowRight className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-xl font-black text-foreground">
                إنشاء جمهور مشابه (Lookalike Audience)
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                توسيع استهداف الحملات الإعلانية عبر خوارزميات Meta لاستهداف عملاء يشبهون عملاءك الحاليين
              </p>
            </div>
          </div>
        </div>

        <Link
          to="/advertising/facebook-ads/audiences"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/70 bg-card hover:bg-muted/40 text-xs font-semibold text-foreground transition-colors"
        >
          إلغاء والعودة
        </Link>
      </div>

      {/* Main Form Card */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-card border border-border/70 rounded-xl p-5 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-border/40 pb-3">
            <div className="flex items-center gap-2 text-xs font-bold text-foreground">
              <Users className="w-4 h-4 text-primary" />
              <span>معايير الجمهور المشابه والمصدر</span>
            </div>
            <span className="text-[11px] text-muted-foreground font-mono">
              Meta Graph Lookalike API
            </span>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {/* Audience Name */}
            <div className="space-y-1.5">
              <label htmlFor="lookalike-audience-name" className="text-xs font-bold text-foreground flex items-center justify-between">
                <span>اسم الجمهور المشابه</span>
                <span className="text-[10px] text-destructive font-medium">* مطلوب</span>
              </label>
              <input
                id="lookalike-audience-name"
                name="name"
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                className="w-full px-3 py-2 border border-border/70 rounded-lg bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="مثال: جمهور مشابه 1% - المشترين النشطين"
                required
              />
            </div>

            {/* Source Audience Select */}
            <div className="space-y-1.5">
              <label htmlFor="lookalike-source-audience" className="text-xs font-bold text-foreground flex items-center justify-between">
                <span>الجمهور المخصص المصدر (Seed Audience)</span>
                <span className="text-[10px] text-destructive font-medium">* مطلوب</span>
              </label>
              {customAudiences.length === 0 ? (
                <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-700 dark:text-amber-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>لا توجد جماهير مخصصة نشطة. يرجى إنشاء جمهور مخصص أولاً.</span>
                </div>
              ) : (
                <select
                  id="lookalike-source-audience"
                  name="sourceAudienceId"
                  value={formData.sourceAudienceId}
                  onChange={(e) => handleInputChange("sourceAudienceId", e.target.value)}
                  className="w-full px-3 py-2 border border-border/70 rounded-lg bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  required
                >
                  <option value="">اختر الجمهور المصدر لبناء التشابه...</option>
                  {customAudiences.map((audience) => (
                    <option key={audience.id} value={audience.id}>
                      {audience.name} ({audience.audienceSize?.toLocaleString("ar-EG") || 0} عميل)
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label htmlFor="lookalike-audience-description" className="text-xs font-bold text-foreground block">
              الوصف والهدف (اختياري)
            </label>
            <textarea
              id="lookalike-audience-description"
              name="description"
              value={formData.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
              className="w-full px-3 py-2 border border-border/70 rounded-lg bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
              rows={2}
              placeholder="وصف مختصر للجمهور المستهدف ونطاق الحملة..."
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4 pt-1">
            {/* Country */}
            <div className="space-y-1.5">
              <label htmlFor="lookalike-country" className="text-xs font-bold text-foreground block">
                الدولة المستهدفة
              </label>
              <select
                id="lookalike-country"
                name="country"
                value={formData.country}
                onChange={(e) => handleInputChange("country", e.target.value)}
                className="w-full px-3 py-2 border border-border/70 rounded-lg bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                required
              >
                {countries.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Ratio */}
            <div className="space-y-1.5">
              <label htmlFor="lookalike-ratio" className="text-xs font-bold text-foreground flex items-center justify-between">
                <span>نسبة الشبه والتقارب (Ratio)</span>
                <span className="text-[10px] text-muted-foreground font-mono">1% - 10%</span>
              </label>
              <select
                id="lookalike-ratio"
                name="ratio"
                value={formData.ratio}
                onChange={(e) => handleInputChange("ratio", parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-border/70 rounded-lg bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                required
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((ratio) => (
                  <option key={ratio} value={ratio}>
                    {ratio}% — {ratio === 1 ? "أعلى درجات التطابق وأدق استهداف" : ratio === 10 ? "أوسع نطاق وصول جماهيري" : `مستوى تشابه ${ratio}%`}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-muted-foreground">
                كلما انخفضت النسبة (1%)، زاد تقارب الجمهور مع العملاء الفعليين.
              </p>
            </div>
          </div>

          {/* Action Row */}
          <div className="pt-3 border-t border-border/40 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => navigate("/advertising/facebook-ads/audiences")}
              className="px-4 py-2 border border-border/70 rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={loading || customAudiences.length === 0}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{loading ? "جارِ التوليد في فيسبوك..." : "إنشاء الجمهور المشابه الآن"}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default CreateLookalikeAudience;
