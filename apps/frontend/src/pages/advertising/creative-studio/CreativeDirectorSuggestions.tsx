import React, { useState, useMemo, useEffect } from "react";
import { Sparkles, ArrowUpRight, Plus, Trash2, RotateCcw, Check, X } from "lucide-react";
import type { MarketingProduct, CreativeAngleSuggestion, ProductCategory } from "./types";

interface CreativeDirectorSuggestionsProps {
  product: MarketingProduct | null;
  onSelectAngle: (angle: CreativeAngleSuggestion) => void;
  isGenerating?: boolean;
}

interface CategoryOption {
  id: ProductCategory;
  label: string;
}

const CATEGORIES: CategoryOption[] = [
  { id: "shoes", label: "أحذية ورياضة" },
  { id: "skincare", label: "عناية وتجميل" },
  { id: "perfume", label: "عطور ومقتنيات" },
  { id: "watches", label: "ساعات ومجوهرات" },
  { id: "electronics", label: "إلكترونيات وتقنية" },
  { id: "apparel", label: "أزياء وملابس" },
  { id: "food", label: "أغذية ومشروبات" },
  { id: "home", label: "ديكور ومنزل" },
  { id: "custom", label: "فئة مخصصة" },
];

const CUSTOM_ANGLES_STORAGE_KEY = "maxp_creative_custom_angles_v2";
const DELETED_ANGLES_STORAGE_KEY = "maxp_creative_deleted_angles_v2";

