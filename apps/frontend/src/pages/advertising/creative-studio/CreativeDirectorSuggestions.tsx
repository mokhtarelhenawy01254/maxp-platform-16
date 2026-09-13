import React, { useState, useMemo, useEffect } from "react";
import { Sparkles, ArrowUpRight, Tag, Layers } from "lucide-react";
import type { MarketingProduct, CreativeAngleSuggestion, ProductCategory } from "./types";

interface CreativeDirectorSuggestionsProps {
  product: MarketingProduct | null;
  onSelectAngle: (angle: CreativeAngleSuggestion) => void;
  isGenerating?: boolean;
}

interface CategoryOption {
  id: ProductCategory;
  label: string;
  icon?: string;
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

export const CreativeDirectorSuggestions: React.FC<CreativeDirectorSuggestionsProps> = ({
  product,
  onSelectAngle,
  isGenerating = false,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory>("shoes");
  const [customCategoryText, setCustomCategoryText] = useState("");

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

  const suggestions = useMemo<CreativeAngleSuggestion[]>(() => {
    const name = product?.name || "المنتج التجاري";

    switch (selectedCategory) {
      case "shoes":
        return [
          {
            id: "shoes-street",
            titleAr: "سياق الشارع العصري (Urban Streetwear)",
            badge: "الأعلى تحويلاً 4.2x ROAS",
            rationale: "يضع الحذاء في سياق مشي واقعي على رصيف أسفلتي نظيف بإضاءة شمس الصباح، مبرزاً أناقة التصميم وراحة الاستخدام اليومي.",
            prompt: `commercial lifestyle street photography for ${name}, resting naturally on a clean modern urban asphalt sidewalk, soft morning natural sunlight, subtle pavement texture, shallow depth of field, blurred warm city background, hyper-realistic, 8k commercial quality`,
            modality: "lifestyle",
          },
          {
            id: "shoes-motion",
            titleAr: "العارض البشري الرياضي (On-Model Motion)",
            badge: "معدل تفاعل عالي UGC",
            rationale: "محاكاة شخص يرتدي الحذاء أثناء خطوة واثقة للأمام على أرضية صالة جيم خشبية راقية، لتأكيد خفة الوزن ومرونة النعل للعميل.",
            prompt: `close-up low-angle action shot of human feet wearing ${name} taking a confident dynamic step on a premium polished gym wooden floor, crisp natural lighting, athletic motion feel, photorealistic details, commercial sports footwear advertisement`,
            modality: "on_model",
          },
          {
            id: "shoes-durability",
            titleAr: "اختبار التحمل والمقاومة (Durability & Rain)",
            badge: "زاوية إقناع فوري Hook",
            rationale: "إظهار المنتج على أرضية مبللة بقطرات ماء متناثرة بإضاءة سينمائية جانبية تثبت جودة الخامات ومقاومة السوائل.",
            prompt: `dramatic cinematic commercial shot of ${name} on a dark wet stone surface with crisp water splashes and micro droplets frozen in air, dramatic warm side rim lighting, pristine product details, ultra-high resolution advertisement`,
            modality: "direct_response",
          },
        ];

      case "skincare":
        return [
          {
            id: "skincare-dewy-splash",
            titleAr: "رذاذ وانتعاش المكونات (Pure Botanical Dew)",
            badge: "إحساس النقاء والترطيب",
            rationale: "عبوة السيروم/الكريم محاطة بقطرات ماء متلألئة وبتلات زهور طبيعية ناعمة تعكس فاعلية التركيبة والترطيب الفوري.",
            prompt: `commercial cosmetic photography of ${name}, elegant bottle standing on a wet frosted glass surface with delicate crystal water droplets and soft white orchid petals around it, soft high-key daylight lighting, clean pastel background, 8k editorial skincare campaign`,
            modality: "lifestyle",
          },
          {
            id: "skincare-on-model",
            titleAr: "العارضة والروتين اليومي (Chic Vanity Routine)",
            badge: "الأكثر ثقة لدى السيدات",
            rationale: "عارضة ذات بشرة متألقة تضع لمسة من المنتج أمام مرآة مضيئة في حمام رخامي دافئ يعكس فخامة العناية الشخصية.",
            prompt: `lifestyle beauty commercial photo showing a radiant model gently applying ${name} in front of a warm glowing luxury modern marble vanity mirror, natural clean glow, elegant aesthetic, high-end beauty magazine advertisement`,
            modality: "on_model",
          },
          {
            id: "skincare-marble-pedestal",
            titleAr: "منصة الرخام والذهب (Luxury Marble Stand)",
            badge: "فخامة استوديو 5 نجوم",
            rationale: "منصة رخامية بيضاء ناصعة مع عروق رمادية ولمسات إضاءة ذهبية جانبية تبرز العبوة كمنتج طبي فاخر.",
            prompt: `clean commercial packshot of ${name} on a pristine white Carrara marble pedestal, crisp softbox lighting with subtle golden hour accent, minimal botanical leaf shadow on background, flawless luxury cosmetic product shot`,
            modality: "packshot",
          },
        ];

      case "perfume":
        return [
          {
            id: "perfume-dark-marble",
            titleAr: "الرخام الملكي الداكن (Nero Marquina Luxury)",
            badge: "الأعلى فخامة وجاذبية",
            rationale: "انعكاسات زجاج العبوة الذهبي على قاعدة رخام أسود مصقول مع إضاءة حواف سينمائية تبرز الهيبة والرقي.",
            prompt: `ultra-luxury perfume advertisement of ${name}, positioned on a polished dark black Nero Marquina marble slab with glossy mirror reflections, warm golden rim lighting highlighting the glass facets and amber liquid, dark moody cinematic background, 8k commercial shoot`,
            modality: "packshot",
          },
          {
            id: "perfume-silk-smoke",
            titleAr: "الحرير والدخان السينمائي (Silk & Royal Mist)",
            badge: "سحر الغموض والأصالة",
            rationale: "خلفية من قماش الحرير الملكي المتموج مع رذاذ عطري خفيف وإضاءة دافئة توحي بثبات الرائحة وفخامتها.",
            prompt: `cinematic fragrance photography of ${name} surrounded by fluid flowing midnight-blue silk fabric and subtle micro mist particles in the air, warm dramatic backlighting, evocative and mysterious atmosphere, high-end editorial perfume campaign`,
            modality: "lifestyle",
          },
          {
            id: "perfume-evening-gala",
            titleAr: "سهرة النخبة والموديل (VIP Gala Lifestyle)",
            badge: "مناسبات خاصة VIP",
            rationale: "سياق عارض أنيق ببدلة توكسيدو يستعد لمناسبة كبرى واضعاً العطر على طاولة خشبية راقية.",
            prompt: `lifestyle commercial photo of ${name} on a dark walnut executive dresser next to luxury cufflinks, a stylish blurred model in an evening tuxedo adjusting his collar in the warm background, warm ambient tungsten lighting, prestigious lifestyle`,
            modality: "on_model",
          },
        ];

      case "watches":
        return [
          {
            id: "watch-executive-desk",
            titleAr: "المكتب التنفيذي الفاخر (Executive Suite)",
            badge: "رمز النجاح والجاه",
            rationale: "الساعة موضوعة على مكتب خشبي مصقول بجانب حاسوب محمول فائق النحافة ومفكرة جلدية وإضاءة مكتبية دافئة.",
            prompt: `commercial product shot of ${name} resting on a premium dark leather desk pad next to a sleek laptop and fountain pen, warm directional architect lamp light, shallow depth of field, executive wealth atmosphere, razor sharp metal and sapphire glass details`,
            modality: "lifestyle",
          },
          {
            id: "watch-wrist-model",
            titleAr: "معصم العارض الأنيق (On-Wrist Elegance)",
            badge: "المعايشة الواقعية",
            rationale: "لقطة مقربة لمعصم يد رجل أعمال أنيق يرتدي قميصاً كلاسيكياً أزرق وساعة اليد تبرز هيبة المظهر.",
            prompt: `macro commercial photograph of a sophisticated human wrist wearing ${name}, dressed in a crisp bespoke navy suit cuff, natural window lighting illuminating the dial and brushed steel bracelet, high-end Swiss watch advertisement style`,
            modality: "on_model",
          },
          {
            id: "watch-velvet-macro",
            titleAr: "ماكرو المخمل والمينا (Macro Sapphire & Steel)",
            badge: "إبراز دقة التصنيع",
            rationale: "تصوير ماكرو يبرز لمعان العقارب، بريق المعدن، وتفاصيل الإطار على وسادة مخملية داكنة.",
            prompt: `extreme macro packshot of ${name} on a deep charcoal velvet display cushion, dramatic studio rim light catching the beveled edges of the bezel and metallic dial, crisp reflections, immaculate commercial precision`,
            modality: "packshot",
          },
        ];

      case "electronics":
        return [
          {
            id: "tech-minimalist-desk",
            titleAr: "مساحة العمل التقنية النظيفة (Minimalist Tech Setup)",
            badge: "الأكثر مبيعاً للتقنيين",
            rationale: "جهازك وسط مساحة مكتبية مينيماليست حديثة مع شاشة نحيفة وإضاءة ليد غير مباشرة تعكس روح الابتكار.",
            prompt: `minimalist modern tech workspace commercial photograph featuring ${name} placed prominently on a clean birchwood desk, subtle soft ambient LED strip glow, matte aluminum textures, aesthetic Apple-style studio setup, crisp modern lighting`,
            modality: "lifestyle",
          },
          {
            id: "tech-cyber-neon",
            titleAr: "أجواء السايبر والجيمنج (Cyber Neon Pulse)",
            badge: "طاقة واهتمام شبابي",
            rationale: "إضاءة نيون زرقاء وبنفسجية خافتة مع خلفية تكنولوجية داكنة تبرز قوة الأداء والسرعة.",
            prompt: `high-octane futuristic commercial shot of ${name}, dark titanium podium with subtle electric cyan and violet edge reflections, volumetric haze, sleek aerodynamic angles, gaming and high-performance technology advertisement`,
            modality: "direct_response",
          },
          {
            id: "tech-in-hand",
            titleAr: "الاستخدام الميداني باليد (Hands-On Ergonomics)",
            badge: "سهولة الحمل والاستخدام",
            rationale: "يد شخص تستخدم الجهاز بانسيابية في مقهى عصري مشمس لتأكيد سهولة التنقل والحجم المريح.",
            prompt: `first-person perspective shot of a hand holding ${name} naturally in a sunlit modern urban cafe, blurred warm coffee mug in background, sharp focus on ergonomic design and screen/chassis texture, lifestyle consumer tech ad`,
            modality: "on_model",
          },
        ];

      case "apparel":
        return [
          {
            id: "apparel-street-fashion",
            titleAr: "جلسة تصوير الشارع (Urban Streetwear Fit)",
            badge: "الأكثر رواجاً في الموضة",
            rationale: "عارض شاب في شارع عصري بمدينة مشمسة يرتدي الملابس بإطلالة كاجوال تبرز انسيابية القماش وأناقة القَصّة.",
            prompt: `fashion editorial street-style photograph of a trendy model wearing ${name}, walking confidently through a vibrant sunlit urban street, warm daylight, natural fabric drape and folds, realistic high-end fashion catalog look`,
            modality: "on_model",
          },
          {
            id: "apparel-flat-lay",
            titleAr: "التنسيق المسطح الراقي (Curated Flat-Lay)",
            badge: "تنسيق متكامل كامل الطقم",
            rationale: "فرد القطعة على خلفية خشبية رمادية مع حذاء أنيق ونظارة شمسية لإلهام العميل بتنسيق المظهر الكامل.",
            prompt: `overhead flat-lay commercial photograph of ${name} artfully folded on a neutral textured linen surface, styled with matching designer sunglasses and minimalist accessories, soft balanced overhead softbox light, aesthetic Pinterest fashion grid`,
            modality: "lifestyle",
          },
          {
            id: "apparel-fabric-texture",
            titleAr: "خامة النسيج والحياكة (Macro Fabric & Stitching)",
            badge: "إثبات أصالة الخامة",
            rationale: "لقطة جانبية مقربة تكشف جودة الغرز، نعومة القطن أو الكتان، ومتانة الحياكة تحت إضاءة جانبية.",
            prompt: `close-up detailed commercial macro shot of ${name} draped naturally on a tailor mannequin, sharp focus on fabric texture, stitching precision, natural soft gradient studio lighting, luxury apparel campaign`,
            modality: "packshot",
          },
        ];

      case "food":
        return [
          {
            id: "food-fresh-burst",
            titleAr: "الانتعاش والمكونات الطازجة (Fresh Ingredients Burst)",
            badge: "شهية وإقناع حسي",
            rationale: "المنتج محاط بالمكونات الطبيعية الطازجة المتطايرة بخفة مع قطرات ماء تعكس الجودة والنقاء.",
            prompt: `mouth-watering dynamic commercial food photography of ${name}, fresh organic ingredients flying gently around in mid-air with crisp water splashes, vibrant warm appetite-inducing lighting, high-speed camera freeze, ultra-crisp appetizing details`,
            modality: "direct_response",
          },
          {
            id: "food-rustic-table",
            titleAr: "مائدة المطبخ الريفي الدافئ (Warm Rustic Table)",
            badge: "طبيعي ومحبوب عائلياً",
            rationale: "طاولة خشبية دافئة مع إضاءة صباحية شمسية توحي بالدفء والنكهة الأصيلة المصنوعة بحب.",
            prompt: `cozy commercial lifestyle shot of ${name} served on a rustic oak dining table, soft morning window sun rays creating warm gentle shadows, natural organic ambiance, appetizing and authentic culinary presentation`,
            modality: "lifestyle",
          },
          {
            id: "food-clean-packaging",
            titleAr: "استوديو العبوة الغذائية (Clean Packaging Packshot)",
            badge: "معايير السوبرماركت والتطبيقات",
            rationale: "صورة ناصعة للعبوة تبرز الوزن والمحتوى والشعار بوضوح تام مع ظل تماس خفيف.",
            prompt: `clean studio commercial packshot of ${name}, standing on a neutral pastel surface, balanced wrap-around softbox lighting, zero harsh glare, crisp food packaging clarity, commercial retail catalog standard`,
            modality: "packshot",
          },
        ];

      case "home":
        return [
          {
            id: "home-scandi-living",
            titleAr: "غرفة المعيشة الاسكندنافية (Scandi Modern Living)",
            badge: "الدفء والأناقة المنزلية",
            rationale: "وضع المنتج في صالة معيشة مشمسة بجدران دافئة ونباتات داخلية خضراء تبرز التناسق الديكوري.",
            prompt: `interior design architectural photography featuring ${name} placed naturally in a sun-drenched Scandinavian living room, warm neutral tones, light oak wooden floor, leafy indoor monstera plant, peaceful cozy home aesthetic`,
            modality: "lifestyle",
          },
          {
            id: "home-golden-sunset",
            titleAr: "سحر شمس الغروب (Golden Hour Glow)",
            badge: "عاطفة وسكينة",
            rationale: "إضاءة شمس الغروب الذهبية تتدفق عبر نافذة كبيرة وتلقي بظلال هندسية ناعمة على المنتج.",
            prompt: `atmospheric commercial product shot of ${name} illuminated by low golden-hour sunset light streaming through a modern large window, artistic geometric shadow patterns, tranquil warm home atmosphere`,
            modality: "lifestyle",
          },
          {
            id: "home-clean-gallery",
            titleAr: "معرض الديكور المعاصر (Design Gallery Exhibit)",
            badge: "قيمة فنية استثنائية",
            rationale: "منصة عرض بيضاء مع جدار خرساني مصقول تحاكي أرقى معارض الأثاث والديكور في ميلانو.",
            prompt: `minimalist gallery showroom shot of ${name} resting on a clean concrete plinth, architectural soft directional spotlight, neutral museum gray background, high-end designer furniture look`,
            modality: "packshot",
          },
        ];

      case "custom":
      default:
        const topic = customCategoryText.trim() || name;
        return [
          {
            id: "custom-lifestyle",
            titleAr: "بيئة الاستخدام الفعلي (In-Situ Lifestyle Context)",
            badge: "الأعلى إقناعاً للعميل",
            rationale: `وضع ${topic} في سياق بيئته الطبيعية الأكثر استخداماً مع إضاءة دافئة تجعل العميل يتخيله في متناول يده.`,
            prompt: `commercial lifestyle photography of ${topic} placed naturally in its ideal real-world environment, soft natural daylight, cozy authentic atmosphere, clean composition, 8k product shoot`,
            modality: "lifestyle",
          },
          {
            id: "custom-direct-ad",
            titleAr: "إعلان التحويل المباشر (High-Impact Direct Response)",
            badge: "أعلى نسبة نقرات CTR",
            rationale: `خلفية ذات تباين لوني عصري جريء تسلط كل الانتباه على ${topic} وتبرز تفاصيله بدقة فائقة.`,
            prompt: `high-impact commercial product advertisement for ${topic}, modern architectural surface and vibrant warm studio gradient, clean directional lighting, crisp shadows, sharp product focus, 8k commercial quality`,
            modality: "direct_response",
          },
          {
            id: "custom-studio-packshot",
            titleAr: "استوديو المنصات الرسمي (Clean Catalog Standard)",
            badge: "معايير المنصات العالمية",
            rationale: `خلفية ناصعة مع ظل تماس أرضي ناعم يبرز كافة تفاصيل ${topic} دون أي تشتيت بصري.`,
            prompt: `clean commercial packshot of ${topic} on an immaculate studio pedestal, soft dual-source softbox lighting, pristine clean background with natural soft contact shadow, 8k crisp details`,
            modality: "packshot",
          },
        ];
    }
  }, [product, selectedCategory, customCategoryText]);

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
          <span className="text-[10px] text-slate-500 font-mono">
            {product?.name ? `المنتج: ${product.name}` : "تحديد الزاوية التسويقية"}
          </span>
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
        {suggestions.map((angle) => (
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
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/50 dark:border-indigo-800/50 flex-shrink-0">
                {angle.badge}
              </span>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition truncate">
                {angle.titleAr}
              </h4>
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
    </div>
  );
};

