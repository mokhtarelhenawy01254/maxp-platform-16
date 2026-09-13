import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Rocket,
  Sparkles,
  Package,
  Target,
  Plus,
  Check,
  Tag,
  ExternalLink,
  Palette,
  Wand2,
  Zap,
  Split,
  Copy,
  Layers,
} from "lucide-react";
import { toast } from "sonner";
import { publishAiDraft } from "../../../services/facebookAdsService";
import type { MarketingCampaignDraft, MarketingProduct } from "./types";

interface CampaignDraftLaunchCardProps {
  draft: MarketingCampaignDraft | null;
  selectedProduct: MarketingProduct | null;
  onDraftPublished?: (draftId: string) => void;
}

export type CopyFrameworkId =
  | "aida"
  | "pas"
  | "bab"
  | "ugc"
  | "bundle"
  | "guarantee"
  | "competitor";

export type DialectId =
  | "eg_casual"
  | "gulf_commercial"
  | "modern_standard"
  | "urgent_hype";

interface CopyFramework {
  id: CopyFrameworkId;
  name: string;
  badge: string;
  generateText: (productName: string, dialect: DialectId) => { primaryText: string; headline: string };
}

const DIALECT_CONFIGS: { id: DialectId; label: string; flag: string }[] = [
  { id: "eg_casual", label: "مصري عامي بيعي", flag: "🇪🇬" },
  { id: "gulf_commercial", label: "خليجي تجاري موثوق", flag: "🇸🇦" },
  { id: "modern_standard", label: "فصحى راقية عصرية", flag: "✨" },
  { id: "urgent_hype", label: "حماسي وعروض فورية", flag: "⚡" },
];

