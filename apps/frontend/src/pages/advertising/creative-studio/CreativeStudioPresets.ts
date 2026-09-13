import type { CreativePreset } from "./types";

export const CREATIVE_STUDIO_PRESETS: CreativePreset[] = [
  // 1. Lifestyle & In-Situ Modality (سياق الاستخدام الحقيقي)
  {
    id: "lifestyle-street",
    labelAr: "شارع وأسفلت عصري (Urban Street)",
    labelEn: "Urban Street Lifestyle",
    descriptionAr: "رصيف شارع عصري بمدينة نابضة مع إضاءة شمس صباحية ناعمة وعمق ميداني سينمائي",
    category: "lifestyle",
    promptModifier:
      "commercial lifestyle street photography, resting on a clean modern urban asphalt sidewalk, soft morning natural sunlight, subtle pavement texture, shallow depth of field, blurred warm city background, hyper-realistic, 8k commercial quality",
    lightingStyle: "شمس صباحية طبيعية مع ظلال رصيف ناعمة",
    previewGradient: "from-stone-800 via-neutral-900 to-black",
    badgeColor: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  },
  {
    id: "lifestyle-scandi",
    labelAr: "لايف ستايل خشبي دافئ (Warm Home)",
    labelEn: "Cozy Home Lifestyle",
    descriptionAr: "طاولة خشب بلوط دافئة مع نباتات ناعمة في الخلفية وإضاءة داخلية دافئة ومريحة",
    category: "lifestyle",
    promptModifier:
      "lifestyle product placement on authentic warm oak timber tabletop, shallow depth of field, warm cozy indoor sunlight, aesthetic plant blur in background, organic natural living feel",
    lightingStyle: "إضاءة داخلية دافئة مع إشراقة شمس نافذة",
    previewGradient: "from-amber-900/30 via-stone-900 to-stone-950",
    badgeColor: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  },

  // 2. AI On-Model Modality (العارض البشري)
  {
    id: "onmodel-athletic",
    labelAr: "العارض البشري الحركي (On-Model Motion)",
    labelEn: "Athletic On-Model Motion",
    descriptionAr: "محاكاة حضور شخص رياضي يتفاعل مع المنتج في حركة ديناميكية على أرضية راقية",
    category: "on_model",
    promptModifier:
      "close-up dynamic action shot of a person interacting naturally with product, motion blur in background, crisp focus on the product, professional sportswear fashion editorial, energetic atmosphere",
    lightingStyle: "إضاءة رياضية حركية عالية التباين",
    previewGradient: "from-indigo-950/60 via-slate-900 to-black",
    badgeColor: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
  },
  {
    id: "onmodel-casual",
    labelAr: "موديل كاجوال أنيق (Chic Cafe Model)",
    labelEn: "Casual Fashion Model",
    descriptionAr: "سياق عارض بشري في مقهى عصري راقٍ بإضاءة طبيعية دافئة تحاكي إعلانات الإنستجرام",
    category: "on_model",
    promptModifier:
      "editorial lifestyle fashion photography, chic model at a stylish modern outdoor cafe terrace, natural candid composition, warm afternoon sunlight, authentic aesthetic, 8k commercial shoot",
    lightingStyle: "إضاءة شمس ذهبية في مقهى مفتوح",
    previewGradient: "from-orange-950/40 via-stone-900 to-black",
    badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  },

  // 3. Direct Response & High-Converting Ads (إعلانات التحويل السريع)
  {
    id: "direct-durability",
    labelAr: "اختبار التحمل والماء (Splash & Durability)",
    labelEn: "Water Splash Durability",
    descriptionAr: "بيئة مبللة مع قطرات ماء متطايرة وإضاءة حواف سينمائية تثبت قوة الخامات للعميل",
    category: "direct_response",
    promptModifier:
      "dramatic cinematic commercial shot on dark wet stone with crisp water splashes and micro droplets frozen in air, dramatic warm side rim lighting, pristine product details, ultra-high resolution advertisement",
    lightingStyle: "إضاءة سينمائية دراماتيكية مع قطرات ماء",
    previewGradient: "from-cyan-950/40 via-slate-900 to-black",
    badgeColor: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
  },
  {
    id: "direct-festive",
    labelAr: "موسم العروض والتخفيضات (Mega Promo)",
    labelEn: "Festive Mega Sale",
    descriptionAr: "أجواء احتفالية عصرية مع لمعات ذهبية ناعمة وخلفية دافئة مخصصة لحملات التخفيضات الكبرى",
    category: "direct_response",
    promptModifier:
      "festive commercial celebration setting, elegant golden particles bokeh, rich dark burgundy background, subtle luxury celebration atmosphere, premium promotion ad",
    lightingStyle: "بريق ذهبي وبوكيه احتفالي دافئ",
    previewGradient: "from-rose-950/40 via-amber-950/30 to-black",
    badgeColor: "bg-rose-500/20 text-rose-300 border-rose-500/30",
  },

  // 4. Packshot & Clean Marketplace (كتالوج المنصات الرسمية)
  {
    id: "packshot-marble",
    labelAr: "رخام إيطالي فاخر (Luxury Marble)",
    labelEn: "Italian Luxury Marble",
    descriptionAr: "منصة رخام أسود وعروق ذهبية مع إضاءة حواف سينمائية وانعكاسات زجاجية ناعمة",
    category: "packshot",
    promptModifier:
      "high-end commercial product photography, standing on a polished black and gold veined Italian marble pedestal, dramatic warm studio rim lighting, soft reflections, photorealistic, 8k, award winning advertising shot",
    lightingStyle: "إضاءة استوديو دافئة مع حواف مذهبة",
    previewGradient: "from-amber-950/40 via-stone-900 to-black",
    badgeColor: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  },
  {
    id: "packshot-clean",
    labelAr: "استوديو المنصات النقي (Clean Studio)",
    labelEn: "Clean Marketplace Studio",
    descriptionAr: "منصة هندسية ناصعة مع إضاءة سوفت بوكس متوازنة وظل تماس ناعم مطابق لمعايير أمازون ونون",
    category: "packshot",
    promptModifier:
      "clean minimalist product podium, matte sand architectural geometric block, soft diffused studio daylight, aesthetic editorial studio, ultra sharp, contemporary design",
    lightingStyle: "إضاءة سوفت بوكس بيضاء متوازنة",
    previewGradient: "from-stone-700/30 via-stone-800 to-neutral-900",
    badgeColor: "bg-stone-500/20 text-stone-300 border-stone-500/30",
  },
];
