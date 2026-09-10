import React, { useState, useCallback, useRef, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { tToast } from "../../utils/i18n-toast";
import {
  ChevronRight,
  ChevronLeft,
  Loader2,
  AlertCircle,
  Sparkles,
  ExternalLink,
  Target,
  DollarSign,
  Users,
  Layout,
  Image,
  CheckCircle,
  Eye,
  Globe,
  Facebook,
  Instagram,
  ShoppingBag,
  Smartphone,
  MessageCircle,
} from "lucide-react";
import {
  facebookAdsService,
  CreateFullAdData,
  FacebookAdAccount,
  FacebookCustomAudience,
  FacebookLookalikeAudience,
  FacebookPage,
  FacebookPagesMeta,
  FacebookPixel,
  FacebookSavedAdAccount,
} from "../../services/facebookAdsService";
import {
  buildCreateAdWizardTargetingPayload,
  getCompatibleAttributionWindows,
  getFullAdMinimumBudgetAmount,
  isCappedBidStrategy,
  normalizeAttributionWindowForObjective,
  normalizeWizardBidStrategy,
} from "./CreateAdWizard.helpers";
import type {
  WizardStep,
  CarouselCard,
  CreatedFullAdSummary,
  FormData,
  CreateAdWizardErrors,
  TargetingOption,
} from "./wizard/types";
import {
  WIZARD_STEPS,
  getWizardSteps,
  getObjectives,
  OBJECTIVES,
  SPECIAL_AD_CATEGORIES,
  BID_STRATEGIES,
  CTAS,
  PLACEMENTS,
  COUNTRIES,
  CONVERSION_EVENTS,
  CONVERSION_LOCATIONS,
  ATTRIBUTION_WINDOWS,
} from "./wizard/constants";
import {
  humanizeProductSlug,
  buildPrefilledCampaignName,
  buildDefaultUrlParameters,
  formatLaunchPrefillPrice,
  getProductLaunchPrefillPayload,
  buildStoredPrefillCarouselCards,
} from "./wizard/utils/prefillStorage";
import {
  Step1Campaign,
  Step2BudgetSchedule,
  Step3Targeting,
  Step4Placements,
  Step5Creative,
  Step6Review,
} from "./wizard/components";


const CreateAdWizard: React.FC = () => {
  const { i18n } = useTranslation();
  const isEn = Boolean(i18n.language && i18n.language.startsWith("en"));
  const wizardSteps = useMemo(() => getWizardSteps(isEn), [isEn]);
  const objectives = useMemo(() => getObjectives(isEn), [isEn]);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const launchPrefillId = searchParams.get("launchPrefillId") || "";
  const storedLaunchPrefill = getProductLaunchPrefillPayload(launchPrefillId);
  const isAiDraftPrefill = !!storedLaunchPrefill;
  const prefillProductUrl =
    storedLaunchPrefill?.productUrl || searchParams.get("productUrl") || "";
  const prefillProductId =
    storedLaunchPrefill?.productId || searchParams.get("productId") || "";
  const prefillProductSlug =
    storedLaunchPrefill?.productSlug || searchParams.get("productSlug") || "";
  const prefillProductTitle =
    storedLaunchPrefill?.productTitle ||
    searchParams.get("productTitle") ||
    humanizeProductSlug(prefillProductSlug) ||
    "المنتج";
  const prefillBudget =
    Number(
      storedLaunchPrefill?.budget ||
        searchParams.get("budget") ||
        DEFAULT_WIZARD_BUDGET_AMOUNT,
    ) || DEFAULT_WIZARD_BUDGET_AMOUNT;
  const prefillObjective =
    storedLaunchPrefill?.objective || searchParams.get("objective") || "";
  const prefillPixelId =
    storedLaunchPrefill?.pixelId || searchParams.get("pixelId") || "";
  const prefillPageId =
    storedLaunchPrefill?.pageId || searchParams.get("pageId") || "";
  const prefillStatus =
    storedLaunchPrefill?.status === "ACTIVE"
      ? "ACTIVE"
      : "PAUSED";
  const prefillImageUrls = getSafePrefillImageUrls(
    storedLaunchPrefill?.imageUrls,
  );
  const prefillCreativeType =
    storedLaunchPrefill?.creativeType === "SINGLE_IMAGE" ||
    prefillImageUrls.length < 2
      ? "SINGLE_IMAGE"
      : "CAROUSEL";
  const requestedAdAccountId = searchParams.get("adAccountId") || "";
  const [currentStep, setCurrentStep] = useState(1);
  const [showFullWizard, setShowFullWizard] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<CreateAdWizardErrors>({});
  const getError = useCallback(
    (field: string) => errors[field] || "",
    [errors],
  );
  const [showPublishConfirm, setShowPublishConfirm] = useState(false);
  const [publishAccountConfirmed, setPublishAccountConfirmed] =
    useState(false);
  const [activePublishConfirmed, setActivePublishConfirmed] = useState(false);
  const [createdFullAd, setCreatedFullAd] =
    useState<CreatedFullAdSummary | null>(null);
  const [publishRequestId, setPublishRequestId] = useState(
    () =>
      storedLaunchPrefill?.publishRequestId ||
      createClientRequestId("fb-full-ad"),
  );
  const publishDialogRef = useRef<HTMLDivElement | null>(null);
  const restorePublishFocusRef = useRef<HTMLElement | null>(null);

  // Advanced Targeting State
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<TargetingOption[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedInterests, setSelectedInterests] = useState<TargetingOption[]>(
    [],
  );
  const [relationshipStatuses, setRelationshipStatuses] = useState<number[]>(
    [],
  );
  const [selectedLanguages, setSelectedLanguages] = useState<number[]>([]);
  const [selectedDevices, setSelectedDevices] = useState<string[]>([]);
  const [showAdvancedTargeting, setShowAdvancedTargeting] = useState(false);

  // Audiences State
  const [customAudiences, setCustomAudiences] = useState<
    FacebookCustomAudience[]
  >([]);
  const [lookalikeAudiences, setLookalikeAudiences] = useState<
    FacebookLookalikeAudience[]
  >([]);
  const [selectedCustomAudiences, setSelectedCustomAudiences] = useState<
    string[]
  >([]);
  const [selectedLookalikeAudiences, setSelectedLookalikeAudiences] = useState<
    string[]
  >([]);
  const [loadingAudiences, setLoadingAudiences] = useState(false);

  // Detailed Demographics State
  const [selectedEducation, setSelectedEducation] = useState<number[]>([]);
  const [selectedJobs, setSelectedJobs] = useState<string[]>([]);
  const [selectedBehaviors, setSelectedBehaviors] = useState<string[]>([]);
  const [selectedIncome, setSelectedIncome] = useState<string[]>([]);
  const [selectedLifeEvents, setSelectedLifeEvents] = useState<string[]>([]);
  const [selectedParents, setSelectedParents] = useState<string[]>([]);
  const [excludedAudiences, setExcludedAudiences] = useState<string[]>([]);

  // Pages & Pixels State
  const [adAccounts, setAdAccounts] = useState<FacebookAdAccount[]>([]);
  const [savedAdAccounts, setSavedAdAccounts] = useState<
    FacebookSavedAdAccount[]
  >([]);
  const [selectedAdAccountId, setSelectedAdAccountId] = useState("");
  const [loadingAdAccounts, setLoadingAdAccounts] = useState(false);
  const [syncingAdAccount, setSyncingAdAccount] = useState(false);
  const [facebookPages, setFacebookPages] = useState<FacebookPage[]>([]);
  const [facebookPagesMeta, setFacebookPagesMeta] =
    useState<FacebookPagesMeta | null>(null);
  const [facebookPixels, setFacebookPixels] = useState<FacebookPixel[]>([]);
  const [loadingPages, setLoadingPages] = useState(false);
  const [loadingPixels, setLoadingPixels] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    // Step 1
    campaignName:
      storedLaunchPrefill?.campaignName ||
      buildPrefilledCampaignName(prefillProductSlug),
    adSetName:
      storedLaunchPrefill?.adSetName ||
      storedLaunchPrefill?.createFullAdData?.adSetName ||
      "",
    adName:
      storedLaunchPrefill?.adName ||
      storedLaunchPrefill?.createFullAdData?.adName ||
      "",
    objective: prefillObjective || "",
    specialAdCategories: [],

    // Step 2 - Ad Set Level
    performanceGoal: "MAXIMIZE_CONVERSIONS",
    conversionEvent: "PURCHASE",
    conversionLocation: "WEBSITE",
    attributionWindow: "7d_click_1d_view",
    dynamicCreative: false,
    pixelId: prefillPixelId,
    budgetOptimization: true,
    budgetType: "DAILY",
    budgetAmount:
      prefillBudget > 0 ? prefillBudget : DEFAULT_WIZARD_BUDGET_AMOUNT,
    bidStrategy: "LOWEST_COST",
    bidValue: undefined,
    startTime: "",
    endTime: "",
    frequencyCap: undefined,
    frequencyCapInterval: undefined,

    // Step 3
    ageMin: storedLaunchPrefill?.ageMin || 18,
    ageMax: storedLaunchPrefill?.ageMax || 65,
    genders: storedLaunchPrefill?.genders || [],
    locations: storedLaunchPrefill?.locations || ["EG"],
    regions: [],
    cities: [],
    locationTypes: ["home", "recent"],
    interests: [],
    advantageAudience: storedLaunchPrefill?.advantageAudience || false,

    // Step 4
    placementType: "AUTOMATIC",
    placements: [],

    // Step 5
    pageId: prefillPageId,
    creativeType: prefillCreativeType,
    primaryText:
      storedLaunchPrefill?.primaryText ||
      (prefillProductUrl
        ? `اختاري ${prefillProductTitle} بإطلالة مريحة وسهلة التنسيق. شوفي الصور والتفاصيل واطلبي أونلاين الآن.`
        : ""),
    headline:
      storedLaunchPrefill?.headline ||
      (prefillProductUrl ? `${prefillProductTitle}` : ""),
    description:
      storedLaunchPrefill?.description ||
      (prefillProductUrl ? "شاهدي تفاصيل المنتج والصور قبل الطلب." : ""),
    callToAction:
      storedLaunchPrefill?.callToAction ||
      storedLaunchPrefill?.createFullAdData?.callToAction ||
      (prefillProductUrl ? "SHOP_NOW" : "LEARN_MORE"),
    linkUrl: prefillProductUrl,
    productId: prefillProductId,
    displayLink: "",
    urlParameters: prefillProductUrl
      ? buildDefaultUrlParameters(prefillProductSlug)
      : "",
    imageUrl: prefillImageUrls[0] || "",
    videoUrl: "",
    carouselCards:
      prefillCreativeType === "CAROUSEL"
        ? getPrefilledCarouselCards(
            storedLaunchPrefill?.createFullAdData?.carouselCards,
            prefillImageUrls,
            prefillProductTitle,
            prefillProductUrl,
          )
        : [],
    flexibleAssets: [],
    textVariations: [],
    headlineVariations: [],
    useLeadForm: false,
    leadFormId: undefined,
    advantageCreative: false,
    textGeneration: false,
    imageEnhancement: false,

    // Status
    status: prefillStatus,
  });

  React.useEffect(() => {
    const nextAttributionWindow = normalizeAttributionWindowForObjective(
      formData.objective,
      formData.attributionWindow,
    );

    if (nextAttributionWindow !== formData.attributionWindow) {
      setFormData((prev) => ({
        ...prev,
        attributionWindow: nextAttributionWindow,
      }));
    }
  }, [formData.attributionWindow, formData.objective]);

  // ============================================
  // Validation
  // ============================================

  const validateStep = (step: number): boolean => {
    const newErrors: CreateAdWizardErrors = {};
    const stepsToValidate = step === 6 ? [1, 2, 3, 4, 5] : [step];

    for (const stepToValidate of stepsToValidate) {
      switch (stepToValidate) {
      case 1:
        if (!formData.campaignName.trim()) {
          newErrors["campaignName"] = "اسم الحملة مطلوب";
        }
        if (!formData.objective) {
          newErrors["objective"] = "هدف الحملة مطلوب";
        }
        break;

      case 2:
        if (!selectedAdAccountId.trim()) {
          newErrors["adAccountId"] = "يجب اختيار حساب Facebook Ads";
        }
        if (
          !formData.budgetAmount ||
          formData.budgetAmount < minimumWizardBudget
        ) {
          newErrors["budgetAmount"] = `الميزانية لا تقل عن ${formatSelectedAdAccountCurrency(
            minimumWizardBudget,
          )}`;
        }
        if (
          isCappedBidStrategy(formData.bidStrategy) &&
          (!formData.bidValue || formData.bidValue <= 0)
        ) {
          newErrors["bidValue"] = "أدخل قيمة المزايدة أو التكلفة";
        }
        if (
          (formData.objective === "OUTCOME_SALES" ||
            formData.objective === "OUTCOME_LEADS") &&
          !formData.pixelId.trim()
        ) {
          newErrors["pixelId"] =
            "اختر Facebook Pixel مناسبًا أو فعّل الحساب الإعلاني أولًا";
        }
        break;

      case 3:
        if (
          formData.locations.length === 0 &&
          formData.regions.length === 0 &&
          formData.cities.length === 0
        ) {
          newErrors["locations"] = "يجب اختيار موقع واحد على الأقل";
        }
        if (formData.ageMin < 13 || formData.ageMax > 65) {
          newErrors["age"] = "العمر يجب أن يكون بين 13 و 65";
        }
        break;

      case 4:
        if (
          formData.placementType === "MANUAL" &&
          formData.placements.length === 0
        ) {
          newErrors["placements"] = "يجب اختيار موضع واحد على الأقل";
        }
        break;

      case 5:
        if (!formData.pageId.trim()) {
          newErrors["pageId"] = "معرف الصفحة مطلوب";
        }
        if (
          formData.pageId.trim() &&
          selectedFacebookPage?.status &&
          selectedFacebookPage.status !== "READY"
        ) {
          newErrors["pageId"] =
            "اختار صفحة مربوطة بالشركة وجاهزة للنشر داخل MaxP.";
        }
        if (!formData.primaryText.trim()) {
          newErrors["primaryText"] = "النص الأساسي مطلوب";
        }
        if (!formData.linkUrl.trim()) {
          newErrors["linkUrl"] = "رابط الوجهة مطلوب";
        }
        if (formData.creativeType === "FLEXIBLE") {
          newErrors["creativeType"] =
            "التنسيق المرن قيد التجهيز. استخدم صورة أو فيديو أو دوّار حالياً.";
        }
        if (
          formData.creativeType === "SINGLE_IMAGE" &&
          !formData.imageUrl.trim()
        ) {
          newErrors["imageUrl"] = "رابط الصورة مطلوب حالياً قبل الإرسال";
        }
        if (
          formData.creativeType === "SINGLE_VIDEO" &&
          !formData.videoUrl.trim()
        ) {
          newErrors["videoUrl"] = "رابط الفيديو مطلوب حالياً قبل الإرسال";
        }
        if (formData.creativeType === "CAROUSEL") {
          if (formData.carouselCards.length < 2) {
            newErrors["carouselCards"] = "الدوّار يحتاج بطاقتين على الأقل";
          } else {
            const invalidCardIndex = formData.carouselCards.findIndex(
              (card) =>
                !card.imageUrl.trim() ||
                !card.headline.trim() ||
                !card.linkUrl.trim(),
            );
            if (invalidCardIndex >= 0) {
              newErrors["carouselCards"] =
                `بطاقة الدوّار رقم ${invalidCardIndex + 1} تحتاج صورة وعنوان ورابط`;
            }
          }
        }
        break;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ============================================
  // Handlers
  // ============================================

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, 6));
    }
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleChange = (
    field: keyof FormData,
    value: FormData[keyof FormData],
  ) => {
    setFormData((prev) => {
      if (field === "bidStrategy") {
        const nextBidStrategy = normalizeWizardBidStrategy(String(value));
        return {
          ...prev,
          bidStrategy: nextBidStrategy,
          bidValue:
            nextBidStrategy === "LOWEST_COST" ? undefined : prev.bidValue,
        };
      }

      if (field === "objective") {
        const nextObjective = String(value);
        return {
          ...prev,
          objective: nextObjective,
          attributionWindow: normalizeAttributionWindowForObjective(
            nextObjective,
            prev.attributionWindow,
          ),
        };
      }

      return { ...prev, [field]: value };
    });
    const fieldKey = field as string;
    if (errors[fieldKey]) {
      setErrors((prev) => ({ ...prev, [fieldKey]: "" }));
    }
  };

  const toggleArrayValue = (field: keyof FormData, value: string) => {
    const currentArray = formData[field] as string[];
    const newArray = currentArray.includes(value)
      ? currentArray.filter((v) => v !== value)
      : [...currentArray, value];
    handleChange(field, newArray);
  };

  // Search for interests
  const handleSearchInterests = useCallback(async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      setSearchLoading(true);
      const results = (await facebookAdsService.searchTargetingOptions(
        query,
        "adinterest",
      )) as TargetingOption[];
      setSearchResults(results || []);
    } catch (error) {
      console.error("Search error:", error);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  }, []);

  const addInterest = (interest: TargetingOption) => {
    if (!selectedInterests.find((i) => i.id === interest.id)) {
      setSelectedInterests((prev) => [...prev, interest]);
    }
    setSearchQuery("");
    setSearchResults([]);
  };

  const removeInterest = (id: string) => {
    setSelectedInterests((prev) => prev.filter((i) => i.id !== id));
  };

  const toggleRelationshipStatus = (value: number) => {
    setRelationshipStatuses((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value],
    );
  };

  const toggleLanguage = (id: number) => {
    setSelectedLanguages((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id],
    );
  };

  const toggleDevice = (value: string) => {
    setSelectedDevices((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value],
    );
  };

  const resolveAdAccountId = useCallback(
    (
      account:
        | Pick<FacebookAdAccount, "id" | "account_id">
        | Pick<FacebookSavedAdAccount, "accountId">,
    ) => ("accountId" in account ? account.accountId : account.account_id || account.id.replace(/^act_/, "")),
    [],
  );

  const loadPagesAndPixels = useCallback(async (adAccountId?: string) => {
    try {
      setLoadingPages(true);
      setLoadingPixels(true);

      const [pagesResult, pixelsResult] = await Promise.allSettled([
        facebookAdsService.getFacebookPageOptions(),
        adAccountId
          ? facebookAdsService.getFacebookPixels(adAccountId)
          : Promise.resolve([] as FacebookPixel[]),
      ]);

      const pagesResponse =
        pagesResult.status === "fulfilled"
          ? pagesResult.value
          : { data: [], meta: null };
      const pages = pagesResponse.data || [];
      const pixels =
        pixelsResult.status === "fulfilled" ? pixelsResult.value || [] : [];

      setFacebookPages(pages);
      setFacebookPagesMeta(pagesResponse.meta || null);
      setFacebookPixels(pixels);
      setFormData((prev) => ({
        ...prev,
        pageId:
          (prev.pageId &&
            pages.find(
              (page) =>
                page.id === prev.pageId &&
                page.status === "READY" &&
                page.isSelectable !== false,
            )?.id) ||
          pages.find((page) => page.status === "READY")?.id ||
          "",
        pixelId:
          prev.pixelId && pixels.some((pixel) => pixel.id === prev.pixelId)
            ? prev.pixelId
            : pixels[0]?.id || "",
      }));
    } catch (error) {
      console.error("Failed to load Facebook pages or pixels:", error);
      setFacebookPages([]);
      setFacebookPagesMeta(null);
      setFacebookPixels([]);
    } finally {
      setLoadingPages(false);
      setLoadingPixels(false);
    }
  }, []);

  const saveAdAccountSelection = useCallback(
    async (account: FacebookAdAccount) =>
      facebookAdsService.saveAdAccount({
        accountId: resolveAdAccountId(account),
        name: account.name,
        currency: account.currency,
        timezone: account.timezone_name,
      }),
    [resolveAdAccountId],
  );

  const refreshSavedAdAccounts = useCallback(async () => {
    const nextSavedAdAccounts = await facebookAdsService.getSavedAdAccounts();
    setSavedAdAccounts(nextSavedAdAccounts);
    return nextSavedAdAccounts;
  }, []);

  const activateSelectedAdAccount = useCallback(async () => {
    if (!selectedAdAccountId) {
      throw new Error("اختر حساب Facebook Ads أولاً");
    }

    const activeSavedAccount = savedAdAccounts.find(
      (account) =>
        account.isActive && account.accountId === selectedAdAccountId,
    );

    if (activeSavedAccount) {
      return selectedAdAccountId;
    }

    const selectedAccount = adAccounts.find(
      (account) => resolveAdAccountId(account) === selectedAdAccountId,
    );

    if (!selectedAccount) {
      throw new Error("الحساب الإعلاني المحدد غير متاح");
    }

    setSyncingAdAccount(true);
    try {
      await saveAdAccountSelection(selectedAccount);
      await refreshSavedAdAccounts();
      return resolveAdAccountId(selectedAccount);
    } finally {
      setSyncingAdAccount(false);
    }
  }, [
    adAccounts,
    refreshSavedAdAccounts,
    resolveAdAccountId,
    savedAdAccounts,
    saveAdAccountSelection,
    selectedAdAccountId,
  ]);

  const ensureSelectedAdAccountReady = useCallback(async () => {
    if (!selectedAdAccountId) {
      throw new Error("اختر حساب Facebook Ads أولاً");
    }

    const activeSavedAccount = savedAdAccounts.find(
      (account) =>
        account.isActive && account.accountId === selectedAdAccountId,
    );

    if (!activeSavedAccount) {
      throw new Error(
        "فعّل الحساب الإعلاني المختار قبل إنشاء الإعلان حتى لا يتم الإرسال لحساب غير مقصود",
      );
    }

    return selectedAdAccountId;
  }, [savedAdAccounts, selectedAdAccountId]);

  const handleActivateSelectedAdAccount = useCallback(async () => {
    try {
      const activeAdAccountId = await activateSelectedAdAccount();
      await loadPagesAndPixels(activeAdAccountId);
      tToast.success("CreateAdWizard.success_activate_0a35");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "تعذر تفعيل الحساب الإعلاني",
      );
    }
  }, [activateSelectedAdAccount, loadPagesAndPixels]);

  // Load audiences, ad accounts, pages, and pixels on mount
  React.useEffect(() => {
    let isCancelled = false;

    const loadData = async () => {
      setLoadingAudiences(true);
      setLoadingAdAccounts(true);

      try {
        const [
          customResult,
          lookalikeResult,
          adAccountsResult,
          savedAccountsResult,
        ] = await Promise.allSettled([
          facebookAdsService.getCustomAudiences(),
          facebookAdsService.getLookalikeAudiences(),
          facebookAdsService.getAdAccounts(),
          facebookAdsService.getSavedAdAccounts(),
        ]);

        const custom =
          customResult.status === "fulfilled" ? customResult.value || [] : [];
        const lookalike =
          lookalikeResult.status === "fulfilled"
            ? lookalikeResult.value || []
            : [];
        const remoteAdAccounts =
          adAccountsResult.status === "fulfilled"
            ? adAccountsResult.value || []
            : [];
        const existingSavedAccounts =
          savedAccountsResult.status === "fulfilled"
            ? savedAccountsResult.value || []
            : [];

        if (isCancelled) {
          return;
        }

        setCustomAudiences(custom);
        setLookalikeAudiences(lookalike);
        setAdAccounts(remoteAdAccounts);
        setSavedAdAccounts(existingSavedAccounts);

        const requestedAccount = requestedAdAccountId
          ? remoteAdAccounts.find(
              (account) =>
                resolveAdAccountId(account) === requestedAdAccountId ||
                account.id === requestedAdAccountId ||
                `act_${resolveAdAccountId(account)}` === requestedAdAccountId,
            )
          : null;

        if (requestedAccount) {
          const requestedAccountId = resolveAdAccountId(requestedAccount);
          setSelectedAdAccountId(requestedAccountId);
          await loadPagesAndPixels(requestedAccountId);
          return;
        }

        const activeSavedAccount =
          existingSavedAccounts.find((account) => account.isActive) ||
          existingSavedAccounts[0];

        if (activeSavedAccount) {
          setSelectedAdAccountId(activeSavedAccount.accountId);
          await loadPagesAndPixels(activeSavedAccount.accountId);
          return;
        }

        if (remoteAdAccounts.length === 1) {
          // 🔒 SECURITY FIX: Removed dangerous auto-select.
          // The user MUST explicitly choose an account to prevent accidental ad creation
          // in the wrong account. Show empty selection and let user decide.
          setSelectedAdAccountId('');
          setFormData((prev) => ({ ...prev, pixelId: '' }));
          await loadPagesAndPixels();
          return;
        }
      } catch (error) {
        console.error("Failed to load Facebook Ads wizard data:", error);
        setFacebookPages([]);
        setFacebookPagesMeta(null);
        setFacebookPixels([]);
      } finally {
        if (!isCancelled) {
          setLoadingAudiences(false);
          setLoadingAdAccounts(false);
        }
      }
    };

    loadData();

    return () => {
      isCancelled = true;
    };
  }, [
    loadPagesAndPixels,
    refreshSavedAdAccounts,
    requestedAdAccountId,
    resolveAdAccountId,
    saveAdAccountSelection,
  ]);

  const toggleCustomAudience = (id: string) => {
    setSelectedCustomAudiences((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id],
    );
  };

  const toggleLookalikeAudience = (id: string) => {
    setSelectedLookalikeAudiences((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id],
    );
  };

  const handleSubmit = async () => {
    if (!validateStep(6)) return;

    try {
      setLoading(true);
      setShowPublishConfirm(false);
      const activeAdAccountId = await ensureSelectedAdAccountReady();
      const normalizedBidStrategy = normalizeWizardBidStrategy(
        formData.bidStrategy,
      );
      const normalizedAttributionWindow =
        normalizeAttributionWindowForObjective(
          formData.objective,
          formData.attributionWindow,
        );
      const usesConversionOptimization =
        formData.objective === "OUTCOME_SALES" ||
        formData.objective === "OUTCOME_LEADS";
      const targeting = buildCreateAdWizardTargetingPayload(formData, {
        selectedInterests,
        selectedCustomAudiences,
        selectedLookalikeAudiences,
        excludedAudiences,
        selectedLanguages,
        selectedDevices,
        relationshipStatuses,
        selectedEducation,
      });

      const data: CreateFullAdData = {
        adAccountId: activeAdAccountId,
        clientRequestId: publishRequestId,
        idempotencyKey: publishRequestId,
        ...(formData.status === "ACTIVE" &&
          activePublishConfirmed && {
            allowActivePublish: true,
            activePublishConfirmationToken: "ACTIVE_PUBLISH_CONFIRMED",
          }),

        // Campaign
        campaignName: formData.campaignName,
        objective: formData.objective,
        specialAdCategories: formData.specialAdCategories.filter(
          (c) => c !== "NONE",
        ),

        // Ad Set Level - الميزات الجديدة
        ...(formData.adSetName && { adSetName: formData.adSetName }),
        ...(usesConversionOptimization && {
          performanceGoal: formData.performanceGoal,
          conversionEvent: formData.conversionEvent,
          conversionLocation: formData.conversionLocation,
          pixelId: formData.pixelId,
        }),
        attributionWindow: normalizedAttributionWindow,
        dynamicCreative: formData.dynamicCreative,

        // Budget
        budgetOptimization: formData.budgetOptimization,
        budgetType: formData.budgetType,
        budgetAmount: formData.budgetAmount,
        bidStrategy: normalizedBidStrategy,
        ...(formData.bidValue && { bidValue: formData.bidValue }),
        ...(formData.frequencyCap && { frequencyCap: formData.frequencyCap }),
        ...(formData.frequencyCapInterval && {
          frequencyCapInterval: formData.frequencyCapInterval,
        }),

        // Schedule
        ...(formData.startTime && { startTime: formData.startTime }),
        ...(formData.endTime && { endTime: formData.endTime }),

        // Targeting
        targeting,

        // Placements
        placementType: formData.placementType,
        ...(formData.placementType === "MANUAL" &&
          formData.placements.length > 0 && {
            placements: formData.placements,
          }),

        // Creative
        ...(formData.adName && { adName: formData.adName }),
        pageId: formData.pageId,
        creativeType: formData.creativeType,
        primaryText: formData.primaryText,
        ...(formData.headline && { headline: formData.headline }),
        ...(formData.description && { description: formData.description }),
        callToAction: formData.callToAction,
        linkUrl: formData.linkUrl,
        ...(formData.productId && { productId: formData.productId }),
        ...(formData.displayLink && { displayLink: formData.displayLink }),
        ...(formData.urlParameters && {
          urlParameters: formData.urlParameters,
        }),
        ...(formData.creativeType === "SINGLE_IMAGE" &&
          formData.imageUrl && { imageUrl: formData.imageUrl }),
        ...(formData.creativeType === "SINGLE_VIDEO" &&
          formData.videoUrl && { videoUrl: formData.videoUrl }),
        ...(formData.creativeType === "CAROUSEL" &&
          formData.carouselCards.length > 0 && {
            carouselCards: formData.carouselCards,
          }),
        ...(formData.creativeType === "FLEXIBLE" &&
          formData.flexibleAssets.length > 0 && {
            flexibleAssets: formData.flexibleAssets,
          }),
        ...(formData.textVariations.length > 0 && {
          textVariations: formData.textVariations,
        }),
        ...(formData.headlineVariations.length > 0 && {
          headlineVariations: formData.headlineVariations,
        }),
        ...(formData.useLeadForm &&
          formData.leadFormId && { leadFormId: formData.leadFormId }),

        // Advantage+ Creative
        advantageCreative: formData.advantageCreative,
        textGeneration: formData.textGeneration,
        imageEnhancement: formData.imageEnhancement,

        // Status
        status: formData.status,
      };

      const result = await facebookAdsService.createFullAd(data);

      if (result.success) {
        const facebookIds = result.data?.facebookIds || result.facebookIds;
        const campaignId = result.campaignId || facebookIds?.campaignId;
        const adSetId = result.adSetId || facebookIds?.adSetId;
        const adId = result.adId || facebookIds?.adId;
        const localCampaignId = getResultEntityId(result.data?.campaign);
        const localAdSetId = getResultEntityId(result.data?.adSet);
        const localAdId = getResultEntityId(result.data?.ad);
        const idSummary = [
          campaignId && `Campaign ${campaignId}`,
          adSetId && `Ad Set ${adSetId}`,
          adId && `Ad ${adId}`,
        ]
          .filter(Boolean)
          .join(" • ");

        toast.success(
          result.partialSuccess
            ? `تم إنشاء الإعلان على Meta مع تحذير حفظ محلي. ${idSummary}`
            : `تم إنشاء الإعلان بنجاح. ${idSummary}`,
          { duration: 8000 },
        );
        setCreatedFullAd({
          localCampaignId,
          localAdSetId,
          localAdId,
          facebookCampaignId: campaignId,
          facebookAdSetId: adSetId,
          facebookAdId: adId,
          creativeId: result.creativeId || facebookIds?.creativeId,
          status: formData.status,
          adAccountId: activeAdAccountId,
        });
        setCurrentStep(6);
      } else {
        toast.error(result.error || "فشل في إنشاء الإعلان");
      }
    } catch (error: unknown) {
      console.error("Error creating ad:", error);
      const responseData =
        error &&
        typeof error === "object" &&
        "response" in error &&
        error.response &&
        typeof error.response === "object" &&
        "data" in error.response &&
        error.response.data &&
        typeof error.response.data === "object"
          ? (error.response.data as {
              error?: string;
              errorCode?: string;
              retryableWithNewRequestId?: boolean;
              status?: string;
            })
          : null;
      const shouldRotatePublishRequest =
        responseData?.retryableWithNewRequestId === true ||
        [
          "FACEBOOK_AD_PUBLISH_PAYLOAD_MISMATCH",
          "FACEBOOK_AD_PUBLISH_PRE_META_FAILED",
          "FACEBOOK_AD_PUBLISH_REQUEST_STALE",
        ].includes(responseData?.errorCode || "") ||
        (responseData?.errorCode === "FACEBOOK_AD_PUBLISH_REQUEST_LOCKED" &&
          ["FAILED", "STALE", "STALE_IN_PROGRESS"].includes(
            responseData?.status || "",
          ));

      if (shouldRotatePublishRequest) {
        setPublishRequestId(createClientRequestId("fb-full-ad"));
      }
      toast.error(responseData?.error || "حدث خطأ أثناء إنشاء الإعلان");
    } finally {
      setLoading(false);
    }
  };

  const activeSavedAdAccountId =
    savedAdAccounts.find((account) => account.isActive)?.accountId || "";
  const selectedAdAccountIsActive =
    Boolean(selectedAdAccountId) &&
    activeSavedAdAccountId === selectedAdAccountId;
  const readyCompanyPages = facebookPages.filter(
    (page) => page.status === "READY",
  );
  const accessibleUnlinkedPages = facebookPages.filter(
    (page) => page.status === "ACCESSIBLE_BUT_NOT_CONNECTED",
  );
  const connectedButUnavailablePages = facebookPages.filter(
    (page) => page.status === "CONNECTED_BUT_NOT_ACCESSIBLE",
  );
  const selectedFacebookPage =
    facebookPages.find((page) => page.id === formData.pageId) || null;
  const selectedFacebookPixel =
    facebookPixels.find((pixel) => pixel.id === formData.pixelId) || null;
  const selectedSavedAdAccount =
    savedAdAccounts.find((account) => account.accountId === selectedAdAccountId) ||
    null;
  const selectedRemoteAdAccount =
    adAccounts.find((account) => resolveAdAccountId(account) === selectedAdAccountId) ||
    null;
  const selectedAdAccountCurrency =
    selectedSavedAdAccount?.currency || selectedRemoteAdAccount?.currency || "EGP";
  const minimumWizardBudget = getFullAdMinimumBudgetAmount(selectedAdAccountCurrency);
  const getAdAccountBusinessKey = (account: FacebookAdAccount) =>
    account.business?.id ||
    account.billingHealth?.business?.id ||
    "unassigned-business";
  const getAdAccountBusinessName = (account: FacebookAdAccount) =>
    account.business?.name ||
    account.billingHealth?.business?.name ||
    "حسابات بدون Business واضح";
  const adAccountBusinessGroups = adAccounts.reduce<
    Array<{
      businessKey: string;
      businessName: string;
      accounts: FacebookAdAccount[];
    }>
  >((groups, account) => {
    const businessKey = getAdAccountBusinessKey(account);
    const existingGroup = groups.find((group) => group.businessKey === businessKey);

    if (existingGroup) {
      existingGroup.accounts.push(account);
      return groups;
    }

    groups.push({
      businessKey,
      businessName: getAdAccountBusinessName(account),
      accounts: [account],
    });
    return groups;
  }, []);
  const selectedBusinessName = selectedRemoteAdAccount
    ? getAdAccountBusinessName(selectedRemoteAdAccount)
    : "غير محدد";
  const selectedAdAccountName =
    selectedSavedAdAccount?.name ||
    selectedRemoteAdAccount?.name ||
    selectedAdAccountId ||
    "غير محدد";
  const selectedAccountHealthLabel =
    selectedRemoteAdAccount?.billingHealth?.accountStatusLabel ||
    (selectedAdAccountIsActive ? "مفعل داخل MaxP" : "يحتاج تفعيل");
  const selectedObjectiveLabel =
    objectives.find((objective) => objective.value === formData.objective)?.label ||
    formData.objective ||
    (isEn ? "Unspecified" : "غير محدد");
  const selectedCreativeSummary =
    formData.creativeType === "CAROUSEL"
      ? `Carousel - ${formData.carouselCards.length} ${isEn ? "cards" : "كارت"}`
      : formData.creativeType === "SINGLE_IMAGE"
        ? (isEn ? "Single Image" : "صورة واحدة")
        : formData.creativeType === "SINGLE_VIDEO"
          ? (isEn ? "Single Video" : "فيديو واحد")
          : `Flexible - ${formData.flexibleAssets.length} ${isEn ? "files" : "ملف"}`;
  const publishConfirmDisabled =
    loading ||
    !publishAccountConfirmed ||
    (formData.status === "ACTIVE" && !activePublishConfirmed);
  const currentWizardStep =
    wizardSteps.find((step) => step.id === currentStep) ?? wizardSteps[0]!;
  const formatSelectedAdAccountCurrency = (value?: number) =>
    new Intl.NumberFormat(isEn ? "en-US" : "ar-EG", {
      style: "currency",
      currency: selectedAdAccountCurrency,
      maximumFractionDigits: 2,
    }).format(value || 0);
  const selectedGeoSummary =
    formData.regions.length > 0 || formData.cities.length > 0
      ? [
          ...formData.regions.map((region) => `محافظة ${region.name}`),
          ...formData.cities.map((city) => `مدينة ${city.name}`),
        ].join(", ")
      : formData.locations
          .map((location) => COUNTRIES.find((country) => country.code === location)?.name)
          .filter(Boolean)
          .join(", ");
  const compatibleAttributionWindows = getCompatibleAttributionWindows(
    formData.objective,
    ATTRIBUTION_WINDOWS,
  );
  const selectedAttributionWindowLabel =
    compatibleAttributionWindows.find(
      (window) => window.value === formData.attributionWindow,
    )?.label ||
    ATTRIBUTION_WINDOWS.find((window) => window.value === formData.attributionWindow)
      ?.label ||
    normalizeAttributionWindowForObjective(
      formData.objective,
      formData.attributionWindow,
    );
  const selectedTargetingSignalCount =
    selectedInterests.length +
    selectedCustomAudiences.length +
    selectedLookalikeAudiences.length +
    excludedAudiences.length +
    selectedLanguages.length +
    selectedDevices.length +
    relationshipStatuses.length +
    selectedEducation.length;

  const handleRequestPublishConfirmation = () => {
    if (!validateStep(6)) {
      if (isAiDraftPrefill) {
        setShowFullWizard(true);
        setCurrentStep(1);
      }
      return;
    }

    if (!selectedAdAccountIsActive) {
      setShowFullWizard(true);
      setCurrentStep(2);
      setErrors((prev) => ({
        ...prev,
        adAccountId:
          "فعّل الحساب الإعلاني المختار قبل إنشاء الإعلان حتى نثبت الحساب المقصود.",
      }));
      tToast.error("CreateAdWizard.msg_93bd");
      return;
    }

    restorePublishFocusRef.current = document.activeElement as HTMLElement | null;
    setPublishAccountConfirmed(false);
    setActivePublishConfirmed(false);
    setShowPublishConfirm(true);
  };

  const closePublishConfirmation = useCallback(() => {
    if (loading) return;
    setShowPublishConfirm(false);
  }, [loading]);

  const getPublishDialogFocusableElements = useCallback(() => {
    const dialog = publishDialogRef.current;
    if (!dialog) return [];

    return Array.from(
      dialog.querySelectorAll<HTMLElement>(
        [
          "button:not([disabled])",
          "input:not([disabled])",
          "select:not([disabled])",
          "textarea:not([disabled])",
          "a[href]",
          '[tabindex]:not([tabindex="-1"])',
        ].join(", "),
      ),
    ).filter((element) => element.offsetParent !== null);
  }, []);

  React.useEffect(() => {
    if (!showPublishConfirm) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusTimer = window.setTimeout(() => {
      const [firstElement] = getPublishDialogFocusableElements();
      firstElement?.focus();
    }, 0);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !loading) {
        event.preventDefault();
        closePublishConfirmation();
        return;
      }

      if (event.key !== "Tab") return;

      const focusableElements = getPublishDialogFocusableElements();
      if (focusableElements.length === 0) {
        event.preventDefault();
        publishDialogRef.current?.focus();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      if (!firstElement || !lastElement) return;

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
        return;
      }

      if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      restorePublishFocusRef.current?.focus?.();
    };
  }, [
    closePublishConfirmation,
    getPublishDialogFocusableElements,
    loading,
    showPublishConfirm,
  ]);

  // ============================================
  // Render Steps
  // ============================================

  const renderPublishConfirmationModal = () => {
    if (!showPublishConfirm) {
      return null;
    }

    const confirmationRows = [
      ["Business", selectedBusinessName],
      ["Ad Account", `${selectedAdAccountName} / act_${selectedAdAccountId}`],
      ["Page", selectedFacebookPage?.name || "غير محددة"],
      [
        "Pixel",
        selectedFacebookPixel
          ? `${selectedFacebookPixel.name} / ${selectedFacebookPixel.id}`
          : "غير محدد",
      ],
      ["Campaign", formData.campaignName],
      ["Objective", selectedObjectiveLabel],
      [
        "Budget",
        `${formatSelectedAdAccountCurrency(formData.budgetAmount)} / ${
          formData.budgetType === "DAILY" ? "يوميا" : "إجمالي"
        }`,
      ],
      ["Attribution", selectedAttributionWindowLabel],
      ["Audience", selectedGeoSummary || "لم يتم تحديد نطاق جغرافي واضح"],
      ["Targeting signals", `${selectedTargetingSignalCount} اختيار`],
      ["Creative", selectedCreativeSummary],
      ["Status", formData.status === "PAUSED" ? "PAUSED - آمن" : "ACTIVE - يبدأ فورا"],
    ];

    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="publish-confirm-title"
      >
        <div
          ref={publishDialogRef}
          tabIndex={-1}
          className="max-h-[90vh] w-full max-w-3xl overflow-y-auto overscroll-contain rounded-3xl bg-white shadow-2xl"
        >
          <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
            <div>
              <p className="text-sm font-semibold text-blue-600">
                مراجعة قبل الإرسال إلى Meta
              </p>
              <h3
                id="publish-confirm-title"
                className="mt-1 text-2xl font-bold text-slate-950"
              >
                تأكيد إنشاء الإعلان الحقيقي
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                هذه الخطوة سترسل Campaign وAd Set وAd إلى Ads Manager. راجع
                الحساب والميزانية والحالة قبل التأكيد.
              </p>
            </div>
            <button
              type="button"
              onClick={closePublishConfirmation}
              disabled={loading}
              aria-label="إغلاق شاشة تأكيد النشر"
              className="rounded-full p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>

          <div className="space-y-5 px-6 py-5">
            <div className="grid gap-3 md:grid-cols-2">
              {confirmationRows.map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                >
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {label}
                  </div>
                  <div className="mt-1 break-words text-sm font-semibold text-slate-950">
                    {value}
                  </div>
                </div>
              ))}
            </div>

            {formData.status === "ACTIVE" ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-800">
                الإعلان مضبوط على ACTIVE، يعني ممكن يبدأ الصرف بعد موافقة Meta.
                الأفضل لأول تجربة إنتاج يكون PAUSED ثم يتم تفعيله من Ads
                Manager بعد المراجعة.
              </div>
            ) : (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-800">
                الوضع الحالي PAUSED، وده الاختيار الآمن: سيتم إنشاء الإعلان
                بدون تشغيل الصرف مباشرة.
              </div>
            )}

            {selectedRemoteAdAccount?.billingHealth?.isAccountUsable === false && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
                Meta يشير أن الحساب قد لا يكون جاهزا بالكامل:{" "}
                {selectedRemoteAdAccount.billingHealth.disableReason ||
                  selectedAccountHealthLabel}
              </div>
            )}

            <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-700">
              <input
                type="checkbox"
                name="confirmAdAccount"
                checked={publishAccountConfirmed}
                onChange={(event) =>
                  setPublishAccountConfirmed(event.target.checked)
                }
                className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus-visible:ring-blue-500"
              />
              <span>
                أؤكد أن الحساب المختار هو الحساب المقصود لإنشاء الإعلان:
                <strong className="mx-1 text-slate-950">
                  {selectedAdAccountName}
                </strong>
                <span translate="no">act_{selectedAdAccountId}</span>.
              </span>
            </label>

            {formData.status === "ACTIVE" && (
              <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-800">
                <input
                  type="checkbox"
                  name="confirmActivePublish"
                  checked={activePublishConfirmed}
                  onChange={(event) =>
                    setActivePublishConfirmed(event.target.checked)
                  }
                  className="mt-1 h-4 w-4 rounded border-red-300 text-red-600 focus-visible:ring-red-500"
                />
                <span>
                  أؤكد أني أريد تشغيل الإعلان كـACTIVE وقد يبدأ الصرف بعد
                  موافقة Meta.
                </span>
              </label>
            )}
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-slate-50 px-6 py-5 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={closePublishConfirmation}
              disabled={loading}
              className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              رجوع للمراجعة
            </button>
            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={publishConfirmDisabled}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-600 px-6 py-3 text-sm font-semibold text-white hover:bg-green-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                  جاري الإرسال إلى Meta...
                </>
              ) : (
                <>
                  <CheckCircle className="h-5 w-5" aria-hidden="true" />
                  تأكيد وإنشاء الإعلان
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderAiDraftReview = () => {
    const compactRows = [
      ["الحساب", `${selectedAdAccountName} / act_${selectedAdAccountId || requestedAdAccountId}`],
      ["الصفحة", selectedFacebookPage?.name || formData.pageId || "غير محددة"],
      [
        "Pixel",
        selectedFacebookPixel
          ? `${selectedFacebookPixel.name} / ${selectedFacebookPixel.id}`
          : formData.pixelId || "غير محدد",
      ],
      ["الهدف", selectedObjectiveLabel],
      [
        "الميزانية",
        `${formatSelectedAdAccountCurrency(formData.budgetAmount)} / ${
          formData.budgetType === "DAILY" ? "يوميا" : "إجمالي"
        }`,
      ],
      ["الجمهور", selectedGeoSummary || "غير محدد"],
      ["السن", `${formData.ageMin} - ${formData.ageMax}`],
      ["الكرياتيف", selectedCreativeSummary],
    ];

    const returnParams = new URLSearchParams();
    const returnAccountId = selectedAdAccountId || requestedAdAccountId;
    if (returnAccountId) {
      returnParams.set("adAccountId", returnAccountId);
    }

    return (
      <div className="min-h-screen bg-slate-50 px-3 py-3 text-slate-950 dark:bg-slate-950 dark:text-white sm:px-4 lg:px-5">
        <div className="mx-auto flex max-w-6xl flex-col gap-3">
          <div className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="text-xs font-bold text-blue-600">
                مراجعة المسودة
              </div>
              <h1 className="mt-1 truncate text-lg font-black text-slate-950 dark:text-white">
                {formData.campaignName || prefillProductTitle}
              </h1>
              <div className="mt-1 flex flex-wrap gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                <span>{prefillProductTitle}</span>
                <span>{selectedCreativeSummary}</span>
                <span>{formData.status}</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowFullWizard(true);
                  setCurrentStep(1);
                }}
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              >
                تعديل كامل
              </button>
              <button
                type="button"
                onClick={() =>
                  navigate(
                    `/advertising/facebook-ads${
                      returnParams.toString() ? `?${returnParams.toString()}` : ""
                    }`,
                  )
                }
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              >
                رجوع لمركز الإعلانات
              </button>
            </div>
          </div>

          {Object.values(errors).some(Boolean) && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-800">
              {Object.values(errors).filter(Boolean).join(" - ")}
            </div>
          )}

          <div className="grid gap-3 lg:grid-cols-[1fr_320px]">
            <section className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {compactRows.map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-950"
                  >
                    <div className="text-[11px] font-bold uppercase text-slate-500">
                      {label}
                    </div>
                    <div className="mt-1 break-words text-sm font-bold text-slate-950 dark:text-white">
                      {value}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-3 grid gap-3 lg:grid-cols-2">
                <div className="rounded-md border border-slate-200 p-3 dark:border-slate-800">
                  <div className="text-xs font-bold text-slate-500">
                    النص الأساسي
                  </div>
                  <p className="mt-2 max-h-28 overflow-y-auto text-sm leading-6 text-slate-800 dark:text-slate-200">
                    {formData.primaryText || "غير محدد"}
                  </p>
                </div>
                <div className="rounded-md border border-slate-200 p-3 dark:border-slate-800">
                  <div className="text-xs font-bold text-slate-500">
                    العنوان والرابط
                  </div>
                  <div className="mt-2 text-sm font-bold text-slate-950 dark:text-white">
                    {formData.headline || "بدون عنوان"}
                  </div>
                  <div className="mt-1 truncate text-xs font-semibold text-blue-600">
                    {formData.linkUrl || "بدون رابط"}
                  </div>
                </div>
              </div>
            </section>

            <aside className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="text-sm font-black text-slate-950 dark:text-white">
                حالة النشر
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleChange("status", "PAUSED")}
                  className={`rounded-md border px-3 py-2 text-sm font-bold ${
                    formData.status === "PAUSED"
                      ? "border-amber-400 bg-amber-50 text-amber-800"
                      : "border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-200"
                  }`}
                >
                  PAUSED
                </button>
                <button
                  type="button"
                  onClick={() => handleChange("status", "ACTIVE")}
                  className={`rounded-md border px-3 py-2 text-sm font-bold ${
                    formData.status === "ACTIVE"
                      ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                      : "border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-200"
                  }`}
                >
                  ACTIVE
                </button>
              </div>
              <button
                type="button"
                onClick={handleRequestPublishConfirmation}
                disabled={loading}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-md bg-green-600 px-4 py-3 text-sm font-black text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    جاري الإنشاء...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    مراجعة الإرسال
                  </>
                )}
              </button>
              <div className="mt-3 rounded-md bg-slate-50 p-2 text-xs font-semibold leading-5 text-slate-600 dark:bg-slate-950 dark:text-slate-300">
                سيتم استخدام نفس قفل الدرفت وطلب نشر جديد آمن من التكرار.
              </div>
            </aside>
          </div>
        </div>
        {renderPublishConfirmationModal()}
      </div>
    );
  };

  // ============================================
  // Main Render
  // ============================================

  if (isAiDraftPrefill && !showFullWizard) {
    return renderAiDraftReview();
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="w-full px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {isEn ? "Create New Ad" : "إنشاء إعلان جديد"}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            {isEn
              ? "Follow the steps to create a professional advertising campaign"
              : "اتبع الخطوات لإنشاء حملة إعلانية احترافية"}
          </p>
        </div>

        {isStorefrontProductLaunch && (
          <div className="mb-6 rounded-2xl border border-blue-200 bg-blue-50/80 p-4 text-sm text-blue-900 shadow-sm dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-200">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-900/80 dark:text-blue-300">
                  <Sparkles className="h-3.5 w-3.5" />
                  سيناريو منتج المتجر
                </span>
                <p className="mt-1 font-medium">
                  تم ملء بيانات الإعلان تلقائياً لمنتج:{" "}
                  <span className="font-bold">{launchPrefillProductTitle}</span>
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs">
                {productLaunchUrl && (
                  <a
                    href={productLaunchUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-semibold text-blue-700 underline hover:text-blue-900 dark:text-blue-300 dark:hover:text-blue-100"
                  >
                    فتح رابط المنتج
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
                {isAiDraftPrefill && !showFullWizard && (
                  <button
                    type="button"
                    onClick={() => setShowFullWizard(true)}
                    className="font-semibold text-blue-700 underline hover:text-blue-900 dark:text-blue-300 dark:hover:text-blue-100"
                  >
                    تعديل متقدم في المعالج الكامل
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Stepper */}
        <div className="mb-8 overflow-x-auto">
          <div className="flex items-center justify-between min-w-[700px] max-w-4xl mx-auto px-4">
            {wizardSteps.map((step, index) => (
              <React.Fragment key={step.id}>
                <div className="flex flex-col items-center">
                  <div
                    className={"w-12 h-12 rounded-full flex items-center justify-center transition-all " +
                      (currentStep === step.id
                        ? "bg-blue-600 text-white ring-4 ring-blue-100 dark:ring-blue-900"
                        : currentStep > step.id
                          ? "bg-green-500 text-white"
                          : "bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400")
                    }
                  >
                    {step.icon}
                  </div>
                  <span
                    className={"text-xs mt-2 font-medium text-center max-w-[80px] " +
                      (currentStep === step.id
                        ? "text-blue-600 dark:text-blue-400"
                        : "text-gray-500 dark:text-gray-400")
                    }
                  >
                    {step.title}
                  </span>
                </div>
                {index < wizardSteps.length - 1 && (
                  <div
                    className={"flex-1 h-1 mx-2 transition-all " +
                      (currentStep > step.id
                        ? "bg-green-500"
                        : "bg-gray-200 dark:bg-gray-700")
                    }
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 md:p-8 mb-8">
          {currentStep === 1 && (
            <Step1Campaign
              formData={formData}
              handleChange={handleChange}
              toggleArrayValue={toggleArrayValue}
              getError={getError}
            />
          )}

          {currentStep === 2 && (
            <Step2BudgetSchedule
              formData={formData}
              setFormData={setFormData}
              handleChange={handleChange}
              getError={getError}
              selectedAdAccountIsActive={selectedAdAccountIsActive}
              loadingAdAccounts={loadingAdAccounts}
              adAccounts={adAccounts}
              selectedAdAccountId={selectedAdAccountId}
              setSelectedAdAccountId={setSelectedAdAccountId}
              setPublishAccountConfirmed={setPublishAccountConfirmed}
              setFacebookPixels={setFacebookPixels}
              loadPagesAndPixels={loadPagesAndPixels}
              adAccountsByBusiness={adAccountsByBusiness}
              selectedAdAccount={selectedAdAccount}
              savedAdAccounts={savedAdAccounts}
              syncingAdAccount={syncingAdAccount}
              handleActivateSelectedAdAccount={handleActivateSelectedAdAccount}
              loadingPixels={loadingPixels}
              facebookPixels={facebookPixels}
              selectedAdAccountCurrency={selectedAdAccountCurrency}
              minimumDailyBudgetAmount={minimumDailyBudgetAmount}
              minimumLifetimeBudgetAmount={minimumLifetimeBudgetAmount}
              compatibleAttributionWindows={compatibleAttributionWindows}
            />
          )}

          {currentStep === 3 && (
            <Step3Targeting
              formData={formData}
              handleChange={handleChange}
              toggleArrayValue={toggleArrayValue}
              getError={getError}
              showAdvancedTargeting={showAdvancedTargeting}
              setShowAdvancedTargeting={setShowAdvancedTargeting}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              searchResults={searchResults}
              searchLoading={searchLoading}
              handleSearchInterests={handleSearchInterests}
              selectedInterests={selectedInterests}
              addInterest={addInterest}
              removeInterest={removeInterest}
              relationshipStatuses={relationshipStatuses}
              toggleRelationshipStatus={toggleRelationshipStatus}
              selectedLanguages={selectedLanguages}
              toggleLanguage={toggleLanguage}
              selectedDevices={selectedDevices}
              toggleDevice={toggleDevice}
              loadingAudiences={loadingAudiences}
              customAudiences={customAudiences}
              selectedCustomAudiences={selectedCustomAudiences}
              toggleCustomAudience={toggleCustomAudience}
              lookalikeAudiences={lookalikeAudiences}
              selectedLookalikeAudiences={selectedLookalikeAudiences}
              toggleLookalikeAudience={toggleLookalikeAudience}
              excludedAudiences={excludedAudiences}
              setExcludedAudiences={setExcludedAudiences}
            />
          )}

          {currentStep === 4 && (
            <Step4Placements
              formData={formData}
              handleChange={handleChange}
              toggleArrayValue={toggleArrayValue}
              getError={getError}
            />
          )}

          {currentStep === 5 && (
            <Step5Creative
              formData={formData}
              setFormData={setFormData}
              handleChange={handleChange}
              getError={getError}
              facebookPages={facebookPages}
              facebookPagesMeta={facebookPagesMeta}
              loadingPages={loadingPages}
              selectedFacebookPage={selectedFacebookPage}
              selectedAdAccount={selectedAdAccount}
              selectedAdAccountId={selectedAdAccountId}
              selectedAdAccountIsActive={selectedAdAccountIsActive}
              syncingAdAccount={syncingAdAccount}
              handleActivateSelectedAdAccount={handleActivateSelectedAdAccount}
              isStorefrontProductLaunch={isStorefrontProductLaunch}
              isAiDraftPrefill={isAiDraftPrefill}
              launchPrefillProductTitle={launchPrefillProductTitle}
            />
          )}

          {currentStep === 6 && (
            <Step6Review
              createdFullAd={createdFullAd}
              formData={formData}
              handleChange={handleChange}
              selectedBusinessName={selectedBusinessName}
              selectedAdAccountName={selectedAdAccountName}
              selectedAdAccountId={selectedAdAccountId}
              selectedFacebookPage={selectedFacebookPage}
              selectedFacebookPixel={selectedFacebookPixel}
              selectedAdAccountCurrency={selectedAdAccountCurrency}
              selectedInterests={selectedInterests}
              selectedCustomAudiences={selectedCustomAudiences}
              customAudiences={customAudiences}
              selectedLookalikeAudiences={selectedLookalikeAudiences}
              lookalikeAudiences={lookalikeAudiences}
            />
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between items-center" dir={isEn ? "ltr" : "rtl"}>
          <button
            type="button"
            onClick={handleBack}
            disabled={currentStep === 1}
            className="flex items-center gap-2 px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
          >
            {isEn ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
            {isEn ? "Previous" : "السابق"}
          </button>

          {currentStep < 6 ? (
            <button
              type="button"
              onClick={handleNext}
              className="flex items-center gap-2 px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all font-medium shadow-lg shadow-blue-500/25"
            >
              {isEn ? "Next" : "التالي"}
              {isEn ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleRequestPublishConfirmation}
              disabled={loading}
              className="flex items-center gap-2 px-8 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl transition-all font-medium shadow-lg shadow-green-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {isEn ? "Publishing..." : "جاري النشر..."}
                </>
              ) : (
                <>
                  {isEn ? "Review & Publish" : "مراجعة وتأكيد النشر"}
                  <Sparkles className="w-5 h-5" />
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {renderPublishConfirmationModal()}
    </div>
  );
};

export default CreateAdWizard;
