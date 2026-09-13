import React from "react";
import {
  Target,
  DollarSign,
  Users,
  Layout,
  Image,
  CheckCircle,
  Eye,
  Globe,
  Zap,
  Facebook,
  Instagram,
  MessageCircle,
} from "lucide-react";
import type { WizardStep } from "./types";

export const getWizardSteps = (isEn: boolean): WizardStep[] => [
  {
    id: 1,
    title: isEn ? "Campaign Objective" : "هدف الحملة",
    description: isEn ? "Choose campaign goal" : "اختر هدف حملتك الإعلانية",
    icon: <Target className="w-5 h-5" />,
  },
  {
    id: 2,
    title: isEn ? "Budget & Schedule" : "الميزانية والجدولة",
    description: isEn ? "Set budget & schedule" : "حدد ميزانيتك ومواعيد الإعلان",
    icon: <DollarSign className="w-5 h-5" />,
  },
  {
    id: 3,
    title: isEn ? "Targeting" : "الاستهداف",
    description: isEn ? "Define target audience" : "حدد جمهورك المستهدف",
    icon: <Users className="w-5 h-5" />,
  },
  {
    id: 4,
    title: isEn ? "Placements" : "المواضع",
    description: isEn ? "Choose ad placements" : "اختر أين يظهر إعلانك",
    icon: <Layout className="w-5 h-5" />,
  },
  {
    id: 5,
    title: isEn ? "Creative" : "المحتوى الإبداعي",
    description: isEn ? "Build your ad creative" : "أنشئ إعلانك",
    icon: <Image className="w-5 h-5" />,
  },
  {
    id: 6,
    title: isEn ? "Review & Publish" : "المراجعة والنشر",
    description: isEn ? "Review and publish ad" : "راجع وانشر إعلانك",
    icon: <CheckCircle className="w-5 h-5" />,
  },
];

export const WIZARD_STEPS: WizardStep[] = getWizardSteps(false);
export const DEFAULT_WIZARD_BUDGET_AMOUNT = 200;

export const getObjectives = (isEn: boolean) => [
  {
    value: "OUTCOME_AWARENESS",
    label: isEn ? "Awareness" : "الوعي",
    description: isEn ? "Increase brand awareness" : "زيادة الوعي بعلامتك التجارية",
    icon: <Eye className="w-6 h-6" />,
  },
  {
    value: "OUTCOME_TRAFFIC",
    label: isEn ? "Traffic" : "الزيارات",
    description: isEn ? "Send traffic to your website" : "زيادة زيارات موقعك",
    icon: <Globe className="w-6 h-6" />,
  },
  {
    value: "OUTCOME_ENGAGEMENT",
    label: isEn ? "Engagement" : "التفاعل",
    description: isEn ? "Get more post engagement" : "زيادة التفاعل مع منشوراتك",
    icon: <Users className="w-6 h-6" />,
  },
  {
    value: "OUTCOME_LEADS",
    label: isEn ? "Leads" : "العملاء المحتملين",
    description: isEn ? "Collect customer leads" : "جمع بيانات العملاء",
    icon: <Target className="w-6 h-6" />,
  },
  {
    value: "OUTCOME_SALES",
    label: isEn ? "Sales" : "المبيعات",
    description: isEn ? "Drive sales & conversions" : "زيادة المبيعات والتحويلات",
    icon: <DollarSign className="w-6 h-6" />,
  },
  {
    value: "OUTCOME_APP_PROMOTION",
    label: isEn ? "App Promotion" : "ترويج التطبيق",
    description: isEn ? "Increase app downloads" : "زيادة تحميلات التطبيق",
    icon: <Zap className="w-6 h-6" />,
  },
];

export const OBJECTIVES = getObjectives(false);

export const getSpecialAdCategories = (isEn: boolean) => [
  { value: "NONE", label: isEn ? "None" : "لا شيء" },
  { value: "HOUSING", label: isEn ? "Housing" : "إسكان" },
  { value: "EMPLOYMENT", label: isEn ? "Employment" : "توظيف" },
  { value: "CREDIT", label: isEn ? "Credit" : "ائتمان" },
  {
    value: "ISSUES_ELECTIONS_POLITICS",
    label: isEn ? "Social / Political Issues" : "قضايا اجتماعية أو سياسية",
  },
];

export const SPECIAL_AD_CATEGORIES = getSpecialAdCategories(false);

