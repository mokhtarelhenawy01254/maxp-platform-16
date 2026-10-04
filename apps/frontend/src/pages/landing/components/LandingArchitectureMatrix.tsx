import React, { useState } from "react";
import {
  Layers,
  MessageCircle,
  Cpu,
  Boxes,
  ShieldCheck,
  Zap,
  ArrowLeft,
  Store,
  Truck,
  FileSpreadsheet,
  CheckCircle,
} from "lucide-react";
import { Link } from "react-router-dom";
import { trackPlatformSiteLead } from "../../../utils/platformSiteMetaPixel";

interface ArchitectureLayer {
  id: string;
  number: string;
  name: string;
  role: string;
  summary: string;
  components: string[];
  metric: string;
  color: string;
  bgLight: string;
  borderColor: string;
}

const LAYERS: ArchitectureLayer[] = [
  {
    id: "layer-touchpoints",
    number: "01",
    name: "قنوات التفاعل الموحدة (Omnichannel Touchpoints)",
    role: "الواجهة المباشرة أمام العملاء",
    summary:
      "استقبال كافة الطلبات والاستفسارات من واتساب وانستجرام وتيك توك وفيسبوك وكاشير المحل السحابي ومتجرك الإلكتروني في نافذة استقبال موحدة دون تشتت.",
    components: [
      "WhatsApp Cloud API الرسمي",
      "Instagram Direct & Comments",
      "Facebook Messenger & Lead Ads",
      "Cloud POS كاشير المحلات",
      "متجر إلكتروني فائق السرعة",
    ],
    metric: "صندوق وارد مركزي موحّد",
    color: "text-emerald-400",
    bgLight: "bg-emerald-500/10",
    borderColor: "border-emerald-500/40",
  },
  {
    id: "layer-cortex",
    number: "02",
    name: "المخ الذكي ومحرك الأتمتة (Autonomous AI Cortex)",
    role: "العقل التشغيلي الذي لا ينام",
    summary:
      "وكيل ذكاء اصطناعي يفهم اللهجة المصرية، يفرز نية العميل، يرسل الكتالوج والصور الحية، يحظر المشاغبين وأرقام المرتجعات، ويوجه الطلبات المكتملة للتنفيذ التلقائي.",
    components: [
      "وكيل بيع ذكي باللهجة المصرية",
      "فلتر كشف المشاغبين وحظر المرتجع",
      "أتمتة سيناريوهات البيع والـ IVR",
      "موزع مكالمات الكول سنتر الآلي",
      "تنبيهات نواقص المخازن اللحظية",
    ],
    metric: "رد فوري على الواتساب",
    color: "text-blue-400",
    bgLight: "bg-blue-500/10",
    borderColor: "border-blue-500/40",
  },
  {
    id: "layer-backbone",
    number: "03",
    name: "العمود الفقري للمخازن والشحن (Logistics Backbone)",
    role: "المصنع والمستودع على أرض الواقع",
    summary:
      "تنسيق جرد المخازن المتعددة مع فروع المحلات، مسح الباركود السريع، وإصدار بوالص الشحن لشركات الشحن (بوسطة، أرامكس وغيرها) بنقرة زر مع تتبع خط السير لحظة بلحظة.",
    components: [
      "ERP جرد الفروع والمخازن",
      "كشك فحص الباركود والطابعات",
      "بوابة بوالص الشحن Turbo (بوسطة)",
      "نظام إرجاع واستبدال منظم",
      "أوامر الشراء والتوريد الذكية",
    ],
    metric: "بلا أخطاء جرد أو بيع مزدوج",
    color: "text-orange-400",
    bgLight: "bg-orange-500/10",
    borderColor: "border-orange-500/40",
  },
  {
    id: "layer-financial",
    number: "04",
    name: "الحصن المالي وصافي الأرباح (Financial & ETA Fortress)",
    role: "الحقيقة المطلقة لخزنتك ومحفظتك",
    summary:
      "حساب تكلفة كل قطعة مباعة وخصم الـ ROAS الإعلاني وتكلفة الشحن والمرتجع المجهول، مع إصدار فواتير إلكترونية متوافقة 100% مع مصلحة الضرائب المصرية (ETA).",
    components: [
      "محرك صافي الربح الفعلي P&L",
      "تحليل نقطة التعادل Break-Even",
      "فواتير الضرائب المصرية ETA",
      "حساب عمولات السيلز والمسوقين",
      "متابعة تحصيلات بوسطة و COD",
    ],
    metric: "صافي ربح حقيقي بالقرش",
    color: "text-purple-400",
    bgLight: "bg-purple-500/10",
    borderColor: "border-purple-500/40",
  },
];

