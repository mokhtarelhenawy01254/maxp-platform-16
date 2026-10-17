import type { LucideIcon } from "lucide-react";
import {
 Award,
 CheckCircle,
 Clock,
 Code,
 Flame,
 Heading,
 HelpCircle,
 Image as ImageIcon,
 ImagePlus,
 Layers,
 LayoutGrid,
 ListOrdered,
 Megaphone,
 MousePointerClick,
 ShoppingBag,
 Sliders,
 Star,
 Store,
 Type,
 Video,
 Youtube,
} from "lucide-react";
import {
 LandingSection,
 ProductLandingProduct,
 ProductLandingSlice,
 ProductLandingSeo,
 ProductLandingStatus,
 SectionType,
} from "../../../services/productLandingPagesService";
import type { LandingStyle } from "../../../storefront/utils/landingStyles";

export type {
 LandingSection,
 SectionType,
 ProductLandingStatus,
 ProductLandingProduct,
 ProductLandingSlice,
 LandingStyle,
 ProductLandingSeo,
};

export interface EditorState {
 title: string;
 slug: string;
 status: ProductLandingStatus;
 designNotes: string;
 formConfig: {
 orderKicker: string;
 orderTitle: string;
 orderCopy: string;
 buttonLabel: string;
 };
 style: LandingStyle;
 seo: ProductLandingSeo;
 slices: ProductLandingSlice[];
 sections: LandingSection[];
}

export type SidebarCategory = "media" | "commerce" | "content" | "trust";

export interface SidebarElementItem {
 type: SectionType;
 label: string;
 category: SidebarCategory;
 categoryLabel: string;
 icon: LucideIcon;
 iconBg: string;
 desc: string;
}

export interface SectionVariantOption {
 id: string;
 label: string;
 desc?: string;
}

export const SECTION_VARIANTS_MAP: Partial<Record<SectionType, SectionVariantOption[]>> = {
 REVIEWS: [
 { id: "CARDS", label: "كروت النجوم", desc: "تقييمات كلاسيكية فاخرة" },
 { id: "WHATSAPP", label: "محادثات واتساب", desc: "محادثات واقعية لرفع الثقة" },
 ],
 COMPARISON: [
 { id: "TABLE", label: "جدول مصفوفة", desc: "مقارنة كاملة الأصلي vs المقلد" },
 { id: "DUAL_CARDS", label: "كارتين متجاورين", desc: "منتجنا vs بدائل السوق جنب إلى جنب" },
 ],
 BREAKDOWN: [
 { id: "BENTO", label: "شبكة بينتو", desc: "4 كروت متناسقة لتشريح المنتج" },
 { id: "CHECKLIST", label: "قائمة فحص الجودة", desc: "مؤشرات فنية دقيقة بنقاط التحقق" },
 ],
 FEATURES: [
 { id: "BENTO", label: "شبكة الثقة 2x2", desc: "معاينة، شحن، COD، استبدال" },
 { id: "OFFICIAL_SEAL", label: "شهادة الضمان والختم", desc: "وثيقة ضمان ذهبية رسمية" },
 ],
 CAROUSEL: [
 { id: "SLIDER", label: "سلايدر كامل", desc: "عرض الشرائح بكامل العرض مع أسهم" },
 { id: "CARDS", label: "كروت منزلقة", desc: "شرائح بمسافات وهوامش متناسقة" },
 ],
 IMAGE_ONLY: [
 { id: "FULL_WIDTH", label: "عرض كامل", desc: "صورة بعرض الشاشة على الموبايل" },
 { id: "ROUNDED", label: "حواف دائرية", desc: "صورة دائرية أو بحواف ناعمة" },
 ],
};

