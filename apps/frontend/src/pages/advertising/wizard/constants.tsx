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

export const WIZARD_STEPS: WizardStep[] = [
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

export const OBJECTIVES = [
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

export const SPECIAL_AD_CATEGORIES = [
  { value: "NONE", label: "لا شيء" },
  { value: "HOUSING", label: "إسكان" },
  { value: "EMPLOYMENT", label: "توظيف" },
  { value: "CREDIT", label: "ائتمان" },
  { value: "ISSUES_ELECTIONS_POLITICS", label: "قضايا اجتماعية أو سياسية" },
];

export const BID_STRATEGIES = [
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

export const CALL_TO_ACTIONS = [
  { value: "LEARN_MORE", label: "معرفة المزيد" },
  { value: "SHOP_NOW", label: "تسوق الآن" },
  { value: "SIGN_UP", label: "سجل الآن" },
  { value: "CONTACT_US", label: "تواصل معنا" },
  { value: "DOWNLOAD", label: "تحميل" },
  { value: "GET_OFFER", label: "احصل على العرض" },
  { value: "BOOK_NOW", label: "احجز الآن" },
  { value: "SEND_MESSAGE", label: "أرسل رسالة" },
];

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