export const LandingArchitectureMatrix: React.FC = () => {
  const [selectedLayerId, setSelectedLayerId] = useState<string>("layer-touchpoints");
  const activeLayer = LAYERS.find((l) => l.id === selectedLayerId) || LAYERS[0];

  return (
    <section id="architecture" className="relative py-24 sm:py-32 border-t border-white/[0.06] overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Open Section Header */}
        <div className="max-w-3xl mb-16">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
            <Layers className="w-4 h-4 text-emerald-400" />
            <span>الهيكل المعماري للمنصة • The Unified Stack</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
            4 طبقات تشغيلية مترابطة...
            <br />
            <span className="text-zinc-400 font-normal">تعمل في تناغم رقمي مطلق.</span>
          </h2>
          <p className="mt-4 text-base sm:text-lg text-zinc-400 leading-relaxed">
            السر وراء قوة MaxP هو أنه ليس مجرد برنامج منفصل؛ بل منظومة معمارية متراكبة تلغي الحاجة لشراء 6 اشتراكات شهرية متباعدة.
          </p>
        </div>

        {/* 4 Layers Horizontal Panoramic Stack (Open Canvas, Single Depth) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Layer Selector Rail (5 cols) */}
          <div className="lg:col-span-5 space-y-3">
            {LAYERS.map((layer) => {
              const isSelected = layer.id === selectedLayerId;
              return (
                <button
                  key={layer.id}
                  onClick={() => setSelectedLayerId(layer.id)}
                  className={`w-full text-right p-4 sm:p-5 rounded-xl transition-all cursor-pointer border ${
                    isSelected
                      ? `bg-white/[0.05] ${layer.borderColor} shadow-lg shadow-black/40`
                      : "bg-transparent border-white/[0.06] hover:border-white/20 hover:bg-white/[0.02]"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono font-bold text-zinc-400">
                      طبقة {layer.number}
                    </span>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${layer.bgLight} ${layer.color}`}>
                      {layer.metric}
                    </span>
                  </div>
                  <h3 className="text-sm sm:text-base font-bold text-white mb-1">
                    {layer.name}
                  </h3>
                  <p className="text-xs text-zinc-400 line-clamp-1">
                    {layer.role}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Active Layer Deep Inspection Canvas (7 cols) */}
          <div className="lg:col-span-7 p-6 sm:p-8 rounded-2xl bg-[#09090b] border border-white/[0.08] relative">
            <div className="flex items-center justify-between pb-6 border-b border-white/[0.06] mb-6">
              <div>
                <span className="text-xs font-mono text-zinc-400 block mb-1">الطبقة النشطة المعاينة</span>
                <h3 className="text-xl sm:text-2xl font-black text-white">
                  {activeLayer.name}
                </h3>
              </div>
              <span className={`text-2xl font-black font-mono ${activeLayer.color}`}>
                {activeLayer.number}
              </span>
            </div>

            <p className="text-sm sm:text-base text-zinc-300 leading-relaxed mb-6">
              {activeLayer.summary}
            </p>

            {/* Components Inside This Layer */}
            <div className="space-y-3 mb-8">
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block">
                المكونات المدمجة داخل هذه الطبقة:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {activeLayer.components.map((comp) => (
                  <div
                    key={comp}
                    className="flex items-center gap-2 p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.05] text-xs text-zinc-200"
                  >
                    <CheckCircle className={`w-3.5 h-3.5 flex-shrink-0 ${activeLayer.color}`} />
                    <span>{comp}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Layer Impact Bar */}
            <div className="pt-6 border-t border-white/[0.06] flex flex-wrap items-center justify-between gap-4">
              <div>
                <span className="text-xs text-zinc-400 block">الأثر التشغيلي المباشر:</span>
                <span className={`text-base font-bold ${activeLayer.color}`}>
                  {activeLayer.metric}
                </span>
              </div>

              <Link
                to="/auth/register"
                onClick={() =>
                  trackPlatformSiteLead({
                    cta_type: "layer_inspect_start",
                    placement: `architecture_${activeLayer.id}`,
                  })
                }
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white text-black font-bold text-xs hover:bg-zinc-200 transition-all active:scale-[0.98]"
              >
                <span>شغّل هذه الطبقة في نشاطك</span>
                <ArrowLeft className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
};

export default LandingArchitectureMatrix;