export const SIDEBAR_ITEMS: SidebarElementItem[] = [
 // 1. الصور والميديا (Media)
 {
 type: "MEDIA",
 label: "الصور والميديا الرئيسية",
 category: "media",
 categoryLabel: "الصور والميديا",
 icon: ImageIcon,
 iconBg: "#3B82F6",
 desc: "معرض صور المنتج الأساسية واللقطات التعريفية",
 },
 {
 type: "IMAGE_ONLY",
 label: "صورة مفردة متقدمة",
 category: "media",
 categoryLabel: "الصور والميديا",
 icon: ImagePlus,
 iconBg: "#0284C7",
 desc: "صورة مستقلة مع تحكم في العرض والحواف الدائرية والخلفية",
 },
 {
 type: "CAROUSEL",
 label: "سلايدر صور وبنرات متحركة",
 category: "media",
 categoryLabel: "الصور والميديا",
 icon: Sliders,
 iconBg: "#0EA5E9",
 desc: "سلايدر للصور مع دعم صور مخصصة للجوال وللكمبيوتر ووجهات الروابط",
 },
 {
 type: "GALLERY",
 label: "معرض صور على الطبيعة",
 category: "media",
 categoryLabel: "الصور والميديا",
 icon: LayoutGrid,
 iconBg: "#7C3AED",
 desc: "لقطات للمنتج في الشارع ومن زوايا متعددة",
 },
 {
 type: "VIDEO_REEL",
 label: "فيديو رأسي / ريلز UGC",
 category: "media",
 categoryLabel: "الصور والميديا",
 icon: Video,
 iconBg: "#8B5CF6",
 desc: "فيديو عمودي 9:16 يوثق المنتج على الطبيعة بحركة حقيقية",
 },
 {
 type: "YOUTUBE_VIDEO",
 label: "فيديو يوتيوب",
 category: "media",
 categoryLabel: "الصور والميديا",
 icon: Youtube,
 iconBg: "#DC2626",
 desc: "تضمين مباشر لأي فيديو يوتيوب مع مشغل متجاوب وسريع",
 },
 {
 type: "BEFORE_AFTER",
 label: "سلايدر قبل وبعد التفاعلي",
 category: "media",
 categoryLabel: "الصور والميديا",
 icon: Sliders,
 iconBg: "#06B6D4",
 desc: "مقارنة بصرية حية بسلايدر سحب تفاعلي بين حالتين",
 },

 // 2. التجارة والتحويل (Commerce)
 {
 type: "FORM",
 label: "نموذج الشراء السريع COD",
 category: "commerce",
 categoryLabel: "التجارة والشراء",
 icon: ShoppingBag,
 iconBg: "#10B981",
 desc: "فورم الدفع عند الاستلام مع باقات التوفير واختيار المقاس واللون",
 },
 {
 type: "BUY_BUTTON",
 label: "زر شراء مخصص",
 category: "commerce",
 categoryLabel: "التجارة والشراء",
 icon: MousePointerClick,
 iconBg: "#16A34A",
 desc: "زر CTA مستقل يوجه مباشرة للفورم بألوان ونصوص مخصصة",
 },
 {
 type: "FEATURED_PRODUCT",
 label: "كارت المنتج المميز",
 category: "commerce",
 categoryLabel: "التجارة والشراء",
 icon: Award,
 iconBg: "#F59E0B",
 desc: "كارت إبراز جذاب بتدرج لوني وبادج السعر الخاص وزر الطلب",
 },
 {
 type: "COUNTDOWN",
 label: "عداد تنازلي ونفاد الكمية",
 category: "commerce",
 categoryLabel: "التجارة والشراء",
 icon: Clock,
 iconBg: "#EAB308",
 desc: "عداد التخفيضات بالساعات والدقائق وشريط نفاد المخزون",
 },

 // 3. المحتوى والعناوين (Content)
 {
 type: "HEADING",
 label: "عنوان رئيسي وفرعي",
 category: "content",
 categoryLabel: "العناوين والنصوص",
 icon: Heading,
 iconBg: "#6366F1",
 desc: "كتلة عناوين متقدمة مع محاذاة وألوان مخصصة",
 },
 {
 type: "TEXT",
 label: "نص ووصف تسويقي",
 category: "content",
 categoryLabel: "العناوين والنصوص",
 icon: Type,
 iconBg: "#4B5563",
 desc: "عناوين، وصف تسويقي، وتفاصيل مواصفات المنتج",
 },
 {
 type: "HOW_IT_WORKS",
 label: "طريقة الاستخدام وخطوات العمل",
 category: "content",
 categoryLabel: "العناوين والنصوص",
 icon: ListOrdered,
 iconBg: "#2563EB",
 desc: "خطوات مرتبة مرئياً (1، 2، 3) لشرح استخدام ومميزات المنتج",
 },
 {
 type: "BANNERS",
 label: "لافتات وعروض ترويجية",
 category: "content",
 categoryLabel: "العناوين والنصوص",
 icon: Megaphone,
 iconBg: "#EC4899",
 desc: "بنرات الخصومات والتنبيهات الملونة والشحن المجاني",
 },
 {
 type: "HTML",
 label: "كود HTML / CSS مخصص",
 category: "content",
 categoryLabel: "العناوين والنصوص",
 icon: Code,
 iconBg: "#EF4444",
 desc: "تضمين أكواد تتبع أو عناصر وتصميمات مخصصة",
 },

 // 4. الثقة والضمانات (Trust)
 {
 type: "BREAKDOWN",
 label: "تشريح ومواصفات دقيقة",
 category: "trust",
 categoryLabel: "الثقة والمصداقية",
 icon: Layers,
 iconBg: "#1D4ED8",
 desc: "كروت بصرية بنمط Bento أو قائمة فحص الجودة لمواصفات المنتج",
 },
 {
 type: "COMPARISON",
 label: "جدول المقارنة الذكي",
 category: "trust",
 categoryLabel: "الثقة والمصداقية",
 icon: CheckCircle,
 iconBg: "#059669",
 desc: "مقارنة مقنعة: منتجنا الأصلي vs المنتجات المقلدة في السوق",
 },
 {
 type: "LIVE_PROOF",
 label: "إثبات اجتماعي وطلبات حية",
 category: "trust",
 categoryLabel: "الثقة والمصداقية",
 icon: Flame,
 iconBg: "#EA580C",
 desc: "إشعارات الشراء الحديثة بالمحافظات وشارات الأمان والتقييم",
 },
 {
 type: "FEATURES",
 label: "مميزات المتجر والضمانات",
 category: "trust",
 categoryLabel: "الثقة والمصداقية",
 icon: Store,
 iconBg: "#14B8A6",
 desc: "شارات الثقة: الشحن، المعاينة، والختم الذهبي المعتمد",
 },
 {
 type: "REVIEWS",
 label: "تقييمات مخصصة وشات واتساب",
 category: "trust",
 categoryLabel: "الثقة والمصداقية",
 icon: Star,
 iconBg: "#D97706",
 desc: "آراء وتقييمات العملاء بالنجوم أو بأسلوب محادثات واتساب الواقعية",
 },
 {
 type: "FAQ",
 label: "الأسئلة الشائعة",
 category: "trust",
 categoryLabel: "الثقة والمصداقية",
 icon: HelpCircle,
 iconBg: "#9333EA",
 desc: "أكورديون الأسئلة والإجابات الشائعة للعملاء لطمأنة المشتري",
 },
];

