import React, { useMemo } from "react";
import { Sparkles, Wand2, Compass, Flame, Users, Store, ArrowUpRight } from "lucide-react";
import type { MarketingProduct, CreativeAngleSuggestion } from "./types";

interface CreativeDirectorSuggestionsProps {
  product: MarketingProduct | null;
  onSelectAngle: (angle: CreativeAngleSuggestion) => void;
  isGenerating?: boolean;
}

export const CreativeDirectorSuggestions: React.FC<CreativeDirectorSuggestionsProps> = ({
  product,
  onSelectAngle,
  isGenerating = false,
}) => {
  const suggestions = useMemo<CreativeAngleSuggestion[]>(() => {
    if (!product) return [];

    const name = product.name || "المنتج";
    const nameLower = name.toLowerCase();

    // 1. Fashion & Footwear (Shoes, Sneakers, Clothes)
    if (
      nameLower.includes("كوتشي") ||
      nameLower.includes("حذاء") ||
      nameLower.includes("شوز") ||
      nameLower.includes("تيشيرت") ||
      nameLower.includes("فستان") ||
      nameLower.includes("قميص") ||
      nameLower.includes("ساعة")
    ) {
      return [
        {
          id: "angle-street-lifestyle",
          titleAr: "سياق الشارع العصري (Urban Streetwear)",
          badge: "الأعلى تحويلاً 4.2x ROAS",
          rationale: "يضع الحذاء في سياق مشي واقعي على رصيف أسفلتي نظيف بإضاءة شمس الصباح الطبيعية، مما يبرز أناقة التصميم وراحة الاستخدام اليومي.",
          prompt: `commercial lifestyle street photography for ${name}, resting naturally on a clean modern urban asphalt sidewalk, soft morning natural sunlight, subtle pavement texture, shallow depth of field, blurred warm city background, hyper-realistic, 8k commercial quality`,
          modality: "lifestyle",
        },
        {
          id: "angle-active-human",
          titleAr: "العارض البشري الرياضي (On-Model Motion)",
          badge: "معدل تفاعل عالي UGC",
          rationale: "محاكاة شخص يرتدي الحذاء أثناء خطوة واثقة للأمام على أرضية صالة جيم خشبية راقية، لتأكيد خفة الوزن ومرونة النعل للعميل.",
          prompt: `close-up low-angle action shot of human feet wearing ${name} taking a confident dynamic step on a premium polished gym wooden floor, crisp natural lighting, athletic motion feel, photorealistic details, commercial sports footwear advertisement`,
          modality: "on_model",
        },
        {
          id: "angle-water-durability",
          titleAr: "اختبار التحمل والمقاومة (Durability & Rain)",
          badge: "زاوية إقناع فوري Hook",
          rationale: "إظهار المنتج على أرضية مبللة بقطرات ماء متناثرة بإضاءة سينمائية جانبية تثبت جودة الخامات ومقاومة السوائل.",
          prompt: `dramatic cinematic commercial shot of ${name} on a dark wet stone surface with crisp water splashes and micro droplets frozen in air, dramatic warm side rim lighting, pristine product details, ultra-high resolution advertisement`,
          modality: "direct_response",
        },
      ];
    }

    // 2. Perfumes, Cosmetics & Luxury
    if (
      nameLower.includes("عطر") ||
      nameLower.includes("برفان") ||
      nameLower.includes("كريم") ||
      nameLower.includes("سيروم") ||
      nameLower.includes("مكياج")
    ) {
      return [
        {
          id: "angle-nature-botanical",
          titleAr: "المكونات العضوية والطبيعة (Botanical Essence)",
          badge: "مظهر فاخر Premium",
          rationale: "وضع العبوة وسط عناصر طبيعية كالزهور وقطرات الندى لإبراز نقاء الرائحة أو المكونات الطبيعية.",
          prompt: `luxury editorial product photography of ${name} standing among fresh botanical morning petals, gentle water mist, soft morning golden sunlight diffusion, elegant warm background, 8k luxury cosmetic campaign`,
          modality: "lifestyle",
        },
        {
          id: "angle-minimal-pedestal",
          titleAr: "استوديو الرخام الإيطالي الفاخر (Italian Marble)",
          badge: "جاذبية الرفاهية 5 Stars",
          rationale: "خلفية رخامية داكنة مع إضاءة حافة دراماتيكية تبرز زجاج العبوة الذهبي.",
          prompt: `high-end commercial luxury shot of ${name} on an elegant dark Nero Marquina marble pedestal, dramatic golden rim light, crisp reflections, minimalist aesthetic, award-winning luxury advertisement`,
          modality: "packshot",
        },
        {
          id: "angle-lifestyle-vanity",
          titleAr: "طاولة التزيين العصرية (Chic Vanity Lifestyle)",
          badge: "الأكثر ثقة لدى السيدات",
          rationale: "وضع العطر بجانب مرآة مضيئة وإكسسوارات راقية تحاكي غرفة النوم العصرية.",
          prompt: `lifestyle photography of ${name} sitting on a modern chic marble vanity table next to a subtle warm glowing mirror and elegant accessories, cozy warm atmosphere, premium lifestyle product shot`,
          modality: "lifestyle",
        },
      ];
    }

    // 3. Default General E-Commerce
    return [
      {
        id: "angle-everyday-lifestyle",
        titleAr: "بيئة الاستخدام اليومي (Everyday In-Situ)",
        badge: "الأعلى إقناعاً للعميل",
        rationale: "وضع المنتج في سياق بيئة منزله أو مكتبه الطبيعية مع إضاءة دافئة تجعل العميل يتخيله في متناول يده فوراً.",
        prompt: `commercial lifestyle photography of ${name} placed naturally in a modern minimalist warm home setting, soft natural window light, inviting cozy atmosphere, clean composition, 8k product shoot`,
        modality: "lifestyle",
      },
      {
        id: "angle-high-contrast-ad",
        titleAr: "إعلان الخصم المباشر (High-Impact Direct Ad)",
        badge: "أعلى نسبة نقرات CTR",
        rationale: "خلفية ذات تباين لوني عصري جريء تسلط كل الانتباه على المنتج وتبرز بطاقة السعر والخصم.",
        prompt: `high-impact commercial product advertisement for ${name}, modern architectural concrete and vibrant warm studio gradient, clean directional lighting, crisp shadows, sharp product focus, 8k commercial quality`,
        modality: "direct_response",
      },
      {
        id: "angle-clean-marketplace",
        titleAr: "كتالوج المنصات الرسمية (Amazon & Shopify Standard)",
        badge: "معايير المنصات العالمية",
        rationale: "خلفية ناصعة مع ظل تماس أرضي ناعم يبرز كافة تفاصيل المنتج دون أي تشتيت بصري.",
        prompt: `clean commercial packshot of ${name} on an immaculate studio pedestal, soft dual-source softbox lighting, pristine clean background with natural soft contact shadow, 8k crisp details`,
        modality: "packshot",
      },
    ];
  }, [product]);

  if (!product) return null;

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
              المخرج الإبداعي (Creative Director)
            </h3>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              زوايا تسويقية مدروسة ومخصصة لـ <span className="font-bold text-slate-700 dark:text-slate-300">"{product.name}"</span>
            </p>
          </div>
        </div>
      </div>

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

            <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between">
              <span className="text-[10px] font-mono text-slate-400">
                انقر لتطبيق الزاوية والتوليد
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
