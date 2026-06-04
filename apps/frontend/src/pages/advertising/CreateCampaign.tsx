/**
 * Create Campaign Page
 *
 * صفحة إنشاء حملة إعلانية جديدة (Wizard محسّن)
 */

import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronRightIcon,
  ChevronLeftIcon,
  CheckCircleIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import { useAuth } from "../../hooks/useAuthSimple";
import { apiClient } from "../../services/apiClient";
import {
  facebookAdsService,
  CAMPAIGN_OBJECTIVES,
  FacebookAdAccount,
} from "../../services/facebookAdsService";

interface FacebookPixel {
  pixelId: string;
  pixelName: string;
  businessId: string;
  businessName: string;
}

const CreateCampaign: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [adAccounts, setAdAccounts] = useState<FacebookAdAccount[]>([]);
  const [pixels, setPixels] = useState<FacebookPixel[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [loadingPixels, setLoadingPixels] = useState(false);

  // Form data - استخدام interface منفصل لتجنب مشاكل TypeScript strict mode
  interface CampaignFormData {
    name: string;
    objective: string;
    status: "ACTIVE" | "PAUSED";
    budgetType: "DAILY" | "LIFETIME";
    budgetAmount: number;
    startDate: string;
    endDate: string;
    adAccountId: string;
    pixelId: string;
    description: string;
    specialAdCategories: string[];
    budgetOptimization: boolean;
    spendLimit: number | undefined;
    timezone: string;
    buyingType: string;
    bidStrategy: string;
    // Ad Set fields
    conversionLocation: string;
    optimizationGoal: string;
    // Targeting fields
    targetingAgeMin: number;
    targetingAgeMax: number;
    targetingGenders: string[];
    targetingLocations: string[];
    targetingInterests: string[];
    // Placements
    placementType: "AUTOMATIC" | "MANUAL";
    placements: string[];
  }

  const [formData, setFormData] = useState<CampaignFormData>({
    name: "",
    objective: "OUTCOME_TRAFFIC",
    status: "PAUSED",
    budgetType: "DAILY",
    budgetAmount: 100,
    startDate: "",
    endDate: "",
    adAccountId: "",
    pixelId: "",
    description: "",
    specialAdCategories: [],
    budgetOptimization: false,
    spendLimit: undefined,
    timezone: "Africa/Cairo",
    buyingType: "AUCTION",
    bidStrategy: "LOWEST_COST_WITHOUT_CAP",
    // Ad Set defaults
    conversionLocation: "WEBSITE",
    optimizationGoal: "LINK_CLICKS",
    // Targeting defaults
    targetingAgeMin: 18,
    targetingAgeMax: 65,
    targetingGenders: [],
    targetingLocations: ["EG"],
    targetingInterests: [],
    // Placements defaults
    placementType: "AUTOMATIC",
    placements: [],
  });

  const totalSteps = 6; // زيادة الخطوات لتشمل Targeting و Placements

  const loadAdAccounts = useCallback(async () => {
    try {
      setLoadingAccounts(true);
      const accounts = await facebookAdsService.getAdAccounts();
      setAdAccounts(accounts);
      if (accounts.length > 0 && !formData.adAccountId) {
        const defaultAccount =
          accounts.find((account) => account.isActive) || accounts[0];
        setFormData((prev) => ({
          ...prev,
          adAccountId:
            defaultAccount?.account_id || defaultAccount?.id || "",
        }));
      }
    } catch (error: unknown) {
      console.error("Error loading Ad Accounts:", error);
      toast.error("فشل في تحميل حسابات Facebook Ads");
    } finally {
      setLoadingAccounts(false);
    }
  }, [formData.adAccountId]);

  const loadPixels = useCallback(async () => {
    if (!user?.companyId) return;

    try {
      setLoadingPixels(true);
      const response = await apiClient.get("/facebook-oauth/pixels", {
        params: { companyId: user.companyId },
      });

      if (response.data.success && response.data.pixels) {
        setPixels(response.data.pixels);
        if (response.data.pixels.length === 1 && !formData.pixelId) {
          setFormData((prev) => ({
            ...prev,
            pixelId: response.data.pixels[0].pixelId,
          }));
        }
      }
    } catch (error: unknown) {
      console.error("Error loading Pixels:", error);
      // لا نعرض رسالة خطأ لأن Pixel اختياري
    } finally {
      setLoadingPixels(false);
    }
  }, [formData.pixelId, user?.companyId]);

  useEffect(() => {
    void loadAdAccounts();
    void loadPixels();
  }, [loadAdAccounts, loadPixels]);

  const handleInputChange = (
    field: keyof CampaignFormData,
    value: CampaignFormData[keyof CampaignFormData],
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSpecialAdCategoryToggle = (category: string) => {
    setFormData((prev) => {
      const current = prev.specialAdCategories || [];
      const updated = current.includes(category)
        ? current.filter((c) => c !== category)
        : [...current, category];
      return { ...prev, specialAdCategories: updated };
    });
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        if (!formData.name.trim()) {
          toast.error("يرجى إدخال اسم الحملة");
          return false;
        }
        if (!formData.objective) {
          toast.error("يرجى اختيار هدف الحملة");
          return false;
        }
        return true;
      case 2:
        if (!formData.budgetAmount || formData.budgetAmount <= 0) {
          toast.error("يرجى إدخال ميزانية صحيحة");
          return false;
        }
        return true;
      case 3:
        // Targeting validation
        if (!formData.conversionLocation) {
          toast.error("يرجى اختيار مكان التحويل");
          return false;
        }
        if (formData.targetingLocations.length === 0) {
          toast.error("يرجى اختيار موقع جغرافي واحد على الأقل");
          return false;
        }
        return true;
      case 4:
        // Placements validation
        if (
          formData.placementType === "MANUAL" &&
          formData.placements.length === 0
        ) {
          toast.error(
            "يرجى اختيار موضع واحد على الأقل أو استخدام المواضع التلقائية",
          );
          return false;
        }
        return true;
      case 5:
        return true; // Advanced settings are optional
      case 6:
        return true; // Review step
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
    if (!validateStep(6)) {
      return;
    }

    try {
      setLoading(true);
      // إرسال كل البيانات للـ Backend
      const campaignData = {
        name: formData.name,
        objective: formData.objective,
        status: formData.status || "PAUSED",
        budgetType: formData.budgetType,
        budgetAmount: formData.budgetAmount,
        startDate: formData.startDate || undefined,
        endDate: formData.endDate || undefined,
        adAccountId: formData.adAccountId || undefined,
        pixelId: formData.pixelId || undefined,
        // Campaign settings
        description: formData.description || undefined,
        specialAdCategories: formData.specialAdCategories?.length
          ? formData.specialAdCategories
          : undefined,
        budgetOptimization: formData.budgetOptimization || false,
        spendLimit: formData.spendLimit || undefined,
        timezone: formData.timezone || "Africa/Cairo",
        buyingType: formData.buyingType || "AUCTION",
        bidStrategy: formData.bidStrategy || "LOWEST_COST_WITHOUT_CAP",
        // Targeting settings
        conversionLocation: formData.conversionLocation,
        optimizationGoal: formData.optimizationGoal,
        targeting: {
          ageMin: formData.targetingAgeMin,
          ageMax: formData.targetingAgeMax,
          genders:
            formData.targetingGenders.length > 0
              ? formData.targetingGenders
              : undefined,
          locations: formData.targetingLocations,
          interests:
            formData.targetingInterests.length > 0
              ? formData.targetingInterests
              : undefined,
        },
        // Placements settings
        placementType: formData.placementType,
        placements:
          formData.placementType === "MANUAL" ? formData.placements : undefined,
      };

      const campaign = await facebookAdsService.createCampaign(campaignData);
      toast.success("تم إنشاء الحملة بنجاح!");
      navigate(`/advertising/facebook-ads/campaigns/${campaign.id}`);
    } catch (error: unknown) {
      console.error("Error creating campaign:", error);
      toast.error(
        error &&
          typeof error === "object" &&
          "response" in error &&
          error.response &&
          typeof error.response === "object" &&
          "data" in error.response &&
          error.response.data &&
          typeof error.response.data === "object" &&
          "error" in error.response.data &&
          typeof error.response.data.error === "string"
          ? error.response.data.error
          : "فشل في إنشاء الحملة",
      );
    } finally {
      setLoading(false);
    }
  };

  const getObjectiveDescription = (objective: string) => {
    const obj = CAMPAIGN_OBJECTIVES.find((o) => o.value === objective);
    return obj?.description || "";
  };

  const specialAdCategories = [
    {
      value: "HOUSING",
      label: "إعلانات الإسكان",
      description: "إعلانات عن بيع أو تأجير الممتلكات",
    },
    {
      value: "EMPLOYMENT",
      label: "إعلانات التوظيف",
      description: "إعلانات عن فرص عمل",
    },
    {
      value: "CREDIT",
      label: "إعلانات الائتمان",
      description: "إعلانات عن القروض والتمويل",
    },
  ];

  const timezones = [
    { value: "Africa/Cairo", label: "القاهرة (GMT+2)" },
    { value: "Africa/Casablanca", label: "الدار البيضاء (GMT+1)" },
    { value: "Asia/Dubai", label: "دبي (GMT+4)" },
    { value: "Asia/Riyadh", label: "الرياض (GMT+3)" },
    { value: "Europe/London", label: "لندن (GMT+0)" },
  ];

  const bidStrategies = [
    {
      value: "LOWEST_COST_WITHOUT_CAP",
      label: "أقل تكلفة (بدون حد)",
      description: "Facebook يحصل على أكبر عدد من النتائج بأقل تكلفة",
    },
    {
      value: "LOWEST_COST_WITH_BID_CAP",
      label: "أقل تكلفة (مع حد للمزايدة)",
      description: "تحديد أقصى مبلغ للمزايدة",
    },
    {
      value: "COST_CAP",
      label: "حد التكلفة",
      description: "تحديد متوسط التكلفة لكل نتيجة",
    },
    {
      value: "LOWEST_COST_WITH_MIN_ROAS",
      label: "أقل تكلفة مع ROAS",
      description: "تحقيق حد أدنى من العائد على الإنفاق الإعلاني",
    },
  ];

  const buyingTypes = [
    {
      value: "AUCTION",
      label: "مزاد (Auction)",
      description: "الطريقة الأكثر مرونة - تنافس مع معلنين آخرين",
    },
    {
      value: "RESERVED",
      label: "محجوز (Reserved)",
      description: "حجز مسبق للوصول المضمون - للحملات الكبيرة",
    },
  ];

  const conversionLocations = [
    {
      value: "WEBSITE",
      label: "الموقع الإلكتروني",
      description: "توجيه الزوار لموقعك",
      icon: "🌐",
    },
    {
      value: "APP",
      label: "التطبيق",
      description: "توجيه المستخدمين لتطبيقك",
      icon: "📱",
    },
    {
      value: "MESSENGER",
      label: "Messenger",
      description: "بدء محادثات على Messenger",
      icon: "💬",
    },
    {
      value: "WHATSAPP",
      label: "WhatsApp",
      description: "بدء محادثات على WhatsApp",
      icon: "📲",
    },
    {
      value: "INSTAGRAM",
      label: "Instagram Direct",
      description: "بدء محادثات على Instagram",
      icon: "📸",
    },
    {
      value: "CALLS",
      label: "المكالمات",
      description: "تشجيع الاتصال بنشاطك التجاري",
      icon: "📞",
    },
  ];

  const optimizationGoals = [
    {
      value: "LINK_CLICKS",
      label: "نقرات الرابط",
      description: "أكبر عدد من النقرات على الرابط",
    },
    {
      value: "LANDING_PAGE_VIEWS",
      label: "مشاهدات الصفحة",
      description: "أكبر عدد من مشاهدات صفحة الهبوط",
    },
    {
      value: "IMPRESSIONS",
      label: "مرات الظهور",
      description: "أكبر عدد من مرات ظهور الإعلان",
    },
    {
      value: "REACH",
      label: "الوصول",
      description: "الوصول لأكبر عدد من الأشخاص",
    },
    {
      value: "CONVERSIONS",
      label: "التحويلات",
      description: "أكبر عدد من التحويلات",
    },
    { value: "VALUE", label: "القيمة", description: "أعلى قيمة للتحويلات" },
    {
      value: "LEAD_GENERATION",
      label: "توليد العملاء المحتملين",
      description: "جمع بيانات العملاء المحتملين",
    },
    {
      value: "POST_ENGAGEMENT",
      label: "التفاعل مع المنشور",
      description: "أكبر عدد من التفاعلات",
    },
  ];

  const availablePlacements = [
    { value: "FACEBOOK_FEED", label: "Facebook Feed", platform: "Facebook" },
    {
      value: "FACEBOOK_STORIES",
      label: "Facebook Stories",
      platform: "Facebook",
    },
    { value: "FACEBOOK_REELS", label: "Facebook Reels", platform: "Facebook" },
    {
      value: "FACEBOOK_MARKETPLACE",
      label: "Facebook Marketplace",
      platform: "Facebook",
    },
    {
      value: "FACEBOOK_RIGHT_COLUMN",
      label: "العمود الأيمن",
      platform: "Facebook",
    },
    { value: "INSTAGRAM_FEED", label: "Instagram Feed", platform: "Instagram" },
    {
      value: "INSTAGRAM_STORIES",
      label: "Instagram Stories",
      platform: "Instagram",
    },
    {
      value: "INSTAGRAM_REELS",
      label: "Instagram Reels",
      platform: "Instagram",
    },
    {
      value: "INSTAGRAM_EXPLORE",
      label: "Instagram Explore",
      platform: "Instagram",
    },
    {
      value: "MESSENGER_INBOX",
      label: "Messenger Inbox",
      platform: "Messenger",
    },
    {
      value: "MESSENGER_STORIES",
      label: "Messenger Stories",
      platform: "Messenger",
    },
    {
      value: "AUDIENCE_NETWORK",
      label: "Audience Network",
      platform: "Audience Network",
    },
  ];

  const availableInterests = [
    { value: "SHOPPING", label: "التسوق", category: "سلوكيات" },
    {
      value: "ONLINE_SHOPPING",
      label: "التسوق عبر الإنترنت",
      category: "سلوكيات",
    },
    { value: "FASHION", label: "الموضة", category: "اهتمامات" },
    { value: "TECHNOLOGY", label: "التكنولوجيا", category: "اهتمامات" },
    { value: "SPORTS", label: "الرياضة", category: "اهتمامات" },
    { value: "FOOD", label: "الطعام", category: "اهتمامات" },
    { value: "TRAVEL", label: "السفر", category: "اهتمامات" },
    { value: "BEAUTY", label: "الجمال", category: "اهتمامات" },
    { value: "FITNESS", label: "اللياقة البدنية", category: "اهتمامات" },
    { value: "BUSINESS", label: "الأعمال", category: "اهتمامات" },
    { value: "ENTERTAINMENT", label: "الترفيه", category: "اهتمامات" },
    { value: "GAMING", label: "الألعاب", category: "اهتمامات" },
  ];

  const availableLocations = [
    { value: "EG", label: "مصر 🇪🇬" },
    { value: "SA", label: "السعودية 🇸🇦" },
    { value: "AE", label: "الإمارات 🇦🇪" },
    { value: "KW", label: "الكويت 🇰🇼" },
    { value: "QA", label: "قطر 🇶🇦" },
    { value: "BH", label: "البحرين 🇧🇭" },
    { value: "OM", label: "عمان 🇴🇲" },
    { value: "JO", label: "الأردن 🇯🇴" },
    { value: "LB", label: "لبنان 🇱🇧" },
    { value: "MA", label: "المغرب 🇲🇦" },
    { value: "DZ", label: "الجزائر 🇩🇿" },
    { value: "TN", label: "تونس 🇹🇳" },
    { value: "IQ", label: "العراق 🇮🇶" },
    { value: "LY", label: "ليبيا 🇱🇾" },
    { value: "SD", label: "السودان 🇸🇩" },
  ];

  const handleLocationToggle = (locationCode: string) => {
    setFormData((prev) => ({
      ...prev,
      targetingLocations: prev.targetingLocations.includes(locationCode)
        ? prev.targetingLocations.filter((l) => l !== locationCode)
        : [...prev.targetingLocations, locationCode],
    }));
  };

  const handleInterestToggle = (interest: string) => {
    setFormData((prev) => ({
      ...prev,
      targetingInterests: prev.targetingInterests.includes(interest)
        ? prev.targetingInterests.filter((i) => i !== interest)
        : [...prev.targetingInterests, interest],
    }));
  };

  const handlePlacementToggle = (placement: string) => {
    setFormData((prev) => ({
      ...prev,
      placements: prev.placements.includes(placement)
        ? prev.placements.filter((p) => p !== placement)
        : [...prev.placements, placement],
    }));
  };

  const handleGenderToggle = (gender: string) => {
    setFormData((prev) => ({
      ...prev,
      targetingGenders: prev.targetingGenders.includes(gender)
        ? prev.targetingGenders.filter((g) => g !== gender)
        : [...prev.targetingGenders, gender],
    }));
  };

  return (
    <div className="w-full space-y-6 min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          إنشاء حملة إعلانية جديدة
        </h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          اتبع الخطوات لإنشاء حملة إعلانية على Facebook
        </p>
      </div>

      {/* Progress Steps */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow dark:shadow-gray-900/20 overflow-hidden border-0 dark:border dark:border-gray-700">
        <div className="flex flex-wrap items-start justify-center gap-x-2 gap-y-4 lg:flex-nowrap lg:items-center lg:justify-between">
          {[1, 2, 3, 4, 5, 6].map((step) => (
            <React.Fragment key={step}>
              <div className="flex min-w-[92px] flex-col items-center gap-2 lg:flex-1 lg:min-w-0">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    step < currentStep
                      ? "bg-green-500 dark:bg-green-600 text-white"
                      : step === currentStep
                        ? "bg-indigo-600 dark:bg-indigo-500 text-white"
                        : "bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-400"
                  }`}
                >
                  {step < currentStep ? (
                    <CheckCircleIcon className="w-6 h-6" />
                  ) : (
                    <span>{step}</span>
                  )}
                </div>
                <p
                  className={`text-center text-xs font-medium ${
                    step <= currentStep
                      ? "text-gray-900 dark:text-white"
                      : "text-gray-500 dark:text-gray-400"
                  }`}
                >
                  {step === 1 && "معلومات الحملة"}
                  {step === 2 && "الميزانية"}
                  {step === 3 && "الاستهداف"}
                  {step === 4 && "المواضع"}
                  {step === 5 && "إعدادات متقدمة"}
                  {step === 6 && "المراجعة"}
                </p>
              </div>
              {step < 6 && (
                <div
                  className={`hidden h-1 flex-1 mx-2 min-w-[20px] lg:block ${
                    step < currentStep
                      ? "bg-green-500 dark:bg-green-400"
                      : "bg-gray-200 dark:bg-gray-600"
                  }`}
                />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Form Content */}
      <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow dark:shadow-gray-900/20 border-0 dark:border dark:border-gray-700">
        {/* Step 1: Campaign Info */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              معلومات الحملة
            </h2>

            {/* Campaign Name */}
            <div>
              <label
                htmlFor="create-campaign-name"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                اسم الحملة *
              </label>
              <input
                id="create-campaign-name"
                name="campaignName"
                type="text"
                autoComplete="off"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                placeholder="مثال: حملة صيف 2025"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              />
            </div>

            {/* Description */}
            <div>
              <label
                htmlFor="create-campaign-description"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                الوصف (اختياري)
              </label>
              <textarea
                id="create-campaign-description"
                name="campaignDescription"
                autoComplete="off"
                value={formData.description}
                onChange={(e) =>
                  handleInputChange("description", e.target.value)
                }
                placeholder="وصف الحملة..."
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              />
            </div>

            {/* Campaign Objective */}
            <div>
              <label
                htmlFor="create-campaign-objective"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                هدف الحملة *
              </label>
              <select
                id="create-campaign-objective"
                name="objective"
                autoComplete="off"
                value={formData.objective}
                onChange={(e) => handleInputChange("objective", e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                {CAMPAIGN_OBJECTIVES.map((obj) => (
                  <option key={obj.value} value={obj.value}>
                    {obj.label}
                  </option>
                ))}
              </select>
              {formData.objective && (
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  {getObjectiveDescription(formData.objective)}
                </p>
              )}
            </div>

            {/* Ad Account */}
            {loadingAccounts ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600 dark:border-indigo-400 mx-auto"></div>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  جاري تحميل حسابات Facebook Ads...
                </p>
              </div>
            ) : adAccounts.length > 0 ? (
              <div>
                <label
                  htmlFor="create-campaign-ad-account"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  حساب Facebook Ads *
                </label>
                <select
                  id="create-campaign-ad-account"
                  name="adAccountId"
                  autoComplete="off"
                  value={formData.adAccountId}
                  onChange={(e) =>
                    handleInputChange("adAccountId", e.target.value)
                  }
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                >
                  {adAccounts.map((account) => (
                    <option
                      key={account.id}
                      value={account.account_id || account.id}
                    >
                      {account.name} ({account.currency})
                      {account.isActive ? " - نشط" : ""}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  لا توجد حسابات Facebook Ads متاحة. يرجى ربط حساب Facebook
                  أولاً.
                </p>
              </div>
            )}

            {/* Campaign Status */}
            <div>
              <label
                htmlFor="create-campaign-status"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                حالة الحملة
              </label>
              <select
                id="create-campaign-status"
                name="status"
                autoComplete="off"
                value={formData.status}
                onChange={(e) =>
                  handleInputChange(
                    "status",
                    e.target.value as "ACTIVE" | "PAUSED",
                  )
                }
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="PAUSED">متوقفة (سأفعلها لاحقاً)</option>
                <option value="ACTIVE">نشطة (تبدأ فوراً)</option>
              </select>
            </div>
          </div>
        )}

        {/* Step 2: Budget & Schedule */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">
              الميزانية والجدولة
            </h2>

            {/* Budget Optimization */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="budgetOptimization"
                  checked={formData.budgetOptimization || false}
                  onChange={(e) =>
                    handleInputChange("budgetOptimization", e.target.checked)
                  }
                  className="mt-1 w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                />
                <div className="flex-1">
                  <label
                    htmlFor="budgetOptimization"
                    className="block text-sm font-medium text-gray-900"
                  >
                    تفعيل Campaign Budget Optimization (CBO)
                  </label>
                  <p className="mt-1 text-sm text-gray-600">
                    يسمح لـ Facebook بتوزيع الميزانية تلقائياً بين Ad Sets
                    للحصول على أفضل نتائج
                  </p>
                </div>
              </div>
            </div>

            {/* Budget Type */}
            <div>
              <label
                htmlFor="create-campaign-budget-type"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                نوع الميزانية *
              </label>
              <select
                id="create-campaign-budget-type"
                name="budgetType"
                autoComplete="off"
                value={formData.budgetType}
                onChange={(e) =>
                  handleInputChange(
                    "budgetType",
                    e.target.value as "DAILY" | "LIFETIME",
                  )
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="DAILY">ميزانية يومية</option>
                <option value="LIFETIME">ميزانية إجمالية</option>
              </select>
            </div>

            {/* Budget Amount */}
            <div>
              <label
                htmlFor="create-campaign-budget-amount"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                مبلغ الميزانية (
                {formData.budgetType === "DAILY" ? "يومياً" : "إجمالي"}) *
              </label>
              <div className="relative">
                <input
                  id="create-campaign-budget-amount"
                  name="budgetAmount"
                  type="number"
                  autoComplete="off"
                  min="1"
                  step="0.01"
                  value={formData.budgetAmount}
                  onChange={(e) =>
                    handleInputChange(
                      "budgetAmount",
                      parseFloat(e.target.value) || 0,
                    )
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="100"
                />
                <span className="absolute left-4 top-2 text-gray-500">EGP</span>
              </div>
              <p className="mt-2 text-sm text-gray-500">الحد الأدنى: 1 EGP</p>
            </div>

            {/* Spend Limit */}
            <div>
              <label
                htmlFor="create-campaign-spend-limit"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                حد الإنفاق (اختياري)
              </label>
              <div className="relative">
                <input
                  id="create-campaign-spend-limit"
                  name="spendLimit"
                  type="number"
                  autoComplete="off"
                  min="1"
                  step="0.01"
                  value={formData.spendLimit || ""}
                  onChange={(e) =>
                    handleInputChange(
                      "spendLimit",
                      e.target.value ? parseFloat(e.target.value) : undefined,
                    )
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="حد أقصى للإنفاق"
                />
                <span className="absolute left-4 top-2 text-gray-500">EGP</span>
              </div>
              <p className="mt-2 text-sm text-gray-500">
                حد أقصى للإنفاق على هذه الحملة (اختياري)
              </p>
            </div>

            {/* Timezone */}
            <div>
              <label
                htmlFor="create-campaign-timezone"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                المنطقة الزمنية
              </label>
              <select
                id="create-campaign-timezone"
                name="timezone"
                autoComplete="off"
                value={formData.timezone}
                onChange={(e) => handleInputChange("timezone", e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                {timezones.map((tz) => (
                  <option key={tz.value} value={tz.value}>
                    {tz.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Start Date */}
            <div>
              <label
                htmlFor="create-campaign-start-date"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                تاريخ البدء (اختياري)
              </label>
              <input
                id="create-campaign-start-date"
                name="startDate"
                type="date"
                autoComplete="off"
                value={formData.startDate}
                onChange={(e) => handleInputChange("startDate", e.target.value)}
                min={new Date().toISOString().split("T")[0]}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            {/* End Date */}
            <div>
              <label
                htmlFor="create-campaign-end-date"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                تاريخ الانتهاء (اختياري)
              </label>
              <input
                id="create-campaign-end-date"
                name="endDate"
                type="date"
                autoComplete="off"
                value={formData.endDate}
                onChange={(e) => handleInputChange("endDate", e.target.value)}
                min={
                  formData.startDate || new Date().toISOString().split("T")[0]
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>
        )}

        {/* Step 3: Targeting */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">الاستهداف</h2>
            <p className="text-sm text-gray-600">
              حدد الجمهور المستهدف لإعلاناتك
            </p>

            {/* Conversion Location */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                مكان التحويل *
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {conversionLocations.map((location) => (
                  <div
                    key={location.value}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                      formData.conversionLocation === location.value
                        ? "border-indigo-500 bg-indigo-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                    onClick={() =>
                      handleInputChange("conversionLocation", location.value)
                    }
                  >
                    <div className="text-2xl mb-2">{location.icon}</div>
                    <div className="font-medium text-gray-900">
                      {location.label}
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      {location.description}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Optimization Goal */}
            <div>
              <label
                htmlFor="create-campaign-optimization-goal"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                هدف التحسين *
              </label>
              <select
                id="create-campaign-optimization-goal"
                name="optimizationGoal"
                autoComplete="off"
                value={formData.optimizationGoal}
                onChange={(e) =>
                  handleInputChange("optimizationGoal", e.target.value)
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                {optimizationGoals.map((goal) => (
                  <option key={goal.value} value={goal.value}>
                    {goal.label} - {goal.description}
                  </option>
                ))}
              </select>
            </div>

            {/* Age Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                الفئة العمرية
              </label>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <label
                    htmlFor="create-campaign-age-min"
                    className="block text-xs text-gray-500 mb-1"
                  >
                    من
                  </label>
                  <input
                    id="create-campaign-age-min"
                    name="targetingAgeMin"
                    type="number"
                    autoComplete="off"
                    min="13"
                    max="65"
                    value={formData.targetingAgeMin}
                    onChange={(e) =>
                      handleInputChange(
                        "targetingAgeMin",
                        parseInt(e.target.value),
                      )
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <span className="text-gray-400 mt-5">-</span>
                <div className="flex-1">
                  <label
                    htmlFor="create-campaign-age-max"
                    className="block text-xs text-gray-500 mb-1"
                  >
                    إلى
                  </label>
                  <input
                    id="create-campaign-age-max"
                    name="targetingAgeMax"
                    type="number"
                    autoComplete="off"
                    min="13"
                    max="65"
                    value={formData.targetingAgeMax}
                    onChange={(e) =>
                      handleInputChange(
                        "targetingAgeMax",
                        parseInt(e.target.value),
                      )
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>

            {/* Gender */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                الجنس
              </label>
              <div className="flex gap-3">
                {[
                  { value: "male", label: "ذكور 👨" },
                  { value: "female", label: "إناث 👩" },
                ].map((gender) => (
                  <button
                    key={gender.value}
                    type="button"
                    onClick={() => handleGenderToggle(gender.value)}
                    className={`flex-1 py-3 px-4 rounded-lg border-2 transition-colors ${
                      formData.targetingGenders.includes(gender.value)
                        ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    {gender.label}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-sm text-gray-500">
                {formData.targetingGenders.length === 0
                  ? "الكل (افتراضي)"
                  : `محدد: ${formData.targetingGenders.length}`}
              </p>
            </div>

            {/* Locations */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                المواقع الجغرافية *
              </label>
              <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
                {availableLocations.map((location) => (
                  <button
                    key={location.value}
                    type="button"
                    onClick={() => handleLocationToggle(location.value)}
                    className={`py-2 px-3 rounded-lg border text-sm transition-colors ${
                      formData.targetingLocations.includes(location.value)
                        ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    {location.label}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-sm text-gray-500">
                محدد: {formData.targetingLocations.length} دولة
              </p>
            </div>

            {/* Interests */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                الاهتمامات (اختياري)
              </label>
              <div className="flex flex-wrap gap-2">
                {availableInterests.map((interest) => (
                  <button
                    key={interest.value}
                    type="button"
                    onClick={() => handleInterestToggle(interest.value)}
                    className={`py-2 px-4 rounded-full border text-sm transition-colors ${
                      formData.targetingInterests.includes(interest.value)
                        ? "border-indigo-500 bg-indigo-500 text-white"
                        : "border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    }`}
                  >
                    {interest.label}
                  </button>
                ))}
              </div>
              {formData.targetingInterests.length > 0 && (
                <p className="mt-2 text-sm text-gray-500">
                  محدد: {formData.targetingInterests.length} اهتمام
                </p>
              )}
            </div>
          </div>
        )}

        {/* Step 4: Placements */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">المواضع</h2>
            <p className="text-sm text-gray-600">اختر أين تريد عرض إعلاناتك</p>

            {/* Placement Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                نوع المواضع
              </label>
              <div className="grid grid-cols-2 gap-4">
                <div
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                    formData.placementType === "AUTOMATIC"
                      ? "border-indigo-500 bg-indigo-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                  onClick={() =>
                    handleInputChange("placementType", "AUTOMATIC")
                  }
                >
                  <div className="font-medium text-gray-900">
                    🤖 Advantage+ (تلقائي)
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    Facebook يختار أفضل المواضع تلقائياً لتحقيق أفضل النتائج
                  </div>
                  <div className="mt-2 text-xs text-green-600 font-medium">
                    موصى به
                  </div>
                </div>
                <div
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                    formData.placementType === "MANUAL"
                      ? "border-indigo-500 bg-indigo-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                  onClick={() => handleInputChange("placementType", "MANUAL")}
                >
                  <div className="font-medium text-gray-900">⚙️ يدوي</div>
                  <div className="text-sm text-gray-600 mt-1">
                    اختر المواضع يدوياً للتحكم الكامل
                  </div>
                </div>
              </div>
            </div>

            {/* Manual Placements */}
            {formData.placementType === "MANUAL" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  اختر المواضع
                </label>
                <div className="space-y-4">
                  {[
                    "Facebook",
                    "Instagram",
                    "Messenger",
                    "Audience Network",
                  ].map((platform) => (
                    <div key={platform} className="border rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-3">
                        {platform}
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {availablePlacements
                          .filter((p) => p.platform === platform)
                          .map((placement) => (
                            <button
                              key={placement.value}
                              type="button"
                              onClick={() =>
                                handlePlacementToggle(placement.value)
                              }
                              className={`py-2 px-4 rounded-lg border text-sm transition-colors ${
                                formData.placements.includes(placement.value)
                                  ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                                  : "border-gray-200 hover:border-gray-300"
                              }`}
                            >
                              {placement.label}
                            </button>
                          ))}
                      </div>
                    </div>
                  ))}
                </div>
                {formData.placements.length > 0 && (
                  <p className="mt-3 text-sm text-gray-500">
                    محدد: {formData.placements.length} موضع
                  </p>
                )}
              </div>
            )}

            {formData.placementType === "AUTOMATIC" && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex gap-2">
                  <InformationCircleIcon className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-blue-800 font-medium">
                      Advantage+ Placements
                    </p>
                    <p className="text-sm text-blue-700 mt-1">
                      سيتم عرض إعلاناتك على جميع المنصات المتاحة (Facebook,
                      Instagram, Messenger, Audience Network) وسيقوم Facebook
                      بتحسين التوزيع تلقائياً لتحقيق أفضل النتائج.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 5: Advanced Settings */}
        {currentStep === 5 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">
              إعدادات متقدمة
            </h2>

            {/* Pixel Selection */}
            <div>
              {loadingPixels ? (
                <div className="text-center py-2" aria-live="polite">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600 mx-auto"></div>
                </div>
              ) : pixels.length > 0 ? (
                <>
                  <label
                    htmlFor="create-campaign-pixel-id"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Facebook Pixel (للتتبع)
                  </label>
                  <select
                    id="create-campaign-pixel-id"
                    name="pixelId"
                    autoComplete="off"
                    value={formData.pixelId}
                    onChange={(e) =>
                      handleInputChange("pixelId", e.target.value)
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="">بدون Pixel</option>
                    {pixels.map((pixel) => (
                      <option key={pixel.pixelId} value={pixel.pixelId}>
                        {pixel.pixelName} ({pixel.pixelId})
                      </option>
                    ))}
                  </select>
                </>
              ) : (
                <div className="p-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg">
                  <p className="mb-1 text-sm font-medium text-gray-800 dark:text-gray-200">
                    Facebook Pixel (للتتبع)
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    لا توجد Pixels متاحة. يمكنك إضافة Pixel من إعدادات Facebook
                    Pixel.
                  </p>
                </div>
              )}
              <p className="mt-2 text-sm text-gray-500">
                اختر Pixel لتتبع التحويلات والأحداث
              </p>
            </div>

            {/* Buying Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                نوع الشراء (Buying Type)
              </label>
              <div className="grid grid-cols-2 gap-4">
                {buyingTypes.map((type) => (
                  <div
                    key={type.value}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                      formData.buyingType === type.value
                        ? "border-indigo-500 dark:border-indigo-400 bg-indigo-50 dark:bg-indigo-900/20"
                        : "border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 bg-white dark:bg-gray-700"
                    }`}
                    onClick={() => handleInputChange("buyingType", type.value)}
                  >
                    <div className="font-medium text-gray-900 dark:text-white">
                      {type.label}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {type.description}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bid Strategy */}
            <div>
              <label
                htmlFor="create-campaign-bid-strategy"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                استراتيجية المزايدة (Bid Strategy)
              </label>
              <select
                id="create-campaign-bid-strategy"
                name="bidStrategy"
                autoComplete="off"
                value={formData.bidStrategy}
                onChange={(e) =>
                  handleInputChange("bidStrategy", e.target.value)
                }
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                {bidStrategies.map((strategy) => (
                  <option key={strategy.value} value={strategy.value}>
                    {strategy.label}
                  </option>
                ))}
              </select>
              {formData.bidStrategy && (
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  {
                    bidStrategies.find((s) => s.value === formData.bidStrategy)
                      ?.description
                  }
                </p>
              )}
            </div>

            {/* Special Ad Categories */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                فئات الإعلانات الخاصة (Special Ad Categories)
              </label>
              <div className="space-y-3">
                {specialAdCategories.map((category) => (
                  <div
                    key={category.value}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                      formData.specialAdCategories?.includes(category.value)
                        ? "border-indigo-500 dark:border-indigo-400 bg-indigo-50 dark:bg-indigo-900/20"
                        : "border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 bg-white dark:bg-gray-700"
                    }`}
                    onClick={() =>
                      handleSpecialAdCategoryToggle(category.value)
                    }
                  >
                    <div className="flex items-start gap-3">
                        <input
                          id={`special-ad-category-${category.value}`}
                          name={`specialAdCategory-${category.value}`}
                          type="checkbox"
                          aria-label={category.label}
                          checked={
                            formData.specialAdCategories?.includes(
                              category.value,
                          ) || false
                        }
                        onChange={() =>
                          handleSpecialAdCategoryToggle(category.value)
                        }
                        className="mt-1 w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-gray-900 dark:text-white">
                          {category.label}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {category.description}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div className="flex gap-2">
                  <InformationCircleIcon className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    يجب تحديد فئات الإعلانات الخاصة إذا كانت إعلاناتك تتعلق
                    بالإسكان أو التوظيف أو الائتمان.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 6: Review */}
        {currentStep === 6 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">
              مراجعة وإطلاق
            </h2>

            <div className="space-y-4">
              {/* Campaign Info */}
              <div className="p-6 bg-gray-50 rounded-lg space-y-4">
                <h3 className="font-medium text-gray-900">معلومات الحملة</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">اسم الحملة</p>
                    <p className="font-semibold text-gray-900">
                      {formData.name}
                    </p>
                  </div>
                  {formData.description && (
                    <div>
                      <p className="text-sm text-gray-600">الوصف</p>
                      <p className="font-semibold text-gray-900">
                        {formData.description}
                      </p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-gray-600">الهدف</p>
                    <p className="font-semibold text-gray-900">
                      {
                        CAMPAIGN_OBJECTIVES.find(
                          (o) => o.value === formData.objective,
                        )?.label
                      }
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">الحالة</p>
                    <p className="font-semibold text-gray-900">
                      {formData.status === "ACTIVE" ? "نشطة" : "متوقفة"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Budget */}
              <div className="p-6 bg-gray-50 rounded-lg space-y-4">
                <h3 className="font-medium text-gray-900">الميزانية</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">نوع الميزانية</p>
                    <p className="font-semibold text-gray-900">
                      {formData.budgetType === "DAILY" ? "يومية" : "إجمالية"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">مبلغ الميزانية</p>
                    <p className="font-semibold text-gray-900">
                      {formData.budgetAmount.toLocaleString()} EGP
                    </p>
                  </div>
                  {formData.spendLimit && (
                    <div>
                      <p className="text-sm text-gray-600">حد الإنفاق</p>
                      <p className="font-semibold text-gray-900">
                        {formData.spendLimit.toLocaleString()} EGP
                      </p>
                    </div>
                  )}
                  {formData.budgetOptimization && (
                    <div>
                      <p className="text-sm text-gray-600">CBO</p>
                      <p className="font-semibold text-green-600">مفعل</p>
                    </div>
                  )}
                  {formData.startDate && (
                    <div>
                      <p className="text-sm text-gray-600">تاريخ البدء</p>
                      <p className="font-semibold text-gray-900">
                        {new Date(formData.startDate).toLocaleDateString(
                          "ar-EG",
                        )}
                      </p>
                    </div>
                  )}
                  {formData.endDate && (
                    <div>
                      <p className="text-sm text-gray-600">تاريخ الانتهاء</p>
                      <p className="font-semibold text-gray-900">
                        {new Date(formData.endDate).toLocaleDateString("ar-EG")}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Targeting */}
              <div className="p-6 bg-gray-50 rounded-lg space-y-4">
                <h3 className="font-medium text-gray-900">الاستهداف</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">مكان التحويل</p>
                    <p className="font-semibold text-gray-900">
                      {conversionLocations.find(
                        (l) => l.value === formData.conversionLocation,
                      )?.label || formData.conversionLocation}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">هدف التحسين</p>
                    <p className="font-semibold text-gray-900">
                      {optimizationGoals.find(
                        (g) => g.value === formData.optimizationGoal,
                      )?.label || formData.optimizationGoal}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">الفئة العمرية</p>
                    <p className="font-semibold text-gray-900">
                      {formData.targetingAgeMin} - {formData.targetingAgeMax}{" "}
                      سنة
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">الجنس</p>
                    <p className="font-semibold text-gray-900">
                      {formData.targetingGenders.length === 0
                        ? "الكل"
                        : formData.targetingGenders
                            .map((g) => (g === "male" ? "ذكور" : "إناث"))
                            .join(" و ")}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">المواقع</p>
                    <p className="font-semibold text-gray-900">
                      {formData.targetingLocations
                        .map(
                          (code) =>
                            availableLocations.find((l) => l.value === code)
                              ?.label || code,
                        )
                        .join(", ")}
                    </p>
                  </div>
                  {formData.targetingInterests.length > 0 && (
                    <div>
                      <p className="text-sm text-gray-600">الاهتمامات</p>
                      <p className="font-semibold text-gray-900">
                        {formData.targetingInterests
                          .map(
                            (i) =>
                              availableInterests.find((int) => int.value === i)
                                ?.label || i,
                          )
                          .join(", ")}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Placements */}
              <div className="p-6 bg-gray-50 rounded-lg space-y-4">
                <h3 className="font-medium text-gray-900">المواضع</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">نوع المواضع</p>
                    <p className="font-semibold text-gray-900">
                      {formData.placementType === "AUTOMATIC"
                        ? "Advantage+ (تلقائي)"
                        : "يدوي"}
                    </p>
                  </div>
                  {formData.placementType === "MANUAL" &&
                    formData.placements.length > 0 && (
                      <div>
                        <p className="text-sm text-gray-600">المواضع المحددة</p>
                        <p className="font-semibold text-gray-900">
                          {formData.placements
                            .map(
                              (p) =>
                                availablePlacements.find((pl) => pl.value === p)
                                  ?.label || p,
                            )
                            .join(", ")}
                        </p>
                      </div>
                    )}
                </div>
              </div>

              {/* Advanced Settings */}
              <div className="p-6 bg-gray-50 rounded-lg space-y-4">
                <h3 className="font-medium text-gray-900">
                  الإعدادات المتقدمة
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">نوع الشراء</p>
                    <p className="font-semibold text-gray-900">
                      {buyingTypes.find((t) => t.value === formData.buyingType)
                        ?.label || "مزاد"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">استراتيجية المزايدة</p>
                    <p className="font-semibold text-gray-900">
                      {bidStrategies.find(
                        (s) => s.value === formData.bidStrategy,
                      )?.label || "أقل تكلفة"}
                    </p>
                  </div>
                  {formData.pixelId && (
                    <div>
                      <p className="text-sm text-gray-600">Facebook Pixel</p>
                      <p className="font-semibold text-gray-900">
                        {pixels.find((p) => p.pixelId === formData.pixelId)
                          ?.pixelName || formData.pixelId}
                      </p>
                    </div>
                  )}
                  {formData.specialAdCategories &&
                    formData.specialAdCategories.length > 0 && (
                      <div>
                        <p className="text-sm text-gray-600">فئات خاصة</p>
                        <p className="font-semibold text-gray-900">
                          {formData.specialAdCategories
                            .map(
                              (id) =>
                                specialAdCategories.find((c) => c.value === id)
                                  ?.label,
                            )
                            .filter(Boolean)
                            .join(", ")}
                        </p>
                      </div>
                    )}
                </div>
              </div>

              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-800">
                  ✅ <strong>جاهز للإطلاق!</strong> راجع جميع الإعدادات أعلاه ثم
                  اضغط على &quot;إنشاء الحملة&quot; لبدء حملتك الإعلانية.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200 dark:border-gray-600">
          <button
            onClick={() => navigate("/advertising/facebook-ads")}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            إلغاء
          </button>

          <div className="flex gap-3">
            {currentStep > 1 && (
              <button
                onClick={handlePrevious}
                className="flex items-center gap-2 px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <ChevronLeftIcon className="w-5 h-5" />
                السابق
              </button>
            )}
            {currentStep < totalSteps ? (
              <button
                onClick={handleNext}
                className="flex items-center gap-2 px-4 py-2 text-white bg-indigo-600 dark:bg-indigo-500 rounded-lg hover:bg-indigo-700 dark:hover:bg-indigo-600"
              >
                التالي
                <ChevronRightIcon className="w-5 h-5" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex items-center gap-2 px-6 py-2 text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    جاري الإنشاء...
                  </>
                ) : (
                  <>
                    <CheckCircleIcon className="w-5 h-5" />
                    إنشاء الحملة
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateCampaign;
