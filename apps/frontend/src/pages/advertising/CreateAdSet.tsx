/**
 * Create AdSet Page - Meta Marketing API v25.0 Full Suite
 *
 * صفحة إنشاء مجموعة إعلانية جديدة محدثة بالكامل بأحدث أدوات Meta Marketing API v25.0
 * بنية معمارية مستقلة ومقسمة وفق قاعدة Modular Independent Screens
 */

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowRightIcon,
  CheckCircleIcon,
  SparklesIcon,
  GlobeAltIcon,
  BanknotesIcon,
  UserGroupIcon,
  AdjustmentsHorizontalIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";
import { toast } from "sonner";
import {
  facebookAdsService,
  FacebookCampaign,
  FacebookPixel,
  FacebookCustomAudience,
  FacebookLookalikeAudience,
  MetaGeoLocation,
  CreateAdSetData,
} from "../../services/facebookAdsService";
import { AdSetConversionStep } from "../../components/advertising/adset/AdSetConversionStep";
import { AdSetBudgetStep } from "../../components/advertising/adset/AdSetBudgetStep";
import { AdSetTargetingStep } from "../../components/advertising/adset/AdSetTargetingStep";
import { AdSetPlacementsStep } from "../../components/advertising/adset/AdSetPlacementsStep";
import { AdSetReviewStep } from "../../components/advertising/adset/AdSetReviewStep";

interface TargetingInterest {
  id: string;
  name: string;
  audience_size?: number;
}

type StepId = 1 | 2 | 3 | 4 | 5;

const STEPS = [
  { id: 1 as StepId, label: "التحويل والبيكسل", icon: GlobeAltIcon },
  { id: 2 as StepId, label: "الميزانية والجدولة", icon: BanknotesIcon },
  { id: 3 as StepId, label: "الجمهور والاستهداف", icon: UserGroupIcon },
  { id: 4 as StepId, label: "مواضع العرض", icon: AdjustmentsHorizontalIcon },
  { id: 5 as StepId, label: "المراجعة والتأكيد", icon: ShieldCheckIcon },
];