export const getBidStrategies = (isEn: boolean) => [
  {
    value: "LOWEST_COST",
    label: isEn ? "Lowest Cost" : "أقل تكلفة",
    description: isEn
      ? "Get the most results for your budget"
      : "الحصول على أكبر عدد من النتائج بأقل تكلفة",
  },
  {
    value: "BID_CAP",
    label: isEn ? "Bid Cap" : "حد أقصى للمزايدة",
    description: isEn ? "Control maximum bid cap" : "التحكم في الحد الأقصى للمزايدة",
  },
  {
    value: "COST_CAP",
    label: isEn ? "Cost Cap" : "حد التكلفة",
    description: isEn
      ? "Maintain specific average cost"
      : "الحفاظ على متوسط تكلفة محدد",
  },
];

export const BID_STRATEGIES = getBidStrategies(false);

export const getCallToActions = (isEn: boolean) => [
  { value: "LEARN_MORE", label: isEn ? "Learn More" : "معرفة المزيد" },
  { value: "SHOP_NOW", label: isEn ? "Shop Now" : "تسوق الآن" },
  { value: "ORDER_NOW", label: isEn ? "Order Now" : "اطلب الآن" },
  { value: "WHATSAPP_MESSAGE", label: isEn ? "Send WhatsApp Message" : "إرسال رسالة واتساب" },
  { value: "SEND_MESSAGE", label: isEn ? "Send Message" : "أرسل رسالة" },
  { value: "SIGN_UP", label: isEn ? "Sign Up" : "سجل الآن" },
  { value: "CONTACT_US", label: isEn ? "Contact Us" : "تواصل معنا" },
  { value: "DOWNLOAD", label: isEn ? "Download" : "تحميل" },
  { value: "GET_OFFER", label: isEn ? "Get Offer" : "احصل على العرض" },
  { value: "BOOK_NOW", label: isEn ? "Book Now" : "احجز الآن" },
];

export const CALL_TO_ACTIONS = getCallToActions(false);

