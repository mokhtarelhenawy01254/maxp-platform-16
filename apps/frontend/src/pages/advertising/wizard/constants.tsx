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
  Sparkles,
  Zap,
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
  { value: "SIGN_UP", label: isEn ? "Sign Up" : "سجل الآن" },
  { value: "CONTACT_US", label: isEn ? "Contact Us" : "تواصل معنا" },
  { value: "DOWNLOAD", label: isEn ? "Download" : "تحميل" },
  { value: "GET_OFFER", label: isEn ? "Get Offer" : "احصل على العرض" },
  { value: "BOOK_NOW", label: isEn ? "Book Now" : "احجز الآن" },
  { value: "SEND_MESSAGE", label: isEn ? "Send Message" : "أرسل رسالة" },
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

export const COUNTRIES = [
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

export const INTEREST_CATEGORIES = [
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

export const RELATIONSHIP_OPTIONS = [
  { value: 1, label: "أعزب/عزباء" },
  { value: 2, label: "في علاقة" },
  { value: 3, label: "مخطوب/ة" },
  { value: 4, label: "متزوج/ة" },
];

export const LANGUAGES = [
  { id: 6, name: "العربية" },
  { id: 24, name: "الإنجليزية" },
  { id: 10, name: "الفرنسية" },
  { id: 25, name: "التركية" },
];

export const DEVICE_PLATFORMS = [
  { value: "iOS", label: "iOS", icon: "📱" },
  { value: "Android", label: "Android", icon: "🤖" },
];

export const EDUCATION_LEVELS = [
  { value: 1, label: "ثانوية عامة" },
  { value: 2, label: "بعض الكلية" },
  { value: 3, label: "درجة جامعية" },
  { value: 4, label: "ماجستير" },
  { value: 5, label: "دكتوراه" },
];

export const JOB_TITLES = [
  { value: "business_owner", label: "صاحب عمل" },
  { value: "manager", label: "مدير" },
  { value: "engineer", label: "مهندس" },
  { value: "doctor", label: "طبيب" },
  { value: "teacher", label: "معلم" },
  { value: "sales", label: "مبيعات" },
  { value: "marketing", label: "تسويق" },
  { value: "student", label: "طالب" },
];

export const BEHAVIORS = [
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

export const INCOME_LEVELS = [
  { value: "top_5", label: "أعلى 5%" },
  { value: "top_10", label: "أعلى 10%" },
  { value: "top_25", label: "أعلى 25%" },
  { value: "top_50", label: "أعلى 50%" },
];

export const LIFE_EVENTS = [
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

export const PARENTS_OPTIONS = [
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

export const PERFORMANCE_GOALS = [
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

export const CONVERSION_EVENTS = [
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

export const CONVERSION_LOCATIONS = [
  { value: "WEBSITE", label: "الموقع الإلكتروني", icon: "🌐" },
  { value: "APP", label: "التطبيق", icon: "📱" },
  { value: "MESSENGER", label: "Messenger", icon: "💬" },
  { value: "WHATSAPP", label: "WhatsApp", icon: "📞" },
];

export const ATTRIBUTION_WINDOWS = [
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

export {
  
};
