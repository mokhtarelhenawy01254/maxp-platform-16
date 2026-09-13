import type { CreativePreset } from "./types";

export const CREATIVE_STUDIO_PRESETS: CreativePreset[] = [
  {
    id: "luxury-marble",
    labelAr: "رخام إيطالي فاخر",
    labelEn: "Luxury Italian Marble",
    descriptionAr: "منصة رخام أسود وعروق ذهبية مع إضاءة حواف سينمائية وانعكاسات زجاجية ناعمة",
    category: "luxury",
    promptModifier:
      "high-end commercial product photography, standing on a polished black and gold veined Italian marble pedestal, dramatic warm studio rim lighting, soft reflections, photorealistic, 8k, award winning advertising shot",
    lightingStyle: "إضاءة استوديو دافئة مع حواف مذهبة",
    previewGradient: "from-amber-950/40 via-stone-900 to-black",
    badgeColor: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  },
  {
    id: "minimal-podium",
    labelAr: "منصة هندسية مينيمال",
    labelEn: "Minimal Architectural",
    descriptionAr: "سطح خرساني ناعم بلون بيج ترابي وإضاءة شمسية طبيعية خفيفة",
    category: "podium",
    promptModifier:
      "clean minimalist product podium, matte sand beige architectural geometric block, soft diffused natural daylight window shadows, aesthetic editorial studio, ultra sharp, contemporary design",
    lightingStyle: "ضوء نهاري ناعم مع ظلال شمسية",
    previewGradient: "from-stone-700/30 via-stone-800 to-neutral-900",
    badgeColor: "bg-stone-500/20 text-stone-300 border-stone-500/30",
  },
  {
    id: "studio-spotlight",
    labelAr: "استوديو سينمائي داكن",
    labelEn: "Cinematic Dark Studio",
    descriptionAr: "خلفية جرافيت مطفية مع سبوت لايت مركّز وظلال درامية عالية التباين",
    category: "studio",
    promptModifier:
      "dark luxury studio setting, matte dark graphite textured background, single dramatic top overhead spotlight, crisp contact shadows, commercial product ad, premium flagship product look",
    lightingStyle: "سبوت لايت علوي مباشر عالي التباين",
    previewGradient: "from-neutral-800 via-neutral-900 to-black",
    badgeColor: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  },
  {
    id: "lifestyle-scandi",
    labelAr: "لايف ستايل خشبي دافئ",
    labelEn: "Warm Oak Lifestyle",
    descriptionAr: "طاولة خشب بلوط دافئة مع نباتات ناعمة في الخلفية وتوزيع ضوئي مريح",
    category: "lifestyle",
    promptModifier:
      "lifestyle product placement on authentic warm oak timber tabletop, shallow depth of field, warm cozy indoor sunlight, aesthetic plant blur in background, organic natural living feel",
    lightingStyle: "إضاءة داخلية دافئة وناعمة",
    previewGradient: "from-amber-900/30 via-stone-900 to-stone-950",
    badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  },
  {
    id: "cyber-neon",
    labelAr: "سايبر نيون عصري",
    labelEn: "Cyber Neon Glow",
    descriptionAr: "سطح زجاجي داكن مع توهج حواف نيون أزرق ونيلي مناسب للإلكترونيات والموضة",
    category: "cyber",
    promptModifier:
      "futuristic commercial advertisement backdrop, glossy dark reflective mirror surface, subtle blue and violet cyber neon edge glow, modern tech aesthetics, sleek dark mode vibe",
    lightingStyle: "توهج أزرق ونيلي نيون ناعم",
    previewGradient: "from-indigo-950/60 via-purple-950/30 to-black",
    badgeColor: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
  },
  {
    id: "festive-season",
    labelAr: "موسم العروض والتخفيضات",
    labelEn: "Festive Promo Season",
    descriptionAr: "أجواء احتفالية أنيقة مع لمعات ذهبية ناعمة وخلفية دافئة مخصصة للمناسبات",
    category: "seasonal",
    promptModifier:
      "festive commercial celebration setting, elegant golden particles bokeh, rich burgundy and deep emerald background tones, subtle luxury celebration atmosphere, premium promotion ad",
    lightingStyle: "بريق ذهبي وبوكيه احتفالي دافئ",
    previewGradient: "from-rose-950/40 via-amber-950/30 to-black",
    badgeColor: "bg-rose-500/20 text-rose-300 border-rose-500/30",
  },
];