export const buildDefaultSectionsForProduct = (
 product?: ProductLandingProduct | null,
): LandingSection[] => {
 const prodName = product?.name || "المنتج الجديد";
 const prodPrice = product?.price ? `${Number(product.price).toLocaleString("ar-EG")} ج.م` : "سعر خاص";
 const mainImg = product?.mainImage || (Array.isArray(product?.images) ? product.images[0] : "");

 return [
 {
 id: "sec-media-1",
 type: "MEDIA",
 title: "الصور والميديا",
 enabled: true,
 content: {
 images: mainImg ? [mainImg] : [],
 mainImage: mainImg || "",
 },
 },
 {
 id: "sec-text-1",
 type: "TEXT",
 title: "نص ووصف المنتج",
 enabled: true,
 content: {
 heading: `${prodName} — جودة عالية وتصميم عصري`,
 subheading: "احصل على أفضل تجربة شراء مع شحن سريع وضمان شامل",
 bodyText: "تصميم أنيق وعملي يلبي احتياجاتك بدقة. مصنوع من خامات عالية الجودة لتدوم طويلاً، مع ضمان الرضا التام وسهولة الاستخدام.",
 },
 },
 {
 id: "sec-breakdown-1",
 type: "BREAKDOWN",
 variant: "BENTO",
 title: "تشريح ومواصفات المنتج الفاخرة",
 enabled: true,
 content: {
 breakdownTitle: `تشريح ومميزات تصنيع ${prodName}`,
 breakdownItems: [
 { title: "نعل طبي ماص للصدمات", desc: "مصنوع من مادة EVA المرنة لراحة الكعب والركبة طوال اليوم", icon: "", tag: "طبي 100%" },
 { title: "فرش هوائي مانع للتعرق", desc: "مسامات تهوية نشطة لمنع الروائح والحفاظ على انتعاش القدمين", icon: "", tag: "انتعاش دائم" },
 { title: "خياطة يدوية مدبلة", desc: "غرز متينة ومقاومة للتمزق والفك حتى مع المشاوير اليومية الشاقة", icon: "", tag: "متانة فائقة" },
 { title: "خفة وزن استثنائية", desc: "وزن خفيف جداً يجعلك تشعر وكأنك تمشي بخفة بدون إجهاد", icon: "🪶", tag: "خفيف جداً" },
 ],
 },
 },
 {
 id: "sec-comparison-1",
 type: "COMPARISON",
 variant: "TABLE",
 title: "جدول المقارنة الذكي",
 enabled: true,
 content: {
 comparisonTitle: `لماذا تختار ${prodName} بدلاً من البدائل العادية في السوق؟`,
 comparisonUsLabel: `${prodName} الأصلي`,
 comparisonThemLabel: "المنتجات المقلدة في السوق",
 comparisonItems: [
 { feature: "جودة الخامات", us: "خامات نخب أول متينة ومقاومة للاهتراء", them: "خامات بلاستيكية رديئة تتشقق سريعاً" },
 { feature: "راحة المشي والاستخدام", us: "تصميم مريح يوزع ثقل الجسم بدون إجهاد", them: "نعل ناشف يسبب آلام القدم والظهر" },
 { feature: "حق الفحص والمعاينة", us: "افتح الشحنة وافحص براحتك قبل دفع قرش", them: "ممنوع فتح الشحنة إلا بعد الدفع" },
 { feature: "الضمان والاسترجاع", us: "ضمان استبدال واسترجاع سهل خلال 14 يوماً", them: "لا يوجد أي ضمان بعد استلام الشحنة" },
 ],
 },
 },
 {
 id: "sec-liveproof-1",
 type: "LIVE_PROOF",
 title: "إثبات اجتماعي وطلبات حية",
 enabled: true,
 content: {
 satisfactionRate: "4.9 / 5 (أكثر من 1,420 تقييم)",
 recentOrders: [
 { buyer: "أميرة م.", city: "مدينة نصر، القاهرة", timeAgo: "منذ 4 دقائق", item: prodName },
 { buyer: "محمود ع.", city: "سموحة، الإسكندرية", timeAgo: "منذ 11 دقيقة", item: `${prodName} (باقة قطعتين)` },
 { buyer: "نورهان س.", city: "المنصورة، الدقهلية", timeAgo: "منذ 19 دقيقة", item: prodName },
 ],
 },
 },
 {
 id: "sec-countdown-1",
 type: "COUNTDOWN",
 title: "عداد تنازلي ونفاد الكمية",
 enabled: true,
 content: {
 timerEndsMinutes: 45,
 lowStockCount: 14,
 },
 },
 {
 id: "sec-features-1",
 type: "FEATURES",
 variant: "BENTO",
 title: "مميزات المتجر",
 enabled: true,
 content: {
 features: [
 { title: "شحن سريع لكافة المحافظات", desc: "وصول خلال 24 إلى 48 ساعة فقط", icon: "" },
 { title: "معاينة قبل الدفع", desc: "افحص وتأكد من المنتج قبل دفع الكاش", icon: "" },
 { title: "دفع عند الاستلام COD", desc: "بدون أي دفع مسبق أو بطاقات ائتمان", icon: "" },
 { title: "ضمان استبدال 14 يوم", desc: "حق الاستبدال والإرجاع بسهولة", icon: "" },
 ],
 },
 },
 {
 id: "sec-form-1",
 type: "FORM",
 title: "نموذج الشراء والدفع عند الاستلام",
 enabled: true,
 content: {
 orderKicker: "نموذج الطلب المباشر",
 orderTitle: prodName.length > 25 ? "اطلب الآن واستفد من العرض التوفيري" : `اطلب ${prodName} الآن`,
 orderCopy: "املأ بيانات التوصيل وسيتم التواصل معك هاتفياً لتأكيد الشحن فوراً.",
 buttonLabel: "تأكيد الطلب الآن — دفع عند الاستلام ",
 },
 },
 {
 id: "sec-reviews-1",
 type: "REVIEWS",
 variant: "WHATSAPP",
 title: "تقييمات مخصصة",
 enabled: true,
 content: {
 reviews: [
 { name: "أحمد إبراهيم", text: "المنتج ممتاز جداً والتوصيل كان سريع في يومين والمعاينة تمت قبل الدفع.", rating: 5 },
 { name: "سارة محمود", text: "الجودة فاقت توقعاتي وخدمة العملاء متعاونين جداً. أنصح به بشدة!", rating: 5 },
 { name: "محمود حسن", text: "تجربة شراء محترمة ومطابق تماماً للصور والمواصفات المعروضة.", rating: 5 },
 ],
 },
 },
 {
 id: "sec-faq-1",
 type: "FAQ",
 title: "الأسئلة الشائعة",
 enabled: true,
 content: {
 faqs: [
 { question: "هل يمكنني معاينة المنتج قبل الدفع؟", answer: "نعم بالتأكيد! مندوب الشحن ينتظرك لفتح الشحنة ومعاينتها والتأكد منها قبل الاستلام." },
 { question: "كم يستغرق وقت التوصيل؟", answer: "التوصيل يستغرق من 24 إلى 48 ساعة لجميع محافظات مصر." },
 { question: "ما هي سياسة الاستبدال والاسترجاع؟", answer: "لديك 14 يوماً من تاريخ الاستلام لاستبدال أو إرجاع المنتج بسهولة." },
 ],
 },
 },
 ];
};