const FRAMEWORKS: CopyFramework[] = [
  {
    id: "aida",
    name: "AIDA (انتباه • اهتمام • رغبة • فعل)",
    badge: "الأعلى تحويلاً",
    generateText: (name, dialect) => {
      if (dialect === "gulf_commercial") {
        return {
          primaryText: `🚨 انتباه للباحثين عن التميز والراحة الفائقة:\nلو تبحث عن منتج يجمع بين أعلى جودة وسعر اقتصادي مدروس، ${name} صُمم خصيصاً ليمنحك تجربة استثنائية كل يوم.\nأكثر من 1,500 عميل أكدوا الجودة من أول استخدام مع ضمان استبدال وتوصيل سريع لكافة المدن.\nاطلب الحين واستفد من العرض الخاص قبل نفاد الكمية!`,
          headline: `${name} | الفرق اللي راح تلاحظه من أول يوم ✨`,
        };
      }
      if (dialect === "modern_standard") {
        return {
          primaryText: `توقف عن إهدار ميزانيتك في منتجات دون المستوى المطلوب.\nيقدم لك ${name} الأداء الموثوق والتصميم المتقن ليلبي احتياجاتك اليومية بأعلى معايير الدقة.\nانضم لأكثر من 1,500 عميل راضٍ واستمتع بضمان رسمي واستبدال مجاني.\nاحصل على نسختك الأصلية اليوم مع شحن سريع ومعاينة تامة قبل الاستلام.`,
          headline: `الجودة الفائقة والتجربة الاستثنائية مع ${name} 💎`,
        };
      }
      if (dialect === "urgent_hype") {
        return {
          primaryText: `⚡ عرض لفترة محدودة جداً!\n${name} الأصلي بأقوى خصم حصري لهذا الأسبوع فقط.\nالإقبال عالي والكمية قاربت على النفاد من المخزن!\nاطلب الآن واستفد من الخصم الفوري مع شحن مجاني والدفع عند الاستلام.`,
          headline: `خصم محدود 40% على ${name} قبل نفاد القطع ⏳`,
        };
      }
      return {
        primaryText: `🚨 انتباه لكل اللي بيدوروا على الجودة والراحة الحقيقية:\nلو بتدور على منتج يجمع بين أعلى خامات وسعر اقتصادي مدروس، ${name} معمول مخصوص عشان يحل مشاكلك اليومية بكل سهولة.\nأكثر من 1,500 عميل أكدوا الفرق من أول استخدام مع راحة تامة وضمان حقيقي.\nاطلب دلوقتي واستفيد من خصم العرض + معاينة كاملة مع المندوب قبل ما تدفع مليم!`,
        headline: `${name} | الفرق اللي هتحس بيه من أول يوم ✨`,
      };
    },
  },
  {
    id: "pas",
    name: "PAS (مشكلة • تفاقم • الحل الحاسم)",
    badge: "حل المشكلات",
    generateText: (name, dialect) => {
      if (dialect === "gulf_commercial") {
        return {
          primaryText: `مليت من المنتجات اللي تطلبها أونلاين وتكتشف إنها مجرد خسارة فلوس؟\nكل مرة تطلب يوصلك شي غير الصور أو يخرب بعد أيام قليلة...\nالحل الأكيد وصل: ${name} الأصلي بجودة فائقة وضمان استبدال فوري وتوصيل سريع للباب مع الدفع عند الاستلام بعد المعاينة.\nاطلب نسختك الحين!`,
          headline: `الحل النهائي والأكيد مع ${name} الأصلي 🛡️`,
        };
      }
      if (dialect === "modern_standard") {
        return {
          primaryText: `هل تعاني من تكرار شراء منتجات رديئة لا تدوم طويلاً؟\nالاستمرار في الاعتماد على البدائل غير الموثوقة يكلفك المزيد من الوقت والمال.\nإليك الحل الجذري: ${name} المصنوع بأرقى الخامات ليوفر لك الكفاءة والاستدامة التي تبحث عنها.\nاطلب الآن مع ضمان الجودة الكامل والدفع عند الاستلام.`,
          headline: `الحل العملي والجذري لمشكلتك اليومية مع ${name}`,
        };
      }
      if (dialect === "urgent_hype") {
        return {
          primaryText: `كفاية تضييع فلوس في منتجات متكملش أسبوع وتترمي!\nالحل الفوري اللي بتدور عليه هو ${name} الأصلي بخصم استثنائي ينتهي اليوم.\nالحق قطعتك الآن بسعر العرض مع شحن سريع ومعاينة قبل الدفع!`,
          headline: `الحل الأسرع والأوفر لك مع ${name} ⚡`,
        };
      }
      return {
        primaryText: `تعبت من المنتجات الرديئة اللي بتشتريها أونلاين وتكتشف إنها مضيعة للفلوس؟\nكل ما تطلب حاجة تطلع غير الصورة أو تبوظ بعد أسبوع استخدام...\nالحل النهائي وصل: ${name} الأصلي بضمان استبدال فوري وخامات معتمدة تدوم معاك.\nافحص وعاين براحتك مع المندوب قبل ما تدفع أي جنيه، واطلب الآن قبل انتهاء الكمية!`,
        headline: `الحل الحاسم لمشكلتك اليومية مع ${name} 🛡️`,
      };
    },
  },
  {
    id: "bab",
    name: "BAB (قبل الاستخدام • بعد • التحول)",
    badge: "التحول والنتائج",
    generateText: (name, dialect) => {
      if (dialect === "gulf_commercial") {
        return {
          primaryText: `قبل ${name}: بحث مستمر عن بدائل تفي بالغرض وتكاليف زايدة بدون نتيجة ترضيك.\nبعد ${name}: راحة تامة، كفاءة عالية، وراحة بال من أول تجربة.\nانقل يومك لمستوى ثانٍ واطلب ${name} الحين مع شحن وتوصيل فوري والدفع عند الباب بعد الفحص!`,
          headline: `ودع التعب وعيش تجربة مختلفة كلياً مع ${name} 🚀`,
        };
      }
      if (dialect === "modern_standard") {
        return {
          primaryText: `قبل اقتناء ${name}: إهدار للوقت وتجارب غير مرضية مع منتجات السوق العادية.\nبعد اقتناء ${name}: أداء متفوق وراحة يومية واستثمار ذكي يدوم معك طويلاً.\nارتقِ بتجربتك اليوم واطلب المنتج الأصلي من متجرنا مع معاينة مجانية كاملة.`,
          headline: `التحول الإيجابي الحقيقي في يومك يبدأ مع ${name}`,
        };
      }
      return {
        primaryText: `قبل ${name}: حيرة في الشراء، منتجات ضعيفة مش بتعيش، ومصاريف كتير رايحة على الفاضي.\nبعد ${name}: راحة بال، أداء ممتاز كل يوم، وجودة الكل بيسألك عنها.\nانقل تجربتك لمستوى تاني تماماً واطلب قطعتك الأصلية دلوقتي مع شحن سريع لحد باب بيتك وفحص قبل الدفع!`,
        headline: `ودع التجارب المزعجة واستمتع بالفرق مع ${name} 🚀`,
      };
    },
  },
  {
    id: "ugc",
    name: "UGC / ريلز (تجربة شخصية عفوية)",
    badge: "ريلز وتيك توك",
    generateText: (name, dialect) => {
      if (dialect === "gulf_commercial") {
        return {
          primaryText: `بصراحة كنت متردد أطلب ${name} وأقول يمكن كلام إعلانات وسوشيال ميديا... لكن لما وصلني وشفت الجودة والتقفيل انصدمت من النتيجة!\nيستاهل كل ريال وصار شي أساسي عندي يومياً.\nإذا بتفكر تطلب لا تتردد، التوصيل سريع والدفع بعد ما تعاين بنفسك!`,
          headline: `تجربة واقعية: ليش الكل يطلب ${name} الحين؟ ⭐`,
        };
      }
      return {
        primaryText: `كنت متردد جداً قبل ما أطلب ${name} وقولت أكيد كلام إعلانات زي الباقي... بس لما المندوب وصل وعاينته بنفسي اتفاجئت بجودة التقفيل والخامات المحترمة!\nبقى جزء أساسي من يومي ومقدرش استغنى عنه بجد.\nلو بتفكر تطلب، متترددش لأن الشحن سريع والمعاينة مجانية مع المندوب قبل ما تدفع قرش واحد.`,
        headline: `تجربة واقعية: ليه الكل بيتكلم عن ${name} الأيام دي؟ ⭐`,
      };
    },
  },
  {
    id: "bundle",
    name: "عرض التوفير (باقة 2+1 وشحن مجاني)",
    badge: "أعلى قيمة",
    generateText: (name, dialect) => {
      if (dialect === "gulf_commercial") {
        return {
          primaryText: `عرض التوفير الأضخم لهذا الموسم!\nاطلب قطعة واحدة من ${name} بسعر العرض، أو اطلب قطعتين واحصل على خصم إضافي فوري وشحن مجاني لكافة المناطق.\nالكمية محدودة جداً بسبب الطلب المرتفع. احجز نسختك الحين والدفع بعد المعاينة!`,
          headline: `عرض خاص: اطلب 2 واحصل على شحن مجاني وتخفيض فوري 🎁`,
        };
      }
      return {
        primaryText: `عرض التوفير الأضخم لهذا الأسبوع!\nاطلب قطعة واحدة من ${name} بسعر العرض الخاص، أو اطلب قطعتين واحصل على خصم فوري مضاعف وشحن مجاني بالكامل لجميع المحافظات!\nالكمية المتبقية في المخزن محدودة جداً بسبب الإقبال الكبير. احجز الآن والدفع بعد الفحص والمعاينة التامة.`,
        headline: `عرض خاص: اطلب 2 واحصل على شحن مجاني وفحص كامل 🎁`,
      };
    },
  },
  {
    id: "guarantee",
    name: "كسر التردد (المعاينة قبل الدفع)",
    badge: "أمان وثقة 100%",
    generateText: (name, dialect) => {
      if (dialect === "gulf_commercial") {
        return {
          primaryText: `حقك تضمن فلوسك 100% بدون أي قلق!\nمع ${name} من متجرنا الرسمي، المندوب ينتظرك تفحص وتجرب المنتج براحتك على الباب قبل ما تدفع أي ريال.\nعجبك؟ تدفع وتستلم. ما ناسبك؟ يرجع فوراً بدون أي تكلفة عليك.\nاطلب وأنت متطمن الحين!`,
          headline: `عاين وافحص ${name} مع المندوب قبل دفع ريال واحد ⚡`,
        };
      }
      return {
        primaryText: `حقك تضمن فلوسك 100% وبدون أي قلق!\nمع ${name} من متجرنا الرسمي، المندوب بينتظرك تفحص وتجرب المنتج براحتك تماماً على الباب قبل ما تدفع أي جنيه.\nعجبك؟ ادفع واستلم. معجبكش؟ يرجع فوراً بدون أي مصاريف شحن أو التزام عليك.\nاطلب وأنت في قمة الاطمئنان دلوقتي!`,
        headline: `عاين وافحص ${name} مع المندوب قبل دفع مليم واحد ⚡`,
      };
    },
  },
  {
    id: "competitor",
    name: "مقارنة بالبدائل (جودة بنصف السعر)",
    badge: "قيمة مقابل سعر",
    generateText: (name, dialect) => {
      if (dialect === "gulf_commercial") {
        return {
          primaryText: `ليش تدفع ضعف السعر في البراندات المستوردة عشان تاخذ نفس النتيجة؟\n${name} يقدم لك نفس الجودة والمتانة بسعر منافس وعادل جداً.\nوفر ميزانيتك واكسب منتج مضمون 100% مع ضمان استبدال وتوصيل سريع.`,
          headline: `الجودة الفائقة بسعر ذكي ومنافس: ${name} 💎`,
        };
      }
      return {
        primaryText: `ليه تدفع ضعف السعر في الماركات المستوردة عشان تاخد نفس النتيجة؟\n${name} بيقدملك نفس الأداء والجودة المتطورة بسعر محلي عادل ومنافس جداً.\nوفر ميزانيتك واكسب منتج مضمون 100% مع ضمان استبدال واسترجاع ومعاينة على الباب.`,
        headline: `الجودة الممتازة بسعر محلي ذكي: ${name} 💎`,
      };
    },
  },
];