export const CreativeDirectorSuggestions: React.FC<CreativeDirectorSuggestionsProps> = ({
  product,
  onSelectAngle,
  isGenerating = false,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory>("shoes");
  const [customCategoryText, setCustomCategoryText] = useState("");
  const [customAngles, setCustomAngles] = useState<CreativeAngleSuggestion[]>([]);
  const [deletedAngleIds, setDeletedAngleIds] = useState<string[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);

  // New Angle Form State
  const [newTitle, setNewTitle] = useState("");
  const [newBadge, setNewBadge] = useState("زاوية مبتكرة");
  const [newRationale, setNewRationale] = useState("");
  const [newPrompt, setNewPrompt] = useState("");

  // Load custom and deleted angles from localStorage
  useEffect(() => {
    try {
      const savedCustom = localStorage.getItem(CUSTOM_ANGLES_STORAGE_KEY);
      if (savedCustom) setCustomAngles(JSON.parse(savedCustom));
      const savedDeleted = localStorage.getItem(DELETED_ANGLES_STORAGE_KEY);
      if (savedDeleted) setDeletedAngleIds(JSON.parse(savedDeleted));
    } catch {}
  }, []);

  // Intelligent auto-detection of category from product name
  useEffect(() => {
    if (!product?.name) return;
    const n = product.name.toLowerCase();
    if (n.includes("كوتشي") || n.includes("حذاء") || n.includes("شوز") || n.includes("بوت") || n.includes("سنيكر")) {
      setSelectedCategory("shoes");
    } else if (n.includes("سيروم") || n.includes("كريم") || n.includes("غسول") || n.includes("بشرة") || n.includes("شعر") || n.includes("مكياج") || n.includes("ماسكارا")) {
      setSelectedCategory("skincare");
    } else if (n.includes("عطر") || n.includes("برفان") || n.includes("مسك") || n.includes("عود") || n.includes("بخور")) {
      setSelectedCategory("perfume");
    } else if (n.includes("ساعة") || n.includes("خاتم") || n.includes("سلسلة") || n.includes("مجوهرات") || n.includes("أسورة")) {
      setSelectedCategory("watches");
    } else if (n.includes("سماعة") || n.includes("شاحن") || n.includes("موبايل") || n.includes("لابتوب") || n.includes("باوربانك") || n.includes("كابل") || n.includes("ماوس")) {
      setSelectedCategory("electronics");
    } else if (n.includes("تيشيرت") || n.includes("قميص") || n.includes("بنطلون") || n.includes("فستان") || n.includes("جاكيت") || n.includes("عباية")) {
      setSelectedCategory("apparel");
    } else if (n.includes("قهوة") || n.includes("شاي") || n.includes("عصير") || n.includes("عسل") || n.includes("شوكولاتة") || n.includes("سناكس")) {
      setSelectedCategory("food");
    } else if (n.includes("أباجورة") || n.includes("مخدة") || n.includes("ستارة") || n.includes("لوحة") || n.includes("شمعة")) {
      setSelectedCategory("home");
    }
  }, [product?.name]);

  const defaultSuggestions = useMemo<CreativeAngleSuggestion[]>(() => {
    const pName = product?.name || "المنتج التجاري";
    switch (selectedCategory) {
      case "perfume":
        return [
          {
            id: "perfume-luxury-marble",
            titleAr: "غموض العود ورخام أسود ليلي",
            badge: "الأعلى فخامة 4.5x ROAS",
            rationale: "يبرز نقاء زجاجة العطر على سطح رخامي مصقول مع انعكاسات مائية دافئة وإضاءة ذهبية خافتة تثير رغبة الاقتناء الراقي.",
            prompt: `Commercial luxury product photography of perfume bottle ${pName} on sleek polished black marble surrounded by gentle water ripples and golden rim lighting, dark moody aesthetic, shallow depth of field, 8k resolution, shot on Hasselblad.`,
            modality: "packshot",
          },
          {
            id: "perfume-nature-ingredients",
            titleAr: "المكونات الطبيعية المتطايرة (Ingredients Explosion)",
            badge: "معدل نقر عالي Hook",
            rationale: "إظهار المكونات العطرية الحقيقية (خشب صندل، زهور بيضاء، فانيليا، عنبر) محيطة بالقارورة بأسلوب سينمائي يوضح فخامة التركيبة.",
            prompt: `High-end advertising shoot for perfume bottle ${pName} hovering amidst floating natural ingredients, sandalwood shavings, white jasmine petals, warm amber drops, soft studio light, ultra sharp focus, 8k.`,
            modality: "lifestyle",
          },
          {
            id: "perfume-on-model-spray",
            titleAr: "العارض الأنيق والرش الأيقوني (On-Model Elegance)",
            badge: "تفاعل عالي UGC",
            rationale: "محاكاة شخصية ترتدي بدلة مسائية فاخرة ترش العطر في الهواء مع رذاذ دقيق مضاء برقة لخلق رابط نفسي فوري.",
            prompt: `Commercial perfume campaign featuring an elegant model in luxury evening attire delicately holding ${pName}, fine scented mist suspended in air, back-lit with golden hour bokeh, editorial vogue style.`,
            modality: "on_model",
          },
        ];

      case "skincare":
        return [
          {
            id: "skincare-dewy-spa",
            titleAr: "واحة السبا والنقاء المائي (Dewy Purity)",
            badge: "الأعلى تحويلاً للبشرة",
            rationale: "إبراز المنتج بين قطرات ندى ناصعة وأوراق صبار خضراء منعشة على خلفية حجرية بيضاء لتعزيز رسالة الترطيب والصفاء.",
            prompt: `Pristine beauty commercial of skincare product ${pName} on smooth beige travertine stone, crystal clear morning water droplets, soft morning sunbeams, fresh green botanical leaf, minimalist aesthetic, 8k.`,
            modality: "lifestyle",
          },
          {
            id: "skincare-clinical-lab",
            titleAr: "الدقة المعملية والمكونات الفعالة (Clinical Trust)",
            badge: "بناء ثقة فوري",
            rationale: "بيئة استوديو علمية مينيمال بلون أزرق وأبيض ناصع توحي بالاعتماد الطبي ومصداقية النتائج السريعة.",
            prompt: `Clean laboratory medical aesthetic: Skincare bottle ${pName} on pristine frosted glass podium, laboratory glass pipettes with amber fluid, soft shadow diffusion, scientific and luxurious packaging shoot.`,
            modality: "packshot",
          },
        ];

      case "watches":
        return [
          {
            id: "watch-macro-gears",
            titleAr: "دقة الماكرو السويسرية (Precision Macro)",
            badge: "فخامة كلاسيكية",
            rationale: "تركيز فائق القرب على ميناء الساعة وعقاربها مع انعكاسات معدنية مصقولة وزجاج كريستال ياباني خالي من الخدوش.",
            prompt: `High-end macro commercial photography of luxury watch ${pName}, showing intricate watch face details and polished metallic bezel, soft directional spotlight, dark brushed titanium surface, 8k.`,
            modality: "packshot",
          },
          {
            id: "watch-wrist-suit",
            titleAr: "معصم رجال الأعمال الأنيق (Executive Wristshot)",
            badge: "4.8x تحويل للرجال",
            rationale: "رجل أعمال يرتدي بدلة إيطالية فاخرة يقود سيارة فارهة أو يعدل معصمه مبرزاً الساعة كرمز للمكانة الاجتماعية.",
            prompt: `Lifestyle executive wristshot of tailored businessman wearing luxury timepiece ${pName}, cashmere suit cuff, steering wheel of luxury sportscar blurred in background, moody warm lighting, 8k.`,
            modality: "on_model",
          },
        ];

      case "electronics":
        return [
          {
            id: "tech-cyber-neon",
            titleAr: "المستقبل والسايبربانك (Cyber Energy)",
            badge: "أعلى تفاعل للشباب",
            rationale: "إضاءة نيون زرقاء وقرمزية ناعمة مع أسطح داكنة تبرز التصميم العصري للمنتج التقني وكفاءته العالية.",
            prompt: `Futuristic tech commercial for ${pName} hovering above dark carbon fiber surface, subtle blue and magenta rim neon lights, circuit board bokeh, high-tech engineering aesthetic, 8k.`,
            modality: "direct_response",
          },
          {
            id: "tech-minimal-desk",
            titleAr: "مكتب العمل الإنتاجي العصري (Productivity Desk)",
            badge: "معدل ثقة عالي",
            rationale: "المنتج موضوع بانسيابية على مكتب خشب جوز فاخر بجانب قهوة الصباح ولابتوب لإبراز الاستخدام اليومي الممتع.",
            prompt: `Minimalist workspace product photography: ${pName} resting on a premium walnut desk beside an espresso cup and notebook, warm natural window light, modern Scandinavian aesthetic, 8k.`,
            modality: "lifestyle",
          },
        ];

      case "apparel":
        return [
          {
            id: "apparel-street-motion",
            titleAr: "حركة الشارع العصرية (Streetwear Motion)",
            badge: "تريند إعلاني TikTok",
            rationale: "عارض شاب يتحرك في شارع حضري بإضاءة شمس مائلة تبرز خامة القماش والتطريز بدقة فائقة.",
            prompt: `Editorial fashion streetwear photography: Model moving dynamically in urban city street wearing ${pName}, high-definition fabric texture, golden hour daylight, crisp motion capture, magazine lookbook style.`,
            modality: "on_model",
          },
          {
            id: "apparel-studio-cyclorama",
            titleAr: "استوديو الموضة العالمي (Vogue Studio)",
            badge: "كتالوج ناصع",
            rationale: "خلفية رمادية محايدة ناصعة مع إضاءة استوديو متوازنة لتأكيد أصالة الألوان وجودة الخياطة.",
            prompt: `Clean minimalist fashion lookbook shoot of ${pName} on studio cyclorama background, softbox lighting, perfect color accuracy, editorial high-fashion aesthetic, 8k.`,
            modality: "packshot",
          },
        ];

      case "food":
        return [
          {
            id: "food-gourmet-table",
            titleAr: "المذاق الفاخر والطبيعي (Gourmet Sizzle)",
            badge: "إثارة شهية فورية",
            rationale: "طاولة خشبية ريفية دافئة مع رشة بهارات أو قطرات طازجة تبرز الطزاجة والجودة الفندقية.",
            prompt: `Appetizing commercial food photography of ${pName} on rustic dark wood table, warm natural steam, fresh herbs, warm candlelight bokeh, mouth-watering editorial shoot, 8k.`,
            modality: "lifestyle",
          },
        ];

      case "shoes":
      default:
        return [
          {
            id: "shoes-urban-streetwear",
            titleAr: "سياق الشارع العصري (Urban Streetwear)",
            badge: "الأعلى تحويلاً 4.2x ROAS",
            rationale: "يضع الحذاء في سياق مشي واقعي على رصيف أسفلتي نظيف بإضاءة شمس الصباح، مبرزاً أناقة التصميم وراحة الاستخدام اليومي.",
            prompt: `Commercial sneaker advertisement of ${pName} placed on a clean urban asphalt sidewalk with crisp morning sunlight, contact shadow, shallow depth of field, 8k resolution, cinematic lighting.`,
            modality: "lifestyle",
          },
          {
            id: "shoes-on-model-motion",
            titleAr: "العارض البشري الرياضي (On-Model Motion)",
            badge: "معدل تفاعل عالي UGC",
            rationale: "محاكاة شخص يرتدي الحذاء أثناء خطوة واثقة للأمام على أرضية صالة جيم خشبية راقية، لتأكيد خفة الوزن ومرونة النعل للعميل.",
            prompt: `Dynamic sports footwear shoot of athlete's foot stepping forward in ${pName} on polished hardwood gym floor, motion blur in background, directional studio light, realistic foot perspective, 8k.`,
            modality: "on_model",
          },
          {
            id: "shoes-durability-rain",
            titleAr: "اختبار التحمل والمقاومة (Durability & Rain)",
            badge: "زاوية إقناع فوري Hook",
            rationale: "إظهار المنتج على أرضية مبللة بقطرات ماء متناثرة بإضاءة سينمائية جانبية تثبت جودة الخامات ومقاومة السوائل.",
            prompt: `Dramatic hook product shoot of ${pName} resting on wet asphalt with splashing water droplets, dark atmospheric lighting, reflection in shallow puddle, high speed photography, 8k.`,
            modality: "direct_response",
          },
        ];
    }
  }, [product?.name, selectedCategory]);

  // Combine default suggestions with custom angles, excluding deleted
  const allSuggestions = useMemo(() => {
    const combined = [...customAngles, ...defaultSuggestions];
    return combined.filter((a) => !deletedAngleIds.includes(a.id));
  }, [customAngles, defaultSuggestions, deletedAngleIds]);

  const handleAddAngle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newPrompt.trim()) return;

    const newAngle: CreativeAngleSuggestion = {
      id: `custom-angle-${Date.now()}`,
      titleAr: newTitle.trim(),
      badge: newBadge.trim() || "زاوية مخصصة",
      rationale: newRationale.trim() || "زاوية إعلانية مخصصة تم إنشاؤها يدويًا للمتجر.",
      prompt: newPrompt.trim(),
      modality: "lifestyle",
      isCustom: true,
    };

    const updated = [newAngle, ...customAngles];
    setCustomAngles(updated);
    try {
      localStorage.setItem(CUSTOM_ANGLES_STORAGE_KEY, JSON.stringify(updated));
    } catch {}

    setNewTitle("");
    setNewRationale("");
    setNewPrompt("");
    setShowAddModal(false);
  };

  const handleDeleteAngle = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updatedDeleted = [...deletedAngleIds, id];
    setDeletedAngleIds(updatedDeleted);
    try {
      localStorage.setItem(DELETED_ANGLES_STORAGE_KEY, JSON.stringify(updatedDeleted));
    } catch {}
  };

  const handleResetDefaults = () => {
    setDeletedAngleIds([]);
    try {
      localStorage.removeItem(DELETED_ANGLES_STORAGE_KEY);
    } catch {}
  };

  return (
    <div className="space-y-3">
      {/* Category Switcher Header */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <div className="p-1 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <h3 className="text-xs font-black text-slate-900 dark:text-white">
              المخرج الإبداعي (Creative Director 2026)
            </h3>
          </div>

          <div className="flex items-center gap-1.5">
            {deletedAngleIds.length > 0 && (
              <button
                type="button"
                onClick={handleResetDefaults}
                className="px-2 py-1 text-[10px] font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 rounded flex items-center gap-1 transition cursor-pointer"
                title="استعادة الزوايا المحذوفة"
              >
                <RotateCcw className="w-3 h-3" />
                <span>استعادة</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="px-2 py-1 text-[11px] font-bold rounded-lg border border-indigo-200 dark:border-indigo-800 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 transition flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3 h-3" />
              <span>إضافة برومبت</span>
            </button>
          </div>
        </div>

        {/* Horizontal Category Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-thin">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-2.5 py-1 text-[11px] font-bold rounded-lg whitespace-nowrap transition cursor-pointer flex-shrink-0 ${
                selectedCategory === cat.id
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* If Custom Category Selected */}
        {selectedCategory === "custom" && (
          <div className="mt-2">
            <input
              type="text"
              value={customCategoryText}
              onChange={(e) => setCustomCategoryText(e.target.value)}
              placeholder="اكتب نوع منتجك أو الفئة (مثال: نظارات شمسية، شموع معطرة، حقائب جلدية)..."
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-indigo-200 dark:border-indigo-800 bg-indigo-50/30 dark:bg-indigo-950/20 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        )}
      </div>

      {/* Suggested Angle Cards */}
      <div className="grid grid-cols-1 gap-2">
        {allSuggestions.map((angle) => (
          <div
            key={angle.id}
            role="button"
            tabIndex={0}
            onClick={() => onSelectAngle(angle)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelectAngle(angle);
              }
            }}
            className="group relative text-right p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:border-indigo-400/80 dark:hover:border-indigo-600 active:scale-[0.99] transition cursor-pointer shadow-2xs"
          >
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/50 dark:border-indigo-800/50 flex-shrink-0">
                  {angle.badge}
                </span>
                {angle.isCustom && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
                    مخصص
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition truncate">
                  {angle.titleAr}
                </h4>
                <button
                  type="button"
                  onClick={(e) => handleDeleteAngle(angle.id, e)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded transition cursor-pointer"
                  title="حذف هذه الزاوية"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-2">
              {angle.rationale}
            </p>

            <div className="mt-2 pt-1.5 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between">
              <span className="text-[10px] font-mono text-slate-400">
                انقر لتطبيق الزاوية في الكانفاس
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 group-hover:translate-x-[-2px] transition">
                <span>تطبيق الزاوية</span>
                <ArrowUpRight className="w-3.5 h-3.5 rotate-[-90deg]" />
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Add Custom Angle Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>إضافة زاوية / برومبت مخصص للمخرج الإبداعي</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg leading-none cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddAngle} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  عنوان الزاوية (بالعربية)
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="مثال: تصوير درامي مع إضاءة غروب شمسية"
                  required
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  شارة التحويل / الهدف
                </label>
                <input
                  type="text"
                  value={newBadge}
                  onChange={(e) => setNewBadge(e.target.value)}
                  placeholder="مثال: أعلى تحويل 4.2x ROAS أو زاوية مبتكرة"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  الشرح التسويقي للزاوية
                </label>
                <input
                  type="text"
                  value={newRationale}
                  onChange={(e) => setNewRationale(e.target.value)}
                  placeholder="مثال: يبرز جودة المنتج في بيئة طبيعية راقية لزيادة ثقة العميل."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  البرومبت التجاري (باللغة الإنجليزية)
                </label>
                <textarea
                  value={newPrompt}
                  onChange={(e) => setNewPrompt(e.target.value)}
                  rows={3}
                  placeholder="Commercial product photography of {productName} in cinematic lighting, 8k resolution..."
                  required
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={!newTitle.trim() || !newPrompt.trim()}
                  className="px-4 py-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition disabled:opacity-50 cursor-pointer"
                >
                  حفظ الزاوية
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