export const PLACEMENTS = [
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

export const getCountries = (isEn: boolean) => [
  { code: "EG", name: isEn ? "Egypt" : "مصر" },
  { code: "SA", name: isEn ? "Saudi Arabia" : "السعودية" },
  { code: "AE", name: isEn ? "United Arab Emirates" : "الإمارات" },
  { code: "KW", name: isEn ? "Kuwait" : "الكويت" },
  { code: "QA", name: isEn ? "Qatar" : "قطر" },
  { code: "BH", name: isEn ? "Bahrain" : "البحرين" },
  { code: "OM", name: isEn ? "Oman" : "عمان" },
  { code: "JO", name: isEn ? "Jordan" : "الأردن" },
  { code: "LB", name: isEn ? "Lebanon" : "لبنان" },
  { code: "MA", name: isEn ? "Morocco" : "المغرب" },
];

export const COUNTRIES = getCountries(false);

export const getInterestCategories = (isEn: boolean) => [
  { name: isEn ? "Shopping" : "التسوق", query: "shopping", icon: "🛍️" },
  { name: isEn ? "Fashion" : "الموضة", query: "fashion", icon: "👗" },
  { name: isEn ? "Technology" : "التكنولوجيا", query: "technology", icon: "💻" },
  { name: isEn ? "Sports" : "الرياضة", query: "sports", icon: "⚽" },
  { name: isEn ? "Travel" : "السفر", query: "travel", icon: "✈️" },
  { name: isEn ? "Food" : "الطعام", query: "food", icon: "🍔" },
  { name: isEn ? "Health" : "الصحة", query: "health", icon: "💪" },
  { name: isEn ? "Business" : "الأعمال", query: "business", icon: "💼" },
  { name: isEn ? "Entertainment" : "الترفيه", query: "entertainment", icon: "🎬" },
  { name: isEn ? "Beauty" : "الجمال", query: "beauty", icon: "💄" },
];

export const INTEREST_CATEGORIES = getInterestCategories(false);

export const getRelationshipOptions = (isEn: boolean) => [
  { value: 1, label: isEn ? "Single" : "أعزب/عزباء" },
  { value: 2, label: isEn ? "In a relationship" : "في علاقة" },
  { value: 3, label: isEn ? "Engaged" : "مخطوب/ة" },
  { value: 4, label: isEn ? "Married" : "متزوج/ة" },
];

export const RELATIONSHIP_OPTIONS = getRelationshipOptions(false);

export const getLanguages = (isEn: boolean) => [
  { id: 6, name: isEn ? "Arabic" : "العربية" },
  { id: 24, name: isEn ? "English" : "الإنجليزية" },
  { id: 10, name: isEn ? "French" : "الفرنسية" },
  { id: 25, name: isEn ? "Turkish" : "التركية" },
];

export const LANGUAGES = getLanguages(false);

export const DEVICE_PLATFORMS = [
  { value: "iOS", label: "iOS", icon: "📱" },
  { value: "Android", label: "Android", icon: "🤖" },
];

export const getEducationLevels = (isEn: boolean) => [
  { value: 1, label: isEn ? "High School" : "ثانوية عامة" },
  { value: 2, label: isEn ? "Some College" : "بعض الكلية" },
  { value: 3, label: isEn ? "College Degree" : "درجة جامعية" },
  { value: 4, label: isEn ? "Master's Degree" : "ماجستير" },
  { value: 5, label: isEn ? "Doctorate" : "دكتوراه" },
];

export const EDUCATION_LEVELS = getEducationLevels(false);
export const EDUCATION_STATUS_OPTIONS = EDUCATION_LEVELS;

export const getJobTitles = (isEn: boolean) => [
  { value: "business_owner", label: isEn ? "Business Owner" : "صاحب عمل" },
  { value: "manager", label: isEn ? "Manager" : "مدير" },
  { value: "engineer", label: isEn ? "Engineer" : "مهندس" },
  { value: "doctor", label: isEn ? "Doctor" : "طبيب" },
  { value: "teacher", label: isEn ? "Teacher" : "معلم" },
  { value: "sales", label: isEn ? "Sales" : "مبيعات" },
  { value: "marketing", label: isEn ? "Marketing" : "تسويق" },
  { value: "student", label: isEn ? "Student" : "طالب" },
];

export const JOB_TITLES = getJobTitles(false);

export const getBehaviors = (isEn: boolean) => [
  {
    id: "travel_frequent",
    name: isEn ? "Frequent Travelers" : "مسافرون متكررون",
    category: isEn ? "Travel" : "السفر",
  },
  {
    id: "online_shoppers",
    name: isEn ? "Online Shoppers" : "متسوقون عبر الإنترنت",
    category: isEn ? "Shopping" : "التسوق",
  },
  {
    id: "tech_early_adopters",
    name: isEn ? "Early Technology Adopters" : "متبنو التكنولوجيا المبكرون",
    category: isEn ? "Technology" : "التكنولوجيا",
  },
  {
    id: "mobile_device_users",
    name: isEn ? "Mobile Device Users" : "مستخدمو الأجهزة المحمولة",
    category: isEn ? "Devices" : "الأجهزة",
  },
  {
    id: "gamers",
    name: isEn ? "Gamers" : "اللاعبون",
    category: isEn ? "Entertainment" : "الترفيه",
  },
  {
    id: "small_business_owners",
    name: isEn ? "Small Business Owners" : "أصحاب الأعمال الصغيرة",
    category: isEn ? "Business" : "الأعمال",
  },
];

export const BEHAVIORS = getBehaviors(false);

export const getIncomeLevels = (isEn: boolean) => [
  { value: "top_5", label: isEn ? "Top 5%" : "أعلى 5%" },
  { value: "top_10", label: isEn ? "Top 10%" : "أعلى 10%" },
  { value: "top_25", label: isEn ? "Top 25%" : "أعلى 25%" },
  { value: "top_50", label: isEn ? "Top 50%" : "أعلى 50%" },
];

export const INCOME_LEVELS = getIncomeLevels(false);

export const getLifeEvents = (isEn: boolean) => [
  {
    id: "anniversary_1year",
    name: isEn ? "First Anniversary" : "الذكرى السنوية الأولى",
    category: isEn ? "Relationships" : "علاقات",
  },
  {
    id: "engaged_1year",
    name: isEn ? "Engaged (1 Year)" : "مخطوبون (سنة واحدة)",
    category: isEn ? "Relationships" : "علاقات",
  },
  {
    id: "newlywed_1year",
    name: isEn ? "Newlyweds (1 Year)" : "متزوجون حديثاً (سنة واحدة)",
    category: isEn ? "Relationships" : "علاقات",
  },
  {
    id: "recently_moved",
    name: isEn ? "Recently Moved" : "انتقلوا مؤخراً",
    category: isEn ? "Life" : "حياة",
  },
  {
    id: "new_job",
    name: isEn ? "New Job" : "وظيفة جديدة",
    category: isEn ? "Career" : "عمل",
  },
  {
    id: "birthday",
    name: isEn ? "Upcoming Birthday" : "عيد ميلاد قريب",
    category: isEn ? "Celebrations" : "احتفالات",
  },
];

export const LIFE_EVENTS = getLifeEvents(false);

export const getParentsOptions = (isEn: boolean) => [
  {
    id: "expecting_parent",
    name: isEn ? "Expecting Parents" : "آباء متوقعون",
    age: isEn ? "All Ages" : "جميع الأعمار",
  },
  {
    id: "new_parents",
    name: isEn ? "New Parents (0-12 months)" : "آباء جدد (0-12 شهر)",
    age: isEn ? "0-12 months" : "0-12 شهر",
  },
  {
    id: "parents_toddler",
    name: isEn ? "Parents of Toddlers (1-2 yrs)" : "آباء أطفال صغار",
    age: isEn ? "1-2 years" : "1-2 سنة",
  },
  {
    id: "parents_preschooler",
    name: isEn ? "Parents of Preschoolers (3-5 yrs)" : "آباء أطفال ما قبل المدرسة",
    age: isEn ? "3-5 years" : "3-5 سنوات",
  },
  {
    id: "parents_teen",
    name: isEn ? "Parents of Teens (13-18 yrs)" : "آباء مراهقين",
    age: isEn ? "13-18 years" : "13-18 سنة",
  },
];

export const PARENTS_OPTIONS = getParentsOptions(false);

export const getPerformanceGoals = (isEn: boolean) => [
  {
    value: "MAXIMIZE_CONVERSIONS",
    label: isEn ? "Maximize number of conversions" : "زيادة عدد التحويلات",
    description: isEn
      ? "Get the highest number of conversions"
      : "احصل على أكبر عدد من التحويلات",
  },
  {
    value: "MAXIMIZE_CONVERSION_VALUE",
    label: isEn ? "Maximize conversion value" : "زيادة قيمة التحويلات",
    description: isEn
      ? "Get the highest total value"
      : "احصل على أعلى قيمة إجمالية",
  },
  {
    value: "MAXIMIZE_ROAS",
    label: isEn ? "Maximize ROAS" : "زيادة عائد الإنفاق",
    description: isEn
      ? "Get the best return on ad spend"
      : "احصل على أفضل عائد على الاستثمار",
  },
];

export const PERFORMANCE_GOALS = getPerformanceGoals(false);

export const getConversionEvents = (isEn: boolean) => [
  {
    value: "PURCHASE",
    label: isEn ? "Purchase" : "شراء (Purchase)",
    icon: "🛒",
    description: isEn ? "When a purchase is completed" : "عند إتمام عملية شراء",
  },
  {
    value: "ADD_TO_CART",
    label: isEn ? "Add to Cart" : "إضافة للسلة",
    icon: "🛍️",
    description: isEn ? "When an item is added to cart" : "عند إضافة منتج للسلة",
  },
  {
    value: "INITIATE_CHECKOUT",
    label: isEn ? "Initiate Checkout" : "بدء الدفع",
    icon: "💳",
    description: isEn ? "When checkout process is started" : "عند بدء عملية الدفع",
  },
  {
    value: "VIEW_CONTENT",
    label: isEn ? "View Content" : "مشاهدة المحتوى",
    icon: "👁️",
    description: isEn ? "When a product page is viewed" : "عند مشاهدة صفحة منتج",
  },
  {
    value: "LEAD",
    label: isEn ? "Lead" : "عميل محتمل",
    icon: "📝",
    description: isEn ? "When a lead form is submitted" : "عند ملء نموذج",
  },
  {
    value: "COMPLETE_REGISTRATION",
    label: isEn ? "Complete Registration" : "تسجيل",
    icon: "✅",
    description: isEn ? "When registration is completed" : "عند إتمام التسجيل",
  },
];

export const CONVERSION_EVENTS = getConversionEvents(false);

export const getConversionLocations = (isEn: boolean) => [
  { value: "WEBSITE", label: isEn ? "Website" : "الموقع الإلكتروني", icon: "🌐" },
  { value: "APP", label: isEn ? "App" : "التطبيق", icon: "📱" },
  { value: "MESSENGER", label: "Messenger", icon: "💬" },
  { value: "WHATSAPP", label: "WhatsApp", icon: "📞" },
];

export const CONVERSION_LOCATIONS = getConversionLocations(false);

export const getAttributionWindows = (isEn: boolean) => [
  {
    value: "7d_click_1d_view",
    label: isEn ? "7-day click + 1-day view" : "7 أيام نقر + يوم مشاهدة",
    description: isEn ? "Default - Recommended" : "الافتراضي - موصى به",
  },
  {
    value: "1d_click_1d_view",
    label: isEn ? "1-day click + 1-day view" : "يوم نقر + يوم مشاهدة",
    description: isEn ? "For short purchase cycles" : "لدورة شراء قصيرة",
  },
  {
    value: "7d_click",
    label: isEn ? "7-day click only" : "7 أيام نقر فقط",
    description: isEn ? "Without view-through tracking" : "بدون تتبع المشاهدة",
  },
  {
    value: "1d_click",
    label: isEn ? "1-day click only" : "يوم نقر فقط",
    description: isEn ? "Strict click attribution" : "تتبع دقيق جداً",
  },
];

export const ATTRIBUTION_WINDOWS = getAttributionWindows(false);