export const DEFAULT_EDITOR: EditorState = {
 title: "",
 slug: "",
 status: "DRAFT",
 designNotes: "",
 formConfig: {
 orderKicker: "نموذج الطلب",
 orderTitle: "اطلب المنتج الآن",
 orderCopy: "املأ البيانات الأساسية وسيتم التواصل معك لتأكيد الطلب.",
 buttonLabel: "تأكيد الطلب الآن",
 },
 style: {},
 seo: {},
 slices: [],
 sections: [],
};

export const getProductImage = (product?: ProductLandingProduct | null): string => {
 if (!product) return "";
 if (product.mainImage) return product.mainImage;

 if (Array.isArray(product.images)) {
 return typeof product.images[0] === "string" ? product.images[0] : "";
 }

 if (typeof product.images === "string") {
 try {
 const parsed = JSON.parse(product.images);
 if (Array.isArray(parsed) && typeof parsed[0] === "string") {
 return parsed[0];
 }
 } catch {
 return product.images;
 }
 }

 return "";
};

export const formatMoney = (value?: number | string | null): string => {
 const numeric = Number(value || 0);
 return Number.isFinite(numeric)
 ? `${numeric.toLocaleString("ar-EG")} ج.م`
 : "غير محدد";
};

export interface LandingTemplateDemo {
 id: string;
 name: string;
 badge: string;
 desc: string;
 sectionsCount: number;
 previewColor: string;
 buildSections: (product?: ProductLandingProduct | null) => LandingSection[];
}

