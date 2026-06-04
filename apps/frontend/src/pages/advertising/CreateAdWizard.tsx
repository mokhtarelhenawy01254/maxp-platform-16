/**
 * 🚀 Create Ad Wizard
 *
 * صفحة إنشاء إعلان كامل (Campaign + AdSet + Ad)
 * تتبع منطق Facebook Ads Manager الصحيح
 */

import React, { useState, useCallback, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import {
  Target,
  DollarSign,
  Users,
  Layout,
  Image,
  CheckCircle,
  ChevronRight,
  ChevronLeft,
  Loader2,
  AlertCircle,
  Sparkles,
  Calendar,
  Globe,
  Zap,
  Eye,
  Facebook,
  Instagram,
  MessageCircle,
  Search,
  X,
  Heart,
  Smartphone,
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
  MetaGeoLocation,
} from "../../services/facebookAdsService";
import MetaGeoTargetingSelector from "../../components/advertising/MetaGeoTargetingSelector";
import {
  buildCreateAdWizardTargetingPayload,
  getCompatibleAttributionWindows,
  getFullAdMinimumBudgetAmount,
  isCappedBidStrategy,
  normalizeAttributionWindowForObjective,
  normalizeWizardBidStrategy,
} from "./CreateAdWizard.helpers";

const DEFAULT_WIZARD_BUDGET_AMOUNT = 200;
const SHOW_EXPERIMENTAL_TARGETING_CONTROLS = false;

// ============================================
// Types
// ============================================

interface WizardStep {
  id: number;
  title: string;
  description: string;
  icon: React.ReactNode;
}

interface CarouselCard {
  id: string;
  imageUrl: string;
  headline: string;
  description: string;
  linkUrl: string;
}

interface TextVariation {
  id: string;
  text: string;
}

interface HeadlineVariation {
  id: string;
  text: string;
}

interface CreatedFullAdSummary {
  localCampaignId?: string;
  localAdSetId?: string;
  localAdId?: string;
  facebookCampaignId?: string;
  facebookAdSetId?: string;
  facebookAdId?: string;
  creativeId?: string;
  status: "ACTIVE" | "PAUSED";
  adAccountId: string;
}

const getResultEntityId = (entity: unknown) =>
  entity && typeof entity === "object" && "id" in entity
    ? String((entity as Record<string, unknown>)["id"])
    : undefined;

interface FormData {
  // Step 1: Campaign
  campaignName: string;
  adSetName: string;
  adName: string;
  objective: string;
  specialAdCategories: string[];

  // Step 2: Ad Set Level
  performanceGoal: string;
  conversionEvent: string;
  conversionLocation: string;
  attributionWindow: string;
  dynamicCreative: boolean;
  pixelId: string;
  budgetOptimization: boolean;
  budgetType: "DAILY" | "LIFETIME";
  budgetAmount: number;
  bidStrategy: string;
  bidValue?: number;
  startTime: string;
  endTime: string;
  frequencyCap?: number;
  frequencyCapInterval?: "DAY" | "WEEK" | "MONTH";

  // Step 3: Targeting
  ageMin: number;
  ageMax: number;
  genders: string[];
  locations: string[];
  regions: MetaGeoLocation[];
  cities: MetaGeoLocation[];
  locationTypes: Array<"home" | "recent">;
  interests: string[];
  advantageAudience: boolean;

  // Step 4: Placements
  placementType: "AUTOMATIC" | "MANUAL";
  placements: string[];

  // Step 5: Ad Creative
  pageId: string;
  creativeType: "SINGLE_IMAGE" | "SINGLE_VIDEO" | "CAROUSEL" | "FLEXIBLE";
  primaryText: string;
  headline: string;
  description: string;
  callToAction: string;
  linkUrl: string;
  productId: string;
  displayLink: string;
  urlParameters: string;
  imageUrl: string;
  videoUrl: string;
  carouselCards: CarouselCard[];
  flexibleAssets: { id: string; type: "IMAGE" | "VIDEO"; url: string }[];
  textVariations: TextVariation[];
  headlineVariations: HeadlineVariation[];
  useLeadForm: boolean;
  leadFormId?: string;

  // Advantage+ Creative
  advantageCreative: boolean;
  textGeneration: boolean;
  imageEnhancement: boolean;

  // Status
  status: "ACTIVE" | "PAUSED";
}

// ============================================
// Constants
// ============================================

const WIZARD_STEPS: WizardStep[] = [
  {
    id: 1,
    title: "هدف الحملة",
    description: "اختر هدف حملتك الإعلانية",
    icon: <Target className="w-5 h-5" />,
  },
  {
    id: 2,
    title: "الميزانية والجدولة",
    description: "حدد ميزانيتك ومواعيد الإعلان",
    icon: <DollarSign className="w-5 h-5" />,
  },
  {
    id: 3,
    title: "الاستهداف",
    description: "حدد جمهورك المستهدف",
    icon: <Users className="w-5 h-5" />,
  },
  {
    id: 4,
    title: "المواضع",
    description: "اختر أين يظهر إعلانك",
    icon: <Layout className="w-5 h-5" />,
  },
  {
    id: 5,
    title: "المحتوى الإبداعي",
    description: "أنشئ إعلانك",
    icon: <Image className="w-5 h-5" />,
  },
  {
    id: 6,
    title: "المراجعة والنشر",
    description: "راجع وانشر إعلانك",
    icon: <CheckCircle className="w-5 h-5" />,
  },
];

const OBJECTIVES = [
  {
    value: "OUTCOME_AWARENESS",
    label: "الوعي",
    description: "زيادة الوعي بعلامتك التجارية",
    icon: <Eye className="w-6 h-6" />,
  },
  {
    value: "OUTCOME_TRAFFIC",
    label: "الزيارات",
    description: "زيادة زيارات موقعك",
    icon: <Globe className="w-6 h-6" />,
  },
  {
    value: "OUTCOME_ENGAGEMENT",
    label: "التفاعل",
    description: "زيادة التفاعل مع منشوراتك",
    icon: <Users className="w-6 h-6" />,
  },
  {
    value: "OUTCOME_LEADS",
    label: "العملاء المحتملين",
    description: "جمع بيانات العملاء",
    icon: <Target className="w-6 h-6" />,
  },
  {
    value: "OUTCOME_SALES",
    label: "المبيعات",
    description: "زيادة المبيعات والتحويلات",
    icon: <DollarSign className="w-6 h-6" />,
  },
  {
    value: "OUTCOME_APP_PROMOTION",
    label: "ترويج التطبيق",
    description: "زيادة تحميلات التطبيق",
    icon: <Zap className="w-6 h-6" />,
  },
];

const SPECIAL_AD_CATEGORIES = [
  { value: "NONE", label: "لا شيء" },
  { value: "HOUSING", label: "إسكان" },
  { value: "EMPLOYMENT", label: "توظيف" },
  { value: "CREDIT", label: "ائتمان" },
  { value: "ISSUES_ELECTIONS_POLITICS", label: "قضايا اجتماعية أو سياسية" },
];

const BID_STRATEGIES = [
  {
    value: "LOWEST_COST",
    label: "أقل تكلفة",
    description: "الحصول على أكبر عدد من النتائج بأقل تكلفة",
  },
  {
    value: "BID_CAP",
    label: "حد أقصى للمزايدة",
    description: "التحكم في الحد الأقصى للمزايدة",
  },
  {
    value: "COST_CAP",
    label: "حد التكلفة",
    description: "الحفاظ على متوسط تكلفة محدد",
  },
];

const CALL_TO_ACTIONS = [
  { value: "LEARN_MORE", label: "معرفة المزيد" },
  { value: "SHOP_NOW", label: "تسوق الآن" },
  { value: "SIGN_UP", label: "سجل الآن" },
  { value: "CONTACT_US", label: "تواصل معنا" },
  { value: "DOWNLOAD", label: "تحميل" },
  { value: "GET_OFFER", label: "احصل على العرض" },
  { value: "BOOK_NOW", label: "احجز الآن" },
  { value: "SEND_MESSAGE", label: "أرسل رسالة" },
];

const PLACEMENTS = [
  {
    id: "FACEBOOK_FEED",
    label: "Facebook Feed",
    platform: "facebook",
    icon: <Facebook className="w-4 h-4" />,
  },
  {
    id: "FACEBOOK_STORIES",
    label: "Facebook Stories",
    platform: "facebook",
    icon: <Facebook className="w-4 h-4" />,
  },
  {
    id: "FACEBOOK_REELS",
    label: "Facebook Reels",
    platform: "facebook",
    icon: <Facebook className="w-4 h-4" />,
  },
  {
    id: "FACEBOOK_INSTREAM",
    label: "Facebook In-Stream Videos",
    platform: "facebook",
    icon: <Facebook className="w-4 h-4" />,
  },
  {
    id: "INSTAGRAM_FEED",
    label: "Instagram Feed",
    platform: "instagram",
    icon: <Instagram className="w-4 h-4" />,
  },
  {
    id: "INSTAGRAM_STORIES",
    label: "Instagram Stories",
    platform: "instagram",
    icon: <Instagram className="w-4 h-4" />,
  },
  {
    id: "INSTAGRAM_REELS",
    label: "Instagram Reels",
    platform: "instagram",
    icon: <Instagram className="w-4 h-4" />,
  },
  {
    id: "INSTAGRAM_EXPLORE",
    label: "Instagram Explore",
    platform: "instagram",
    icon: <Instagram className="w-4 h-4" />,
  },
  {
    id: "MESSENGER_INBOX",
    label: "Messenger Inbox",
    platform: "messenger",
    icon: <MessageCircle className="w-4 h-4" />,
  },
  {
    id: "MESSENGER_STORIES",
    label: "Messenger Stories",
    platform: "messenger",
    icon: <MessageCircle className="w-4 h-4" />,
  },
  {
    id: "AUDIENCE_NETWORK",
    label: "Audience Network",
    platform: "network",
    icon: <Globe className="w-4 h-4" />,
  },
];

const COUNTRIES = [
  { code: "EG", name: "مصر" },
  { code: "SA", name: "السعودية" },
  { code: "AE", name: "الإمارات" },
  { code: "KW", name: "الكويت" },
  { code: "QA", name: "قطر" },
  { code: "BH", name: "البحرين" },
  { code: "OM", name: "عمان" },
  { code: "JO", name: "الأردن" },
  { code: "LB", name: "لبنان" },
  { code: "MA", name: "المغرب" },
];

const INTEREST_CATEGORIES = [
  { name: "التسوق", query: "shopping", icon: "🛍️" },
  { name: "الموضة", query: "fashion", icon: "👗" },
  { name: "التكنولوجيا", query: "technology", icon: "💻" },
  { name: "الرياضة", query: "sports", icon: "⚽" },
  { name: "السفر", query: "travel", icon: "✈️" },
  { name: "الطعام", query: "food", icon: "🍔" },
  { name: "الصحة", query: "health", icon: "💪" },
  { name: "الأعمال", query: "business", icon: "💼" },
  { name: "الترفيه", query: "entertainment", icon: "🎬" },
  { name: "الجمال", query: "beauty", icon: "💄" },
];

const RELATIONSHIP_OPTIONS = [
  { value: 1, label: "أعزب/عزباء" },
  { value: 2, label: "في علاقة" },
  { value: 3, label: "مخطوب/ة" },
  { value: 4, label: "متزوج/ة" },
];

const LANGUAGES = [
  { id: 6, name: "العربية" },
  { id: 24, name: "الإنجليزية" },
  { id: 10, name: "الفرنسية" },
  { id: 25, name: "التركية" },
];

const DEVICE_PLATFORMS = [
  { value: "iOS", label: "iOS", icon: "📱" },
  { value: "Android", label: "Android", icon: "🤖" },
];

const EDUCATION_LEVELS = [
  { value: 1, label: "ثانوية عامة" },
  { value: 2, label: "بعض الكلية" },
  { value: 3, label: "درجة جامعية" },
  { value: 4, label: "ماجستير" },
  { value: 5, label: "دكتوراه" },
];

const JOB_TITLES = [
  { value: "business_owner", label: "صاحب عمل" },
  { value: "manager", label: "مدير" },
  { value: "engineer", label: "مهندس" },
  { value: "doctor", label: "طبيب" },
  { value: "teacher", label: "معلم" },
  { value: "sales", label: "مبيعات" },
  { value: "marketing", label: "تسويق" },
  { value: "student", label: "طالب" },
];

const BEHAVIORS = [
  { id: "travel_frequent", name: "مسافرون متكررون", category: "السفر" },
  { id: "online_shoppers", name: "متسوقون عبر الإنترنت", category: "التسوق" },
  {
    id: "tech_early_adopters",
    name: "متبنو التكنولوجيا المبكرون",
    category: "التكنولوجيا",
  },
  {
    id: "mobile_device_users",
    name: "مستخدمو الأجهزة المحمولة",
    category: "الأجهزة",
  },
  { id: "gamers", name: "اللاعبون", category: "الترفيه" },
  {
    id: "small_business_owners",
    name: "أصحاب الأعمال الصغيرة",
    category: "الأعمال",
  },
];

const INCOME_LEVELS = [
  { value: "top_5", label: "أعلى 5%" },
  { value: "top_10", label: "أعلى 10%" },
  { value: "top_25", label: "أعلى 25%" },
  { value: "top_50", label: "أعلى 50%" },
];

const LIFE_EVENTS = [
  {
    id: "anniversary_1year",
    name: "الذكرى السنوية الأولى",
    category: "علاقات",
  },
  { id: "engaged_1year", name: "مخطوبون (سنة واحدة)", category: "علاقات" },
  {
    id: "newlywed_1year",
    name: "متزوجون حديثاً (سنة واحدة)",
    category: "علاقات",
  },
  { id: "recently_moved", name: "انتقلوا مؤخراً", category: "حياة" },
  { id: "new_job", name: "وظيفة جديدة", category: "عمل" },
  { id: "birthday", name: "عيد ميلاد قريب", category: "احتفالات" },
];

const PARENTS_OPTIONS = [
  { id: "expecting_parent", name: "آباء متوقعون", age: "جميع الأعمار" },
  { id: "new_parents", name: "آباء جدد (0-12 شهر)", age: "0-12 شهر" },
  { id: "parents_toddler", name: "آباء أطفال صغار", age: "1-2 سنة" },
  {
    id: "parents_preschooler",
    name: "آباء أطفال ما قبل المدرسة",
    age: "3-5 سنوات",
  },
  { id: "parents_teen", name: "آباء مراهقين", age: "13-18 سنة" },
];

const PERFORMANCE_GOALS = [
  {
    value: "MAXIMIZE_CONVERSIONS",
    label: "زيادة عدد التحويلات",
    description: "احصل على أكبر عدد من التحويلات",
  },
  {
    value: "MAXIMIZE_CONVERSION_VALUE",
    label: "زيادة قيمة التحويلات",
    description: "احصل على أعلى قيمة إجمالية",
  },
  {
    value: "MAXIMIZE_ROAS",
    label: "زيادة عائد الإنفاق",
    description: "احصل على أفضل عائد على الاستثمار",
  },
];

const CONVERSION_EVENTS = [
  {
    value: "PURCHASE",
    label: "شراء (Purchase)",
    icon: "🛒",
    description: "عند إتمام عملية شراء",
  },
  {
    value: "ADD_TO_CART",
    label: "إضافة للسلة",
    icon: "🛍️",
    description: "عند إضافة منتج للسلة",
  },
  {
    value: "INITIATE_CHECKOUT",
    label: "بدء الدفع",
    icon: "💳",
    description: "عند بدء عملية الدفع",
  },
  {
    value: "VIEW_CONTENT",
    label: "مشاهدة المحتوى",
    icon: "👁️",
    description: "عند مشاهدة صفحة منتج",
  },
  {
    value: "LEAD",
    label: "عميل محتمل",
    icon: "📝",
    description: "عند ملء نموذج",
  },
  {
    value: "COMPLETE_REGISTRATION",
    label: "تسجيل",
    icon: "✅",
    description: "عند إتمام التسجيل",
  },
];

const CONVERSION_LOCATIONS = [
  { value: "WEBSITE", label: "الموقع الإلكتروني", icon: "🌐" },
  { value: "APP", label: "التطبيق", icon: "📱" },
  { value: "MESSENGER", label: "Messenger", icon: "💬" },
  { value: "WHATSAPP", label: "WhatsApp", icon: "📞" },
];

const ATTRIBUTION_WINDOWS = [
  {
    value: "7d_click_1d_view",
    label: "7 أيام نقر + يوم مشاهدة",
    description: "الافتراضي - موصى به",
  },
  {
    value: "1d_click_1d_view",
    label: "يوم نقر + يوم مشاهدة",
    description: "لدورة شراء قصيرة",
  },
  {
    value: "7d_click",
    label: "7 أيام نقر فقط",
    description: "بدون تتبع المشاهدة",
  },
  { value: "1d_click", label: "يوم نقر فقط", description: "تتبع دقيق جداً" },
];

const humanizeProductSlug = (slug: string) =>
  slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const buildPrefilledCampaignName = (productSlug: string) => {
  if (!productSlug) {
    return "";
  }

  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return `META_SALES_${productSlug}_${date}`;
};

const buildDefaultUrlParameters = (productSlug: string) => {
  const params = [
    "utm_source=facebook",
    "utm_medium=paid_social",
    "utm_campaign={{campaign.name}}",
    "campaign_id={{campaign.id}}",
    "adset_id={{adset.id}}",
    "ad_id={{ad.id}}",
  ];

  if (productSlug) {
    params.push(`utm_content=${encodeURIComponent(productSlug)}`);
  }

  return params.join("&");
};

const PRODUCT_LAUNCH_PREFILL_STORAGE_PREFIX =
  "facebookAds.productLaunchPrefill";

interface ProductLaunchPrefillPayload {
  productUrl?: string;
  productId?: string;
  productSlug?: string;
  productTitle?: string;
  publishRequestId?: string;
  expiresAt?: number;
  budget?: number;
  objective?: string;
  pixelId?: string;
  pageId?: string;
  status?: "ACTIVE" | "PAUSED";
  campaignName?: string;
  adSetName?: string;
  adName?: string;
  primaryText?: string;
  headline?: string;
  description?: string;
  callToAction?: string;
  imageUrls?: string[];
  creativeType?: "SINGLE_IMAGE" | "CAROUSEL";
  ageMin?: number;
  ageMax?: number;
  genders?: string[];
  locations?: string[];
  advantageAudience?: boolean;
  createFullAdData?: Partial<CreateFullAdData>;
}

const getProductLaunchPrefillPayload = (
  launchPrefillId: string,
): ProductLaunchPrefillPayload | null => {
  if (!launchPrefillId || typeof window === "undefined") {
    return null;
  }

  try {
    const rawPayload = window.sessionStorage.getItem(
      `${PRODUCT_LAUNCH_PREFILL_STORAGE_PREFIX}:${launchPrefillId}`,
    );

    if (!rawPayload) {
      return null;
    }

    const payload = JSON.parse(rawPayload) as ProductLaunchPrefillPayload;
    if (payload.expiresAt && Date.now() > payload.expiresAt) {
      window.sessionStorage.removeItem(
        `${PRODUCT_LAUNCH_PREFILL_STORAGE_PREFIX}:${launchPrefillId}`,
      );
      return null;
    }
    return payload;
  } catch {
    return null;
  }
};

const getSafePrefillImageUrls = (imageUrls?: string[]) =>
  (imageUrls || [])
    .map((imageUrl) => imageUrl.trim())
    .filter((imageUrl) => /^https?:\/\//i.test(imageUrl))
    .slice(0, 10);

const createClientRequestId = (prefix: string) => {
  const randomId =
    typeof window !== "undefined" && window.crypto?.randomUUID
      ? window.crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}:${randomId}`;
};

const buildPrefilledCarouselCards = (
  imageUrls: string[],
  productTitle: string,
  productUrl: string,
): CarouselCard[] =>
  imageUrls.map((imageUrl, index) => ({
    id: `prefill-card-${index + 1}`,
    imageUrl,
    headline:
      index === 0
        ? `${productTitle}`.slice(0, 40)
        : `${productTitle} ${index + 1}`.slice(0, 40),
    description: "شاهدي التفاصيل",
    linkUrl: productUrl,
  }));

const getPrefilledCarouselCards = (
  cards: CreateFullAdData["carouselCards"] | undefined,
  fallbackImageUrls: string[],
  productTitle: string,
  productUrl: string,
): CarouselCard[] => {
  const storedCards = (cards || [])
    .map((card, index) => ({
      id: card.id || `prefill-card-${index + 1}`,
      imageUrl: String(card.imageUrl || "").trim(),
      headline: String(card.headline || productTitle).slice(0, 40),
      description: String(card.description || "شاهدي التفاصيل"),
      linkUrl: String(card.linkUrl || productUrl),
    }))
    .filter((card) => /^https?:\/\//i.test(card.imageUrl) && /^https?:\/\//i.test(card.linkUrl))
    .slice(0, 10);

  return storedCards.length > 0
    ? storedCards
    : buildPrefilledCarouselCards(fallbackImageUrls, productTitle, productUrl);
};

interface TargetingOption {
  id: string;
  name: string;
  audience_size?: number;
}

// ============================================
// Component
// ============================================

interface CreateAdWizardErrors {
  adAccountId?: string;
  budgetAmount?: string;
  campaignName?: string;
  carouselCards?: string;
  creativeType?: string;
  imageUrl?: string;
  linkUrl?: string;
  locations?: string;
  objective?: string;
  pageId?: string;
  pixelId?: string;
  placements?: string;
  primaryText?: string;
  videoUrl?: string;
  [key: string]: string | undefined;
}

const CreateAdWizard: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const launchPrefillId = searchParams.get("launchPrefillId") || "";
  const storedLaunchPrefill = getProductLaunchPrefillPayload(launchPrefillId);
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
      toast.success("تم تفعيل الحساب الإعلاني وتحميل الصفحات والبكسلات");
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
    OBJECTIVES.find((objective) => objective.value === formData.objective)?.label ||
    formData.objective ||
    "غير محدد";
  const selectedCreativeSummary =
    formData.creativeType === "CAROUSEL"
      ? `Carousel - ${formData.carouselCards.length} كارت`
      : formData.creativeType === "SINGLE_IMAGE"
        ? "صورة واحدة"
        : formData.creativeType === "SINGLE_VIDEO"
          ? "فيديو واحد"
          : `Flexible - ${formData.flexibleAssets.length} ملف`;
  const publishConfirmDisabled =
    loading ||
    !publishAccountConfirmed ||
    (formData.status === "ACTIVE" && !activePublishConfirmed);
  const currentWizardStep =
    WIZARD_STEPS.find((step) => step.id === currentStep) ?? WIZARD_STEPS[0]!;
  const formatSelectedAdAccountCurrency = (value?: number) =>
    new Intl.NumberFormat("ar-EG", {
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
      toast.error("فعّل الحساب الإعلاني المختار قبل مراجعة الإرسال");
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

  const renderStep1 = () => (
    <div className="space-y-6">
      {/* Campaign Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          اسم الحملة <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={formData.campaignName}
          onChange={(e) => handleChange("campaignName", e.target.value)}
          placeholder="مثال: حملة رمضان 2024"
          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
            getError("campaignName")
              ? "border-red-500"
              : "border-gray-300 dark:border-gray-600"
          }`}
        />
        {getError("campaignName") && (
          <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
            <AlertCircle className="w-4 h-4" />
            {getError("campaignName")}
          </p>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            اسم Ad Set
          </label>
          <input
            type="text"
            value={formData.adSetName}
            onChange={(e) => handleChange("adSetName", e.target.value)}
            placeholder="مثال: Women Egypt - Broad"
            className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            اسم الإعلان
          </label>
          <input
            type="text"
            value={formData.adName}
            onChange={(e) => handleChange("adName", e.target.value)}
            placeholder="مثال: Product Hook V1"
            className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
          />
        </div>
      </div>

      {/* Objective */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          هدف الحملة <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {OBJECTIVES.map((obj) => (
            <button
              key={obj.value}
              type="button"
              onClick={() => handleChange("objective", obj.value)}
              className={`p-4 border-2 rounded-xl text-center transition-all ${
                formData.objective === obj.value
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                  : "border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              }`}
            >
              <div
                className={`mx-auto mb-2 ${formData.objective === obj.value ? "text-blue-500" : "text-gray-400"}`}
              >
                {obj.icon}
              </div>
              <div className="font-medium">{obj.label}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {obj.description}
              </div>
            </button>
          ))}
        </div>
        {getError("objective") && (
          <p className="mt-2 text-sm text-red-500 flex items-center gap-1">
            <AlertCircle className="w-4 h-4" />
            {getError("objective")}
          </p>
        )}
      </div>

      {/* Special Ad Categories */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          فئة الإعلان الخاصة
        </label>
        <select
          value={formData.specialAdCategories[0] || "NONE"}
          onChange={(e) =>
            handleChange(
              "specialAdCategories",
              e.target.value === "NONE" ? [] : [e.target.value],
            )
          }
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          {SPECIAL_AD_CATEGORIES.map((cat) => (
            <option key={cat.value} value={cat.value}>
              {cat.label}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-gray-500">
          إذا كان إعلانك يتعلق بالإسكان أو التوظيف أو الائتمان، يجب تحديد الفئة
          المناسبة
        </p>
      </div>

      {/* Conversion Events - للأهداف التي تحتاج تتبع */}
      {(formData.objective === "OUTCOME_SALES" ||
        formData.objective === "OUTCOME_LEADS") && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
            <Target className="w-5 h-5 text-green-600" />
            حدث التحويل
          </h4>
          <p className="text-sm text-gray-600 mb-3">
            اختر الحدث الذي تريد تتبعه وتحسين الإعلان من أجله
          </p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { value: "PURCHASE", label: "شراء", icon: "🛒" },
              { value: "ADD_TO_CART", label: "إضافة للسلة", icon: "🛍️" },
              { value: "LEAD", label: "عميل محتمل", icon: "📝" },
              { value: "COMPLETE_REGISTRATION", label: "تسجيل", icon: "✅" },
              { value: "CONTACT", label: "تواصل", icon: "📞" },
              { value: "SUBSCRIBE", label: "اشتراك", icon: "📧" },
            ].map((event) => (
              <button
                key={event.value}
                type="button"
                className="p-3 bg-white border-2 border-green-300 rounded-lg hover:border-green-500 transition-colors text-right"
              >
                <span className="text-xl ml-2">{event.icon}</span>
                <span className="text-sm font-medium">{event.label}</span>
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-3">
            💡 تأكد من تثبيت Facebook Pixel على موقعك لتتبع هذه الأحداث
          </p>
        </div>
      )}
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h4 className="font-medium text-gray-900 flex items-center gap-2">
              <Facebook className="w-5 h-5 text-blue-600" />
              حساب Facebook Ads <span className="text-red-500">*</span>
            </h4>
            <p className="text-sm text-gray-600 mt-1">
              اختر الحساب الإعلاني الذي سنستخدمه لإنشاء الإعلان وتحميل
              البكسلات.
            </p>
          </div>
          {selectedAdAccountIsActive && (
            <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
              الحساب مفعل
            </span>
          )}
        </div>

        {loadingAdAccounts ? (
          <div className="flex items-center gap-2 text-gray-500">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">جاري تحميل الحسابات الإعلانية...</span>
          </div>
        ) : adAccounts.length > 0 ? (
          <div className="space-y-3">
            <select
              name="facebookAdAccountId"
              aria-label="اختيار الحساب الإعلاني حسب Business"
              value={selectedAdAccountId}
              onChange={(e) => {
                const nextAdAccountId = e.target.value;
                setSelectedAdAccountId(nextAdAccountId);
                setPublishAccountConfirmed(false);
                if (!nextAdAccountId) {
                  setFacebookPixels([]);
                  setFormData((prev) => ({ ...prev, pixelId: "" }));
                  void loadPagesAndPixels();
                  return;
                }
                if (activeSavedAdAccountId === nextAdAccountId) {
                  void loadPagesAndPixels(nextAdAccountId);
                  return;
                }

                setFacebookPixels([]);
                setFormData((prev) => ({ ...prev, pixelId: "" }));
              }}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            >
              <option value="">اختر الحساب الإعلاني</option>
              {adAccountBusinessGroups.map((group) => (
                <optgroup
                  key={group.businessKey}
                  label={`${group.businessName} (${group.accounts.length})`}
                >
                  {group.accounts.map((account) => {
                    const normalizedAccountId = resolveAdAccountId(account);
                    const isSaved = savedAdAccounts.some(
                      (savedAccount) =>
                        savedAccount.accountId === normalizedAccountId,
                    );
                    const isActive = activeSavedAdAccountId === normalizedAccountId;
                    const healthLabel =
                      account.billingHealth?.accountStatusLabel ||
                      (account.account_status
                        ? `Status ${account.account_status}`
                        : "Status غير معروف");

                    return (
                      <option key={account.id} value={normalizedAccountId}>
                        {account.name} - act_{normalizedAccountId} -{" "}
                        {account.currency} - {healthLabel}
                        {isActive ? " - مفعل" : isSaved ? " - محفوظ" : ""}
                      </option>
                    );
                  })}
                </optgroup>
              ))}
            </select>

            {selectedAdAccountId ? (
              <div className="grid gap-3 rounded-xl border border-blue-100 bg-blue-50/70 p-4 text-sm text-blue-950 md:grid-cols-3">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                    Business
                  </div>
                  <div className="mt-1 font-semibold">{selectedBusinessName}</div>
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                    Ad Account
                  </div>
                  <div className="mt-1 font-semibold">
                    {selectedAdAccountName}
                  </div>
                  <div className="text-xs text-blue-700" translate="no">
                    act_{selectedAdAccountId}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                    Readiness
                  </div>
                  <div className="mt-1 font-semibold">
                    {selectedAdAccountIsActive
                      ? "مفعل وجاهز"
                      : "يحتاج تفعيل قبل الإرسال"}
                  </div>
                  <div className="text-xs text-blue-700">
                    {selectedAccountHealthLabel}
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-700">
                اختر Business ثم الحساب الإعلاني المقصود. لن نختار أول حساب
                تلقائيا عند وجود أكثر من حساب، حتى لا تختلط حملات Swan مع أي
                حساب آخر.
              </div>
            )}

            {selectedRemoteAdAccount?.billingHealth?.isAccountUsable === false && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                هذا الحساب ظاهر من Meta لكنه غير جاهز للإعلانات حاليا:{" "}
                {selectedRemoteAdAccount.billingHealth.disableReason ||
                  "راجع حالة الحساب أو وسيلة الدفع داخل Business Manager."}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => void handleActivateSelectedAdAccount()}
                disabled={
                  syncingAdAccount ||
                  loadingAdAccounts ||
                  !selectedAdAccountId ||
                  selectedAdAccountIsActive
                }
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {syncingAdAccount ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    جاري التفعيل...
                  </>
                ) : (
                  "تفعيل الحساب وتحميل البيانات"
                )}
              </button>

              {!selectedAdAccountIsActive && (
                <p className="text-sm text-amber-700">
                  فعّل الحساب المختار أولًا حتى تظهر البكسلات الخاصة به.
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800">
            لا توجد حسابات إعلانية متاحة حاليًا. اربط Facebook أولًا ثم أعد
            المحاولة.
          </div>
        )}
        {getError("adAccountId") && (
          <p className="mt-3 text-sm text-red-500">{getError("adAccountId")}</p>
        )}
      </div>

      {/* Performance Goal - للمبيعات فقط */}
      {(formData.objective === "OUTCOME_SALES" ||
        formData.objective === "OUTCOME_LEADS") && (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-5">
          <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
            <Target className="w-5 h-5 text-green-600" />
            هدف الأداء (Performance Goal)
          </h4>
          <div className="space-y-3">
            {PERFORMANCE_GOALS.map((goal) => (
              <label
                key={goal.value}
                className={`flex items-start p-4 border-2 rounded-xl cursor-pointer transition-all ${
                  formData.performanceGoal === goal.value
                    ? "border-green-500 bg-green-50"
                    : "border-gray-200 hover:border-gray-300 bg-white"
                }`}
              >
                <input
                  type="radio"
                  name="performanceGoal"
                  value={goal.value}
                  checked={formData.performanceGoal === goal.value}
                  onChange={(e) =>
                    handleChange("performanceGoal", e.target.value)
                  }
                  className="mt-1 text-green-600"
                />
                <div className="mr-3">
                  <div className="font-medium text-gray-900">{goal.label}</div>
                  <div className="text-sm text-gray-500">
                    {goal.description}
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Facebook Pixel Selection */}
      {(formData.objective === "OUTCOME_SALES" ||
        formData.objective === "OUTCOME_LEADS") && (
        <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 rounded-xl p-5">
          <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
            <Target className="w-5 h-5 text-indigo-600" />
            Facebook Pixel <span className="text-red-500">*</span>
          </h4>
          <p className="text-sm text-gray-600 mb-3">
            اختر البكسل لتتبع التحويلات على موقعك
          </p>
          {loadingPixels ? (
            <div className="flex items-center gap-2 text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">جاري تحميل البكسلات...</span>
            </div>
          ) : facebookPixels.length > 0 ? (
            <select
              value={formData.pixelId}
              onChange={(e) => handleChange("pixelId", e.target.value)}
              className="w-full px-4 py-3 border border-indigo-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="">اختر البكسل</option>
              {facebookPixels.map((pixel) => (
                <option key={pixel.id} value={pixel.id}>
                  {pixel.name} (ID: {pixel.id})
                </option>
              ))}
            </select>
          ) : (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-sm text-yellow-800">
                {!selectedAdAccountId || !selectedAdAccountIsActive
                  ? "⚠️ اختر وفعّل الحساب الإعلاني أولًا حتى نحمل البكسلات المرتبطة به."
                  : "⚠️ لا توجد بكسلات متاحة لهذا الحساب. يرجى إنشاء بكسل من إعدادات Facebook Business Manager."}
              </p>
            </div>
          )}
          {getError("pixelId") && (
            <p className="mt-3 text-sm text-red-500">{getError("pixelId")}</p>
          )}
        </div>
      )}

      {/* Conversion Event & Location */}
      {(formData.objective === "OUTCOME_SALES" ||
        formData.objective === "OUTCOME_LEADS") && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Conversion Event */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
              <Zap className="w-5 h-5 text-blue-600" />
              حدث التحويل
            </h4>
            <select
              value={formData.conversionEvent}
              onChange={(e) => handleChange("conversionEvent", e.target.value)}
              className="w-full px-4 py-3 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
            >
              {CONVERSION_EVENTS.map((event) => (
                <option key={event.value} value={event.value}>
                  {event.icon} {event.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-600 mt-2">
              {
                CONVERSION_EVENTS.find(
                  (e) => e.value === formData.conversionEvent,
                )?.description
              }
            </p>
          </div>

          {/* Conversion Location */}
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
            <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
              <Globe className="w-5 h-5 text-purple-600" />
              موقع التحويل
            </h4>
            <select
              value={formData.conversionLocation}
              onChange={(e) =>
                handleChange("conversionLocation", e.target.value)
              }
              className="w-full px-4 py-3 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 bg-white"
            >
              {CONVERSION_LOCATIONS.map((location) => (
                <option key={location.value} value={location.value}>
                  {location.icon} {location.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Attribution Window */}
      {compatibleAttributionWindows.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
          <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-orange-600" />
            نافذة الإحالة (Attribution Window)
          </h4>
          <p className="text-sm text-gray-600 mb-3">
            المدة الزمنية التي يُنسب فيها التحويل إلى إعلانك
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {compatibleAttributionWindows.map((window) => (
              <label
                key={window.value}
                className={`flex items-start p-3 border-2 rounded-lg cursor-pointer transition-all ${
                  formData.attributionWindow === window.value
                    ? "border-orange-500 bg-orange-50"
                    : "border-gray-200 hover:border-gray-300 bg-white"
                }`}
              >
                <input
                  type="radio"
                  name="attributionWindow"
                  value={window.value}
                  checked={formData.attributionWindow === window.value}
                  onChange={(e) =>
                    handleChange("attributionWindow", e.target.value)
                  }
                  className="mt-1 text-orange-600"
                />
                <div className="mr-3">
                  <div className="font-medium text-sm text-gray-900">
                    {window.label}
                  </div>
                  <div className="text-xs text-gray-500">
                    {window.description}
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Dynamic Creative */}
      <div className="bg-gradient-to-r from-pink-50 to-rose-50 p-4 rounded-xl border border-pink-200">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium text-gray-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-pink-500" />
              المحتوى الديناميكي (Dynamic Creative)
            </h4>
            <p className="text-sm text-gray-600 mt-1">
              اختبار تلقائي لتركيبات مختلفة من الصور والنصوص والعناوين
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={formData.dynamicCreative}
              onChange={(e) =>
                handleChange("dynamicCreative", e.target.checked)
              }
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-pink-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-pink-600"></div>
          </label>
        </div>
      </div>

      {/* Budget Optimization (CBO) */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium text-gray-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-500" />
              تحسين ميزانية الحملة (CBO)
            </h4>
            <p className="text-sm text-gray-600 mt-1">
              دع Facebook يوزع الميزانية تلقائياً على المجموعات الإعلانية الأفضل
              أداءً
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={formData.budgetOptimization}
              onChange={(e) =>
                handleChange("budgetOptimization", e.target.checked)
              }
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>
      </div>

      {/* Budget Type & Amount */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            نوع الميزانية
          </label>
          <select
            value={formData.budgetType}
            onChange={(e) => handleChange("budgetType", e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="DAILY">يومية</option>
            <option value="LIFETIME">إجمالية</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            المبلغ ({selectedAdAccountCurrency}){" "}
            <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            min={minimumWizardBudget}
            value={formData.budgetAmount}
            onChange={(e) =>
              handleChange("budgetAmount", parseFloat(e.target.value) || 0)
            }
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
              getError("budgetAmount") ? "border-red-500" : "border-gray-300"
            }`}
          />
          {getError("budgetAmount") && (
            <p className="mt-1 text-sm text-red-500">{getError("budgetAmount")}</p>
          )}
          <p className="mt-1 text-xs text-gray-500">
            سيتم إرسال الميزانية بعملة الحساب الإعلاني المختار:{" "}
            {selectedAdAccountCurrency}. الحد الأدنى الحالي{" "}
            {formatSelectedAdAccountCurrency(minimumWizardBudget)}.
          </p>
        </div>
      </div>

      {/* Bid Strategy */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          استراتيجية المزايدة
        </label>
        <div className="space-y-3">
          {BID_STRATEGIES.map((strategy) => (
            <label
              key={strategy.value}
              className={`flex items-start p-4 border-2 rounded-xl cursor-pointer transition-all ${
                formData.bidStrategy === strategy.value
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <input
                type="radio"
                name="bidStrategy"
                value={strategy.value}
                checked={formData.bidStrategy === strategy.value}
                onChange={(e) => handleChange("bidStrategy", e.target.value)}
                className="mt-1 text-blue-600"
              />
              <div className="mr-3">
                <div className="font-medium">{strategy.label}</div>
                <div className="text-sm text-gray-500">
                  {strategy.description}
                </div>
              </div>
            </label>
          ))}
        </div>
        {isCappedBidStrategy(formData.bidStrategy) && (
          <div className="mt-3">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              قيمة المزايدة / التكلفة ({selectedAdAccountCurrency})
            </label>
            <input
              type="number"
              min="1"
              value={formData.bidValue || ""}
              onChange={(e) =>
                handleChange("bidValue", parseFloat(e.target.value) || undefined)
              }
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                getError("bidValue") ? "border-red-500" : "border-gray-300"
              }`}
            />
            {getError("bidValue") && (
              <p className="mt-1 text-sm text-red-500">{getError("bidValue")}</p>
            )}
          </div>
        )}
      </div>

      {/* Schedule */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          الجدولة (اختياري)
        </label>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">
              تاريخ البدء
            </label>
            <input
              type="datetime-local"
              value={formData.startTime}
              onChange={(e) => handleChange("startTime", e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">
              تاريخ الانتهاء
            </label>
            <input
              type="datetime-local"
              value={formData.endTime}
              onChange={(e) => handleChange("endTime", e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      {/* Advantage+ Audience */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-xl">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium text-gray-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-500" />
              Advantage+ Audience
            </h4>
            <p className="text-sm text-gray-600 mt-1">
              دع Facebook يجد أفضل جمهور لإعلانك تلقائياً باستخدام الذكاء
              الاصطناعي
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={formData.advantageAudience}
              onChange={(e) =>
                handleChange("advantageAudience", e.target.checked)
              }
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
          </label>
        </div>
      </div>

      {/* Age Range */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          الفئة العمرية
        </label>
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className="block text-xs text-gray-500 mb-1">من</label>
            <select
              value={formData.ageMin}
              onChange={(e) => handleChange("ageMin", parseInt(e.target.value))}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              {Array.from({ length: 53 }, (_, i) => i + 13).map((age) => (
                <option key={age} value={age}>
                  {age}
                </option>
              ))}
            </select>
          </div>
          <span className="text-gray-400 mt-6">—</span>
          <div className="flex-1">
            <label className="block text-xs text-gray-500 mb-1">إلى</label>
            <select
              value={formData.ageMax}
              onChange={(e) => handleChange("ageMax", parseInt(e.target.value))}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              {Array.from({ length: 53 }, (_, i) => i + 13).map((age) => (
                <option key={age} value={age}>
                  {age}+
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Gender */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          الجنس
        </label>
        <div className="flex gap-4">
          {[
            { value: "", label: "الكل" },
            { value: "1", label: "ذكور" },
            { value: "2", label: "إناث" },
          ].map((gender) => (
            <button
              key={gender.value}
              type="button"
              onClick={() =>
                handleChange("genders", gender.value ? [gender.value] : [])
              }
              className={`flex-1 py-3 px-4 border-2 rounded-xl font-medium transition-all ${
                (formData.genders.length === 0 && gender.value === "") ||
                (formData.genders.includes(gender.value) && gender.value !== "")
                  ? "border-blue-500 bg-blue-50 text-blue-700"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              {gender.label}
            </button>
          ))}
        </div>
      </div>

      <MetaGeoTargetingSelector
        countries={COUNTRIES}
        selectedCountries={formData.locations}
        selectedRegions={formData.regions}
        selectedCities={formData.cities}
        locationTypes={formData.locationTypes}
        error={getError("locations")}
        onCountriesChange={(locations) => handleChange("locations", locations)}
        onRegionsChange={(regions) => handleChange("regions", regions)}
        onCitiesChange={(cities) => handleChange("cities", cities)}
        onLocationTypesChange={(locationTypes) =>
          handleChange("locationTypes", locationTypes)
        }
      />

      {/* Advanced Targeting Toggle */}
      <div className="border-t pt-4">
        <button
          type="button"
          onClick={() => setShowAdvancedTargeting(!showAdvancedTargeting)}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
        >
          <Heart className="w-4 h-4" />
          {showAdvancedTargeting
            ? "إخفاء الاستهداف المتقدم"
            : "إظهار الاستهداف المتقدم (الاهتمامات، اللغات، الأجهزة...)"}
        </button>
      </div>

      {/* Advanced Targeting Options */}
      {showAdvancedTargeting && (
        <div className="space-y-6 bg-gray-50 p-4 rounded-xl">
          <p className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-medium leading-5 text-blue-800">
            يتم إرسال الاهتمامات من بحث Meta، الجماهير المخصصة/المشابهة،
            الاستبعادات، اللغات، الأجهزة، والحالة الاجتماعية فقط.
          </p>

          {/* Interests Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <Heart className="w-4 h-4 text-pink-500" />
              الاهتمامات
            </label>
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  handleSearchInterests(e.target.value);
                }}
                placeholder="ابحث عن اهتمام (مثال: تسوق، موضة، تقنية...)"
                className="w-full pr-10 pl-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              {searchLoading && (
                <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 animate-spin" />
              )}
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="mt-2 border rounded-lg max-h-48 overflow-y-auto bg-white">
                {searchResults.map((result) => (
                  <button
                    key={result.id}
                    type="button"
                    onClick={() => addInterest(result)}
                    className="w-full px-4 py-2 text-right hover:bg-gray-50 border-b last:border-b-0 flex items-center justify-between"
                  >
                    <span className="text-sm">{result.name}</span>
                    {result.audience_size && (
                      <span className="text-xs text-gray-500">
                        {(result.audience_size / 1000000).toFixed(1)}M
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Selected Interests */}
            {selectedInterests.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {selectedInterests.map((interest) => (
                  <span
                    key={interest.id}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-pink-100 text-pink-700 rounded-full text-sm"
                  >
                    {interest.name}
                    <button
                      type="button"
                      onClick={() => removeInterest(interest.id)}
                      className="p-0.5 hover:bg-pink-200 rounded-full"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Quick Categories */}
            <div className="mt-3 flex flex-wrap gap-2">
              {INTEREST_CATEGORIES.map((cat) => (
                <button
                  key={cat.query}
                  type="button"
                  onClick={() => {
                    setSearchQuery(cat.query);
                    handleSearchInterests(cat.query);
                  }}
                  className="px-3 py-1.5 bg-white border border-gray-200 hover:border-gray-300 rounded-lg text-sm flex items-center gap-1"
                >
                  <span>{cat.icon}</span>
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* Relationship Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              الحالة الاجتماعية
            </label>
            <div className="flex flex-wrap gap-2">
              {RELATIONSHIP_OPTIONS.map((status) => (
                <button
                  key={status.value}
                  type="button"
                  onClick={() => toggleRelationshipStatus(status.value)}
                  className={`px-4 py-2 rounded-full border text-sm transition-colors ${
                    relationshipStatuses.includes(status.value)
                      ? "border-blue-500 bg-blue-500 text-white"
                      : "border-gray-200 hover:border-gray-300 bg-white"
                  }`}
                >
                  {status.label}
                </button>
              ))}
            </div>
          </div>

          {/* Languages */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <Globe className="w-4 h-4 text-blue-500" />
              اللغات
            </label>
            <div className="flex flex-wrap gap-2">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.id}
                  type="button"
                  onClick={() => toggleLanguage(lang.id)}
                  className={`px-4 py-2 rounded-lg border transition-colors ${
                    selectedLanguages.includes(lang.id)
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-gray-200 hover:border-gray-300 bg-white"
                  }`}
                >
                  {lang.name}
                </button>
              ))}
            </div>
          </div>

          {/* Devices */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-green-500" />
              نظام التشغيل
            </label>
            <div className="flex gap-3">
              {DEVICE_PLATFORMS.map((platform) => (
                <button
                  key={platform.value}
                  type="button"
                  onClick={() => toggleDevice(platform.value)}
                  className={`flex-1 py-3 px-4 rounded-lg border-2 transition-colors ${
                    selectedDevices.includes(platform.value)
                      ? "border-green-500 bg-green-50 text-green-700"
                      : "border-gray-200 hover:border-gray-300 bg-white"
                  }`}
                >
                  <span className="text-xl ml-2">{platform.icon}</span>
                  {platform.label}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-gray-500">
              {selectedDevices.length === 0
                ? "الكل (افتراضي)"
                : `محدد: ${selectedDevices.join(", ")}`}
            </p>
          </div>

          {/* Detailed Demographics */}
          {SHOW_EXPERIMENTAL_TARGETING_CONTROLS && (
          <div className="border-t pt-4 mt-4">
            <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
              <Target className="w-5 h-5 text-orange-500" />
              الديموغرافيا التفصيلية
            </h4>

            <div className="space-y-4">
              {/* Education */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  المستوى التعليمي
                </label>
                <div className="flex flex-wrap gap-2">
                  {EDUCATION_LEVELS.map((edu) => (
                    <button
                      key={edu.value}
                      type="button"
                      onClick={() => {
                        setSelectedEducation((prev) =>
                          prev.includes(edu.value)
                            ? prev.filter((e) => e !== edu.value)
                            : [...prev, edu.value],
                        );
                      }}
                      className={`px-3 py-2 rounded-lg border text-sm transition-colors ${
                        selectedEducation.includes(edu.value)
                          ? "border-orange-500 bg-orange-50 text-orange-700"
                          : "border-gray-200 hover:border-gray-300 bg-white"
                      }`}
                    >
                      {edu.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Job Titles */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  المسمى الوظيفي
                </label>
                <div className="flex flex-wrap gap-2">
                  {JOB_TITLES.map((job) => (
                    <button
                      key={job.value}
                      type="button"
                      onClick={() => {
                        setSelectedJobs((prev) =>
                          prev.includes(job.value)
                            ? prev.filter((j) => j !== job.value)
                            : [...prev, job.value],
                        );
                      }}
                      className={`px-3 py-2 rounded-lg border text-sm transition-colors ${
                        selectedJobs.includes(job.value)
                          ? "border-orange-500 bg-orange-50 text-orange-700"
                          : "border-gray-200 hover:border-gray-300 bg-white"
                      }`}
                    >
                      {job.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Income */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  مستوى الدخل
                </label>
                <div className="flex flex-wrap gap-2">
                  {INCOME_LEVELS.map((income) => (
                    <button
                      key={income.value}
                      type="button"
                      onClick={() => {
                        setSelectedIncome((prev) =>
                          prev.includes(income.value)
                            ? prev.filter((i) => i !== income.value)
                            : [...prev, income.value],
                        );
                      }}
                      className={`px-3 py-2 rounded-lg border text-sm transition-colors ${
                        selectedIncome.includes(income.value)
                          ? "border-orange-500 bg-orange-50 text-orange-700"
                          : "border-gray-200 hover:border-gray-300 bg-white"
                      }`}
                    >
                      {income.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Behaviors */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  السلوكيات
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {BEHAVIORS.map((behavior) => (
                    <button
                      key={behavior.id}
                      type="button"
                      onClick={() => {
                        setSelectedBehaviors((prev) =>
                          prev.includes(behavior.id)
                            ? prev.filter((b) => b !== behavior.id)
                            : [...prev, behavior.id],
                        );
                      }}
                      className={`p-3 rounded-lg border text-right transition-colors ${
                        selectedBehaviors.includes(behavior.id)
                          ? "border-orange-500 bg-orange-50"
                          : "border-gray-200 hover:border-gray-300 bg-white"
                      }`}
                    >
                      <p className="text-sm font-medium">{behavior.name}</p>
                      <p className="text-xs text-gray-500">
                        {behavior.category}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Life Events */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  أحداث الحياة
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {LIFE_EVENTS.map((event) => (
                    <button
                      key={event.id}
                      type="button"
                      onClick={() => {
                        setSelectedLifeEvents((prev) =>
                          prev.includes(event.id)
                            ? prev.filter((e) => e !== event.id)
                            : [...prev, event.id],
                        );
                      }}
                      className={`p-3 rounded-lg border text-right transition-colors ${
                        selectedLifeEvents.includes(event.id)
                          ? "border-pink-500 bg-pink-50"
                          : "border-gray-200 hover:border-gray-300 bg-white"
                      }`}
                    >
                      <p className="text-sm font-medium">{event.name}</p>
                      <p className="text-xs text-gray-500">{event.category}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Parents */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  الآباء
                </label>
                <div className="space-y-2">
                  {PARENTS_OPTIONS.map((parent) => (
                    <button
                      key={parent.id}
                      type="button"
                      onClick={() => {
                        setSelectedParents((prev) =>
                          prev.includes(parent.id)
                            ? prev.filter((p) => p !== parent.id)
                            : [...prev, parent.id],
                        );
                      }}
                      className={`w-full p-3 rounded-lg border text-right transition-colors ${
                        selectedParents.includes(parent.id)
                          ? "border-teal-500 bg-teal-50"
                          : "border-gray-200 hover:border-gray-300 bg-white"
                      }`}
                    >
                      <p className="text-sm font-medium">{parent.name}</p>
                      <p className="text-xs text-gray-500">{parent.age}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
          )}

          {/* Custom & Lookalike Audiences */}
          <div className="border-t pt-4 mt-4">
            <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-500" />
              الجماهير المخصصة والمشابهة
            </h4>

            {loadingAudiences ? (
              <div className="text-center py-6">
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400" />
                <p className="text-sm text-gray-500 mt-2">
                  جاري تحميل الجماهير...
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Custom Audiences */}
                {customAudiences.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      الجماهير المخصصة ({customAudiences.length})
                    </label>
                    <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3 bg-white">
                      {customAudiences.map((audience) => (
                        <label
                          key={audience.id}
                          className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedCustomAudiences.includes(
                              audience.id,
                            )}
                            onChange={() => toggleCustomAudience(audience.id)}
                            className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                          />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">
                              {audience.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {audience.audienceSize?.toLocaleString() || 0} شخص
                            </p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Lookalike Audiences */}
                {lookalikeAudiences.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      الجماهير المشابهة ({lookalikeAudiences.length})
                    </label>
                    <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3 bg-white">
                      {lookalikeAudiences.map((audience) => (
                        <label
                          key={audience.id}
                          className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedLookalikeAudiences.includes(
                              audience.id,
                            )}
                            onChange={() =>
                              toggleLookalikeAudience(audience.id)
                            }
                            className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                          />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">
                              {audience.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {audience.audienceSize?.toLocaleString() || 0} شخص
                              • {audience.ratio}% تشابه
                            </p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {customAudiences.length === 0 &&
                  lookalikeAudiences.length === 0 && (
                    <div className="text-center py-6 bg-gray-50 rounded-lg">
                      <Users className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                      <p className="text-sm text-gray-500">
                        لا توجد جماهير متاحة
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        يمكنك إنشاء جماهير مخصصة من صفحة الجماهير
                      </p>
                    </div>
                  )}
              </div>
            )}
          </div>

          {/* Exclude Audiences */}
          <div className="border-t pt-4 mt-4">
            <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
              <X className="w-5 h-5 text-red-500" />
              استبعاد جماهير
            </h4>
            <p className="text-sm text-gray-600 mb-3">
              استبعد أشخاصاً معينين من رؤية إعلانك (مثل: العملاء الحاليين،
              المشتركين)
            </p>

            {customAudiences.length > 0 || lookalikeAudiences.length > 0 ? (
              <div className="space-y-3">
                <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3 bg-white">
                  {[...customAudiences, ...lookalikeAudiences].map(
                    (audience) => (
                      <label
                        key={`exclude-${audience.id}`}
                        className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={excludedAudiences.includes(audience.id)}
                          onChange={() => {
                            setExcludedAudiences((prev) =>
                              prev.includes(audience.id)
                                ? prev.filter((id) => id !== audience.id)
                                : [...prev, audience.id],
                            );
                          }}
                          className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                        />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">
                            {audience.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {audience.audienceSize?.toLocaleString() || 0} شخص
                          </p>
                        </div>
                        <span className="text-xs text-red-600 font-medium">
                          استبعاد
                        </span>
                      </label>
                    ),
                  )}
                </div>
                {excludedAudiences.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-sm text-red-700">
                      ✓ سيتم استبعاد {excludedAudiences.length} جمهور من رؤية
                      هذا الإعلان
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">
                  لا توجد جماهير متاحة للاستبعاد
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-6">
      {/* Placement Type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          نوع المواضع
        </label>
        <div className="grid grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => handleChange("placementType", "AUTOMATIC")}
            className={`p-4 border-2 rounded-xl text-center transition-all ${
              formData.placementType === "AUTOMATIC"
                ? "border-blue-500 bg-blue-50"
                : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <Sparkles
              className={`w-8 h-8 mx-auto mb-2 ${formData.placementType === "AUTOMATIC" ? "text-blue-500" : "text-gray-400"}`}
            />
            <div className="font-medium">Advantage+ Placements</div>
            <div className="text-xs text-gray-500 mt-1">
              دع Facebook يختار أفضل المواضع تلقائياً
            </div>
          </button>
          <button
            type="button"
            onClick={() => handleChange("placementType", "MANUAL")}
            className={`p-4 border-2 rounded-xl text-center transition-all ${
              formData.placementType === "MANUAL"
                ? "border-blue-500 bg-blue-50"
                : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <Layout
              className={`w-8 h-8 mx-auto mb-2 ${formData.placementType === "MANUAL" ? "text-blue-500" : "text-gray-400"}`}
            />
            <div className="font-medium">مواضع يدوية</div>
            <div className="text-xs text-gray-500 mt-1">اختر المواضع بنفسك</div>
          </button>
        </div>
      </div>

      {/* Manual Placements */}
      {formData.placementType === "MANUAL" && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            اختر المواضع <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-2 gap-3">
            {PLACEMENTS.map((placement) => (
              <button
                key={placement.id}
                type="button"
                onClick={() => toggleArrayValue("placements", placement.id)}
                className={`flex items-center gap-3 p-3 border-2 rounded-xl transition-all ${
                  formData.placements.includes(placement.id)
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div
                  className={
                    formData.placements.includes(placement.id)
                      ? "text-blue-500"
                      : "text-gray-400"
                  }
                >
                  {placement.icon}
                </div>
                <span className="font-medium text-sm">{placement.label}</span>
              </button>
            ))}
          </div>
          {getError("placements") && (
            <p className="mt-2 text-sm text-red-500 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              {getError("placements")}
            </p>
          )}
        </div>
      )}
    </div>
  );

  const renderStep5 = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Form */}
        <div className="space-y-5">
          {/* Facebook Page Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              صفحة Facebook <span className="text-red-500">*</span>
            </label>
            {facebookPagesMeta?.primaryWarning && (
              <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                {facebookPagesMeta.primaryWarning}
              </div>
            )}
            {loadingPages ? (
              <div className="flex items-center gap-2 text-gray-500 p-3 border border-gray-300 rounded-lg">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">جاري تحميل الصفحات...</span>
              </div>
            ) : facebookPages.length > 0 ? (
              <select
                value={formData.pageId}
                onChange={(e) => handleChange("pageId", e.target.value)}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                  getError("pageId") ? "border-red-500" : "border-gray-300"
                }`}
              >
                <option value="">اختر الصفحة</option>
                {readyCompanyPages.length > 0 && (
                  <optgroup label="صفحات الشركة الجاهزة">
                    {readyCompanyPages.map((page) => (
                      <option key={page.id} value={page.id}>
                        {page.name} {page.category && `(${page.category})`}
                      </option>
                    ))}
                  </optgroup>
                )}
                {accessibleUnlinkedPages.length > 0 && (
                  <optgroup label="صفحات Meta غير المربوطة بالشركة">
                    {accessibleUnlinkedPages.map((page) => (
                      <option key={page.id} value={page.id} disabled>
                        {page.name} {page.category && `(${page.category})`} -
                        اربطها بالشركة قبل النشر
                      </option>
                    ))}
                  </optgroup>
                )}
                {connectedButUnavailablePages.length > 0 && (
                  <optgroup label="صفحات الشركة غير المتاحة حالياً">
                    {connectedButUnavailablePages.map((page) => (
                      <option
                        key={page.id}
                        value={page.id}
                        disabled={page.isSelectable === false}
                      >
                        {page.name} - تحتاج إعادة ربط Facebook
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            ) : (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-sm text-yellow-800 mb-2">
                  ⚠️ لا توجد صفحات متاحة. يمكنك إدخال معرف الصفحة يدوياً:
                </p>
                <input
                  type="text"
                  value={formData.pageId}
                  onChange={(e) => handleChange("pageId", e.target.value)}
                  placeholder="مثال: 123456789"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
            )}
            {facebookPagesMeta?.counts && (
              <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-3">
                <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-800">
                  صفحات الشركة الجاهزة: {facebookPagesMeta.counts.ready}
                </div>
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  صفحات Meta غير المربوطة:{" "}
                  {facebookPagesMeta.counts.accessibleButNotConnected}
                </div>
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
                  صفحات الشركة غير المتاحة:{" "}
                  {facebookPagesMeta.counts.connectedButNotAccessible}
                </div>
              </div>
            )}
            {selectedFacebookPage &&
              selectedFacebookPage.isConnectedToCompany === false && (
                <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                  سيتم إنشاء الإعلان باسم صفحة متاحة من حساب Meta الحالي لكنها
                  غير مربوطة بهذه الشركة داخل Max P.
                </div>
              )}
            {selectedFacebookPage?.warning && (
              <p className="mt-2 text-xs text-gray-500">
                {selectedFacebookPage.warning}
              </p>
            )}
            {facebookPagesMeta?.permissions?.missingRecommended?.length ? (
              <p className="mt-2 text-xs text-gray-500">
                الصلاحيات التي قد نحتاجها لإظهار الصفحات بشكل أكمل:{" "}
                {facebookPagesMeta.permissions.missingRecommended.join(", ")}
              </p>
            ) : null}
            {getError("pageId") && (
              <p className="mt-1 text-sm text-red-500">{getError("pageId")}</p>
            )}
          </div>

          {/* Creative Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              نوع المحتوى
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <button
                type="button"
                onClick={() => handleChange("creativeType", "SINGLE_IMAGE")}
                className={`p-4 border-2 rounded-xl text-center transition-all ${
                  formData.creativeType === "SINGLE_IMAGE"
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <Image
                  className={`w-8 h-8 mx-auto mb-2 ${formData.creativeType === "SINGLE_IMAGE" ? "text-blue-500" : "text-gray-400"}`}
                />
                <div className="font-medium text-sm">صورة</div>
              </button>
              <button
                type="button"
                onClick={() => handleChange("creativeType", "SINGLE_VIDEO")}
                className={`p-4 border-2 rounded-xl text-center transition-all ${
                  formData.creativeType === "SINGLE_VIDEO"
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <Eye
                  className={`w-8 h-8 mx-auto mb-2 ${formData.creativeType === "SINGLE_VIDEO" ? "text-blue-500" : "text-gray-400"}`}
                />
                <div className="font-medium text-sm">فيديو</div>
              </button>
              <button
                type="button"
                onClick={() => {
                  handleChange("creativeType", "CAROUSEL");
                  if (formData.carouselCards.length === 0) {
                    handleChange("carouselCards", [
                      {
                        id: "1",
                        imageUrl: "",
                        headline: "",
                        description: "",
                        linkUrl: "",
                      },
                      {
                        id: "2",
                        imageUrl: "",
                        headline: "",
                        description: "",
                        linkUrl: "",
                      },
                    ]);
                  }
                }}
                className={`p-4 border-2 rounded-xl text-center transition-all ${
                  formData.creativeType === "CAROUSEL"
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <Layout
                  className={`w-8 h-8 mx-auto mb-2 ${formData.creativeType === "CAROUSEL" ? "text-blue-500" : "text-gray-400"}`}
                />
                <div className="font-medium text-sm">دوّار</div>
                <div className="text-xs text-gray-500">2-10 بطاقات</div>
              </button>
              <button
                type="button"
                disabled
                aria-disabled="true"
                title="التنسيق المرن قيد التجهيز"
                className="p-4 border-2 rounded-xl text-center transition-all border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed"
              >
                <Sparkles
                  className="w-8 h-8 mx-auto mb-2 text-gray-400"
                />
                <div className="font-medium text-sm">مرن</div>
                <div className="text-xs text-gray-500">قريبًا</div>
              </button>
            </div>
            {getError("creativeType") && (
              <p className="mt-2 text-sm text-red-500">
                {getError("creativeType")}
              </p>
            )}
          </div>

          {/* Flexible Assets Upload */}
          {formData.creativeType === "FLEXIBLE" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                الصور والفيديوهات (حتى 10 ملفات){" "}
                <span className="text-red-500">*</span>
              </label>

              <div className="border-2 border-dashed border-green-300 rounded-xl p-6 text-center hover:border-green-400 transition-colors cursor-pointer bg-green-50">
                <Sparkles className="w-12 h-12 mx-auto text-green-500 mb-3" />
                <p className="text-sm text-gray-700 mb-1 font-medium">
                  ارفع حتى 10 صور أو فيديوهات
                </p>
                <p className="text-xs text-gray-500 mb-3">
                  سيختار Facebook تلقائياً أفضل تنسيق لكل مستخدم
                </p>
                <button
                  type="button"
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                >
                  اختر الملفات
                </button>
              </div>

              {/* Uploaded Assets List */}
              {formData.flexibleAssets.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-sm font-medium text-gray-700">
                    الملفات المرفوعة ({formData.flexibleAssets.length}/10)
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {formData.flexibleAssets.map((asset, index) => (
                      <div key={asset.id} className="relative group">
                        <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden border-2 border-gray-200">
                          {asset.type === "IMAGE" ? (
                            <img
                              src={asset.url}
                              alt={`Asset ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gray-800">
                              <Eye className="w-8 h-8 text-white" />
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const newAssets = formData.flexibleAssets.filter(
                              (a) => a.id !== asset.id,
                            );
                            handleChange("flexibleAssets", newAssets);
                          }}
                          className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-4 h-4" />
                        </button>
                        <div className="absolute bottom-1 left-1 px-2 py-0.5 bg-black bg-opacity-70 text-white text-xs rounded">
                          {asset.type === "IMAGE" ? "صورة" : "فيديو"}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Media Upload/URL - Single Image/Video */}
          {(formData.creativeType === "SINGLE_IMAGE" ||
            formData.creativeType === "SINGLE_VIDEO") && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {formData.creativeType === "SINGLE_IMAGE"
                  ? "الصورة"
                  : "الفيديو"}{" "}
                <span className="text-red-500">*</span>
              </label>

              {/* Upload Area */}
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center bg-gray-50">
                <input
                  type="file"
                  accept={
                    formData.creativeType === "SINGLE_IMAGE"
                      ? "image/*"
                      : "video/*"
                  }
                  className="hidden"
                  id="media-upload"
                  disabled
                />
                <div>
                  <Image className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                  <p className="text-sm text-gray-600 mb-1">
                    رفع{" "}
                    {formData.creativeType === "SINGLE_IMAGE"
                      ? "الصورة"
                      : "الفيديو"}{" "}
                    من الجهاز قيد التجهيز
                  </p>
                  <p className="text-xs text-gray-400">
                    استخدم رابط مباشر حالياً لضمان إنشاء الإعلان بنجاح
                  </p>
                </div>
              </div>

              {/* Or URL */}
              <div className="mt-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex-1 h-px bg-gray-200"></div>
                  <span className="text-xs text-gray-400">أو أدخل رابط</span>
                  <div className="flex-1 h-px bg-gray-200"></div>
                </div>
                <input
                  type="url"
                  value={
                    formData.creativeType === "SINGLE_IMAGE"
                      ? formData.imageUrl
                      : formData.videoUrl
                  }
                  onChange={(e) =>
                    handleChange(
                      formData.creativeType === "SINGLE_IMAGE"
                        ? "imageUrl"
                        : "videoUrl",
                      e.target.value,
                    )
                  }
                  placeholder="https://..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                />
                {formData.creativeType === "SINGLE_IMAGE" &&
                  getError("imageUrl") && (
                    <p className="mt-1 text-sm text-red-500">
                      {getError("imageUrl")}
                    </p>
                  )}
                {formData.creativeType === "SINGLE_VIDEO" &&
                  getError("videoUrl") && (
                    <p className="mt-1 text-sm text-red-500">
                      {getError("videoUrl")}
                    </p>
                  )}
              </div>
            </div>
          )}

          {/* Carousel Cards */}
          {formData.creativeType === "CAROUSEL" && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-gray-700">
                  بطاقات الدوّار ({formData.carouselCards.length}/10)
                </label>
                <button
                  type="button"
                  onClick={() => {
                    if (formData.carouselCards.length < 10) {
                      handleChange("carouselCards", [
                        ...formData.carouselCards,
                        {
                          id: Date.now().toString(),
                          imageUrl: "",
                          headline: "",
                          description: "",
                          linkUrl: "",
                        },
                      ]);
                    }
                  }}
                  disabled={formData.carouselCards.length >= 10}
                  className="px-3 py-1.5 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  + إضافة بطاقة
                </button>
              </div>
              {getError("carouselCards") && (
                <p className="mb-3 text-sm text-red-500">
                  {getError("carouselCards")}
                </p>
              )}

              <div className="space-y-4 max-h-96 overflow-y-auto">
                {formData.carouselCards.map((card, index) => (
                  <div
                    key={card.id}
                    className="border border-gray-200 rounded-lg p-4 bg-white"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h5 className="font-medium text-sm">بطاقة {index + 1}</h5>
                      {formData.carouselCards.length > 2 && (
                        <button
                          type="button"
                          onClick={() => {
                            handleChange(
                              "carouselCards",
                              formData.carouselCards.filter(
                                (c) => c.id !== card.id,
                              ),
                            );
                          }}
                          className="text-red-500 hover:text-red-700 text-sm"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div className="space-y-3">
                      {/* Image URL */}
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">
                          رابط الصورة *
                        </label>
                        <input
                          type="url"
                          value={card.imageUrl}
                          onChange={(e) => {
                            const updated = formData.carouselCards.map((c) =>
                              c.id === card.id
                                ? { ...c, imageUrl: e.target.value }
                                : c,
                            );
                            handleChange("carouselCards", updated);
                          }}
                          placeholder="https://..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      {/* Headline */}
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">
                          العنوان *
                        </label>
                        <input
                          type="text"
                          value={card.headline}
                          onChange={(e) => {
                            const updated = formData.carouselCards.map((c) =>
                              c.id === card.id
                                ? { ...c, headline: e.target.value }
                                : c,
                            );
                            handleChange("carouselCards", updated);
                          }}
                          placeholder="عنوان البطاقة"
                          maxLength={40}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      {/* Description */}
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">
                          الوصف
                        </label>
                        <input
                          type="text"
                          value={card.description}
                          onChange={(e) => {
                            const updated = formData.carouselCards.map((c) =>
                              c.id === card.id
                                ? { ...c, description: e.target.value }
                                : c,
                            );
                            handleChange("carouselCards", updated);
                          }}
                          placeholder="وصف البطاقة"
                          maxLength={20}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      {/* Link URL */}
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">
                          رابط الوجهة *
                        </label>
                        <input
                          type="url"
                          value={card.linkUrl}
                          onChange={(e) => {
                            const updated = formData.carouselCards.map((c) =>
                              c.id === card.id
                                ? { ...c, linkUrl: e.target.value }
                                : c,
                            );
                            handleChange("carouselCards", updated);
                          }}
                          placeholder="https://..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Primary Text */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              النص الأساسي <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.primaryText}
              onChange={(e) => handleChange("primaryText", e.target.value)}
              placeholder="اكتب النص الرئيسي لإعلانك..."
              rows={3}
              maxLength={125}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                getError("primaryText") ? "border-red-500" : "border-gray-300"
              }`}
            />
            <div className="flex justify-between mt-1">
              {getError("primaryText") ? (
                <p className="text-sm text-red-500">{getError("primaryText")}</p>
              ) : (
                <span></span>
              )}
              <span className="text-xs text-gray-400">
                {formData.primaryText.length}/125
              </span>
            </div>
          </div>

          {/* Headline */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              العنوان
            </label>
            <input
              type="text"
              value={formData.headline}
              onChange={(e) => handleChange("headline", e.target.value)}
              placeholder="عنوان جذاب لإعلانك"
              maxLength={40}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-400 mt-1 text-left">
              {formData.headline.length}/40
            </p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              الوصف
            </label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => handleChange("description", e.target.value)}
              placeholder="وصف مختصر يظهر أسفل العنوان"
              maxLength={30}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-400 mt-1 text-left">
              {formData.description.length}/30
            </p>
          </div>

          {/* Link URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              رابط الوجهة <span className="text-red-500">*</span>
            </label>
            <input
              type="url"
              value={formData.linkUrl}
              onChange={(e) => handleChange("linkUrl", e.target.value)}
              placeholder="https://yourwebsite.com"
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                getError("linkUrl") ? "border-red-500" : "border-gray-300"
              }`}
            />
            {getError("linkUrl") && (
              <p className="mt-1 text-sm text-red-500">{getError("linkUrl")}</p>
            )}
          </div>

          {/* Display Link & URL Parameters */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Display Link */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                رابط العرض (اختياري)
              </label>
              <input
                type="text"
                value={formData.displayLink}
                onChange={(e) => handleChange("displayLink", e.target.value)}
                placeholder="مثال: yoursite.com/sale"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                النص الذي يظهر بدلاً من الرابط الكامل
              </p>
            </div>

            {/* URL Parameters */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                معاملات URL (UTM)
              </label>
              <input
                type="text"
                value={formData.urlParameters}
                onChange={(e) => handleChange("urlParameters", e.target.value)}
                placeholder="مثال: utm_source=facebook&utm_campaign=winter"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                لتتبع مصدر الزيارات في Google Analytics
              </p>
            </div>
          </div>

          {/* Call to Action */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              زر الإجراء
            </label>
            <div className="grid grid-cols-4 gap-2">
              {CALL_TO_ACTIONS.map((cta) => (
                <button
                  key={cta.value}
                  type="button"
                  onClick={() => handleChange("callToAction", cta.value)}
                  className={`py-2 px-3 text-xs rounded-lg border transition-all ${
                    formData.callToAction === cta.value
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  {cta.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column - Preview */}
        <div className="lg:sticky lg:top-6">
          <div className="bg-gray-100 rounded-xl p-4">
            <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
              <Eye className="w-4 h-4" />
              معاينة الإعلان
            </h4>

            {/* Facebook Feed Preview */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              {/* Header */}
              <div className="p-3 flex items-center gap-2">
                <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                  <Facebook className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-medium text-sm">اسم صفحتك</p>
                  <p className="text-xs text-gray-500">إعلان ممول</p>
                </div>
              </div>

              {/* Text */}
              <div className="px-3 pb-2">
                <p className="text-sm text-gray-800">
                  {formData.primaryText || "النص الأساسي لإعلانك سيظهر هنا..."}
                </p>
              </div>

              {/* Image */}
              <div className="aspect-square bg-gray-200 flex items-center justify-center">
                {formData.imageUrl ? (
                  <img
                    src={formData.imageUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-center text-gray-400">
                    <Image className="w-16 h-16 mx-auto mb-2" />
                    <p className="text-sm">صورة الإعلان</p>
                  </div>
                )}
              </div>

              {/* Link Preview */}
              <div className="p-3 bg-gray-50 border-t">
                <p className="text-xs text-gray-500 truncate">
                  {formData.linkUrl || "yourwebsite.com"}
                </p>
                <p className="font-medium text-sm mt-1">
                  {formData.headline || "العنوان"}
                </p>
                <p className="text-xs text-gray-500">
                  {formData.description || "الوصف"}
                </p>
              </div>

              {/* CTA Button */}
              <div className="p-3 border-t">
                <button className="w-full py-2 bg-blue-500 text-white rounded-lg text-sm font-medium">
                  {CALL_TO_ACTIONS.find(
                    (c) => c.value === formData.callToAction,
                  )?.label || "معرفة المزيد"}
                </button>
              </div>
            </div>

            {/* Platform Tabs */}
            <div className="flex gap-2 mt-3">
              <button className="flex-1 py-2 bg-blue-500 text-white rounded-lg text-xs font-medium flex items-center justify-center gap-1">
                <Facebook className="w-3 h-3" /> Facebook
              </button>
              <button className="flex-1 py-2 bg-white border border-gray-200 text-gray-600 rounded-lg text-xs font-medium flex items-center justify-center gap-1">
                <Instagram className="w-3 h-3" /> Instagram
              </button>
            </div>
          </div>

          {/* Advantage+ Creative */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-xl space-y-3 mt-4">
            <h4 className="font-medium text-gray-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-green-500" />
              Advantage+ Creative
            </h4>
            <p className="text-xs text-gray-600">
              دع Facebook يحسن إعلانك تلقائياً للحصول على أفضل أداء
            </p>

            <label className="flex items-center justify-between p-3 bg-white rounded-lg">
              <div>
                <span className="text-sm font-medium">تحسين النص</span>
                <p className="text-xs text-gray-500">
                  إنشاء نسخ متعددة من النص
                </p>
              </div>
              <input
                type="checkbox"
                checked={formData.textGeneration}
                onChange={(e) => {
                  handleChange("textGeneration", e.target.checked);
                  if (e.target.checked) handleChange("advantageCreative", true);
                }}
                className="w-5 h-5 text-green-600 rounded"
              />
            </label>

            <label className="flex items-center justify-between p-3 bg-white rounded-lg">
              <div>
                <span className="text-sm font-medium">تحسين الصورة</span>
                <p className="text-xs text-gray-500">
                  تعديل السطوع والتباين تلقائياً
                </p>
              </div>
              <input
                type="checkbox"
                checked={formData.imageEnhancement}
                onChange={(e) => {
                  handleChange("imageEnhancement", e.target.checked);
                  if (e.target.checked) handleChange("advantageCreative", true);
                }}
                className="w-5 h-5 text-green-600 rounded"
              />
            </label>
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep6 = () => (
    <div className="space-y-6">
      {createdFullAd && (
        <div
          className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5"
          data-testid="full-ad-created-panel"
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-semibold text-emerald-700">
                تم إنشاء الإعلان على Meta
              </p>
              <h3 className="mt-1 text-xl font-bold text-slate-950">
                الإعلان محفوظ ومربوط بمعرفات الإنتاج
              </h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {createdFullAd.localAdId && (
                <button
                  type="button"
                  onClick={() =>
                    navigate(
                      `/advertising/facebook-ads/ads/${createdFullAd.localAdId}`,
                    )
                  }
                  className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
                >
                  فتح تفاصيل الإعلان
                </button>
              )}
              <button
                type="button"
                onClick={() =>
                  navigate(
                    `/advertising/facebook-ads?adAccountId=${createdFullAd.adAccountId}`,
                  )
                }
                className="rounded-xl border border-emerald-300 bg-white px-4 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-100"
              >
                رجوع للوحة الإعلانات
              </button>
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {[
              ["Campaign", createdFullAd.facebookCampaignId],
              ["Ad Set", createdFullAd.facebookAdSetId],
              ["Ad", createdFullAd.facebookAdId],
              ["Creative", createdFullAd.creativeId],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-xl border border-emerald-200 bg-white px-4 py-3"
              >
                <div className="text-xs font-semibold uppercase text-emerald-700">
                  {label}
                </div>
                <div className="mt-1 break-all text-sm font-bold text-slate-950">
                  {value || "غير متاح"}
                </div>
              </div>
            ))}
          </div>

          {(createdFullAd.localCampaignId ||
            createdFullAd.localAdSetId ||
            createdFullAd.localAdId) && (
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              {[
                ["Local Campaign", createdFullAd.localCampaignId],
                ["Local Ad Set", createdFullAd.localAdSetId],
                ["Local Ad", createdFullAd.localAdId],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-xl border border-emerald-200 bg-emerald-100/60 px-4 py-3"
                >
                  <div className="text-xs font-semibold uppercase text-emerald-700">
                    {label}
                  </div>
                  <div className="mt-1 break-all text-sm font-bold text-slate-950">
                    {value || "غير متاح"}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-3 text-sm font-semibold text-emerald-800">
            الحالة: {createdFullAd.status}
          </div>
        </div>
      )}

      <div className="bg-gray-50 rounded-xl p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">ملخص الإعلان</h3>

        {/* Campaign Summary */}
        <div className="space-y-4">
          <div className="flex justify-between py-2 border-b">
            <span className="text-gray-600">اسم الحملة</span>
            <span className="font-medium">{formData.campaignName}</span>
          </div>
          {(formData.adSetName || formData.adName) && (
            <div className="flex justify-between gap-4 py-2 border-b">
              <span className="text-gray-600">هيكل الإعلان</span>
              <span className="text-left font-medium">
                {[formData.adSetName, formData.adName].filter(Boolean).join(" / ")}
              </span>
            </div>
          )}
          <div className="flex justify-between py-2 border-b">
            <span className="text-gray-600">الهدف</span>
            <span className="font-medium">
              {OBJECTIVES.find((o) => o.value === formData.objective)?.label}
            </span>
          </div>

          {/* Ad Set Level Info */}
          {compatibleAttributionWindows.length > 0 && (
            <>
              {(formData.objective === "OUTCOME_SALES" ||
                formData.objective === "OUTCOME_LEADS") && (
                <>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-600">هدف الأداء</span>
                    <span className="font-medium">
                      {
                        PERFORMANCE_GOALS.find(
                          (g) => g.value === formData.performanceGoal,
                        )?.label
                      }
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-600">حدث التحويل</span>
                    <span className="font-medium">
                      {
                        CONVERSION_EVENTS.find(
                          (e) => e.value === formData.conversionEvent,
                        )?.label
                      }
                    </span>
                  </div>
                </>
              )}
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">نافذة الإحالة</span>
                <span className="font-medium">{selectedAttributionWindowLabel}</span>
              </div>
            </>
          )}

          <div className="flex justify-between py-2 border-b">
            <span className="text-gray-600">الميزانية</span>
            <span className="font-medium">
              {formatSelectedAdAccountCurrency(formData.budgetAmount)} /{" "}
              {formData.budgetType === "DAILY" ? "يومياً" : "إجمالي"}
            </span>
          </div>
          <div className="flex justify-between py-2 border-b">
            <span className="text-gray-600">استراتيجية المزايدة</span>
            <span className="font-medium">
              {
                BID_STRATEGIES.find((b) => b.value === formData.bidStrategy)
                  ?.label
              }
            </span>
          </div>
          {formData.frequencyCap && (
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-600">حد التكرار</span>
              <span className="font-medium">
                {formData.frequencyCap} مرة /{" "}
                {formData.frequencyCapInterval === "DAY"
                  ? "يومياً"
                  : formData.frequencyCapInterval === "WEEK"
                    ? "أسبوعياً"
                    : "شهرياً"}
              </span>
            </div>
          )}
          <div className="flex justify-between py-2 border-b">
            <span className="text-gray-600">المواقع</span>
            <span className="font-medium text-left">
              {selectedGeoSummary || "غير محدد"}
            </span>
          </div>
          {selectedTargetingSignalCount > 0 && (
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-600">إشارات الاستهداف النشطة</span>
              <span className="font-medium">
                {selectedTargetingSignalCount} اختيار
              </span>
            </div>
          )}
          <div className="flex justify-between py-2 border-b">
            <span className="text-gray-600">الفئة العمرية</span>
            <span className="font-medium">
              {formData.ageMin} - {formData.ageMax}
            </span>
          </div>
          <div className="flex justify-between py-2 border-b">
            <span className="text-gray-600">المواضع</span>
            <span className="font-medium">
              {formData.placementType === "AUTOMATIC"
                ? "تلقائي"
                : `${formData.placements.length} مواضع`}
            </span>
          </div>
          <div className="flex justify-between py-2 border-b">
            <span className="text-gray-600">نوع المحتوى</span>
            <span className="font-medium">
              {formData.creativeType === "SINGLE_IMAGE"
                ? "صورة"
                : formData.creativeType === "SINGLE_VIDEO"
                  ? "فيديو"
                  : formData.creativeType === "CAROUSEL"
                    ? "دوّار"
                    : "مرن (Flexible)"}
            </span>
          </div>
          <div className="flex justify-between py-2 border-b">
            <span className="text-gray-600">صفحة الإعلان</span>
            <span className="font-medium">
              {selectedFacebookPage?.name || formData.pageId || "غير محددة"}
            </span>
          </div>
          {selectedFacebookPage?.isConnectedToCompany === false && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              الإعلان سيُنشر باسم صفحة متاحة من حساب Meta الحالي لكنها غير
              مربوطة بهذه الشركة داخل Max P.
            </div>
          )}
          {formData.creativeType === "FLEXIBLE" &&
            formData.flexibleAssets.length > 0 && (
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">عدد الملفات</span>
                <span className="font-medium text-green-600">
                  {formData.flexibleAssets.length} ملف
                </span>
              </div>
            )}
          <div className="flex justify-between py-2">
            <span className="text-gray-600">رابط الوجهة</span>
            <span className="font-medium text-blue-600 truncate max-w-xs">
              {formData.linkUrl}
            </span>
          </div>
          {formData.urlParameters && (
            <div className="flex justify-between py-2">
              <span className="text-gray-600">معاملات URL</span>
              <span className="font-medium text-xs text-gray-500 truncate max-w-xs">
                {formData.urlParameters}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Status Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          حالة الإعلان بعد النشر
        </label>
        <div className="grid grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => handleChange("status", "PAUSED")}
            className={`p-4 border-2 rounded-xl text-center transition-all ${
              formData.status === "PAUSED"
                ? "border-yellow-500 bg-yellow-50"
                : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <div className="font-medium">متوقف مؤقتاً</div>
            <div className="text-xs text-gray-500 mt-1">
              راجع الإعلان قبل تفعيله
            </div>
          </button>
          <button
            type="button"
            onClick={() => handleChange("status", "ACTIVE")}
            className={`p-4 border-2 rounded-xl text-center transition-all ${
              formData.status === "ACTIVE"
                ? "border-green-500 bg-green-50"
                : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <div className="font-medium">نشط فوراً</div>
            <div className="text-xs text-gray-500 mt-1">
              ابدأ عرض الإعلان مباشرة
            </div>
          </button>
        </div>
      </div>
    </div>
  );

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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            🚀 إنشاء إعلان كامل
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            أنشئ حملة وإعلان احترافي بخطوات بسيطة
          </p>
        </div>

        {prefillProductUrl && (
          <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
            تم تحميل سيناريو إعلان منتج:{" "}
            <strong>{prefillProductTitle}</strong> بميزانية{" "}
            <strong>
              {prefillBudget > 0 ? prefillBudget : DEFAULT_WIZARD_BUDGET_AMOUNT}
            </strong>
            {prefillImageUrls.length > 0 && (
              <>
                {" "}
                وبعدد <strong>{prefillImageUrls.length}</strong> صورة
                للكرياتيف
              </>
            )}
            . لا يتم إرسال أي شيء إلى Meta إلا بعد شاشة مراجعة وتأكيد منفصلة
            في آخر خطوة.
          </div>
        )}

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {WIZARD_STEPS.map((step, index) => (
              <React.Fragment key={step.id}>
                <div className="flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                      currentStep > step.id
                        ? "bg-green-500 text-white"
                        : currentStep === step.id
                          ? "bg-blue-600 text-white"
                          : "bg-gray-200 text-gray-500"
                    }`}
                  >
                    {currentStep > step.id ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : (
                      step.icon
                    )}
                  </div>
                  <span
                    className={`text-xs mt-2 hidden md:block ${
                      currentStep >= step.id
                        ? "text-blue-600 font-medium"
                        : "text-gray-400"
                    }`}
                  >
                    {step.title}
                  </span>
                </div>
                {index < WIZARD_STEPS.length - 1 && (
                  <div
                    className={`flex-1 h-1 mx-2 rounded ${
                      currentStep > step.id ? "bg-green-500" : "bg-gray-200"
                    }`}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 mb-6">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {currentWizardStep.title}
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              {currentWizardStep.description}
            </p>
          </div>

          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
          {currentStep === 4 && renderStep4()}
          {currentStep === 5 && renderStep5()}
          {currentStep === 6 && renderStep6()}
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between">
          <button
            type="button"
            onClick={handleBack}
            disabled={currentStep === 1}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${
              currentStep === 1
                ? "bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed"
                : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
            }`}
          >
            <ChevronRight className="w-5 h-5" />
            السابق
          </button>

          {currentStep < 6 ? (
            <button
              type="button"
              onClick={handleNext}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-all"
            >
              التالي
              <ChevronLeft className="w-5 h-5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleRequestPublishConfirmation}
              disabled={loading}
              className="flex items-center gap-2 px-8 py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  جاري الإنشاء...
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  مراجعة الإرسال
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