const CreateAdSet: React.FC = () => {
  const { campaignId } = useParams<{ campaignId: string }>();
  const navigate = useNavigate();

  const [currentStep, setCurrentStep] = useState<StepId>(1);
  const [loading, setLoading] = useState(false);
  const [loadingCampaign, setLoadingCampaign] = useState(true);
  const [campaign, setCampaign] = useState<FacebookCampaign | null>(null);

  // Available Resources
  const [pixels, setPixels] = useState<FacebookPixel[]>([]);
  const [loadingPixels, setLoadingPixels] = useState(false);
  const [customAudiences, setCustomAudiences] = useState<FacebookCustomAudience[]>([]);
  const [lookalikeAudiences, setLookalikeAudiences] = useState<FacebookLookalikeAudience[]>([]);

  // Form State: Core
  const [adSetName, setAdSetName] = useState("");

  // Form State: Step 1 Conversion
  const [conversionLocation, setConversionLocation] = useState("WEBSITE");
  const [pixelId, setPixelId] = useState("");
  const [conversionEvent, setConversionEvent] = useState("PURCHASE");
  const [performanceGoal, setPerformanceGoal] = useState("MAXIMIZE_CONVERSIONS");

  // Form State: Step 2 Budget & Schedule
  const [budgetType, setBudgetType] = useState<"DAILY" | "LIFETIME">("DAILY");
  const [budgetAmount, setBudgetAmount] = useState<number>(200);
  const [startTime, setStartTime] = useState(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 15);
    return now.toISOString().slice(0, 16);
  });
  const [hasEndDate, setHasEndDate] = useState(false);
  const [endTime, setEndTime] = useState(() => {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    return nextWeek.toISOString().slice(0, 16);
  });
  const [bidStrategy, setBidStrategy] = useState("LOWEST_COST_WITHOUT_CAP");
  const [bidValue, setBidValue] = useState<number | undefined>(undefined);
  const [dailyMinSpendTarget, setDailyMinSpendTarget] = useState<number | undefined>(undefined);
  const [dailySpendCap, setDailySpendCap] = useState<number | undefined>(undefined);
  const [attributionWindow, setAttributionWindow] = useState("7d_click_1d_view");
  const [isDynamicCreative, setIsDynamicCreative] = useState(false);

  // Form State: Step 3 Audience & Targeting
  const [advantageAudience, setAdvantageAudience] = useState(true);
  const [selectedLocations, setSelectedLocations] = useState<string[]>(["EG"]);
  const [selectedRegions, setSelectedRegions] = useState<MetaGeoLocation[]>([]);
  const [selectedCities, setSelectedCities] = useState<MetaGeoLocation[]>([]);
  const [locationTypes, setLocationTypes] = useState<Array<"home" | "recent">>(["home", "recent"]);
  const [ageMin, setAgeMin] = useState(18);
  const [ageMax, setAgeMax] = useState(65);
  const [genders, setGenders] = useState<string[]>([]);
  const [interests, setInterests] = useState<TargetingInterest[]>([]);
  const [selectedCustomAudiences, setSelectedCustomAudiences] = useState<string[]>([]);
  const [selectedLookalikeAudiences, setSelectedLookalikeAudiences] = useState<string[]>([]);
  const [excludedAudiences, setExcludedAudiences] = useState<string[]>([]);

  // Form State: Step 4 Placements
  const [placementType, setPlacementType] = useState<"AUTOMATIC" | "MANUAL">("AUTOMATIC");
  const [selectedPlacements, setSelectedPlacements] = useState<string[]>([
    "FACEBOOK_FEED",
    "INSTAGRAM_FEED",
    "INSTAGRAM_REELS",
    "FACEBOOK_REELS",
    "INSTAGRAM_STORIES",
    "FACEBOOK_STORIES",
  ]);

  // Load Parent Campaign & Related Meta Resources
  const loadInitialData = useCallback(async () => {
    if (!campaignId) return;

    try {
      setLoadingCampaign(true);
      const camp = await facebookAdsService.getCampaign(campaignId);
      setCampaign(camp);

      if (camp) {
        setAdSetName(`مجموعة جديدة - ${camp.name || "حملة"}`);
      }

      // Load Pixels
      setLoadingPixels(true);
      try {
        const pixList = await facebookAdsService.getFacebookPixels(camp?.adAccountId);
        setPixels(pixList);
        if (pixList.length > 0) {
          setPixelId(pixList[0].pixelId);
        }
      } catch (e) {
        console.warn("Could not load pixels:", e);
      } finally {
        setLoadingPixels(false);
      }

      // Load Custom Audiences
      try {
        const [custom, lookalike] = await Promise.all([
          facebookAdsService.getCustomAudiences(),
          facebookAdsService.getLookalikeAudiences(),
        ]);
        setCustomAudiences(custom.filter((a) => a.status === "ACTIVE"));
        setLookalikeAudiences(lookalike.filter((a) => a.status === "ACTIVE"));
      } catch (e) {
        console.warn("Could not load audiences:", e);
      }
    } catch (error: unknown) {
      console.error("Failed to load campaign data:", error);
      toast.error("فشل في تحميل بيانات الحملة المرتبطة");
    } finally {
      setLoadingCampaign(false);
    }
  }, [campaignId]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Check if Campaign is CBO
  const isCboCampaign = Boolean(
    campaign?.budgetOptimization ||
      (Number(campaign?.dailyBudget) > 0 || Number(campaign?.lifetimeBudget) > 0)
  );

  const campaignBudgetText = campaign
    ? campaign.dailyBudget
      ? `${Number(campaign.dailyBudget).toLocaleString()} ج.م / يوم`
      : campaign.lifetimeBudget
        ? `${Number(campaign.lifetimeBudget).toLocaleString()} ج.م إجمالية`
        : ""
    : "";

  // Validation
  const validateCurrentStep = (step: StepId): boolean => {
    if (!adSetName.trim()) {
      toast.error("يرجى إدخال اسم المجموعة الإعلانية أولاً");
      return false;
    }

    if (step === 1) {
      if (!conversionLocation) {
        toast.error("يرجى اختيار وجهة التحويل");
        return false;
      }
      return true;
    }

    if (step === 2) {
      if (!isCboCampaign) {
        if (!budgetAmount || budgetAmount <= 0) {
          toast.error("يرجى إدخال مبلغ ميزانية صحيح أكبر من 0");
          return false;
        }
      }
      if (hasEndDate && endTime && startTime && new Date(endTime) <= new Date(startTime)) {
        toast.error("تاريخ الانتهاء يجب أن يكون بعد تاريخ البدء");
        return false;
      }
      return true;
    }

    if (step === 3) {
      const hasGeo =
        selectedLocations.length > 0 ||
        selectedRegions.length > 0 ||
        selectedCities.length > 0;
      if (!hasGeo) {
        toast.error("يرجى تحديد دولة أو محافظة واحدة على الأقل للاستهداف الجغرافي");
        return false;
      }
      if (ageMin > ageMax) {
        toast.error("الحد الأدنى للعمر لا يمكن أن يكون أكبر من الحد الأقصى");
        return false;
      }
      return true;
    }

    if (step === 4) {
      if (placementType === "MANUAL" && selectedPlacements.length === 0) {
        toast.error("يرجى اختيار موضع عرض واحد على الأقل في المواضع اليدوية");
        return false;
      }
      return true;
    }

    return true;
  };

  const handleNext = () => {
    if (validateCurrentStep(currentStep)) {
      if (currentStep < 5) {
        setCurrentStep((prev) => (prev + 1) as StepId);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as StepId);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // Submit & Create AdSet
  const handleSubmit = async () => {
    if (!validateCurrentStep(currentStep) || !campaignId) return;

    try {
      setLoading(true);

      const usesLocalGeo = selectedRegions.length > 0 || selectedCities.length > 0;

      const payload: CreateAdSetData = {
        name: adSetName.trim(),
        status: "PAUSED",
        // Conversion & Pixel
        conversionLocation,
        pixelId: pixelId || undefined,
        conversionEvent: conversionLocation === "WEBSITE" ? conversionEvent : undefined,
        performanceGoal,
        // Budget & Schedule
        budgetType: isCboCampaign ? undefined : budgetType,
        budgetAmount: isCboCampaign ? undefined : budgetAmount,
        dailyMinSpendTarget: isCboCampaign && dailyMinSpendTarget ? dailyMinSpendTarget : undefined,
        dailySpendCap: isCboCampaign && dailySpendCap ? dailySpendCap : undefined,
        startTime: startTime ? new Date(startTime).toISOString() : undefined,
        endTime: hasEndDate && endTime ? new Date(endTime).toISOString() : undefined,
        bidStrategy,
        bidValue:
          (bidStrategy === "COST_CAP" ||
            bidStrategy === "BID_CAP" ||
            bidStrategy === "LOWEST_COST_WITH_MIN_ROAS") &&
          bidValue
            ? bidValue
            : undefined,
        attributionWindow,
        isDynamicCreative,
        // Placements
        placementType,
        placements: placementType === "MANUAL" ? selectedPlacements : [],
        // Targeting (Complete v25 Bundle - Zero Data Discard)
        targeting: {
          ageMin,
          ageMax,
          genders: genders.length > 0 ? genders : undefined,
          locations: usesLocalGeo ? [] : selectedLocations,
          regions: selectedRegions,
          cities: selectedCities,
          locationTypes,
          interests: interests.map((i) => ({ id: i.id, name: i.name })),
          customAudiences: selectedCustomAudiences,
          lookalikeAudiences: selectedLookalikeAudiences,
          excludedAudiences,
          advantageAudience,
          targetingExpansion: advantageAudience,
        },
      };

      await facebookAdsService.createAdSet(campaignId, payload);

      toast.success("تم إنشاء المجموعة الإعلانية بنجاح على Meta!");
      navigate(`/advertising/facebook-ads/campaigns/${campaignId}?adAccountId=${campaign?.adAccountId || ""}`);
    } catch (error: unknown) {
      console.error("Error creating AdSet:", error);
      const apiError = error as { response?: { data?: { error?: string } }; message?: string };
      toast.error(
        apiError.response?.data?.error || apiError.message || "فشل إنشاء المجموعة الإعلانية على فيسبوك"
      );
    } finally {
      setLoading(false);
    }
  };

  if (loadingCampaign) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-3">
        <div className="w-8 h-8 border-3 border-cyan-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs text-gray-500 font-semibold">جاري تجهيز بيئة إنشاء المجموعة الإعلانية v25...</p>
      </div>
    );
  }

  const activePixel = pixels.find((p) => p.pixelId === pixelId);

  return (
    <div className="w-full max-w-5xl mx-auto space-y-5 p-3 sm:p-6 pb-20">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-200 dark:border-gray-800">
        <div>
          <button
            type="button"
            onClick={() => navigate(`/advertising/facebook-ads/campaigns/${campaignId}`)}
            className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-900 dark:hover:text-white mb-2 transition-colors cursor-pointer"
          >
            <ArrowRightIcon className="w-4 h-4" />
            <span>الرجوع لتفاصيل الحملة</span>
          </button>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight">
              إنشاء مجموعة إعلانات جديدة
            </h1>
            <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-cyan-100 text-cyan-800 dark:bg-cyan-950/70 dark:text-cyan-300 font-mono font-bold">
              Meta v25.0
            </span>
          </div>
          {campaign && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              داخل الحملة: <span className="font-bold text-gray-800 dark:text-gray-200">{campaign.name}</span>
              {campaign.objective && (
                <span className="mx-1.5 px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 font-mono text-[10px]">
                  {campaign.objective}
                </span>
              )}
            </p>
          )}
        </div>

        {/* AdSet Name Input (Always Visible) */}
        <div className="w-full sm:w-72">
          <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
            اسم المجموعة الإعلانية *
          </label>
          <input
            type="text"
            value={adSetName}
            onChange={(e) => setAdSetName(e.target.value)}
            placeholder="مثال: نساء القاهرة الكبرى - أحذية"
            className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl text-xs sm:text-sm font-semibold text-gray-900 dark:text-white focus:ring-2 focus:ring-cyan-500"
          />
        </div>
      </div>

      {/* Modern Stepper Tabs */}
      <div className="bg-white dark:bg-gray-800/80 p-2 sm:p-3 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xs overflow-x-auto">
        <div className="flex items-center min-w-[620px] justify-between">
          {STEPS.map((step, idx) => {
            const Icon = step.icon;
            const isCompleted = currentStep > step.id;
            const isCurrent = currentStep === step.id;
            return (
              <React.Fragment key={step.id}>
                <button
                  type="button"
                  onClick={() => {
                    if (isCompleted || validateCurrentStep(currentStep)) {
                      setCurrentStep(step.id);
                    }
                  }}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isCurrent
                      ? "bg-cyan-600 text-white shadow-xs"
                      : isCompleted
                        ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 hover:bg-emerald-100"
                        : "text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                  }`}
                >
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] shrink-0 font-mono ${
                      isCurrent
                        ? "bg-white text-cyan-700"
                        : isCompleted
                          ? "bg-emerald-600 text-white"
                          : "bg-gray-100 dark:bg-gray-700 text-gray-500"
                    }`}
                  >
                    {isCompleted ? <CheckCircleIcon className="w-4 h-4" /> : step.id}
                  </div>
                  <span className="whitespace-nowrap">{step.label}</span>
                </button>

                {idx < STEPS.length - 1 && (
                  <div
                    className={`h-0.5 flex-1 mx-2 transition-colors ${
                      currentStep > idx + 1
                        ? "bg-emerald-500"
                        : "bg-gray-200 dark:bg-gray-700"
                    }`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Active Step Content Container */}
      <div className="bg-white dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/80 rounded-2xl p-4 sm:p-6 shadow-xs min-h-[420px]">
        {currentStep === 1 && (
          <AdSetConversionStep
            conversionLocation={conversionLocation}
            onConversionLocationChange={setConversionLocation}
            pixelId={pixelId}
            onPixelIdChange={setPixelId}
            conversionEvent={conversionEvent}
            onConversionEventChange={setConversionEvent}
            performanceGoal={performanceGoal}
            onPerformanceGoalChange={setPerformanceGoal}
            pixels={pixels}
            loadingPixels={loadingPixels}
          />
        )}

        {currentStep === 2 && (
          <AdSetBudgetStep
            isCboCampaign={isCboCampaign}
            campaignBudgetText={campaignBudgetText}
            budgetType={budgetType}
            onBudgetTypeChange={setBudgetType}
            budgetAmount={budgetAmount}
            onBudgetAmountChange={setBudgetAmount}
            startTime={startTime}
            onStartTimeChange={setStartTime}
            hasEndDate={hasEndDate}
            onHasEndDateChange={setHasEndDate}
            endTime={endTime}
            onEndTimeChange={setEndTime}
            bidStrategy={bidStrategy}
            onBidStrategyChange={setBidStrategy}
            bidValue={bidValue}
            onBidValueChange={setBidValue}
            attributionWindow={attributionWindow}
            onAttributionWindowChange={setAttributionWindow}
            isDynamicCreative={isDynamicCreative}
            onDynamicCreativeChange={setIsDynamicCreative}
          />
        )}

        {currentStep === 3 && (
          <AdSetTargetingStep
            advantageAudience={advantageAudience}
            onAdvantageAudienceChange={setAdvantageAudience}
            selectedLocations={selectedLocations}
            onLocationsChange={setSelectedLocations}
            selectedRegions={selectedRegions}
            onRegionsChange={setSelectedRegions}
            selectedCities={selectedCities}
            onCitiesChange={setSelectedCities}
            locationTypes={locationTypes}
            onLocationTypesChange={setLocationTypes}
            ageMin={ageMin}
            onAgeMinChange={setAgeMin}
            ageMax={ageMax}
            onAgeMaxChange={setAgeMax}
            genders={genders}
            onGendersChange={setGenders}
            interests={interests}
            onInterestsChange={setInterests}
            customAudiences={customAudiences}
            lookalikeAudiences={lookalikeAudiences}
            selectedCustomAudiences={selectedCustomAudiences}
            onCustomAudiencesChange={setSelectedCustomAudiences}
            selectedLookalikeAudiences={selectedLookalikeAudiences}
            onLookalikeAudiencesChange={setSelectedLookalikeAudiences}
            excludedAudiences={excludedAudiences}
            onExcludedAudiencesChange={setExcludedAudiences}
          />
        )}

        {currentStep === 4 && (
          <AdSetPlacementsStep
            placementType={placementType}
            onPlacementTypeChange={setPlacementType}
            selectedPlacements={selectedPlacements}
            onPlacementsChange={setSelectedPlacements}
          />
        )}

        {currentStep === 5 && (
          <AdSetReviewStep
            name={adSetName}
            conversionLocation={conversionLocation}
            pixelName={activePixel?.pixelName}
            pixelId={pixelId}
            conversionEvent={conversionEvent}
            performanceGoal={performanceGoal}
            isCboCampaign={isCboCampaign}
            budgetType={budgetType}
            budgetAmount={budgetAmount}
            startTime={startTime}
            hasEndDate={hasEndDate}
            endTime={endTime}
            bidStrategy={bidStrategy}
            bidValue={bidValue}
            advantageAudience={advantageAudience}
            ageMin={ageMin}
            ageMax={ageMax}
            genders={genders}
            selectedLocations={selectedLocations}
            selectedRegions={selectedRegions}
            selectedCities={selectedCities}
            interestsCount={interests.length}
            interestsNames={interests.map((i) => i.name)}
            customAudiencesCount={selectedCustomAudiences.length}
            excludedAudiencesCount={excludedAudiences.length}
            placementType={placementType}
            placementsCount={selectedPlacements.length}
            isDynamicCreative={isDynamicCreative}
          />
        )}
      </div>

      {/* Navigation Buttons Footer */}
      <div className="flex items-center justify-between gap-3 pt-3 border-t border-gray-200 dark:border-gray-800">
        <button
          type="button"
          onClick={handlePrev}
          disabled={currentStep === 1 || loading}
          className="px-5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs sm:text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
        >
          السابق
        </button>

        <div className="flex items-center gap-2">
          {currentStep < 5 ? (
            <button
              type="button"
              onClick={handleNext}
              className="px-6 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs sm:text-sm font-bold shadow-xs transition-all active:scale-95 cursor-pointer"
            >
              التالي
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="px-8 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white text-xs sm:text-sm font-bold shadow-md disabled:opacity-50 transition-all active:scale-95 cursor-pointer flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>جاري إنشاء المجموعة على Meta...</span>
                </>
              ) : (
                <>
                  <SparklesIcon className="w-4 h-4" />
                  <span>تأكيد وإنشاء المجموعة الإعلانية</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreateAdSet;