export const LANDING_TEMPLATES: LandingTemplateDemo[] = [
 {
 id: "fashion-conversion",
 name: "قالب السنيكرز والأزياء الفاخرة (مبيعات COD فائقة)",
 badge: "الأكثر تحويلاً ",
 desc: "مجهز بجدول المقارنة الأصلي vs التقليد، تشريح بنعل طبي، تقييمات شات واتساب، وباقات التوفير.",
 sectionsCount: 8,
 previewColor: "#2563eb",
 buildSections: (product) => buildDefaultSectionsForProduct(product),
 },
 {
 id: "flash-sale-urgency",
 name: "قالب العروض الترويجية والتخفيضات السريعة",
 badge: "عرض خاص ",
 desc: "يركز على العداد التنازلي، كارت المنتج المميز، بنرات الخصم، وزر الشراء المباشر.",
 sectionsCount: 7,
 previewColor: "#dc2626",
 buildSections: (product) => {
 const prodName = product?.name || "المنتج الحصري";
 const mainImg = getProductImage(product);
 return [
 {
 id: `sec-banner-${Date.now()}-1`,
 type: "BANNERS",
 title: "لافتة العرض الاستثنائي",
 enabled: true,
 content: {
 bannerText: " عرض الجمعة الذهبية — خصم 35% + شحن مجاني لكافة المحافظات اليوم فقط!",
 bannerBg: "#dc2626",
 },
 },
 {
 id: `sec-featprod-${Date.now()}-2`,
 type: "FEATURED_PRODUCT",
 title: "كارت المنتج المميز",
 enabled: true,
 content: {
 heading: prodName,
 subheading: "الإصدار الأصلي المحدود — خامات فاخرة وضمان استبدال 14 يوم",
 mainImage: mainImg,
 featuredPrice: product?.price || 499,
 featuredBadge: "توفير 150 ج.م ",
 featuredButtonText: "اطلب الآن واستفد من العرض ",
 },
 },
 {
 id: `sec-countdown-${Date.now()}-3`,
 type: "COUNTDOWN",
 title: "عداد نفاد الكمية",
 enabled: true,
 content: {
 timerEndsMinutes: 30,
 lowStockCount: 9,
 text: "متبقي 9 قطع فقط بالسعر المخفض — ينتهي الخصم بانتهاء العداد!",
 },
 },
 {
 id: `sec-carousel-${Date.now()}-4`,
 type: "CAROUSEL",
 title: "سلايدر زوايا المنتج",
 enabled: true,
 content: {
 carouselImages: [
 { image: mainImg, title: "لقطة أمامية شاملة" },
 { image: mainImg, title: "تفاصيل الخامات والنعل" },
 ],
 },
 },
 {
 id: `sec-form-${Date.now()}-5`,
 type: "FORM",
 title: "نموذج الشراء المباشر",
 enabled: true,
 content: {
 orderKicker: "خصم العرض السريع",
 orderTitle: `اطلب ${prodName} الآن واحصل على الشحن مجاناً`,
 orderCopy: "املأ بياناتك وسيتم التواصل لتأكيد الشحن فوراً والمعاينة قبل الدفع.",
 buttonLabel: "تأكيد الطلب — دفع عند الاستلام ",
 },
 },
 {
 id: `sec-reviews-${Date.now()}-6`,
 type: "REVIEWS",
 variant: "WHATSAPP",
 title: "تجارب المشترين",
 enabled: true,
 content: {
 reviews: [
 { name: "طارق سليم", text: "الاستلام في يومين والخامة تحفة بجد والمعاينة تمت قبل الدفع شكراً ليكم.", rating: 5 },
 { name: "مها النجار", text: "الكوتشي خفيف جداً ومريح في المشي ومطابق للصور 100%.", rating: 5 },
 ],
 },
 },
 {
 id: `sec-faq-${Date.now()}-7`,
 type: "FAQ",
 title: "الأسئلة الشائعة",
 enabled: true,
 content: {
 faqs: [
 { question: "هل ينفع أفتح الشحنة وأعاين؟", answer: "نعم بالطبع، المندوب ينتظرك لمعاينة وفحص المنتج قبل دفع أي جنيه." },
 { question: "مصاريف الشحن كام؟", answer: "الشحن مجاني بالكامل اليوم ضمن العرض الخاص!" },
 ],
 },
 },
 ];
 },
 },
 {
 id: "how-it-works-trust",
 name: "قالب طريقة الاستخدام والشرح الهندسي",
 badge: "شرح تفصيلي ",
 desc: "مثالي للمنتجات التي تحتاج لشرح خطوات التشغيل وفيديو توضيحي وقائمة فحص الجودة.",
 sectionsCount: 7,
 previewColor: "#059669",
 buildSections: (product) => {
 const prodName = product?.name || "المنتج المبتكر";
 const mainImg = getProductImage(product);
 return [
 {
 id: `sec-heading-${Date.now()}-1`,
 type: "HEADING",
 title: "عنوان وتفاصيل الإطلاق",
 enabled: true,
 content: {
 heading: `${prodName} — الابتكار الأمثل لراحتك اليومية`,
 subheading: "صُمم بمعايير هندسية متطورة تمنحك الأداء والراحة في كل خطوة",
 titleAlign: "center",
 },
 },
 {
 id: `sec-img-${Date.now()}-2`,
 type: "IMAGE_ONLY",
 title: "صورة مكبرة للمنتج",
 enabled: true,
 content: {
 mainImage: mainImg,
 isFullWidth: true,
 borderRadius: 16,
 },
 },
 {
 id: `sec-how-${Date.now()}-3`,
 type: "HOW_IT_WORKS",
 title: "طريقة الاستخدام وخطوات العمل",
 enabled: true,
 content: {
 heading: "كيف يعمل المنتج في 3 خطوات بسيطة؟",
 steps: [
 { stepNumber: 1, title: "الاستلام والفحص المباشر", desc: "افتح شحنتك وتأكد من المقاس وجودة الخامة قبل دفع أي مبلغ للمندوب.", icon: "" },
 { stepNumber: 2, title: "الارتداء وتوزيع الضغط", desc: "النعل الطبي والفرش الهوائي يوزعان ثقل الجسم تلقائياً لمنع إجهاد الكعب والركبة.", icon: "" },
 { stepNumber: 3, title: "راحة تدوم طوال اليوم", desc: "استمتع بمشاويرك اليومية بكل خفة وحرية مع ضمان استبدال واسترجاع لمدة 14 يوماً.", icon: "" },
 ],
 },
 },
 {
 id: `sec-yt-${Date.now()}-4`,
 type: "YOUTUBE_VIDEO",
 title: "فيديو التجربة الواقعية",
 enabled: true,
 content: {
 youtubeUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
 heading: "شاهد تجربة المنتج والأنبوكسينغ على الطبيعة",
 },
 },
 {
 id: `sec-features-${Date.now()}-5`,
 type: "FEATURES",
 variant: "OFFICIAL_SEAL",
 title: "شهادة الضمان والختم المعتمد",
 enabled: true,
 content: {
 kicker: "وثيقة الضمان الذهبية",
 },
 },
 {
 id: `sec-buybtn-${Date.now()}-6`,
 type: "BUY_BUTTON",
 title: "زر الشراء المباشر",
 enabled: true,
 content: {
 buyButtonText: "اطلب الآن واستلم خلال 48 ساعة ",
 buyButtonBg: "#059669",
 buyButtonTextColor: "#ffffff",
 },
 },
 {
 id: `sec-form-${Date.now()}-7`,
 type: "FORM",
 title: "نموذج الشراء السريع",
 enabled: true,
 content: {
 orderKicker: "طلب سهل وسريع",
 orderTitle: `اطلب ${prodName} مباشرة`,
 orderCopy: "املأ بيانات الشحن وسيتم الاتصال لتأكيد موعد التوصيل.",
 buttonLabel: "تأكيد الطلب — دفع عند الاستلام",
 },
 },
 ];
 },
 },
 {
 id: "medical-health-proof",
 name: "قالب المنتجات الطبية والعلاجية",
 badge: "إثبات طبي 🩺",
 desc: "مثالي للمنتجات الصحية، الأحذية الطبية، ومستحضرات العناية التي تعتمد على الإثبات البصري وتجارب العملاء الحقيقية.",
 sectionsCount: 8,
 previewColor: "#0284c7",
 buildSections: (product) => {
 const prodName = product?.name || "المنتج الطبي الأصلي";
 const mainImg = getProductImage(product);
 return [
 {
 id: `sec-banners-${Date.now()}-1`,
 type: "BANNERS",
 title: "شريط التنبيه والعرض الطبي",
 enabled: true,
 content: {
 bannerText: "خصم 40% اليوم فقط + معاينة الشحنة قبل الدفع وضمان استرجاع 14 يوم 🩺",
 bannerBg: "#0284c7",
 },
 },
 {
 id: `sec-heading-${Date.now()}-2`,
 type: "HEADING",
 title: "عنوان الفعالية الطبية",
 enabled: true,
 content: {
 heading: `ودّع آلام القدمين والظهر نهائياً مع ${prodName}`,
 subheading: "راحة فورية مثبتة وامتصاص كامل للصدمات أثناء المشي والوقوف الطويل",
 titleAlign: "center",
 },
 },
 {
 id: `sec-media-${Date.now()}-3`,
 type: "MEDIA",
 title: "معرض صور المنتج",
 enabled: true,
 content: {
 images: [mainImg],
 },
 },
 {
 id: `sec-ba-${Date.now()}-4`,
 type: "BEFORE_AFTER",
 title: "سلايدر مقارنة النتائج التفاعلي",
 enabled: true,
 content: {
 beforeImage: mainImg,
 afterImage: mainImg,
 beforeLabel: "الأحذية العادية في السوق",
 afterLabel: `${prodName} الطبي`,
 },
 },
 {
 id: `sec-features-${Date.now()}-5`,
 type: "FEATURES",
 variant: "OFFICIAL_SEAL",
 title: "المميزات الطبية المعتمدة",
 enabled: true,
 content: {
 kicker: "معايير طبية معتمدة",
 },
 },
 {
 id: `sec-buybtn-${Date.now()}-6`,
 type: "BUY_BUTTON",
 title: "زر الطلب الطبي السريع",
 enabled: true,
 content: {
 buyButtonText: "احجز مقاسك الآن واستفد من العرض الطبي ",
 buyButtonBg: "#0284c7",
 },
 },
 {
 id: `sec-faq-${Date.now()}-7`,
 type: "FAQ",
 title: "الأسئلة الشائعة",
 enabled: true,
 content: {
 faqs: [
 { question: "هل المنتج أصلي؟", answer: "نعم أصلي 100% مع ضمان استبدال واسترجاع ومعاينة قبل الدفع للمندوب." },
 { question: "هل مناسب لمرضى السكري والشوكة العظمية؟", answer: "نعم، مصمم خصيصاً بنعل ممتص للصدمات لتخفيف الضغط على الكعب ومشط القدم." },
 ],
 },
 },
 {
 id: `sec-form-${Date.now()}-8`,
 type: "FORM",
 title: "نموذج الطلب السريع",
 enabled: true,
 content: {
 orderKicker: "طلب سهل في دقيقة",
 orderTitle: `طلب ${prodName}`,
 orderCopy: "املأ بياناتك وسيتم التواصل لتأكيد المقاس وموعد التوصيل.",
 buttonLabel: "تأكيد الحجز — دفع عند الاستلام",
 },
 },
 ];
 },
 },
];