const HOOK_PRESETS = [
  "عاين وافحص مع المندوب قبل ما تدفع مليم واحد ⚡",
  "ليه كل الناس في مصر بتطلب ده تحديداً الأسبوع ده؟ 👀",
  "لو بتعاني من ضياع فلوسك في منتجات رديئة... الحل هنا 🛡️",
  "السر اللي هيوفر عليك وقت ومجهود من أول استخدام 🚀",
  "عرض باقة التوفير 2+1 مع شحن مجاني للباب 🎁",
  "المنتج الأكثر طلباً وتقييماً 4.9 نجوم من عملائنا ⭐",
];

export const CampaignDraftLaunchCard: React.FC<CampaignDraftLaunchCardProps> = ({
  draft,
  selectedProduct,
  onDraftPublished,
}) => {
  const navigate = useNavigate();
  const [publishing, setPublishing] = useState(false);
  const productName = selectedProduct?.name || "المنتج المحدد";

  // Financial Unit Economics
  const sellingPrice = selectedProduct?.price || 620;
  const costPrice = selectedProduct?.cost || Math.round(sellingPrice * 0.45);
  const profitMargin = Math.round(((sellingPrice - costPrice) / sellingPrice) * 100);
  const targetCpa = Math.round(sellingPrice * 0.25);
  const availableStock = selectedProduct?.stock ?? 42;

  // Selected State
  const [selectedFrameworkId, setSelectedFrameworkId] = useState<CopyFrameworkId>("aida");
  const [selectedDialect, setSelectedDialect] = useState<DialectId>("eg_casual");
  const [activeVariant, setActiveVariant] = useState<"A" | "B">("A");

  // Active framework & generation
  const activeFw = FRAMEWORKS.find((f) => f.id === selectedFrameworkId) || FRAMEWORKS[0];
  const initialGen = activeFw.generateText(productName, selectedDialect);

  const [primaryTextA, setPrimaryTextA] = useState(draft?.primaryText || initialGen.primaryText);
  const [headlineA, setHeadlineA] = useState(draft?.headline || initialGen.headline);

  const [primaryTextB, setPrimaryTextB] = useState(
    FRAMEWORKS[1].generateText(productName, selectedDialect).primaryText
  );
  const [headlineB, setHeadlineB] = useState(
    FRAMEWORKS[1].generateText(productName, selectedDialect).headline
  );

  const primaryText = activeVariant === "A" ? primaryTextA : primaryTextB;
  const setPrimaryText = (val: string) => {
    if (activeVariant === "A") setPrimaryTextA(val);
    else setPrimaryTextB(val);
  };

  const headline = activeVariant === "A" ? headlineA : headlineB;
  const setHeadline = (val: string) => {
    if (activeVariant === "A") setHeadlineA(val);
    else setHeadlineB(val);
  };

  const [dailyBudget, setDailyBudget] = useState(draft?.budgetAmount || 350);

  // Sync text when product or draft changes
  useEffect(() => {
    if (draft?.primaryText) {
      setPrimaryTextA(draft.primaryText);
    } else if (selectedProduct?.name) {
      const gen = activeFw.generateText(selectedProduct.name, selectedDialect);
      setPrimaryTextA(gen.primaryText);
      setHeadlineA(gen.headline);
    }
  }, [selectedProduct?.name, draft?.primaryText, selectedFrameworkId, selectedDialect]);

  // Handle framework selection
  const handleSelectFramework = (framework: CopyFramework) => {
    setSelectedFrameworkId(framework.id);
    const content = framework.generateText(productName, selectedDialect);
    setPrimaryText(content.primaryText);
    setHeadline(content.headline);
    toast.success(`تم تطبيق صيغة: ${framework.name}`);
  };

  // Handle dialect selection
  const handleSelectDialect = (dialectId: DialectId) => {
    setSelectedDialect(dialectId);
    const content = activeFw.generateText(productName, dialectId);
    setPrimaryText(content.primaryText);
    setHeadline(content.headline);
    toast.success(`تم تحويل النص إلى: ${DIALECT_CONFIGS.find((d) => d.id === dialectId)?.label}`);
  };

  // AI Polish helpers
  const handleAiPolish = (action: "shorten" | "polish" | "stronger_cta" | "hook_boost") => {
    if (action === "shorten") {
      const lines = primaryText.split("\n").filter((l) => l.trim().length > 0);
      const shortened = lines.slice(0, 3).join("\n") + `\nاطلب ${productName} الآن قبل نفاد الكمية!`;
      setPrimaryText(shortened);
      toast.success("تم اختصار النص وجعله أكثر إيجازاً وتركيزاً ⚡");
    } else if (action === "stronger_cta") {
      const stronger =
        primaryText.replace(/اطلب[\s\S]*$/g, "").trim() +
        `\n\n🎯 اضغط على "تسوق الآن" واحجز قطعتك بسعر العرض مع شحن سريع ومعاينة مجانية على الباب قبل دفع أي مليم!`;
      setPrimaryText(stronger);
      toast.success("تم تعزيز الدعوة للشراء (CTA) وضمان التحويل 🎯");
    } else if (action === "hook_boost") {
      const randomHook = HOOK_PRESETS[Math.floor(Math.random() * HOOK_PRESETS.length)];
      setHeadline(randomHook);
      const lines = primaryText.split("\n");
      lines[0] = randomHook;
      setPrimaryText(lines.join("\n"));
      toast.success("تم توليد هوك خاطف للانتباه وجديد 🪝");
    } else {
      const polished = `✨ ${productName} - الاختيار الأكثر ثقة وضماناً!\n` +
        primaryText.replace(/^✨[^\n]+\n/, "").trim();
      setPrimaryText(polished);
      toast.success("تمت إعادة صياغة النص بلمسة تسويقية احترافية 🪄");
    }
  };

  const handleApplyHook = (hook: string) => {
    setHeadline(hook);
    toast.success("تم تطبيق الهوك على عنوان الإعلان");
  };

  // Launch campaign
  const handleLaunch = async () => {
    setPublishing(true);
    try {
      const draftIdToPublish = draft?.id || "sample_draft_1";
      const res = await publishAiDraft(draftIdToPublish);
      if (res.success) {
        toast.success("🚀 تم إطلاق الحملة الإعلانية بنجاح إلى Meta Ads!");
        if (onDraftPublished) onDraftPublished(draftIdToPublish);
      } else {
        toast.error(res.error || "تعذّر نشر الحملة إلى فيسبوك");
      }
    } catch (err: any) {
      toast.error(err.message || "حدث خطأ أثناء الاتصال بمنصة Meta");
    } finally {
      setPublishing(false);
    }
  };

  // Metric helpers
  const primaryTextLength = primaryText.length;
  const headlineLength = headline.length;
  const isHeadlineTooLong = headlineLength > 45;

  return (
    <div className="flex flex-col h-full bg-slate-50/40 dark:bg-slate-900/40 min-h-0 overflow-hidden text-slate-800 dark:text-slate-200">
      {/* Body: Scrollable Workspace */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-3 min-h-0">
        {/* 1. Single-Depth Product Summary & Economics */}
        <div className="p-3 rounded-xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60">
          <div className="flex items-center gap-3">
            {selectedProduct?.mainImage ? (
              <img
                src={selectedProduct.mainImage}
                alt={productName}
                className="w-12 h-12 rounded-xl object-cover border border-slate-200 dark:border-slate-700 flex-shrink-0 shadow-xs"
              />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-slate-200 dark:bg-slate-700 flex items-center justify-center flex-shrink-0 text-slate-400">
                <Package className="w-5 h-5" />
              </div>
            )}

            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                {productName}
              </h4>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                المخزون المتوفر:{" "}
                <span className="font-bold text-slate-700 dark:text-slate-200">
                  {availableStock} قطعة
                </span>
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 mt-2.5 pt-2.5 border-t border-slate-200/70 dark:border-slate-700/50 text-center">
            <div>
              <span className="block text-[10px] text-slate-400">سعر البيع</span>
              <span className="text-xs font-black text-slate-900 dark:text-white">
                {sellingPrice} ج.م
              </span>
            </div>
            <div className="border-x border-slate-200/60 dark:border-slate-700/40 px-1">
              <span className="block text-[10px] text-slate-400">سقف الـ CPA</span>
              <span className="text-xs font-black text-blue-600 dark:text-blue-400">
                ~{targetCpa} ج.م
              </span>
            </div>
            <div>
              <span className="block text-[10px] text-slate-400">هامش الربح</span>
              <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                {profitMargin}%
              </span>
            </div>
          </div>
        </div>

        {/* 2. Copywriting Suite: Dialect & Framework Switcher */}
        <div className="p-3 rounded-xl bg-white dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/70 space-y-2.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
              أطر ونماذج الصياغة الإعلانية (Copy Frameworks)
            </span>
            {/* A/B Variant Toggle */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-900 rounded-lg p-0.5 border border-slate-200 dark:border-slate-700 text-[10px] font-bold">
              <button
                type="button"
                onClick={() => setActiveVariant("A")}
                className={`px-2 py-0.5 rounded-md transition ${
                  activeVariant === "A"
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                نسخة A
              </button>
              <button
                type="button"
                onClick={() => setActiveVariant("B")}
                className={`px-2 py-0.5 rounded-md transition ${
                  activeVariant === "B"
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                نسخة B (بديلة)
              </button>
            </div>
          </div>

          {/* Dialect Selector Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 -mx-1 px-1">
            <span className="text-[10px] text-slate-400 font-semibold flex-shrink-0">
              اللهجة والنبرة:
            </span>
            {DIALECT_CONFIGS.map((d) => {
              const isSelected = selectedDialect === d.id;
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => handleSelectDialect(d.id)}
                  className={`px-2 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-1 flex-shrink-0 cursor-pointer border ${
                    isSelected
                      ? "bg-slate-900 text-white border-slate-900 dark:bg-indigo-600 dark:border-indigo-600 shadow-xs"
                      : "bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <span>{d.flag}</span>
                  <span>{d.label}</span>
                </button>
              );
            })}
          </div>

          {/* Frameworks Chips */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
            {FRAMEWORKS.map((fw) => {
              const isSelected = selectedFrameworkId === fw.id;
              return (
                <button
                  key={fw.id}
                  type="button"
                  onClick={() => handleSelectFramework(fw)}
                  className={`p-2 rounded-xl text-start transition flex items-center justify-between border cursor-pointer ${
                    isSelected
                      ? "bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-500 text-indigo-900 dark:text-indigo-200 shadow-2xs"
                      : "bg-slate-50/60 dark:bg-slate-900/50 border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100/80"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-bold block truncate">{fw.name}</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 block">
                      {fw.badge}
                    </span>
                  </div>
                  {isSelected && (
                    <div className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center flex-shrink-0 mr-1 shadow-xs">
                      <Check className="w-3 h-3" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Hooks Presets Bar */}
        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
              <Zap className="w-3 h-3 text-amber-500" />
              هوكات خاطفة للعنوان (Hook Presets):
            </span>
            <button
              type="button"
              onClick={() => handleAiPolish("hook_boost")}
              className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5"
            >
              <Wand2 className="w-2.5 h-2.5" />
              توليد هوك عشوائي
            </button>
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 -mx-1 px-1">
            {HOOK_PRESETS.slice(0, 4).map((hook, hIdx) => (
              <button
                key={hIdx}
                type="button"
                onClick={() => handleApplyHook(hook)}
                className="px-2 py-1 rounded-lg text-[10px] font-medium bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-indigo-400 flex-shrink-0 max-w-[200px] truncate cursor-pointer active:scale-95"
                title={hook}
              >
                {hook}
              </button>
            ))}
          </div>
        </div>

        {/* 4. Direct Ad Copy Editor & AI Polish Toolbar */}
        <div className="space-y-3 p-3 rounded-xl bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 shadow-2xs">
          {/* Primary Text Header + AI Polish Toolbar */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between flex-wrap gap-1">
              <div className="flex items-center gap-1.5">
                <label className="text-[11px] font-bold text-slate-800 dark:text-slate-200">
                  نص الإعلان الرئيسي (Primary Text):
                </label>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-bold">
                  {activeVariant === "A" ? "نسخة A" : "نسخة B"}
                </span>
              </div>

              {/* Fast AI Polish Buttons */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleAiPolish("shorten")}
                  className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-[10px] font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-0.5 cursor-pointer"
                  title="اختصار النص للتركيز على الزبدة"
                >
                  <Zap className="w-2.5 h-2.5 text-amber-500" />
                  اختصار
                </button>
                <button
                  type="button"
                  onClick={() => handleAiPolish("stronger_cta")}
                  className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-[10px] font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-0.5 cursor-pointer"
                  title="تقوية الدعوة للشراء وضمان المعاينة"
                >
                  <Target className="w-2.5 h-2.5 text-blue-500" />
                  تقوية الـ CTA
                </button>
                <button
                  type="button"
                  onClick={() => handleAiPolish("polish")}
                  className="px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 text-[10px] font-semibold text-indigo-700 dark:text-indigo-300 flex items-center gap-0.5 cursor-pointer"
                  title="إعادة الصياغة بلمسة تسويقية احترافية"
                >
                  <Wand2 className="w-2.5 h-2.5 text-indigo-500" />
                  تحسين ذكي
                </button>
              </div>
            </div>

            <textarea
              value={primaryText}
              onChange={(e) => setPrimaryText(e.target.value)}
              rows={5}
              placeholder="اكتب النص الإعلاني أو اختر قالباً من الأعلى لتطبيقه تلقائياً..."
              className="w-full p-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed resize-y font-sans"
            />

            {/* Meta Fold Ergonomics Guide */}
            <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
              <span>
                {primaryTextLength <= 125 ? (
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                    ✓ يظهر كاملاً قبل زر "عرض المزيد" في فيسبوك
                  </span>
                ) : (
                  <span>
                    يظهر أول 125 حرفاً قبل زر "عرض المزيد"
                  </span>
                )}
              </span>
              <span className="font-mono tabular-nums font-semibold">
                {primaryTextLength} حرف
              </span>
            </div>
          </div>

          {/* Headline Field */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-slate-800 dark:text-slate-200">
                عنوان الإعلان الرئيسي (Headline):
              </label>
              <span
                className={`text-[10px] font-mono font-semibold ${
                  isHeadlineTooLong
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-slate-400"
                }`}
              >
                {headlineLength}/45 حرف {isHeadlineTooLong ? "(قد يُقتطع على الموبايل)" : ""}
              </span>
            </div>
            <input
              type="text"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              placeholder="عنوان الإعلان الرئيسي..."
              className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Link & CTA Preview */}
          <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="text-[11px] font-mono truncate max-w-[200px]">
                {selectedProduct?.slug
                  ? `swan.maxp.online/p/${selectedProduct.slug}`
                  : "swan.maxp.online"}
              </span>
            </div>
            <span className="px-2 py-0.5 rounded bg-white dark:bg-slate-800 text-[10px] font-bold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shadow-2xs">
              زر الإعلان: تسوق الآن
            </span>
          </div>
        </div>

        {/* 5. Campaign Parameters & Budget Bar */}
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              إعدادات الحملة في Meta
            </span>
            <span className="text-[11px] text-slate-500 font-medium">
              مصر • جميع المحافظات • تسوق أونلاين
            </span>
          </div>

          <div className="flex items-center justify-between gap-3 bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
            <span className="text-xs text-slate-600 dark:text-slate-400">
              الميزانية اليومية الموصى بها:
            </span>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                value={dailyBudget}
                onChange={(e) => setDailyBudget(Number(e.target.value))}
                className="w-20 py-1 px-2 text-xs font-black text-center rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 focus:outline-none"
              />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                ج.م / يومياً
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 6. Action Footer: Launch to Meta Ads & Studio Bridge */}
      <div className="p-2.5 sm:p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md flex-shrink-0 sticky bottom-0 z-10 shadow-lg sm:shadow-none space-y-2">
        <button
          type="button"
          onClick={() => {
            navigate("/advertising/creative-studio", {
              state: {
                prefillProduct: selectedProduct,
                prefillDraft: {
                  headline,
                  primaryText: primaryText,
                  price: sellingPrice,
                },
              },
            });
          }}
          className="w-full min-h-[38px] py-2 px-3 rounded-xl border border-indigo-200 dark:border-indigo-800/60 bg-indigo-50/70 hover:bg-indigo-100/80 dark:bg-indigo-950/30 dark:hover:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.99]"
        >
          <Palette className="w-3.5 h-3.5 text-indigo-500" />
          <span>صمم إعلان مرئي بالذكاء الاصطناعي في Creative Studio</span>
        </button>

        <button
          type="button"
          onClick={handleLaunch}
          disabled={publishing}
          className="w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs shadow-md hover:shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer active:scale-[0.99]"
        >
          {publishing ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              جاري النشر إلى Meta Ads...
            </>
          ) : (
            <>
              <Rocket className="w-4 h-4" />
              إطلاق الحملة الآن إلى Meta Ads
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default CampaignDraftLaunchCard;
