import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Check, Split } from "lucide-react";
import { toast } from "sonner";
import { tToast } from "../../utils/i18n-toast";
import {
  facebookAdsService,
  CreateAdTestData,
  FacebookCampaign,
} from "../../services/facebookAdsService";
import { CreateABTestVariantsStep } from "./CreateABTestVariantsStep";
import { CreateABTestReview } from "./CreateABTestReview";

const CreateABTest: React.FC = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [campaigns, setCampaigns] = useState<FacebookCampaign[]>([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(true);

  const [formData, setFormData] = useState<CreateAdTestData>({
    name: "",
    description: "",
    testType: "CREATIVE",
    campaignId: "",
    variants: [{ name: "Variant A" }, { name: "Variant B" }],
    trafficSplit: 50,
    minimumResults: 100,
    autoPromote: false,
  });

  const totalSteps = 3;

  useEffect(() => {
    loadCampaigns();
  }, []);

  const loadCampaigns = async () => {
    try {
      setLoadingCampaigns(true);
      const data = await facebookAdsService.getCampaigns();
      setCampaigns(
        (data || []).filter((c) => c.status === "ACTIVE" || c.status === "PAUSED"),
      );
    } catch (error: any) {
      console.error("Error loading campaigns:", error);
      tToast.error("CreateABTest.failed_load_c1ee");
    } finally {
      setLoadingCampaigns(false);
    }
  };

  const handleInputChange = (field: keyof CreateAdTestData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleVariantChange = (index: number, field: string, value: any) => {
    const updatedVariants = [...formData.variants];
    updatedVariants[index] = { ...updatedVariants[index], [field]: value };
    setFormData((prev) => ({ ...prev, variants: updatedVariants }));
  };

  const handleAddVariant = () => {
    const nextLetter = String.fromCharCode(65 + formData.variants.length);
    setFormData((prev) => ({
      ...prev,
      variants: [...prev.variants, { name: `Variant ${nextLetter}` }],
    }));
  };

  const handleRemoveVariant = (index: number) => {
    if (formData.variants.length <= 2) {
      toast.error("الحد الأدنى لمتغيرات الاختبار هو متغيرين");
      return;
    }
    setFormData((prev) => ({
      ...prev,
      variants: prev.variants.filter((_, i) => i !== index),
    }));
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        if (!formData.name.trim()) {
          tToast.error("CreateABTest.please_name_d31f");
          return false;
        }
        if (!formData.testType) {
          tToast.error("CreateABTest.msg_2a40");
          return false;
        }
        return true;
      case 2:
        if (!formData.campaignId) {
          tToast.error("CreateABTest.msg_c09f");
          return false;
        }
        if (formData.variants.length < 2) {
          tToast.error("CreateABTest.please_add_6156");
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
    if (!validateStep(currentStep)) return;

    try {
      setLoading(true);
      await facebookAdsService.createAdTest(formData);
      tToast.success("CreateABTest.success_create_2b73");
      navigate("/advertising/facebook-ads/tests");
    } catch (error: any) {
      console.error("Error creating test:", error);
      toast.error(error?.response?.data?.error || "فشل في إنشاء الاختبار");
    } finally {
      setLoading(false);
    }
  };

  const testTypes = [
    {
      value: "CREATIVE",
      label: "Creative",
      description: "اختبار صور أو نصوص مختلفة",
    },
    {
      value: "TARGETING",
      label: "Targeting",
      description: "اختبار جماهير مستهدفة مختلفة",
    },
    { value: "BUDGET", label: "Budget", description: "اختبار ميزانيات مختلفة" },
    {
      value: "PLACEMENT",
      label: "Placement",
      description: "اختبار مواقع عرض مختلفة",
    },
  ];

  return (
    <div className="space-y-4 max-w-5xl mx-auto pb-12" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/70">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate("/advertising/facebook-ads/tests")}
            className="p-2 rounded-xl border border-border/70 bg-card text-muted-foreground hover:text-foreground hover:bg-muted/40 active:scale-[0.96] transition-all"
            title="رجوع"
          >
            <ArrowRight className="h-4 w-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-primary/10 text-primary">
                <Split className="h-5 w-5" />
              </span>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                إنشاء اختبار A/B
              </h1>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              أنشئ تجربة علمية لمقارنة أداء التصاميم، الجماهير، أو الميزانيات
            </p>
          </div>
        </div>
      </div>

      {/* Progress Steps Strip */}
      <div className="bg-card rounded-2xl border border-border/70 p-4 shadow-2xs">
        <div className="flex items-center justify-between">
          {[1, 2, 3].map((step) => (
            <React.Fragment key={step}>
              <div className="flex flex-col items-center flex-1">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    step < currentStep
                      ? "bg-primary text-primary-foreground"
                      : step === currentStep
                        ? "bg-foreground text-background"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  {step < currentStep ? <Check className="w-4 h-4" /> : <span>{step}</span>}
                </div>
                <p
                  className={`mt-1.5 text-xs font-semibold ${
                    step <= currentStep ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {step === 1 && "معلومات الاختبار"}
                  {step === 2 && "المتغيرات والحملة"}
                  {step === 3 && "المراجعة والتأكيد"}
                </p>
              </div>
              {step < 3 && (
                <div
                  className={`flex-1 h-0.5 mx-2 rounded-full ${
                    step < currentStep ? "bg-primary" : "bg-border/60"
                  }`}
                />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Form Content */}
      <div className="bg-card rounded-2xl border border-border/70 p-5 shadow-2xs space-y-4">
        {/* Step 1: Test Info */}
        {currentStep === 1 && (
          <div className="space-y-4 text-xs">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                اسم الاختبار <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                className="w-full px-3 py-2 text-xs border border-border/70 rounded-xl bg-muted/20 text-foreground focus:outline-hidden"
                placeholder="مثال: اختبار Creative - موسم الصيف"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">الوصف</label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange("description", e.target.value)}
                className="w-full px-3 py-2 text-xs border border-border/70 rounded-xl bg-muted/20 text-foreground focus:outline-hidden"
                rows={3}
                placeholder="تفاصيل الهدف من الاختبار والفرضية الأساسية…"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                نوع الاختبار <span className="text-destructive">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {testTypes.map((type) => (
                  <label
                    key={type.value}
                    className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                      formData.testType === type.value
                        ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                        : "border-border/70 bg-card hover:bg-muted/20"
                    }`}
                  >
                    <input
                      type="radio"
                      name="testType"
                      value={type.value}
                      checked={formData.testType === type.value}
                      onChange={(e) => handleInputChange("testType", e.target.value)}
                      className="mt-0.5 text-primary focus:ring-0"
                    />
                    <div>
                      <p className="font-bold text-xs text-foreground">{type.label}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{type.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Campaign & Variants Subcomponent */}
        {currentStep === 2 && (
          <CreateABTestVariantsStep
            formData={formData}
            campaigns={campaigns}
            loadingCampaigns={loadingCampaigns}
            onInputChange={handleInputChange}
            onVariantChange={handleVariantChange}
            onAddVariant={handleAddVariant}
            onRemoveVariant={handleRemoveVariant}
          />
        )}

        {/* Step 3: Review Subcomponent */}
        {currentStep === 3 && (
          <CreateABTestReview
            formData={formData}
            campaigns={campaigns}
            testTypes={testTypes}
          />
        )}

        {/* Footer Navigation Buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-border/60">
          {currentStep > 1 ? (
            <button
              type="button"
              onClick={handlePrevious}
              className="px-4 py-2 text-xs font-semibold rounded-xl border border-border/70 bg-card hover:bg-muted/30 text-foreground transition-colors"
            >
              السابق
            </button>
          ) : (
            <div />
          )}

          {currentStep < totalSteps ? (
            <button
              type="button"
              onClick={handleNext}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all active:scale-[0.98]"
            >
              <span>التالي</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all active:scale-[0.98] shadow-xs disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>{loading ? "جاري إنشاء الاختبار…" : "بدء اختبار A/B الآن"}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreateABTest;