export const exportLandingPageToJson = (
 title: string,
 slug: string,
 sections: LandingSection[],
 formConfig?: any,
): string => {
 const payload = {
 version: "2026.1",
 generator: "MaxP Platform Landing Builder",
 title,
 slug,
 exportedAt: new Date().toISOString(),
 sections,
 formConfig,
 };
 return JSON.stringify(payload, null, 2);
};

export const importLandingPageFromJson = (
 jsonString: string,
): { title?: string; slug?: string; sections: LandingSection[]; formConfig?: any } => {
 const parsed = JSON.parse(jsonString);

 // Support direct MaxP exported format
 if (parsed && Array.isArray(parsed.sections)) {
 return {
 title: parsed.title,
 slug: parsed.slug,
 sections: parsed.sections,
 formConfig: parsed.formConfig,
 };
 }

 // Support direct array of sections (or EasyOrders features array)
 if (Array.isArray(parsed)) {
 const converted: LandingSection[] = parsed.map((item, idx) => {
 const secType: SectionType =
 item.type === "banner" || item.type === "custom-banners"
 ? "CAROUSEL"
 : item.type === "img_only"
 ? "IMAGE_ONLY"
 : item.type === "faq"
 ? "FAQ"
 : item.type === "youtube-video"
 ? "YOUTUBE_VIDEO"
 : item.type === "buy_button"
 ? "BUY_BUTTON"
 : item.type === "how-to-work"
 ? "HOW_IT_WORKS"
 : item.type === "featured-product"
 ? "FEATURED_PRODUCT"
 : item.type === "store-features" || item.type === "icon_with_text"
 ? "FEATURES"
 : item.type === "reviews" || item.type === "custom-testimonials"
 ? "REVIEWS"
 : item.type === "count_down"
 ? "COUNTDOWN"
 : item.type === "heading"
 ? "HEADING"
 : item.type === "html"
 ? "HTML"
 : "TEXT";

 return {
 id: item.id || `sec-imported-${idx}-${Date.now()}`,
 type: secType,
 title: item.title || item.type || `قسم ${idx + 1}`,
 enabled: true,
 content: {
 heading: item.title || item.heading,
 subheading: item.description,
 bodyText: item.description || item.text,
 mainImage: item.image?.url || item.data?.images?.[0]?.image || "",
 images: item.image?.url ? [item.image.url] : [],
 bgColor: item.bg_color || item.data?.bg_color,
 bgImage: item.bg_image,
 customCss: item.custom_css,
 reversed: item.reversed,
 isFullWidth: item.image?.is_full_width,
 isCircle: item.image?.is_circle,
 borderRadius: item.image?.border_radius,
 faqs: item.faqs,
 reviews: item.social_reviews?.map((sr: any) => ({
 name: sr.author_name || "عميل",
 text: sr.review || "",
 rating: 5,
 avatar: sr.author_image,
 })),
 },
 };
 });

 return {
 sections: converted,
 };
 }

 // EasyOrders wrapped format with "features"
 if (parsed && Array.isArray(parsed.features)) {
 return importLandingPageFromJson(JSON.stringify(parsed.features));
 }

 throw new Error("تنسيق ملف الـ JSON غير صالح أو لا يحتوي على أقسام صالحة");
};

